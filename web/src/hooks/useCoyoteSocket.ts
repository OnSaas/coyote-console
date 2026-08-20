import { useCallback, useEffect, useRef, useState } from "react";
import {
  isServerFrame,
  qrPayload,
  readIntensity,
  relayWsUrl,
  type RemoteDevice,
  type RpcReq,
  type ServerFrame,
} from "../lib/protocol";

export type ConnState =
  | "idle"
  | "connecting"
  | "waiting"
  | "paired"
  | "disconnected"
  | "error";

export interface RelayEvent {
  kind: "info" | "success" | "warning" | "error";
  title: string;
  description?: string;
}

export interface StrengthFeedback {
  a: number;
  b: number;
  aLimit: number;
  bLimit: number;
}

const EMPTY_STRENGTH: StrengthFeedback = {
  a: 0,
  b: 0,
  aLimit: 200,
  bLimit: 200,
};

function defaultRelayOrigin(): string {
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_RELAY_ORIGIN || "http://127.0.0.1:8787";
  }
  return window.location.origin;
}

export function useCoyoteSocket(onEvent: (event: RelayEvent) => void) {
  const [state, setState] = useState<ConnState>("idle");
  const [targetId, setTargetId] = useState<string | null>(null);
  const [appId, setAppId] = useState<string | null>(null);
  const [devices, setDevices] = useState<RemoteDevice[]>([]);
  const [strength, setStrength] = useState<StrengthFeedback>(EMPTY_STRENGTH);
  const [error, setError] = useState<string | null>(null);
  const [relayOrigin] = useState(defaultRelayOrigin);

  const wsRef = useRef<WebSocket | null>(null);
  const appIdRef = useRef<string | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const emit = useCallback((event: RelayEvent) => {
    onEventRef.current(event);
  }, []);

  const applyDeviceList = useCallback((list: RemoteDevice[]) => {
    setDevices(list);
    const coyote = list.find(
      (d) => d.type === "COYOTE_030" || d.type === "COYOTE_020" || d.slotId,
    );
    if (coyote) setStrength(readIntensity(coyote));
  }, []);

  const handleFrame = useCallback(
    (frame: ServerFrame) => {
      if (frame.type === "heartbeat" || frame.type === "pong") return;

      if (frame.type === "hello" && frame.clientId) {
        setTargetId(frame.clientId);
        setState("waiting");
        emit({ kind: "info", title: "已连接中继", description: "用 4.0 APP 扫码配对" });
        return;
      }

      if (frame.type === "client_attached" && frame.clientId) {
        setAppId(frame.clientId);
        appIdRef.current = frame.clientId;
        setState("paired");
        emit({ kind: "success", title: "APP 已接入" });
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "message",
              clientId: frame.clientId,
              data: { t: "req", reqId: crypto.randomUUID(), m: "devices.get" },
            }),
          );
        }
        return;
      }

      if (frame.type === "client_disconnected") {
        if (frame.clientId === appIdRef.current) {
          setAppId(null);
          appIdRef.current = null;
          setDevices([]);
          setStrength(EMPTY_STRENGTH);
          setState("waiting");
          emit({ kind: "warning", title: "APP 已断开" });
        }
        return;
      }

      if (frame.type === "idle_timeout") {
        emit({ kind: "warning", title: "空闲超时", description: "5 分钟无 APP 接入" });
        return;
      }

      if (frame.type === "error") {
        emit({
          kind: "error",
          title: "中继错误",
          description: String(frame.data ?? ""),
        });
        return;
      }

      if (frame.type === "message") {
        const data = frame.data as Record<string, unknown> | undefined;
        if (!data || typeof data !== "object") return;

        if (data.t === "ev" && data.ev === "devices.snapshot") {
          applyDeviceList((data.devices as RemoteDevice[]) ?? []);
          return;
        }

        if (data.t === "ev" && data.ev === "devices.patch") {
          const added = (data.added as RemoteDevice[]) ?? [];
          const removed = new Set((data.removed as string[]) ?? []);
          setDevices((prev) => {
            const next = prev
              .filter((d) => !removed.has(d.slotId))
              .concat(added);
            const coyote = next.find((d) => d.slotId);
            if (coyote) setStrength(readIntensity(coyote));
            return next;
          });
          return;
        }

        if (data.t === "ev" && data.ev === "slots.patch") {
          const slots = (data.slots as RemoteDevice[]) ?? [];
          setDevices((prev) => {
            const map = new Map(prev.map((d) => [d.slotId, d]));
            for (const slot of slots) {
              const cur = map.get(slot.slotId);
              if (!cur) continue;
              map.set(slot.slotId, {
                ...cur,
                props: { ...cur.props, ...slot.props },
                slotState: { ...cur.slotState, ...slot.slotState },
              });
            }
            const next = [...map.values()];
            const coyote = next.find((d) => d.slotId);
            if (coyote) setStrength(readIntensity(coyote));
            return next;
          });
          return;
        }

        if (data.t === "resp" && data.result && typeof data.result === "object") {
          const list = (data.result as { devices?: RemoteDevice[] }).devices;
          if (Array.isArray(list)) applyDeviceList(list);
          return;
        }

        if (data.t === "ev" && data.ev === "custom.action") {
          emit({
            kind: "info",
            title: "APP 反馈",
            description: `动作 ${String(data.action)}`,
          });
        }
      }
    },
    [applyDeviceList, emit],
  );

  const disconnect = useCallback(() => {
    const ws = wsRef.current;
    wsRef.current = null;
    if (ws && ws.readyState < WebSocket.CLOSING) ws.close(1000, "client");
    setTargetId(null);
    setAppId(null);
    appIdRef.current = null;
    setDevices([]);
    setStrength(EMPTY_STRENGTH);
    setError(null);
    setState("idle");
  }, []);

  const connect = useCallback(() => {
    disconnect();
    setState("connecting");
    setError(null);

    const ws = new WebSocket(relayWsUrl(relayOrigin));
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      if (wsRef.current !== ws) return;
      if (typeof ev.data !== "string") return;
      try {
        const parsed: unknown = JSON.parse(ev.data);
        if (isServerFrame(parsed)) handleFrame(parsed);
      } catch {
        /* ignore */
      }
    };

    ws.onerror = () => {
      if (wsRef.current !== ws) return;
      setError("WebSocket 连接失败");
      emit({ kind: "error", title: "连接失败" });
    };

    ws.onclose = () => {
      if (wsRef.current !== ws) return;
      wsRef.current = null;
      setState((prev) => (prev === "idle" ? prev : "disconnected"));
    };
  }, [disconnect, emit, handleFrame, relayOrigin]);

  useEffect(() => {
    return () => {
      const ws = wsRef.current;
      wsRef.current = null;
      if (ws && ws.readyState < WebSocket.CLOSING) ws.close(1000, "unmount");
    };
  }, []);

  const sendRpc = useCallback(
    (req: RpcReq) => {
      const ws = wsRef.current;
      const clientId = appIdRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN || !clientId) return false;
      ws.send(
        JSON.stringify({
          type: "message",
          clientId,
          data: req,
        }),
      );
      return true;
    },
    [],
  );

  const qrUrl = targetId ? qrPayload(relayOrigin, targetId) : null;
  const slotId = devices[0]?.slotId ?? null;

  return {
    state,
    targetId,
    appId,
    slotId,
    devices,
    strength,
    error,
    relayOrigin,
    qrUrl,
    connect,
    disconnect,
    sendRpc,
  };
}

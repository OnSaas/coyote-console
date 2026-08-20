import { useCallback, useEffect, useRef, useState } from "react";
import {
  isServerFrame,
  pickDevice,
  qrPayload,
  readIntensity,
  rpcReq,
  type RemoteDevice,
  type RpcReq,
  type ServerFrame,
} from "../lib/protocol";

export type ConnState =
  | "idle"
  | "connecting"
  | "connected"
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
        setState("connected");
        emit({ kind: "info", title: "中继已连接，请扫码" });
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
          setState("connected");
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
          description: String(frame.code ?? frame.data ?? ""),
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
            const coyote = pickDevice(next);
            if (coyote) setStrength(readIntensity(coyote));
            return next;
          });
          return;
        }

        if (data.t === "resp" && data.result != null) {
          const result = data.result;
          if (Array.isArray(result)) applyDeviceList(result as RemoteDevice[]);
          else if (typeof result === "object") {
            const list = (result as { devices?: RemoteDevice[] }).devices;
            if (Array.isArray(list)) applyDeviceList(list);
          }
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

  const connect = useCallback(async () => {
    disconnect();
    setState("connecting");
    setError(null);

    try {
      const res = await fetch("/api/create", { method: "POST" });
      const raw = await res.text();
      let created: { ok?: boolean; clientId?: string; wsUrl?: string; error?: string };
      try {
        created = JSON.parse(raw) as typeof created;
      } catch {
        throw new Error(`创建会话失败：返回非 JSON (HTTP ${res.status})`);
      }
      if (!res.ok || !created.wsUrl) {
        throw new Error(created.error || `创建会话失败 HTTP ${res.status}`);
      }

      const ws = new WebSocket(created.wsUrl);
      wsRef.current = ws;
      let hello = false;

      const timer = window.setTimeout(() => {
        if (hello || wsRef.current !== ws) return;
        ws.close();
        setError("等待 hello 超时");
        emit({ kind: "error", title: "连接超时", description: "未收到 hello" });
        setState("idle");
      }, 8000);

      ws.onmessage = (ev) => {
        if (wsRef.current !== ws) return;
        if (typeof ev.data !== "string") return;
        try {
          const parsed: unknown = JSON.parse(ev.data);
          if (isServerFrame(parsed)) {
            if (parsed.type === "hello") hello = true;
            handleFrame(parsed);
          }
        } catch {
          emit({ kind: "error", title: "连接失败", description: "收到非 JSON 帧" });
        }
      };

      ws.onerror = () => {
        if (wsRef.current !== ws) return;
        window.clearTimeout(timer);
        setError("WebSocket 连接失败");
        emit({ kind: "error", title: "连接失败", description: "无法升级到 /ws" });
        setState("idle");
      };

      ws.onclose = () => {
        window.clearTimeout(timer);
        if (wsRef.current !== ws) return;
        wsRef.current = null;
        setState((prev) => (prev === "idle" || prev === "connecting" ? "idle" : "disconnected"));
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setError(message);
      emit({ kind: "error", title: "连接失败", description: message });
      setState("idle");
    }
  }, [disconnect, emit, handleFrame]);

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
  const slotId = pickDevice(devices)?.slotId ?? null;
  const deviceName = pickDevice(devices)?.name ?? null;

  useEffect(() => {
    if (state !== "paired" || slotId) return;
    const tick = () => sendRpc(rpcReq("devices.get"));
    tick();
    const id = window.setInterval(tick, 2500);
    return () => window.clearInterval(id);
  }, [sendRpc, slotId, state]);

  return {
    state,
    targetId,
    appId,
    slotId,
    deviceName,
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

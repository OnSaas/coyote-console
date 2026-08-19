import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearChannel,
  isDGLabMessage,
  parseFeedback,
  parseStrengthFeedback,
  qrPayload,
  relayWsUrl,
  strengthNudge,
  strengthSet,
  type StrengthFeedback,
} from "./protocol";

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

function defaultRelayOrigin(): string {
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_RELAY_ORIGIN || "http://127.0.0.1:8787";
  }
  return window.location.origin;
}

const EMPTY_STRENGTH: StrengthFeedback = {
  a: 0,
  b: 0,
  aLimit: 200,
  bLimit: 200,
};

export function useRelay(onEvent: (event: RelayEvent) => void) {
  const [state, setState] = useState<ConnState>("idle");
  const [clientId, setClientId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [strength, setStrength] = useState<StrengthFeedback>(EMPTY_STRENGTH);
  const [error, setError] = useState<string | null>(null);
  const [relayOrigin] = useState(defaultRelayOrigin);

  const wsRef = useRef<WebSocket | null>(null);
  const idsRef = useRef({ clientId: null as string | null, targetId: null as string | null });
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const emit = useCallback((event: RelayEvent) => {
    onEventRef.current(event);
  }, []);

  const cleanup = useCallback((next: ConnState) => {
    setState(next);
    if (next !== "paired" && next !== "waiting") {
      setTargetId(null);
      idsRef.current.targetId = null;
    }
  }, []);

  const sendRaw = useCallback((message: string) => {
    const ws = wsRef.current;
    const { clientId: cid, targetId: tid } = idsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !cid || !tid) return false;
    ws.send(
      JSON.stringify({
        type: "msg",
        clientId: cid,
        targetId: tid,
        message,
      }),
    );
    return true;
  }, []);

  const handleMessage = useCallback(
    (raw: string) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return;
      }
      if (!isDGLabMessage(parsed)) return;

      if (parsed.type === "heartbeat") return;

      if (parsed.type === "bind") {
        if (parsed.message === "targetId" && parsed.clientId) {
          setClientId(parsed.clientId);
          idsRef.current.clientId = parsed.clientId;
          setState("waiting");
          emit({ kind: "info", title: "已连接中继", description: "用 APP 扫码配对" });
          return;
        }
        if (parsed.message === "200" && parsed.targetId) {
          setTargetId(parsed.targetId);
          idsRef.current.targetId = parsed.targetId;
          setState("paired");
          emit({ kind: "success", title: "配对成功" });
          return;
        }
        if (parsed.message === "400") {
          setError("该控制端已被绑定");
          cleanup("error");
          emit({ kind: "error", title: "配对失败", description: "ID 已被绑定" });
        }
        return;
      }

      if (parsed.type === "break") {
        emit({ kind: "warning", title: "APP 已断开" });
        cleanup("disconnected");
        return;
      }

      if (parsed.type === "error") {
        emit({
          kind: "error",
          title: "中继错误",
          description: parsed.message,
        });
        return;
      }

      if (parsed.type === "msg") {
        const fb = parseStrengthFeedback(parsed.message);
        if (fb) {
          setStrength(fb);
          return;
        }
        const btn = parseFeedback(parsed.message);
        if (btn !== null) {
          emit({
            kind: "info",
            title: "APP 反馈",
            description: `按钮 ${btn}`,
          });
        }
      }
    },
    [cleanup, emit],
  );

  const disconnect = useCallback(() => {
    const ws = wsRef.current;
    wsRef.current = null;
    if (ws && ws.readyState < WebSocket.CLOSING) ws.close(1000, "client");
    setClientId(null);
    setTargetId(null);
    idsRef.current = { clientId: null, targetId: null };
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

    ws.onopen = () => {
      if (wsRef.current !== ws) return;
    };

    ws.onmessage = (ev) => {
      if (wsRef.current !== ws) return;
      if (typeof ev.data === "string") handleMessage(ev.data);
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
  }, [disconnect, emit, handleMessage, relayOrigin]);

  useEffect(() => {
    return () => {
      const ws = wsRef.current;
      wsRef.current = null;
      if (ws && ws.readyState < WebSocket.CLOSING) ws.close(1000, "unmount");
    };
  }, []);

  const setStrengthValue = useCallback(
    (channel: 1 | 2, value: number) => {
      if (!sendRaw(strengthSet(channel, value))) {
        emit({ kind: "warning", title: "尚未配对，无法下发" });
      }
    },
    [emit, sendRaw],
  );

  const nudge = useCallback(
    (channel: 1 | 2, up: boolean) => {
      if (!sendRaw(strengthNudge(channel, up))) {
        emit({ kind: "warning", title: "尚未配对，无法下发" });
      }
    },
    [emit, sendRaw],
  );

  const emergencyStop = useCallback(() => {
    const ok =
      sendRaw(strengthSet(1, 0)) &&
      sendRaw(strengthSet(2, 0)) &&
      sendRaw(clearChannel(1)) &&
      sendRaw(clearChannel(2));
    if (ok) emit({ kind: "success", title: "已急停", description: "A/B 强度清零并清空波形" });
    else emit({ kind: "warning", title: "尚未配对，无法急停" });
  }, [emit, sendRaw]);

  const qrUrl = clientId ? qrPayload(relayOrigin, clientId) : null;

  return {
    state,
    clientId,
    targetId,
    strength,
    error,
    relayOrigin,
    qrUrl,
    connect,
    disconnect,
    setStrengthValue,
    nudge,
    emergencyStop,
  };
}

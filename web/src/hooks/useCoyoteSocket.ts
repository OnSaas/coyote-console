import { useCallback, useEffect, useRef, useState } from "react";
import {
  isDGLabMessage,
  parseFeedback,
  parseStrengthFeedback,
  qrPayload,
  relayWsUrl,
  sendClear,
  strengthSet,
  type StrengthFeedback,
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

export function useCoyoteSocket(onEvent: (event: RelayEvent) => void) {
  const [state, setState] = useState<ConnState>("idle");
  const [clientId, setClientId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [remoteStrength, setRemoteStrength] =
    useState<StrengthFeedback>(EMPTY_STRENGTH);
  const [error, setError] = useState<string | null>(null);
  const [relayOrigin] = useState(defaultRelayOrigin);

  const wsRef = useRef<WebSocket | null>(null);
  const idsRef = useRef({
    clientId: null as string | null,
    targetId: null as string | null,
  });
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const emit = useCallback((event: RelayEvent) => {
    onEventRef.current(event);
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
          emit({
            kind: "info",
            title: "已连接中继",
            description: "用 APP 扫码配对",
          });
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
          setState("error");
          emit({ kind: "error", title: "配对失败", description: "ID 已被绑定" });
        }
        return;
      }

      if (parsed.type === "break") {
        setTargetId(null);
        idsRef.current.targetId = null;
        setState("disconnected");
        emit({ kind: "warning", title: "APP 已断开" });
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
          setRemoteStrength(fb);
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
    [emit],
  );

  const disconnect = useCallback(() => {
    const ws = wsRef.current;
    wsRef.current = null;
    if (ws && ws.readyState < WebSocket.CLOSING) ws.close(1000, "client");
    setClientId(null);
    setTargetId(null);
    idsRef.current = { clientId: null, targetId: null };
    setRemoteStrength(EMPTY_STRENGTH);
    setError(null);
    setState("idle");
    emit({ kind: "info", title: "已断开中继" });
  }, [emit]);

  const connect = useCallback(() => {
    const prev = wsRef.current;
    wsRef.current = null;
    if (prev && prev.readyState < WebSocket.CLOSING) prev.close(1000, "reconnect");

    setClientId(null);
    setTargetId(null);
    idsRef.current = { clientId: null, targetId: null };
    setRemoteStrength(EMPTY_STRENGTH);
    setState("connecting");
    setError(null);

    const ws = new WebSocket(relayWsUrl(relayOrigin));
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      if (wsRef.current !== ws) return;
      if (typeof ev.data === "string") handleMessage(ev.data);
    };

    ws.onerror = () => {
      if (wsRef.current !== ws) return;
      setError("WebSocket 连接失败");
      setState("error");
      emit({ kind: "error", title: "连接失败" });
    };

    ws.onclose = () => {
      if (wsRef.current !== ws) return;
      wsRef.current = null;
      setState((prevState) => (prevState === "idle" ? prevState : "disconnected"));
    };
  }, [emit, handleMessage, relayOrigin]);

  useEffect(() => {
    return () => {
      const ws = wsRef.current;
      wsRef.current = null;
      if (ws && ws.readyState < WebSocket.CLOSING) ws.close(1000, "unmount");
    };
  }, []);

  const emergencyStop = useCallback(() => {
    const ok =
      sendRaw(strengthSet(1, 0)) &&
      sendRaw(strengthSet(2, 0)) &&
      sendRaw(sendClear(1)) &&
      sendRaw(sendClear(2));
    if (ok) {
      setRemoteStrength((s) => ({ ...s, a: 0, b: 0 }));
      emit({
        kind: "success",
        title: "已归零并清除波形",
      });
    } else {
      emit({ kind: "warning", title: "尚未配对，无法下发急停" });
    }
  }, [emit, sendRaw]);

  return {
    state,
    clientId,
    targetId,
    remoteStrength,
    error,
    relayOrigin,
    qrUrl: clientId ? qrPayload(relayOrigin, clientId) : null,
    sendRaw,
    connect,
    disconnect,
    emergencyStop,
  };
}

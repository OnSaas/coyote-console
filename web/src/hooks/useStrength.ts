import { useCallback, useEffect, useRef, useState } from "react";
import {
  STRENGTH_THROTTLE_MS,
  V4Channel,
  addIntensity,
  clearOperate,
  resetIntensity,
  type RpcReq,
  type V4ChannelId,
} from "../lib/protocol";
import type { StrengthFeedback } from "./useCoyoteSocket";

type Channel = 1 | 2;

interface Options {
  canControl: boolean;
  remote: StrengthFeedback;
  slotId: string | null;
  sendRpc: (req: RpcReq) => boolean;
  onBlocked: () => void;
}

export function useStrength({
  canControl,
  remote,
  slotId,
  sendRpc,
  onBlocked,
}: Options) {
  const [local, setLocal] = useState({ a: remote.a, b: remote.b });
  const lastSent = useRef({ a: remote.a, b: remote.b });
  const dragging = useRef({ a: false, b: false });
  const timer = useRef<number | null>(null);

  useEffect(() => {
    setLocal((prev) => ({
      a: dragging.current.a ? prev.a : remote.a,
      b: dragging.current.b ? prev.b : remote.b,
    }));
    if (!dragging.current.a) lastSent.current.a = remote.a;
    if (!dragging.current.b) lastSent.current.b = remote.b;
  }, [remote]);

  const sendDelta = useCallback(
    (ch: Channel, next: number) => {
      if (!canControl || !slotId) {
        onBlocked();
        return;
      }
      const key = ch === 1 ? "a" : "b";
      const channel: V4ChannelId = ch === 1 ? V4Channel.A : V4Channel.B;
      const delta = next - lastSent.current[key];
      if (delta === 0) return;
      if (sendRpc(addIntensity(slotId, channel, delta))) {
        lastSent.current[key] = next;
      }
    },
    [canControl, onBlocked, sendRpc, slotId],
  );

  const setChannel = useCallback(
    (ch: Channel, raw: number, immediate = false) => {
      const max = ch === 1 ? remote.aLimit : remote.bLimit;
      const next = Math.max(0, Math.min(max || 200, Math.round(raw)));
      const key = ch === 1 ? "a" : "b";
      setLocal((prev) => ({ ...prev, [key]: next }));
      dragging.current[key] = !immediate;

      if (timer.current) window.clearTimeout(timer.current);
      if (immediate) {
        sendDelta(ch, next);
        dragging.current[key] = false;
        return;
      }
      timer.current = window.setTimeout(() => {
        sendDelta(ch, next);
        dragging.current[key] = false;
      }, STRENGTH_THROTTLE_MS);
    },
    [remote.aLimit, remote.bLimit, sendDelta],
  );

  const nudge = useCallback(
    (ch: Channel, up: boolean) => {
      const key = ch === 1 ? "a" : "b";
      setChannel(ch, local[key] + (up ? 1 : -1), true);
    },
    [local, setChannel],
  );

  const emergencyStop = useCallback(() => {
    if (!canControl || !slotId) {
      onBlocked();
      return false;
    }
    sendRpc(resetIntensity(slotId, V4Channel.A));
    sendRpc(resetIntensity(slotId, V4Channel.B));
    sendRpc(clearOperate(slotId));
    lastSent.current = { a: 0, b: 0 };
    setLocal({ a: 0, b: 0 });
    return true;
  }, [canControl, onBlocked, sendRpc, slotId]);

  return {
    local,
    limits: { a: remote.aLimit, b: remote.bLimit },
    setChannel,
    nudge,
    emergencyStop,
  };
}

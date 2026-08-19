import { useCallback, useEffect, useRef, useState } from "react";
import {
  STRENGTH_THROTTLE_MS,
  strengthNudge,
  strengthSet,
  type StrengthFeedback,
} from "../lib/protocol";

type Channel = 1 | 2;

export function useStrength(opts: {
  canControl: boolean;
  remote: StrengthFeedback;
  sendRaw: (message: string) => boolean;
  onBlocked: () => void;
}) {
  const [local, setLocal] = useState({ a: opts.remote.a, b: opts.remote.b });
  const dragging = useRef({ a: false, b: false });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ channel: Channel; value: number } | null>(null);
  const sendRef = useRef(opts.sendRaw);
  sendRef.current = opts.sendRaw;
  const blockedRef = useRef(opts.onBlocked);
  blockedRef.current = opts.onBlocked;
  const canRef = useRef(opts.canControl);
  canRef.current = opts.canControl;

  useEffect(() => {
    setLocal((prev) => ({
      a: dragging.current.a ? prev.a : opts.remote.a,
      b: dragging.current.b ? prev.b : opts.remote.b,
    }));
  }, [opts.remote]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const next = pending.current;
    pending.current = null;
    if (!next) return;
    sendRef.current(strengthSet(next.channel, next.value));
  }, []);

  const queueSet = useCallback(
    (channel: Channel, value: number, immediate: boolean) => {
      const key = channel === 1 ? "a" : "b";
      const limit = channel === 1 ? opts.remote.aLimit : opts.remote.bLimit;
      const clamped = Math.max(0, Math.min(limit || 200, Math.round(value)));
      setLocal((prev) => ({ ...prev, [key]: clamped }));

      if (!canRef.current) {
        blockedRef.current();
        return;
      }

      pending.current = { channel, value: clamped };
      if (immediate) {
        flush();
        return;
      }
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, STRENGTH_THROTTLE_MS);
    },
    [flush, opts.remote.aLimit, opts.remote.bLimit],
  );

  const setDragging = useCallback((channel: Channel, active: boolean) => {
    const key = channel === 1 ? "a" : "b";
    dragging.current[key] = active;
    if (!active) flush();
  }, [flush]);

  const nudge = useCallback((channel: Channel, up: boolean) => {
    const key = channel === 1 ? "a" : "b";
    const limit = channel === 1 ? opts.remote.aLimit : opts.remote.bLimit;
    setLocal((prev) => {
      const next = Math.max(0, Math.min(limit || 200, prev[key] + (up ? 1 : -1)));
      return { ...prev, [key]: next };
    });
    if (!canRef.current) {
      blockedRef.current();
      return;
    }
    sendRef.current(strengthNudge(channel, up));
  }, [opts.remote.aLimit, opts.remote.bLimit]);

  const zeroLocal = useCallback(() => {
    setLocal({ a: 0, b: 0 });
  }, []);

  return {
    a: local.a,
    b: local.b,
    aLimit: opts.remote.aLimit,
    bLimit: opts.remote.bLimit,
    setChannel: queueSet,
    setDragging,
    nudge,
    zeroLocal,
  };
}

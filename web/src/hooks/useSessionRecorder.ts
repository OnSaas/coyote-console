import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteRecord,
  loadRecords,
  type RecordTag,
  type SessionRecord,
  upsertRecord,
} from "../lib/records";

export function useSessionRecorder(opts: {
  paired: boolean;
  a: number;
  b: number;
  autoSave: boolean;
}) {
  const [records, setRecords] = useState<SessionRecord[]>(() =>
    typeof window === "undefined" ? [] : loadRecords(),
  );
  const [live, setLive] = useState<SessionRecord | null>(null);
  const liveRef = useRef<SessionRecord | null>(null);
  const [, tick] = useState(0);

  useEffect(() => {
    if (!opts.paired) return;
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [opts.paired]);

  useEffect(() => {
    if (opts.paired && !liveRef.current) {
      const rec: SessionRecord = {
        id: crypto.randomUUID(),
        startedAt: Date.now(),
        endedAt: Date.now(),
        durationMs: 0,
        maxA: opts.a,
        maxB: opts.b,
        stops: 0,
        waves: [],
        note: "",
        tag: "",
      };
      liveRef.current = rec;
      setLive(rec);
    }
  }, [opts.a, opts.b, opts.paired]);

  useEffect(() => {
    const rec = liveRef.current;
    if (!rec || !opts.paired) return;
    rec.maxA = Math.max(rec.maxA, opts.a);
    rec.maxB = Math.max(rec.maxB, opts.b);
    rec.endedAt = Date.now();
    rec.durationMs = rec.endedAt - rec.startedAt;
    setLive({ ...rec });
  }, [opts.a, opts.b, opts.paired]);

  const markStop = useCallback(() => {
    if (!liveRef.current) return;
    liveRef.current.stops += 1;
    setLive({ ...liveRef.current });
  }, []);

  const markWave = useCallback((name: string) => {
    if (!liveRef.current) return;
    liveRef.current.waves.push(name);
    setLive({ ...liveRef.current });
  }, []);

  const finalize = useCallback(
    (extra?: Partial<SessionRecord>) => {
      const rec = liveRef.current;
      if (!rec) return null;
      rec.endedAt = Date.now();
      rec.durationMs = rec.endedAt - rec.startedAt;
      const saved = { ...rec, ...extra };
      liveRef.current = null;
      setLive(null);
      if (opts.autoSave || extra) {
        setRecords((list) => upsertRecord(list, saved));
      }
      return saved;
    },
    [opts.autoSave],
  );

  useEffect(() => {
    if (!opts.paired && liveRef.current) {
      finalize();
    }
  }, [finalize, opts.paired]);

  const saveManual = useCallback((rec: SessionRecord) => {
    setRecords((list) => upsertRecord(list, rec));
  }, []);

  const remove = useCallback((id: string) => {
    setRecords((list) => deleteRecord(list, id));
  }, []);

  return { records, live, markStop, markWave, finalize, saveManual, remove };
}

export function emptyManual(): SessionRecord {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    startedAt: now - 60_000,
    endedAt: now,
    durationMs: 60_000,
    maxA: 0,
    maxB: 0,
    stops: 0,
    waves: [],
    note: "",
    tag: "" as RecordTag,
  };
}

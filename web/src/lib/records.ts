const KEY = "coyote-records-v1";

export type RecordTag = "练习" | "正式" | "";

export interface SessionRecord {
  id: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  maxA: number;
  maxB: number;
  stops: number;
  waves: string[];
  note: string;
  tag: RecordTag;
}

export function loadRecords(): SessionRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SessionRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecords(list: SessionRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function upsertRecord(list: SessionRecord[], rec: SessionRecord): SessionRecord[] {
  const i = list.findIndex((r) => r.id === rec.id);
  const next = i >= 0 ? list.map((r) => (r.id === rec.id ? rec : r)) : [rec, ...list];
  saveRecords(next);
  return next;
}

export function deleteRecord(list: SessionRecord[], id: string): SessionRecord[] {
  const next = list.filter((r) => r.id !== id);
  saveRecords(next);
  return next;
}

export function clearAllRecords() {
  saveRecords([]);
}

export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h} 小时 ${m} 分 ${sec} 秒`;
  if (m > 0) return `${m} 分 ${sec} 秒`;
  return `${sec} 秒`;
}

export function formatClock(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function shareText(rec: SessionRecord): string {
  return [
    "Coyote 战绩",
    `时长 ${formatDuration(rec.durationMs)}`,
    `最高 A ${rec.maxA} / B ${rec.maxB}`,
    formatClock(rec.startedAt),
    rec.note ? `备注 ${rec.note}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
}

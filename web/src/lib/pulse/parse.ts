const PREFIX = "Dungeonlab+pulse:";
const MAX_FRAMES = 300; // 30s @ 100ms

export interface ParsedPulse {
  name: string;
  frames: string[];
  durationMs: number;
}

export function normalizePulseText(raw: string): string {
  let t = raw.replace(/^\uFEFF/, "").trim().replace(/\r\n/g, "\n");
  if (!t) throw new Error("空文件");
  if (
    !t.includes("Dungeonlab+pulse") &&
    t.includes("+section+") &&
    t.includes("=")
  ) {
    t = PREFIX + t;
  }
  return t;
}

export function parsePulseText(raw: string, fallbackName: string): ParsedPulse {
  const text = normalizePulseText(raw);

  const json = tryJson(text, fallbackName);
  if (json) return json;

  const hex = tryHexDump(text, fallbackName);
  if (hex) return hex;

  if (
    text.includes(PREFIX) ||
    text.toLowerCase().includes("dungeonlab+pulse")
  ) {
    return parseDungeonlab(text, fallbackName);
  }

  const nums = tryNumberList(text, fallbackName);
  if (nums) return nums;

  throw new Error("无法识别为 .pulse / hex / JSON 波形");
}

function tryJson(text: string, fallbackName: string): ParsedPulse | null {
  if (!text.startsWith("{") && !text.startsWith("[")) return null;
  try {
    const data = JSON.parse(text) as unknown;
    if (Array.isArray(data) && data.every((x) => typeof x === "string")) {
      return packFrames(fallbackName, data as string[]);
    }
    if (data && typeof data === "object") {
      const o = data as Record<string, unknown>;
      const name = String(o.name || fallbackName);
      if (Array.isArray(o.frames) && o.frames.every((x) => typeof x === "string")) {
        return packFrames(name, o.frames as string[]);
      }
      if (Array.isArray(o.pulseData)) {
        const pairs = flattenPairs(o.pulseData);
        return pairsToFrames(name, pairs);
      }
    }
  } catch {
    return null;
  }
  return null;
}

function tryHexDump(text: string, fallbackName: string): ParsedPulse | null {
  const tokens = text
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) return null;
  if (!tokens.every((t) => /^[0-9a-fA-F]{16}$/.test(t))) return null;
  return packFrames(fallbackName, tokens.map((t) => t.toUpperCase()));
}

function tryNumberList(text: string, fallbackName: string): ParsedPulse | null {
  if (!/^[\d\s,.\n+-]+$/.test(text)) return null;
  const nums = text
    .split(/[\s,]+/)
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n));
  if (nums.length < 2) return null;
  return pairsToFrames(fallbackName, toPairs(nums));
}

function parseDungeonlab(text: string, fallbackName: string): ParsedPulse {
  const idx = text.toLowerCase().indexOf("dungeonlab+pulse:");
  const body = idx >= 0 ? text.slice(idx + PREFIX.length) : text;
  const eq = body.indexOf("=");
  if (eq < 0) throw new Error("缺少 = 数据段");
  const head = body.slice(0, eq);
  const data = body.slice(eq + 1);
  const name = (head.split(",")[0] || fallbackName).trim() || fallbackName;
  const sections = data.split("+section+");
  const nums: number[] = [];
  for (const sec of sections) {
    for (const part of sec.split(",")) {
      const n = Number(part.trim());
      if (Number.isFinite(n)) nums.push(n);
    }
  }
  if (nums.length < 2) throw new Error("波形数据太短");
  return pairsToFrames(name, toPairs(nums));
}

function toPairs(nums: number[]): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    out.push([nums[i], nums[i + 1]]);
  }
  return out;
}

function flattenPairs(data: unknown[]): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const item of data) {
    if (Array.isArray(item) && item.length >= 2) {
      out.push([Number(item[0]) || 0, Number(item[1]) || 0]);
    }
  }
  return out;
}

function pairsToFrames(name: string, pairs: Array<[number, number]>): ParsedPulse {
  if (pairs.length === 0) throw new Error("没有有效脉冲点");
  const frames: string[] = [];
  for (let i = 0; i < pairs.length && frames.length < MAX_FRAMES; i += 4) {
    const chunk = pairs.slice(i, i + 4);
    while (chunk.length < 4) chunk.push(chunk[chunk.length - 1] ?? [10, 0]);
    const freq = chunk.map((p) => toByte(p[0]));
    const amp = chunk.map((p) => toByte(p[1]));
    frames.push(
      [...freq, ...amp]
        .map((n) => n.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase(),
    );
  }
  return packFrames(name, frames);
}

function toByte(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const v = Math.round(n);
  return Math.max(0, Math.min(255, v));
}

function packFrames(name: string, frames: string[]): ParsedPulse {
  const clean = frames
    .map((f) => f.replace(/\s/g, "").toUpperCase())
    .filter((f) => /^[0-9A-F]{16}$/.test(f))
    .slice(0, MAX_FRAMES);
  if (clean.length === 0) throw new Error("没有有效帧");
  return {
    name: name.trim() || "未命名",
    frames: clean,
    durationMs: clean.length * 100,
  };
}

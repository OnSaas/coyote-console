export const QR_LANDING = "https://dungeon-lab.cn/s/";
export const STRENGTH_THROTTLE_MS = 120;
export const MAX_STRENGTH = 200;

export const V4Channel = { A: 0, B: 1 } as const;
export type V4ChannelId = (typeof V4Channel)[keyof typeof V4Channel];

export interface ServerFrame {
  type: string;
  clientId?: string;
  data?: unknown;
  ts?: number;
  code?: string;
  message?: string;
}

export interface RpcReq {
  t: "req";
  reqId: string;
  m: string;
  data?: unknown;
}

export interface RpcResp {
  t: "resp";
  reqId: string;
  result?: unknown;
  error?: string;
}

export interface EvFrame {
  t: "ev";
  ev: string;
  [key: string]: unknown;
}

export interface RemoteDevice {
  id?: number;
  slotId: string;
  name: string;
  type: string;
  props?: Record<string, unknown>;
  slotState?: Record<string, unknown>;
}

export function relayWsUrl(origin: string): string {
  return origin.replace(/^http/, "ws").replace(/\/$/, "") + "/ws";
}

export function appWsUrl(origin: string, targetId: string): string {
  return `${relayWsUrl(origin)}?tid=${encodeURIComponent(targetId)}`;
}

export function qrPayload(origin: string, targetId: string): string {
  return `${QR_LANDING}?v=1&action=socket&url=${encodeURIComponent(appWsUrl(origin, targetId))}`;
}

export function rpcReq(m: string, data?: unknown): RpcReq {
  return { t: "req", reqId: crypto.randomUUID(), m, data };
}

export function addIntensity(
  slotId: string,
  channel: V4ChannelId,
  delta: number,
): RpcReq {
  return rpcReq("device.op", {
    s: slotId,
    t: 3,
    c: channel,
    p: 1,
    im: true,
    v: delta,
  });
}

export function resetIntensity(slotId: string, channel: V4ChannelId): RpcReq {
  return rpcReq("device.op", {
    s: slotId,
    t: 7,
    c: channel,
    im: true,
    v: 0,
  });
}

export function clearOperate(slotId?: string): RpcReq {
  return slotId
    ? rpcReq("device.op.clear", { s: slotId })
    : rpcReq("device.op.clear");
}

export function pickDevice(list: RemoteDevice[]): RemoteDevice | undefined {
  return (
    list.find((d) => d.type === "COYOTE_030" || d.type === "COYOTE_020") ??
    list.find((d) => Boolean(d.slotId))
  );
}

export function isServerFrame(value: unknown): value is ServerFrame {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as ServerFrame).type === "string",
  );
}

export function readIntensity(device: RemoteDevice): {
  a: number;
  b: number;
  aLimit: number;
  bLimit: number;
} {
  const props = device.props ?? {};
  const state = device.slotState ?? {};
  const channelA = (state.channelA ?? {}) as Record<string, unknown>;
  const channelB = (state.channelB ?? {}) as Record<string, unknown>;
  return {
    a: num(props.intensityA) || num(channelA.intensity),
    b: num(props.intensityB) || num(channelB.intensity),
    aLimit: num(channelA.intensityMax, 200),
    bLimit: num(channelB.intensityMax, 200),
  };
}

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

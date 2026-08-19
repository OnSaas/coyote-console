export const QR_PREFIX =
  "https://www.dungeon-lab.com/app-download.php#DGLAB-SOCKET#";

export const MAX_STRENGTH = 200;

export type MessageType = "bind" | "msg" | "heartbeat" | "break" | "error";

export interface DGLabMessage {
  type: MessageType;
  clientId: string;
  targetId: string;
  message: string;
}

export function isDGLabMessage(value: unknown): value is DGLabMessage {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.type === "string" &&
    typeof v.clientId === "string" &&
    typeof v.targetId === "string" &&
    typeof v.message === "string"
  );
}

export function relayWsUrl(relayOrigin: string): string {
  return relayOrigin.replace(/^http/, "ws").replace(/\/$/, "") + "/";
}

export function qrPayload(relayOrigin: string, clientId: string): string {
  const ws = relayOrigin.replace(/^http/, "ws").replace(/\/$/, "");
  return `${QR_PREFIX}${ws}/${clientId}`;
}

export function strengthSet(channel: 1 | 2, value: number): string {
  const n = Math.max(0, Math.min(MAX_STRENGTH, Math.round(value)));
  return `strength-${channel}+2+${n}`;
}

export function strengthNudge(channel: 1 | 2, up: boolean): string {
  return `strength-${channel}+${up ? 1 : 0}+1`;
}

export function clearChannel(channel: 1 | 2): string {
  return `clear-${channel}`;
}

export interface StrengthFeedback {
  a: number;
  b: number;
  aLimit: number;
  bLimit: number;
}

export function parseStrengthFeedback(
  message: string,
): StrengthFeedback | null {
  const m = /^strength-(\d+)\+(\d+)\+(\d+)\+(\d+)$/.exec(message);
  if (!m) return null;
  return {
    a: Number(m[1]),
    b: Number(m[2]),
    aLimit: Number(m[3]),
    bLimit: Number(m[4]),
  };
}

export function parseFeedback(message: string): number | null {
  const m = /^feedback-(\d+)$/.exec(message);
  return m ? Number(m[1]) : null;
}

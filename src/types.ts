export type Role = "controller" | "app";

export interface Attachment {
  role: Role;
  clientId: string;
}

export const HEARTBEAT_MS = 30_000;
export const IDLE_TIMEOUT_MS = 5 * 60_000;

export const Close = {
  CONTROLLER_GONE: { code: 4000, reason: "controller_disconnected" },
  CONTROLLER_MISSING: { code: 4001, reason: "controller_not_found" },
  IDLE: { code: 4002, reason: "idle_timeout" },
} as const;

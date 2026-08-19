export type MessageType = "bind" | "msg" | "heartbeat" | "break" | "error";

export type Role = "controller" | "app";

export interface DGLabMessage {
  type: MessageType;
  clientId: string;
  targetId: string;
  message: string;
}

export interface Attachment {
  role: Role;
  clientId: string;
}

/** APP 丢弃超过该长度的 JSON */
export const MAX_JSON_CHARS = 1950;

export const HEARTBEAT_MS = 60_000;

/** 官方错误码 */
export const Code = {
  OK: "200",
  PEER_GONE: "209",
  BAD_QR_ID: "210",
  BIND_DELAY: "211",
  ALREADY_BOUND: "400",
  TARGET_MISSING: "401",
  NOT_BOUND: "402",
  BAD_JSON: "403",
  OFFLINE: "404",
  TOO_LONG: "405",
  INTERNAL: "500",
} as const;

export const QR_PREFIX =
  "https://www.dungeon-lab.com/app-download.php#DGLAB-SOCKET#";

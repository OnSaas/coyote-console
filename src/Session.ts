import { DurableObject } from "cloudflare:workers";
import {
  Close,
  HEARTBEAT_MS,
  IDLE_TIMEOUT_MS,
  type Attachment,
} from "./types";

interface ServerFrame {
  type: string;
  clientId?: string;
  data?: unknown;
  ts?: number;
  code?: string;
  message?: string;
}

export class Session extends DurableObject<Env> {
  controllerWs: WebSocket | null = null;
  controllerId: string | null = null;
  apps = new Map<string, WebSocket>();
  lastIdleAt = 0;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    this.ctx.getWebSockets().forEach((ws) => {
      const att = ws.deserializeAttachment() as Attachment | null;
      if (!att) return;
      if (att.role === "controller") {
        this.controllerWs = ws;
        this.controllerId = att.clientId;
      } else {
        this.apps.set(att.clientId, ws);
      }
    });

    if (this.controllerWs && this.apps.size === 0) {
      this.lastIdleAt = Date.now();
    }

    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong"),
    );
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const url = new URL(request.url);
    const tid = url.searchParams.get("tid") ?? url.searchParams.get("targetId");
    const forcedId = url.searchParams.get("clientId");
    const isApp = Boolean(tid) || url.searchParams.get("role") === "app";

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);

    const clientId = forcedId || newClientId();
    server.serializeAttachment({
      role: isApp ? "app" : "controller",
      clientId,
    } satisfies Attachment);

    this.send(server, { type: "hello", clientId });

    if (isApp) {
      await this.attachApp(server, clientId);
    } else {
      await this.attachController(server, clientId);
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== "string") return;
    const att = ws.deserializeAttachment() as Attachment | null;
    if (!att) return;

    let frame: ServerFrame;
    try {
      frame = JSON.parse(message) as ServerFrame;
    } catch {
      return;
    }

    if (frame.type === "ping") {
      this.send(ws, { type: "pong", ts: Date.now() });
      return;
    }
    if (frame.type === "heartbeat" || frame.type === "pong") return;
    if (frame.type !== "message") return;

    if (att.role === "controller") {
      if (typeof frame.clientId !== "string") {
        this.send(ws, {
          type: "error",
          code: "bad_request",
          message: "message.clientId is required",
        });
        return;
      }
      const app = this.apps.get(frame.clientId);
      if (!app) {
        this.send(ws, {
          type: "error",
          code: "client_not_found",
          clientId: frame.clientId,
        });
        return;
      }
      this.send(app, { type: "message", data: frame.data });
      return;
    }

    if (!this.controllerWs) return;
    this.send(this.controllerWs, {
      type: "message",
      clientId: att.clientId,
      data: frame.data,
    });
  }

  async webSocketClose(ws: WebSocket) {
    const att = ws.deserializeAttachment() as Attachment | null;
    if (!att) return;

    if (att.role === "controller") {
      if (this.controllerWs === ws) {
        this.controllerWs = null;
        this.controllerId = null;
        for (const [id, app] of this.apps) {
          this.send(app, {
            type: "controller_disconnected",
            clientId: att.clientId,
          });
          try {
            app.close(Close.CONTROLLER_GONE.code, Close.CONTROLLER_GONE.reason);
          } catch {
            /* already closed */
          }
          this.apps.delete(id);
        }
      }
      return;
    }

    if (this.apps.get(att.clientId) === ws) {
      this.apps.delete(att.clientId);
      if (this.controllerWs) {
        this.send(this.controllerWs, {
          type: "client_disconnected",
          clientId: att.clientId,
        });
        if (this.apps.size === 0) {
          this.lastIdleAt = Date.now();
          await this.ensureAlarm();
        }
      }
    }
  }

  async webSocketError(ws: WebSocket) {
    await this.webSocketClose(ws);
  }

  async alarm() {
    const sockets = this.ctx.getWebSockets();
    if (sockets.length === 0) return;

    for (const ws of sockets) {
      this.send(ws, { type: "heartbeat" });
    }

    if (this.controllerWs && this.apps.size === 0 && this.lastIdleAt > 0) {
      if (Date.now() - this.lastIdleAt >= IDLE_TIMEOUT_MS) {
        this.send(this.controllerWs, { type: "idle_timeout" });
        try {
          this.controllerWs.close(Close.IDLE.code, Close.IDLE.reason);
        } catch {
          /* ignore */
        }
        return;
      }
    }

    await this.ctx.storage.setAlarm(Date.now() + HEARTBEAT_MS);
  }

  private async attachController(server: WebSocket, clientId: string) {
    if (this.controllerWs && this.controllerWs !== server) {
      try {
        this.controllerWs.close(4000, "replaced");
      } catch {
        /* ignore */
      }
    }

    this.controllerWs = server;
    this.controllerId = clientId;
    if (this.apps.size === 0) this.lastIdleAt = Date.now();
    await this.ensureAlarm();
  }

  private async attachApp(server: WebSocket, clientId: string) {
    if (!this.controllerWs || !this.controllerId) {
      this.send(server, { type: "error", code: "controller_not_found" });
      try {
        server.close(
          Close.CONTROLLER_MISSING.code,
          Close.CONTROLLER_MISSING.reason,
        );
      } catch {
        /* ignore */
      }
      return;
    }

    this.apps.set(clientId, server);
    this.lastIdleAt = 0;
    this.send(server, {
      type: "controller_attached",
      clientId: this.controllerId,
    });
    this.send(this.controllerWs, {
      type: "client_attached",
      clientId,
    });
    await this.ensureAlarm();
  }

  private send(ws: WebSocket, frame: ServerFrame) {
    try {
      ws.send(JSON.stringify(frame));
    } catch {
      /* closed */
    }
  }

  private async ensureAlarm() {
    const existing = await this.ctx.storage.getAlarm();
    if (existing == null) {
      await this.ctx.storage.setAlarm(Date.now() + HEARTBEAT_MS);
    }
  }
}

export function newClientId(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

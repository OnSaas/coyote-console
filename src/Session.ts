import { DurableObject } from "cloudflare:workers";
import {
  Code,
  HEARTBEAT_MS,
  MAX_JSON_CHARS,
  type Attachment,
  type DGLabMessage,
  type Role,
} from "./types";

export class Session extends DurableObject<Env> {
  controllerWs: WebSocket | null = null;
  appWs: WebSocket | null = null;
  controllerId: string | null = null;
  appId: string | null = null;
  bound = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    for (const ws of this.ctx.getWebSockets()) {
      const att = ws.deserializeAttachment() as Attachment | null;
      if (!att) continue;
      if (att.role === "controller") {
        this.controllerWs = ws;
        this.controllerId = att.clientId;
      } else {
        this.appWs = ws;
        this.appId = att.clientId;
      }
    }
    this.bound = Boolean(this.controllerId && this.appId);

    // 文本 ping/pong，Hibernation 下不唤醒 DO
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong"),
    );
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const url = new URL(request.url);
    const role = (url.searchParams.get("role") || "app") as Role;
    const presetId = url.searchParams.get("clientId");

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    const clientId =
      role === "controller" && presetId ? presetId : crypto.randomUUID();

    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ role, clientId } satisfies Attachment);

    if (role === "controller") {
      if (this.controllerWs && this.controllerWs !== server) {
        this.safeClose(this.controllerWs, 4000, "replaced");
      }
      this.controllerWs = server;
      this.controllerId = clientId;
    } else {
      if (this.appWs && this.appWs !== server) {
        this.safeClose(this.appWs, 4000, "replaced");
      }
      this.appWs = server;
      this.appId = clientId;
    }

    // 1) 分配本端 ID
    this.send(server, {
      type: "bind",
      clientId,
      targetId: "",
      message: "targetId",
    });

    await this.ensureHeartbeat();

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== "string") return;
    if (message === "ping") return;

    const att = ws.deserializeAttachment() as Attachment | null;
    if (!att) return;

    if (message.length > MAX_JSON_CHARS) {
      this.send(ws, this.envelope("error", Code.TOO_LONG));
      return;
    }

    let data: DGLabMessage;
    try {
      data = JSON.parse(message) as DGLabMessage;
    } catch {
      this.send(ws, this.envelope("error", Code.BAD_JSON));
      return;
    }

    if (!data || typeof data !== "object" || !data.type) {
      this.send(ws, this.envelope("error", Code.BAD_JSON));
      return;
    }

    switch (data.type) {
      case "bind":
        this.handleBind(ws, att, data);
        return;
      case "msg":
        this.forward(ws, att, data);
        return;
      case "heartbeat":
        this.send(ws, this.envelope("heartbeat", Code.OK));
        return;
      case "break":
        this.handleBreak(att);
        return;
      default:
        return;
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string) {
    const att = ws.deserializeAttachment() as Attachment | null;
    this.dropSocket(ws, att);
    if (code !== 4000 && att) {
      this.notifyPeerGone(att);
    }
    if (this.ctx.getWebSockets().length === 0) {
      await this.ctx.storage.deleteAlarm();
    }
    try {
      ws.close(code, reason);
    } catch {
      /* already closed */
    }
  }

  async webSocketError(ws: WebSocket) {
    const att = ws.deserializeAttachment() as Attachment | null;
    this.dropSocket(ws, att);
    if (att) this.notifyPeerGone(att);
  }

  async alarm() {
    const sockets = this.ctx.getWebSockets();
    if (sockets.length === 0) return;
    for (const ws of sockets) {
      this.send(ws, this.envelope("heartbeat", Code.OK));
    }
    await this.ctx.storage.setAlarm(Date.now() + HEARTBEAT_MS);
  }

  private handleBind(ws: WebSocket, _att: Attachment, data: DGLabMessage) {
    if (data.message !== "DGLAB") return;

    const controllerId = data.clientId;
    const appId = data.targetId;
    if (!controllerId || !appId) {
      this.send(ws, this.envelope("error", Code.TARGET_MISSING));
      return;
    }

    if (this.controllerId && this.controllerId !== controllerId) {
      this.send(ws, this.envelope("bind", Code.TARGET_MISSING));
      return;
    }

    if (this.bound && this.appId && this.appId !== appId) {
      this.send(ws, this.envelope("bind", Code.ALREADY_BOUND));
      return;
    }

    if (!this.controllerWs || !this.appWs) {
      this.send(ws, this.envelope("bind", Code.TARGET_MISSING));
      return;
    }

    this.controllerId = controllerId;
    this.appId = appId;
    this.bound = true;

    const ok: DGLabMessage = {
      type: "bind",
      clientId: controllerId,
      targetId: appId,
      message: Code.OK,
    };
    this.send(this.controllerWs, ok);
    this.send(this.appWs, ok);
  }

  private forward(_ws: WebSocket, att: Attachment, data: DGLabMessage) {
    if (!this.bound || !this.controllerId || !this.appId) {
      this.send(_ws, this.envelope("error", Code.NOT_BOUND));
      return;
    }

    const peer = att.role === "controller" ? this.appWs : this.controllerWs;
    if (!peer) {
      this.send(_ws, this.envelope("error", Code.OFFLINE));
      return;
    }

    this.send(peer, {
      type: "msg",
      clientId: this.controllerId,
      targetId: this.appId,
      message: data.message ?? "",
    });
  }

  private handleBreak(att: Attachment) {
    const peer = att.role === "controller" ? this.appWs : this.controllerWs;
    if (peer) {
      this.send(peer, this.envelope("break", Code.PEER_GONE));
      this.safeClose(peer, 1000, "break");
    }
    this.bound = false;
  }

  private notifyPeerGone(att: Attachment) {
    const peer = att.role === "controller" ? this.appWs : this.controllerWs;
    if (!peer) return;
    this.send(peer, this.envelope("break", Code.PEER_GONE));
    this.bound = false;
  }

  private dropSocket(ws: WebSocket, att: Attachment | null) {
    if (!att) {
      if (this.controllerWs === ws) this.controllerWs = null;
      if (this.appWs === ws) this.appWs = null;
      return;
    }
    if (att.role === "controller") {
      if (this.controllerWs === ws) this.controllerWs = null;
    } else if (this.appWs === ws) {
      this.appWs = null;
    }
  }

  private envelope(
    type: DGLabMessage["type"],
    message: string,
  ): DGLabMessage {
    return {
      type,
      clientId: this.controllerId ?? "0",
      targetId: this.appId ?? "0",
      message,
    };
  }

  private send(ws: WebSocket, payload: DGLabMessage) {
    const body = JSON.stringify(payload);
    if (body.length > MAX_JSON_CHARS) return;
    try {
      ws.send(body);
    } catch {
      /* closed */
    }
  }

  private safeClose(ws: WebSocket, code: number, reason: string) {
    try {
      ws.close(code, reason);
    } catch {
      /* already closed */
    }
  }

  private async ensureHeartbeat() {
    const existing = await this.ctx.storage.getAlarm();
    if (existing == null) {
      await this.ctx.storage.setAlarm(Date.now() + HEARTBEAT_MS);
    }
  }
}

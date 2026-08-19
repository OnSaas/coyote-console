import { QR_PREFIX } from "./types";
import { Session } from "./Session";

export { Session };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (request.headers.get("Upgrade") === "websocket") {
        return routeWebSocket(request, env, url);
      }

      if (request.method === "GET" && url.pathname === "/health") {
        return Response.json({ ok: true, service: "coyote-console" });
      }

      if (request.method === "GET" && url.pathname === "/") {
        return new Response(landing(url.origin), {
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      }

      return new Response("Not Found", { status: 404 });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        JSON.stringify({
          level: "error",
          message: "unhandled",
          error: message,
          path: url.pathname,
        }),
      );
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;

function routeWebSocket(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> | Response {
  const segs = url.pathname.split("/").filter(Boolean);

  // 控制端：wss://host/  → 新建 session，clientId = DO name
  if (segs.length === 0) {
    const clientId = crypto.randomUUID();
    const dest = new URL(request.url);
    dest.pathname = `/${clientId}`;
    dest.searchParams.set("role", "controller");
    dest.searchParams.set("clientId", clientId);
    return env.SESSION.getByName(clientId).fetch(new Request(dest, request));
  }

  // APP / 重连：wss://host/<controllerId>  （二维码要求中间不能再插路径）
  if (segs.length === 1 && UUID_RE.test(segs[0])) {
    const sessionId = segs[0];
    const dest = new URL(request.url);
    if (!dest.searchParams.get("role")) dest.searchParams.set("role", "app");
    dest.searchParams.set("sessionId", sessionId);
    return env.SESSION.getByName(sessionId).fetch(new Request(dest, request));
  }

  return new Response("Expected wss://host or wss://host/<uuid>", {
    status: 400,
  });
}

function landing(origin: string): string {
  const ws = origin.replace(/^http/, "ws");
  return [
    "coyote-console  DG-Lab Socket V3 relay",
    "",
    "控制端:  " + ws + "/",
    "APP:     " + ws + "/<controllerId>",
    "二维码:  " + QR_PREFIX + ws + "/<controllerId>",
    "health:  " + origin + "/health",
    "",
  ].join("\n");
}

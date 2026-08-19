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

      return env.ASSETS.fetch(request);
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

  if (segs.length === 0) {
    const clientId = crypto.randomUUID();
    const dest = new URL(request.url);
    dest.pathname = `/${clientId}`;
    dest.searchParams.set("role", "controller");
    dest.searchParams.set("clientId", clientId);
    return env.SESSION.getByName(clientId).fetch(new Request(dest, request));
  }

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

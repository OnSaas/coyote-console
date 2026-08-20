import { Session } from "./Session";

export { Session };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (request.headers.get("Upgrade") === "websocket") {
        return routeWebSocket(request, env, url);
      }

      if (isWorkerHttpPath(url.pathname)) {
        return handleHttp(request, url);
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

function isWorkerHttpPath(pathname: string): boolean {
  return (
    pathname === "/health" ||
    pathname === "/ws" ||
    pathname === "/v4" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/ws/") ||
    pathname.startsWith("/v4/")
  );
}

function handleHttp(request: Request, url: URL): Response {
  if (url.pathname === "/health" || url.pathname === "/api/health") {
    return Response.json({
      ok: true,
      service: "coyote-console",
      protocol: "v4",
    });
  }

  if (url.pathname === "/api/ok") {
    return Response.json({ ok: true });
  }

  if (url.pathname === "/api/create") {
    if (request.method !== "POST") {
      return Response.json(
        { error: "Method Not Allowed" },
        { status: 405, headers: { Allow: "POST" } },
      );
    }
    const clientId = crypto.randomUUID();
    const wsOrigin = url.origin.replace(/^http/, "ws");
    return Response.json({
      ok: true,
      clientId,
      sessionId: clientId,
      wsUrl: `${wsOrigin}/ws?sid=${clientId}`,
      appWsUrl: `${wsOrigin}/ws?tid=${clientId}`,
    });
  }

  if (
    url.pathname === "/ws" ||
    url.pathname === "/v4" ||
    url.pathname.startsWith("/ws/") ||
    url.pathname.startsWith("/v4/")
  ) {
    return new Response("Expected Upgrade: websocket", { status: 426 });
  }

  return Response.json({ error: "Not Found" }, { status: 404 });
}

function routeWebSocket(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> | Response {
  const segs = url.pathname.split("/").filter(Boolean);
  const tid = url.searchParams.get("tid");
  const sid = url.searchParams.get("sid");

  if (tid) {
    const dest = new URL(request.url);
    dest.searchParams.set("role", "app");
    dest.searchParams.set("sessionId", tid);
    return env.SESSION.getByName(tid).fetch(new Request(dest, request));
  }

  const controllerPath =
    segs.length === 0 ||
    (segs.length === 1 && (segs[0] === "v4" || segs[0] === "ws"));

  if (controllerPath || sid) {
    const clientId = sid || crypto.randomUUID();
    const dest = new URL(request.url);
    dest.searchParams.set("role", "controller");
    dest.searchParams.set("clientId", clientId);
    return env.SESSION.getByName(clientId).fetch(new Request(dest, request));
  }

  return new Response("Expected wss://host/ws or wss://host/ws?tid=", {
    status: 400,
  });
}

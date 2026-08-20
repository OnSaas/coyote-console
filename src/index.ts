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
        return handleHttp(url);
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

function handleHttp(url: URL): Response {
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

  // APP：/?tid=  或  /v4?tid=  或  /ws?tid=
  if (tid) {
    const dest = new URL(request.url);
    dest.searchParams.set("role", "app");
    dest.searchParams.set("sessionId", tid);
    return env.SESSION.getByName(tid).fetch(new Request(dest, request));
  }

  // 控制端：/v4  /ws  /
  if (
    segs.length === 0 ||
    (segs.length === 1 && (segs[0] === "v4" || segs[0] === "ws"))
  ) {
    const clientId = crypto.randomUUID();
    const dest = new URL(request.url);
    dest.searchParams.set("role", "controller");
    dest.searchParams.set("clientId", clientId);
    return env.SESSION.getByName(clientId).fetch(new Request(dest, request));
  }

  return new Response("Expected wss://host/v4 or wss://host/v4?tid=", {
    status: 400,
  });
}

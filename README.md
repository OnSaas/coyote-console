# coyote-console

Cloudflare Workers + Durable Objects + WebSocket Hibernation，DG-Lab Socket V3 中继。

一对 session 一个 DO：控制端连 `wss://host/`，APP 扫码连 `wss://host/<controllerId>`。

## 协议（官方 V3）

1. 任意一端连上后收到 `{ type: "bind", clientId, targetId: "", message: "targetId" }`
2. APP 发送 `{ type: "bind", clientId: 控制端ID, targetId: APP_ID, message: "DGLAB" }`
3. 双方收到 `{ type: "bind", ..., message: "200" }`
4. 之后 `msg` 双向转发；断线对端收到 `break / 209`
5. 60s 应用层 heartbeat；另支持文本 `ping`/`pong`（不唤醒 DO）

二维码（必须恰好两个 `#`，host 与 ID 之间不能再插路径）：

```
https://www.dungeon-lab.com/app-download.php#DGLAB-SOCKET#wss://<host>/<controllerId>
```

## 命令

```bash
pnpm install
pnpm cf-typegen
pnpm typecheck
pnpm dev
pnpm deploy
```

`public/` 留给后续控制台前端。

## 账号

部署到 Cloudflare **EdgeNux**（`*.onw.workers.dev`）。

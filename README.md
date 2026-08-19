# coyote-console

Cloudflare Workers + Durable Objects + WebSocket Hibernation，DG-Lab Socket V3 中继 + Kumo 最小控制台。

线上：https://coyote-console.onw.workers.dev

一对 session 一个 DO：控制端连 `wss://host/`，APP 扫码连 `wss://host/<controllerId>`。

## 前端

Vite + React + TypeScript + [@cloudflare/kumo](https://kumo-ui.com) + Phosphor。

- 连接状态 / 扫码配对
- A/B 通道强度（Slider + 输入 + ±1）
- 急停（强度清零 + `clear-1/2`）

源码在 `web/`，构建产物进 `public/`，由 Workers Assets 托管。WS 与 `/health` 仍走 Worker（`run_worker_first`）。

本地：先 `pnpm dev:worker`，再 `pnpm dev`。开发态默认连 `ws://127.0.0.1:8787`（`VITE_RELAY_ORIGIN` 可改）。

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
pnpm dev:worker
pnpm dev
pnpm deploy
```

## 账号

部署到 Cloudflare **EdgeNux**（`*.onw.workers.dev`）。

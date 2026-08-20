# coyote-console

Cloudflare Workers + Durable Objects，DG-Lab **Socket V4** 网页主控。被控端：DG-LAB 4.0 APP。

线上：https://coyote-console.onw.workers.dev

## 连接

- 控制端：`wss://<host>/v4` → `{ type: "hello", clientId }`
- APP：`wss://<host>/v4?tid=<clientId>`
- 二维码：`https://dungeon-lab.cn/s/?v=1&action=socket&url=<encodeURIComponent(APP_WS)>`

`/api/*`、`/health`、`/ws`、`/v4` 走 Worker；页面走 Assets。

## 界面

侧栏：控制台 / 配对 / 波形库 / 记录 / 设置。顶栏急停常驻。记录存在本机 localStorage。

## 命令

```bash
pnpm install
pnpm typecheck
pnpm dev:worker
pnpm dev
pnpm deploy
```

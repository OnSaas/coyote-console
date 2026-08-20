import { Badge } from "@cloudflare/kumo/components/badge";
import { Button } from "@cloudflare/kumo/components/button";
import { Sidebar } from "@cloudflare/kumo/components/sidebar";
import { CopySimple, Stop } from "@phosphor-icons/react";
import { useKumoToastManager } from "@cloudflare/kumo/components/toast";
import type { ConnState } from "../hooks/useCoyoteSocket";
import { useConsole } from "../state/ConsoleProvider";

const STATE_BADGE: Record<
  ConnState,
  { label: string; variant: "secondary" | "info" | "warning" | "success" | "error" }
> = {
  idle: { label: "未连接", variant: "secondary" },
  connecting: { label: "连接中", variant: "info" },
  connected: { label: "已连接", variant: "warning" },
  paired: { label: "已配对", variant: "success" },
  disconnected: { label: "已断开", variant: "secondary" },
  error: { label: "错误", variant: "error" },
};

export function AppTopbar() {
  const { relay, emergencyStop } = useConsole();
  const toast = useKumoToastManager();
  const badge = STATE_BADGE[relay.state];
  const showId =
    (relay.state === "connected" || relay.state === "paired") && relay.targetId;
  const shortId = relay.targetId ? relay.targetId.slice(0, 8) : "";

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-white/10 bg-[var(--dg-surface)] px-2 pt-[env(safe-area-inset-top)] sm:h-14 sm:px-3">
      <Sidebar.Trigger aria-label="菜单" />
      <Badge variant={badge.variant}>{badge.label}</Badge>
      {showId ? (
        <button
          type="button"
          className="hidden items-center gap-1 font-mono text-xs text-[var(--dg-muted)] sm:inline-flex"
          onClick={async () => {
            if (!relay.targetId) return;
            await navigator.clipboard.writeText(relay.targetId);
            toast.add({ title: "已复制会话 ID", variant: "success" });
          }}
        >
          {shortId}
          <CopySimple size={12} />
        </button>
      ) : null}
      <div className="flex-1" />
      <Button variant="destructive" size="sm" icon={Stop} onClick={emergencyStop}>
        急停
      </Button>
    </header>
  );
}

import { Badge } from "@cloudflare/kumo/components/badge";
import { Button } from "@cloudflare/kumo/components/button";
import { Dialog } from "@cloudflare/kumo/components/dialog";
import { Sidebar } from "@cloudflare/kumo/components/sidebar";
import { useKumoToastManager } from "@cloudflare/kumo/components/toast";
import { CopySimple, Stop } from "@phosphor-icons/react";
import { useState } from "react";
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
  const { relay, emergencyStop, settings } = useConsole();
  const toast = useKumoToastManager();
  const [confirm, setConfirm] = useState(false);
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
            toast.add({ title: "已复制", variant: "success" });
          }}
        >
          {shortId}
          <CopySimple size={12} />
        </button>
      ) : null}
      <div className="flex-1" />
      <Button
        variant="destructive"
        size="sm"
        icon={Stop}
        onClick={() => {
          if (settings.confirmStop) setConfirm(true);
          else emergencyStop();
        }}
      >
        急停
      </Button>
      {confirm ? (
        <Dialog.Root open onOpenChange={(o) => !o && setConfirm(false)}>
          <Dialog className="p-6">
            <Dialog.Title>确认急停？</Dialog.Title>
            <Dialog.Description>双通道将归零并清波形。</Dialog.Description>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirm(false)}>
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setConfirm(false);
                  emergencyStop();
                }}
              >
                急停
              </Button>
            </div>
          </Dialog>
        </Dialog.Root>
      ) : null}
    </header>
  );
}

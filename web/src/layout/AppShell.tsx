import { Badge } from "@cloudflare/kumo/components/badge";
import { Button } from "@cloudflare/kumo/components/button";
import { Sidebar, useSidebar } from "@cloudflare/kumo/components/sidebar";
import { Text } from "@cloudflare/kumo/components/text";
import {
  ChartBar,
  GearSix,
  Lightning,
  Link,
  Stop,
  Waveform,
} from "@phosphor-icons/react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import type { ConnState } from "../hooks/useCoyoteSocket";
import { useConsole } from "../state/ConsoleProvider";

const NAV = [
  { to: "/", label: "控制台", icon: Lightning },
  { to: "/pair", label: "配对", icon: Link },
  { to: "/waves", label: "波形库", icon: Waveform },
  { to: "/records", label: "记录", icon: ChartBar },
  { to: "/settings", label: "设置", icon: GearSix },
] as const;

const STATE_BADGE: Record<
  ConnState,
  { label: string; variant: "secondary" | "info" | "warning" | "success" | "error" }
> = {
  idle: { label: "未连接", variant: "secondary" },
  connecting: { label: "连接中", variant: "info" },
  waiting: { label: "等待扫码", variant: "warning" },
  paired: { label: "已配对", variant: "success" },
  disconnected: { label: "已断开", variant: "secondary" },
  error: { label: "错误", variant: "error" },
};

function NavItems() {
  const loc = useLocation();
  const nav = useNavigate();
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <Sidebar.Menu>
      {NAV.map((item) => {
        const active =
          item.to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(item.to);
        return (
          <Sidebar.MenuButton
            key={item.to}
            icon={item.icon}
            active={active}
            onClick={() => {
              nav(item.to);
              if (isMobile) setOpenMobile(false);
            }}
          >
            {item.label}
          </Sidebar.MenuButton>
        );
      })}
    </Sidebar.Menu>
  );
}

export function AppShell() {
  const { relay, emergencyStop } = useConsole();
  const badge = STATE_BADGE[relay.state];

  return (
    <Sidebar.Provider defaultOpen collapsible="icon" mobileBreakpoint={768}>
      <div className="flex min-h-dvh bg-[var(--dg-bg)] text-[var(--dg-text)]">
        <Sidebar className="border-r border-[var(--dg-border)] bg-[var(--dg-surface)]">
          <Sidebar.Header>
            <div className="flex items-center gap-2 px-2 py-1">
              <Lightning size={22} weight="fill" className="dg-gold" />
              <Text variant="heading3" as="span">
                Coyote
              </Text>
            </div>
          </Sidebar.Header>
          <Sidebar.Content>
            <NavItems />
          </Sidebar.Content>
        </Sidebar>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-12 items-center justify-between gap-2 border-b border-[var(--dg-border)] bg-[var(--dg-surface)] px-2 pt-[env(safe-area-inset-top)] sm:h-14 sm:px-3">
            <div className="flex min-w-0 items-center gap-2">
              <Sidebar.Trigger aria-label="菜单" />
              <Badge variant={badge.variant}>{badge.label}</Badge>
            </div>
            <Button
              variant="destructive"
              size="sm"
              icon={Stop}
              onClick={emergencyStop}
            >
              急停
            </Button>
          </header>
          <main className="flex-1 overflow-auto p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-4 md:p-6">
            <div className="mx-auto max-w-4xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </Sidebar.Provider>
  );
}

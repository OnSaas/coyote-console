import { Button } from "@cloudflare/kumo/components/button";
import { Sidebar, useSidebar } from "@cloudflare/kumo/components/sidebar";
import { Text } from "@cloudflare/kumo/components/text";
import { CaretLeft, CaretRight, Lightning } from "@phosphor-icons/react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ChartBar,
  GearSix,
  Link,
  Waveform,
} from "@phosphor-icons/react";

const NAV = [
  { to: "/", label: "控制台", icon: Lightning },
  { to: "/pair", label: "配对", icon: Link },
  { to: "/waves", label: "波形库", icon: Waveform },
  { to: "/records", label: "记录", icon: ChartBar },
  { to: "/settings", label: "设置", icon: GearSix },
] as const;

export function AppSidebar() {
  const { open, isMobile, setOpen } = useSidebar();

  return (
    <Sidebar className="border-r border-[var(--dg-border)] bg-[var(--dg-surface)]">
      <Sidebar.Header>
        <div className="flex h-12 items-center justify-between gap-1 px-2">
          <div className="flex min-w-0 items-center gap-2">
            <Lightning size={20} weight="fill" className="dg-gold shrink-0" />
            {open || isMobile ? (
              <Text variant="heading3" as="span">
                Coyote
              </Text>
            ) : null}
          </div>
          {!isMobile ? (
            <Button
              shape="square"
              size="sm"
              variant="ghost"
              icon={open ? CaretLeft : CaretRight}
              aria-label={open ? "收起侧栏" : "展开侧栏"}
              onClick={() => setOpen(!open)}
            />
          ) : null}
        </div>
      </Sidebar.Header>
      <Sidebar.Content>
        <NavItems />
      </Sidebar.Content>
    </Sidebar>
  );
}

function NavItems() {
  const loc = useLocation();
  const nav = useNavigate();
  const { isMobile, setOpenMobile, open } = useSidebar();

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
            tooltip={item.label}
            className={active ? "dg-nav-active" : undefined}
            onClick={() => {
              nav(item.to);
              if (isMobile) setOpenMobile(false);
            }}
          >
            {open || isMobile ? item.label : null}
          </Sidebar.MenuButton>
        );
      })}
    </Sidebar.Menu>
  );
}

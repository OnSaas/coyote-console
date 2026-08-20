import { useEffect, useState, type CSSProperties } from "react";
import { Sidebar } from "@cloudflare/kumo/components/sidebar";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";

const COLLAPSE_KEY = "coyote.sidebar.collapsed";

export function AppShell() {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      setOpen(localStorage.getItem(COLLAPSE_KEY) !== "1");
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <Sidebar.Provider
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        try {
          localStorage.setItem(COLLAPSE_KEY, next ? "0" : "1");
        } catch {
          /* ignore */
        }
      }}
      defaultOpen
      collapsible="icon"
      mobileBreakpoint={768}
      animationDuration={180}
      style={
        {
          "--sidebar-width": "240px",
          "--sidebar-width-icon": "64px",
        } as CSSProperties
      }
    >
      <div className="dg-shell">
        <AppSidebar />
        <div className="dg-main">
          <AppTopbar />
          <main className="dg-content">
            <div className="dg-content-inner flex flex-col gap-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </Sidebar.Provider>
  );
}

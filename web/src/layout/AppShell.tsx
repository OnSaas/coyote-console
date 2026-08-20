import { useEffect, useState } from "react";
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
    >
      <div className="flex min-h-dvh bg-[var(--dg-bg)] text-[var(--dg-text)]">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopbar />
          <main className="flex-1 overflow-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </Sidebar.Provider>
  );
}

import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { MobileBottomNav } from "./MobileBottomNav";
import { cn } from "@/lib/utils";

export function MainLayout() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const prevCollapsedRef = useRef<boolean>(false);
  const didAutoCollapseRef = useRef(false);

  const handleMenuClick = () => {
    const isDesktop = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(min-width: 1024px)").matches;
    if (isDesktop) {
      setSidebarCollapsed((v) => !v);
    } else {
      setMobileOpen(true);
    }
  };

  useEffect(() => {
    if (typeof document === "undefined") return;
    const body = document.body;
    if (mobileOpen) {
      const prev = body.style.overflow;
      body.style.overflow = "hidden";
      return () => { body.style.overflow = prev; };
    }
  }, [mobileOpen]);

  useEffect(() => {
    const isDesktop = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(min-width: 1024px)").matches;
    if (!isDesktop) return;

    const path = location.pathname || "";
    const seg2 = path.split("/")[2] || "";
    const isProjectDetail =
      path.startsWith("/projects/overview/") ||
      (/^\/projects\/[^/]+$/.test(path) && seg2 !== "timeline");

    if (isProjectDetail) {
      // Auto-collapse only once when entering the project detail route.
      // After that, allow the user to manually expand/collapse as normal.
      if (!didAutoCollapseRef.current) {
        prevCollapsedRef.current = sidebarCollapsed;
        didAutoCollapseRef.current = true;
        if (!sidebarCollapsed) setSidebarCollapsed(true);
      }
      return;
    }

    if (didAutoCollapseRef.current) {
      setSidebarCollapsed(prevCollapsedRef.current);
      didAutoCollapseRef.current = false;
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      
      <div
        className={cn(
          "flex flex-col transition-all duration-300 min-h-screen",
          sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-64"
        )}
      >
        <TopNav onMenuClick={handleMenuClick} />
        <main className="flex-1 p-4 sm:p-5 lg:p-6 pb-20 lg:pb-6">
          <div className="w-full max-w-full min-w-0 mx-auto box-border">
            <Outlet />
          </div>
        </main>
        <MobileBottomNav onMenuClick={handleMenuClick} />
      </div>
    </div>
  );
}

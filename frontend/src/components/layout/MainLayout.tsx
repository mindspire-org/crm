import { Suspense, useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { MobileBottomNav } from "./MobileBottomNav";
import { cn } from "@/lib/utils";
import { Bell, Megaphone, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { API_BASE } from "@/lib/api/base";

export function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeAnnouncement, setActiveAnnouncement] = useState<any>(null);
  const prevCollapsedRef = useRef<boolean>(false);
  const didAutoCollapseRef = useRef(false);

  useEffect(() => {
    // SSE Listener for real-time announcements
    const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
    if (!token) return;

    const sse = new EventSource(`${API_BASE}/api/realtime/stream?token=${token}`);
    
    sse.addEventListener("announcement", (e: any) => {
      try {
        const data = JSON.parse(e.data);
        setActiveAnnouncement(data);
      } catch (err) {
        console.error("Failed to parse announcement SSE:", err);
      }
    });

    sse.addEventListener("invalidate", (e: any) => {
      try {
        const data = JSON.parse(e.data);
        if (data.keys && Array.isArray(data.keys)) {
          data.keys.forEach((key: string) => {
            if (key === "messages" && data.conversationId) {
              queryClient.invalidateQueries({ queryKey: ["messages", data.conversationId] });
            } else {
              queryClient.invalidateQueries({ queryKey: [key] });
            }
          });
        }
      } catch (err) {
        console.error("Failed to parse invalidate SSE:", err);
      }
    });

    return () => sse.close();
  }, []);

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
            <Suspense fallback={
              <div className="flex h-[60vh] w-full items-center justify-center">
                <div className="text-center space-y-4">
                  <RefreshCw className="w-10 h-10 animate-spin text-indigo-600 mx-auto" />
                  <p className="text-muted-foreground font-medium animate-pulse">Loading secure content...</p>
                </div>
              </div>
            }>
              <Outlet />
            </Suspense>
          </div>
        </main>

        {/* Real-time Announcement Popup */}
        {activeAnnouncement && (
          <div className="fixed bottom-6 right-6 z-[100] animate-in fade-in slide-in-from-bottom-10 duration-500 max-w-sm w-full px-4 sm:px-0">
            <Card className="overflow-hidden border-2 border-indigo-500 shadow-2xl bg-white/95 backdrop-blur">
              <div className="bg-indigo-600 p-3 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-widest italic">New Announcement</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 text-white hover:bg-white/20" 
                  onClick={() => setActiveAnnouncement(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-4 space-y-3">
                <h3 className="font-black text-slate-900 uppercase italic leading-tight">
                  {activeAnnouncement.title}
                </h3>
                <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                  {activeAnnouncement.message?.replace(/<[^>]*>?/gm, '')}
                </p>
                <div className="flex gap-2 pt-1">
                  <Button 
                    className="flex-1 bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest rounded-xl"
                    onClick={() => {
                      navigate(`/announcements/${activeAnnouncement.id}`);
                      setActiveAnnouncement(null);
                    }}
                  >
                    View Details
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1 border-slate-200 font-black uppercase text-[10px] tracking-widest rounded-xl"
                    onClick={() => setActiveAnnouncement(null)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        <MobileBottomNav onMenuClick={handleMenuClick} />
      </div>
    </div>
  );
}

import { Bell, Search, Menu, Plus, LayoutGrid, Briefcase, Globe, Mail, Settings, CheckCircle, Sun, Moon, Eye, Check, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { useTheme } from "next-themes";

interface TopNavProps {
  onMenuClick: () => void;
}

const normalizeAvatarSrc = (input: string, timestamp?: string) => {
  const s = String(input || "").trim();
  console.log("TopNav avatar input:", input, "cleaned:", s);
  if (!s || s.startsWith("<")) return "/placeholder.svg";
  // Always use API_BASE for avatar URLs (works for both local and production)
  const base = API_BASE;
  try {
    const isAbs = /^https?:\/\//i.test(s);
    if (isAbs) {
      const u = new URL(s);
      // If it's already an absolute URL pointing to uploads, extract the path
      if (u.pathname.includes("/uploads/")) {
        const result = timestamp ? `${base}${u.pathname}?t=${timestamp}` : `${base}${u.pathname}`;
        console.log("TopNav avatar absolute URL:", result);
        return result;
      }
      return s;
    }
    const rel = s.startsWith("/") ? s : `/${s}`;
    const result = timestamp ? `${base}${rel}?t=${timestamp}` : `${base}${rel}`;
    console.log("TopNav avatar relative URL:", result);
    return result;
  } catch {
    const rel = s.startsWith("/") ? s : `/${s}`;
    const result = timestamp ? `${base}${rel}?t=${timestamp}` : `${base}${rel}`;
    console.log("TopNav avatar catch URL:", result);
    return result;
  }
};

type MeUser = {
  _id?: string;
  id?: string;
  role?: string;
  email?: string;
  name?: string;
  avatar?: string;
  permissions?: string[];
  updatedAt?: string;
};

const getStoredAuthUser = (): any | null => {
  const raw = localStorage.getItem("auth_user") || sessionStorage.getItem("auth_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const setStoredAuthUser = (next: any) => {
  const raw = JSON.stringify(next);
  if (localStorage.getItem("auth_user")) localStorage.setItem("auth_user", raw);
  if (sessionStorage.getItem("auth_user")) sessionStorage.setItem("auth_user", raw);
};

type NotificationDoc = {
  _id: string;
  type?: string;
  title?: string;
  message?: string;
  href?: string;
  readAt?: string;
  createdAt?: string;
};

type SearchResult = {
  type: string;
  title: string;
  subtitle?: string;
  href: string;
};

const timeAgo = (iso?: string) => {
  if (!iso) return "";
  try {
    const t = new Date(iso).getTime();
    const diff = Math.max(0, Date.now() - t);
    const min = Math.floor(diff / 60000);
    if (min < 1) return "Just now";
    if (min < 60) return `${min} min ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
    const day = Math.floor(hr / 24);
    return `${day} day${day === 1 ? "" : "s"} ago`;
  } catch {
    return "";
  }
};

const isWithinLast7Days = (iso?: string) => {
  if (!iso) return false;
  try {
    const date = new Date(iso).getTime();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return date >= sevenDaysAgo;
  } catch {
    return false;
  }
};

export function TopNav({ onMenuClick }: TopNavProps) {
  const logoCandidates = [
    "/HealthSpire%20logo.png",
  ];
  const [logoSrc, setLogoSrc] = useState<string>(logoCandidates[0]);
  const onLogoError = () => {
    const i = logoCandidates.indexOf(logoSrc);
    if (i < logoCandidates.length - 1) setLogoSrc(logoCandidates[i + 1]);
  };
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
  const shownIdsRef = useRef<Set<string>>(new Set());

  const [me, setMe] = useState<MeUser | null>(() => {
    const stored = getStoredAuthUser();
    return stored ? { ...stored } : null;
  });

  const meInitials = useMemo(() => {
    const src = String(me?.name || me?.email || "").trim();
    if (!src) return "U";
    const out = src
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    return out || "U";
  }, [me?.name, me?.email]);

  const loadMe = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/users/me`, { headers });
      const json = await res.json().catch(() => null);
      const u = (json as any)?.user;
      if (!res.ok || !u) return;
      setMe(u);

      const stored = getStoredAuthUser() || {};
      const merged = {
        ...stored,
        id: u?.id || u?._id || stored?.id,
        _id: u?._id || stored?._id,
        role: u?.role || stored?.role,
        email: u?.email || stored?.email,
        name: u?.name || stored?.name,
        avatar: u?.avatar || stored?.avatar,
        permissions: u?.permissions || stored?.permissions,
      };
      setStoredAuthUser(merged);
    } catch {
      // ignore
    }
  };

  const loadNotifications = async () => {
    if (typeof document !== "undefined" && (document as any).hidden) return;
    try {
      setNotifLoading(true);
      const headers = getAuthHeaders();
      const [countRes, listRes] = await Promise.all([
        fetch(`${API_BASE}/api/notifications/unread-count`, { headers }),
        fetch(`${API_BASE}/api/notifications?limit=10`, { headers }),
      ]);
      const countJson = await countRes.json().catch(() => null);
      const listJson = await listRes.json().catch(() => []);
      if (countRes.ok) setUnreadCount(Number(countJson?.count || 0) || 0);
      if (listRes.ok) {
        const allNotifications = Array.isArray(listJson) ? listJson : [];
        const recentNotifications = allNotifications.filter((n: any) => isWithinLast7Days(n?.createdAt));
        setNotifications(recentNotifications);
      }

      // Toast new unread notifications (best-effort)
      const unread = (Array.isArray(listJson) ? listJson : []).filter((n: any) => !n?.readAt);
      for (const n of unread) {
        const id = String(n?._id || "");
        if (!id || shownIdsRef.current.has(id)) continue;
        shownIdsRef.current.add(id);
        toast(String(n?.title || "Notification"), { description: String(n?.message || "") });
      }
    } catch {
      // ignore
    } finally {
      setNotifLoading(false);
    }
  };

  const markAllRead = async (ids: string[]) => {
    try {
      const headers = getAuthHeaders({ "Content-Type": "application/json" });
      await fetch(`${API_BASE}/api/notifications/mark-read`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ids }),
      });
    } catch {
      // ignore
    }
  };

  const markSingleRead = async (id: string) => {
    try {
      const headers = getAuthHeaders({ "Content-Type": "application/json" });
      await fetch(`${API_BASE}/api/notifications/mark-read`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ids: [id] }),
      });
      setNotifications((cur) => cur.map((n) => (n._id === id ? { ...n, readAt: new Date().toISOString() } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const headers = getAuthHeaders();
      await fetch(`${API_BASE}/api/notifications/${id}`, {
        method: "DELETE",
        headers,
      });
      setNotifications((cur) => cur.filter((n) => n._id !== id));
      // Re-calculate unread count if necessary or just reload
      void loadNotifications();
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadNotifications();
    void loadMe();
    const t = window.setInterval(loadNotifications, 30000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!notifOpen) return;
    const unreadIds = notifications.filter((n) => !n.readAt).map((n) => n._id);
    if (!unreadIds.length) return;
    void markAllRead(unreadIds);
    setNotifications((cur) => cur.map((n) => (unreadIds.includes(n._id) ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnreadCount(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifOpen]);

  const unreadLabel = useMemo(() => {
    if (unreadCount <= 0) return "";
    if (unreadCount > 99) return "99+";
    return String(unreadCount);
  }, [unreadCount]);
  const handleSignOut = () => {
    try {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      sessionStorage.removeItem("auth_token");
      sessionStorage.removeItem("auth_user");
    } catch {}
    navigate("/auth", { replace: true });
  };

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const role = useMemo(() => String(me?.role || "").trim().toLowerCase(), [me?.role]);
  const canSearchProjects = useMemo(() => ["admin", "staff", "marketer", "sales", "finance", "developer"].includes(role), [role]);
  const canSearchTickets = useMemo(() => ["admin", "staff", "marketer"].includes(role), [role]);
  const canSearchClients = useMemo(() => ["admin", "staff", "marketer"].includes(role), [role]);
  const canSearchLeads = useMemo(() => ["admin", "marketer", "sales", "staff", "finance", "developer"].includes(role), [role]);
  const canSearchTasks = useMemo(() => ["admin", "staff", "marketer", "sales", "finance", "developer"].includes(role), [role]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isK = e.key.toLowerCase() === "k";
      const isSlash = e.key === "/";
      if ((isK && (e.metaKey || e.ctrlKey)) || (isSlash && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    const query = searchQuery.trim();
    const t = window.setTimeout(async () => {
      if (!query) {
        setSearchResults([]);
        return;
      }

      const headers = getAuthHeaders();
      const fetchJson = async (url: string) => {
        try {
          const res = await fetch(url, { headers });
          if (!res.ok) return [];
          const json = await res.json().catch(() => null);
          return Array.isArray(json) ? json : [];
        } catch {
          return [];
        }
      };

      setSearchLoading(true);
      const next: SearchResult[] = [];

      if (role === "client") {
        const [projects, tickets, invoices, estimates, proposals, contracts] = await Promise.all([
          fetchJson(`${API_BASE}/api/client/projects`),
          fetchJson(`${API_BASE}/api/client/tickets`),
          fetchJson(`${API_BASE}/api/client/invoices`),
          fetchJson(`${API_BASE}/api/client/estimates`),
          fetchJson(`${API_BASE}/api/client/proposals`),
          fetchJson(`${API_BASE}/api/client/contracts`),
        ]);

        const ql = query.toLowerCase();

        for (const p of projects) {
          const title = String(p?.title || "").trim();
          const clientName = String(p?.client || "").trim();
          if (!title) continue;
          if (!`${title} ${clientName}`.toLowerCase().includes(ql)) continue;
          next.push({ type: "Project", title, subtitle: clientName || undefined, href: "/client/projects" });
        }

        for (const it of tickets) {
          const title = String(it?.title || "").trim();
          const no = String(it?.ticketNo || "").trim();
          const clientName = String(it?.client || "").trim();
          if (!title) continue;
          if (!`${title} ${no} ${clientName}`.toLowerCase().includes(ql)) continue;
          next.push({ type: "Ticket", title, subtitle: no ? `#${no}` : undefined, href: `/client/tickets/${it?._id}` });
        }

        const filterDocs = (items: any[], type: string, titleKey: string, href: string) => {
          for (const it of items) {
            const title = String(it?.[titleKey] || it?.number || "").trim();
            const clientName = String(it?.client || "").trim();
            if (!title) continue;
            if (!`${title} ${clientName}`.toLowerCase().includes(ql)) continue;
            next.push({ type, title, subtitle: clientName || undefined, href });
          }
        };
        filterDocs(invoices, "Invoice", "number", "/client/invoices");
        filterDocs(estimates, "Estimate", "number", "/client/estimates");
        filterDocs(proposals, "Proposal", "title", "/client/proposals");
        filterDocs(contracts, "Contract", "title", "/client/contracts");

        setSearchResults(next);
        setSearchLoading(false);
        return;
      }

      const calls: Promise<any[]>[] = [];
      const mapFns: ((items: any[]) => void)[] = [];

      if (canSearchTasks) {
        calls.push(fetchJson(`${API_BASE}/api/tasks?q=${encodeURIComponent(query)}`));
        mapFns.push((items) => {
          for (const it of items) {
            const title = String(it?.title || "").trim();
            if (!title) continue;
            const no = String(it?.taskNo || "").trim();
            const status = String(it?.status || "").trim();
            next.push({ type: "Task", title, subtitle: no ? `#${no}${status ? ` • ${status}` : ""}` : status || undefined, href: `/tasks/${it?._id}` });
          }
        });
      }

      if (canSearchProjects) {
        calls.push(fetchJson(`${API_BASE}/api/projects?q=${encodeURIComponent(query)}`));
        mapFns.push((items) => {
          for (const it of items) {
            const title = String(it?.title || "").trim();
            if (!title) continue;
            const clientName = String(it?.client || "").trim();
            next.push({ type: "Project", title, subtitle: clientName || undefined, href: `/projects/${it?._id}` });
          }
        });
      }

      if (canSearchTickets) {
        calls.push(fetchJson(`${API_BASE}/api/tickets?q=${encodeURIComponent(query)}`));
        mapFns.push((items) => {
          for (const it of items) {
            const title = String(it?.title || "").trim();
            if (!title) continue;
            const no = String(it?.ticketNo || "").trim();
            const clientName = String(it?.client || "").trim();
            next.push({ type: "Ticket", title, subtitle: no ? `#${no}${clientName ? ` • ${clientName}` : ""}` : clientName || undefined, href: `/tickets/${it?._id}` });
          }
        });
      }

      if (canSearchLeads) {
        calls.push(fetchJson(`${API_BASE}/api/leads?q=${encodeURIComponent(query)}`));
        mapFns.push((items) => {
          for (const it of items) {
            const name = String(it?.name || "").trim();
            if (!name) continue;
            const company = String(it?.company || "").trim();
            const email = String(it?.email || "").trim();
            const subtitle = company || email || undefined;
            next.push({ type: "Lead", title: name, subtitle, href: `/crm/leads/${it?._id}` });
          }
        });
      }

      if (canSearchClients) {
        calls.push(fetchJson(`${API_BASE}/api/clients?q=${encodeURIComponent(query)}`));
        mapFns.push((items) => {
          for (const it of items) {
            const title = String(it?.company || it?.person || it?.email || "").trim();
            if (!title) continue;
            const email = String(it?.email || "").trim();
            next.push({ type: "Client", title, subtitle: email || undefined, href: `/clients/${it?._id}` });
          }
        });
      }

      const responses = await Promise.allSettled(calls);
      responses.forEach((r, idx) => {
        const items = r.status === "fulfilled" ? r.value : [];
        const map = mapFns[idx];
        if (map) map(items);
      });

      setSearchResults(next);
      setSearchLoading(false);
    }, 250);

    return () => window.clearTimeout(t);
  }, [searchOpen, searchQuery, role, canSearchClients, canSearchLeads, canSearchProjects, canSearchTasks, canSearchTickets]);

  const groupedSearch = useMemo(() => {
    const m = new Map<string, SearchResult[]>();
    for (const r of searchResults) {
      const k = r.type;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    return Array.from(m.entries());
  }, [searchResults]);

  return (
    <header className="sticky top-0 z-30 h-14 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-b border-border flex items-center justify-between px-4 lg:px-6 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.15)] dark:shadow-[0_1px_3px_-1px_rgba(0,0,0,0.4)]">
      <CommandDialog
        open={searchOpen}
        onOpenChange={(open) => {
          setSearchOpen(open);
          if (!open) {
            setSearchQuery("");
            setSearchResults([]);
          }
        }}
      >
        <CommandInput
          value={searchQuery}
          onValueChange={setSearchQuery}
          placeholder="Search across your portal…"
        />
        <CommandList>
          <CommandEmpty>{searchLoading ? "Searching…" : "No results."}</CommandEmpty>
          {groupedSearch.map(([type, items]) => (
            <div key={type}>
              <CommandGroup heading={type}>
                {items.slice(0, 8).map((it, idx) => (
                  <CommandItem
                    key={`${type}-${idx}-${it.href}`}
                    value={`${type}:${it.title}`}
                    onSelect={() => {
                      setSearchOpen(false);
                      navigate(it.href);
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{it.title}</span>
                      {it.subtitle ? <span className="text-xs text-muted-foreground">{it.subtitle}</span> : null}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </div>
          ))}
        </CommandList>
      </CommandDialog>
      {/* Left Section: menu + icon row */}
      <div className="flex items-center gap-4 text-foreground">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <div className="hidden lg:flex items-center gap-2">
          <Button variant="ghost" size="icon" title="Tasks" onClick={()=>navigate("/tasks")}>
            <CheckCircle className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" title="Projects" onClick={()=>navigate("/projects")}>
            <LayoutGrid className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" title="Sales" onClick={()=>navigate("/sales")}>
            <Briefcase className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Right Section: icons + avatar + brand */}
      <div className="flex items-center gap-3 text-foreground">
        <Button
          variant="ghost"
          size="icon"
          className="hidden sm:flex"
          title="Search"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hidden sm:flex"
          title="Create"
          onClick={() => navigate("/projects")}
        >
          <Plus className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:flex"
          title="Localization"
          onClick={() => navigate("/settings/localization")}
        >
          <Globe className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:flex"
          title="Settings"
          onClick={() => navigate("/settings")}
        >
          <Settings className="w-5 h-5" />
        </Button>
        {/* Theme Toggle (global) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9" title="Theme">
              {theme === "dark" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={(e)=>{e.preventDefault(); setTheme("light");}}>
              <Sun className="mr-2 h-4 w-4" /> Light
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={(e)=>{e.preventDefault(); setTheme("dark");}}>
              <Moon className="mr-2 h-4 w-4" /> Dark
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={(e)=>{e.preventDefault(); setTheme("system");}}>
              <Settings className="mr-2 h-4 w-4" /> System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* Notifications */}
        <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadLabel}
                </span>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[calc(100vw-1.5rem)] sm:w-[420px] max-w-[520px] p-0">
            <div className="px-3 py-2 border-b border-border">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">Notifications</div>
                {unreadCount > 0 ? (
                  <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                    {unreadCount} new
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">All caught up</Badge>
                )}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Recent updates and alerts</div>
            </div>

            <div className="max-h-[420px] overflow-auto custom-scrollbar">
              {notifLoading && notifications.length === 0 ? (
                <div className="px-3 py-10 text-center text-sm text-muted-foreground">Loading notifications…</div>
              ) : notifications.length ? (
                notifications.map((notification) => {
                  const unread = !notification.readAt;
                  return (
                    <div
                      key={notification._id}
                      className={`group relative flex items-start gap-4 px-4 py-4 transition-all hover:bg-slate-50 border-b border-slate-50 last:border-0 ${unread ? "bg-indigo-50/30" : ""}`}
                    >
                      <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${unread ? "bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.6)]" : "bg-transparent"}`} />
                      
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-sm font-bold text-slate-900 tracking-tight leading-tight">
                            {notification.title || "System Update"}
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap bg-slate-100 px-2 py-0.5 rounded">
                            {timeAgo(notification.createdAt)}
                          </span>
                        </div>
                        
                        <div className="text-xs text-slate-500 leading-relaxed line-clamp-2 pr-8">
                          {notification.message}
                        </div>

                          <div className="flex items-center gap-3 pt-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-2 text-[10px] font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg gap-1.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              const href = String(notification.href || "");
                              if (href) navigate(href);
                              setNotifOpen(false);
                            }}
                          >
                            <Eye className="w-3 h-3" /> View Details
                          </Button>
                          {unread && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 px-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg gap-1.5"
                              onClick={(e) => {
                                e.stopPropagation();
                                markSingleRead(notification._id);
                              }}
                            >
                              <Check className="w-3 h-3" /> Mark Read
                            </Button>
                          )}
                        </div>
                      </div>

                      {role === "admin" && (
                        <div className="absolute right-2 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification._id);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="px-3 py-10 text-center">
                  <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="mt-3 text-sm font-medium">No notifications</div>
                  <div className="mt-1 text-xs text-muted-foreground">You're up to date.</div>
                </div>
              )}
            </div>

            <div className="border-t border-border">
              <DropdownMenuItem
                className="justify-center text-sm"
                onSelect={(e) => {
                  e.preventDefault();
                  void loadNotifications();
                }}
              >
                Refresh
              </DropdownMenuItem>
              <DropdownMenuItem
                className="justify-center text-sm text-primary"
                onSelect={(e) => {
                  e.preventDefault();
                  navigate("/settings/notifications");
                }}
              >
                Notification settings
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="ghost"
          size="icon"
          className="hidden sm:flex"
          title="Messages"
          onClick={() => navigate("/messages")}
        >
          <Mail className="w-5 h-5" />
        </Button>

        {/* User Menu + Brand */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 px-2">
              <Avatar className="h-9 w-9">
                <AvatarImage
                  src={normalizeAvatarSrc(String(me?.avatar || ""), me?.updatedAt)}
                  alt={me?.name || me?.email || "User"}
                  onError={(e) => {
                    console.error("TopNav avatar failed to load:", me?.avatar, "normalized:", normalizeAvatarSrc(String(me?.avatar || "")));
                    (e.currentTarget as HTMLImageElement).src = "/placeholder.svg";
                  }}
                />
                <AvatarFallback>{meInitials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[calc(100vw-1.5rem)] sm:w-56 max-w-[320px] bg-card">
            <DropdownMenuLabel className="space-y-1">
              <div className="text-sm font-medium leading-none">{me?.name || me?.email || "User"}</div>
              <div className="text-xs text-muted-foreground">{me?.email || ""}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                navigate("/profile");
              }}
            >
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                handleSignOut();
              }}
              className="text-destructive"
            >
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Clock,
  CheckCircle,
  Calendar,
  Users,
  Briefcase,
  RefreshCw,
  Target,
  FileText,
  Settings,
  Eye,
  Plus,
  TrendingUp,
  DollarSign,
  Edit,
  Save,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";

import { forwardRef, useEffect, useMemo, useRef, useState, type ComponentPropsWithoutRef, type ElementRef } from "react";
import { useNavigate } from "react-router-dom";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { canViewFinancialData, getCurrentUser, maskFinancialData } from "@/utils/roleAccess";

const revenueData = [
  { month: "Jan", revenue: 4000, profit: 2400 },
  { month: "Feb", revenue: 3000, profit: 1398 },
  { month: "Mar", revenue: 2000, profit: 800 },
  { month: "Apr", revenue: 2780, profit: 1908 },
  { month: "May", revenue: 1890, profit: 1200 },
  { month: "Jun", revenue: 2390, profit: 1500 },
];

const invoiceData = [
  { name: "Paid", value: 8, color: "#10b981" },
  { name: "Not paid", value: 2, color: "#f59e0b" },
  { name: "Draft", value: 11, color: "#6366f1" },
];

const incomeData = [
  { month: "Jan", income: 4000, expense: 2400 },
  { month: "Feb", income: 3000, expense: 1398 },
  { month: "Mar", income: 2000, expense: 9800 },
  { month: "Apr", income: 2780, expense: 3908 },
  { month: "May", income: 1890, expense: 4800 },
  { month: "Jun", income: 2390, expense: 3800 },
];

const projectStatusData = [
  { name: "Completed", value: 45, color: "#10b981" },
  { name: "In Progress", value: 28, color: "#3b82f6" },
  { name: "On Hold", value: 12, color: "#f59e0b" },
  { name: "Not Started", value: 8, color: "#ef4444" },
];

const teamPerformanceData = [
  { name: "Development", completed: 85, total: 100 },
  { name: "Design", completed: 72, total: 85 },
  { name: "Marketing", completed: 68, total: 75 },
  { name: "Sales", completed: 92, total: 110 },
];

const recentActivities = [
  { action: "Project completed", detail: "E-commerce Platform", time: "2 hours ago", type: "success" },
  { action: "New team member", detail: "Sarah Johnson joined", time: "3 hours ago", type: "info" },
  { action: "Invoice sent", detail: "Client ABC - $5,000", time: "5 hours ago", type: "warning" },
  { action: "Task deadline", detail: "Mobile App UI Design", time: "1 day ago", type: "danger" },
];

const topPerformers = [
  { name: "Alex Chen", avatar: "AC", role: "Frontend Developer", tasks: 45, rating: 4.9 },
  { name: "Emma Wilson", avatar: "EW", role: "Project Manager", tasks: 38, rating: 4.8 },
  { name: "Mike Johnson", avatar: "MJ", role: "Backend Developer", tasks: 42, rating: 4.7 },
  { name: "Sarah Davis", avatar: "SD", role: "UX Designer", tasks: 35, rating: 4.9 },
];

type ProjectRow = { id: string; name: string; estimate: string };
type TaskRow = { id: string; title: string; startDate: string; deadline: string; status: string };

type LeadRow = { id: string; name: string; status: string; createdAt: string };

type AttendanceMember = {
  employeeId: string;
  name?: string;
  initials?: string;
  avatarUrl?: string;
  clockedIn?: boolean;
  startTime?: string;
};

type AnnouncementRow = {
  _id: string;
  title?: string;
  message?: string;
  createdAt?: string;
};

type EventRow = {
  _id: string;
  title?: string;
  start?: string;
  end?: string;
};

const GlassCard = forwardRef<ElementRef<typeof Card>, ComponentPropsWithoutRef<typeof Card>>(
  ({ className = "", children, ...props }, ref) => (
    <Card
      ref={ref}
      {...props}
      className={
        "border border-white/40 bg-white/70 backdrop-blur-xl shadow-[0_12px_30px_rgba(2,6,23,0.08)] dark:border-white/10 dark:bg-slate-900/55 overflow-hidden " +
        className
      }
    >
      {children}
    </Card>
  )
);
GlassCard.displayName = "GlassCard";

function DashboardOrb({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="220"
      height="220"
      viewBox="0 0 220 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="orbA" x1="24" y1="28" x2="196" y2="196" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A855F7" />
          <stop offset="0.45" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#22C55E" />
        </linearGradient>
        <radialGradient id="orbGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(86 70) rotate(58) scale(160)">
          <stop stopColor="#FFFFFF" stopOpacity="0.75" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <filter id="softShadow" x="-40" y="-40" width="300" height="300" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="18" stdDeviation="18" floodColor="#0F172A" floodOpacity="0.22" />
        </filter>
      </defs>
      <g filter="url(#softShadow)">
        <circle cx="110" cy="110" r="78" fill="url(#orbA)" />
        <circle cx="110" cy="110" r="78" fill="url(#orbGlow)" />
        <path
          d="M52 128c18 22 42 34 72 34 30 0 56-14 78-42"
          stroke="#fff"
          strokeOpacity="0.5"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M72 78c16-18 36-26 60-26 26 0 48 10 68 32"
          stroke="#fff"
          strokeOpacity="0.35"
          strokeWidth="8"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

const FancyTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/40 bg-white/80 backdrop-blur-xl px-3 py-2 shadow-lg dark:border-white/10 dark:bg-slate-900/70">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 space-y-1">
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-6 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
              <span className="text-muted-foreground">{p.name}</span>
            </div>
            <span className="font-semibold text-foreground">{Number(p.value || 0).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const canViewPricing = useMemo(() => {
    const u = getCurrentUser();
    return u ? canViewFinancialData(u as any) : false;
  }, []);

  // Sales access - only admin and finance roles
  const canAccessSales = useMemo(() => {
    const u = getCurrentUser();
    const role = u?.role || "";
    return ["admin", "finance", "finance_manager", "finance manager"].includes(role);
  }, []);

  // Check if user is project manager (to hide irrelevant items)
  const isProjectManager = useMemo(() => {
    const u = getCurrentUser();
    return u?.role === "project_manager";
  }, []);

  // Check if user is developer (to hide CRM/sales items)
  const isDeveloper = useMemo(() => {
    const u = getCurrentUser();
    return u?.role === "developer";
  }, []);

  // Check if user is team_member (to show simplified dashboard)
  const isTeamMember = useMemo(() => {
    const u = getCurrentUser();
    return u?.role === "team_member";
  }, []);

  const refreshInFlight = useRef(false);
  const [openTasksCount, setOpenTasksCount] = useState(0);
  const [eventsToday, setEventsToday] = useState(0);
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [leadsCount, setLeadsCount] = useState(0);
  const [recentLeads, setRecentLeads] = useState<LeadRow[]>([]);
  const [salesTotal, setSalesTotal] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [recurringMrr, setRecurringMrr] = useState(0);
  const [meName, setMeName] = useState("Admin");
  const [meEmail, setMeEmail] = useState("");
  const [meAvatar, setMeAvatar] = useState<string>("");
  const [projectCounts, setProjectCounts] = useState({ open: 0, inProgress: 0, completed: 0, hold: 0 });
  const [tasksPie, setTasksPie] = useState({ todo: 0, inProgress: 0, completed: 0, expired: 0 });
  const [teamMembers, setTeamMembers] = useState(0);
  const [onLeaveToday, setOnLeaveToday] = useState(0);
  const [projectsList, setProjectsList] = useState<ProjectRow[]>([]);
  const [tasksTable, setTasksTable] = useState<TaskRow[]>([]);
  const [currencyCode, setCurrencyCode] = useState("PKR");

  const [monthlyCollected, setMonthlyCollected] = useState(0);
  const [monthlyTarget, setMonthlyTarget] = useState(0);
  const [ordersThisMonth, setOrdersThisMonth] = useState(0);
  const [nearDeadlineOrders, setNearDeadlineOrders] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [targetDialogOpen, setTargetDialogOpen] = useState(false);
  const [tempTarget, setTempTarget] = useState(0);

  const [clockMembers, setClockMembers] = useState<AttendanceMember[]>([]);
  const [expensesTotal, setExpensesTotal] = useState(0);
  const [ticketsStatus, setTicketsStatus] = useState({ open: 0, closed: 0, other: 0 });
  const [eventsCountToday, setEventsCountToday] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState<EventRow[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [invoiceOverview, setInvoiceOverview] = useState({ overdue: 0, unpaid: 0, paid: 0, draft: 0, total: 0 });

  const normalizeAvatarSrc = useMemo(() => (input: string) => {
    const s = String(input || "").trim();
    if (!s || s.startsWith("<")) return "/placeholder.svg";
    const base = API_BASE;
    try {
      const isAbs = /^https?:\/\//i.test(s);
      if (isAbs) {
        const u = new URL(s);
        if ((u.hostname === "localhost" || u.hostname === "127.0.0.1") && u.pathname.includes("/uploads/")) {
          return `${base}${u.pathname}`;
        }
        if (u.pathname.includes("/uploads/")) return `${base}${u.pathname}`;
        return s;
      }
      const rel = s.startsWith("/") ? s : `/${s}`;
      return `${base}${rel}`;
    } catch {
      const rel = s.startsWith("/") ? s : `/${s}`;
      return `${base}${rel}`;
    }
  }, []);

  useEffect(() => {
    const readTarget = () => {
      try {
        const raw = localStorage.getItem("app_settings_v1");
        const parsed = raw ? JSON.parse(raw) : null;
        const v = Number(parsed?.sales?.monthlyTarget ?? parsed?.dashboard?.monthlyTarget ?? localStorage.getItem("dashboard_monthly_target") ?? 0);
        setMonthlyTarget(Number.isFinite(v) ? v : 0);
        setTempTarget(Number.isFinite(v) ? v : 0);
      } catch {
        const v = Number(localStorage.getItem("dashboard_monthly_target") || 0);
        setMonthlyTarget(Number.isFinite(v) ? v : 0);
        setTempTarget(Number.isFinite(v) ? v : 0);
      }
    };
    readTarget();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "app_settings_v1" || e.key === "dashboard_monthly_target") readTarget();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const adminAvatarSrc = useMemo(() => normalizeAvatarSrc(meAvatar), [meAvatar, normalizeAvatarSrc]);

  const CURRENCY_SYMBOL = currencyCode || "PKR";
  const formatMoney = useMemo(() => {
    return (value: number) => {
      const n = Number(value || 0);
      return `${CURRENCY_SYMBOL} ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    };
  }, [CURRENCY_SYMBOL]);

  const displayMoney = useMemo(() => {
    return (value: number) => {
      if (canViewPricing) return formatMoney(value);
      return maskFinancialData(value);
    };
  }, [canViewPricing, formatMoney]);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const loadMeAndProjects = async () => {
    try {
      const meRes = await fetch(`${API_BASE}/api/users/me`, { headers: getAuthHeaders() });
      const meJson = await meRes.json().catch(() => null);
      const u = (meJson as any)?.user;
      if (meRes.ok && u) {
        setMeName(String(u?.name || u?.email || "Admin"));
        setMeEmail(String(u?.email || ""));
        setMeAvatar(String(u?.avatar || ""));
        setIsAdmin(u?.role === "admin");
      }

      // Projects
      const role = String(u?.role || "").trim().toLowerCase();
      const canReadProjects =
        role === "admin" ||
        role === "staff" ||
        role === "sales" ||
        role === "sales_manager" ||
        role === "finance" ||
        role === "finance_manager" ||
        role === "developer" ||
        role === "project_manager" ||
                role === "marketing_manager";
      if (canReadProjects) {
        const pr = await fetch(`${API_BASE}/api/projects`, { headers: getAuthHeaders() });
        if (pr.ok) {
          const data = await pr.json();
          const list = Array.isArray(data) ? data : [];
          const open = list.filter((p: any) => (p.status || "Open") === "Open").length;
          const inProgress = list.filter((p: any) => (p.status || "") === "In Progress").length;
          const completed = list.filter((p: any) => (p.status || "") === "Completed").length;
          const hold = list.filter((p: any) => (p.status || "") === "Hold").length;
          setProjectCounts({ open, inProgress, completed, hold });
          const sum = list.reduce((acc: number, p: any) => acc + (Number(p.price || 0) || 0), 0);
          setTotalRevenue(sum);
          const right = list
            .slice(0, 5)
            .map((p: any) => ({
              id: String(p._id || ""),
              name: p.title || "-",
              estimate: p.deadline ? new Date(p.deadline).toISOString().slice(0, 10).replace(/-/g, "/") : "-",
            }));
          setProjectsList(right);
        }
      }
    } catch {}
  };

  const loadLeadsSalesAndFinance = async () => {
    try {
      const headers = getAuthHeaders();

      const [leadsRes, ordersRes, invoicesRes, subsRes, paymentsRes] = await Promise.all([
        fetch(`${API_BASE}/api/leads`, { headers }).catch(() => null as any),
        fetch(`${API_BASE}/api/orders`, { headers }).catch(() => null as any),
        fetch(`${API_BASE}/api/invoices`, { headers }).catch(() => null as any),
        fetch(`${API_BASE}/api/subscriptions`, { headers }).catch(() => null as any),
        fetch(`${API_BASE}/api/payments`, { headers }).catch(() => null as any),
      ]);

      if (leadsRes?.ok) {
        const leadsJson = await leadsRes.json().catch(() => []);
        const list = Array.isArray(leadsJson) ? leadsJson : [];
        setLeadsCount(list.length);
        const latest = list
          .slice()
          .sort(
            (a: any, b: any) =>
              new Date(b.createdAt || b.updatedAt || 0).getTime() - new Date(a.createdAt || a.updatedAt || 0).getTime()
          )
          .slice(0, 5)
          .map((l: any) => ({
            id: String(l._id || ""),
            name: String(l.name || l.company || "-").trim() || "-",
            status: String(l.status || "New"),
            createdAt: l.createdAt ? new Date(l.createdAt).toISOString().slice(0, 10) : "-",
          }));
        setRecentLeads(latest);
      }

      if (ordersRes?.ok) {
        const ordersJson = await ordersRes.json().catch(() => []);
        const list = Array.isArray(ordersJson) ? ordersJson : [];
        const sum = list.reduce((acc: number, o: any) => acc + (Number(o.total) || 0), 0);
        setSalesTotal(sum);

        const monthKey = new Date().toISOString().slice(0, 7);
        const ordersMonthSum = list
          .filter((o: any) => {
            const d = o?.orderDate ? new Date(o.orderDate) : o?.createdAt ? new Date(o.createdAt) : null;
            if (!d || Number.isNaN(d.getTime())) return false;
            return d.toISOString().slice(0, 7) === monthKey;
          })
          .reduce((acc: number, o: any) => acc + (Number(o.total) || 0), 0);
        setOrdersThisMonth(ordersMonthSum);

        const now = new Date();
        const soon = new Date(now);
        soon.setDate(soon.getDate() + 3);
        const open = list.filter((o: any) => {
          const status = String(o.status || "").toLowerCase();
          if (status === "completed" || status === "done" || status === "paid") return false;
          const base = o?.orderDate ? new Date(o.orderDate) : o?.createdAt ? new Date(o.createdAt) : null;
          if (!base || Number.isNaN(base.getTime())) return false;
          const deadline = new Date(base);
          deadline.setDate(deadline.getDate() + 7);
          return deadline >= now && deadline <= soon;
        });
        setNearDeadlineOrders(open.slice(0, 5));
      }

      if (invoicesRes?.ok) {
        const invoicesJson = await invoicesRes.json().catch(() => []);
        const list = Array.isArray(invoicesJson) ? invoicesJson : [];
        const pending = list
          .filter((i: any) => String(i.status || "").toLowerCase() !== "paid")
          .reduce((acc: number, i: any) => acc + (Number(i.amount ?? i.total ?? 0) || 0), 0);
        setPendingAmount(pending);
      }

      if (subsRes?.ok) {
        const subsJson = await subsRes.json().catch(() => []);
        const list = Array.isArray(subsJson) ? subsJson : [];
        const mrr = list
          .filter((s: any) => String(s.status || "active").toLowerCase() === "active")
          .reduce((acc: number, s: any) => {
            const amount = Number(s.amount) || 0;
            const monthly = normalizeToMonthly(
              amount,
              Number(s.repeatEveryCount || 1) || 1,
              String(s.repeatEveryUnit || "month")
            );
            return acc + monthly;
          }, 0);
        setRecurringMrr(mrr);
      }

      if (paymentsRes?.ok) {
        const paymentsJson = await paymentsRes.json().catch(() => []);
        const list = Array.isArray(paymentsJson) ? paymentsJson : [];
        const monthKey = new Date().toISOString().slice(0, 7);
        const sum = list
          .filter((p: any) => {
            const d = p?.createdAt ? new Date(p.createdAt) : p?.date ? new Date(p.date) : null;
            if (!d || Number.isNaN(d.getTime())) return false;
            return d.toISOString().slice(0, 7) === monthKey;
          })
          .reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
        setMonthlyCollected(sum);
      }
    } catch {}
  };

  const loadTasksData = async () => {
    try {
      const tr = await fetch(`${API_BASE}/api/tasks`, { headers: getAuthHeaders() });
      if (tr.ok) {
        const data = await tr.json();
        const list = Array.isArray(data) ? data : [];
        const todo = list.filter((t: any) => t.status === "todo").length;
        const inProgress = list.filter((t: any) => t.status === "in-progress").length;
        const completed = list.filter((t: any) => t.status === "done").length;
        const localTodayIso = new Date().toISOString().slice(0, 10);
        const events = list.filter((t: any) => t.deadline && new Date(t.deadline).toISOString().slice(0, 10) === localTodayIso).length;
        const expired = list.filter((t: any) => t.deadline && new Date(t.deadline) < new Date() && t.status !== "done").length;
        setOpenTasksCount(list.filter((t: any) => t.status !== "done").length);
        setEventsToday(events);
        setTasksPie({ todo, inProgress, completed, expired });
        const tbl: TaskRow[] = list
          .slice(0, 8)
          .map((t: any) => ({
            id: String(t._id || ""),
            title: t.title || "-",
            startDate: t.start ? new Date(t.start).toISOString().slice(0, 10) : "",
            deadline: t.deadline ? new Date(t.deadline).toISOString().slice(0, 10) : "",
            status: t.status || "todo",
          }));
        setTasksTable(tbl);
      }
    } catch {}
  };

  const loadLeavesData = async () => {
    try {
      const lr = await fetch(`${API_BASE}/api/leaves`, { headers: getAuthHeaders() });
      if (lr.ok) {
        const data = await lr.json();
        const list = Array.isArray(data) ? data : [];
        setPendingLeaves(list.filter((l: any) => (l.status || "pending") === "pending").length);
        const today = new Date();
        setOnLeaveToday(list.filter((l: any) => l.from && l.to && new Date(l.from) <= today && today <= new Date(l.to)).length);
      }
    } catch {}
  };

  const loadEmployeesCountData = async () => {
    try {
      const er = await fetch(`${API_BASE}/api/employees`, { headers: getAuthHeaders() });
      if (er.ok) {
        const data = await er.json();
        setTeamMembers(Array.isArray(data) ? data.length : 0);
      }
    } catch {}
  };

  const loadOpsData = async () => {
    try {
      const headers = getAuthHeaders();
      const me = getCurrentUser();
      const canReadTickets = me?.role === "admin" || me?.role === "staff" || me?.role === "marketer";
      const [membersRes, expensesRes, ticketsRes, eventsRes, annRes, invRes] = await Promise.all([
        fetch(`${API_BASE}/api/attendance/members`, { headers }).catch(() => null as any),
        fetch(`${API_BASE}/api/expenses`, { headers }).catch(() => null as any),
        canReadTickets ? fetch(`${API_BASE}/api/tickets`, { headers }).catch(() => null as any) : (null as any),
        fetch(`${API_BASE}/api/events`, { headers }).catch(() => null as any),
        fetch(`${API_BASE}/api/announcements?active=1`, { headers }).catch(() => null as any),
        fetch(`${API_BASE}/api/invoices`, { headers }).catch(() => null as any),
      ]);

      if (membersRes?.ok) {
        const json = await membersRes.json().catch(() => []);
        setClockMembers(Array.isArray(json) ? json : []);
      }

      if (expensesRes?.ok) {
        const json = await expensesRes.json().catch(() => []);
        const list = Array.isArray(json) ? json : [];
        const sum = list.reduce((acc: number, x: any) => acc + (Number(x.amount) || 0), 0);
        setExpensesTotal(sum);
      }

      if (ticketsRes?.ok) {
        const json = await ticketsRes.json().catch(() => []);
        const list = Array.isArray(json) ? json : [];
        const open = list.filter((t: any) => String(t.status || "open").toLowerCase() === "open").length;
        const closed = list.filter((t: any) => String(t.status || "").toLowerCase() === "closed").length;
        const other = Math.max(0, list.length - open - closed);
        setTicketsStatus({ open, closed, other });
      }

      if (eventsRes?.ok) {
        const json = await eventsRes.json().catch(() => []);
        const list = Array.isArray(json) ? json : [];
        const todays = list.filter((e: any) => {
          const d = e?.start ? new Date(e.start).toISOString().slice(0, 10) : "";
          return d === todayIso;
        });
        setEventsCountToday(todays.length);
        const upcoming = list
          .filter((e: any) => {
            const d = e?.start ? new Date(e.start) : null;
            if (!d) return false;
            return d >= new Date();
          })
          .sort((a: any, b: any) => new Date(a.start || 0).getTime() - new Date(b.start || 0).getTime())
          .slice(0, 5)
          .map((e: any) => ({ _id: String(e._id || ""), title: String(e.title || "-").trim() || "-", start: e.start, end: e.end }));
        setUpcomingEvents(upcoming);
      }

      if (annRes?.ok) {
        const json = await annRes.json().catch(() => []);
        const list = Array.isArray(json) ? json : [];
        setAnnouncements(
          list.slice(0, 5).map((a: any) => ({
            _id: String(a._id || ""),
            title: String(a.title || "").trim(),
            message: String(a.message || ""),
            createdAt: a.createdAt,
          }))
        );
      }

      if (invRes?.ok) {
        const json = await invRes.json().catch(() => []);
        const list = Array.isArray(json) ? json : [];
        const total = list.reduce((acc: number, i: any) => acc + (Number(i.total) || 0), 0);
        const paid = list
          .filter((i: any) => String(i.status || "").toLowerCase() === "paid")
          .reduce((acc: number, i: any) => acc + (Number(i.total) || 0), 0);
        const draft = list
          .filter((i: any) => String(i.status || "").toLowerCase() === "draft")
          .reduce((acc: number, i: any) => acc + (Number(i.total) || 0), 0);
        const unpaid = list
          .filter((i: any) => {
            const s = String(i.status || "").toLowerCase();
            return s !== "paid" && s !== "draft";
          })
          .reduce((acc: number, i: any) => acc + (Number(i.total) || 0), 0);
        const overdue = list
          .filter((i: any) => {
            const s = String(i.status || "").toLowerCase();
            if (s === "paid") return false;
            const due = i?.dueDate ? new Date(i.dueDate) : null;
            if (!due) return false;
            return due < new Date();
          })
          .reduce((acc: number, i: any) => acc + (Number(i.total) || 0), 0);
        setInvoiceOverview({ overdue, unpaid, paid, draft, total });
      }
    } catch {}
  };

  const normalizeToMonthly = useMemo(() => {
    return (amount: number, everyCount: number, unit: string) => {
      const c = Math.max(1, Number(everyCount) || 1);
      const u = String(unit || "month").toLowerCase();

      if (u === "day" || u === "days") return (amount * 30) / c;
      if (u === "week" || u === "weeks") return (amount * 4.345) / c;
      if (u === "month" || u === "months") return amount / c;
      if (u === "year" || u === "years") return amount / 12 / c;
      return amount / c;
    };
  }, []);

  useEffect(() => {
    const role = String(getCurrentUser()?.role || "").trim().toLowerCase();
    const enable = role === "marketing_manager";
    if (!enable) return;

    const refreshAll = () => {
      if (document.hidden) return;
      if (refreshInFlight.current) return;
      refreshInFlight.current = true;
      Promise.allSettled([
        loadMeAndProjects(),
        loadLeadsSalesAndFinance(),
        loadTasksData(),
        loadLeavesData(),
        loadEmployeesCountData(),
        loadOpsData(),
      ]).finally(() => {
        refreshInFlight.current = false;
      });
    };

    const onVis = () => {
      if (!document.hidden) refreshAll();
    };

    refreshAll();
    const t = window.setInterval(refreshAll, 20000);
    window.addEventListener("focus", refreshAll);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.clearInterval(t);
      window.removeEventListener("focus", refreshAll);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayIso, normalizeToMonthly]);

  useEffect(() => {
    const readCurrency = () => {
      try {
        const raw = localStorage.getItem("app_settings_v1");
        if (!raw) {
          setCurrencyCode("PKR");
          return;
        }
        const parsed = JSON.parse(raw);
        const cur = String(parsed?.localization?.currency || "PKR").trim() || "PKR";
        setCurrencyCode(cur);
      } catch {
        setCurrencyCode("PKR");
      }
    };
    readCurrency();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "app_settings_v1") readCurrency();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    loadMeAndProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadLeadsSalesAndFinance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizeToMonthly]);

  const runningProjects = useMemo(() => {
    return (projectCounts.open || 0) + (projectCounts.inProgress || 0);
  }, [projectCounts.open, projectCounts.inProgress]);

  const targetProgress = useMemo(() => {
    const t = Number(monthlyTarget || 0);
    const v = Number(monthlyCollected || 0);
    if (!(t > 0)) return 0;
    return Math.max(0, Math.min(100, Math.round((v / t) * 100)));
  }, [monthlyCollected, monthlyTarget]);

  const handleSaveTarget = () => {
    try {
      const current = localStorage.getItem("app_settings_v1");
      const parsed = current ? JSON.parse(current) : {};
      const updated = {
        ...parsed,
        sales: { ...parsed.sales, monthlyTarget: tempTarget },
        dashboard: { ...parsed.dashboard, monthlyTarget: tempTarget }
      };
      localStorage.setItem("app_settings_v1", JSON.stringify(updated));
      localStorage.setItem("dashboard_monthly_target", String(tempTarget));
      setMonthlyTarget(tempTarget);
      setTargetDialogOpen(false);
    } catch {
      localStorage.setItem("dashboard_monthly_target", String(tempTarget));
      setMonthlyTarget(tempTarget);
      setTargetDialogOpen(false);
    }
  };

  const meInitials = String(meName || meEmail || "Admin")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    loadTasksData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadLeavesData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadEmployeesCountData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadOpsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayIso]);

  return (
    <div className="space-y-6 animate-fade-in max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-10">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl border border-white/30 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-[0_18px_45px_rgba(2,6,23,0.25)]">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 25%, rgba(99,102,241,0.55) 0, rgba(99,102,241,0) 45%), radial-gradient(circle at 85% 30%, rgba(168,85,247,0.45) 0, rgba(168,85,247,0) 40%), radial-gradient(circle at 45% 90%, rgba(34,197,94,0.25) 0, rgba(34,197,94,0) 45%)",
          }}
        />
        <DashboardOrb className="absolute -right-10 -top-14 opacity-60 hidden lg:block" />

        <div className="relative grid gap-6 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <div className="text-xs uppercase tracking-wide text-white/70">Overview</div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight">{meName}</h1>
            <p className="mt-1 text-white/70 max-w-xl">{meEmail || "Dashboard summary for today."}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              {!isTeamMember && (
                <Button className="bg-white/10 text-white hover:bg-white/20" variant="outline" onClick={() => navigate("/projects")}>
                  <Briefcase className="w-4 h-4 mr-2" />
                  Projects
                </Button>
              )}
              {canAccessSales && (
                <Button className="bg-white/10 text-white hover:bg-white/20" variant="outline" onClick={() => navigate("/sales/recurring")}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Recurring
                </Button>
              )}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                {canAccessSales ? (
                  <>
                    <div className="text-xs text-white/70">
                      {isAdmin ? "Admin Sales Overview" : "Total Sales"}
                    </div>
                    <div className="mt-1 text-2xl font-extrabold truncate">
                      {isAdmin ? `${displayMoney(monthlyCollected)} this month` : displayMoney(salesTotal)}
                    </div>
                    <div className="mt-1 text-xs text-white/60">
                      {isAdmin ? "Monthly collected" : "All time"}
                    </div>
                    {isAdmin && monthlyTarget > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="text-xs text-white/70">Target:</div>
                        <div className="text-sm font-semibold">{displayMoney(monthlyTarget)}</div>
                        <div className="text-xs text-white/60">({targetProgress}% achieved)</div>
                      </div>
                    )}
                  </>
                ) : isTeamMember ? (
                  <>
                    <div className="text-xs text-white/70">Tasks Overview</div>
                    <div className="mt-1 text-2xl font-extrabold truncate">
                      {openTasksCount} Open Tasks
                    </div>
                    <div className="mt-1 text-xs text-white/60">
                      {tasksPie.completed} completed, {tasksPie.inProgress} in progress
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xs text-white/70">Projects Overview</div>
                    <div className="mt-1 text-2xl font-extrabold truncate">
                      {runningProjects} Active Projects
                    </div>
                    <div className="mt-1 text-xs text-white/60">
                      {openTasksCount} open tasks
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <div className="text-right">
                    <div className="text-xs text-white/70">Orders this month</div>
                    <div className="text-lg font-bold">{ordersThisMonth}</div>
                  </div>
                )}
                <Avatar className="h-14 w-14 border-2 border-white/40 bg-white/10 shadow-lg">
                  <AvatarImage
                    src={adminAvatarSrc}
                    alt="Admin"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/placeholder.svg";
                    }}
                  />
                  <AvatarFallback className="bg-white text-indigo-600 text-lg font-bold">{meInitials}</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards - Responsive: 1 col mobile, 2 col tablet, auto-fit desktop */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {!isTeamMember && (
          <GlassCard className="bg-gradient-to-br from-indigo-50/90 to-indigo-100/70 dark:from-indigo-950/40 dark:to-indigo-900/20 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/projects")}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-indigo-700 dark:text-indigo-200 font-medium">Running projects</p>
                  <p className="text-3xl font-bold text-indigo-900 dark:text-white mt-1">{runningProjects}</p>
                  <p className="text-xs text-indigo-700 mt-1">Open + In Progress</p>
                </div>
                <div className="rounded-2xl bg-white/60 p-3 shadow-sm dark:bg-white/10">
                  <Briefcase className="w-6 h-6 text-indigo-700 dark:text-indigo-300" />
                </div>
              </div>
            </CardContent>
          </GlassCard>
        )}

        {canAccessSales && (
          <GlassCard className="bg-gradient-to-br from-emerald-50/90 to-emerald-100/70 dark:from-emerald-950/40 dark:to-emerald-900/20 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/sales/payments")}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-700 dark:text-emerald-200 font-medium">
                    {isAdmin ? "Admin Monthly Sales" : "Collected (this month)"}
                  </p>
                  <p className="text-2xl font-bold text-emerald-900 dark:text-white mt-1">{displayMoney(monthlyCollected)}</p>
                  <p className="text-xs text-emerald-700 mt-1">
                    {isAdmin ? "Total collected" : "Payments"}
                  </p>
                  {isAdmin && (
                    <div className="mt-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-emerald-600" />
                      <span className="text-xs text-emerald-600">{ordersThisMonth} orders</span>
                    </div>
                  )}
                </div>
                <div className="rounded-2xl bg-white/60 p-3 shadow-sm dark:bg-white/10">
                  <DollarSign className="w-6 h-6 text-emerald-700 dark:text-emerald-300" />
                </div>
              </div>
            </CardContent>
          </GlassCard>
        )}

        {canAccessSales && (
          <Dialog open={targetDialogOpen} onOpenChange={setTargetDialogOpen}>
            <DialogTrigger asChild>
              <GlassCard className="bg-gradient-to-br from-slate-50/90 to-slate-100/70 dark:from-slate-950/40 dark:to-slate-900/20 cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">Target (month)</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{displayMoney(monthlyTarget)}</p>
                      <p className="text-xs text-slate-600 mt-1">
                        {monthlyTarget > 0 ? `${targetProgress}% achieved` : "Click to set target"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white/60 p-3 shadow-sm dark:bg-white/10 flex items-center gap-2">
                      <Target className="w-6 h-6 text-slate-700 dark:text-slate-200" />
                      {isAdmin && <Edit className="w-3 h-3 text-slate-500" />}
                    </div>
                  </div>
                </CardContent>
              </GlassCard>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Set Monthly Target</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Target Amount ({currencyCode})</label>
                  <Input
                    type="number"
                    value={tempTarget}
                    onChange={(e) => setTempTarget(Number(e.target.value) || 0)}
                    placeholder="Enter monthly target"
                    className="mt-1"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setTargetDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveTarget}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Target
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {canAccessSales && !isTeamMember && (
          <GlassCard className="bg-gradient-to-br from-sky-50/90 to-sky-100/70 dark:from-sky-950/40 dark:to-sky-900/20 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/sales/recurring")}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-sky-700 dark:text-sky-200 font-medium">Recurring amount</p>
                  <p className="text-2xl font-bold text-sky-900 dark:text-white mt-1">{displayMoney(recurringMrr)}</p>
                  <p className="text-xs text-sky-700 mt-1">MRR</p>
                </div>
                <div className="rounded-2xl bg-white/60 p-3 shadow-sm dark:bg-white/10">
                  <RefreshCw className="w-6 h-6 text-sky-700 dark:text-sky-300" />
                </div>
              </div>
            </CardContent>
          </GlassCard>
        )}

        {canAccessSales && !isTeamMember && (
          <GlassCard className="bg-gradient-to-br from-rose-50/90 to-rose-100/70 dark:from-rose-950/40 dark:to-rose-900/20 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/invoices")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between w-full gap-2">
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="text-sm text-rose-700 dark:text-rose-200 font-medium">Amount pending</p>
                  <p className="text-xl sm:text-2xl font-bold text-rose-900 dark:text-white mt-1 truncate">{displayMoney(pendingAmount)}</p>
                  <p className="text-xs text-rose-700 mt-1">Unpaid invoices</p>
                </div>
                <div className="rounded-xl bg-white/60 p-2 shadow-sm dark:bg-white/10 flex-shrink-0">
                  <FileText className="w-5 h-5 text-rose-600" />
                </div>
              </div>
            </CardContent>
          </GlassCard>
        )}

        {canAccessSales && !isTeamMember && (
          <GlassCard className="bg-gradient-to-br from-amber-50/90 to-amber-100/70 dark:from-amber-950/40 dark:to-amber-900/20 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/sales/orders")}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-700 dark:text-amber-200 font-medium">Orders near deadline</p>
                  <p className="text-3xl font-bold text-amber-900 dark:text-white mt-1">{nearDeadlineOrders.length}</p>
                  <p className="text-xs text-amber-700 mt-1">Next 3 days (est.)</p>
                </div>
                <div className="rounded-2xl bg-white/60 p-3 shadow-sm dark:bg-white/10">
                  <Clock className="w-6 h-6 text-amber-700 dark:text-amber-300" />
                </div>
              </div>
            </CardContent>
          </GlassCard>
        )}
      </div>

      {/* KPI Cards - Dynamic columns based on role */}
      <div className={`grid gap-4 grid-cols-1 sm:grid-cols-2 ${canAccessSales ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        {!isProjectManager && (
          <GlassCard className="bg-gradient-to-br from-slate-50/90 to-slate-100/70 dark:from-slate-950/40 dark:to-slate-900/20 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/hrm/attendance")}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">Clock</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                    {clockMembers.find((m) => m.clockedIn)?.startTime
                      ? `Started at: ${clockMembers.find((m) => m.clockedIn)!.startTime}`
                      : "Not clocked in"}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">Today</p>
                </div>
                <div className="rounded-2xl bg-white/60 p-3 shadow-sm dark:bg-white/10">
                  <Clock className="w-6 h-6 text-slate-700 dark:text-slate-200" />
                </div>
              </div>
            </CardContent>
          </GlassCard>
        )}

        <GlassCard className="bg-gradient-to-br from-emerald-50/90 to-emerald-100/70 dark:from-emerald-950/40 dark:to-emerald-900/20 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/tasks")}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 dark:text-green-200 font-medium">My open tasks</p>
                <p className="text-3xl font-bold text-green-900 dark:text-white mt-1">{openTasksCount}</p>
                <p className="text-xs text-green-700 mt-1">All tasks</p>
              </div>
              <div className="rounded-2xl bg-white/60 p-3 shadow-sm dark:bg-white/10">
                <CheckCircle className="w-6 h-6 text-emerald-700 dark:text-emerald-300" />
              </div>
            </div>
          </CardContent>
        </GlassCard>

        <GlassCard className="bg-gradient-to-br from-indigo-50/90 to-indigo-100/70 dark:from-indigo-950/40 dark:to-indigo-900/20 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/calendar")}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-indigo-700 dark:text-indigo-200 font-medium">Events today</p>
                <p className="text-3xl font-bold text-indigo-900 dark:text-white mt-1">{Math.max(eventsToday, eventsCountToday)}</p>
                <p className="text-xs text-indigo-700 mt-1">{todayIso}</p>
              </div>
              <div className="rounded-2xl bg-white/60 p-3 shadow-sm dark:bg-white/10">
                <Calendar className="w-6 h-6 text-indigo-700 dark:text-indigo-300" />
              </div>
            </div>
          </CardContent>
        </GlassCard>

        {canAccessSales && !isDeveloper && (
          <GlassCard className="bg-gradient-to-br from-rose-50/90 to-rose-100/70 dark:from-rose-950/40 dark:to-rose-900/20 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/invoices")}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-rose-700 dark:text-rose-200 font-medium">Due</p>
                  <p className="text-2xl font-bold text-rose-900 dark:text-white mt-1">{displayMoney(pendingAmount)}</p>
                  <p className="text-xs text-rose-700 mt-1">Invoices unpaid</p>
                </div>
                <div className="rounded-2xl bg-white/60 p-3 shadow-sm dark:bg-white/10">
                  <FileText className="w-6 h-6 text-rose-600" />
                </div>
              </div>
            </CardContent>
          </GlassCard>
        )}
      </div>

      {/* Charts Row - Adaptive layout based on role */}
      <div className={`grid gap-4 grid-cols-1 ${canAccessSales ? 'lg:grid-cols-12' : isTeamMember ? 'lg:grid-cols-2' : 'lg:grid-cols-2'}`}>
        <div className={`space-y-4 ${canAccessSales ? 'lg:col-span-4' : ''}`}>
          {!isTeamMember && (
            <GlassCard>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Projects Overview</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div>
                    <div className="text-lg font-extrabold text-emerald-600">{projectCounts.open}</div>
                    <div className="text-xs text-muted-foreground">Open</div>
                  </div>
                  <div>
                    <div className="text-lg font-extrabold text-sky-600">{projectCounts.inProgress}</div>
                    <div className="text-xs text-muted-foreground">In Progress</div>
                  </div>
                  <div>
                    <div className="text-lg font-extrabold text-indigo-600">{projectCounts.completed}</div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </div>
                  <div>
                    <div className="text-lg font-extrabold text-amber-600">{projectCounts.hold}</div>
                    <div className="text-xs text-muted-foreground">Hold</div>
                  </div>
                </div>
                <div className="mt-3 h-[150px] rounded-lg bg-white/80 dark:bg-slate-950/40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: "Open", value: projectCounts.open },
                        { name: "In Progress", value: projectCounts.inProgress },
                        { name: "Completed", value: projectCounts.completed },
                        { name: "Hold", value: projectCounts.hold },
                      ]}
                      margin={{ top: 12, right: 12, left: 0, bottom: 6 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} width={34} />
                      <Tooltip content={<FancyTooltip />} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </GlassCard>
          )}

          <GlassCard>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">All Tasks Overview</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[170px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "To do", value: tasksPie.todo },
                        { name: "In progress", value: tasksPie.inProgress },
                        { name: "Done", value: tasksPie.completed },
                        { name: "Expired", value: tasksPie.expired },
                      ]}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      {["#f59e0b", "#3b82f6", "#22c55e", "#ef4444"].map((c) => (
                        <Cell key={c} fill={c} />
                      ))}
                    </Pie>
                    <Tooltip content={<FancyTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </GlassCard>
        </div>

        {canAccessSales && (
          <div className="lg:col-span-4 space-y-4">
            <GlassCard>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Invoice Overview</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Overdue</span>
                    <span className="font-semibold text-rose-600">{displayMoney(invoiceOverview.overdue)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Unpaid</span>
                    <span className="font-semibold">{displayMoney(invoiceOverview.unpaid)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Paid</span>
                    <span className="font-semibold text-emerald-600">{displayMoney(invoiceOverview.paid)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Draft</span>
                    <span className="font-semibold">{displayMoney(invoiceOverview.draft)}</span>
                  </div>
                </div>
                <div className="mt-3 h-[140px] rounded-lg bg-white/80 dark:bg-slate-950/40">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={[
                        { name: "Overdue", value: invoiceOverview.overdue },
                        { name: "Unpaid", value: invoiceOverview.unpaid },
                        { name: "Paid", value: invoiceOverview.paid },
                        { name: "Draft", value: invoiceOverview.draft },
                      ]}
                      margin={{ top: 12, right: 12, left: 0, bottom: 6 }}
                    >
                      <defs>
                        <linearGradient id="invFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} width={34} />
                      <Tooltip content={<FancyTooltip />} />
                      <Area type="monotone" dataKey="value" stroke="#6366f1" fill="url(#invFill)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </GlassCard>

            <GlassCard>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Income vs Expenses</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/30 bg-white/50 p-3 backdrop-blur dark:border-white/10 dark:bg-white/5">
                    <div className="text-xs text-muted-foreground">Income</div>
                    <div className="mt-1 text-sm font-semibold">{displayMoney(salesTotal)}</div>
                  </div>
                  <div className="rounded-xl border border-white/30 bg-white/50 p-3 backdrop-blur dark:border-white/10 dark:bg-white/5">
                    <div className="text-xs text-muted-foreground">Expenses</div>
                    <div className="mt-1 text-sm font-semibold">{displayMoney(expensesTotal)}</div>
                  </div>
                </div>
                <div className="mt-3 h-[120px] rounded-lg bg-white/80 dark:bg-slate-950/40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={[
                        { name: "Income", a: salesTotal },
                        { name: "Expenses", a: expensesTotal },
                        { name: "Net", a: salesTotal - expensesTotal },
                      ]}
                      margin={{ top: 12, right: 12, left: 0, bottom: 6 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} width={34} />
                      <Tooltip content={<FancyTooltip />} />
                      <Line type="monotone" dataKey="a" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </GlassCard>
          </div>
        )}

        <div className={`space-y-4 ${canAccessSales ? 'lg:col-span-4' : ''}`}>
          {!isProjectManager && (
            <GlassCard>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Tickets Status</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-[170px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Open", value: ticketsStatus.open },
                          { name: "Closed", value: ticketsStatus.closed },
                          { name: "Other", value: ticketsStatus.other },
                        ]}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={48}
                        outerRadius={70}
                        paddingAngle={2}
                      >
                        {["#f59e0b", "#22c55e", "#94a3b8"].map((c) => (
                          <Cell key={c} fill={c} />
                        ))}
                      </Pie>
                      <Tooltip content={<FancyTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <div className="font-semibold">{ticketsStatus.open}</div>
                    <div className="text-muted-foreground">Open</div>
                  </div>
                  <div>
                    <div className="font-semibold">{ticketsStatus.closed}</div>
                    <div className="text-muted-foreground">Closed</div>
                  </div>
                  <div>
                    <div className="font-semibold">{ticketsStatus.other}</div>
                    <div className="text-muted-foreground">Other</div>
                  </div>
                </div>
              </CardContent>
            </GlassCard>
          )}

          <GlassCard>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Announcements</CardTitle>
              <Button variant="outline" size="sm" className="bg-white/60 dark:bg-white/10" onClick={() => navigate("/announcements")}>
                <Eye className="w-4 h-4 mr-2" />
                View
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {announcements.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No announcements</div>
                ) : (
                  announcements.map((a) => (
                    <div key={a._id} className="rounded-xl border border-white/30 bg-white/50 p-3 text-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                      <div className="font-medium">{a.title || "Announcement"}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{a.message || ""}</div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </GlassCard>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-6">
          {!isProjectManager && !isDeveloper && !isTeamMember && (
            <GlassCard>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Recent Leads</CardTitle>
                <Button variant="outline" size="sm" className="bg-white/60 dark:bg-white/10" onClick={() => navigate("/crm/leads") }>
                  <Eye className="w-4 h-4 mr-2" />
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-xl border border-white/30 bg-white/40 backdrop-blur dark:border-white/10 dark:bg-white/5">
                  <table className="w-full text-sm min-w-[520px]">
                    <thead>
                      <tr className="border-b border-white/30 dark:border-white/10">
                        <th className="text-left py-3 px-4">Name</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Created</th>
                        <th className="text-left py-3 px-4">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentLeads.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 px-4 text-center text-muted-foreground">No leads found</td>
                        </tr>
                      ) : (
                        recentLeads.map((l) => (
                          <tr key={l.id} className="border-b border-white/30 hover:bg-white/60 dark:border-white/10 dark:hover:bg-white/10">
                            <td className="py-3 px-4 font-medium text-primary">{l.name}</td>
                            <td className="py-3 px-4">
                              <Badge variant="secondary">{l.status}</Badge>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">{l.createdAt}</td>
                            <td className="py-3 px-4">
                              <Button size="sm" variant="outline" onClick={() => navigate(`/crm/leads/${l.id}`)}>
                                <Eye className="w-3 h-3" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </GlassCard>
          )}

          <GlassCard>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Tasks</CardTitle>
              <Button variant="outline" size="sm" className="bg-white/60 dark:bg-white/10" onClick={() => navigate("/tasks")}>
                <Eye className="w-4 h-4 mr-2" />
                View All Tasks
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border border-white/30 bg-white/40 backdrop-blur dark:border-white/10 dark:bg-white/5">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b border-white/30 dark:border-white/10">
                      <th className="text-left py-3 px-4">ID</th>
                      <th className="text-left py-3 px-4">Title</th>
                      <th className="text-left py-3 px-4">Start Date</th>
                      <th className="text-left py-3 px-4">Deadline</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasksTable.slice(0, 5).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 px-4 text-center text-muted-foreground">No tasks found</td>
                      </tr>
                    ) : (
                      tasksTable.slice(0, 5).map((task) => (
                        <tr key={task.id} className="border-b border-white/30 hover:bg-white/60 dark:border-white/10 dark:hover:bg-white/10">
                          <td className="py-3 px-4">{task.id}</td>
                          <td className="py-3 px-4 text-primary font-medium">{task.title}</td>
                          <td className="py-3 px-4">{task.startDate}</td>
                          <td className="py-3 px-4">{task.deadline}</td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={task.status === "done" ? "default" : task.status === "in-progress" ? "secondary" : "outline"}
                            >
                              {task.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline" onClick={() => navigate(`/tasks/${task.id}`)}>
                                <Eye className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </GlassCard>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <GlassCard>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Upcoming Events</CardTitle>
              <Button variant="outline" size="sm" className="bg-white/60 dark:bg-white/10" onClick={() => navigate("/events")}>
                <Eye className="w-4 h-4 mr-2" />
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {upcomingEvents.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No upcoming events</div>
                ) : (
                  upcomingEvents.map((e) => (
                    <div key={e._id} className="rounded-xl border border-white/30 bg-white/50 p-3 text-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                      <div className="font-medium">{e.title || "Event"}</div>
                      <div className="text-xs text-muted-foreground">
                        {e.start ? new Date(e.start).toLocaleString() : ""}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </GlassCard>

          <GlassCard>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!isTeamMember && (
                <Button className="w-full justify-start bg-white/60 dark:bg-white/10" variant="outline" onClick={() => navigate("/projects")}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              )}
              <Button className="w-full justify-start bg-white/60 dark:bg-white/10" variant="outline" onClick={() => navigate("/tasks")}>
                <CheckCircle className="w-4 h-4 mr-2" />
                New Task
              </Button>
              {!isProjectManager && !isTeamMember && (
                <Button className="w-full justify-start bg-white/60 dark:bg-white/10" variant="outline" onClick={() => navigate("/hrm/employees")}>
                  <Users className="w-4 h-4 mr-2" />
                  View Team Members
                </Button>
              )}
              {canAccessSales && (
                <Button className="w-full justify-start bg-white/60 dark:bg-white/10" variant="outline" onClick={() => navigate("/invoices")}>
                  <FileText className="w-4 h-4 mr-2" />
                  Create Invoice
                </Button>
              )}
              {isAdmin && (
                <Button className="w-full justify-start bg-white/60 dark:bg-white/10" variant="outline" onClick={() => navigate("/settings")}>
                  <Settings className="w-4 h-4 mr-2" />
                  System Settings
                </Button>
              )}
            </CardContent>
          </GlassCard>

          {!isTeamMember && (
            <GlassCard>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Open Projects</CardTitle>
                <Button variant="outline" size="sm" className="bg-white/60 dark:bg-white/10" onClick={() => navigate("/projects")}>
                  <Eye className="w-4 h-4 mr-2" />
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {projectsList.slice(0, 5).length === 0 ? (
                    <div className="text-sm text-muted-foreground">No projects</div>
                  ) : (
                    projectsList.slice(0, 5).map((project) => (
                      <div key={project.id} className="text-xs rounded-xl border border-white/30 bg-white/50 p-3 backdrop-blur dark:border-white/10 dark:bg-white/5">
                        <button
                          type="button"
                          className="text-primary font-medium hover:underline text-left"
                          onClick={() => navigate(`/projects/overview/${project.id}`)}
                        >
                          {project.name}
                        </button>
                        <p className="text-muted-foreground">Estimate: {project.estimate}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}



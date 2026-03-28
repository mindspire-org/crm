import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Activity,
  ChevronRight,
  Sparkles,
  AlertCircle,
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
import { cn } from "@/lib/utils";
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

// Strategic Sub-components
function BriefStat({ title, value, icon: Icon, color }: any) {
  return (
    <GlassCard className="p-4 flex items-center gap-4 transition-all hover:scale-[1.02] hover:shadow-lg cursor-default">
      <div className={cn("p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 shadow-inner", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1.5">{title}</div>
        <div className="text-lg font-black tracking-tight text-slate-900 dark:text-white truncate">{value}</div>
      </div>
    </GlassCard>
  );
}

function PulseCard({ title, icon: Icon, children, color }: any) {
  return (
    <GlassCard className="overflow-hidden border-none shadow-xl">
      <div className={cn("h-1.5 w-full", color)} />
      <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-black uppercase tracking-[0.15em] text-slate-500 flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {title}
        </CardTitle>
        <div className="h-2 w-2 rounded-full animate-pulse bg-emerald-500" />
      </CardHeader>
      <CardContent className="p-5 pt-2">
        {children}
      </CardContent>
    </GlassCard>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const role = useMemo(() => getCurrentUser()?.role || "staff", []);
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
  const [todayTasks, setTodayTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const [openAddTask, setOpenAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [savingTask, setSavingTask] = useState(false);

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
      const canReadTickets = me?.role === "admin" || me?.role === "staff" || me?.role === "marketer" || me?.role === "project_manager";
      const [membersRes, expensesRes, ticketsRes, eventsRes, annRes, invRes, tasksRes, empRes] = await Promise.all([
        fetch(`${API_BASE}/api/attendance/members`, { headers }).catch(() => null as any),
        fetch(`${API_BASE}/api/expenses`, { headers }).catch(() => null as any),
        canReadTickets ? fetch(`${API_BASE}/api/tickets`, { headers }).catch(() => null as any) : (null as any),
        fetch(`${API_BASE}/api/events`, { headers }).catch(() => null as any),
        fetch(`${API_BASE}/api/announcements?active=1`, { headers }).catch(() => null as any),
        fetch(`${API_BASE}/api/invoices`, { headers }).catch(() => null as any),
        fetch(`${API_BASE}/api/tasks?deadlineFrom=${todayIso}&deadlineTo=${todayIso}`, { headers }).catch(() => null as any),
        (me?.role === "admin" || me?.role === "project_manager") ? fetch(`${API_BASE}/api/employees`, { headers }).catch(() => null as any) : (null as any),
      ]);

      if (membersRes?.ok) {
        const json = await membersRes.json().catch(() => []);
        setClockMembers(Array.isArray(json) ? json : []);
      }

      if (tasksRes?.ok) {
        const json = await tasksRes.json().catch(() => []);
        setTodayTasks(Array.isArray(json) ? json : []);
      }

      if (empRes?.ok) {
        const json = await empRes.json().catch(() => []);
        setEmployees(Array.isArray(json) ? json : []);
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

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;
    setSavingTask(true);
    try {
      const assigneeDoc = employees.find(e => e._id === newTaskAssignee);
      const payload = {
        title: newTaskTitle.trim(),
        deadline: todayIso,
        status: "todo",
        priority: "medium",
        assignees: assigneeDoc ? [{ name: assigneeDoc.name || `${assigneeDoc.firstName} ${assigneeDoc.lastName}`, initials: assigneeDoc.initials }] : [],
      };
      const res = await fetch(`${API_BASE}/api/tasks`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setOpenAddTask(false);
        setNewTaskTitle("");
        setNewTaskAssignee("");
        loadOpsData();
      }
    } catch (e) {
      console.error("Failed to create task", e);
    } finally {
      setSavingTask(false);
    }
  };

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
      {/* Strategic Header - Brief Version */}
      <div className="relative overflow-hidden rounded-[40px] border border-white/30 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-[0_22px_60px_rgba(2,6,23,0.35)]">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 25%, rgba(99,102,241,0.55) 0, rgba(99,102,241,0) 45%), radial-gradient(circle at 85% 30%, rgba(168,85,247,0.45) 0, rgba(168,85,247,0) 40%)",
          }}
        />
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 opacity-75 blur transition duration-1000 group-hover:opacity-100 group-hover:duration-200"></div>
              <Avatar className="h-20 w-20 border-2 border-white/20 bg-slate-900 shadow-2xl relative">
                <AvatarImage src={adminAvatarSrc} alt="Director" />
                <AvatarFallback className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white text-2xl font-black">{meInitials}</AvatarFallback>
              </Avatar>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="h-5 w-5 rounded-lg bg-indigo-500/20 backdrop-blur-md border border-indigo-500/30 flex items-center justify-center">
                  <Target className="w-3 h-3 text-indigo-400" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300/80">Executive Command Center</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight leading-none">
                Director <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-emerald-300">{meName.split(' ')[0]}</span>
              </h1>
              <div className="flex items-center gap-3 mt-3 text-xs font-bold text-white/50 uppercase tracking-widest">
                <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-emerald-400" /> Operational Efficiency: 94%</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="h-10 rounded-xl bg-white text-slate-950 hover:bg-white/90 font-bold px-4 shadow-lg shadow-black/10 transition-all active:scale-95" onClick={() => navigate("/projects")}>
              <Briefcase className="w-3.5 h-3.5 mr-2" /> Strategic Projects
            </Button>
            <Button size="sm" variant="outline" className="h-10 rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10 backdrop-blur-md font-bold px-4 transition-all active:scale-95" onClick={() => setOpenAddTask(true)}>
              <Plus className="w-3.5 h-3.5 mr-2" /> Deploy Objective
            </Button>
          </div>
        </div>
      </div>

      {/* Brief KPI Ribbon */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <BriefStat title="Revenue" value={displayMoney(monthlyCollected)} icon={DollarSign} color="text-emerald-500" />
        <BriefStat title="Operations" value={runningProjects} icon={Briefcase} color="text-indigo-500" />
        <BriefStat title="Pending Due" value={displayMoney(pendingAmount)} icon={AlertCircle} color="text-rose-500" />
        <BriefStat title="Total Team" value={teamMembers} icon={Users} color="text-purple-500" />
      </div>

      {/* Strategic Pulse Grid */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
        {/* Finance Pulse */}
        <div className="lg:col-span-6 space-y-6">
          <PulseCard title="Financial Pulse" icon={DollarSign} color="bg-emerald-500">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monthly MRR</div>
                <div className="text-xl font-black text-slate-900 dark:text-white">{displayMoney(recurringMrr)}</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Expenses</div>
                <div className="text-xl font-black text-slate-900 dark:text-white">{displayMoney(expensesTotal)}</div>
              </div>
            </div>

            {isAdmin && monthlyTarget > 0 && (
              <div className="space-y-3 p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30">
                <div className="flex justify-between items-end">
                  <div className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-[0.2em]">Target Progress</div>
                  <div className="text-sm font-black text-emerald-700 dark:text-emerald-400">{targetProgress}%</div>
                </div>
                <div className="h-2 w-full bg-emerald-200/50 dark:bg-emerald-900/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-1000" 
                    style={{ width: `${targetProgress}%` }} 
                  />
                </div>
                <div className="flex justify-between text-[9px] font-black text-emerald-700/60 uppercase tracking-widest">
                  <span>Collected: {displayMoney(monthlyCollected)}</span>
                  <span>Goal: {displayMoney(monthlyTarget)}</span>
                </div>
              </div>
            )}

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => navigate("/invoices")}>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center"><AlertCircle className="w-4 h-4" /></div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Overdue Invoices</span>
                </div>
                <Badge variant="secondary" className="bg-rose-100 text-rose-700 font-black px-2 py-0.5">{invoiceOverview.overdue > 0 ? displayMoney(invoiceOverview.overdue) : "Clean"}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => navigate("/sales/orders")}>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><Clock className="w-4 h-4" /></div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Pipeline Value</span>
                </div>
                <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 font-black px-2 py-0.5">{displayMoney(salesTotal)}</Badge>
              </div>
            </div>
          </PulseCard>
        </div>

        {/* Operations Pulse */}
        <div className="lg:col-span-6 space-y-6">
          <PulseCard title="Operations Pulse" icon={Briefcase} color="bg-indigo-500">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Live Projects</div>
                <div className="text-xl font-black text-slate-900 dark:text-white">{runningProjects}</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Open Tickets</div>
                <div className="text-xl font-black text-slate-900 dark:text-white">{ticketsStatus.open}</div>
              </div>
            </div>

            <div className="h-[120px] w-full mb-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Resource Velocity</div>
              <div className="flex items-end gap-2 h-12">
                {Object.entries(tasksPie).map(([key, value], idx) => (
                  <div key={key} className="flex-1 flex flex-col gap-1.5 items-center group">
                    <div 
                      className={cn(
                        "w-full rounded-t-lg transition-all duration-1000 group-hover:opacity-80",
                        idx === 0 ? "bg-amber-400" : idx === 1 ? "bg-indigo-500" : idx === 2 ? "bg-emerald-500" : "bg-rose-500"
                      )} 
                      style={{ height: `${Math.max(10, Math.min(100, (value / (openTasksCount || 1)) * 100))}%` }} 
                    />
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{key}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center"><Users className="w-4 h-4" /></div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Active Team</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-black text-indigo-700 dark:text-indigo-400">{teamMembers - onLeaveToday}</span>
                  <span className="text-[10px] font-bold text-slate-400">/ {teamMembers}</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => navigate("/calendar")}>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><Calendar className="w-4 h-4" /></div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Events Today</span>
                </div>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 font-black px-2 py-0.5">{eventsCountToday}</Badge>
              </div>
            </div>
          </PulseCard>
        </div>

        {/* Strategic Intelligence - Lower Section */}
        <div className="lg:col-span-8 space-y-6">
          <GlassCard className="border-none shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div className="space-y-1">
                <CardTitle className="text-lg font-black flex items-center gap-2 uppercase tracking-widest">
                  <Activity className="w-5 h-5 text-indigo-600" />
                  Live Strategic Pipeline
                </CardTitle>
              </div>
              <Button variant="ghost" size="sm" className="font-bold text-xs hover:bg-slate-100 rounded-xl" onClick={() => navigate("/projects")}>View All <ChevronRight className="w-3.5 h-3.5 ml-1" /></Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {projectsList.slice(0, 4).map((p) => (
                  <div 
                    key={p.id} 
                    className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700/50 hover:border-indigo-200 transition-all cursor-pointer group"
                    onClick={() => navigate(`/projects/overview/${p.id}`)}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors truncate">{p.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{p.estimate}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-all" />
                  </div>
                ))}
              </div>
            </CardContent>
          </GlassCard>
        </div>

        {/* Executive Briefing Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <GlassCard className="bg-slate-900 text-white border-none shadow-2xl overflow-hidden h-full">
            <div className="absolute top-0 right-0 p-8 opacity-10"><Sparkles className="w-24 h-24" /></div>
            <CardHeader>
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Director Briefing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {announcements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-3 opacity-50">
                  <CheckCircle className="w-10 h-10 text-emerald-400" />
                  <p className="text-xs font-bold uppercase tracking-widest">System Optimal</p>
                </div>
              ) : (
                announcements.map((a) => (
                  <div key={a._id} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group cursor-pointer">
                    <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2">Priority Intel</div>
                    <div className="font-bold text-sm mb-1">{a.title}</div>
                    <div className="text-xs text-white/50 line-clamp-2 leading-relaxed font-medium">{a.message}</div>
                  </div>
                ))
              )}
              
              <div className="pt-4 border-t border-white/10">
                <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Quick Governance</div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="ghost" size="sm" className="h-9 rounded-lg bg-white/5 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10" onClick={() => navigate("/settings")}>Settings</Button>
                  <Button variant="ghost" size="sm" className="h-9 rounded-lg bg-white/5 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10" onClick={() => navigate("/reports")}>Audit</Button>
                </div>
              </div>
            </CardContent>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

// Strategic Sub-components
function StrategicActionButton({ icon: Icon, label, onClick, color }: any) {
  const colors: any = {
    indigo: "bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white",
    emerald: "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white",
    rose: "bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white",
    slate: "bg-slate-50 text-slate-600 hover:bg-slate-900 hover:text-white"
  };

  return (
    <Button 
      variant="ghost" 
      className={cn(
        "w-full justify-start h-14 px-4 rounded-2xl font-bold transition-all duration-300 active:scale-95 group",
        colors[color]
      )}
      onClick={onClick}
    >
      <div className="p-2 rounded-xl bg-white/50 group-hover:bg-white/20 mr-4 transition-colors">
        <Icon className="w-5 h-5" />
      </div>
      {label}
    </Button>
  );
}




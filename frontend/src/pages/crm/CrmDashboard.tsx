import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import {
  Users,
  Target,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart as PieChartIcon,
  Activity,
  Zap,
  BarChart3,
  Calendar,
  Search,
  RefreshCw,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  Layers,
} from "lucide-react";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";
import { hasCrmPermission, canViewFinancialData, getCurrentUser } from "@/utils/roleAccess";

type LeadDoc = {
  _id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  ownerId?: string;
  status?: string;
  source?: string;
  value?: string;
  currency?: string;
  currencySymbol?: string;
  createdAt?: string;
};

type Employee = { _id: string; name?: string; firstName?: string; lastName?: string };

const STATUS_ORDER = ["New", "Qualified", "Discussion", "Negotiation", "Won", "Lost"] as const;

type RangeKey = "7d" | "30d" | "90d" | "mtd";

const safeNumber = (v: any) => {
  if (v === null || v === undefined) return 0;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const fmtMoney = (n: number, symbol?: string) => {
  const s = symbol || "Rs.";
  try {
    return `${s}${Math.round(n).toLocaleString()}`;
  } catch {
    return `${s}${Math.round(n)}`;
  }
};

const formatDate = (iso?: string) => {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return "-";
  }
};

const formatDayKey = (d: Date) => {
  try {
    const x = new Date(d);
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, "0");
    const day = String(x.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return "";
  }
};

const dateOnly = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const addDays = (d: Date, days: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};

function Kpi({ title, value, meta, icon: Icon, trend }: { title: string; value: string; meta?: string; icon: any; trend?: string }) {
  return (
    <Card className="border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm rounded-2xl">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">{title}</div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{value}</div>
            {meta ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">{meta}</div> : null}
          </div>
          <div className="flex flex-col items-end gap-2">
            {trend ? (
              <Badge variant="secondary" className="text-[10px] font-semibold">
                {trend}
              </Badge>
            ) : null}
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900">
              <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CrmDashboard() {
  const navigate = useNavigate();
  const [items, setItems] = useState<LeadDoc[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [rangeKey, setRangeKey] = useState<RangeKey>("30d");
  const [nextReminderByLeadId, setNextReminderByLeadId] = useState<Record<string, any>>({});
  const [commissionsLoading, setCommissionsLoading] = useState(false);
  const [commissionSummary, setCommissionSummary] = useState({
    totalEarned: 0,
    totalPaid: 0,
    totalPending: 0,
    pendingCount: 0,
    approvedCount: 0,
    paidCount: 0,
  });

  // Permission checks
  const currentUser = getCurrentUser();
  const canViewTeamData = hasCrmPermission('team.manage') || hasCrmPermission('reports.view');
  const canViewFinanceData = canViewFinancialData(currentUser);

  const employeeNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of employees) {
      const name = (e.name || `${e.firstName || ""} ${e.lastName || ""}`.trim() || "-").trim();
      if (e._id) m.set(String(e._id), name);
    }
    return m;
  }, [employees]);

  const loadEmployees = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/employees`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json().catch(() => []);
      setEmployees(Array.isArray(data) ? data : []);
    } catch {
      setEmployees([]);
    }
  };

  const range = useMemo(() => {
    const now = new Date();
    const today = dateOnly(now);
    if (rangeKey === "mtd") {
      const from = new Date(today);
      from.setDate(1);
      return { from, to: addDays(today, 1), label: "Month to date" };
    }
    const days = rangeKey === "7d" ? 7 : rangeKey === "90d" ? 90 : 30;
    const from = addDays(today, -(days - 1));
    return { from, to: addDays(today, 1), label: `Last ${days} days` };
  }, [rangeKey]);

  const goLeads = (params: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      const s = String(v ?? "").trim();
      if (!s) continue;
      sp.set(k, s);
    }
    const qs = sp.toString();
    navigate(`/crm/leads${qs ? `?${qs}` : ""}`);
  };

  const load = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      const createdToInclusive = addDays(range.to, -1);
      params.set("lastContactFrom", formatDayKey(range.from));
      params.set("lastContactTo", formatDayKey(createdToInclusive));
      params.set("sort", "lastContact");
      const url = `${API_BASE}/api/leads${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to load leads");
      const data = await res.json().catch(() => []);
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load leads");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const loadNextReminders = async (leadIds: string[]) => {
    try {
      if (!leadIds.length) {
        setNextReminderByLeadId({});
        return;
      }
      const chunkSize = 40;
      const chunks: string[][] = [];
      for (let i = 0; i < leadIds.length; i += chunkSize) chunks.push(leadIds.slice(i, i + chunkSize));

      const merged: Record<string, any> = {};
      for (const chunk of chunks) {
        const qs = new URLSearchParams();
        qs.set("leadIds", chunk.join(","));
        qs.set("includeOverdue", "1");
        const res = await fetch(`${API_BASE}/api/reminders/next?${qs.toString()}`, { headers: getAuthHeaders() });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) continue;
        if (json && typeof json === "object") {
          for (const [k, v] of Object.entries(json)) merged[k] = v;
        }
      }
      setNextReminderByLeadId(merged);
    } catch {
      setNextReminderByLeadId({});
    }
  };

  useEffect(() => {
    loadEmployees();
    load();
    const loadCommissions = async () => {
      setCommissionsLoading(true);
      try {
        const headers = getAuthHeaders();
        const res = await fetch(`${API_BASE}/api/commissions/my-commissions`, { headers });
        if (res.ok) {
          const data = await res.json();
          setCommissionSummary(data.summary || {
            totalEarned: 0,
            totalPaid: 0,
            totalPending: 0,
            pendingCount: 0,
            approvedCount: 0,
            paidCount: 0,
          });
        }
      } catch (e) {
        console.error("Failed to fetch commissions:", e);
      } finally {
        setCommissionsLoading(false);
      }
    };
    loadCommissions();
  }, [rangeKey]);

  useEffect(() => {
    const leadIds = items.map((x) => String(x._id)).filter(Boolean);
    void loadNextReminders(leadIds);
  }, [items.length]);

  const stats = useMemo(() => {
    const byStatus: Record<string, { count: number; value: number }> = {};
    for (const s of STATUS_ORDER) byStatus[s] = { count: 0, value: 0 };

    let expected = 0;
    let won = 0;
    let lost = 0;
    let total = 0;
    let wonCount = 0;
    let lostCount = 0;

    for (const l of items) {
      total += 1;
      const status = String(l.status || "New");
      const v = safeNumber(l.value);
      if (!byStatus[status]) byStatus[status] = { count: 0, value: 0 };
      byStatus[status].count += 1;
      byStatus[status].value += v;

      if (status === "Won") {
        won += v;
        wonCount += 1;
      } else if (status === "Lost") {
        lost += v;
        lostCount += 1;
      }
      else expected += v;
    }

    const symbol =
      items.find((x) => x.currencySymbol)?.currencySymbol ||
      items.find((x) => x.currency === "USD")?.currencySymbol ||
      "Rs.";

    const closed = wonCount + lostCount;
    const winRate = closed > 0 ? wonCount / closed : 0;
    const conversionRate = total > 0 ? wonCount / total : 0;

    return { total, expected, won, lost, wonCount, lostCount, winRate, conversionRate, byStatus, symbol };
  }, [items]);

  const remindersHealth = useMemo(() => {
    const start = dateOnly(new Date());
    const end = addDays(start, 1);

    let overdue = 0;
    let today = 0;
    let upcoming = 0;

    for (const lead of items) {
      const r = nextReminderByLeadId?.[String(lead._id)];
      const dueAt = r?.dueAt ? new Date(r.dueAt) : null;
      if (!dueAt || Number.isNaN(dueAt.getTime())) continue;
      if (dueAt < start) overdue += 1;
      else if (dueAt >= start && dueAt < end) today += 1;
      else upcoming += 1;
    }

    const total = overdue + today + upcoming;
    const overduePct = total ? overdue / total : 0;
    return { overdue, today, upcoming, total, overduePct };
  }, [items, nextReminderByLeadId]);

  const pipelineChartData = useMemo(() => {
    return STATUS_ORDER.map((s) => ({ stage: s, count: stats.byStatus[s]?.count || 0 }));
  }, [stats.byStatus]);

  const leadFlowData = useMemo(() => {
    const start = dateOnly(range.from);
    const end = dateOnly(range.to);
    const days: Date[] = [];
    for (let d = new Date(start); d < end; d = addDays(d, 1)) days.push(new Date(d));

    const rows = days.map((d) => ({ day: formatDayKey(d), new: 0, won: 0, lost: 0 }));
    const idx = new Map(rows.map((r, i) => [r.day, i] as const));

    for (const l of items) {
      const ts = l.createdAt ? new Date(l.createdAt) : null;
      if (!ts || Number.isNaN(ts.getTime())) continue;
      const key = formatDayKey(dateOnly(ts));
      const i = idx.get(key);
      if (i === undefined) continue;
      rows[i].new += 1;
      const st = String(l.status || "");
      if (st === "Won") rows[i].won += 1;
      if (st === "Lost") rows[i].lost += 1;
    }
    return rows;
  }, [items, range.from, range.to]);

  const ownerPerf = useMemo(() => {
    const m = new Map<string, { ownerId: string; total: number; won: number; lost: number; wonValue: number }>();
    for (const l of items) {
      const id = String(l.ownerId || "Unassigned");
      const cur = m.get(id) || { ownerId: id, total: 0, won: 0, lost: 0, wonValue: 0 };
      cur.total += 1;
      const st = String(l.status || "New");
      if (st === "Won") {
        cur.won += 1;
        cur.wonValue += safeNumber(l.value);
      }
      if (st === "Lost") cur.lost += 1;
      m.set(id, cur);
    }
    const list = [...m.values()].map((x) => {
      const closed = x.won + x.lost;
      const winRate = closed > 0 ? x.won / closed : 0;
      const name = x.ownerId === "Unassigned" ? "Unassigned" : (employeeNameById.get(String(x.ownerId)) || "-");
      return { ...x, name, winRate };
    });
    list.sort((a, b) => b.wonValue - a.wonValue);
    return list.slice(0, 6);
  }, [employeeNameById, items]);

  const sourcePerf = useMemo(() => {
    const m = new Map<string, { source: string; total: number; won: number; wonValue: number }>();
    for (const l of items) {
      const src = String(l.source || "-").trim() || "-";
      const cur = m.get(src) || { source: src, total: 0, won: 0, wonValue: 0 };
      cur.total += 1;
      if (String(l.status || "") === "Won") {
        cur.won += 1;
        cur.wonValue += safeNumber(l.value);
      }
      m.set(src, cur);
    }
    const list = [...m.values()].map((x) => ({ ...x, conversionRate: x.total ? x.won / x.total : 0 }));
    list.sort((a, b) => b.total - a.total);
    return list.slice(0, 8);
  }, [items]);

  const latest = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? items.filter((l) => {
          const hay = `${l.name || ""} ${l.company || ""} ${l.email || ""} ${l.phone || ""}`.toLowerCase();
          return hay.includes(q);
        })
      : items;

    return [...filtered]
      .sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      })
      .slice(0, 8);
  }, [items, search]);

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 pb-12">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-14 space-y-6 sm:space-y-8 pt-6">
        {/* Header */}
        <Card className="border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm rounded-2xl">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/10">
                  <Target className="w-5 h-5 text-indigo-700 dark:text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white leading-tight">CRM Dashboard</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">Leads performance, owners, sources, and follow-ups.</div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="h-8 px-3 text-xs font-semibold">
                    {range.label}
                  </Badge>
                  <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-1">
                    {(["7d", "30d", "90d", "mtd"] as const).map((k) => (
                      <button
                        key={k}
                        onClick={() => setRangeKey(k)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                          rangeKey === k
                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
                        )}
                      >
                        {k.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button onClick={load} variant="outline" disabled={loading} className="h-9">
                    <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
                    Refresh
                  </Button>
                  <Button onClick={() => navigate("/crm/leads")} className="h-9">
                    Pipeline view
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
          <Kpi title="Total leads" value={String(stats.total)} icon={Target} />
          <Kpi title="Won" value={String(stats.wonCount)} icon={Zap} />
          <Kpi title="Win rate" value={`${Math.round(stats.winRate * 100)}%`} icon={Activity} />
          <Kpi title="Conversion" value={`${Math.round(stats.conversionRate * 100)}%`} icon={TrendingUp} />
          <Kpi title="Commission" value={fmtMoney(commissionSummary.totalEarned, stats.symbol)} icon={DollarSign} meta={`${commissionSummary.totalPending.toLocaleString()} pending`} />
        </div>

        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-1 w-full overflow-x-auto justify-start">
            <TabsTrigger value="performance" className="rounded-lg px-4 h-9 text-sm">
              <Activity className="w-4 h-4 mr-2" /> Performance
            </TabsTrigger>
            <TabsTrigger value="team" className="rounded-lg px-4 h-9 text-sm">
              <Users className="w-4 h-4 mr-2" /> Team
            </TabsTrigger>
            <TabsTrigger value="sources" className="rounded-lg px-4 h-9 text-sm">
              <Layers className="w-4 h-4 mr-2" /> Sources
            </TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-8">
                <Card className="border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm rounded-2xl overflow-hidden">
                  <CardHeader className="pb-2 pt-5 px-5 sm:px-6 flex flex-row items-center justify-between">
                    <CardTitle className="text-base sm:text-lg font-semibold tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
                      <Activity className="w-6 h-6 text-indigo-600" /> Pipeline Architecture
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 sm:px-6 pb-6">
                    <div className="h-[320px] mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={pipelineChartData} margin={{ top: 12, right: 12, left: 0, bottom: 6 }}>
                          <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                              <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.8} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.05} />
                          <XAxis dataKey="stage" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 800, fill: '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 800, fill: '#64748b' }} width={34} />
                          <Tooltip 
                            cursor={{fill: 'rgba(99, 102, 241, 0.03)'}}
                            contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', padding: '16px'}}
                          />
                          <Bar dataKey="count" fill="url(#barGradient)" radius={[12, 12, 4, 4]} barSize={45} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      {STATUS_ORDER.map((s) => (
                        <button
                          type="button"
                          className="group rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 text-left hover:border-indigo-300/60 dark:hover:border-indigo-700/60 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                          onClick={() => goLeads({ status: s, createdFrom: formatDayKey(range.from), createdTo: formatDayKey(range.to) })}
                        >
                          <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{s}</div>
                          <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{stats.byStatus[s]?.count || 0}</div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm rounded-2xl overflow-hidden">
                  <CardHeader className="pb-2 pt-5 px-5 sm:px-6 flex flex-row items-center justify-between">
                    <CardTitle className="text-base sm:text-lg font-semibold tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
                      <TrendingUp className="w-6 h-6 text-emerald-600" /> Conversion Trajectory
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 sm:px-6 pb-6">
                    <div className="h-[320px] mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={leadFlowData} margin={{ top: 12, right: 12, left: 0, bottom: 6 }}>
                          <defs>
                            <linearGradient id="fillNew" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="fillWon" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.05} />
                          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} width={34} />
                          <Tooltip 
                            contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', padding: '16px'}}
                          />
                          <Area type="monotone" dataKey="new" stroke="#6366f1" fill="url(#fillNew)" strokeWidth={5} />
                          <Area type="monotone" dataKey="won" stroke="#10b981" fill="url(#fillWon)" strokeWidth={5} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-5 space-y-8">
                <Card className="border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm rounded-2xl overflow-hidden">
                  <CardHeader className="pb-2 pt-5 px-5 sm:px-6">
                    <CardTitle className="text-base sm:text-lg font-semibold tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
                      <Zap className="w-6 h-6 text-amber-500" /> Follow-up Vitality
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 sm:px-6 pb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        type="button"
                        className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                        onClick={() => goLeads({ followup: "overdue", createdFrom: formatDayKey(range.from), createdTo: formatDayKey(range.to) })}
                      >
                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Overdue</div>
                        <div className="text-2xl font-bold text-rose-600">{remindersHealth.overdue}</div>
                      </button>
                      <button
                        type="button"
                        className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                        onClick={() => goLeads({ followup: "today", createdFrom: formatDayKey(range.from), createdTo: formatDayKey(range.to) })}
                      >
                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Due today</div>
                        <div className="text-2xl font-bold text-indigo-600">{remindersHealth.today}</div>
                      </button>
                      <button
                        type="button"
                        className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                        onClick={() => goLeads({ followup: "upcoming", createdFrom: formatDayKey(range.from), createdTo: formatDayKey(range.to) })}
                      >
                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Upcoming</div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">{remindersHealth.upcoming}</div>
                      </button>
                    </div>
                    <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                        <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        System overdue rate
                      </div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">{Math.round(remindersHealth.overduePct * 100)}%</div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-xl rounded-[2.5rem] overflow-hidden border-t border-white/50">
                  <CardHeader className="pb-3 pt-8 px-10">
                    <CardTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2 text-slate-900">
                      <TrendingUp className="w-6 h-6 text-indigo-600" /> Deal Indicators
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-10 pb-10 space-y-6">
                    {[
                      { label: "Win Probability", value: `${Math.round(stats.winRate * 100)}%`, color: "bg-indigo-500", icon: Target },
                      { label: "Pipeline Velocity", value: "14.2 Days", color: "bg-emerald-500", icon: Zap },
                      { label: "Expansion Potential", value: fmtMoney(stats.expected * 0.2, stats.symbol), color: "bg-amber-500", icon: ArrowUpRight },
                    ].map((indicator, i) => (
                      <div key={i} className="flex items-center justify-between p-5 rounded-3xl bg-slate-50/50 border border-slate-100 hover:border-indigo-100 transition-all">
                        <div className="flex items-center gap-4">
                          <div className={cn("p-2.5 rounded-xl text-white", indicator.color)}>
                            <indicator.icon className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-black uppercase tracking-widest text-slate-500">{indicator.label}</span>
                        </div>
                        <span className="text-xl font-black tracking-tighter text-slate-900">{indicator.value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="team" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8">
                {canViewTeamData && (
                  <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-xl rounded-[2.5rem] overflow-hidden border-t border-white/50">
                    <CardHeader className="pb-3 pt-8 px-10">
                      <CardTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2 text-slate-900">
                        <Users className="w-6 h-6 text-indigo-600" /> High Performance Units
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="font-black uppercase tracking-widest text-[10px] py-6 px-10 text-slate-400">Account Owner</TableHead>
                            <TableHead className="font-black uppercase tracking-widest text-[10px] py-6 px-6 text-right text-slate-400">Won</TableHead>
                            <TableHead className="font-black uppercase tracking-widest text-[10px] py-6 px-6 text-right text-slate-400">Win Rate</TableHead>
                            {canViewFinanceData && <TableHead className="font-black uppercase tracking-widest text-[10px] py-6 px-10 text-right text-slate-400">Value Contribution</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ownerPerf.length ? (
                            ownerPerf.map((r) => (
                              <TableRow key={r.ownerId} className="group hover:bg-indigo-500/[0.03] transition-all duration-300 border-b border-slate-50 last:border-0">
                                <TableCell className="py-6 px-10">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200">
                                      {r.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <button
                                      type="button"
                                      className="text-slate-900 font-black hover:text-indigo-600 transition-colors uppercase tracking-tight text-sm text-left"
                                      onClick={() => goLeads({ ownerId: r.ownerId === "Unassigned" ? "" : r.ownerId, createdFrom: formatDayKey(range.from), createdTo: formatDayKey(range.to) })}
                                    >
                                      {r.name}
                                    </button>
                                  </div>
                                </TableCell>
                                <TableCell className="py-6 px-6 text-right font-black text-slate-900">{r.won}</TableCell>
                                <TableCell className="py-6 px-6 text-right">
                                  <div className="flex items-center justify-end gap-3">
                                    <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.round(r.winRate * 100)}%` }} />
                                    </div>
                                    <span className="font-black text-indigo-600 text-sm">{Math.round(r.winRate * 100)}%</span>
                                  </div>
                                </TableCell>
                                {canViewFinanceData && <TableCell className="py-6 px-10 text-right font-black tabular-nums tracking-tighter text-slate-900">{fmtMoney(r.wonValue, stats.symbol)}</TableCell>}
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={canViewFinanceData ? 4 : 3} className="text-center py-20 text-slate-400 italic font-medium">
                                {loading ? "Calibrating team data..." : "No operational activity recorded"}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </div>
              <div className="lg:col-span-4">
                <Card className="border-0 shadow-2xl bg-slate-900 text-white rounded-[2.5rem] overflow-hidden">
                  <CardHeader className="pb-3 pt-8 px-10">
                    <CardTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                      <Target className="w-6 h-6 text-indigo-400" /> Active Registry
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-10 pb-10 space-y-6">
                    {latest.length ? (
                      latest.map((l) => (
                        <div key={l._id} className="group p-5 rounded-[1.5rem] bg-white/5 border border-white/5 hover:bg-white/10 transition-all duration-500 cursor-pointer" onClick={() => navigate(`/crm/leads/${l._id}`)}>
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-black text-sm uppercase tracking-tight truncate max-w-[150px]">{l.name}</div>
                            <Badge className="bg-indigo-500/20 text-indigo-300 border-0 text-[9px] font-black uppercase tracking-widest">{l.status}</Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{l.company || "Direct Individual"}</span>
                            <span className="text-[10px] font-black text-indigo-400">{fmtMoney(safeNumber(l.value), stats.symbol)}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-20 text-center text-white/30 font-bold italic uppercase tracking-widest text-xs">Registry Clean</div>
                    )}
                    <Button variant="outline" className="w-full bg-white/5 border-white/10 hover:bg-white/10 rounded-2xl h-14 font-black uppercase tracking-widest text-xs" onClick={() => navigate("/crm/leads")}>
                      View All Mandates
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sources" className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-xl rounded-[2.5rem] overflow-hidden border-t border-white/50">
                <CardHeader className="pb-3 pt-8 px-10">
                  <CardTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2 text-slate-900">
                    <Layers className="w-6 h-6 text-indigo-600" /> Source Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-10 pb-10">
                  <div className="space-y-6">
                    {sourcePerf.map((src, i) => (
                      <div key={i} className="space-y-3">
                        <div className="flex justify-between items-end">
                          <div className="space-y-1">
                            <div className="text-sm font-black uppercase tracking-tight text-slate-900">{src.source}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{src.total} Leads • {src.won} Won</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black text-indigo-600">{Math.round(src.conversionRate * 100)}%</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Yield</div>
                          </div>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${Math.round(src.conversionRate * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2 border-0 shadow-2xl bg-white/90 backdrop-blur-xl rounded-[2.5rem] overflow-hidden border-t border-white/50">
                <CardHeader className="pb-3 pt-8 px-10 flex flex-row items-center justify-between">
                  <CardTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2 text-slate-900">
                    <Target className="w-6 h-6 text-indigo-600" /> Lead Value by Source
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-10 pb-10">
                  <div className="h-[400px] mt-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sourcePerf} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.05} />
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                        <YAxis dataKey="source" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 800, fill: '#64748b' }} width={100} />
                        <Tooltip 
                          cursor={{fill: 'rgba(99, 102, 241, 0.03)'}}
                          contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', padding: '16px'}}
                        />
                        <Bar dataKey="wonValue" name="Value (Won)" fill="#6366f1" radius={[0, 12, 12, 0]} barSize={30} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <Card className="border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="py-5 px-5 sm:px-6 border-b border-slate-200/70 dark:border-slate-800">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base sm:text-lg font-semibold tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
                <Briefcase className="w-5 h-5 text-indigo-600" /> Active Lead Registry
              </CardTitle>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search mandates..." 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                    className="pl-11 w-full sm:w-80 h-12 rounded-xl border-2 bg-white/50 focus:ring-indigo-500" 
                  />
                </div>
                <Button variant="outline" onClick={load} disabled={loading} className="h-12 rounded-xl border-2 font-bold px-6">
                  {loading ? "..." : "REFRESH"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/50 border-b">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-black uppercase tracking-widest text-[10px] py-4 px-8 text-slate-400">Stakeholder</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] py-4 px-6 text-slate-400">Current Phase</TableHead>
                  {canViewFinanceData && <TableHead className="font-black uppercase tracking-widest text-[10px] py-4 px-6 text-slate-400 text-right">Face Value</TableHead>}
                  <TableHead className="font-black uppercase tracking-widest text-[10px] py-4 px-6 text-slate-400">Source</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] py-4 px-8 text-slate-400 text-right">Registered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latest.length ? (
                  latest.map((l) => (
                    <TableRow key={l._id} className="group hover:bg-indigo-500/[0.02] transition-colors border-b last:border-0">
                      <TableCell className="py-5 px-8">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{l.name}</span>
                          <span className="text-xs font-medium text-muted-foreground">{l.company}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-5 px-6">
                        <Badge 
                          className={cn(
                            "font-black text-[10px] px-2.5 py-0.5 uppercase tracking-wider border-0",
                            l.status === 'Won' ? 'bg-emerald-500/10 text-emerald-600' : 
                            l.status === 'Lost' ? 'bg-rose-500/10 text-rose-600' : 'bg-indigo-500/10 text-indigo-600'
                          )}
                          variant="outline"
                        >
                          {l.status}
                        </Badge>
                      </TableCell>
                      {canViewFinanceData && (
                        <TableCell className="py-5 px-6 text-right font-black tabular-nums tracking-tighter text-lg text-slate-900">
                          {fmtMoney(safeNumber(l.value), l.currencySymbol)}
                        </TableCell>
                      )}
                      <TableCell className="py-5 px-6 text-[10px] font-black uppercase text-muted-foreground/60">{l.source || "Organic"}</TableCell>
                      <TableCell className="py-5 px-8 text-right font-bold text-slate-400 tabular-nums">{formatDate(l.createdAt)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={canViewFinanceData ? 5 : 4} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-3 opacity-20">
                        <Target className="w-12 h-12" />
                        <p className="font-black uppercase tracking-[0.2em] text-xs text-slate-900">Registry Offline</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

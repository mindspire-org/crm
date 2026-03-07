import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, CalendarDays, Clock, FileSearch, Users, DollarSign, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

export default function HrmDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [attendanceMembers, setAttendanceMembers] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [commissionSummary, setCommissionSummary] = useState({
    totalEarned: 0,
    totalPaid: 0,
    totalPending: 0,
    pendingCount: 0,
    approvedCount: 0,
    paidCount: 0,
  });

  const todayIso = new Date().toISOString().slice(0, 10);
  const last7 = useMemo(() => {
    const out: string[] = [];
    const base = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      out.push(d.toISOString().slice(0, 10));
    }
    return out;
  }, []);

  const calcHours = (clockIn?: string, clockOut?: string) => {
    if (!clockIn || !clockOut) return 0;
    const a = new Date(clockIn).getTime();
    const b = new Date(clockOut).getTime();
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
    return (b - a) / 36e5;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const headers = getAuthHeaders();

        const [empRes, deptRes, memRes, leaveRes, commRes] = await Promise.all([
          fetch(`${API_BASE}/api/employees`, { headers }),
          fetch(`${API_BASE}/api/departments?active=`, { headers }),
          fetch(`${API_BASE}/api/attendance/members`, { headers }),
          fetch(`${API_BASE}/api/leaves`, { headers }),
          fetch(`${API_BASE}/api/commissions/my-commissions`, { headers }),
        ]);

        const empJson = empRes.ok ? await empRes.json().catch(() => []) : [];
        const deptJson = deptRes.ok ? await deptRes.json().catch(() => []) : [];
        const memJson = memRes.ok ? await memRes.json().catch(() => []) : [];
        const leaveJson = leaveRes.ok ? await leaveRes.json().catch(() => []) : [];
        const commJson = commRes.ok ? await commRes.json().catch(() => ({ commissions: [], summary: {} })) : { commissions: [], summary: {} };

        const to = todayIso;
        const from = last7[0] || todayIso;
        const recRes = await fetch(`${API_BASE}/api/attendance/records?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { headers });
        const recJson = recRes.ok ? await recRes.json().catch(() => []) : [];

        if (cancelled) return;
        setEmployees(Array.isArray(empJson) ? empJson : []);
        setDepartments(Array.isArray(deptJson) ? deptJson : []);
        setAttendanceMembers(Array.isArray(memJson) ? memJson : []);
        setLeaves(Array.isArray(leaveJson) ? leaveJson : []);
        setAttendanceRecords(Array.isArray(recJson) ? recJson : []);
        setCommissions(commJson.commissions || []);
        setCommissionSummary(commJson.summary || {
          totalEarned: 0, totalPaid: 0, totalPending: 0,
          pendingCount: 0, approvedCount: 0, paidCount: 0,
        });
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || "Failed to load HRM dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [last7, todayIso]);

  const tiles: Array<{
    title: string;
    description: string;
    href: string;
    icon: React.ElementType;
    variant?: "gradient" | "outline";
  }> = [
    {
      title: "Employees",
      description: "Manage employee profiles, roles, and onboarding.",
      href: "/hrm/employees",
      icon: Users,
      variant: "gradient",
    },
    {
      title: "Attendance",
      description: "Track clock-in/out and review time cards.",
      href: "/hrm/attendance",
      icon: Clock,
      variant: "outline",
    },
    {
      title: "Leave",
      description: "Leave applications, approvals, and leave history.",
      href: "/hrm/leaves",
      icon: CalendarDays,
      variant: "outline",
    },
    {
      title: "Payroll",
      description: "Run payroll, review payslips and payroll history.",
      href: "/hrm/payroll",
      icon: Building2,
      variant: "outline",
    },
    {
      title: "Departments",
      description: "Maintain departments and reporting structure.",
      href: "/hrm/departments",
      icon: Building2,
      variant: "outline",
    },
    {
      title: "Recruitment",
      description: "Jobs, candidates, interviews and hiring pipeline.",
      href: "/hrm/recruitment",
      icon: FileSearch,
      variant: "outline",
    },
  ];

  const totalEmployees = employees.length;
  const totalDepartments = useMemo(() => {
    const fromApi = Array.isArray(departments) ? departments.length : 0;
    if (fromApi) return fromApi;
    const set = new Set((employees || []).map((e: any) => String(e.department || "").trim()).filter(Boolean));
    return set.size;
  }, [departments, employees]);

  const clockedInCount = useMemo(() => {
    return (attendanceMembers || []).filter((m: any) => !!m.clockedIn).length;
  }, [attendanceMembers]);

  const pendingLeaves = useMemo(() => {
    return (leaves || []).filter((l: any) => String(l.status || "").toLowerCase() === "pending").length;
  }, [leaves]);

  const deptPie = useMemo(() => {
    const agg = new Map<string, number>();
    for (const e of employees || []) {
      const k = String(e.department || "Unassigned").trim() || "Unassigned";
      agg.set(k, (agg.get(k) || 0) + 1);
    }
    return Array.from(agg.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [employees]);

  const leaveStatusPie = useMemo(() => {
    const agg = new Map<string, number>();
    for (const l of leaves || []) {
      const k = String(l.status || "unknown").toLowerCase();
      agg.set(k, (agg.get(k) || 0) + 1);
    }
    const order = ["pending", "approved", "rejected", "unknown"];
    return Array.from(agg.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
  }, [leaves]);

  const hoursByDay = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const d of last7) byDate.set(d, 0);
    for (const r of attendanceRecords || []) {
      const date = r?.date ? new Date(r.date).toISOString().slice(0, 10) : "";
      if (!date || !byDate.has(date)) continue;
      const hours = calcHours(r.clockIn, r.clockOut);
      byDate.set(date, (byDate.get(date) || 0) + hours);
    }
    return last7.map((d) => ({ day: d.slice(5), hours: Number((byDate.get(d) || 0).toFixed(2)) }));
  }, [attendanceRecords, last7]);

  const COLORS = ["#2563eb", "#0891b2", "#10b981", "#f59e0b", "#6366f1", "#ef4444", "#0ea5e9", "#14b8a6"];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-sm text-muted-foreground">HRM</h1>
        <h2 className="text-2xl font-semibold mt-1">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Quick access to your HR workflows.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Employees</div>
            <div className="mt-1 flex items-center justify-between">
              <div className="text-2xl font-bold">{loading ? "…" : totalEmployees}</div>
              <Badge variant="secondary">Total</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Departments</div>
            <div className="mt-1 flex items-center justify-between">
              <div className="text-2xl font-bold">{loading ? "…" : totalDepartments}</div>
              <Badge variant="secondary">Active</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Clocked In</div>
            <div className="mt-1 flex items-center justify-between">
              <div className="text-2xl font-bold">{loading ? "…" : clockedInCount}</div>
              <Badge variant={clockedInCount ? "success" : "secondary"}>{todayIso}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Pending Leaves</div>
            <div className="mt-1 flex items-center justify-between">
              <div className="text-2xl font-bold">{loading ? "…" : pendingLeaves}</div>
              <Badge variant={pendingLeaves ? "warning" : "secondary"}>Review</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              My Commissions
            </div>
            <div className="mt-1 flex items-center justify-between">
              <div className="text-2xl font-bold">
                {loading ? "…" : commissionSummary.totalEarned.toLocaleString()}
              </div>
              <Badge variant={commissionSummary.totalPending > 0 ? "success" : "secondary"}>
                {commissionSummary.totalPending > 0 ? `${commissionSummary.totalPending.toLocaleString()} pending` : "No pending"}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {commissionSummary.approvedCount} approved • {commissionSummary.paidCount} paid
            </div>
          </CardContent>
        </Card>
      </div>

      {error ? (
        <Card>
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Card key={t.href} className="group hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <t.icon className="w-5 h-5 text-primary" />
                    <div className="font-semibold">{t.title}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">{t.description}</div>
                </div>
              </div>

              <div className="mt-4">
                <Button
                  size="sm"
                  variant={t.variant || "outline"}
                  onClick={() => navigate(t.href)}
                >
                  Open
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Employees by Department</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : deptPie.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={deptPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {deptPie.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-muted-foreground">No employee data found.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Attendance Hours (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hoursByDay} margin={{ left: 0, right: 8, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="hours" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Leave Requests Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : leaveStatusPie.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={leaveStatusPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {leaveStatusPie.map((_, i) => (
                      <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-muted-foreground">No leave records found.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Attendance Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hoursByDay} margin={{ left: 0, right: 8, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="hours" stroke="#0891b2" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

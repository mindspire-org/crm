import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  Target, 
  FolderKanban, 
  Clock, 
  MessageSquare, 
  Plus,
  Calendar,
  DollarSign,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  ArrowRight,
  UserPlus,
  Trophy,
  Wallet,
  Percent,
  ArrowDownCircle,
  Activity,
  Zap,
  LayoutDashboard
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface DashboardStats {
  totalLeads: number;
  activeLeads: number;
  assignedProjects: number;
  attendanceStatus: string;
  unreadMessages: number;
  leadsToday: number;
  leadsThisWeek: number;
  leadsThisMonth: number;
}

interface RecentLead {
  _id: string;
  clientName: string;
  status: string;
  source: string;
  createdAt: string;
}

interface RecentTask {
  _id: string;
  title: string;
  status: string;
  priority: string;
  deadline: string;
}

interface Announcement {
  _id: string;
  title: string;
  category: string;
  createdAt: string;
  read: boolean;
}

export default function MarketerDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    activeLeads: 0,
    assignedProjects: 0,
    attendanceStatus: "Not Clocked In",
    unreadMessages: 0,
    leadsToday: 0,
    leadsThisWeek: 0,
    leadsThisMonth: 0,
  });
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [performance, setPerformance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const refreshInFlight = useRef(false);

  // Chart Data State
  const [chartData, setChartData] = useState<any[]>([]);

  const loadDashboardData = async ({ initial = false }: { initial?: boolean } = {}) => {
    try {
      if (refreshInFlight.current) return;
      refreshInFlight.current = true;
      if (initial) setLoading(true);
      const headers = getAuthHeaders();
      
      // Load stats
      const [leadsRes, attendanceRes, convosRes, tasksRes, projectsRes, perfRes] = await Promise.all([
        fetch(`${API_BASE}/api/leads`, { headers }),
        fetch(`${API_BASE}/api/attendance/members`, { headers }),
        fetch(`${API_BASE}/api/messages/conversations`, { headers }),
        fetch(`${API_BASE}/api/tasks`, { headers }),
        fetch(`${API_BASE}/api/projects`, { headers }),
        fetch(`${API_BASE}/api/targets/my-performance`, { headers }),
      ]);

      const leadsData = await leadsRes.json().catch(() => []);
      const attendanceData = await attendanceRes.json().catch(() => []);
      const convosData = await convosRes.json().catch(() => []);
      const tasksData = await tasksRes.json().catch(() => []);
      const projectsData = await projectsRes.json().catch(() => []);
      const perfData = await perfRes.json().catch(() => null);

      if (perfRes.ok) setPerformance(perfData);

      // Generate Chart Data from real lead volume
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return {
          date: d.toLocaleDateString("en-US", { weekday: 'short' }),
          leads: leadsData.filter((l: any) => new Date(l.createdAt).toDateString() === d.toDateString()).length,
          sales: (Array.isArray(projectsData) ? projectsData : []).filter((p: any) => new Date(p.createdAt).toDateString() === d.toDateString()).length * 1000, // Mock sales scale
        };
      });
      setChartData(last7Days);

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const leadsToday = leadsData.filter((l: any) => new Date(l.createdAt) >= startOfDay).length;
      const leadsThisWeek = leadsData.filter((l: any) => new Date(l.createdAt) >= startOfWeek).length;
      const leadsThisMonth = leadsData.filter((l: any) => new Date(l.createdAt) >= startOfMonth).length;

      setStats({
        totalLeads: leadsData.length || 0,
        activeLeads: leadsData.filter((l: any) => !["converted", "lost"].includes(l.status)).length || 0,
        assignedProjects: (Array.isArray(projectsData) ? projectsData : []).length,
        attendanceStatus: attendanceData[0]?.clockedIn ? "Clocked In" : "Not Clocked In",
        unreadMessages: (Array.isArray(convosData) ? convosData : []).reduce((n: number, c: any) => n + (Number(c?.unreadCount) || 0), 0),
        leadsToday,
        leadsThisWeek,
        leadsThisMonth,
      });

      // Load recent leads
      setRecentLeads(leadsData.slice(0, 10).map((lead: any) => ({
        _id: lead._id,
        clientName: lead.name || lead.company || "Unknown",
        status: lead.status || "new",
        source: lead.source || "unknown",
        createdAt: lead.createdAt,
      })));

      // Load recent tasks
      setRecentTasks(
        (Array.isArray(tasksData) ? tasksData : [])
          .slice(0, 5)
          .map((t: any) => ({
            _id: t._id,
            title: t.title || "Untitled",
            status: t.status || "todo",
            priority: t.priority || "medium",
            deadline: t.deadline ? String(t.deadline) : "-",
          }))
      );

      // Load announcements (mock for now)
      setAnnouncements([
        { _id: "1", title: "New lead management system launched", category: "System Update", createdAt: "2025-12-22", read: false },
        { _id: "2", title: "Team meeting tomorrow at 10 AM", category: "General", createdAt: "2025-12-21", read: true },
      ]);

    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      if (initial) setLoading(false);
      refreshInFlight.current = false;
    }
  };

  useEffect(() => {
    loadDashboardData({ initial: true });

    const refresh = () => {
      if (document.hidden) return;
      loadDashboardData();
    };

    const onVis = () => {
      if (!document.hidden) refresh();
    };

    const t = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.clearInterval(t);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-blue-100 text-blue-800";
      case "contacted": return "bg-yellow-100 text-yellow-800";
      case "interested": return "bg-purple-100 text-purple-800";
      case "converted": return "bg-green-100 text-green-800";
      case "lost": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <div className="text-gray-500 animate-pulse font-medium">Preparing your dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-3 md:p-6 lg:p-12 text-slate-900 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      <div className="max-w-[1700px] mx-auto space-y-6 md:space-y-12">
        
        {/* Bold Futuristic Light Header - Responsive */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-slate-200 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-indigo-600/[0.03] blur-[80px] md:blur-[120px] rounded-full -mr-32 md:-mr-64 -mt-32 md:-mt-64 group-hover:bg-indigo-600/[0.05] transition-colors duration-700" />
          
          <div className="flex items-center gap-4 md:gap-6 relative z-10">
            <div className="w-14 h-14 md:w-20 md:h-20 bg-slate-900 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-2xl transform transition-transform group-hover:scale-105 duration-500 shrink-0">
              <LayoutDashboard className="w-7 h-7 md:w-10 md:h-10 text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <h1 className="text-2xl md:text-5xl font-black tracking-tighter text-slate-900 uppercase leading-none">
                  CORE<span className="text-indigo-600">_</span>HUB
                </h1>
                <div className="hidden sm:block h-6 w-[2px] bg-slate-200 mx-1 md:mx-2" />
                <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 font-black px-2 md:px-4 py-0.5 md:py-1 text-[9px] md:text-[11px] tracking-[0.1em] md:tracking-[0.2em] uppercase rounded-lg shadow-sm">Operational</Badge>
              </div>
              <p className="text-slate-400 font-black tracking-[0.2em] md:tracking-[0.3em] uppercase text-[8px] md:text-[10px] mt-2 md:mt-3">Performance Environment</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 relative z-10 w-full lg:w-auto">
            <div className="hidden xl:flex items-center gap-12 mr-10 px-10 border-x border-slate-100">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Network Status</p>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)] animate-pulse" />
                  <p className="text-sm font-black text-emerald-600 uppercase">Synchronized</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">System Load</p>
                <p className="text-sm font-black text-slate-700 uppercase">Nominal</p>
              </div>
            </div>
            <div className="flex items-center gap-3 md:gap-4 w-full sm:w-auto">
              <Button 
                variant="outline" 
                className="flex-1 sm:flex-none bg-white hover:bg-slate-50 border-slate-200 text-slate-600 font-black uppercase tracking-[0.1em] md:tracking-[0.2em] text-[10px] md:text-[11px] h-12 md:h-14 px-4 md:px-8 rounded-xl md:rounded-2xl transition-all shadow-sm"
                onClick={() => navigate("/performance/targets")}
              >
                Targets
              </Button>
              <Button 
                onClick={() => navigate("/crm/leads")}
                className="flex-1 sm:flex-none bg-slate-900 hover:bg-indigo-600 text-white font-black uppercase tracking-[0.1em] md:tracking-[0.2em] text-[10px] md:text-[11px] h-12 md:h-14 px-4 md:px-10 rounded-xl md:rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 md:gap-3 group/btn"
              >
                <UserPlus className="w-4 h-4 md:w-5 md:h-5 transition-transform group-hover/btn:scale-110" />
                Initialize
              </Button>
            </div>
          </div>
        </div>

        {/* High-Impact Light Stat Matrix - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
          {[
            { label: "Active Pipeline", value: stats.activeLeads, icon: Target, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
            { label: "Operational Nodes", value: stats.assignedProjects, icon: Zap, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
            { label: "Neural Signals", value: stats.unreadMessages, icon: MessageSquare, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100" },
            { label: "Auth Integrity", value: stats.attendanceStatus, icon: Activity, color: stats.attendanceStatus === "Clocked In" ? "text-emerald-600" : "text-rose-600", bg: stats.attendanceStatus === "Clocked In" ? "bg-emerald-50" : "bg-rose-50", border: stats.attendanceStatus === "Clocked In" ? "border-emerald-100" : "border-rose-100" },
          ].map((item, i) => (
            <div key={i} className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-slate-200 to-transparent rounded-[1.5rem] md:rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition duration-500" />
              <Card className="relative border border-slate-100 bg-white rounded-[1.5rem] md:rounded-[2.5rem] p-5 md:p-8 shadow-sm flex flex-col justify-between min-h-[160px] md:min-h-[220px] overflow-hidden group-hover:shadow-2xl transition-all duration-500">
                <div className={`absolute -right-8 -bottom-8 w-24 md:w-32 h-24 md:h-32 ${item.bg} blur-2xl md:blur-3xl rounded-full opacity-40 group-hover:opacity-60 transition-opacity`} />
                <div className="flex items-center justify-between relative z-10">
                  <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl ${item.bg} ${item.color} ${item.border} border shadow-sm transition-transform duration-500 group-hover:scale-110`}>
                    <item.icon className="w-5 h-5 md:w-7 md:h-7" />
                  </div>
                  <div className="w-8 md:w-12 h-[2px] bg-slate-100" />
                </div>
                <div className="mt-4 md:mt-8 relative z-10">
                  <p className="text-[9px] md:text-[11px] text-slate-400 font-black uppercase tracking-[0.2em] md:tracking-[0.3em]">{item.label}</p>
                  <p className="text-3xl md:text-5xl font-black text-slate-900 mt-1 md:mt-2 tracking-tighter">{item.value}</p>
                </div>
              </Card>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
          
          {/* Central Analytics Hub - Light - Responsive Chart */}
          <div className="lg:col-span-8 space-y-6 md:space-y-10">
            <Card className="border border-slate-100 bg-white rounded-[2rem] md:rounded-[3rem] shadow-sm p-5 md:p-10 relative overflow-hidden group hover:shadow-2xl transition-shadow duration-500">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-600 to-violet-600" />
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 md:mb-12 relative z-10">
                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                    Performance<br className="hidden md:block"/><span className="text-indigo-600"> Telemetry</span>
                  </h2>
                  <p className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.3em] mt-2 md:mt-4">Real-time Lead Acquisition Stream</p>
                </div>
                <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-xl md:rounded-2xl border border-slate-100 self-start md:self-center">
                  <div className="flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2 md:py-3 bg-white rounded-lg md:rounded-xl border border-slate-200 shadow-sm">
                    <div className="w-2 md:w-2.5 h-2 md:h-2.5 bg-indigo-600 rounded-full shadow-[0_0_10px_rgba(79,102,241,0.4)]" />
                    <span className="text-[8px] md:text-[10px] font-black text-slate-900 uppercase tracking-widest">Leads Volume</span>
                  </div>
                </div>
              </div>
              
              <div className="h-[250px] md:h-[400px] w-full mt-4 md:mt-6 relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(0,0,0,0.03)" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} 
                      dy={10}
                    />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 10px 20px rgba(0,0,0,0.1)', fontWeight: 900, fontSize: '10px', textTransform: 'uppercase' }}
                      itemStyle={{ color: '#1e293b' }}
                    />
                    <Area 
                      type="stepAfter" 
                      dataKey="leads" 
                      stroke="#4f46e5" 
                      strokeWidth={4}
                      fillOpacity={1} 
                      fill="url(#colorLeads)" 
                      animationDuration={2000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Achievement Grid - Light - Responsive Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
              {performance ? (
                <>
                  <Card className="border border-slate-100 bg-white rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-sm relative overflow-hidden group hover:bg-slate-900 hover:text-white transition-all duration-500 hover:shadow-2xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-white/5" />
                    <div className="flex flex-col h-full justify-between space-y-8 md:space-y-10 relative z-10">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.3em] group-hover:text-white/40">Lead Quota</p>
                        <Users className="w-5 h-5 text-indigo-600 group-hover:text-white" />
                      </div>
                      <div>
                        <p className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter group-hover:text-white">{performance.actual.leads}</p>
                        <p className="text-[9px] md:text-[10px] font-black text-slate-400 mt-2 md:mt-4 uppercase tracking-[0.2em] group-hover:text-white/30">Objective: {performance.target.leads || 0}</p>
                      </div>
                      <div className="space-y-3 md:space-y-4">
                        <Progress value={(performance.actual.leads / (performance.target.leads || 1)) * 100} className="h-1.5 md:h-2 bg-slate-50 group-hover:bg-white/10" />
                        <p className="text-[9px] md:text-[10px] font-black text-indigo-600 uppercase tracking-widest text-right group-hover:text-white">{Math.round((performance.actual.leads / (performance.target.leads || 1)) * 100)}%</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="border border-slate-100 bg-white rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-sm relative overflow-hidden group hover:bg-indigo-600 hover:text-white transition-all duration-500 hover:shadow-2xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-white/5" />
                    <div className="flex flex-col h-full justify-between space-y-8 md:space-y-10 relative z-10">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.3em] group-hover:text-white/40">Revenue Flow</p>
                        <DollarSign className="w-5 h-5 text-emerald-600 group-hover:text-white" />
                      </div>
                      <div>
                        <p className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter group-hover:text-white truncate">Rs.{performance.actual.sales.toLocaleString()}</p>
                        <p className="text-[9px] md:text-[10px] font-black text-slate-400 mt-2 md:mt-4 uppercase tracking-[0.2em] group-hover:text-white/30">Goal: Rs.{performance.target.sales?.toLocaleString() || 0}</p>
                      </div>
                      <div className="space-y-3 md:space-y-4">
                        <Progress value={(performance.actual.sales / (performance.target.sales || 1)) * 100} className="h-1.5 md:h-2 bg-slate-50 group-hover:bg-white/10" />
                        <p className="text-[9px] md:text-[10px] font-black text-emerald-600 uppercase tracking-widest text-right group-hover:text-white">{Math.round((performance.actual.sales / (performance.target.sales || 1)) * 100)}%</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="sm:col-span-2 xl:col-span-1 border border-slate-900 bg-slate-900 rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 blur-3xl rounded-full -mr-20 -mt-20 transition-transform duration-700 group-hover:scale-150" />
                    <div className="flex flex-col h-full justify-between space-y-8 md:space-y-10 relative z-10">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] md:text-[11px] font-black text-white/40 uppercase tracking-[0.2em] md:tracking-[0.3em]">Capital Yield</p>
                        <Trophy className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-3xl md:text-4xl font-black text-white tracking-tighter underline decoration-indigo-500 decoration-8 underline-offset-[12px] truncate">
                          Rs.{(performance.actual.sales * ((performance.target.commissionRate || 0) / 100) + (performance.target.bonus || 0) - (performance.target.deductions || 0)).toLocaleString()}
                        </p>
                        <div className="inline-flex items-center gap-2 md:gap-3 px-3 md:px-4 py-1.5 md:py-2 bg-white/10 text-white rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] mt-8 md:mt-10 border border-white/10">
                          <TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-400" /> Yield
                        </div>
                      </div>
                      <Button 
                        className="w-full bg-white text-slate-900 hover:bg-indigo-50 font-black uppercase tracking-widest text-[9px] h-12 md:h-14 rounded-xl md:rounded-2xl transition-all shadow-xl"
                        onClick={() => navigate("/performance/targets")}
                      >
                        Ledger
                      </Button>
                    </div>
                  </Card>
                </>
              ) : (
                <div className="col-span-1 sm:col-span-2 xl:col-span-3 h-[200px] md:h-[300px] flex items-center justify-center bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 text-slate-300 font-black uppercase tracking-[0.5em] text-xs shadow-sm">
                  Telemetry Offline
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar - Light Impact sidecar - Responsive Sidebar */}
          <div className="lg:col-span-4 space-y-6 md:space-y-10">
            
            {/* Intel Stream - Light - Responsive */}
            <Card className="border border-slate-100 bg-white rounded-[2rem] md:rounded-[3rem] shadow-sm p-6 md:p-10 relative overflow-hidden group hover:shadow-2xl transition-shadow duration-500">
              <div className="flex items-center justify-between mb-8 md:mb-10">
                <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Intelligence<br className="hidden md:block"/><span className="text-indigo-600"> Stream</span></h2>
                <div className="w-2.5 md:w-3 h-2.5 md:h-3 bg-indigo-600 rounded-full animate-ping shadow-[0_0_10px_rgba(79,102,241,0.4)]" />
              </div>
              <div className="space-y-4 md:space-y-6 relative z-10">
                {announcements.map((ann) => (
                  <div key={ann._id} className="p-4 md:p-6 rounded-2xl md:rounded-3xl bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:bg-white hover:shadow-xl transition-all duration-500 group cursor-pointer overflow-hidden relative">
                    <div className="flex flex-col space-y-3 md:space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] text-indigo-600 px-2 md:px-3 py-1 md:py-1.5 bg-indigo-50 rounded-lg">{ann.category}</span>
                        <p className="text-[8px] md:text-[10px] text-slate-400 font-black uppercase tracking-widest">{new Date(ann.createdAt).toLocaleDateString()}</p>
                      </div>
                      <p className="font-black text-sm md:text-base text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">{ann.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Neural Repository Preview - Light/Dark Contrast - Responsive */}
            <Card className="border border-slate-900 bg-slate-900 rounded-[2rem] md:rounded-[3rem] shadow-2xl p-6 md:p-10 overflow-hidden relative group">
              <div className="flex items-center justify-between mb-8 md:mb-10">
                <h2 className="text-xl md:text-2xl font-black text-white tracking-tighter uppercase leading-none">Recent<br className="hidden md:block"/><span className="text-indigo-400"> Activity</span></h2>
                <Button 
                  variant="ghost" 
                  className="text-white/40 hover:text-white hover:bg-transparent font-black uppercase tracking-widest text-[9px] px-0" 
                  onClick={() => navigate("/crm/leads")}
                >
                  Explore <ArrowRight className="w-4 h-4 ml-1 md:ml-2" />
                </Button>
              </div>

              <div className="space-y-4 md:space-y-6">
                {recentLeads.slice(0, 5).map((lead) => (
                  <div key={lead._id} className="flex items-center justify-between p-3 md:p-5 rounded-2xl md:rounded-3xl bg-white/[0.03] border border-white/5 hover:border-indigo-500/30 hover:bg-white/5 hover:shadow-2xl transition-all duration-500 group cursor-pointer">
                    <div className="flex items-center gap-3 md:gap-5">
                      <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white text-slate-900 flex items-center justify-center text-lg md:text-xl font-black transition-all group-hover:bg-indigo-500 group-hover:text-white shrink-0">
                        {lead.clientName[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-white uppercase tracking-tight text-xs md:text-sm group-hover:text-indigo-400 transition-colors truncate">{lead.clientName}</p>
                        <p className="text-[8px] md:text-[10px] text-white/30 font-black uppercase tracking-[0.1em] md:tracking-[0.2em] mt-0.5 md:mt-1 truncate">{lead.source}</p>
                      </div>
                    </div>
                    <div className={`w-2.5 md:w-3 h-2.5 md:h-3 rounded-full shrink-0 ${lead.status === 'new' ? 'bg-indigo-400 shadow-[0_0_15px_rgba(129,140,248,0.5)]' : 'bg-white/10'}`} />
                  </div>
                ))}
                {recentLeads.length === 0 && (
                  <div className="text-center py-12 md:py-16">
                    <Zap className="w-12 md:w-16 h-12 md:h-16 text-white/5 mx-auto mb-4 md:mb-6" />
                    <p className="text-[10px] md:text-[11px] text-white/20 font-black uppercase tracking-[0.3em] md:tracking-[0.4em]">Repository Offline</p>
                  </div>
                )}
              </div>
              
              <div className="mt-8 md:mt-10 pt-6 md:pt-8 border-t border-white/5">
                <Button 
                  className="w-full bg-white text-slate-900 hover:bg-indigo-50 font-black uppercase tracking-[0.1em] md:tracking-[0.2em] text-[10px] md:text-[11px] h-12 md:h-16 rounded-xl md:rounded-2xl transition-all shadow-2xl"
                  onClick={() => navigate("/crm/leads")}
                >
                  Deploy Repository
                </Button>
              </div>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}

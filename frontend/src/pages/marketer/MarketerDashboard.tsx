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
  UserPlus
} from "lucide-react";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { useNavigate } from "react-router-dom";

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
  const [loading, setLoading] = useState(true);
  const refreshInFlight = useRef(false);

  const loadDashboardData = async ({ initial = false }: { initial?: boolean } = {}) => {
    try {
      if (refreshInFlight.current) return;
      refreshInFlight.current = true;
      if (initial) setLoading(true);
      const headers = getAuthHeaders();
      
      // Load stats
      const [leadsRes, attendanceRes, convosRes, tasksRes, projectsRes] = await Promise.all([
        fetch(`${API_BASE}/api/leads`, { headers }),
        fetch(`${API_BASE}/api/attendance/members`, { headers }),
        fetch(`${API_BASE}/api/messages/conversations`, { headers }),
        fetch(`${API_BASE}/api/tasks`, { headers }),
        fetch(`${API_BASE}/api/projects`, { headers }),
      ]);

      const leadsData = await leadsRes.json().catch(() => []);
      const attendanceData = await attendanceRes.json().catch(() => []);
      const convosData = await convosRes.json().catch(() => []);
      const tasksData = await tasksRes.json().catch(() => []);
      const projectsData = await projectsRes.json().catch(() => []);

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
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-6 lg:p-8 text-gray-900">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">
              Marketer Dashboard
            </h1>
            <p className="text-gray-500 font-medium">Welcome back! Here's your performance overview.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => navigate("/crm/leads")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 px-6"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add New Lead
            </Button>
            <Button variant="outline" className="bg-white border-gray-200 hover:bg-gray-50 text-gray-700">
              View Reports
            </Button>
          </div>
        </div>

        {/* Performance Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white border-gray-200 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
              <BarChart3 className="w-24 h-24 text-gray-900" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-gray-500 font-semibold uppercase tracking-wider text-[10px]">Today's Leads</CardDescription>
              <CardTitle className="text-4xl font-bold flex items-baseline gap-2 text-gray-900">
                {stats.leadsToday}
                <span className="text-emerald-600 text-sm flex items-center">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  +12%
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={75} className="h-1.5 bg-gray-100" />
              <p className="mt-2 text-xs text-gray-400 italic">75% of daily goal achieved</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-24 h-24 text-gray-900" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-gray-500 font-semibold uppercase tracking-wider text-[10px]">Weekly Performance</CardDescription>
              <CardTitle className="text-4xl font-bold flex items-baseline gap-2 text-gray-900">
                {stats.leadsThisWeek}
                <span className="text-emerald-600 text-sm flex items-center">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  +5.2%
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={62} className="h-1.5 bg-gray-100" />
              <p className="mt-2 text-xs text-gray-400 italic">On track for weekly target</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
              <Calendar className="w-24 h-24 text-gray-900" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-gray-500 font-semibold uppercase tracking-wider text-[10px]">Monthly Total</CardDescription>
              <CardTitle className="text-4xl font-bold flex items-baseline gap-2 text-gray-900">
                {stats.leadsThisMonth}
                <span className="text-rose-600 text-sm flex items-center">
                  <TrendingDown className="w-4 h-4 mr-1" />
                  -2.1%
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={45} className="h-1.5 bg-gray-100" />
              <p className="mt-2 text-xs text-gray-400 italic">Focus on conversion required</p>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Active Leads", value: stats.activeLeads, icon: Target, color: "text-indigo-600", bg: "bg-indigo-50" },
            { label: "Assigned Projects", value: stats.assignedProjects, icon: FolderKanban, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Unread Messages", value: stats.unreadMessages, icon: MessageSquare, color: "text-sky-600", bg: "bg-sky-50" },
            { label: "Status", value: stats.attendanceStatus, icon: Clock, color: stats.attendanceStatus === "Clocked In" ? "text-emerald-600" : "text-rose-600", bg: stats.attendanceStatus === "Clocked In" ? "bg-emerald-50" : "bg-rose-50" },
          ].map((item, i) => (
            <Card key={i} className="bg-white border-gray-200 shadow-sm hover:border-indigo-200 transition-colors cursor-pointer group">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`p-2 rounded-xl ${item.bg} ${item.color} group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">{item.label}</p>
                  <p className="text-lg font-bold text-gray-900">{item.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Leads */}
          <Card className="lg:col-span-2 bg-white border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl text-gray-900">Recent Lead Activity</CardTitle>
                <CardDescription className="text-gray-500">Keep track of your latest acquisitions</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                View All <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentLeads.map((lead) => (
                  <div key={lead._id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                        {lead.clientName[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{lead.clientName}</p>
                        <p className="text-xs text-gray-500 uppercase tracking-tighter">{lead.source}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary" className="shadow-none capitalize bg-gray-100 text-gray-700 hover:bg-gray-200">
                        {lead.status}
                      </Badge>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400">
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {recentLeads.length === 0 && (
                  <div className="text-center py-12 space-y-3">
                    <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                      <Users className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-gray-400 font-medium">No recent leads found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Activity & Announcements */}
          <div className="space-y-6">
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl text-gray-900">Announcements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {announcements.map((ann) => (
                  <div key={ann._id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2 group cursor-pointer hover:bg-white hover:border-indigo-100 hover:shadow-sm transition-all">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="border-indigo-200 text-indigo-600 bg-indigo-50 text-[10px]">
                        {ann.category}
                      </Badge>
                      {!ann.read && <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(79,70,229,0.4)]" />}
                    </div>
                    <p className="font-semibold text-sm text-gray-800 group-hover:text-indigo-600 transition-colors">{ann.title}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">{new Date(ann.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100 shadow-sm">
              <CardContent className="p-6 space-y-4 text-center">
                <div className="bg-white shadow-sm w-12 h-12 rounded-2xl flex items-center justify-center mx-auto transform rotate-12 group-hover:rotate-0 transition-transform">
                  <TrendingUp className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-lg text-gray-900">Goal Progression</p>
                  <p className="text-xs text-gray-500">You are ahead of your monthly target by 14%!</p>
                </div>
                <Button className="w-full bg-indigo-600 text-white hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-600/20">
                  Analysis Details
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

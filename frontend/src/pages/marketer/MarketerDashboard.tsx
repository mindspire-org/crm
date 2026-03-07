import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  AlertCircle
} from "lucide-react";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";

interface DashboardStats {
  totalLeads: number;
  activeLeads: number;
  assignedProjects: number;
  attendanceStatus: string;
  unreadMessages: number;
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
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    activeLeads: 0,
    assignedProjects: 0,
    attendanceStatus: "Not Clocked In",
    unreadMessages: 0,
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

      setStats({
        totalLeads: leadsData.length || 0,
        activeLeads: leadsData.filter((l: any) => !["converted", "lost"].includes(l.status)).length || 0,
        assignedProjects: (Array.isArray(projectsData) ? projectsData : []).length,
        attendanceStatus: attendanceData[0]?.clockedIn ? "Clocked In" : "Not Clocked In",
        unreadMessages: (Array.isArray(convosData) ? convosData : []).reduce((n: number, c: any) => n + (Number(c?.unreadCount) || 0), 0),
      });

      // Load recent leads
      setRecentLeads(leadsData.slice(0, 5).map((lead: any) => ({
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Marketer Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your leads, track performance, and stay updated</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLeads}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeLeads} active leads
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assigned Projects</CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.assignedProjects}</div>
              <p className="text-xs text-muted-foreground">
                Active projects
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attendance</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.attendanceStatus}</div>
              <p className="text-xs text-muted-foreground">
                Today's status
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unreadMessages}</div>
              <p className="text-xs text-muted-foreground">
                New messages
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Leads */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Leads</CardTitle>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Lead
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentLeads.map((lead) => (
                  <div key={lead._id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{lead.clientName}</p>
                      <p className="text-sm text-muted-foreground">{lead.source}</p>
                    </div>
                    <Badge className={getStatusColor(lead.status)}>
                      {lead.status}
                    </Badge>
                  </div>
                ))}
                {recentLeads.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No recent leads</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Tasks */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTasks.map((task) => (
                  <div key={task._id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{task.title}</p>
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {task.deadline}
                      <Badge variant="outline">{task.status}</Badge>
                    </div>
                  </div>
                ))}
                {recentTasks.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No recent tasks</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Announcements */}
          <Card>
            <CardHeader>
              <CardTitle>Announcements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <div key={announcement._id} className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="font-medium">{announcement.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{announcement.category}</Badge>
                        <span>{new Date(announcement.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {!announcement.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                ))}
                {announcements.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No announcements</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

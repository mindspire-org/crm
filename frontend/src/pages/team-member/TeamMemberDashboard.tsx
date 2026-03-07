import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  CheckSquare, 
  FolderKanban, 
  MessageSquare, 
  Clock, 
  AlertCircle,
  Bell,
  Eye,
  Plus,
  FileText
} from "lucide-react";
import { getAuthHeaders } from "@/lib/api/auth";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "@/lib/api/base";
import { getCurrentUser, hasCrmPermission } from "@/utils/roleAccess";

// API base centralized via Vite env

interface DashboardStats {
  assignedTasks: number;
  activeProjects: number;
  openTickets: number;
  attendanceToday: boolean;
  payrollStatus: string;
}

interface AssignedProject {
  _id: string;
  title: string;
  client: string;
  status: string;
  deadline: string;
  progress: number;
}

interface AssignedTask {
  _id: string;
  title: string;
  status: string;
  priority: string;
  deadline: string;
  progress: number;
  projectTitle?: string;
}

interface Ticket {
  _id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  lastReply?: string;
}

interface Announcement {
  _id: string;
  title: string;
  category: string;
  createdAt: string;
  read: boolean;
}

interface MyFile {
  _id: string;
  name: string;
  size: number;
  path?: string;
  url?: string;
  createdAt: string;
}

interface MyNote {
  _id: string;
  title: string;
  text: string;
  createdAt: string;
}

interface PayrollRow {
  _id: string;
  period: string;
  basic: number;
  allowances: number;
  deductions: number;
  net: number;
  status: string;
}

export default function TeamMemberDashboard() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const isAdmin = user?.role === "admin";
  const isDeveloper = user?.role === "developer";
  const canViewTeamData = hasCrmPermission('team.view') || hasCrmPermission('team.manage');
  const [stats, setStats] = useState<DashboardStats>({
    assignedTasks: 0,
    activeProjects: 0,
    openTickets: 0,
    attendanceToday: false,
    payrollStatus: "Not Available",
  });
  const [projects, setProjects] = useState<AssignedProject[]>([]);
  const [tasks, setTasks] = useState<AssignedTask[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [meName, setMeName] = useState("Team Member");
  const [meEmail, setMeEmail] = useState("");
  const [meAvatar, setMeAvatar] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState<string>("");
  const [files, setFiles] = useState<MyFile[]>([]);
  const [fileUploading, setFileUploading] = useState(false);
  const [notes, setNotes] = useState<MyNote[]>([]);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteText, setNewNoteText] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<PayrollRow[]>([]);
  const [taskUpdates, setTaskUpdates] = useState<Record<string, { status: string; comment: string }>>({});
  const [openTaskId, setOpenTaskId] = useState<string>("");
  const [taskDetail, setTaskDetail] = useState<any>(null);
  const [taskDetailLoading, setTaskDetailLoading] = useState(false);
  const [checklistDraft, setChecklistDraft] = useState("");
  const [subTaskDraft, setSubTaskDraft] = useState("");
  const [commentDraft, setCommentDraft] = useState("");

  const loadDashboardData = async () => {
    try {
      const headers = getAuthHeaders();

      const meRes = await fetch(`${API_BASE}/api/users/me`, { headers });
      const meJson = await meRes.json().catch(() => null);
      const u = (meJson as any)?.user;
      if (meRes.ok && u) {
        setMeName(String(u?.name || u?.email || "Team Member"));
        setMeEmail(String(u?.email || ""));
        setMeAvatar(String(u?.avatar || ""));
      }

      // Load assigned projects and tasks
      const [projectsRes, tasksRes, ticketsRes, attendanceRes] = await Promise.all([
        fetch(`${API_BASE}/api/projects`, { headers }),
        fetch(`${API_BASE}/api/tasks`, { headers }),
        fetch(`${API_BASE}/api/tickets`, { headers }),
        fetch(`${API_BASE}/api/attendance/members`, { headers }),
      ]);

      const projectsData = await projectsRes.json().catch(() => []);
      const tasksData = await tasksRes.json().catch(() => []);
      const ticketsData = await ticketsRes.json().catch(() => []);
      const attendanceData = await attendanceRes.json().catch(() => []);

      setStats({
        assignedTasks: tasksData.length || 0,
        activeProjects: projectsData.length || 0,
        openTickets: ticketsData.filter((t: any) => t.status !== "closed").length || 0,
        attendanceToday: attendanceData[0]?.clockedIn || false,
        payrollStatus: "Available", // This would come from payroll API
      });

      // Determine employeeId for scoped resources
      const myEmpId = String(attendanceData?.[0]?.employeeId || "");
      setEmployeeId(myEmpId);

      // Load assigned projects
      setProjects(projectsData.map((project: any) => ({
        _id: project._id,
        title: project.title,
        client: project.client,
        status: project.status,
        deadline: project.deadline,
        progress: project.progress || 0,
      })));

      // Load assigned tasks
      setTasks(tasksData.map((task: any) => ({
        _id: task._id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        deadline: task.deadline,
        progress: task.progress || 0,
        projectTitle: task.projectId?.title,
      })));

      // Load assigned tickets
      setTickets(ticketsData.slice(0, 5).map((ticket: any) => ({
        _id: ticket._id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt,
        lastReply: ticket.lastReply,
      })));

      // Load announcements (read-only from API)
      try {
        const annRes = await fetch(`${API_BASE}/api/announcements?active=1`, { headers });
        const annData = await annRes.json().catch(() => []);
        const ann = Array.isArray(annData)
          ? annData.slice(0, 5).map((a: any) => ({
              _id: String(a._id),
              title: String(a.title || "Announcement"),
              category: a.isActive ? "Active" : "",
              createdAt: String(a.createdAt || new Date().toISOString()),
              read: false,
            }))
          : [];
        setAnnouncements(ann);
      } catch {}

      // Load files, notes, events and payroll scoped to user
      try {
        const [filesRes, notesRes, eventsRes, payrollRes] = await Promise.all([
          myEmpId ? fetch(`${API_BASE}/api/files?employeeId=${encodeURIComponent(myEmpId)}`, { headers }) : Promise.resolve({ json: async () => [] } as any),
          myEmpId ? fetch(`${API_BASE}/api/notes?employeeId=${encodeURIComponent(myEmpId)}`, { headers }) : Promise.resolve({ json: async () => [] } as any),
          fetch(`${API_BASE}/api/events`, { headers }),
          fetch(`${API_BASE}/api/payroll`, { headers }),
        ]);
        const filesData = await filesRes.json().catch(() => []);
        const notesData = await notesRes.json().catch(() => []);
        const eventsData = await eventsRes.json().catch(() => []);
        const payrollData = await payrollRes.json().catch(() => []);
        setFiles(Array.isArray(filesData) ? filesData : []);
        setNotes(Array.isArray(notesData) ? notesData : []);
        setEvents(Array.isArray(eventsData) ? eventsData : []);
        setPayroll(Array.isArray(payrollData) ? payrollData : (payrollData?.items || []));
      } catch {}

    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const openTask = async (id: string) => {
    setOpenTaskId(id);
    setTaskDetail(null);
    setTaskDetailLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/tasks/${id}`, { headers: getAuthHeaders() });
      if (r.ok) {
        const d = await r.json();
        setTaskDetail(d);
      }
    } catch {}
    setTaskDetailLoading(false);
  };

  const updateTask = async (id: string, patch: any) => {
    try {
      const r = await fetch(`${API_BASE}/api/tasks/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(patch),
      });
      if (r.ok) {
        const d = await r.json();
        setTaskDetail(d);
        await loadDashboardData();
        return true;
      }
    } catch {}
    return false;
  };

  const toggleChecklist = async (idx: number) => {
    if (!taskDetail) return;
    const next = [...(taskDetail.checklist || [])];
    next[idx] = { ...(next[idx] || {}), done: !next[idx]?.done };
    await updateTask(taskDetail._id, { checklist: next });
  };

  const addChecklist = async () => {
    const text = checklistDraft.trim();
    if (!taskDetail || !text) return;
    const next = [...(taskDetail.checklist || []), { text, done: false }];
    setChecklistDraft("");
    await updateTask(taskDetail._id, { checklist: next });
  };

  const toggleSubTask = async (idx: number) => {
    if (!taskDetail) return;
    const next = [...(taskDetail.subTasks || [])];
    next[idx] = { ...(next[idx] || {}), done: !next[idx]?.done };
    await updateTask(taskDetail._id, { subTasks: next });
  };

  const addSubTask = async () => {
    const title = subTaskDraft.trim();
    if (!taskDetail || !title) return;
    const next = [...(taskDetail.subTasks || []), { title, done: false }];
    setSubTaskDraft("");
    await updateTask(taskDetail._id, { subTasks: next });
  };

  const addComment = async () => {
    const msg = commentDraft.trim();
    if (!taskDetail || !msg) return;
    const next = [{ type: 'update', message: msg, authorName: meName }, ...(taskDetail.activity || [])];
    setCommentDraft("");
    await updateTask(taskDetail._id, { activity: next });
  };

  const meInitials = String(meName || meEmail || "TM")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-amber-100 text-amber-800 border-amber-200";
      case "in_progress": return "bg-blue-100 text-blue-800 border-blue-200";
      case "review": return "bg-purple-100 text-purple-800 border-purple-200";
      case "completed": return "bg-green-100 text-green-800 border-green-200";
      case "open": return "bg-blue-100 text-blue-800 border-blue-200";
      case "closed": return "bg-slate-100 text-slate-800 border-slate-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800 border-red-200";
      case "medium": return "bg-amber-100 text-amber-800 border-amber-200";
      case "low": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "bg-emerald-500";
    if (progress >= 50) return "bg-blue-500";
    if (progress >= 30) return "bg-amber-500";
    return "bg-rose-500";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
          <div className="text-lg font-medium text-slate-700">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Minimal Welcome Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Welcome back, {meName}!</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isDeveloper ? "Focus on your assigned work." : "Here's what's happening with your work today."}
          </p>
        </div>
        <Avatar className="h-12 w-12 border">
          <AvatarImage src={meAvatar ? `${API_BASE}${meAvatar}` : "/api/placeholder/64/64"} alt="Team Member" />
          <AvatarFallback className="bg-primary/10 text-primary font-medium">{meInitials}</AvatarFallback>
        </Avatar>
      </div>

      {/* Stats Overview - Cleaner Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assigned Tasks</p>
                <p className="text-2xl font-semibold mt-1">{stats.assignedTasks}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {tasks.filter(t => t.status === "completed").length} completed
                </p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <CheckSquare className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Projects</p>
                <p className="text-2xl font-semibold mt-1">{stats.activeProjects}</p>
                <p className="text-xs text-muted-foreground mt-1">Assigned to you</p>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <FolderKanban className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Open Tickets</p>
                <p className="text-2xl font-semibold mt-1">{stats.openTickets}</p>
                <p className="text-xs text-muted-foreground mt-1">Need attention</p>
              </div>
              <div className="p-2 bg-orange-50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Attendance</p>
                <p className="text-2xl font-semibold mt-1">
                  {stats.attendanceToday ? "In" : "Out"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Today's status</p>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

        {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Assigned Projects - Professional Layout */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <div>
                <CardTitle className="text-base font-semibold">Assigned Projects</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{projects.length} active project{projects.length !== 1 ? 's' : ''}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
                View All
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {projects.slice(0, isDeveloper ? 3 : 5).map((project) => (
                  <div key={project._id} className="group flex items-center gap-4 p-3 rounded-lg border hover:border-primary/30 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <FolderKanban className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{project.title}</p>
                        {(() => {
                          const first = String(project.labels || "")
                            .split(",")
                            .map((x) => x.trim())
                            .filter(Boolean)[0];
                          return first ? (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                              {first}
                            </Badge>
                          ) : null;
                        })()}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{project.client}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex-1">
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                            <span>Progress</span>
                            <span>{project.progress}%</span>
                          </div>
                          <Progress value={project.progress} className="h-1.5" />
                        </div>
                        <Badge variant="outline" className="text-[10px] h-5 px-2">
                          {project.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
                {projects.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FolderKanban className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No assigned projects</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Assigned Tasks - Professional Layout */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <div>
                <CardTitle className="text-base font-semibold">Assigned Tasks</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{tasks.filter(t => t.status !== 'done').length} pending</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>
                View All
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {tasks.slice(0, isDeveloper ? 5 : 8).map((task) => (
                  <div key={task._id} className="group flex items-center gap-3 p-3 rounded-lg border hover:border-primary/30 transition-colors">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: 
                      task.priority === 'high' ? '#ef4444' : 
                      task.priority === 'medium' ? '#f59e0b' : '#10b981' 
                    }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      {task.projectTitle && (
                        <p className="text-xs text-muted-foreground truncate">{task.projectTitle}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 capitalize">
                        {task.status}
                      </Badge>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openTask(task._id)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No assigned tasks</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - 1 column */}
        <div className="space-y-6">
          {/* Open Tickets - Compact Professional */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-sm font-semibold">Open Tickets</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate('/tickets')}>
                View All
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {tickets.slice(0, 4).map((ticket) => (
                  <div key={ticket._id} className="flex items-center gap-3 p-2.5 rounded-md border hover:bg-muted/50 transition-colors">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: 
                      ticket.priority === 'high' ? '#ef4444' : 
                      ticket.priority === 'medium' ? '#f59e0b' : '#10b981' 
                    }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ticket.subject}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 capitalize">
                      {ticket.status}
                    </Badge>
                  </div>
                ))}
                {tickets.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No assigned tickets</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Announcements - Compact */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-sm font-semibold">Announcements</CardTitle>
              <Badge variant="secondary" className="text-[10px] h-5">{announcements.filter(a => !a.read).length} new</Badge>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {announcements.slice(0, 3).map((announcement) => (
                  <div key={announcement._id} className="flex items-start gap-2 p-2.5 rounded-md border hover:bg-muted/50 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{announcement.title}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(announcement.createdAt).toLocaleDateString()}</p>
                    </div>
                    {!announcement.read && (
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                ))}
                {announcements.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No announcements</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Events (read-only) - Hidden for developers */}
          {!isDeveloper && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {events.slice(0,5).map((ev: any) => (
                    <div key={ev._id} className="p-3 border rounded-lg">
                      <p className="font-medium text-sm">{ev.title}</p>
                      <p className="text-xs text-muted-foreground">{ev.date ? new Date(ev.date).toLocaleString() : ''}</p>
                    </div>
                  ))}
                  {events.length === 0 && (
                    <div className="text-center py-6 text-sm text-muted-foreground">No events</div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payroll (read-only) - Hidden for developers */}
          {!isDeveloper && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Payroll</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  {payroll.slice(0,3).map((p) => (
                    <div key={p._id} className="p-3 border rounded-lg flex items-center justify-between">
                      <div>
                        <p className="font-medium">{p.period}</p>
                        <p className="text-xs text-muted-foreground">Net: {p.net} | Deductions: {p.deductions}</p>
                      </div>
                      <Badge variant="outline">{p.status}</Badge>
                    </div>
                  ))}
                  {payroll.length === 0 && (
                    <div className="text-center py-6 text-sm text-muted-foreground">No payroll data</div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* My Files - Compact for developers */}
          <Card className={isDeveloper ? "border-0 shadow-none bg-transparent" : ""}>
            <CardHeader className={isDeveloper ? "px-0 py-2" : ""}>
              <CardTitle className={isDeveloper ? "text-sm font-medium" : "text-lg"}>My Files</CardTitle>
            </CardHeader>
            <CardContent className={isDeveloper ? "px-0" : ""}>
              <div className={isDeveloper ? "flex items-center gap-2" : "flex items-center justify-between"}>
                {!isDeveloper && <div className="text-sm text-muted-foreground">Manage your project files</div>}
                <Button size="sm" variant={isDeveloper ? "outline" : "default"} className={isDeveloper ? "w-full" : ""} onClick={() => navigate('/files')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Open Files
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* My Notes - Compact for developers */}
          <Card className={isDeveloper ? "border-0 shadow-none bg-transparent" : ""}>
            <CardHeader className={isDeveloper ? "px-0 py-2" : ""}>
              <CardTitle className={isDeveloper ? "text-sm font-medium" : "text-lg"}>My Notes</CardTitle>
            </CardHeader>
            <CardContent className={isDeveloper ? "px-0" : ""}>
              <div className={isDeveloper ? "flex items-center gap-2" : "flex items-center justify-between"}>
                {!isDeveloper && <div className="text-sm text-muted-foreground">Create and manage notes</div>}
                <Button size="sm" variant={isDeveloper ? "outline" : "default"} className={isDeveloper ? "w-full" : ""} onClick={() => navigate('/notes')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Open Notes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions - Simplified for developers */}
          <Card>
            <CardHeader className={isDeveloper ? "pb-2" : ""}>
              <CardTitle className={isDeveloper ? "text-sm font-medium" : "text-lg"}>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className={isDeveloper ? "pt-0" : "space-y-3"}>
              {isDeveloper ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button className="w-full justify-center" variant="outline" size="sm" onClick={() => navigate('/files')}>
                    <FileText className="w-4 h-4 mr-1" />
                    Files
                  </Button>
                  <Button className="w-full justify-center" variant="outline" size="sm" onClick={() => navigate('/notes')}>
                    <FileText className="w-4 h-4 mr-1" />
                    Notes
                  </Button>
                  <Button className="w-full justify-center" variant="outline" size="sm" onClick={() => navigate('/messages')}>
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Message
                  </Button>
                  <Button className="w-full justify-center" variant="outline" size="sm" onClick={() => navigate('/hrm/attendance')}>
                    <Clock className="w-4 h-4 mr-1" />
                    Attendance
                  </Button>
                </div>
              ) : (
                <>
                  <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/files')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Open Files
                  </Button>
                  <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/notes')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Open Notes
                  </Button>
                  <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/messages')}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                  {isAdmin ? (
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={async () => {
                        if (!employeeId) return;
                        const headers = getAuthHeaders({ 'Content-Type': 'application/json' });
                        if (stats.attendanceToday) {
                          await fetch(`${API_BASE}/api/attendance/clock-out`, { method: 'POST', headers, body: JSON.stringify({ employeeId }) });
                        } else {
                          await fetch(`${API_BASE}/api/attendance/clock-in`, { method: 'POST', headers, body: JSON.stringify({ employeeId }) });
                        }
                        await loadDashboardData();
                      }}
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      {stats.attendanceToday ? 'Clock Out' : 'Clock In'}
                    </Button>
                  ) : null}
                  <div className="grid grid-cols-1 gap-2">
                    {!isDeveloper && (
                      <Button className="w-full justify-start" variant="outline" onClick={() => employeeId && navigate(`/hrm/employees/${employeeId}`)} disabled={!employeeId}>
                        <Eye className="w-4 h-4 mr-2" />
                        My Profile
                      </Button>
                    )}
                    <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/hrm/attendance')}>
                      <Clock className="w-4 h-4 mr-2" />
                      My Attendance
                    </Button>
                    {!isDeveloper && (
                      <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/hrm/leaves')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Apply Leave
                      </Button>
                    )}
                    {!isDeveloper && (
                      <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/hrm/payroll')}>
                        <FileText className="w-4 h-4 mr-2" />
                        View Payroll
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      {/* ClickUp-like Task Dialog */}
      <Dialog open={!!openTaskId} onOpenChange={(v) => { if (!v) { setOpenTaskId(""); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Task details</DialogTitle>
          </DialogHeader>
          {taskDetailLoading ? (
            <div className="py-6 text-sm text-muted-foreground">Loading...</div>
          ) : taskDetail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Title</div>
                  <Input value={taskDetail.title || ''} onChange={(e) => setTaskDetail((p: any) => ({ ...p, title: e.target.value }))} onBlur={() => updateTask(taskDetail._id, { title: String(taskDetail.title || '') })} />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Status</div>
                  <select
                    className="w-full h-9 border rounded px-2"
                    value={taskDetail.status || 'todo'}
                    onChange={async (e) => {
                      const v = e.target.value;
                      setTaskDetail((p: any) => ({ ...p, status: v }));
                      await updateTask(taskDetail._id, { status: v });
                    }}
                  >
                    {['backlog','todo','in-progress','review','done'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Priority</div>
                  <select
                    className="w-full h-9 border rounded px-2"
                    value={taskDetail.priority || 'medium'}
                    onChange={async (e) => {
                      const v = e.target.value;
                      setTaskDetail((p: any) => ({ ...p, priority: v }));
                      await updateTask(taskDetail._id, { priority: v });
                    }}
                  >
                    {['low','medium','high','urgent'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Checklist</div>
                <div className="space-y-2">
                  {(taskDetail.checklist || []).map((it: any, idx: number) => (
                    <label key={idx} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={!!it.done} onChange={() => toggleChecklist(idx)} />
                      <span className={cn(it.done && 'line-through text-muted-foreground')}>{it.text || ''}</span>
                    </label>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input placeholder="Add checklist item" value={checklistDraft} onChange={(e) => setChecklistDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void addChecklist(); } }} />
                    <Button size="sm" onClick={addChecklist}>Add</Button>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Subtasks</div>
                <div className="space-y-2">
                  {(taskDetail.subTasks || []).map((it: any, idx: number) => (
                    <label key={idx} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={!!it.done} onChange={() => toggleSubTask(idx)} />
                      <span className={cn(it.done && 'line-through text-muted-foreground')}>{it.title || ''}</span>
                    </label>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input placeholder="Add subtask" value={subTaskDraft} onChange={(e) => setSubTaskDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void addSubTask(); } }} />
                    <Button size="sm" onClick={addSubTask}>Add</Button>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Activity</div>
                <div className="space-y-2 max-h-48 overflow-auto border rounded p-2 bg-muted/30">
                  {(taskDetail.activity || []).map((a: any, i: number) => (
                    <div key={i} className="text-xs">
                      <span className="font-medium">{a.authorName || 'Member'}</span>
                      <span className="text-muted-foreground">: {a.message || a.type}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Textarea rows={2} placeholder="Add an update..." value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} />
                  <Button size="sm" onClick={addComment}>Post</Button>
                </div>
              </div>

          </div>
          ) : (
            <div className="py-6 text-sm text-muted-foreground">No task loaded</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenTaskId("")}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

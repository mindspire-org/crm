import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  TrendingUp, 
  Activity, 
  Zap, 
  Star, 
  Target, 
  BarChart3, 
  Calendar, 
  Search, 
  Filter, 
  RefreshCw, 
  Eye, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  Briefcase, 
  Timer,
  Plus,
  ArrowRight,
  Ticket,
  ChevronRight,
  UserCheck,
  AlertTriangle,
  ShieldCheck
} from "lucide-react";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { getCurrentUser } from "@/utils/roleAccess";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid
} from "recharts";

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  teamSize: number;
  openTickets: number;
  criticalTasks: number;
}

interface ProjectOverview {
  _id: string;
  title: string;
  status: string;
  progress: number;
  deadline?: string;
  teamCount: number;
}

interface TeamWorkload {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  activeTasks: number;
  completedTasks: number;
  efficiency: number;
  loadStatus: 'low' | 'ideal' | 'high';
}

interface CriticalItem {
  id: string;
  type: 'task' | 'project' | 'ticket';
  title: string;
  reason: string;
  priority: string;
  deadline?: string;
}

export default function ProjectManagerDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    teamSize: 0,
    openTickets: 0,
    criticalTasks: 0
  });
  const [projects, setProjects] = useState<ProjectOverview[]>([]);
  const [team, setTeam] = useState<TeamWorkload[]>([]);
  const [criticalItems, setCriticalItems] = useState<CriticalItem[]>([]);
  const [recentTickets, setRecentTickets] = useState<any[]>([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const headers = getAuthHeaders();
        const [projectsRes, tasksRes, employeesRes, ticketsRes] = await Promise.all([
          fetch(`${API_BASE}/api/projects`, { headers }),
          fetch(`${API_BASE}/api/tasks`, { headers }),
          fetch(`${API_BASE}/api/employees`, { headers }),
          fetch(`${API_BASE}/api/tickets`, { headers })
        ]);

        let projectList: any[] = [];
        let taskList: any[] = [];
        let employeeList: any[] = [];
        let ticketList: any[] = [];

        if (projectsRes.ok) projectList = await projectsRes.json();
        if (tasksRes.ok) taskList = await tasksRes.json();
        if (employeesRes.ok) employeeList = await employeesRes.json();
        if (ticketsRes.ok) ticketList = await ticketsRes.json();

        // Calculate Stats
        const now = new Date();
        const activeProjects = projectList.filter(p => p.status === 'In Progress' || p.status === 'Open');
        const overdueTasks = taskList.filter(t => t.deadline && new Date(t.deadline) < now && t.status !== 'done');
        const criticalTasks = taskList.filter(t => t.priority === 'urgent' || t.priority === 'high');
        const openTickets = ticketList.filter(t => t.status === 'open' || t.status === 'pending');

        setStats({
          totalProjects: projectList.length,
          activeProjects: activeProjects.length,
          totalTasks: taskList.length,
          completedTasks: taskList.filter(t => t.status === 'done').length,
          overdueTasks: overdueTasks.length,
          teamSize: employeeList.length,
          openTickets: openTickets.length,
          criticalTasks: criticalTasks.length
        });

        // Set Projects
        setProjects(projectList.slice(0, 5).map(p => ({
          _id: p._id,
          title: p.title,
          status: p.status,
          progress: p.progress || 0,
          deadline: p.deadline,
          teamCount: p.teamSize || 0
        })));

        // Set Team Workload
        const teamData: TeamWorkload[] = employeeList.slice(0, 6).map(emp => {
          const empTasks = taskList.filter(t => t.assignees?.some((a: any) => a.id === emp._id || a.name === (emp.name || `${emp.firstName} ${emp.lastName}`)));
          const completed = empTasks.filter(t => t.status === 'done').length;
          const active = empTasks.length - completed;
          
          let loadStatus: 'low' | 'ideal' | 'high' = 'ideal';
          if (active <= 1) loadStatus = 'low';
          else if (active >= 5) loadStatus = 'high';

          return {
            id: emp._id,
            name: emp.name || `${emp.firstName} ${emp.lastName}`,
            role: emp.role || emp.designation || 'Team Member',
            avatar: emp.avatar,
            activeTasks: active,
            completedTasks: completed,
            efficiency: empTasks.length > 0 ? Math.round((completed / empTasks.length) * 100) : 0,
            loadStatus
          };
        });
        setTeam(teamData);

        // Set Critical Items
        const items: CriticalItem[] = [];
        
        // Overdue tasks first
        overdueTasks.slice(0, 3).forEach(t => {
          items.push({
            id: t._id,
            type: 'task',
            title: t.title,
            reason: 'Overdue Task',
            priority: t.priority,
            deadline: t.deadline
          });
        });

        // Projects due soon (within 3 days)
        const in3Days = new Date();
        in3Days.setDate(now.getDate() + 3);
        projectList.filter(p => p.deadline && new Date(p.deadline) <= in3Days && p.status !== 'Completed').forEach(p => {
          items.push({
            id: p._id,
            type: 'project',
            title: p.title,
            reason: 'Approaching Deadline',
            priority: 'high',
            deadline: p.deadline
          });
        });

        // Urgent tickets
        ticketList.filter(t => t.priority === 'urgent' && (t.status === 'open' || t.status === 'pending')).forEach(t => {
          items.push({
            id: t._id,
            type: 'ticket',
            title: t.subject || t.title || 'Support Ticket',
            reason: 'Urgent Ticket',
            priority: 'urgent'
          });
        });

        setCriticalItems(items.slice(0, 6));
        setRecentTickets(ticketList.slice(0, 5));

      } catch (error) {
        console.error("Error loading PM dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const workloadChartData = useMemo(() => {
    return team.map(m => ({
      name: m.name.split(' ')[0],
      active: m.activeTasks,
      completed: m.completedTasks
    }));
  }, [team]);

  if (loading) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="w-10 h-10 animate-spin text-indigo-600 mx-auto" />
          <p className="text-muted-foreground font-medium animate-pulse">Initializing PM Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Dynamic Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.2' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3C/g%3E%3C/svg%3E")` }} />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 font-bold uppercase tracking-widest text-xs">
              <ShieldCheck className="w-4 h-4" />
              Project Manager Portal
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Team & Project Control</h1>
            <p className="text-indigo-100/70 max-w-lg">
              Manage your team's performance, track project milestones, and resolve critical bottlenecks from one central hub.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate('/projects')} className="bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-md rounded-2xl px-6">
              <Briefcase className="w-4 h-4 mr-2" />
              All Projects
            </Button>
            <Button onClick={() => navigate('/tasks')} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30 rounded-2xl px-6 border-none">
              <Plus className="w-4 h-4 mr-2" />
              Assign Duty
            </Button>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Active Projects" 
          value={stats.activeProjects} 
          subtitle={`${stats.totalProjects} total projects`}
          icon={Briefcase}
          color="indigo"
        />
        <StatCard 
          title="Team Progress" 
          value={`${Math.round((stats.completedTasks / Math.max(stats.totalTasks, 1)) * 100)}%`} 
          subtitle={`${stats.completedTasks} tasks done`}
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard 
          title="Open Tickets" 
          value={stats.openTickets} 
          subtitle="Customer support"
          icon={Ticket}
          color="amber"
        />
        <StatCard 
          title="Critical Alerts" 
          value={stats.overdueTasks + stats.openTickets} 
          subtitle="Needs attention"
          icon={AlertTriangle}
          color="rose"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Urgent & Critical Things */}
        <Card className="lg:col-span-2 border-none shadow-xl bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 overflow-hidden rounded-3xl">
          <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-800/50 py-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Zap className="w-6 h-6 text-rose-500 fill-rose-500/20" />
                Critical Alarm & Urgent Actions
              </CardTitle>
              <Badge variant="destructive" className="animate-pulse">Action Required</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {criticalItems.length > 0 ? (
                criticalItems.map((item) => (
                  <div key={item.id} className="p-5 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <div className={cn(
                      "p-3 rounded-2xl shrink-0",
                      item.type === 'task' ? "bg-rose-100 text-rose-600" : 
                      item.type === 'project' ? "bg-amber-100 text-amber-600" : 
                      "bg-indigo-100 text-indigo-600"
                    )}>
                      {item.type === 'task' ? <Clock className="w-5 h-5" /> : 
                       item.type === 'project' ? <Calendar className="w-5 h-5" /> : 
                       <Ticket className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-slate-900 dark:text-white truncate">{item.title}</p>
                        <Badge variant="outline" className="text-[10px] uppercase font-black tracking-tighter">{item.priority}</Badge>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <span className="font-semibold text-rose-500">{item.reason}</span>
                        {item.deadline && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span>Due: {new Date(item.deadline).toLocaleDateString()}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => {
                      if (item.type === 'task') navigate(`/tasks/${item.id}`);
                      if (item.type === 'project') navigate(`/projects/overview/${item.id}`);
                      if (item.type === 'ticket') navigate(`/tickets`);
                    }}>
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="p-20 text-center space-y-4">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold">All Clear!</h3>
                    <p className="text-muted-foreground text-sm">No critical items detected at the moment.</p>
                  </div>
                </div>
              )}
            </div>
            {criticalItems.length > 0 && (
              <div className="p-4 border-t bg-slate-50/30 text-center">
                <Button variant="link" className="text-indigo-600 font-bold" onClick={() => navigate('/tasks')}>
                  View All Tasks & Bottlenecks
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Workload & AI Assistance */}
        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 rounded-3xl overflow-hidden">
          <CardHeader className="py-5 flex flex-row items-center justify-between border-b bg-slate-50/30">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-indigo-600" />
              Team Workload
            </CardTitle>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-100 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">
              <Zap className="w-3 h-3 fill-current" /> AI Analysis
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* AI Insights Section */}
            <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/10 border-b">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/20">
                  <Star className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200">AI Resource Assistant</p>
                  <p className="text-[11px] leading-relaxed text-indigo-700/80 dark:text-indigo-300/80">
                    {(() => {
                      const overloaded = team.filter(t => t.loadStatus === 'high');
                      const available = team.filter(t => t.loadStatus === 'low');
                      if (overloaded.length > 0 && available.length > 0) {
                        return `${overloaded[0].name} is currently overloaded with ${overloaded[0].activeTasks} tasks. Consider reassigning to ${available[0].name} who has high availability.`;
                      } else if (overloaded.length > 0) {
                        return `${overloaded[0].name} has a critical load. We suggest reviewing their active tasks to prevent burnout.`;
                      } else if (available.length > 0) {
                        return `${available[0].name} has low load and is ready for new assignments. Ideal for upcoming milestones.`;
                      }
                      return "Team workload is currently balanced. Efficiency remains stable across all active projects.";
                    })()}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workloadChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                    <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="active" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} barSize={20} />
                    <Bar dataKey="completed" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="space-y-5">
                {team.map((member) => (
                  <div key={member.id} className="group/member space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="relative">
                          <Avatar className="h-9 w-9 border-2 border-white dark:border-slate-800 shadow-sm">
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback className="text-xs bg-indigo-100 text-indigo-600 font-bold">{member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className={cn(
                            "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800",
                            member.loadStatus === 'low' ? "bg-emerald-500" : 
                            member.loadStatus === 'high' ? "bg-rose-500" : "bg-blue-500"
                          )} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{member.name}</p>
                          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">{member.role}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge className={cn(
                          "text-[9px] font-black px-2 py-0.5 border-none",
                          member.loadStatus === 'low' ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : 
                          member.loadStatus === 'high' ? "bg-rose-100 text-rose-700 hover:bg-rose-100" : 
                          "bg-blue-100 text-blue-700 hover:bg-blue-100"
                        )}>
                          {member.loadStatus.toUpperCase()} LOAD
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 rounded-full opacity-0 group-hover/member:opacity-100 transition-all hover:bg-indigo-50 hover:text-indigo-600"
                          onClick={() => member.loadStatus === 'low' ? navigate('/tasks') : navigate('/tasks')}
                        >
                          {member.loadStatus === 'low' ? <Plus className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400">
                          <span>Progress Efficiency</span>
                          <span>{member.efficiency}%</span>
                        </div>
                        <Progress value={member.efficiency} className="h-1.5" />
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-black text-slate-900 dark:text-white">{member.activeTasks}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Tasks</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button 
                className="w-full bg-slate-900 hover:bg-black text-white font-bold rounded-2xl h-11 border-none shadow-lg shadow-slate-200 dark:shadow-none transition-all hover:scale-[1.02]" 
                onClick={() => navigate('/hrm/employees')}
              >
                <Users className="w-4 h-4 mr-2" /> Manage Full Team Load
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Project Tracking */}
        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 rounded-3xl overflow-hidden">
          <CardHeader className="py-5 border-b bg-slate-50/50 dark:bg-slate-800/50">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-emerald-500" />
              Project Milestones & Tracking
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {projects.map((p) => (
                <div key={p._id} className="p-6 space-y-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="font-bold text-lg">{p.title}</h4>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100">{p.status}</Badge>
                        <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                          <Users className="w-3 h-3" /> {p.teamCount} members
                        </span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-xl border-slate-200" onClick={() => navigate(`/projects/overview/${p._id}`)}>
                      Track
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
                      <span>Development Progress</span>
                      <span>{p.progress}%</span>
                    </div>
                    <Progress value={p.progress} className="h-2.5 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 text-center">
              <Button variant="ghost" className="font-bold text-indigo-600" onClick={() => navigate('/projects')}>
                View Full Portfolio <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Support Tickets & Feedback */}
        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 rounded-3xl overflow-hidden">
          <CardHeader className="py-5 border-b bg-slate-50/50 dark:bg-slate-800/50">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Ticket className="w-6 h-6 text-amber-500" />
              Recent Support Tickets
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-transparent hover:bg-transparent border-none">
                  <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Ticket ID</TableHead>
                  <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Subject</TableHead>
                  <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Priority</TableHead>
                  <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTickets.length > 0 ? (
                  recentTickets.map((t, idx) => (
                    <TableRow key={t._id} className="hover:bg-slate-50/50 transition-colors border-slate-100 dark:border-slate-800">
                      <TableCell className="text-xs font-bold text-slate-400">#{idx + 1001}</TableCell>
                      <TableCell>
                        <p className="font-bold text-sm truncate max-w-[180px]">{t.subject || t.title}</p>
                        <p className="text-[10px] text-slate-400 font-medium">Status: {t.status}</p>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "text-[9px] uppercase font-black tracking-tighter",
                          t.priority === 'urgent' ? 'bg-rose-500' : 
                          t.priority === 'high' ? 'bg-amber-500' : 'bg-indigo-500'
                        )}>
                          {t.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate('/tickets')}>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic">
                      No support tickets found
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

function StatCard({ title, value, subtitle, icon: Icon, color }: { title: string, value: string | number, subtitle: string, icon: any, color: 'indigo' | 'emerald' | 'amber' | 'rose' }) {
  const colorMap = {
    indigo: "from-indigo-500 to-blue-600 shadow-indigo-200 dark:shadow-indigo-950/20",
    emerald: "from-emerald-500 to-teal-600 shadow-emerald-200 dark:shadow-emerald-950/20",
    amber: "from-amber-400 to-orange-500 shadow-amber-200 dark:shadow-amber-950/20",
    rose: "from-rose-500 to-pink-600 shadow-rose-200 dark:shadow-rose-950/20"
  };

  return (
    <Card className="border-none shadow-lg bg-white dark:bg-slate-900 rounded-3xl overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={cn(
            "p-3 rounded-2xl bg-gradient-to-br text-white shadow-lg",
            colorMap[color]
          )}>
            <Icon className="w-6 h-6" />
          </div>
          <Badge variant="outline" className="border-slate-100 bg-slate-50 text-slate-500 text-[10px] font-bold">LIVE</Badge>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">{title}</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{value}</p>
          <p className="text-xs font-bold text-slate-500/70">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}

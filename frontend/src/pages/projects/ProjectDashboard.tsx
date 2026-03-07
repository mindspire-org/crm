import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  RadialBarChart,
  RadialBar,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart as PieChartIcon,
  Activity,
  Zap,
  Star,
  Sparkles,
  Target,
  BarChart3,
  LineChart as LineChartIcon,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Download,
  Share2,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  DollarSign as MoneyIcon,
  Briefcase,
  UserCheck,
  Timer,
  Award,
} from "lucide-react";
import {
  getCurrentUser,
  canViewFinancialData,
  canViewProjectDetails,
  maskFinancialData,
  filterProjectData,
  type User
} from "@/utils/roleAccess";

interface Project {
  id: string;
  title: string;
  clientId?: string;
  client?: string;
  price?: number;
  budget?: number;
  start?: string; // ISO
  deadline?: string; // ISO
  status?: string;
  progress?: number;
  teamSize?: number;
  description?: string;
  priority?: string;
  category?: string;
}

interface TaskRow {
  id: string;
  title: string;
  status: string;
  start: string;
  deadline: string;
  priority: string;
  assignee?: string;
  estimatedHours?: number;
  actualHours?: number;
}

interface ContractRow {
  id: string;
  title: string;
  amount: string;
  contractDate: string;
  validUntil: string;
  status: string;
  invoiceAmount?: number;
  paidAmount?: number;
}

interface ProjectAnalytics {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  teamPerformance: Array<{
    member: string;
    tasksCompleted: number;
    efficiency: number;
  }>;
  budgetUtilization: number;
  timeProgress: number;
  riskScore: number;
  clientSatisfaction: number;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  tasksAssigned: number;
  tasksCompleted: number;
  efficiency: number;
}

interface Invoice {
  id: string;
  amount: number;
  status: string;
  dueDate: string;
  paidDate?: string;
}

export default function ProjectDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [analytics, setAnalytics] = useState<ProjectAnalytics | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [activeTab, setActiveTab] = useState("overview");

  // Get current user for role-based access control
  const currentUser = getCurrentUser();

  // Check permissions
  const canViewFinancials = currentUser ? canViewFinancialData(currentUser) : false;
  const canViewProjectFinancials = Boolean(currentUser && (currentUser.role === "admin" || currentUser.role === "finance_manager"));
  const canViewDetails = currentUser ? canViewProjectDetails(currentUser) : false;

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    if (!canViewDetails) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        // Fetch project data
        const projectRes = await fetch(`${API_BASE}/api/projects/${id}`, {
          headers: getAuthHeaders()
        });
        if (projectRes.ok) {
          const d = await projectRes.json();
          const projectData = filterProjectData({
            id: String(d._id || id),
            title: d.title || "-",
            clientId: d.clientId ? String(d.clientId) : undefined,
            client: d.client || "-",
            price: d.price,
            budget: d.budget,
            start: d.start ? new Date(d.start).toISOString() : undefined,
            deadline: d.deadline ? new Date(d.deadline).toISOString() : undefined,
            status: d.status || "Open",
            progress: d.progress || 0,
            teamSize: d.teamSize || 0,
            description: d.description || "",
            priority: d.priority || "medium",
            category: d.category || "general"
          }, currentUser!);
          setProject(projectData);
        }

        // Fetch tasks
        const tasksRes = await fetch(`${API_BASE}/api/tasks?projectId=${id}`, {
          headers: getAuthHeaders()
        });
        if (tasksRes.ok) {
          const data = await tasksRes.json();
          setTasks((Array.isArray(data) ? data : []).map((t: any) => ({
            id: String(t._id || ""),
            title: t.title || "-",
            status: t.status || "todo",
            start: t.start ? new Date(t.start).toISOString().slice(0, 10) : "-",
            deadline: t.deadline ? new Date(t.deadline).toISOString().slice(0, 10) : "-",
            priority: t.priority || "medium",
            assignee: t.assignee || "",
            estimatedHours: t.estimatedHours || 0,
            actualHours: t.actualHours || 0,
          })));
        }

        // Fetch contracts
        const contractsRes = await fetch(`${API_BASE}/api/contracts?projectId=${id}`, {
          headers: getAuthHeaders()
        });
        if (contractsRes.ok) {
          const data = await contractsRes.json();
          setContracts((Array.isArray(data) ? data : []).map((c: any) => filterProjectData({
            id: String(c._id || ""),
            title: c.title || "-",
            amount: c.amount != null ? String(c.amount) : "-",
            contractDate: c.contractDate ? new Date(c.contractDate).toISOString().slice(0, 10) : "-",
            validUntil: c.validUntil ? new Date(c.validUntil).toISOString().slice(0, 10) : "-",
            status: c.status || "Open",
            invoiceAmount: c.invoiceAmount,
            paidAmount: c.paidAmount
          }, currentUser!)));
        }

        // Fetch analytics (mock data for now)
        setAnalytics({
          totalTasks: tasks.length,
          completedTasks: tasks.filter(t => t.status === 'completed').length,
          overdueTasks: tasks.filter(t => t.status === 'overdue').length,
          teamPerformance: [
            { member: "John Doe", tasksCompleted: 12, efficiency: 85 },
            { member: "Jane Smith", tasksCompleted: 8, efficiency: 92 },
            { member: "Mike Johnson", tasksCompleted: 15, efficiency: 78 }
          ],
          budgetUtilization: 65,
          timeProgress: 45,
          riskScore: 25,
          clientSatisfaction: 4.2
        });

        // Mock team members data
        setTeamMembers([
          { id: "1", name: "John Doe", role: "Developer", tasksAssigned: 15, tasksCompleted: 12, efficiency: 85 },
          { id: "2", name: "Jane Smith", role: "Designer", tasksAssigned: 10, tasksCompleted: 8, efficiency: 92 },
          { id: "3", name: "Mike Johnson", role: "Developer", tasksAssigned: 18, tasksCompleted: 15, efficiency: 78 }
        ]);

        // Mock invoices data (filtered by role)
        if (canViewProjectFinancials) {
          setInvoices([
            { id: "1", amount: 15000, status: "paid", dueDate: "2024-01-15", paidDate: "2024-01-14" },
            { id: "2", amount: 8500, status: "pending", dueDate: "2024-02-15" },
            { id: "3", amount: 12000, status: "overdue", dueDate: "2024-01-30" }
          ]);
        }

      } catch (error) {
        console.error("Error fetching project data:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, canViewDetails, currentUser]);

  // Calculate progress and analytics
  const progress = useMemo(() => {
    if (!project?.start || !project.deadline) return 0;
    const s = new Date(project.start).getTime();
    const e = new Date(project.deadline).getTime();
    if (e <= s) return 0;
    const pct = Math.round(((Date.now() - s) / (e - s)) * 100);
    return Math.max(0, Math.min(100, pct));
  }, [project?.start, project?.deadline]);

  // Chart data for analytics
  const taskProgressData = useMemo(() => {
    const statusCounts = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { name: 'Completed', value: statusCounts.completed || 0, color: '#10b981' },
      { name: 'In Progress', value: statusCounts.in_progress || 0, color: '#3b82f6' },
      { name: 'Todo', value: statusCounts.todo || 0, color: '#f59e0b' },
      { name: 'Overdue', value: statusCounts.overdue || 0, color: '#ef4444' }
    ].filter(item => item.value > 0);
  }, [tasks]);

  const budgetData = useMemo(() => {
    if (!project?.budget || !canViewProjectFinancials) return [];
    
    const utilized = project.budget * 0.65; // Mock utilization
    const remaining = project.budget - utilized;
    
    return [
      { name: 'Utilized', value: utilized, color: '#3b82f6' },
      { name: 'Remaining', value: remaining, color: '#10b981' }
    ];
  }, [project?.budget, canViewProjectFinancials]);

  const teamEfficiencyData = useMemo(() => {
    return teamMembers.map(member => ({
      name: member.name.split(' ')[0], // First name only
      efficiency: member.efficiency,
      completed: member.tasksCompleted,
      assigned: member.tasksAssigned
    }));
  }, [teamMembers]);

  // Format currency for display
  const formatCurrency = (amount: number) => {
    if (!canViewProjectFinancials) return maskFinancialData(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'in progress': return 'secondary';
      case 'overdue': return 'destructive';
      default: return 'outline';
    }
  };

  if (!id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900 flex items-center justify-center px-6 py-10">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle>Select a project</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Choose a project from the Projects list.
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => navigate("/projects")}>Go to Projects</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canViewDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900 flex items-center justify-center">
        <Card className="max-w-md mx-auto text-center">
          <CardContent className="pt-6">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have permission to view this project.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-muted-foreground">Loading project dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-800 dark:via-indigo-800 dark:to-purple-800">
        <div className="absolute inset-0 opacity-30" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`, animation: 'pulse 3s ease-in-out infinite'}} />
        <div className="relative px-6 py-12 sm:px-12 lg:px-16">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
                  <Briefcase className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                    {project?.title || "Project Dashboard"}
                  </h1>
                  <p className="mt-2 text-lg text-white/80">
                    {project?.client ? `Client: ${project.client}` : "Project Overview & Analytics"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                  <Activity className="w-3 h-3 mr-1" />
                  {progress}% Complete
                </Badge>
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                  <Users className="w-3 h-3 mr-1" />
                  {project?.teamSize || 0} Team Members
                </Badge>
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                  <Target className="w-3 h-3 mr-1" />
                  {tasks.length} Tasks
                </Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="secondary" size="lg" className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm">
                <Link to={`/projects/${id}/edit`}>
                  <FileText className="w-4 h-4 mr-2" />
                  Edit Project
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg" className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm">
                <Link to={`/projects/${id}/reports`}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Reports
                </Link>
              </Button>
              <Button variant="outline" size="lg" disabled={loading} className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm">
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-8 sm:px-12 lg:px-16 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 opacity-50" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`}} />
            <CardHeader className="relative pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-emerald-100">
                <CheckCircle className="w-5 h-5" /> Task Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="relative space-y-3">
              <div className="text-3xl font-bold">{analytics?.completedTasks || 0}/{analytics?.totalTasks || 0}</div>
              <div className="flex items-center gap-2 text-sm text-emerald-100">
                <TrendingUp className="w-4 h-4" />
                {Math.round(((analytics?.completedTasks || 0) / Math.max(analytics?.totalTasks || 1, 1)) * 100)}% Complete
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 opacity-50" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`}} />
            <CardHeader className="relative pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-100">
                <Timer className="w-5 h-5" /> Time Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="relative space-y-3">
              <div className="text-3xl font-bold">{progress}%</div>
              <div className="flex items-center gap-2 text-sm text-blue-100">
                <Clock className="w-4 h-4" />
                {project?.start ? new Date(project.start).toLocaleDateString() : "No start date"}
              </div>
            </CardContent>
          </Card>

          {canViewProjectFinancials && (
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-500 via-purple-600 to-pink-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 opacity-50" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`}} />
              <CardHeader className="relative pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-purple-100">
                  <MoneyIcon className="w-5 h-5" /> Budget
                </CardTitle>
              </CardHeader>
              <CardContent className="relative space-y-3">
                <div className="text-3xl font-bold">{formatCurrency(project?.budget || 0)}</div>
                <div className="flex items-center gap-2 text-sm text-purple-100">
                  <TrendingUp className="w-4 h-4" />
                  {analytics?.budgetUtilization || 0}% Utilized
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 opacity-50" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`}} />
            <CardHeader className="relative pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-100">
                <AlertCircle className="w-5 h-5" /> Risk Score
              </CardTitle>
            </CardHeader>
            <CardContent className="relative space-y-3">
              <div className="text-3xl font-bold">{analytics?.riskScore || 0}/100</div>
              <div className="flex items-center gap-2 text-sm text-amber-100">
                {(analytics?.riskScore || 0) < 30 ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {(analytics?.riskScore || 0) < 30 ? "Low Risk" : "High Risk"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            {canViewProjectFinancials && <TabsTrigger value="financials">Financials</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-0 shadow-xl bg-white/80 backdrop-blur-sm dark:bg-slate-800/80">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    Project Progress
                    <Badge className="ml-auto bg-blue-100 text-blue-800">Live</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Overall Progress</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-3" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Start Date</div>
                      <div className="font-medium">{project?.start ? new Date(project.start).toLocaleDateString() : "Not set"}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Deadline</div>
                      <div className="font-medium">{project?.deadline ? new Date(project.deadline).toLocaleDateString() : "Not set"}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Status</div>
                      <Badge variant={getStatusBadge(project?.status || "")}>{project?.status || "Open"}</Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Priority</div>
                      <Badge variant="outline" className="capitalize">{project?.priority || "Medium"}</Badge>
                    </div>
                  </div>

                  {project?.description && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Description</div>
                      <p className="text-sm text-muted-foreground">{project.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm dark:bg-slate-800/80">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5 text-emerald-600" />
                    Task Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={taskProgressData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {taskProgressData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm dark:bg-slate-800/80">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    Team Efficiency
                    <Badge className="ml-auto bg-indigo-100 text-indigo-800">Performance</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={teamEfficiencyData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="efficiency" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {canViewProjectFinancials && budgetData.length > 0 && (
                <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm dark:bg-slate-800/80">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <MoneyIcon className="w-5 h-5 text-emerald-600" />
                      Budget Utilization
                      <Badge className="ml-auto bg-emerald-100 text-emerald-800">Financial</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={budgetData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {budgetData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tasks">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm dark:bg-slate-800/80">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  Project Tasks
                  <Badge className="ml-auto bg-blue-100 text-blue-800">{tasks.length} Total</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Assignee</TableHead>
                      <TableHead>Deadline</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((t, idx) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{idx + 1}</TableCell>
                        <TableCell>{t.title}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadge(t.status)}>{t.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{t.priority}</Badge>
                        </TableCell>
                        <TableCell>{t.assignee || "Unassigned"}</TableCell>
                        <TableCell>{t.deadline}</TableCell>
                      </TableRow>
                    ))}
                    {tasks.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No tasks found for this project.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm dark:bg-slate-800/80">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Team Members
                  <Badge className="ml-auto bg-purple-100 text-purple-800">{teamMembers.length} Members</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teamMembers.map((member) => (
                    <Card key={member.id} className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{member.name}</div>
                          <div className="text-sm text-muted-foreground">{member.role}</div>
                          <div className="text-xs text-muted-foreground">
                            {member.tasksCompleted}/{member.tasksAssigned} tasks completed
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Efficiency</span>
                          <span className="font-medium">{member.efficiency}%</span>
                        </div>
                        <Progress value={member.efficiency} className="h-2" />
                      </div>
                    </Card>
                  ))}
                  {teamMembers.length === 0 && (
                    <div className="col-span-full text-center text-muted-foreground py-8">
                      No team members assigned to this project.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {canViewProjectFinancials && (
            <TabsContent value="financials" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm dark:bg-slate-800/80">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <MoneyIcon className="w-5 h-5 text-emerald-600" />
                      Project Financials
                      <Badge className="ml-auto bg-emerald-100 text-emerald-800">Confidential</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Project Price</div>
                        <div className="text-2xl font-bold">{formatCurrency(project?.price || 0)}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Budget</div>
                        <div className="text-2xl font-bold">{formatCurrency(project?.budget || 0)}</div>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-3">
                      <div className="text-sm font-medium">Budget Utilization</div>
                      <Progress value={analytics?.budgetUtilization || 0} className="h-3" />
                      <div className="flex justify-between text-sm">
                        <span>{analytics?.budgetUtilization || 0}% utilized</span>
                        <span>{formatCurrency((project?.budget || 0) * (analytics?.budgetUtilization || 0) / 100)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm dark:bg-slate-800/80">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      Invoices
                      <Badge className="ml-auto bg-blue-100 text-blue-800">{invoices.length} Total</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice ID</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Due Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium">#{invoice.id}</TableCell>
                            <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                            <TableCell>
                              <Badge variant={invoice.status === 'paid' ? 'default' : invoice.status === 'overdue' ? 'destructive' : 'secondary'}>
                                {invoice.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                        {invoices.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              No invoices found for this project.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {/* Contracts Tab - Only visible to users with financial access */}
          {canViewFinancials && (
            <TabsContent value="contracts">
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm dark:bg-slate-800/80">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    Contracts
                    <Badge className="ml-auto bg-purple-100 text-purple-800">{contracts.length} Total</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">ID</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Contract Date</TableHead>
                        <TableHead>Valid Until</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contracts.map((c, idx) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{idx + 1}</TableCell>
                          <TableCell>{c.title}</TableCell>
                          <TableCell>{c.amount === "-" ? "••••••" : formatCurrency(Number(c.amount))}</TableCell>
                          <TableCell>{c.contractDate}</TableCell>
                          <TableCell>{c.validUntil}</TableCell>
                          <TableCell>
                            <Badge variant={c.status === 'Active' ? 'default' : 'secondary'}>
                              {c.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {contracts.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No contracts found for this project.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

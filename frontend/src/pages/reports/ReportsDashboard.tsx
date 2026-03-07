import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  ShoppingCart,
  LineChart,
  Layers,
  LayoutGrid,
  Clock,
  Ticket,
  ArrowRight,
  Sparkles,
  TrendingUp,
  DollarSign,
  Users,
  Target,
  FileText,
  Calendar,
  Activity,
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
  LineChart as RechartsLineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { hasCrmPermission, canViewFinancialData, getCurrentUser } from "@/utils/roleAccess";
import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function ReportsDashboard() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const canViewFinanceData = canViewFinancialData(currentUser);
  
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [financeData, setFinanceData] = useState<any[]>([]);
  const [leadsData, setLeadsData] = useState<any[]>([]);
  const [leadSources, setLeadSources] = useState<any[]>([]);
  const [projectStats, setProjectStats] = useState<any>({ statusCounts: {}, resourceAllocation: [] });
  const [ticketMetrics, setTicketMetrics] = useState<any>({ performance: [], statusCounts: {} });
  const [keyMetrics, setKeyMetrics] = useState<any[]>([]);
  const [financeSummary, setFinanceSummary] = useState({ profitMargin: 0, totalAssets: 0, totalLiabilities: 0 });
  const [stats, setStats] = useState({
    totalInvoiced: 0,
    totalPaid: 0,
    activeLeads: 0,
    runningProjects: 0,
    openTickets: 0,
    revenueGrowth: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const headers = getAuthHeaders();
        
        // Fetch all report data from new endpoints
        const [
          dashboardRes,
          salesTrendRes,
          financeTrendRes,
          leadSourcesRes,
          projectStatsRes,
          ticketMetricsRes,
          keyMetricsRes
        ] = await Promise.all([
          fetch(`${API_BASE}/api/reports/dashboard-summary`, { headers }),
          fetch(`${API_BASE}/api/reports/sales-trend?days=7`, { headers }),
          fetch(`${API_BASE}/api/reports/finance-trend?months=6`, { headers }),
          fetch(`${API_BASE}/api/reports/lead-sources`, { headers }),
          fetch(`${API_BASE}/api/reports/project-stats`, { headers }),
          fetch(`${API_BASE}/api/reports/ticket-metrics`, { headers }),
          fetch(`${API_BASE}/api/reports/key-metrics`, { headers }),
        ]);

        const dashboard = await dashboardRes.json();
        const salesTrend = await salesTrendRes.json();
        const financeTrend = await financeTrendRes.json();
        const leadSourcesData = await leadSourcesRes.json();
        const projectStatsData = await projectStatsRes.json();
        const ticketMetricsData = await ticketMetricsRes.json();
        const keyMetricsData = await keyMetricsRes.json();

        // Update stats with real data
        setStats({
          totalInvoiced: dashboard.sales?.totalInvoiced || 0,
          totalPaid: dashboard.sales?.totalPaid || 0,
          activeLeads: dashboard.leads?.active || 0,
          runningProjects: dashboard.projects?.active || 0,
          openTickets: dashboard.support?.openTickets || 0,
          revenueGrowth: dashboard.sales?.revenueGrowth || 0
        });

        // Set chart data
        setSalesData(salesTrend.data || []);
        setFinanceData(financeTrend.data || []);
        setLeadsData(leadSourcesData.funnel || []);
        setLeadSources(leadSourcesData.sources || []);
        setProjectStats(projectStatsData);
        setTicketMetrics(ticketMetricsData);
        setKeyMetrics(keyMetricsData.indicators || []);
        setFinanceSummary(keyMetricsData.finance || { profitMargin: 0, totalAssets: 0, totalLiabilities: 0 });

      } catch (error) {
        console.error("Error fetching report data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="relative animate-fade-in w-full px-3 sm:px-4 lg:px-6 pb-10 space-y-6 overflow-x-hidden">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/20 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-4 sm:p-6 lg:p-8 text-white shadow-2xl">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, #6366f1 0%, transparent 40%), radial-gradient(circle at 80% 80%, #10b981 0%, transparent 40%)" }} />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6">
          <div className="min-w-0 flex-1">
            <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 mb-2 sm:mb-3">Enterprise Analytics</Badge>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">Business Intelligence</h1>
            <p className="text-indigo-100/70 mt-2 max-w-xl text-sm sm:text-base">Comprehensive insights across all departments. Monitor progress, identify trends, and drive growth with real-time data visualization.</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3 w-full md:w-auto">
            <Button onClick={() => window.print()} variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 text-xs sm:text-sm">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Schedule</span> Report
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 text-xs sm:text-sm">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> AI Insights
            </Button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 mt-6 sm:mt-10 relative">
          {[
            { label: "Revenue", value: `Rs.${stats.totalPaid.toLocaleString()}`, icon: DollarSign, color: "text-emerald-400" },
            { label: "Invoiced", value: `Rs.${stats.totalInvoiced.toLocaleString()}`, icon: FileText, color: "text-blue-400" },
            { label: "Leads", value: stats.activeLeads, icon: Target, color: "text-fuchsia-400" },
            { label: "Projects", value: stats.runningProjects, icon: LayoutGrid, color: "text-sky-400" },
            { label: "Tickets", value: stats.openTickets, icon: Ticket, color: "text-rose-400" },
          ].map((stat, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-white/10 transition-transform hover:scale-105">
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <div className={`p-1.5 sm:p-2 rounded-lg bg-white/10 ${stat.color}`}>
                  <stat.icon className="w-3 h-3 sm:w-4 sm:h-4" />
                </div>
                <span className="text-xs font-medium text-white/60 uppercase tracking-wider hidden sm:block">{stat.label}</span>
              </div>
              <div className="text-base sm:text-xl font-bold truncate">{stat.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Analytics Content */}
      <Tabs defaultValue="sales" className="space-y-6">
        <TabsList className="bg-white/50 backdrop-blur-sm p-1 border border-slate-200 rounded-xl sm:rounded-2xl h-auto w-full flex flex-wrap sm:flex-nowrap justify-start gap-1 overflow-visible">
          <TabsTrigger value="sales" className="rounded-lg sm:rounded-xl px-3 sm:px-6 h-10 sm:h-12 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-md flex-1 sm:flex-none justify-center">
            <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Sales</span><span className="sm:hidden">Sales</span>
          </TabsTrigger>
          <TabsTrigger value="finance" className="rounded-lg sm:rounded-xl px-3 sm:px-6 h-10 sm:h-12 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-md flex-1 sm:flex-none justify-center">
            <LineChart className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Finance</span><span className="sm:hidden">Finance</span>
          </TabsTrigger>
          <TabsTrigger value="leads" className="rounded-lg sm:rounded-xl px-3 sm:px-6 h-10 sm:h-12 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-md flex-1 sm:flex-none justify-center">
            <Layers className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Leads</span><span className="sm:hidden">Leads</span>
          </TabsTrigger>
          <TabsTrigger value="projects" className="rounded-lg sm:rounded-xl px-3 sm:px-6 h-10 sm:h-12 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-md flex-1 sm:flex-none justify-center">
            <LayoutGrid className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Projects</span><span className="sm:hidden">Projects</span>
          </TabsTrigger>
          <TabsTrigger value="support" className="rounded-lg sm:rounded-xl px-3 sm:px-6 h-10 sm:h-12 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-md flex-1 sm:flex-none justify-center">
            <Ticket className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Support</span><span className="sm:hidden">Support</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <Card className="lg:col-span-2 shadow-sm border-slate-200 overflow-hidden">
              <CardHeader className="bg-slate-50/50 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <CardTitle className="text-base sm:text-lg">Weekly Sales Performance</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Daily revenue generation across all channels</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/reports/sales/invoices-summary" className="text-indigo-600">View Full Report <ArrowRight className="w-4 h-4 ml-1" /></Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
                <div className="h-[200px] sm:h-[300px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">Key Indicators</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="space-y-4">
                    {[1,2,3].map(i => (
                      <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-100 animate-pulse">
                        <div className="h-4 w-24 bg-slate-200 rounded mb-2"></div>
                        <div className="h-6 w-16 bg-slate-300 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : keyMetrics.slice(0, 3).map((item: any, i: number) => (
                  <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-500 uppercase font-bold tracking-tighter">{item.label}</div>
                      <div className="text-xl font-black mt-1 tracking-tight">{item.value}</div>
                      <div className="text-xs text-slate-400">{item.subtext}</div>
                    </div>
                    <Badge variant="outline" className={`${item.color} bg-white border-slate-200`}>{item.trend}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="finance" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Income vs Expenses</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/reports/finance/income-vs-expenses" className="text-indigo-600">Full Analytics</Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={financeData}>
                      <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={3} />
                      <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="transparent" strokeWidth={3} strokeDasharray="5 5" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-6">
              <Card className="shadow-sm border-slate-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-500 uppercase tracking-tighter">Profit Margin</div>
                      <div className="text-3xl font-black tracking-tight text-slate-900">{financeSummary.profitMargin}%</div>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="text-emerald-500 font-bold flex items-center justify-end">
                        <TrendingUp className="w-4 h-4 mr-1" /> +4.2%
                      </div>
                      <div className="text-xs text-slate-400">vs last month</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="grid grid-cols-2 gap-4">
                <Card className="shadow-sm border-slate-200 bg-emerald-50/30">
                  <CardContent className="p-6">
                    <div className="text-xs font-bold text-emerald-600 uppercase mb-1">Total Assets</div>
                    <div className="text-xl font-black">Rs. {(financeSummary.totalAssets / 1000000).toFixed(1)}M</div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200 bg-rose-50/30">
                  <CardContent className="p-6">
                    <div className="text-xs font-bold text-rose-600 uppercase mb-1">Total Liabilities</div>
                    <div className="text-xl font-black">Rs. {(financeSummary.totalLiabilities / 1000000).toFixed(1)}M</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="leads" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <Card className="shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">Lead Funnel Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={leadsData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {leadsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {leadsData.map((l, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs font-medium">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-slate-500">{l.name}:</span>
                      <span className="text-slate-900 font-bold">{l.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 shadow-sm border-slate-200">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Top Lead Sources</CardTitle>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/reports/leads/conversions">Conversions Report</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {loading ? (
                    <div className="space-y-4">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="space-y-2 animate-pulse">
                          <div className="flex justify-between">
                            <div className="h-4 w-24 bg-slate-200 rounded"></div>
                            <div className="h-4 w-16 bg-slate-200 rounded"></div>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full"></div>
                        </div>
                      ))}
                    </div>
                  ) : leadSources.length > 0 ? leadSources.slice(0, 4).map((item: any, i: number) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-bold text-slate-700">{item.source}</span>
                        <span className="text-slate-500 font-medium">{item.count} leads • {item.conversionRate}% conv.</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, (item.count / (leadSources[0]?.count || 1)) * 100)}%` }} />
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-slate-400">
                      <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No lead source data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <Card className="shadow-sm border-slate-200">
              <CardContent className="p-6 text-center">
                <div className="text-4xl font-black text-indigo-600 mb-1">{stats.runningProjects}</div>
                <div className="text-sm font-bold text-slate-500 uppercase tracking-tighter">Active Projects</div>
                <div className="mt-4 flex justify-center">
                  <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100">
                    {projectStats.active > 0 ? Math.round((projectStats.completed / projectStats.total) * 100) : 0}% Completion Rate
                  </Badge>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-slate-200">
              <CardContent className="p-6 text-center">
                <div className="text-4xl font-black text-emerald-600 mb-1">{projectStats.completed || 0}</div>
                <div className="text-sm font-bold text-slate-500 uppercase tracking-tighter">Total Completed</div>
                <div className="mt-4 flex justify-center">
                  <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100">Team: {projectStats.teamSize || 0}</Badge>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-slate-200">
              <CardContent className="p-6 text-center">
                <div className="text-4xl font-black text-rose-600 mb-1">{projectStats.delayed || 0}</div>
                <div className="text-sm font-bold text-slate-500 uppercase tracking-tighter">Delayed/Critical</div>
                <div className="mt-4 flex justify-center">
                  <Button variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50 underline font-bold" onClick={() => navigate("/projects")}>Review Now</Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Team Resource Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                {loading ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="animate-pulse flex space-x-4">
                      <div className="h-32 w-12 bg-slate-200 rounded"></div>
                      <div className="h-40 w-12 bg-slate-200 rounded"></div>
                      <div className="h-24 w-12 bg-slate-200 rounded"></div>
                      <div className="h-36 w-12 bg-slate-200 rounded"></div>
                    </div>
                  </div>
                ) : projectStats.resourceAllocation?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectStats.resourceAllocation}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="allocated" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="available" stackId="a" fill="#e2e8f0" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    <Users className="w-12 h-12 mb-2 opacity-50" />
                    <p>No resource data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="support" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card className="shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">Ticket Status Overview</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center h-[300px]">
                {loading ? (
                  <div className="animate-pulse text-center">
                    <div className="h-16 w-16 bg-slate-200 rounded-full mx-auto mb-4"></div>
                    <div className="h-4 w-32 bg-slate-200 rounded mx-auto"></div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <div className="text-2xl font-black text-amber-600">{ticketMetrics.statusCounts?.Open || 0}</div>
                        <div className="text-xs text-amber-600 uppercase font-bold">Open</div>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="text-2xl font-black text-blue-600">{ticketMetrics.statusCounts?.InProgress || 0}</div>
                        <div className="text-xs text-blue-600 uppercase font-bold">In Progress</div>
                      </div>
                      <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                        <div className="text-2xl font-black text-emerald-600">{ticketMetrics.statusCounts?.Resolved || 0}</div>
                        <div className="text-xs text-emerald-600 uppercase font-bold">Resolved</div>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="text-2xl font-black text-slate-600">{ticketMetrics.statusCounts?.Closed || 0}</div>
                        <div className="text-xs text-slate-600 uppercase font-bold">Closed</div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/reports/tickets/statistics">View Full Report</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card className="shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">Resolution Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                {loading ? (
                  <div className="space-y-4">
                    {[1,2,3].map(i => (
                      <div key={i} className="space-y-2 animate-pulse">
                        <div className="flex justify-between">
                          <div className="h-4 w-24 bg-slate-200 rounded"></div>
                          <div className="h-4 w-16 bg-slate-200 rounded"></div>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full"></div>
                      </div>
                    ))}
                  </div>
                ) : ticketMetrics.performance?.length > 0 ? ticketMetrics.performance.map((item: any, i: number) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-600">{item.label}</span>
                      <span className="text-sm font-black text-indigo-600">{item.value}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${item.score}%` }} />
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-slate-400">
                    <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No performance data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Navigation Footer - Quick Access to All Reports */}
      <div className="pt-6 sm:pt-8 border-t border-slate-200">
        <h3 className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 sm:mb-6 flex items-center gap-2">
          <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" /> Detailed Report Archives
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[
            { title: "Invoices Summary", href: "/reports/sales/invoices-summary", icon: ShoppingCart },
            { title: "Income vs Expenses", href: "/reports/finance/income-vs-expenses", icon: LineChart },
            { title: "Expenses Summary", href: "/reports/finance/expenses-summary", icon: DollarSign },
            { title: "Lead Conversions", href: "/reports/leads/conversions", icon: Target },
            { title: "Team Performance", href: "/reports/projects/team-members", icon: Users },
            { title: "Support Statistics", href: "/reports/tickets/statistics", icon: Ticket },
          ].map((link, i) => (
            <Link key={i} to={link.href} className="flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="p-1.5 sm:p-2 rounded-lg bg-slate-50 group-hover:bg-indigo-50 text-slate-400 group-hover:text-indigo-600 transition-colors flex-shrink-0">
                  <link.icon className="w-3 h-3 sm:w-4 sm:h-4" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-700 truncate">{link.title}</span>
              </div>
              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all flex-shrink-0 ml-2" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

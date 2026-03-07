import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import {
  TrendingUp,
  Users,
  Target,
  Mail,
  Phone,
  MessageSquare,
  Calendar,
  DollarSign,
  Eye,
  Share2,
  Download,
  Send,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Zap,
  Megaphone,
  MailOpen,
  Globe,
  Smartphone,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Youtube,
  Rocket,
  UserCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";
import { canViewFinancialData, getCurrentUser, hasCrmPermission } from "@/utils/roleAccess";


const leadConversionData = [
  { month: "Jan", leads: 120, conversions: 24, rate: 20 },
  { month: "Feb", leads: 150, conversions: 33, rate: 22 },
  { month: "Mar", leads: 180, conversions: 45, rate: 25 },
  { month: "Apr", leads: 165, conversions: 41, rate: 25 },
  { month: "May", leads: 200, conversions: 56, rate: 28 },
  { month: "Jun", leads: 220, conversions: 66, rate: 30 },
];

const campaignPerformanceData = [
  { name: "Email Campaign", reach: 5000, clicks: 250, conversions: 25, cost: 500 },
  { name: "Social Media", reach: 8000, clicks: 400, conversions: 32, cost: 800 },
  { name: "Google Ads", reach: 3000, clicks: 300, conversions: 45, cost: 1200 },
  { name: "Content Marketing", reach: 6000, clicks: 180, conversions: 18, cost: 300 },
];

const leadSourceData = [
  { name: "Organic", value: 35, color: "#10b981" },
  { name: "Paid Ads", value: 28, color: "#3b82f6" },
  { name: "Social Media", value: 20, color: "#8b5cf6" },
  { name: "Email", value: 12, color: "#f59e0b" },
  { name: "Referral", value: 5, color: "#ef4444" },
];

const socialMediaMetrics = [
  { platform: "Facebook", followers: 12500, growth: 12, engagement: 3.2 },
  { platform: "Twitter", followers: 8300, growth: 8, engagement: 4.1 },
  { platform: "LinkedIn", followers: 6200, growth: 15, engagement: 2.8 },
  { platform: "Instagram", followers: 9800, growth: 20, engagement: 5.2 },
];

const activeCampaigns = [
  { id: "CMP-001", name: "Summer Sale 2024", status: "Active", performance: 85, budget: "$5,000", spent: "$3,200" },
  { id: "CMP-002", name: "Product Launch", status: "Active", performance: 72, budget: "$8,000", spent: "$4,500" },
  { id: "CMP-003", name: "Newsletter Special", status: "Scheduled", performance: 0, budget: "$1,000", spent: "$0" },
];

const recentLeads = [
  { id: "LD-001", name: "Tech Solutions Inc", source: "Website", status: "Hot Lead", value: "$15,000", date: "2024-06-20" },
  { id: "LD-002", name: "Global Marketing Co", source: "LinkedIn", status: "Warm Lead", value: "$8,500", date: "2024-06-19" },
  { id: "LD-003", name: "StartUp Ventures", source: "Email Campaign", status: "Cold Lead", value: "$3,000", date: "2024-06-18" },
];

const upcomingTasks = [
  { task: "Review Q2 campaign performance", due: "Today", priority: "High" },
  { task: "Create social media content calendar", due: "Tomorrow", priority: "Medium" },
  { task: "Optimize Google Ads keywords", due: "This Week", priority: "High" },
  { task: "Send weekly newsletter", due: "Friday", priority: "Medium" },
];

export default function MarketerDashboard() {
  const [totalLeads, setTotalLeads] = useState(0);
  const [conversionRate, setConversionRate] = useState(0);
  const [activeCampaignsCount, setActiveCampaignsCount] = useState(0);
  const [totalBudget, setTotalBudget] = useState(0);
  const [roi, setRoi] = useState(0);
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
  const canViewFinanceData = canViewFinancialData(currentUser);
  const canManagePipeline = hasCrmPermission('pipeline.manage');
  const canViewReports = hasCrmPermission('reports.view');

  useEffect(() => {
    // Simulate API calls for marketing data
    setTotalLeads(1035);
    setConversionRate(30);
    setActiveCampaignsCount(3);
    setTotalBudget(14000);
    setRoi(245);

    // Fetch commissions for the marketer
    const fetchCommissions = async () => {
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
        // Silently fail - commissions are a bonus feature
        console.error("Failed to fetch commissions:", e);
      } finally {
        setCommissionsLoading(false);
      }
    };

    fetchCommissions();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header with Commission Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Marketing Dashboard</h1>
            <p className="text-purple-100">Track campaigns, leads, and ROI all in one place</p>
          </div>
          <div className="flex items-center gap-6">
            {/* Commission Banner - visible to all marketers */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="bg-green-400/20 p-2 rounded-full">
                  <DollarSign className="w-5 h-5 text-green-300" />
                </div>
                <div className="text-right">
                  <p className="text-xs text-purple-200">Your Commissions (5%)</p>
                  <p className="text-xl font-bold">
                    {commissionsLoading ? "..." : commissionSummary.totalEarned.toLocaleString()}
                  </p>
                  {commissionSummary.totalPending > 0 && (
                    <p className="text-xs text-green-300">
                      {commissionSummary.totalPending.toLocaleString()} pending
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-purple-200">Current ROI</p>
              <p className="text-3xl font-bold">{roi}%</p>
            </div>
            <Avatar className="h-16 w-16 border-2 border-white">
              <AvatarImage src="/api/placeholder/64/64" alt="Marketer" />
              <AvatarFallback className="bg-white text-purple-600 text-xl">MK</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Leads</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">{totalLeads.toLocaleString()}</p>
                <p className="text-xs text-blue-600 mt-1">+15% this month</p>
              </div>
              <div className="bg-blue-200 p-3 rounded-full">
                <Users className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Conversion Rate</p>
                <p className="text-3xl font-bold text-green-900 mt-1">{conversionRate}%</p>
                <p className="text-xs text-green-600 mt-1">+5% improvement</p>
              </div>
              <div className="bg-green-200 p-3 rounded-full">
                <Target className="w-6 h-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Active Campaigns</p>
                <p className="text-3xl font-bold text-orange-900 mt-1">{activeCampaignsCount}</p>
                <p className="text-xs text-orange-600 mt-1">2 performing well</p>
              </div>
              <div className="bg-orange-200 p-3 rounded-full">
                <Rocket className="w-6 h-6 text-orange-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        {canViewFinanceData && (
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Total Budget</p>
                  <p className="text-3xl font-bold text-purple-900 mt-1">${totalBudget.toLocaleString()}</p>
                  <p className="text-xs text-purple-600 mt-1">Q3 2024</p>
                </div>
                <div className="bg-purple-200 p-3 rounded-full">
                  <DollarSign className="w-6 h-6 text-purple-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Campaigns & Analytics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lead Conversion Trend */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Lead Conversion Trend</CardTitle>
              <Button variant="outline" size="sm">
                <BarChart3 className="w-4 h-4 mr-2" />
                Detailed Report
              </Button>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={leadConversionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                  <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                  <Tooltip />
                  <Area yAxisId="left" type="monotone" dataKey="leads" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  <Line yAxisId="right" type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Campaign Performance */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Campaign Performance</CardTitle>
              <Button variant="outline" size="sm">
                <Activity className="w-4 h-4 mr-2" />
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaignPerformanceData.map((campaign, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{campaign.name}</h4>
                      <span className="text-sm text-muted-foreground">Cost: ${campaign.cost}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <p className="text-muted-foreground">Reach</p>
                        <p className="font-medium">{campaign.reach.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Clicks</p>
                        <p className="font-medium">{campaign.clicks}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Conversions</p>
                        <p className="font-medium">{campaign.conversions}</p>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 mt-3">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(campaign.conversions / campaign.clicks) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Lead Sources */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lead Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={leadSourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {leadSourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-4 mt-4">
                {leadSourceData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm">{item.name}: {item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Social Media Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Social Media Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {socialMediaMetrics.map((social, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="bg-muted p-2 rounded-lg">
                        {social.platform === "Facebook" && <Facebook className="w-4 h-4 text-blue-600" />}
                        {social.platform === "Twitter" && <Twitter className="w-4 h-4 text-sky-500" />}
                        {social.platform === "LinkedIn" && <Linkedin className="w-4 h-4 text-blue-700" />}
                        {social.platform === "Instagram" && <Instagram className="w-4 h-4 text-pink-600" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{social.platform}</p>
                        <p className="text-xs text-muted-foreground">{social.followers.toLocaleString()} followers</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-green-600">
                        <TrendingUp className="w-3 h-3" />
                        <span className="text-xs font-medium">+{social.growth}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{social.engagement}% engagement</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline" disabled={!canManagePipeline}>
                <Rocket className="w-4 h-4 mr-2" />
                Create Campaign
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Mail className="w-4 h-4 mr-2" />
                Send Newsletter
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <UserCheck className="w-4 h-4 mr-2" />
                Add Lead
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <BarChart3 className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            </CardContent>
          </Card>

          {/* Active Campaigns */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Active Campaigns</CardTitle>
              <Badge variant="secondary">{activeCampaignsCount} Running</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeCampaigns.map((campaign) => (
                  <div key={campaign.id} className="p-3 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{campaign.name}</h4>
                      <Badge variant={campaign.status === "Active" ? "default" : "secondary"}>
                        {campaign.status}
                      </Badge>
                    </div>
                    {campaign.performance > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span>Performance</span>
                          <span>{campaign.performance}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${campaign.performance}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs mt-2">
                      <span>Budget: {canViewFinanceData ? campaign.budget : "••••"}</span>
                      <span>Spent: {canViewFinanceData ? campaign.spent : "••••"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Leads */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Leads</CardTitle>
              <Button variant="outline" size="sm">
                <UserCheck className="w-4 h-4 mr-2" />
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentLeads.map((lead) => (
                  <div key={lead.id} className="p-3 rounded-lg border">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm">{lead.name}</h4>
                      <Badge
                        variant={
                          lead.status === "Hot Lead" ? "destructive" :
                          lead.status === "Warm Lead" ? "default" : "secondary"
                        }
                      >
                        {lead.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{lead.source}</span>
                      <span>{canViewFinanceData ? lead.value : "••••"}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{lead.date}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingTasks.map((task, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        task.priority === "High" ? "bg-red-500" : "bg-yellow-500"
                      }`} />
                      <span className="text-sm">{task.task}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{task.due}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Marketing Channels */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Marketing Channels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-12 flex-col">
                  <Mail className="w-4 h-4 mb-1" />
                  <span className="text-xs">Email</span>
                </Button>
                <Button variant="outline" className="h-12 flex-col">
                  <Facebook className="w-4 h-4 mb-1" />
                  <span className="text-xs">Facebook</span>
                </Button>
                <Button variant="outline" className="h-12 flex-col">
                  <Twitter className="w-4 h-4 mb-1" />
                  <span className="text-xs">Twitter</span>
                </Button>
                <Button variant="outline" className="h-12 flex-col">
                  <Linkedin className="w-4 h-4 mb-1" />
                  <span className="text-xs">LinkedIn</span>
                </Button>
                <Button variant="outline" className="h-12 flex-col">
                  <Instagram className="w-4 h-4 mb-1" />
                  <span className="text-xs">Instagram</span>
                </Button>
                <Button variant="outline" className="h-12 flex-col">
                  <Globe className="w-4 h-4 mb-1" />
                  <span className="text-xs">Website</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

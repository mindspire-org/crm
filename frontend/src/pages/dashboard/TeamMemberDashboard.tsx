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
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Target,
  TrendingUp,
  Coffee,
  Briefcase,
  MessageSquare,
  FileText,
  Settings,
  Bell,
  User,
  MapPin,
  Phone,
  Mail,
  Play,
  Pause,
  RotateCcw,
} from "lucide-react";
import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api/base";
import { getCurrentUser, hasCrmPermission, canViewFinancialData } from "@/utils/roleAccess";


const weeklyHoursData = [
  { day: "Mon", hours: 8.5, tasks: 5 },
  { day: "Tue", hours: 7.8, tasks: 4 },
  { day: "Wed", hours: 9.2, tasks: 6 },
  { day: "Thu", hours: 8.0, tasks: 5 },
  { day: "Fri", hours: 7.5, tasks: 4 },
  { day: "Sat", hours: 2.0, tasks: 2 },
  { day: "Sun", hours: 0, tasks: 0 },
];

const taskStatusData = [
  { name: "Completed", value: 24, color: "#10b981" },
  { name: "In Progress", value: 8, color: "#3b82f6" },
  { name: "To Do", value: 5, color: "#f59e0b" },
  { name: "Overdue", value: 2, color: "#ef4444" },
];

const productivityData = [
  { month: "Jan", productivity: 85 },
  { month: "Feb", productivity: 88 },
  { month: "Mar", productivity: 92 },
  { month: "Apr", productivity: 87 },
  { month: "May", productivity: 90 },
  { month: "Jun", productivity: 94 },
];

const todayTasks = [
  { id: "TSK-001", title: "Complete dashboard design", priority: "High", deadline: "2:00 PM", status: "In Progress" },
  { id: "TSK-002", title: "Review pull requests", priority: "Medium", deadline: "4:00 PM", status: "To Do" },
  { id: "TSK-003", title: "Team standup meeting", priority: "High", deadline: "10:00 AM", status: "Completed" },
  { id: "TSK-004", title: "Update documentation", priority: "Low", deadline: "Tomorrow", status: "To Do" },
];

const recentActivities = [
  { action: "Completed task", detail: "Dashboard UI implementation", time: "2 hours ago" },
  { action: "Started task", detail: "API integration work", time: "3 hours ago" },
  { action: "Commented on", detail: "Project planning discussion", time: "5 hours ago" },
  { action: "Attended meeting", detail: "Sprint planning", time: "1 day ago" },
];

const teamMembers = [
  { name: "Alex Chen", avatar: "AC", status: "Online", role: "Frontend Developer" },
  { name: "Sarah Williams", avatar: "SW", status: "Online", role: "UX Designer" },
  { name: "Mike Johnson", avatar: "MJ", status: "Away", role: "Backend Developer" },
  { name: "Emma Davis", avatar: "ED", status: "Offline", role: "Project Manager" },
];

export default function TeamMemberDashboard() {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayHours, setTodayHours] = useState(6.5);
  const [weeklyHours, setWeeklyHours] = useState(42.5);
  const [completedTasks, setCompletedTasks] = useState(24);
  const [pendingTasks, setPendingTasks] = useState(15);
  const [unreadMessages, setUnreadMessages] = useState(3);

  // Permission checks
  const currentUser = getCurrentUser();
  const canViewTeamData = hasCrmPermission('team.view') || hasCrmPermission('team.manage');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleClockToggle = () => {
    setIsClockedIn(!isClockedIn);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header with Clock In/Out */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Good {currentTime.getHours() < 12 ? "Morning" : currentTime.getHours() < 18 ? "Afternoon" : "Evening"}, Alex!</h1>
            <p className="text-indigo-100 mb-4">Ready to make today productive?</p>
            <div className="flex items-center gap-4">
              <Button
                onClick={handleClockToggle}
                variant={isClockedIn ? "destructive" : "secondary"}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                {isClockedIn ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Clock Out
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Clock In
                  </>
                )}
              </Button>
              <div className="text-sm">
                <span className="text-indigo-200">Today: </span>
                <span className="font-medium">{todayHours}h</span>
                <span className="text-indigo-200 ml-3">This week: </span>
                <span className="font-medium">{weeklyHours}h</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold mb-1">
              {currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="text-indigo-200">
              {currentTime.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </div>
            <Avatar className="h-16 w-16 border-2 border-white mt-3">
              <AvatarImage src="/api/placeholder/64/64" alt="Team Member" />
              <AvatarFallback className="bg-white text-indigo-600 text-xl">AK</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Completed Tasks</p>
                <p className="text-3xl font-bold text-green-900 mt-1">{completedTasks}</p>
                <p className="text-xs text-green-600 mt-1">+8 this week</p>
              </div>
              <div className="bg-green-200 p-3 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Pending Tasks</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">{pendingTasks}</p>
                <p className="text-xs text-blue-600 mt-1">3 high priority</p>
              </div>
              <div className="bg-blue-200 p-3 rounded-full">
                <Target className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Weekly Hours</p>
                <p className="text-3xl font-bold text-orange-900 mt-1">{weeklyHours}</p>
                <p className="text-xs text-orange-600 mt-1">2.5h overtime</p>
              </div>
              <div className="bg-orange-200 p-3 rounded-full">
                <Clock className="w-6 h-6 text-orange-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Messages</p>
                <p className="text-3xl font-bold text-purple-900 mt-1">{unreadMessages}</p>
                <p className="text-xs text-purple-600 mt-1">2 unread</p>
              </div>
              <div className="bg-purple-200 p-3 rounded-full">
                <MessageSquare className="w-6 h-6 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Tasks & Performance */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Tasks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Today's Tasks</CardTitle>
              <Button variant="outline" size="sm">
                <Target className="w-4 h-4 mr-2" />
                View All Tasks
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todayTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        task.status === "Completed" ? "bg-green-500" :
                        task.status === "In Progress" ? "bg-blue-500" : "bg-gray-300"
                      }`} />
                      <div>
                        <p className="font-medium text-sm">{task.title}</p>
                        <p className="text-xs text-muted-foreground">{task.id} • {task.deadline}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={task.priority === "High" ? "destructive" : task.priority === "Medium" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {task.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {task.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Weekly Hours Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Weekly Hours & Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={weeklyHoursData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                  <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                  <Tooltip />
                  <Area yAxisId="left" type="monotone" dataKey="hours" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  <Bar yAxisId="right" dataKey="tasks" fill="#10b981" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Task Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Task Status Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={taskStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {taskStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-4 mt-4">
                {taskStatusData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Productivity Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Productivity Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={productivityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="productivity" stroke="#8b5cf6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
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
              <Button className="w-full justify-start" variant="outline">
                <Target className="w-4 h-4 mr-2" />
                Start New Task
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Coffee className="w-4 h-4 mr-2" />
                Take Break
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Log Time
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                Request Leave
              </Button>
            </CardContent>
          </Card>

          {/* Team Status */}
          {canViewTeamData && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Team Status</CardTitle>
                <Badge variant="secondary">{teamMembers.filter(m => m.status === "Online").length} Online</Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {teamMembers.map((member) => (
                    <div key={member.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">{member.avatar}</AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${
                            member.status === "Online" ? "bg-green-500" :
                            member.status === "Away" ? "bg-yellow-500" : "bg-gray-400"
                          }`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.role}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 px-2">
                        <MessageSquare className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 p-2 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{activity.action}</span>
                        <span className="text-muted-foreground"> {activity.detail}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Calendar className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Sprint Planning</p>
                    <p className="text-xs text-muted-foreground">Tomorrow, 10:00 AM</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <Users className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Team Review</p>
                    <p className="text-xs text-muted-foreground">Friday, 2:00 PM</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <Target className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Project Deadline</p>
                    <p className="text-xs text-muted-foreground">Next Monday</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
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
} from "recharts";
import {
  MessageSquare,
  Ticket,
  FileText,
  CheckCircle,
  TrendingUp,
  Phone,
  Mail,
  Star,
  Download,
  Eye,
  Plus,
  Send,
  Calendar,
  DollarSign,
  Clock,
  User,
  Briefcase,
  MessageCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuthHeaders } from "@/lib/api/auth";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api/base";

const invoiceStatusData = [
  { name: "Paid", value: 8, color: "#10b981" },
  { name: "Pending", value: 3, color: "#f59e0b" },
  { name: "Overdue", value: 1, color: "#ef4444" },
];

const monthlyActivityData = [
  { month: "Jan", projects: 2, invoices: 3 },
  { month: "Feb", projects: 3, invoices: 4 },
  { month: "Mar", projects: 1, invoices: 2 },
  { month: "Apr", projects: 4, invoices: 5 },
  { month: "May", projects: 2, invoices: 3 },
  { month: "Jun", projects: 3, invoices: 4 },
];


const recentInvoices = [
  { id: "INV-001", amount: "$2,500", status: "Paid", date: "2024-06-10" },
  { id: "INV-002", amount: "$1,800", status: "Pending", date: "2024-06-15" },
  { id: "INV-003", amount: "$3,200", status: "Overdue", date: "2024-06-05" },
];

export default function ClientDashboard() {
  const navigate = useNavigate();
  const [clientName, setClientName] = useState("Client");
  const [clientAvatar, setClientAvatar] = useState<string | undefined>(undefined);
  const [projects, setProjects] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [projectRequestOpen, setProjectRequestOpen] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [projectForm, setProjectForm] = useState({ title: "", description: "", budget: "", deadline: "" });
  const [ticketForm, setTicketForm] = useState({ title: "", description: "", priority: "medium" });

  const [activeProjects, setActiveProjects] = useState(0);
  const [completedProjects, setCompletedProjects] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);
  const [pendingInvoices, setPendingInvoices] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const headers = getAuthHeaders();
        const [meRes, projectsRes, ticketsRes] = await Promise.all([
          fetch(`${API_BASE}/api/client/me`, { headers }),
          fetch(`${API_BASE}/api/client/projects`, { headers }),
          fetch(`${API_BASE}/api/client/tickets`, { headers }),
        ]);

        if (!mounted) return;

        const meJson = meRes.ok ? await meRes.json() : null;
        const client = meJson?.client;
        const displayName = client?.company || client?.person || meJson?.user?.name || meJson?.user?.email || "Client";
        setClientName(String(displayName || "Client"));
        setClientAvatar(client?.avatar ? String(client.avatar) : undefined);

        const projectsJson = projectsRes.ok ? await projectsRes.json() : [];
        const projectsArr = Array.isArray(projectsJson) ? projectsJson : [];
        setProjects(projectsArr);

        const ticketsJson = ticketsRes.ok ? await ticketsRes.json() : [];
        const ticketsArr = Array.isArray(ticketsJson) ? ticketsJson : [];
        setTickets(ticketsArr);

        const completed = projectsArr.filter((p: any) => String(p?.status || "").toLowerCase() === "completed").length;
        const active = Math.max(0, projectsArr.length - completed);
        setActiveProjects(active);
        setCompletedProjects(completed);

        const open = ticketsArr.filter((t: any) => {
          const s = String(t?.status || "").toLowerCase();
          return s && s !== "closed";
        }).length;
        setOpenTickets(open);

        const spent = projectsArr.reduce((sum: number, p: any) => sum + (Number(p?.price) || 0), 0);
        setTotalSpent(spent);

        setPendingInvoices(0);
      } catch {
        if (!mounted) return;
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const clientInitials = String(clientName || "Client")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const projectProgressData = projects
    .slice(0, 4)
    .map((p: any) => {
      const status = String(p?.status || "Open");
      const rawProgress = typeof p?.progress === "number" ? Number(p.progress) : status.toLowerCase() === "completed" ? 100 : 0;
      const progress = Math.max(0, Math.min(100, isNaN(rawProgress) ? 0 : rawProgress));
      return {
        name: String(p?.title || "Project"),
        progress,
        status,
      };
    });

  const recentTickets = [...tickets]
    .sort((a: any, b: any) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime())
    .slice(0, 3)
    .map((t: any) => {
      const no = t?.ticketNo != null ? String(t.ticketNo) : "";
      const id = no ? `TK-${no.padStart(3, "0")}` : String(t?._id || "").slice(0, 8);
      const statusRaw = String(t?.status || "open").toLowerCase();
      const status = statusRaw === "closed" ? "Closed" : statusRaw === "open" ? "Pending" : "In Progress";
      const date = t?.createdAt ? new Date(t.createdAt).toISOString().slice(0, 10) : "";
      return { id, title: String(t?.title || "Ticket"), status, date };
    });

  const handleProjectRequest = async () => {
    if (!projectForm.title.trim() || !projectForm.description.trim()) {
      toast.error("Title and description are required");
      return;
    }
    setSubmitting(true);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/client/project-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(projectForm),
      });
      if (!res.ok) throw new Error((await res.json())?.error || "Failed to submit request");
      toast.success("Project request submitted successfully!");
      setProjectRequestOpen(false);
      setProjectForm({ title: "", description: "", budget: "", deadline: "" });
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!ticketForm.title.trim() || !ticketForm.description.trim()) {
      toast.error("Title and description are required");
      return;
    }
    setSubmitting(true);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/client/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(ticketForm),
      });
      if (!res.ok) throw new Error((await res.json())?.error || "Failed to create ticket");
      toast.success("Ticket created successfully!");
      setTicketOpen(false);
      setTicketForm({ title: "", description: "", priority: "medium" });
      // Refresh tickets
      const ticketsRes = await fetch(`${API_BASE}/api/client/tickets`, { headers });
      if (ticketsRes.ok) {
        const ticketsJson = await ticketsRes.json();
        setTickets(Array.isArray(ticketsJson) ? ticketsJson : []);
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  };

  const openMessages = () => navigate("/client/messages");
  const openTicketsPage = () => navigate("/client/tickets");
  const openInvoices = () => navigate("/invoices");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Welcome back, {clientName}!</h1>
            <p className="text-blue-100">Here's what's happening with your projects today.</p>
          </div>
          <Avatar className="h-16 w-16 border-2 border-white bg-white">
            <AvatarImage src={clientAvatar ? `${API_BASE}${clientAvatar}` : "/api/placeholder/64/64"} alt="Client" />
            <AvatarFallback className="bg-white text-blue-600 text-xl">{clientInitials}</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Active Projects</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">{activeProjects}</p>
                <p className="text-xs text-blue-600 mt-1">+2 this month</p>
              </div>
              <div className="bg-blue-200 p-3 rounded-full">
                <FileText className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Completed</p>
                <p className="text-3xl font-bold text-green-900 mt-1">{completedProjects}</p>
                <p className="text-xs text-green-600 mt-1">95% success rate</p>
              </div>
              <div className="bg-green-200 p-3 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Open Tickets</p>
                <p className="text-3xl font-bold text-orange-900 mt-1">{openTickets}</p>
                <p className="text-xs text-orange-600 mt-1">2 need attention</p>
              </div>
              <div className="bg-orange-200 p-3 rounded-full">
                <Ticket className="w-6 h-6 text-orange-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Total Spent</p>
                <p className="text-3xl font-bold text-purple-900 mt-1">${totalSpent.toLocaleString()}</p>
                <p className="text-xs text-purple-600 mt-1">This year</p>
              </div>
              <div className="bg-purple-200 p-3 rounded-full">
                <TrendingUp className="w-6 h-6 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Projects & Progress */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Progress */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Project Progress</CardTitle>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projectProgressData.map((project, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{project.name}</h4>
                        <p className="text-sm text-muted-foreground">{project.status}</p>
                      </div>
                      <span className="text-sm font-medium">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 mt-3">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${project.progress}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Invoice Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Invoice Status</CardTitle>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download All
              </Button>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={invoiceStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {invoiceStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-4 mt-4">
                {invoiceStatusData.map((item) => (
                  <div key={item.name} className="text-center">
                    <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: item.color }} />
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-lg font-bold">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Monthly Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Monthly Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthlyActivityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="projects" stroke="#3b82f6" strokeWidth={2} />
                  <Line type="monotone" dataKey="invoices" stroke="#10b981" strokeWidth={2} />
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
              <Dialog open={projectRequestOpen} onOpenChange={setProjectRequestOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full justify-start" variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    New Project Request
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>New Project Request</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="project-title">Title</Label>
                      <Input
                        id="project-title"
                        value={projectForm.title}
                        onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                        placeholder="Enter project title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="project-description">Description</Label>
                      <Textarea
                        id="project-description"
                        value={projectForm.description}
                        onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                        placeholder="Describe your project requirements"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="project-budget">Budget (optional)</Label>
                      <Input
                        id="project-budget"
                        value={projectForm.budget}
                        onChange={(e) => setProjectForm({ ...projectForm, budget: e.target.value })}
                        placeholder="e.g., $5,000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="project-deadline">Deadline (optional)</Label>
                      <DatePicker value={projectForm.deadline} onChange={(v) => setProjectForm({ ...projectForm, deadline: v })} placeholder="Pick deadline" />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleProjectRequest} disabled={submitting} className="flex-1">
                        {submitting ? "Submitting..." : "Submit Request"}
                      </Button>
                      <Button variant="outline" onClick={() => setProjectRequestOpen(false)} className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={ticketOpen} onOpenChange={setTicketOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full justify-start" variant="outline">
                    <Ticket className="w-4 h-4 mr-2" />
                    Create Support Ticket
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create Support Ticket</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="ticket-title">Title</Label>
                      <Input
                        id="ticket-title"
                        value={ticketForm.title}
                        onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
                        placeholder="Brief description of the issue"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ticket-description">Description</Label>
                      <Textarea
                        id="ticket-description"
                        value={ticketForm.description}
                        onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                        placeholder="Provide detailed information about your issue"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="ticket-priority">Priority</Label>
                      <Select value={ticketForm.priority} onValueChange={(v) => setTicketForm({ ...ticketForm, priority: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleCreateTicket} disabled={submitting} className="flex-1">
                        {submitting ? "Creating..." : "Create Ticket"}
                      </Button>
                      <Button variant="outline" onClick={() => setTicketOpen(false)} className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button className="w-full justify-start" variant="outline" onClick={openMessages}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Send Message
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={openInvoices}>
                <FileText className="w-4 h-4 mr-2" />
                View Invoices
              </Button>
            </CardContent>
          </Card>

          {/* Recent Tickets */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Tickets</CardTitle>
              <Badge variant="secondary">{openTickets} Open</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentTickets.map((ticket) => (
                  <div key={ticket.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{ticket.title}</p>
                      <p className="text-xs text-muted-foreground">{ticket.id} • {ticket.date}</p>
                    </div>
                    <Badge
                      variant={ticket.status === "Closed" ? "default" : ticket.status === "In Progress" ? "secondary" : "destructive"}
                    >
                      {ticket.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Invoices */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Invoices</CardTitle>
              <Badge variant="secondary">{pendingInvoices} Pending</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{invoice.id}</p>
                      <p className="text-xs text-muted-foreground">{invoice.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{invoice.amount}</p>
                      <Badge
                        variant={invoice.status === "Paid" ? "default" : invoice.status === "Pending" ? "secondary" : "destructive"}
                      >
                        {invoice.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Account Manager */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Account Manager</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Avatar className="h-12 w-12">
                  <AvatarImage src="/api/placeholder/48/48" alt="Manager" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">John Davidson</p>
                  <p className="text-sm text-muted-foreground">Senior Account Manager</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs">4.9</span>
                    </div>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">2 years</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" className="flex-1">
                  <Phone className="w-3 h-3 mr-1" />
                  Call
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  <Mail className="w-3 h-3 mr-1" />
                  Email
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

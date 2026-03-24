import { useEffect, useMemo, useState } from "react";
import { useParams, NavLink, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Notes from "../notes/Notes";
import Files from "../files/Files";

import {
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  ArrowLeft,
  FolderKanban,
  CheckSquare,
  FileText,
  Receipt,
  IndianRupee,
  AlertCircle,
  Ticket,
  Calendar,
  Briefcase,
  FileSignature,
  CreditCard,
  Package,
  Users,
  Info,
  Plus,
  ExternalLink,
  Loader2,
  ChevronRight,
  LayoutDashboard,
  StickyNote,
  Paperclip,
  Wallet
} from "lucide-react";

import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";
import { COUNTRIES } from "@/data/countries";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ClientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<any | null>(null);
  const [tab, setTab] = useState("contacts");
  const [activeTabs, setActiveTabs] = useState<Set<string>>(new Set(["contacts"]));
  const [estimates, setEstimates] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [estimateRequests, setEstimateRequests] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);

  // add dialogs/forms
  const [openAddProject, setOpenAddProject] = useState(false);
  const [projectForm, setProjectForm] = useState({ title: "", price: "", start: "", deadline: "", labels: "", description: "" });

  const [openAddEstimate, setOpenAddEstimate] = useState(false);
  const [estimateForm, setEstimateForm] = useState({ estimateDate: "", validUntil: "", tax: "-", tax2: "-", note: "", advancedAmount: "" });

  const [openAddEvent, setOpenAddEvent] = useState(false);
  const [eventForm, setEventForm] = useState({ title: "", description: "", date: "", startTime: "", endDate: "", endTime: "", location: "", type: "" });

  const [openAddLicense, setOpenAddLicense] = useState(false);
  const [licenseForm, setLicenseForm] = useState({ product: "", licenseKey: "", status: "active", issuedAt: "", expiresAt: "", note: "" });

  const [openAddTask, setOpenAddTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", status: "todo", priority: "medium", dueDate: "", projectId: "" });

  // editable fields
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        setLoading(true);
        const headers = getAuthHeaders();

        const res = await fetch(`${API_BASE}/api/clients/${encodeURIComponent(String(id))}`, { headers });
        if (!res.ok) {
          const e = await res.json().catch(() => null);
          toast.error(e?.error || "Failed to load client");
          return;
        }
        const row = await res.json().catch(() => null);
        if (row) {
          setClient(row);
          setForm({ ...row });
        }

        // Proactively load invoices and payments to ensure header stats are correct
        const [invRes, payRes] = await Promise.all([
          fetch(`${API_BASE}/api/invoices?clientId=${encodeURIComponent(String(id))}`, { headers }),
          fetch(`${API_BASE}/api/payments?clientId=${encodeURIComponent(String(id))}`, { headers })
        ]);
        
        if (invRes.ok) setInvoices(await invRes.json().catch(() => []));
        if (payRes.ok) setPayments(await payRes.json().catch(() => []));

      } catch (e: any) {
        toast.error(String(e?.message || "Failed to load client"));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Load additional data when tabs are activated
  useEffect(() => {
    if (!client || !activeTabs.has(tab)) return;
    
    (async () => {
      try {
        const headers = getAuthHeaders();
        const clientId = String(id || "");
        
        // Load data based on active tab
        if (tab === "projects") {
          const resP = await fetch(`${API_BASE}/api/projects?clientId=${encodeURIComponent(clientId)}`, { headers });
          const pj = await resP.json().catch(() => []);
          const arr = Array.isArray(pj)
            ? pj
            : (Array.isArray((pj as any)?.data) ? (pj as any).data : (Array.isArray((pj as any)?.items) ? (pj as any).items : []));
          setProjects(arr);
        } else if (tab === "estimates") {
          const resE = await fetch(`${API_BASE}/api/estimates?clientId=${encodeURIComponent(clientId)}`, { headers });
          const byId = await resE.json().catch(() => []);
          const listById = Array.isArray(byId) ? byId : [];

          if (listById.length) {
            setEstimates(listById);
          } else {
            const clientName = String(client?.company || client?.person || "").trim();
            if (!clientName) {
              setEstimates([]);
            } else {
              // Fallback for legacy estimates created without clientId
              const resQ = await fetch(`${API_BASE}/api/estimates?q=${encodeURIComponent(clientName)}`, { headers });
              const byQ = await resQ.json().catch(() => []);
              const listByQ = (Array.isArray(byQ) ? byQ : [])
                .filter((e: any) => String(e?.client || "").trim() === clientName);
              setEstimates(listByQ);
            }
          }
        } else if (tab === "invoices") {
          const r = await fetch(`${API_BASE}/api/invoices?clientId=${encodeURIComponent(String(id))}`, { headers });
          setInvoices(await r.json().catch(() => []));
        } else if (tab === "tickets") {
          const r = await fetch(`${API_BASE}/api/tickets?clientId=${encodeURIComponent(String(id))}`, { headers });
          const arr = await r.json().catch(() => []);
          setTickets(Array.isArray(arr) ? arr : []);
        } else if (tab === "proposals") {
          const r = await fetch(`${API_BASE}/api/proposals?clientId=${encodeURIComponent(String(id))}`, { headers });
          setProposals(await r.json().catch(() => []));
        } else if (tab === "contracts") {
          const r = await fetch(`${API_BASE}/api/contracts?clientId=${encodeURIComponent(String(id))}`, { headers });
          setContracts(await r.json().catch(() => []));
        } else if (tab === "subscriptions") {
          const r = await fetch(`${API_BASE}/api/subscriptions?clientId=${encodeURIComponent(String(id))}`, { headers });
          setSubscriptions(await r.json().catch(() => []));
        } else if (tab === "events") {
          const r = await fetch(`${API_BASE}/api/events?clientId=${encodeURIComponent(String(id))}`, { headers });
          setEvents(await r.json().catch(() => []));
        }
        // Add other tabs as needed
      } catch (e) {
        console.error(`Failed to load ${tab} data:`, e);
      }
    })();
  }, [tab, client, id, activeTabs]);

  // Handle tab changes for lazy loading
  const handleTabChange = (newTab: string) => {
    setTab(newTab);
    setActiveTabs(prev => new Set([...prev, newTab]));
  };

  // Load tasks after projects are known
  useEffect(() => {
    (async () => {
      if (!projects || !projects.length) { setTasks([]); return; }
      try {
        const headers = getAuthHeaders();
        const combined: any[] = [];
        for (const p of projects) {
          const res = await fetch(`${API_BASE}/api/tasks?projectId=${encodeURIComponent(p._id)}`, { headers });
          if (res.ok) {
            const arr = await res.json().catch(() => []);
            const normalized = (Array.isArray(arr) ? arr : []).map((t: any) => ({
              ...t,
              projectTitle: t?.projectTitle || p?.title || t?.project || "-",
            }));
            combined.push(...normalized);
          }
        }
        setTasks(combined);
      } catch {
        setTasks([]);
      }
    })();
  }, [projects]);

  const totals = useMemo(() => {
    const totalInvoiced = (invoices || []).reduce((a, e: any) => a + Number(e.amount || 0), 0);
    const paid = (payments || []).reduce((a, p: any) => a + Number(p.amount || 0), 0);
    const due = totalInvoiced - paid;
    return { totalInvoiced, payments: paid, due };
  }, [invoices, payments]);

  const dashboard = useMemo(() => {
    const projectCount = (projects || []).length;
    const taskCount = (tasks || []).length;
    const invoiceCount = (invoices || []).length;
    const openTickets = (tickets || []).filter((t: any) => {
      const s = String(t?.status || "").toLowerCase();
      return s && !["closed", "resolved", "done", "completed"].includes(s);
    }).length;
    return { projectCount, taskCount, invoiceCount, openTickets };
  }, [projects, tasks, invoices, tickets]);

  // creators
  const reloadProjects = async (name: string) => {
    try {
      const resP = await fetch(`${API_BASE}/api/projects?q=${encodeURIComponent(name)}`, { headers: getAuthHeaders() });
      const pj = await resP.json().catch(() => []);
      const arr = Array.isArray(pj) ? pj : (Array.isArray((pj as any)?.data) ? (pj as any).data : (Array.isArray((pj as any)?.items) ? (pj as any).items : []));
      setProjects(arr);
    } catch { setProjects([]); }
  };

  const createLicense = async () => {
    const product = (licenseForm.product || "").trim();
    const licenseKey = (licenseForm.licenseKey || "").trim();
    if (!client?._id || !product || !licenseKey) return;
    try {
      const payload: any = {
        clientId: String(client._id),
        client: client.company || client.person || "-",
        product,
        licenseKey,
        status: (licenseForm.status || "active").trim(),
        issuedAt: licenseForm.issuedAt ? new Date(licenseForm.issuedAt) : undefined,
        expiresAt: licenseForm.expiresAt ? new Date(licenseForm.expiresAt) : undefined,
        note: licenseForm.note || "",
      };
      const r = await fetch(`${API_BASE}/api/licenses`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => null);
        toast.error(e?.error || "Failed to add license");
        return;
      }
      setOpenAddLicense(false);
      setLicenseForm({ product: "", licenseKey: "", status: "active", issuedAt: "", expiresAt: "", note: "" });
      try {
        const rr = await fetch(`${API_BASE}/api/licenses?clientId=${encodeURIComponent(String(client._id))}`, { headers: getAuthHeaders() });
        setLicenses(await rr.json().catch(() => []));
      } catch { }
    } catch {
      toast.error("Failed to add license");
    }
  };

  const createProject = async () => {
    if (!client) return;
    const title = (projectForm.title || "").trim();
    if (!title) return;
    try {
      const payload: any = {
        title,
        client: client.company || client.person || "-",
        clientId: client._id ? String(client._id) : undefined,
        price: projectForm.price ? Number(projectForm.price) : 0,
        start: projectForm.start ? new Date(projectForm.start) : undefined,
        deadline: projectForm.deadline ? new Date(projectForm.deadline) : undefined,
        status: "Open",
        labels: projectForm.labels || undefined,
        description: projectForm.description || undefined,
      };
      const r = await fetch(`${API_BASE}/api/projects`, { method: "POST", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
      if (r.ok) {
        setOpenAddProject(false);
        setProjectForm({ title: "", price: "", start: "", deadline: "", labels: "", description: "" });
        await reloadProjects(payload.client);
      } else {
        toast.error("Failed to add project");
      }
    } catch { toast.error("Failed to add project"); }
  };

  const createEstimate = async () => {
    const payload: any = {
      clientId: client?._id || id,
      client: client?.company || client?.person || "-",
      estimateDate: estimateForm.estimateDate ? new Date(estimateForm.estimateDate) : undefined,
      validUntil: estimateForm.validUntil ? new Date(estimateForm.validUntil) : undefined,
      tax: estimateForm.tax === "-" ? 0 : Number(estimateForm.tax || 0),
      tax2: estimateForm.tax2 === "-" ? 0 : Number(estimateForm.tax2 || 0),
      note: estimateForm.note || undefined,
      advancedAmount: estimateForm.advancedAmount ? Number(estimateForm.advancedAmount) : 0,
      items: [],
    };
    try {
      const r = await fetch(`${API_BASE}/api/estimates`, { method: "POST", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
      if (r.ok) {
        setOpenAddEstimate(false);
        setEstimateForm({ estimateDate: "", validUntil: "", tax: "-", tax2: "-", note: "", advancedAmount: "" });
        toast.success("Estimate added");
        // reload
        const resE = await fetch(`${API_BASE}/api/estimates?clientId=${encodeURIComponent(String(id))}`, { headers: getAuthHeaders() });
        setEstimates(await resE.json().catch(() => []));
      } else {
        const err = await r.json().catch(() => ({}));
        toast.error(err.error || "Failed to add estimate");
      }
    } catch { toast.error("Failed to add estimate"); }
  };

  const createEvent = async () => {
    const title = (eventForm.title || "").trim();
    if (!title) return;
    const startIso = eventForm.date ? new Date(`${eventForm.date}T${eventForm.startTime || "00:00"}:00`).toISOString() : undefined;
    const endIso = eventForm.endDate ? new Date(`${eventForm.endDate}T${eventForm.endTime || "00:00"}:00`).toISOString() : undefined;
    try {
      const payload: any = {
        title,
        description: eventForm.description || undefined,
        start: startIso,
        end: endIso,
        location: eventForm.location || undefined,
        type: eventForm.type || undefined,
        clientId: client?._id ? String(client._id) : undefined,
      };
      const r = await fetch(`${API_BASE}/api/events`, { method: "POST", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
      if (r.ok) {
        setOpenAddEvent(false);
        setEventForm({ title: "", description: "", date: "", startTime: "", endDate: "", endTime: "", location: "", type: "" });
        // reload events
        try { const re = await fetch(`${API_BASE}/api/events?clientId=${encodeURIComponent(String(client._id || ""))}`, { headers: getAuthHeaders() }); setEvents(await re.json().catch(()=>[])); } catch {}
      } else {
        toast.error("Failed to add event");
      }
    } catch { toast.error("Failed to add event"); }
  };

  const createTask = async () => {
    const title = (taskForm.title || "").trim();
    if (!title) {
      toast.error("Task title is required");
      return;
    }
    if (!projects || projects.length === 0) {
      toast.error("Please create a project first before adding tasks");
      return;
    }
    try {
      // Use the first available project if no projectId selected
      const projectId = taskForm.projectId || projects[0]?._id;
      if (!projectId) {
        toast.error("No project available to add task to");
        return;
      }
      const payload: any = {
        title,
        description: taskForm.description || undefined,
        status: taskForm.status || "todo",
        priority: taskForm.priority || "medium",
        dueDate: taskForm.dueDate ? new Date(taskForm.dueDate) : undefined,
        projectId,
        clientId: client?._id ? String(client._id) : undefined,
      };
      const r = await fetch(`${API_BASE}/api/tasks`, { 
        method: "POST", 
        headers: getAuthHeaders({ "Content-Type": "application/json" }), 
        body: JSON.stringify(payload) 
      });
      if (r.ok) {
        setOpenAddTask(false);
        setTaskForm({ title: "", description: "", status: "todo", priority: "medium", dueDate: "", projectId: "" });
        toast.success("Task added");
        // Reload tasks by refreshing projects
        const clientId = String(id || "");
        const resP = await fetch(`${API_BASE}/api/projects?clientId=${encodeURIComponent(clientId)}`, { headers: getAuthHeaders() });
        const pj = await resP.json().catch(() => []);
        const arr = Array.isArray(pj) ? pj : (Array.isArray((pj as any)?.data) ? (pj as any).data : (Array.isArray((pj as any)?.items) ? (pj as any).items : []));
        setProjects(arr);
      } else {
        const err = await r.json().catch(() => ({}));
        toast.error(err.error || "Failed to add task");
      }
    } catch { toast.error("Failed to add task"); }
  };

  const saveInfo = async () => {
    if (!client) return;
    try {
      const payload: any = { ...form };
      delete payload._id; delete payload.createdAt; delete payload.updatedAt; delete payload.__v;
      const res = await fetch(`${API_BASE}/api/clients/${client._id}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const e = await res.json().catch(() => null); toast.error(e?.error || "Save failed"); return; }
      const updated = await res.json();
      setClient(updated);
      toast.success("Saved");
    } catch { }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary"></div>
            <Loader2 className="absolute inset-0 m-auto h-6 w-6 text-primary animate-spin" />
          </div>
          <div className="text-muted-foreground text-sm">Loading client details...</div>
        </div>
      </div>
    );
  };
  if (!client) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <Building2 className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="text-lg font-medium">Client not found</div>
      <Button asChild variant="outline">
        <NavLink to="/clients">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Clients
        </NavLink>
      </Button>
    </div>
  );

  const displayName = client.company || client.person || "Client";
  const clientType = client.type === "person" ? "Individual" : "Organization";

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <NavLink to="/clients" className="hover:text-primary transition-colors flex items-center gap-1">
          <LayoutDashboard className="h-4 w-4" />
          Clients
        </NavLink>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium truncate max-w-[200px] sm:max-w-[400px]">
          {displayName}
        </span>
      </nav>

      {/* Main Client Header Card */}
      <Card className="overflow-hidden border-0 shadow-lg">
        {/* Top Section with Gradient */}
        <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 px-6 py-8 sm:px-8">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-inner">
                {client.avatar ? (
                  <img 
                    src={`${API_BASE}${client.avatar}?t=${client?.updatedAt || Date.now()}`} 
                    alt="avatar" 
                    className="w-16 h-16 rounded-2xl object-cover"
                    onError={(e) => {
                      console.error("Avatar failed to load:", client.avatar);
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <Building2 className="h-8 w-8" />
                )}
              </div>
              <div className="min-w-0">
                <Badge variant="secondary" className="mb-2 bg-white/20 text-white border-0 hover:bg-white/30">
                  {clientType}
                </Badge>
                <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">{displayName}</h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-white/80 text-sm">
                  {client.owner && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {client.owner}
                    </span>
                  )}
                  {client.email && (
                    <a href={`mailto:${client.email}`} className="flex items-center gap-1 hover:text-white transition-colors">
                      <Mail className="h-3.5 w-3.5" />
                      {client.email}
                    </a>
                  )}
                  {client.phone && (
                    <a href={`tel:${client.phone}`} className="flex items-center gap-1 hover:text-white transition-colors">
                      <Phone className="h-3.5 w-3.5" />
                      {client.phone}
                    </a>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="secondary" 
                className="bg-white/20 text-white border-0 hover:bg-white/30 backdrop-blur-sm"
                asChild
              >
                <NavLink to={`/invoices?clientId=${encodeURIComponent(String(id || ""))}`}>
                  <Receipt className="mr-2 h-4 w-4" />
                  Invoices
                </NavLink>
              </Button>
              <Button 
                className="bg-white text-indigo-600 hover:bg-white/90 shadow-lg"
                asChild
              >
                <NavLink to={`/projects?clientId=${encodeURIComponent(String(id || ""))}`}>
                  <FolderKanban className="mr-2 h-4 w-4" />
                  Projects
                </NavLink>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid - Reduced to 5 columns for better visibility */}
        <div className="p-6 bg-muted/30">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <Stat 
              title="Projects" 
              value={dashboard.projectCount} 
              color="from-indigo-500 to-purple-600" 
              icon={<FolderKanban className="h-4 w-4" />}
            />
            <Stat 
              title="Tasks" 
              value={dashboard.taskCount} 
              color="from-sky-500 to-blue-600" 
              icon={<CheckSquare className="h-4 w-4" />}
            />
            <Stat 
              title="Invoices" 
              value={dashboard.invoiceCount} 
              color="from-emerald-500 to-teal-600" 
              icon={<FileText className="h-4 w-4" />}
            />
            <Stat 
              title="Invoiced" 
              value={`PKR ${Math.max(0, Math.round(totals.totalInvoiced)).toLocaleString()}`} 
              color="from-slate-600 to-slate-700" 
              icon={<span className="text-xs font-bold">PKR</span>}
            />
            <Stat 
              title="Due" 
              value={`PKR ${Math.max(0, Math.round(totals.due)).toLocaleString()}`} 
              color="from-rose-500 to-red-600" 
              icon={<AlertCircle className="h-4 w-4" />}
            />
          </div>
        </div>
      </Card>

      <Tabs value={tab} onValueChange={handleTabChange} className="space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex-1 min-w-0 relative group">
            {/* Left fade indicator */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity lg:hidden" />
            {/* Right fade indicator */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
            
            <div className="w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent scroll-smooth snap-x snap-mandatory">
              <TabsList className="bg-muted/40 p-1.5 rounded-2xl w-max h-auto gap-1">
                <TabsTrigger 
                  value="contacts" 
                  className="gap-2 rounded-xl px-3 py-2.5 h-auto data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo/25 transition-all duration-300 snap-start"
                >
                  <Users className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline font-medium text-sm whitespace-nowrap">Contacts</span>
                  <span className="sm:hidden text-xs font-medium">Contact</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="projects" 
                  className="gap-2 rounded-xl px-3 py-2.5 h-auto data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo/25 transition-all duration-300 snap-start"
                >
                  <FolderKanban className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline font-medium text-sm whitespace-nowrap">Projects</span>
                  <span className="sm:hidden text-xs font-medium">Projects</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="tasks" 
                  className="gap-2 rounded-xl px-3 py-2.5 h-auto data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo/25 transition-all duration-300 snap-start"
                >
                  <CheckSquare className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline font-medium text-sm whitespace-nowrap">Tasks</span>
                  <span className="sm:hidden text-xs font-medium">Tasks</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="invoices" 
                  className="gap-2 rounded-xl px-3 py-2.5 h-auto data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo/25 transition-all duration-300 snap-start"
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline font-medium text-sm whitespace-nowrap">Invoices</span>
                  <span className="sm:hidden text-xs font-medium">Invoices</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="estimates" 
                  className="gap-2 rounded-xl px-3 py-2.5 h-auto data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo/25 transition-all duration-300 snap-start"
                >
                  <FileSignature className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline font-medium text-sm whitespace-nowrap">Estimates</span>
                  <span className="sm:hidden text-xs font-medium">Estimates</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="proposals" 
                  className="gap-2 rounded-xl px-3 py-2.5 h-auto data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo/25 transition-all duration-300 snap-start"
                >
                  <Briefcase className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline font-medium text-sm whitespace-nowrap">Proposals</span>
                  <span className="sm:hidden text-xs font-medium">Proposals</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="tickets" 
                  className="gap-2 rounded-xl px-3 py-2.5 h-auto data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo/25 transition-all duration-300 snap-start"
                >
                  <Ticket className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline font-medium text-sm whitespace-nowrap">Tickets</span>
                  <span className="sm:hidden text-xs font-medium">Tickets</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="contracts" 
                  className="gap-2 rounded-xl px-3 py-2.5 h-auto data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo/25 transition-all duration-300 snap-start"
                >
                  <FileSignature className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline font-medium text-sm whitespace-nowrap">Contracts</span>
                  <span className="sm:hidden text-xs font-medium">Contracts</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="subscriptions" 
                  className="gap-2 rounded-xl px-3 py-2.5 h-auto data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo/25 transition-all duration-300 snap-start"
                >
                  <CreditCard className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline font-medium text-sm whitespace-nowrap">Subscriptions</span>
                  <span className="sm:hidden text-xs font-medium">Subs</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="licenses" 
                  className="gap-2 rounded-xl px-3 py-2.5 h-auto data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo/25 transition-all duration-300 snap-start"
                >
                  <Package className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline font-medium text-sm whitespace-nowrap">Licenses</span>
                  <span className="sm:hidden text-xs font-medium">Licenses</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="notes" 
                  className="gap-2 rounded-xl px-3 py-2.5 h-auto data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo/25 transition-all duration-300 snap-start"
                >
                  <StickyNote className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline font-medium text-sm whitespace-nowrap">Notes</span>
                  <span className="sm:hidden text-xs font-medium">Notes</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="files" 
                  className="gap-2 rounded-xl px-3 py-2.5 h-auto data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo/25 transition-all duration-300 snap-start"
                >
                  <Paperclip className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline font-medium text-sm whitespace-nowrap">Files</span>
                  <span className="sm:hidden text-xs font-medium">Files</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="info" 
                  className="gap-2 rounded-xl px-3 py-2.5 h-auto data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo/25 transition-all duration-300 snap-start"
                >
                  <Info className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline font-medium text-sm whitespace-nowrap">Info</span>
                  <span className="sm:hidden text-xs font-medium">Info</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {tab === "projects" ? (
              <Button onClick={() => setOpenAddProject(true)} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Project
              </Button>
            ) : tab === "estimates" ? (
              <Button asChild size="sm" className="gap-2">
                <NavLink to={`/prospects/estimates?clientId=${encodeURIComponent(String(id || ""))}&add=1`}>
                  <Plus className="h-4 w-4" />
                  Add Estimate
                </NavLink>
              </Button>
            ) : tab === "licenses" ? (
              <Button onClick={() => setOpenAddLicense(true)} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add License
              </Button>
            ) : tab === "invoices" ? (
              <Button asChild size="sm" className="gap-2">
                <NavLink to={`/invoices?clientId=${encodeURIComponent(String(id || ""))}&add=1`}>
                  <Plus className="h-4 w-4" />
                  Add Invoice
                </NavLink>
              </Button>
            ) : tab === "contracts" ? (
              <Button asChild size="sm" className="gap-2">
                <NavLink to={`/sales/contracts`}>
                  <Plus className="h-4 w-4" />
                  Add Contract
                </NavLink>
              </Button>
            ) : tab === "subscriptions" ? (
              <Button asChild size="sm" className="gap-2">
                <NavLink to={`/subscriptions`}>
                  <Plus className="h-4 w-4" />
                  Add Subscription
                </NavLink>
              </Button>
            ) : tab === "proposals" ? (
              <Button asChild size="sm" className="gap-2">
                <NavLink to={`/prospects/proposals`}>
                  <Plus className="h-4 w-4" />
                  Add Proposal
                </NavLink>
              </Button>
            ) : tab === "tickets" ? (
              <Button asChild size="sm" className="gap-2">
                <NavLink to={`/tickets`}>
                  <Plus className="h-4 w-4" />
                  Add Ticket
                </NavLink>
              </Button>
            ) : tab === "tasks" ? (
              <Button onClick={() => setOpenAddTask(true)} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Task
              </Button>
            ) : null}
          </div>
        </div>

        {/* Add Project */}
        <Dialog open={openAddProject} onOpenChange={setOpenAddProject}>
          <DialogContent className="bg-card max-w-2xl" aria-describedby={undefined}>
            <DialogHeader><DialogTitle>Add project</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Title</Label>
                <Input value={projectForm.title} onChange={(e) => setProjectForm((p) => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Price</Label>
                <Input value={projectForm.price} onChange={(e) => setProjectForm((p) => ({ ...p, price: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Start</Label>
                <DatePicker value={projectForm.start} onChange={(v) => setProjectForm((p) => ({ ...p, start: v }))} placeholder="Pick start date" />
              </div>
              <div className="space-y-1">
                <Label>Deadline</Label>
                <DatePicker value={projectForm.deadline} onChange={(v) => setProjectForm((p) => ({ ...p, deadline: v }))} placeholder="Pick deadline" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Labels</Label>
                <Input value={projectForm.labels} onChange={(e) => setProjectForm((p) => ({ ...p, labels: e.target.value }))} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Description</Label>
                <Textarea value={projectForm.description} onChange={(e) => setProjectForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="sm:col-span-2 text-xs text-muted-foreground">Client: {client?.company || client?.person || "-"}</div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenAddProject(false)}>Close</Button>
              <Button onClick={createProject}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={openAddLicense} onOpenChange={setOpenAddLicense}>
          <DialogContent className="bg-card max-w-2xl" aria-describedby={undefined}>
            <DialogHeader><DialogTitle>Add license</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label>Product</Label>
                <Input value={licenseForm.product} onChange={(e) => setLicenseForm((p) => ({ ...p, product: e.target.value }))} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>License key</Label>
                <Input value={licenseForm.licenseKey} onChange={(e) => setLicenseForm((p) => ({ ...p, licenseKey: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Input value={licenseForm.status} onChange={(e) => setLicenseForm((p) => ({ ...p, status: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Issued at</Label>
                <DatePicker value={licenseForm.issuedAt} onChange={(v) => setLicenseForm((p) => ({ ...p, issuedAt: v }))} placeholder="Pick issue date" />
              </div>
              <div className="space-y-1">
                <Label>Expires at</Label>
                <DatePicker value={licenseForm.expiresAt} onChange={(v) => setLicenseForm((p) => ({ ...p, expiresAt: v }))} placeholder="Pick expiry date" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Note</Label>
                <Textarea value={licenseForm.note} onChange={(e) => setLicenseForm((p) => ({ ...p, note: e.target.value }))} />
              </div>
              <div className="sm:col-span-2 text-xs text-muted-foreground">Client: {client?.company || client?.person || "-"}</div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenAddLicense(false)}>Close</Button>
              <Button onClick={createLicense}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Estimate */}
        <Dialog open={openAddEstimate} onOpenChange={setOpenAddEstimate}>
          <DialogContent className="bg-card max-w-2xl" aria-describedby={undefined}>
            <DialogHeader><DialogTitle>Add estimate</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-12">
              <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Estimate date</div>
              <div className="sm:col-span-9">
                <DatePicker value={estimateForm.estimateDate} onChange={(v) => setEstimateForm((p) => ({ ...p, estimateDate: v }))} placeholder="Pick estimate date" />
              </div>

              <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Valid until</div>
              <div className="sm:col-span-9">
                <DatePicker value={estimateForm.validUntil} onChange={(v) => setEstimateForm((p) => ({ ...p, validUntil: v }))} placeholder="Pick valid until" />
              </div>

              <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Client</div>
              <div className="sm:col-span-9"><Input value={client?.company || client?.person || "-"} disabled /></div>

              <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">TAX</div>
              <div className="sm:col-span-9"><Input type="number" value={estimateForm.tax} onChange={(e) => setEstimateForm((p) => ({ ...p, tax: e.target.value }))} /></div>

              <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Second TAX</div>
              <div className="sm:col-span-9"><Input type="number" value={estimateForm.tax2} onChange={(e) => setEstimateForm((p) => ({ ...p, tax2: e.target.value }))} /></div>

              <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Note</div>
              <div className="sm:col-span-9"><Textarea value={estimateForm.note} onChange={(e) => setEstimateForm((p) => ({ ...p, note: e.target.value }))} /></div>

              <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Advanced Amount</div>
              <div className="sm:col-span-9"><Input type="number" value={estimateForm.advancedAmount} onChange={(e) => setEstimateForm((p) => ({ ...p, advancedAmount: e.target.value }))} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenAddEstimate(false)}>Close</Button>
              <Button onClick={createEstimate}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Event */}
        <Dialog open={openAddEvent} onOpenChange={setOpenAddEvent}>
          <DialogContent className="bg-card max-w-2xl" aria-describedby={undefined}>
            <DialogHeader><DialogTitle>Add event</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="space-y-1">
                <Label>Title</Label>
                <Input value={eventForm.title} onChange={(e) => setEventForm((p) => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea value={eventForm.description} onChange={(e) => setEventForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Start date</Label>
                    <DatePicker value={eventForm.date} onChange={(v) => setEventForm((p) => ({ ...p, date: v }))} placeholder="Pick date" />
                  </div>
                  <div className="space-y-1">
                    <Label>Start time</Label>
                    <Input type="time" value={eventForm.startTime} onChange={(e) => setEventForm((p) => ({ ...p, startTime: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>End date</Label>
                    <DatePicker value={eventForm.endDate} onChange={(v) => setEventForm((p) => ({ ...p, endDate: v }))} placeholder="Pick date" />
                  </div>
                  <div className="space-y-1">
                    <Label>End time</Label>
                    <Input type="time" value={eventForm.endTime} onChange={(e) => setEventForm((p) => ({ ...p, endTime: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Location</Label>
                  <Input value={eventForm.location} onChange={(e) => setEventForm((p) => ({ ...p, location: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Input value={eventForm.type} onChange={(e) => setEventForm((p) => ({ ...p, type: e.target.value }))} />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">Client: {client?.company || client?.person || "-"}</div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenAddEvent(false)}>Close</Button>
              <Button onClick={createEvent}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Task */}
        <Dialog open={openAddTask} onOpenChange={setOpenAddTask}>
          <DialogContent className="bg-card max-w-2xl" aria-describedby={undefined}>
            <DialogHeader><DialogTitle>Add task</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label>Title</Label>
                <Input value={taskForm.title} onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))} placeholder="Task title" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Description</Label>
                <Textarea value={taskForm.description} onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))} placeholder="Task description" />
              </div>
              <div className="space-y-1">
                <Label>Project</Label>
                <Select value={taskForm.projectId || undefined} onValueChange={(v) => setTaskForm((p) => ({ ...p, projectId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    {projects.length === 0 ? (
                      <SelectItem value="none" disabled>No projects</SelectItem>
                    ) : (
                      projects.map((p: any) => (
                        <SelectItem key={String(p._id)} value={String(p._id)}>{p.title}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={taskForm.status} onValueChange={(v) => setTaskForm((p) => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select value={taskForm.priority} onValueChange={(v) => setTaskForm((p) => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Due Date</Label>
                <DatePicker value={taskForm.dueDate} onChange={(v) => setTaskForm((p) => ({ ...p, dueDate: v }))} placeholder="Pick due date" />
              </div>
              <div className="sm:col-span-2 text-xs text-muted-foreground">Client: {client?.company || client?.person || "-"}</div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenAddTask(false)}>Close</Button>
              <Button onClick={createTask}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <TabsContent value="contacts">
          <Card className="p-0 overflow-hidden rounded-xl border-0 shadow-sm">
            <div className="p-4 border-b bg-muted/30">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Primary Contact
              </h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-[200px]">Name</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="hover:bg-muted/20">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      {client.avatar ? (
                        <img src={`${API_BASE}${client.avatar}`} alt="avatar" className="w-10 h-10 rounded-full object-cover border-2 border-background shadow-sm" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                          {(client.person || client.firstName || "C").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <NavLink to={`/clients/${id}/primary-contact`} className="text-primary hover:underline">
                        {client.person || client.firstName || "-"}
                      </NavLink>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{client.jobTitle || "Primary contact"}</TableCell>
                  <TableCell>
                    <a href={`mailto:${client.email}`} className="text-primary hover:underline flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {client.email || "-"}
                    </a>
                  </TableCell>
                  <TableCell>
                    {client.phone ? (
                      <a href={`tel:${client.phone}`} className="text-primary hover:underline flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {client.phone}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="info">
          <Card className="p-6 rounded-xl border-0 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Info className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Client Information</h3>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Type</Label>
                <Input value={form.type === "person" ? "Individual" : "Organization"} disabled className="bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Company</Label>
                <Input value={form.company || ""} onChange={(e) => setForm((s: any) => ({ ...s, company: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Contact Person</Label>
                <Input value={form.person || ""} onChange={(e) => setForm((s: any) => ({ ...s, person: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Email</Label>
                <Input type="email" value={form.email || ""} onChange={(e) => setForm((s: any) => ({ ...s, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Phone</Label>
                <Input value={form.phone || ""} onChange={(e) => setForm((s: any) => ({ ...s, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Website</Label>
                <Input value={form.website || ""} onChange={(e) => setForm((s: any) => ({ ...s, website: e.target.value }))} />
              </div>
              <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Address</Label>
                <Textarea value={form.address || ""} onChange={(e) => setForm((s: any) => ({ ...s, address: e.target.value }))} rows={2} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">City</Label>
                <Input value={form.city || ""} onChange={(e) => setForm((s: any) => ({ ...s, city: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">State</Label>
                <Input value={form.state || ""} onChange={(e) => setForm((s: any) => ({ ...s, state: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Zip</Label>
                <Input value={form.zip || ""} onChange={(e) => setForm((s: any) => ({ ...s, zip: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Country</Label>
                <Select value={form.country || ""} onValueChange={(value) => setForm((s: any) => ({ ...s, country: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Labels</Label>
                <Input value={(form.labels || []).join(", ")} onChange={(e) => setForm((s: any) => ({ ...s, labels: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) }))} placeholder="Separate with commas" />
              </div>
            </div>
            <div className="flex justify-end mt-6 pt-6 border-t">
              <Button onClick={saveInfo} className="gap-2">
                Save Changes
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="projects">
          <Card className="p-0 overflow-hidden rounded-xl border-0 shadow-sm">
            <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-primary" />
                Projects
              </h3>
              <Badge variant="secondary">{projects.length} total</Badge>
            </div>
            {projects.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <FolderKanban className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-lg">No projects yet</h3>
                <p className="text-muted-foreground text-sm mt-1 mb-4">Get started by creating your first project</p>
                <Button onClick={() => setOpenAddProject(true)} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Project
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="w-12">ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(Array.isArray(projects) ? projects : []).map((p:any, idx: number)=> (
                    <TableRow
                      key={String(p._id)}
                      className="hover:bg-muted/20 cursor-pointer transition-colors"
                      onClick={() => {
                        const pid = String(p?._id || "");
                        if (pid) navigate(`/projects/overview/${encodeURIComponent(pid)}`);
                      }}
                    >
                      <TableCell className="text-muted-foreground font-mono text-sm">{idx + 1}</TableCell>
                      <TableCell className="font-medium text-primary">{p.title}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === "Open" ? "default" : "secondary"} className="text-xs">
                          {p.status || "Open"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{p.price ? `PKR ${p.price.toLocaleString()}` : "PKR 0"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="estimates">
          <Card className="p-0 overflow-hidden rounded-xl border-0 shadow-sm">
            <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <FileSignature className="h-4 w-4 text-primary" />
                Estimates
              </h3>
              <Badge variant="secondary">{estimates.length} total</Badge>
            </div>
            {estimates.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <FileSignature className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-lg">No estimates yet</h3>
                <p className="text-muted-foreground text-sm mt-1 mb-4">Create an estimate for this client</p>
                <Button asChild size="sm">
                  <NavLink to={`/prospects/estimates?clientId=${encodeURIComponent(String(id || ""))}&add=1`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Estimate
                  </NavLink>
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead>#</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Estimate date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estimates.map((e: any) => (
                      <TableRow key={String(e._id)} className="hover:bg-muted/20">
                        <TableCell className="font-medium">
                          <NavLink to={`/prospects/estimates/${e._id}`} className="text-primary hover:underline">
                            {e.number}
                          </NavLink>
                        </TableCell>
                        <TableCell className="text-right font-medium">{e.amount ? `PKR ${e.amount.toLocaleString()}` : "PKR 0"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{e.status || "-"}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{e.estimateDate ? new Date(e.estimateDate).toLocaleDateString() : "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card className="p-0 overflow-hidden rounded-xl border-0 shadow-sm">
            <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-primary" />
                Tasks
              </h3>
              <Badge variant="secondary">{tasks.length} total</Badge>
            </div>
            {tasks.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <CheckSquare className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-lg">No tasks found</h3>
                <p className="text-muted-foreground text-sm mt-1">Tasks will appear here when added to projects</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((t: any) => (
                    <TableRow key={String(t._id)} className="hover:bg-muted/20">
                      <TableCell className="font-medium">{t.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">{t.status || "todo"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={t.priority === "high" || t.priority === "urgent" ? "destructive" : "secondary"}
                          className="text-xs capitalize"
                        >
                          {t.priority || "medium"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{t.projectTitle || "-"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Notes clientId={id} />
        </TabsContent>

        <TabsContent value="files">
          <Files clientId={id} />
        </TabsContent>

        <TabsContent value="expenses">
          <Card className="p-0 overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((ex: any) => (
                  <TableRow key={String(ex._id)}>
                    <TableCell className="whitespace-nowrap">{ex.title}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{ex.category}</TableCell>
                    <TableCell className="whitespace-nowrap">{ex.amount ? `PKR ${ex.amount}` : 'PKR 0'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Invoices */}
        <TabsContent value="invoices">
          <Card className="p-0 overflow-hidden rounded-xl border-0 shadow-sm">
            <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Invoices
              </h3>
              <Badge variant="secondary">{invoices.length} total</Badge>
            </div>
            {invoices.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-lg">No invoices yet</h3>
                <p className="text-muted-foreground text-sm mt-1 mb-4">Create your first invoice for this client</p>
                <Button asChild size="sm">
                  <NavLink to={`/invoices?clientId=${encodeURIComponent(String(id || ""))}&add=1`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Invoice
                  </NavLink>
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead>Invoice #</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Issue date</TableHead>
                      <TableHead>Due date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv: any) => (
                      <TableRow key={String(inv._id)} className="hover:bg-muted/20">
                        <TableCell className="font-medium">
                          <NavLink to={`/invoices/${encodeURIComponent(String(inv._id || ""))}`} className="text-primary hover:underline">
                            {inv.number}
                          </NavLink>
                        </TableCell>
                        <TableCell className="text-right font-medium">{inv.amount ? `PKR ${inv.amount.toLocaleString()}` : 'PKR 0'}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={inv.status === "Paid" ? "default" : inv.status === "Overdue" ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            {inv.status || 'Unpaid'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : '-'}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="licenses">
          <Card className="p-0 overflow-hidden rounded-xl border-0 shadow-sm">
            <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Licenses
              </h3>
              <Badge variant="secondary">{licenses.length} total</Badge>
            </div>
            {licenses.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-lg">No licenses yet</h3>
                <p className="text-muted-foreground text-sm mt-1 mb-4">Add product licenses for this client</p>
                <Button onClick={() => setOpenAddLicense(true)} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add License
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead>Product</TableHead>
                    <TableHead>License key</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {licenses.map((l: any) => (
                    <TableRow key={String(l._id)} className="hover:bg-muted/20">
                      <TableCell className="font-medium">{l.product || "-"}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{l.licenseKey || "-"}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={l.status === "active" ? "default" : "secondary"}
                          className="text-xs capitalize"
                        >
                          {l.status || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{l.issuedAt ? new Date(l.issuedAt).toLocaleDateString() : "-"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{l.expiresAt ? new Date(l.expiresAt).toLocaleDateString() : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* Payments */}
        <TabsContent value="payments">
          <Card className="p-0 overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p: any) => (
                  <TableRow key={String(p._id)}>
                    <TableCell className="whitespace-nowrap">{p.invoiceId || '-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{p.date ? new Date(p.date).toISOString().slice(0, 10) : '-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{p.method || '-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{p.note || '-'}</TableCell>
                    <TableCell className="whitespace-nowrap">{p.amount ? `PKR ${p.amount}` : 'PKR 0'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Estimate Requests */}
        <TabsContent value="estimate-requests">
          <Card className="p-0 overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Title</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estimateRequests.map((r: any) => (
                  <TableRow key={String(r._id)}>
                    <TableCell className="whitespace-nowrap">{r.title}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.amount ? `PKR ${r.amount}` : 'PKR 0'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{r.status || '-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{r.requestDate ? new Date(r.requestDate).toISOString().slice(0, 10) : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Orders */}
        <TabsContent value="orders">
          <Card className="p-0 overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Order date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o: any) => (
                  <TableRow key={String(o._id)}>
                    <TableCell className="whitespace-nowrap">{o.amount ? `PKR ${o.amount}` : 'PKR 0'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{o.status || '-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{o.orderDate ? new Date(o.orderDate).toISOString().slice(0, 10) : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Contracts */}
        <TabsContent value="contracts">
          <Card className="p-0 overflow-hidden rounded-xl border">
            <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Contracts
              </h3>
              <Badge variant="secondary">{contracts.length} total</Badge>
            </div>
            {contracts.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-lg">No contracts yet</h3>
                <p className="text-muted-foreground text-sm mt-1 mb-4">Contract documents will appear here</p>
                <Button asChild size="sm">
                  <NavLink to={`/sales/contracts`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Contract
                  </NavLink>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Title</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Contract date</TableHead>
                    <TableHead>Valid until</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((c: any) => (
                    <TableRow key={String(c._id)} className="cursor-pointer hover:bg-muted/20" onClick={() => navigate(`/sales/contracts/${c._id}`)}>
                      <TableCell className="font-medium whitespace-nowrap">{c.title}</TableCell>
                      <TableCell className="whitespace-nowrap">{c.amount ? `PKR ${c.amount.toLocaleString()}` : 'PKR 0'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{c.status || '-'}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground text-sm">{c.contractDate ? new Date(c.contractDate).toISOString().slice(0, 10) : '-'}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground text-sm">{c.validUntil ? new Date(c.validUntil).toISOString().slice(0, 10) : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* Proposals */}
        <TabsContent value="proposals">
          <Card className="p-0 overflow-hidden rounded-xl border">
            <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Proposals
              </h3>
              <Badge variant="secondary">{proposals.length} total</Badge>
            </div>
            {proposals.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-lg">No proposals yet</h3>
                <p className="text-muted-foreground text-sm mt-1 mb-4">Project proposals will appear here</p>
                <Button asChild size="sm">
                  <NavLink to={`/prospects/proposals`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Proposal
                  </NavLink>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Title</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Proposal date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proposals.map((pr: any) => (
                    <TableRow key={String(pr._id)} className="cursor-pointer hover:bg-muted/20" onClick={() => navigate(`/prospects/proposals/${pr._id}`)}>
                      <TableCell className="font-medium whitespace-nowrap">{pr.title}</TableCell>
                      <TableCell className="whitespace-nowrap">{pr.amount ? `PKR ${pr.amount.toLocaleString()}` : 'PKR 0'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{pr.status || '-'}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground text-sm">{pr.proposalDate ? new Date(pr.proposalDate).toISOString().slice(0, 10) : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* Tickets */}
        <TabsContent value="tickets">
          <Card className="p-0 overflow-hidden rounded-xl border-0 shadow-sm">
            <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Ticket className="h-4 w-4 text-primary" />
                Support Tickets
              </h3>
              <Badge variant="secondary">{tickets.length} total</Badge>
            </div>
            {tickets.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Ticket className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-lg">No tickets yet</h3>
                <p className="text-muted-foreground text-sm mt-1 mb-4">Support tickets will appear here</p>
                <Button asChild size="sm">
                  <NavLink to={`/tickets`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Ticket
                  </NavLink>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Assigned to</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((t: any) => (
                    <TableRow key={String(t._id)} className="hover:bg-muted/20">
                      <TableCell className="font-medium">{t.title}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{t.type || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{t.assignedTo || "-"}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={t.status === "open" ? "default" : t.status === "closed" ? "secondary" : "outline"}
                          className="text-xs capitalize"
                        >
                          {t.status || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{t.lastActivity ? new Date(t.lastActivity).toLocaleDateString() : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* Events */}
        <TabsContent value="events">
          <Card className="p-0 overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Title</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((ev: any) => (
                  <TableRow key={String(ev._id)}>
                    <TableCell className="whitespace-nowrap">{ev.title}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{ev.start ? new Date(ev.start).toISOString().slice(0, 10) : '-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{ev.end ? new Date(ev.end).toISOString().slice(0, 10) : '-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{ev.type || '-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{ev.location || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Subscriptions */}
        <TabsContent value="subscriptions">
          <Card className="p-0 overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Title</TableHead>
                  <TableHead>Next billing</TableHead>
                  <TableHead>Repeat every</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((s: any) => (
                  <TableRow key={String(s._id)}>
                    <TableCell className="whitespace-nowrap">{s.title}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{s.nextBillingDate ? new Date(s.nextBillingDate).toISOString().slice(0, 10) : '-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{s.repeatEvery || '-'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{s.status || '-'}</TableCell>
                    <TableCell className="whitespace-nowrap">{s.amount ? `PKR ${s.amount}` : 'PKR 0'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}

function Stat({ title, value, color, icon }: { title: string; value: any; color: string; icon?: React.ReactNode }) {
  return (
    <Card className="p-3 sm:p-4 border-0 shadow-sm bg-white dark:bg-card hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} text-white flex items-center justify-center shrink-0 shadow-sm`}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground uppercase tracking-wide truncate">{title}</div>
          <div className="text-lg sm:text-xl font-bold truncate">{value}</div>
        </div>
      </div>
    </Card>
  );
}

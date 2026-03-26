import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Check, CheckCircle2, ChevronsUpDown, Edit, MoreHorizontal, Plus, RefreshCw, Search, Settings, Tags, Trash2, Paperclip, Mic, Ticket, Clock, AlertCircle, CheckCircle, BarChart3, CalendarDays } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { DatePicker } from "@/components/ui/date-picker";

type ClientDoc = { _id: string; company?: string; person?: string };
type EmployeeDoc = { _id: string; name?: string; email?: string };
type TicketLabelDoc = { _id: string; name: string; color?: string };

type TicketDoc = {
  _id: string;
  ticketNo?: number;
  clientId?: string;
  client?: string;
  title: string;
  description?: string;
  requestedBy?: string;
  type?: string;
  labels?: string[];
  assignedTo?: string;
  status?: string;
  lastActivity?: string;
  createdAt?: string;
  startDate?: string;
  endDate?: string;
};

const clientDisplayName = (c: ClientDoc) => c.company || c.person || "Unnamed";
const employeeDisplayName = (e: EmployeeDoc) => e.name || e.email || "Unnamed";

export default function Tickets() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("list");
  const [query, setQuery] = useState("");
  const [client, setClient] = useState("-");
  const [type, setType] = useState("-");
  const [label, setLabel] = useState("-");
  const [assigned, setAssigned] = useState("-");
  const [created, setCreated] = useState("-");
  const [status, setStatus] = useState("Status");

  const [clients, setClients] = useState<ClientDoc[]>([]);
  const [employees, setEmployees] = useState<EmployeeDoc[]>([]);
  const [ticketLabels, setTicketLabels] = useState<TicketLabelDoc[]>([]);
  const [tickets, setTickets] = useState<TicketDoc[]>([]);
  const [loading, setLoading] = useState(false);

  const [openAddTicket, setOpenAddTicket] = useState(false);
  const [openManageLabels, setOpenManageLabels] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketDoc | null>(null);

  const [selectedColor, setSelectedColor] = useState<string>("#4F46E5");
  const [newLabelName, setNewLabelName] = useState("");

  const [ticketTitle, setTicketTitle] = useState("");
  const [ticketClientId, setTicketClientId] = useState("-");
  const [ticketClientOpen, setTicketClientOpen] = useState(false);
  const [ticketClientSearch, setTicketClientSearch] = useState("");

  const [ticketRequestedByOpen, setTicketRequestedByOpen] = useState(false);
  const [ticketRequestedBySearch, setTicketRequestedBySearch] = useState("");
  const [ticketRequestedBy, setTicketRequestedBy] = useState("-");

  const [ticketType, setTicketType] = useState("general");
  const [ticketDescription, setTicketDescription] = useState("");

  const [ticketAssignedOpen, setTicketAssignedOpen] = useState(false);
  const [ticketAssignedSearch, setTicketAssignedSearch] = useState("");
  const [ticketAssignedTo, setTicketAssignedTo] = useState("-");

  const [ticketLabelOpen, setTicketLabelOpen] = useState(false);
  const [ticketLabelSearch, setTicketLabelSearch] = useState("");
  const [ticketLabel, setTicketLabel] = useState("-");

  const [ticketStartDate, setTicketStartDate] = useState("");
  const [ticketEndDate, setTicketEndDate] = useState("");

  const labelColorByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of ticketLabels) {
      if (l?.name) m.set(l.name, l.color || "#4F46E5");
    }
    return m;
  }, [ticketLabels]);

  const loadClients = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/clients`, { headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load clients");
      setClients(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load clients");
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/employees`, { headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load employees");
      setEmployees(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load employees");
    }
  };

  const loadTicketLabels = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/ticket-labels`, { headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load labels");
      setTicketLabels(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load labels");
    }
  };

  const loadTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (client !== "-") params.set("clientId", client);
      const res = await fetch(`${API_BASE}/api/tickets?${params.toString()}`, { headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load tickets");
      setTickets(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
    loadEmployees();
    loadTicketLabels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, client]);

  const clearFilters = () => {
    setQuery("");
    setClient("-");
    setType("-");
    setLabel("-");
    setAssigned("-");
    setCreated("-");
    setStatus("Status");
  };

  const resetTicketForm = () => {
    setTicketTitle("");
    setTicketClientId("-");
    setTicketClientOpen(false);
    setTicketClientSearch("");

    setTicketRequestedByOpen(false);
    setTicketRequestedBySearch("");
    setTicketRequestedBy("-");

    setTicketType("general");
    setTicketDescription("");

    setTicketAssignedOpen(false);
    setTicketAssignedSearch("");
    setTicketAssignedTo("-");

    setTicketLabelOpen(false);
    setTicketLabelSearch("");
    setTicketLabel("-");

    setTicketStartDate("");
    setTicketEndDate("");

    setEditingTicket(null);
  };

  const openEditTicket = (t: TicketDoc) => {
    setEditingTicket(t);
    setTicketTitle(t.title || "");
    setTicketClientId(t.clientId || "-");
    setTicketRequestedBy(t.requestedBy || "-");
    setTicketType(t.type || "general");
    setTicketDescription(t.description || "");
    setTicketAssignedTo(t.assignedTo || "-");
    setTicketLabel((t.labels || [])[0] || "-");
    setTicketStartDate(t.startDate || "");
    setTicketEndDate(t.endDate || "");
    setOpenAddTicket(true);
  };

  const saveTicket = async () => {
    const title = ticketTitle.trim();
    if (!title) {
      toast.error("Title is required");
      return;
    }
    const clientDoc = clients.find((c) => c._id === ticketClientId);
    const payload: any = {
      title,
      description: ticketDescription || "",
      type: ticketType || "general",
      assignedTo: ticketAssignedTo !== "-" ? ticketAssignedTo : "",
      requestedBy: ticketRequestedBy !== "-" ? ticketRequestedBy : "",
      status: "open",
      lastActivity: new Date().toISOString(),
      startDate: ticketStartDate || undefined,
      endDate: ticketEndDate || undefined,
    };
    if (ticketClientId !== "-") {
      payload.clientId = ticketClientId;
      payload.client = clientDoc ? clientDisplayName(clientDoc) : "";
    }
    if (ticketLabel !== "-") payload.labels = [ticketLabel];
    try {
      const isEdit = Boolean(editingTicket?._id);
      const url = isEdit ? `${API_BASE}/api/tickets/${editingTicket!._id}` : `${API_BASE}/api/tickets`;
      const method = isEdit ? "PUT" : "POST";

      if (isEdit) {
        payload.status = editingTicket?.status || payload.status;
      }

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || (isEdit ? "Failed to update ticket" : "Failed to create ticket"));
      toast.success(isEdit ? "Ticket updated" : "Ticket saved");
      setOpenAddTicket(false);
      resetTicketForm();
      await loadTickets();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save ticket");
    }
  };

  const setTicketStatus = async (t: TicketDoc, nextStatus: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/tickets/${t._id}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status: nextStatus, lastActivity: new Date().toISOString() }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to update status");
      toast.success("Status updated");
      await loadTickets();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update status");
    }
  };

  const deleteTicket = async (id: string) => {
    const ok = window.confirm("Delete this ticket?");
    if (!ok) return;
    try {
      const res = await fetch(`${API_BASE}/api/tickets/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to delete");
      toast.success("Ticket deleted");
      await loadTickets();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete");
    }
  };

  const addTicketLabel = async () => {
    const name = newLabelName.trim();
    if (!name) return;
    try {
      const res = await fetch(`${API_BASE}/api/ticket-labels`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ name, color: selectedColor }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      toast.success("Label created");
      setNewLabelName("");
      await loadTicketLabels();
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    }
  };

  const deleteTicketLabel = async (id: string) => {
    const ok = window.confirm("Delete this label?");
    if (!ok) return;
    try {
      const res = await fetch(`${API_BASE}/api/ticket-labels/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      toast.success("Label deleted");
      await loadTicketLabels();
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    }
  };

  // Dashboard stats computed from tickets
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const created = new Date(t.createdAt || 0);
      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (created < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (created > to) return false;
      }
      return true;
    });
  }, [tickets, dateFrom, dateTo]);

  const ticketStats = useMemo(() => {
    const total = filteredTickets.length;
    const open = filteredTickets.filter(t => t.status === "Open" || t.status === "open").length;
    const resolved = filteredTickets.filter(t => t.status === "Resolved" || t.status === "resolved").length;
    const closed = filteredTickets.filter(t => t.status === "Closed" || t.status === "closed").length;
    const inProgress = filteredTickets.filter(t => t.status === "In Progress" || t.status === "in progress").length;
    const unassigned = filteredTickets.filter(t => !t.assignedTo).length;
    return { total, open, resolved, closed, inProgress, unassigned };
  }, [filteredTickets]);

  const statusChartData = useMemo(() => [
    { name: "Open", value: ticketStats.open, color: "#f59e0b" },
    { name: "In Progress", value: ticketStats.inProgress, color: "#3b82f6" },
    { name: "Resolved", value: ticketStats.resolved, color: "#10b981" },
    { name: "Closed", value: ticketStats.closed, color: "#6b7280" },
  ].filter(d => d.value > 0), [ticketStats]);

  const setPresetRange = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    setDateTo(to.toISOString().split('T')[0]);
    setDateFrom(from.toISOString().split('T')[0]);
  };

  const clearDateFilter = () => {
    setDateFrom("");
    setDateTo("");
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Date Range Filter */}
      <Card className="border-slate-200 bg-gradient-to-br from-white to-slate-50/50">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <CalendarDays className="w-4 h-4" />
              Date Range
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <div className="flex-1">
                <label className="text-xs text-slate-500 mb-1 block">From</label>
                <DatePicker 
                  value={dateFrom} 
                  onChange={setDateFrom} 
                  placeholder="Start date"
                  className="w-full"
                />
              </div>
              <div className="flex items-center justify-center sm:pt-5">
                <span className="text-slate-400">→</span>
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-500 mb-1 block">To</label>
                <DatePicker 
                  value={dateTo} 
                  onChange={setDateTo} 
                  placeholder="End date"
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setPresetRange(7)}>Last 7 days</Button>
              <Button variant="outline" size="sm" onClick={() => setPresetRange(30)}>Last 30 days</Button>
              <Button variant="outline" size="sm" onClick={() => setPresetRange(90)}>Last 90 days</Button>
              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" onClick={clearDateFilter} className="text-rose-500 hover:text-rose-600">
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-amber-600 uppercase">Total Tickets</p>
                <p className="text-2xl font-bold text-amber-700">{ticketStats.total}</p>
              </div>
              <Ticket className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 uppercase">Open</p>
                <p className="text-2xl font-bold text-blue-700">{ticketStats.open}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-600 uppercase">Resolved</p>
                <p className="text-2xl font-bold text-emerald-700">{ticketStats.resolved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100/50 border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase">Closed</p>
                <p className="text-2xl font-bold text-slate-700">{ticketStats.closed}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-slate-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-rose-600 uppercase">Unassigned</p>
                <p className="text-2xl font-bold text-rose-700">{ticketStats.unassigned}</p>
              </div>
              <Clock className="w-8 h-8 text-rose-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution Chart */}
      {statusChartData.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Ticket Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="h-40 w-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      innerRadius={30}
                      outerRadius={55}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3">
                {statusChartData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-slate-600">
                      {item.name}: <span className="font-semibold">{item.value}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold">Tickets</h1>
        <div className="flex items-center gap-2">
          {/* Manage labels dialog */}
          <Dialog open={openManageLabels} onOpenChange={setOpenManageLabels}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2"><Tags className="w-4 h-4"/> Manage labels</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Manage labels</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    "#84cc16","#22c55e","#14b8a6","#06b6d4","#cbd5e1",
                    "#f97316","#f59e0b","#ef4444","#ec4899","#c026d3",
                    "#0ea5e9","#475569","#2563eb","#8b5cf6","#d8b4fe",
                  ].map((c, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedColor(c)}
                      className={`h-6 w-6 rounded-full border ${selectedColor===c?"ring-2 ring-offset-2 ring-primary":""}`}
                      style={{ backgroundColor: c }}
                      aria-label={`color-${i}`}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  <Label className="md:text-right text-muted-foreground">Label</Label>
                  <Input placeholder="Label" className="md:col-span-4" value={newLabelName} onChange={(e) => setNewLabelName(e.target.value)} />
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Label</TableHead>
                        <TableHead>Color</TableHead>
                        <TableHead className="w-24"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ticketLabels.length ? (
                        ticketLabels.map((l) => (
                          <TableRow key={l._id}>
                            <TableCell className="font-medium">{l.name}</TableCell>
                            <TableCell>
                              <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: l.color || "#4F46E5" }} />
                            </TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm" onClick={() => deleteTicketLabel(l._id)}>Delete</Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">No labels</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setOpenManageLabels(false)}>Close</Button>
                <Button onClick={addTicketLabel}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Settings dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2"><Settings className="w-4 h-4"/> Settings</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Settings</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
                <Label className="md:text-right pt-2 text-muted-foreground">Signature</Label>
                <Textarea placeholder="Signature" className="md:col-span-4 min-h-[120px]" />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline">Close</Button>
                <Button>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add ticket dialog */}
          <Dialog
            open={openAddTicket}
            onOpenChange={(o) => {
              setOpenAddTicket(o);
              if (!o) resetTicketForm();
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2"><Plus className="w-4 h-4"/> Add ticket</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTicket ? "Edit ticket" : "Add ticket"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  <Label className="md:text-right text-muted-foreground">Title</Label>
                  <Input placeholder="Title" className="md:col-span-4" value={ticketTitle} onChange={(e) => setTicketTitle(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  <Label className="md:text-right text-muted-foreground">Client</Label>
                  <div className="md:col-span-4">
                    <Popover open={ticketClientOpen} onOpenChange={setTicketClientOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={ticketClientOpen}
                          className="w-full justify-between"
                        >
                          {ticketClientId !== "-" && clients.find((c) => c._id === ticketClientId)
                            ? clientDisplayName(clients.find((c) => c._id === ticketClientId)!)
                            : "-"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command>
                          <CommandInput 
                            placeholder="Search client..." 
                            value={ticketClientSearch}
                            onValueChange={setTicketClientSearch}
                          />
                          <CommandList>
                            <CommandGroup>
                              <CommandItem
                                value="-"
                                onSelect={() => {
                                  setTicketClientId("-");
                                  setTicketClientSearch("");
                                  setTicketClientOpen(false);
                                }}
                              >
                                <Check className={`mr-2 h-4 w-4 ${ticketClientId === "-" ? "opacity-100" : "opacity-0"}`} />
                                -
                              </CommandItem>
                              {clients
                                .map((c) => {
                                const label = clientDisplayName(c);
                                const selected = ticketClientId === c._id;
                                return (
                                  <CommandItem
                                    key={c._id}
                                    value={label}
                                    onSelect={() => {
                                      setTicketClientId(c._id);
                                      setTicketClientSearch("");
                                      setTicketClientOpen(false);
                                    }}
                                  >
                                    <Check className={`mr-2 h-4 w-4 ${selected ? "opacity-100" : "opacity-0"}`} />
                                    {label}
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                            {clients.length === 0 && String(ticketClientSearch || "").trim() ? (
                              <CommandEmpty>No client found.</CommandEmpty>
                            ) : null}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  <Label className="md:text-right text-muted-foreground">Requested by</Label>
                  <div className="md:col-span-4">
                    <Popover open={ticketRequestedByOpen} onOpenChange={setTicketRequestedByOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={ticketRequestedByOpen}
                          className="w-full justify-between"
                        >
                          {ticketRequestedBy !== "-" ? ticketRequestedBy : "-"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command>
                          <CommandInput 
                            placeholder="Search client..." 
                            value={ticketRequestedBySearch}
                            onValueChange={setTicketRequestedBySearch}
                          />
                          <CommandList>
                            <CommandGroup>
                              <CommandItem
                                value="-"
                                onSelect={() => {
                                  setTicketRequestedBy("-");
                                  setTicketRequestedBySearch("");
                                  setTicketRequestedByOpen(false);
                                }}
                              >
                                <Check className={`mr-2 h-4 w-4 ${ticketRequestedBy === "-" ? "opacity-100" : "opacity-0"}`} />
                                -
                              </CommandItem>
                              {employees
                                .map((e) => {
                                  const label = employeeDisplayName(e);
                                  const selected = ticketRequestedBy === label;
                                  return (
                                    <CommandItem
                                      key={e._id}
                                      value={label}
                                      onSelect={() => {
                                        setTicketRequestedBy(label);
                                        setTicketRequestedBySearch("");
                                        setTicketRequestedByOpen(false);
                                      }}
                                    >
                                      <Check className={`mr-2 h-4 w-4 ${selected ? "opacity-100" : "opacity-0"}`} />
                                      {label}
                                    </CommandItem>
                                  );
                                })}
                            </CommandGroup>
                            {employees.length === 0 && String(ticketRequestedBySearch || "").trim() ? (
                              <CommandEmpty>No employee found.</CommandEmpty>
                            ) : null}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  <Label className="md:text-right text-muted-foreground">Ticket type</Label>
                  <Select value={ticketType} onValueChange={setTicketType}>
                    <SelectTrigger className="md:col-span-4"><SelectValue placeholder="General Support"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Support</SelectItem>
                      <SelectItem value="billing">Billing</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
                  <Label className="md:text-right pt-2 text-muted-foreground">Description</Label>
                  <Textarea placeholder="Description" className="md:col-span-4 min-h-[120px]" value={ticketDescription} onChange={(e) => setTicketDescription(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  <Label className="md:text-right text-muted-foreground">Assign to</Label>
                  <div className="md:col-span-4">
                    <Popover open={ticketAssignedOpen} onOpenChange={setTicketAssignedOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={ticketAssignedOpen}
                          className="w-full justify-between"
                        >
                          {ticketAssignedTo !== "-" ? ticketAssignedTo : "-"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command>
                          <CommandInput 
                            placeholder="Search employee..." 
                            value={ticketAssignedSearch}
                            onValueChange={setTicketAssignedSearch}
                          />
                          <CommandList>
                            <CommandGroup>
                              <CommandItem
                                value="-"
                                onSelect={() => {
                                  setTicketAssignedTo("-");
                                  setTicketAssignedSearch("");
                                  setTicketAssignedOpen(false);
                                }}
                              >
                                <Check className={`mr-2 h-4 w-4 ${ticketAssignedTo === "-" ? "opacity-100" : "opacity-0"}`} />
                                -
                              </CommandItem>
                              {employees
                                .map((e) => {
                                  const label = employeeDisplayName(e);
                                  const selected = ticketAssignedTo === label;
                                  return (
                                    <CommandItem
                                      key={e._id}
                                      value={label}
                                      onSelect={() => {
                                        setTicketAssignedTo(label);
                                        setTicketAssignedSearch("");
                                        setTicketAssignedOpen(false);
                                      }}
                                    >
                                      <Check className={`mr-2 h-4 w-4 ${selected ? "opacity-100" : "opacity-0"}`} />
                                      {label}
                                    </CommandItem>
                                  );
                                })}
                            </CommandGroup>
                            {employees.length === 0 && String(ticketAssignedSearch || "").trim() ? (
                              <CommandEmpty>No employee found.</CommandEmpty>
                            ) : null}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  <Label className="md:text-right text-muted-foreground">Labels</Label>
                  <div className="md:col-span-4">
                    <Popover open={ticketLabelOpen} onOpenChange={setTicketLabelOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={ticketLabelOpen}
                          className="w-full justify-between"
                        >
                          {ticketLabel !== "-" ? ticketLabel : "-"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command>
                          <CommandInput 
                            placeholder="Search label..." 
                            autoComplete="off" 
                            value={ticketLabelSearch}
                            onValueChange={setTicketLabelSearch}
                          />
                          <CommandList>
                            <CommandGroup>
                              <CommandItem
                                value="-"
                                onSelect={() => {
                                  setTicketLabel("-");
                                  setTicketLabelSearch("");
                                  setTicketLabelOpen(false);
                                }}
                              >
                                <Check className={`mr-2 h-4 w-4 ${ticketLabel === "-" ? "opacity-100" : "opacity-0"}`} />
                                -
                              </CommandItem>
                              {ticketLabels
                                .map((l) => {
                                  const label = String(l?.name || "").trim();
                                  const selected = ticketLabel === label;
                                  return (
                                    <CommandItem
                                      key={l._id}
                                      value={label}
                                      onSelect={() => {
                                        setTicketLabel(label);
                                        setTicketLabelSearch("");
                                        setTicketLabelOpen(false);
                                      }}
                                    >
                                      <Check className={`mr-2 h-4 w-4 ${selected ? "opacity-100" : "opacity-0"}`} />
                                      {label}
                                    </CommandItem>
                                  );
                                })}
                            </CommandGroup>
                            {!ticketLabels.length && !String(ticketLabelSearch || "").trim() ? (
                              <CommandEmpty>No labels available.</CommandEmpty>
                            ) : null}
                            {ticketLabels.length === 0 && String(ticketLabelSearch || "").trim() ? (
                              <CommandEmpty>No label found.</CommandEmpty>
                            ) : null}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  <Label className="md:text-right text-muted-foreground">Timeline</Label>
                  <div className="md:col-span-4 flex items-center gap-3">
                    <DatePicker 
                      value={ticketStartDate} 
                      onChange={setTicketStartDate} 
                      placeholder="Start date"
                      className="flex-1"
                    />
                    <span className="text-slate-400">to</span>
                    <DatePicker 
                      value={ticketEndDate} 
                      onChange={setTicketEndDate} 
                      placeholder="Due date"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="gap-2"><Paperclip className="w-4 h-4"/> Upload File</Button>
                  <Button variant="outline" size="icon" aria-label="voice"><Mic className="w-4 h-4"/></Button>
                </div>
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setOpenAddTicket(false);
                      resetTicketForm();
                    }}
                  >
                    Close
                  </Button>
                  <Button onClick={saveTicket}>Save</Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <Tabs value={tab} onValueChange={setTab}>
            <div className="flex items-center justify-between mb-3">
              <TabsList className="bg-muted/40">
                <TabsTrigger value="list">Tickets list</TabsTrigger>
                <TabsTrigger value="templates">Templates</TabsTrigger>
              </TabsList>
              {tab === "list" ? (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">Excel</Button>
                  <Button variant="outline" size="sm">Print</Button>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search" value={query} onChange={(e)=>setQuery(e.target.value)} className="pl-9 w-56" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search" value={query} onChange={(e)=>setQuery(e.target.value)} className="pl-9 w-56" />
                  </div>
                  {/* Add template dialog */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2"><Plus className="w-4 h-4"/> Add template</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-3xl">
                      <DialogHeader>
                        <DialogTitle>Add template</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                          <Label className="md:text-right text-muted-foreground">Title</Label>
                          <Input placeholder="Title" className="md:col-span-4" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
                          <Label className="md:text-right pt-2 text-muted-foreground">Description</Label>
                          <Textarea placeholder="Description" className="md:col-span-4 min-h-[120px]" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                          <Label className="md:text-right text-muted-foreground">Ticket type</Label>
                          <Select>
                            <SelectTrigger className="md:col-span-4"><SelectValue placeholder="-"/></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="-">-</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                          <Label className="md:text-right text-muted-foreground">Private</Label>
                          <div className="md:col-span-4 flex items-center gap-2">
                            <Checkbox id="private" />
                          </div>
                        </div>
                      </div>
                      <DialogFooter className="gap-2">
                        <Button variant="outline">Close</Button>
                        <Button>Save</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>

            <TabsContent value="list">
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <Button variant="outline" size="icon" aria-label="grid">▦</Button>
                <Select value={client} onValueChange={setClient}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="- Client -"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-">- Client -</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c._id} value={c._id}>{clientDisplayName(c)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="- Ticket type -"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-">- Ticket type -</SelectItem>
                    <SelectItem value="general">General Support</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={label} onValueChange={setLabel}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="- Label -"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-">- Label -</SelectItem>
                    {ticketLabels.map((l) => (
                      <SelectItem key={l._id} value={l.name}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={assigned} onValueChange={setAssigned}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="- Assigned to -"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-">- Assigned to -</SelectItem>
                    {employees.map((e) => (
                      <SelectItem key={e._id} value={employeeDisplayName(e)}>{employeeDisplayName(e)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={created} onValueChange={setCreated}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="- Created -"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-">- Created -</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-32"><SelectValue placeholder="Status"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Status">Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="success" size="icon" aria-label="refresh" onClick={loadTickets}><RefreshCw className="w-4 h-4"/></Button>
                <Button variant="outline" size="icon" aria-label="clear" onClick={clearFilters}>✕</Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Ticket ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Ticket type</TableHead>
                    <TableHead>Labels</TableHead>
                    <TableHead>Assigned to</TableHead>
                    <TableHead>Last activity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">Loading...</TableCell>
                    </TableRow>
                  ) : tickets.length ? (
                    tickets
                      .filter((t) => (type === "-" ? true : (t.type || "general") === type))
                      .filter((t) => (label === "-" ? true : (t.labels || []).includes(label)))
                      .filter((t) => (assigned === "-" ? true : (t.assignedTo || "") === assigned))
                      .filter((t) => (status === "Status" ? true : (t.status || "open") === status))
                      .map((t) => (
                        <TableRow key={t._id}>
                          <TableCell className="font-medium">
                            <button
                              type="button"
                              className="text-left hover:underline"
                              onClick={() => navigate(`/tickets/${t._id}`)}
                            >
                              {t.ticketNo ? `#${t.ticketNo}` : t._id.slice(-6)}
                            </button>
                          </TableCell>
                          <TableCell>
                            <button
                              type="button"
                              className="text-left hover:underline"
                              onClick={() => navigate(`/tickets/${t._id}`)}
                            >
                              {t.title}
                            </button>
                          </TableCell>
                          <TableCell>{t.client || "-"}</TableCell>
                          <TableCell>{t.type || "general"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 flex-wrap">
                              {(t.labels || []).length ? (
                                (t.labels || []).map((ln) => (
                                  <span
                                    key={ln}
                                    className="text-xs px-2 py-0.5 rounded-full border"
                                    style={{ borderColor: labelColorByName.get(ln) || "#4F46E5" }}
                                  >
                                    {ln}
                                  </span>
                                ))
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{t.assignedTo || "-"}</TableCell>
                          <TableCell>{t.lastActivity ? new Date(t.lastActivity).toLocaleString() : "-"}</TableCell>
                          <TableCell className="capitalize">{t.status || "open"}</TableCell>
                          <TableCell>
                            <div className="flex justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button type="button" variant="ghost" size="icon-sm" aria-label="actions">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEditTicket(t)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setTicketStatus(t, (t.status || "open") === "closed" ? "open" : "closed")}
                                  >
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    {(t.status || "open") === "closed" ? "Mark as Open" : "Mark as Closed"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => deleteTicket(t._id)} className="text-destructive">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">No record found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="templates">
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <Button variant="outline" size="icon" aria-label="grid">▦</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Title</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Private</TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">No record found.</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

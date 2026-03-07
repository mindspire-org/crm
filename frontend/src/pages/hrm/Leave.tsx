import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { getAuthHeaders } from "@/lib/api/auth";

export default function Leave() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("pending");
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState("10");
  const [openApply, setOpenApply] = useState(false);
  const [openAssign, setOpenAssign] = useState(false);
  const [openImport, setOpenImport] = useState(false);

  type LeaveItem = {
    _id: string;
    employeeId?: string;
    name?: string;
    type: string;
    from: string;
    to: string;
    reason?: string;
    status: "pending" | "approved" | "rejected";
    approver?: string;
  };

  const API_BASE = (import.meta as any)?.env?.VITE_API_BASE || "http://localhost:5050";
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);

  // Get current user role to determine UI permissions
  const getCurrentUserRole = () => {
    try {
      const userStr = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
      if (!userStr) return 'admin'; // Default to admin for safety
      const user = JSON.parse(userStr);
      return user.role || 'admin';
    } catch {
      return 'admin'; // Default to admin for safety
    }
  };

  const currentUserRole = getCurrentUserRole();

  type EmployeeOption = {
    _id: string;
    name: string;
    initials: string;
    avatar?: string;
  };

  const [empQuery, setEmpQuery] = useState("");
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);

  const toAbsoluteAvatar = (v?: string) => {
    if (!v) return "";
    const s = String(v);
    if (!s) return "";
    if (s.startsWith("http://") || s.startsWith("https://")) return s;
    return `${API_BASE}${s.startsWith("/") ? "" : "/"}${s}`;
  };

  const initialsFrom = (name?: string) => {
    const s = String(name || "").trim();
    if (!s) return "U";
    return s
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();
  };

  const loadEmployees = async (q?: string) => {
    try {
      const url = `${API_BASE}/api/employees${q ? `?q=${encodeURIComponent(q)}` : ""}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json().catch(() => []);
      const mapped: EmployeeOption[] = (Array.isArray(data) ? data : [])
        .map((e: any) => {
          const name = e.name || `${e.firstName || ""} ${e.lastName || ""}`.trim();
          return {
            _id: String(e._id || ""),
            name,
            initials: (e.initials || initialsFrom(name)).toUpperCase(),
            avatar: e.avatar || "",
          };
        })
        .filter((e: EmployeeOption) => Boolean(e._id) && Boolean(e.name));
      setEmployees(mapped);
    } catch {}
  };

  const refresh = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/leaves`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      const mapped: LeaveItem[] = (Array.isArray(data) ? data : []).map((d: any) => ({
        _id: d._id,
        employeeId: d.employeeId,
        name: d.name,
        type: d.type,
        from: d.from ? new Date(d.from).toISOString() : "",
        to: d.to ? new Date(d.to).toISOString() : "",
        reason: d.reason,
        status: d.status,
        approver: d.approver,
      }));
      setLeaves(mapped);
    } catch {}
  };

  useEffect(() => {
    refresh();
    loadEmployees("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (openApply || openAssign) {
      setEmpQuery("");
      loadEmployees("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openApply, openAssign]);

  const filtered = useMemo(() => {
    const s = query.toLowerCase();
    const base = leaves.filter(l =>
      (l.name || "").toLowerCase().includes(s) ||
      (l.type || "").toLowerCase().includes(s) ||
      (l.status || "").toLowerCase().includes(s)
    );
    if (activeTab === "pending") return base.filter(l=>l.status === "pending");
    if (activeTab === "all") return base;
    return base; // summary handled separately
  }, [leaves, query, activeTab]);

  // Apply leave form state
  const [applyType, setApplyType] = useState("casual");
  const [applyFrom, setApplyFrom] = useState("");
  const [applyTo, setApplyTo] = useState("");
  const [applyReason, setApplyReason] = useState("");
  const [applyEmployeeId, setApplyEmployeeId] = useState<string>("");
  const [applyEmployeeName, setApplyEmployeeName] = useState<string>("");

  // Assign leave form state
  const [assignEmployeeId, setAssignEmployeeId] = useState<string>("");
  const [assignEmployeeName, setAssignEmployeeName] = useState<string>("");
  const [assignType, setAssignType] = useState("casual");
  const [assignFrom, setAssignFrom] = useState("");
  const [assignTo, setAssignTo] = useState("");

  const exportCSV = () => {
    const rows = [["name","type","from","to","status","reason"],
      ...filtered.map(l=>[
        l.name || "",
        l.type,
        new Date(l.from).toLocaleDateString(),
        new Date(l.to).toLocaleDateString(),
        l.status,
        l.reason || "",
      ]),
    ];
    const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/\"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "leaves.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const printList = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const rows = filtered
      .map(l=>`<tr><td>${l.name||""}</td><td>${l.type}</td><td>${new Date(l.from).toLocaleDateString()}</td><td>${new Date(l.to).toLocaleDateString()}</td><td>${l.status}</td></tr>`) 
      .join("");
    w.document.write(`<!doctype html><html><head><title>Leaves</title><style>table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px;text-align:left}</style></head><body><h3>Leaves</h3><table><thead><tr><th>Name</th><th>Type</th><th>From</th><th>To</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    w.document.close(); w.focus(); w.print();
  };

  const applyLeave = async () => {
    try {
      if (currentUserRole === "admin" && !applyEmployeeId) { toast.error("Please select employee"); return; }
      if (!applyFrom || !applyTo) { toast.error("Please select from and to dates"); return; }
      const res = await fetch(`${API_BASE}/api/leaves`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ employeeId: applyEmployeeId || undefined, name: applyEmployeeName || undefined, type: applyType, from: new Date(applyFrom), to: new Date(applyTo), reason: applyReason, status: "pending" })
      });
      if (!res.ok) {
        const e = await res.json().catch(()=>null);
        toast.error(e?.error || "Failed to apply leave");
        return;
      }
      setOpenApply(false);
      setApplyEmployeeId(""); setApplyEmployeeName(""); setApplyType("casual"); setApplyFrom(""); setApplyTo(""); setApplyReason("");
      await refresh();
      toast.success("Leave application submitted");
    } catch {}
  };

  const assignLeave = async () => {
    try {
      if (!assignEmployeeId) { toast.error("Please select employee"); return; }
      if (!assignFrom || !assignTo) { toast.error("Please select from and to dates"); return; }
      const res = await fetch(`${API_BASE}/api/leaves`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ employeeId: assignEmployeeId, name: assignEmployeeName, type: assignType, from: new Date(assignFrom), to: new Date(assignTo), status: "approved", reason: "" })
      });
      if (!res.ok) {
        const e = await res.json().catch(()=>null);
        toast.error(e?.error || "Failed to assign leave");
        return;
      }
      setOpenAssign(false);
      setAssignEmployeeId(""); setAssignEmployeeName(""); setAssignType("casual"); setAssignFrom(""); setAssignTo("");
      await refresh();
      toast.success("Leave assigned");
    } catch {}
  };

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    try {
      await fetch(`${API_BASE}/api/leaves/${id}`, { method: "PUT", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ status }) });
      await refresh();
    } catch {}
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-sm text-muted-foreground">Leave</h1>
        <div className="flex items-center gap-2">
          {currentUserRole === "admin" && (
            <Dialog open={openImport} onOpenChange={setOpenImport}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">Import leaves</Button>
              </DialogTrigger>
              <DialogContent className="bg-card">
                <DialogHeader>
                  <DialogTitle>Import leaves</DialogTitle>
                </DialogHeader>
                <div className="text-sm text-muted-foreground">Upload your CSV file (coming soon)</div>
                <DialogFooter>
                  <Button variant="outline" onClick={()=>setOpenImport(false)}>Close</Button>
                  <Button onClick={()=>setOpenImport(false)}>Upload</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          <Dialog open={openApply} onOpenChange={setOpenApply}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">Apply leave</Button>
            </DialogTrigger>
            <DialogContent className="bg-card">
              <DialogHeader>
                <DialogTitle>Apply leave</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                {currentUserRole === "admin" && (
                  <div className="space-y-1">
                    <Label>Employee</Label>
                    <Input
                      placeholder="Search employee..."
                      value={empQuery}
                      onChange={(e) => {
                        const v = e.target.value;
                        setEmpQuery(v);
                        loadEmployees(v);
                      }}
                    />
                    <div className="max-h-40 overflow-auto border rounded-md">
                      {employees.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground">No employees found.</div>
                      ) : (
                        employees.slice(0, 30).map((e) => (
                          <button
                            key={e._id}
                            type="button"
                            className={`w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-muted ${applyEmployeeId === e._id ? "bg-muted" : ""}`}
                            onClick={() => { setApplyEmployeeId(e._id); setApplyEmployeeName(e.name); }}
                          >
                            <Avatar className="w-7 h-7">
                              <AvatarImage src={toAbsoluteAvatar(e.avatar)} alt={e.name} />
                              <AvatarFallback className="text-[10px] font-semibold">{e.initials}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm capitalize">{e.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                    {applyEmployeeName && (
                      <div className="text-xs text-muted-foreground">Selected: {applyEmployeeName}</div>
                    )}
                  </div>
                )}
                <div className="space-y-1">
                  <Label>Leave type</Label>
                  <Select value={applyType} onValueChange={setApplyType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="sick">Sick</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>From</Label>
                    <DatePicker value={applyFrom} onChange={setApplyFrom} placeholder="From" />
                  </div>
                  <div className="space-y-1">
                    <Label>To</Label>
                    <DatePicker value={applyTo} onChange={setApplyTo} placeholder="To" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Reason</Label>
                  <Input placeholder="Reason" value={applyReason} onChange={(e)=>setApplyReason(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={()=>setOpenApply(false)}>Close</Button>
                <Button onClick={applyLeave}>Submit</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {currentUserRole === "admin" && (
            <Dialog open={openAssign} onOpenChange={setOpenAssign}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">Assign leave</Button>
              </DialogTrigger>
              <DialogContent className="bg-card">
                <DialogHeader>
                  <DialogTitle>Assign leave</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3">
                  <div className="space-y-1">
                    <Label>Employee</Label>
                    <Input
                      placeholder="Search employee..."
                      value={empQuery}
                      onChange={(e) => {
                        const v = e.target.value;
                        setEmpQuery(v);
                        loadEmployees(v);
                      }}
                    />
                    <div className="max-h-40 overflow-auto border rounded-md">
                      {employees.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground">No employees found.</div>
                      ) : (
                        employees.slice(0, 30).map((e) => (
                          <button
                            key={e._id}
                            type="button"
                            className={`w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-muted ${assignEmployeeId === e._id ? "bg-muted" : ""}`}
                            onClick={() => { setAssignEmployeeId(e._id); setAssignEmployeeName(e.name); }}
                          >
                            <Avatar className="w-7 h-7">
                              <AvatarImage src={toAbsoluteAvatar(e.avatar)} alt={e.name} />
                              <AvatarFallback className="text-[10px] font-semibold">{e.initials}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm capitalize">{e.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                    {assignEmployeeName && (
                      <div className="text-xs text-muted-foreground">Selected: {assignEmployeeName}</div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label>Leave type</Label>
                    <Select value={assignType} onValueChange={setAssignType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="sick">Sick</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>From</Label>
                      <DatePicker value={assignFrom} onChange={setAssignFrom} placeholder="From" />
                    </div>
                    <div className="space-y-1">
                      <Label>To</Label>
                      <DatePicker value={assignTo} onChange={setAssignTo} placeholder="To" />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={()=>setOpenAssign(false)}>Close</Button>
                  <Button onClick={assignLeave}>Assign</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between">
              <TabsList className="bg-muted/40 flex flex-wrap lg:grid lg:grid-cols-3 w-full h-auto min-h-10 gap-1">
                <TabsTrigger value="pending">Pending approval</TabsTrigger>
                <TabsTrigger value="all">All applications</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={exportCSV}>Excel</Button>
                <Button variant="outline" size="sm" onClick={printList}>Print</Button>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search" value={query} onChange={(e)=>setQuery(e.target.value)} className="pl-9 w-56" />
                </div>
              </div>
            </div>

            {(["pending","all","summary"] as const).map((tab)=> (
              <TabsContent key={tab} value={tab} className="mt-4">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead>Applicant</TableHead>
                          <TableHead>Leave type</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-8"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground">No record found.</TableCell>
                          </TableRow>
                        )}
                        {filtered.map((l)=>{
                          const from = new Date(l.from);
                          const to = new Date(l.to);
                          const dur = Math.max(1, Math.ceil((to.getTime()-from.getTime())/(1000*60*60*24))+1);
                          return (
                            <TableRow key={l._id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-7 h-7">
                                    <AvatarImage src={toAbsoluteAvatar((employees.find((e)=>e._id===String(l.employeeId))?.avatar) || "")} alt={l.name || ""} />
                                    <AvatarFallback className="text-[10px] font-semibold">{initialsFrom(l.name)}</AvatarFallback>
                                  </Avatar>
                                  {l.employeeId ? (
                                    <button
                                      type="button"
                                      className="capitalize text-left hover:underline"
                                      onClick={() => navigate(`/hrm/employees/${l.employeeId}`, { state: { dbId: l.employeeId } })}
                                    >
                                      {l.name || "-"}
                                    </button>
                                  ) : (
                                    <span className="capitalize">{l.name || "-"}</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="capitalize">{l.type}</TableCell>
                              <TableCell>{from.toLocaleDateString()} - {to.toLocaleDateString()}</TableCell>
                              <TableCell>{dur} day(s)</TableCell>
                              <TableCell className="capitalize">{l.status}</TableCell>
                              <TableCell className="text-right">
                                {activeTab === 'pending' && currentUserRole === 'admin' && (
                                  <div className="flex items-center gap-2 justify-end">
                                    <Button size="sm" variant="outline" onClick={()=>updateStatus(l._id, 'approved')}>Approve</Button>
                                    <Button size="sm" variant="destructive" onClick={()=>updateStatus(l._id, 'rejected')}>Reject</Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    <div className="flex items-center justify-between p-3 border-t">
                      <div className="flex items-center gap-2 text-sm">
                        <Select value={pageSize} onValueChange={setPageSize}>
                          <SelectTrigger className="w-20 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                          </SelectContent>
                        </Select>
                        <span>0-0 / 0</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">‹</Button>
                        <Button variant="outline" size="sm">›</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { RefreshCw, Search, Eye, UserPlus } from "lucide-react";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";

type ProjectRequestStatus = "pending" | "approved" | "rejected" | "in_progress";

type ProjectRequestDoc = {
  _id: string;
  clientId: string;
  clientName?: string;
  projectId?: string;
  title: string;
  description: string;
  budget?: string;
  deadline?: string;
  status: ProjectRequestStatus;
  createdAt?: string;
  updatedAt?: string;
  employeeId?: string; // Assigned employee
  employeeName?: string; // For display
};

type Employee = {
  _id: string;
  name: string;
  email: string;
  department?: string;
};

const toIsoDate = (d?: any) => {
  try {
    if (!d) return "";
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return "";
  }
};

export default function ProjectRequestsAdmin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ProjectRequestDoc[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("-");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningRequest, setAssigningRequest] = useState<ProjectRequestDoc | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  const loadEmployees = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/employees`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json().catch(() => []);
      if (res.ok && Array.isArray(json)) {
        setEmployees(json.filter((e: any) => e.status === "active"));
      }
    } catch (e) {
      console.error("Failed to load employees", e);
    }
  };

  const assignProject = async () => {
    if (!assigningRequest?.projectId || !selectedEmployeeId) {
      toast.error("Please select an employee");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/projects/${assigningRequest.projectId}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ employeeId: selectedEmployeeId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to assign project");

      // Update local state
      const employee = employees.find((e) => e._id === selectedEmployeeId);
      setItems((cur) =>
        cur.map((x) =>
          x._id === assigningRequest._id
            ? { ...x, employeeId: selectedEmployeeId, employeeName: employee?.name }
            : x
        )
      );

      toast.success("Project assigned successfully");
      setAssignDialogOpen(false);
      setAssigningRequest(null);
      setSelectedEmployeeId("");
    } catch (e: any) {
      toast.error(e?.message || "Failed to assign project");
    }
  };

  const openAssignDialog = (request: ProjectRequestDoc) => {
    setAssigningRequest(request);
    setSelectedEmployeeId(request.employeeId || "");
    setAssignDialogOpen(true);
  };

  const load = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (status !== "-") params.set("status", status);

      const res = await fetch(`${API_BASE}/api/project-requests?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json().catch(() => []);
      if (!res.ok) throw new Error(json?.error || "Failed to load project requests");
      setItems(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load project requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadEmployees();
  }, []);

  const statusCounts = useMemo(() => {
    const m = new Map<ProjectRequestStatus, number>();
    for (const it of items) {
      const s = (it?.status || "pending") as ProjectRequestStatus;
      m.set(s, (m.get(s) || 0) + 1);
    }
    return m;
  }, [items]);

  const setStatusFor = async (id: string, nextStatus: ProjectRequestStatus) => {
    const prev = items;
    setItems((cur) => cur.map((x) => (x._id === id ? { ...x, status: nextStatus } : x)));
    try {
      const res = await fetch(`${API_BASE}/api/project-requests/${id}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to update status");
      if (json && json._id) {
        setItems((cur) => cur.map((x) => (x._id === id ? { ...x, ...json } : x)));
      }
      toast.success("Status updated");
    } catch (e: any) {
      setItems(prev);
      toast.error(e?.message || "Failed to update status");
    }
  };

  const badgeVariantFor = (s: ProjectRequestStatus) => {
    if (s === "approved") return "default";
    if (s === "rejected") return "destructive";
    if (s === "in_progress") return "secondary";
    return "secondary";
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Project Requests</h1>
          <div className="text-sm text-muted-foreground">
            Pending: {statusCounts.get("pending") || 0} · In progress: {statusCounts.get("in_progress") || 0} · Approved: {statusCounts.get("approved") || 0} · Rejected: {statusCounts.get("rejected") || 0}
          </div>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>All Requests</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." className="pl-9" />
            </div>

            <Button variant="outline" onClick={load} disabled={loading}>
              Apply
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    {loading ? "Loading..." : "No project requests found"}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((it) => (
                  <TableRow key={it._id}>
                    <TableCell className="text-sm">{it.clientName || "Client"}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{it.title}</div>
                        <div className="text-xs text-muted-foreground">{String(it._id || "").slice(0, 8)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={badgeVariantFor(it.status) as any}>{String(it.status).replace("_", " ")}</Badge>
                        <Select value={it.status} onValueChange={(v) => setStatusFor(it._id, v as ProjectRequestStatus)}>
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{it.budget || "-"}</TableCell>
                    <TableCell className="text-sm">{it.deadline ? toIsoDate(it.deadline) : "-"}</TableCell>
                    <TableCell className="text-sm">
                      {it.employeeName ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{it.employeeName}</Badge>
                        </div>
                      ) : it.projectId ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAssignDialog(it)}
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Assign
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{toIsoDate(it.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                        </DialogTrigger>
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-2"
                          disabled={!it.projectId}
                          onClick={() => it.projectId && navigate(`/projects/overview/${encodeURIComponent(it.projectId)}`)}
                        >
                          Open Project
                        </Button>
                        <DialogContent className="sm:max-w-lg">
                          <DialogHeader>
                            <DialogTitle>{it.title}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-3">
                            <div className="text-sm">
                              <div className="font-medium">Client</div>
                              <div className="text-muted-foreground">{it.clientName || it.clientId}</div>
                            </div>
                            {it.projectId ? (
                              <div className="text-sm">
                                <div className="font-medium">Project</div>
                                <div className="text-muted-foreground">{String(it.projectId).slice(0, 8)}</div>
                              </div>
                            ) : null}
                            <div className="text-sm">
                              <div className="font-medium">Description</div>
                              <div className="text-muted-foreground whitespace-pre-wrap">{it.description || ""}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <div className="font-medium">Status</div>
                                <div className="text-muted-foreground">{String(it.status).replace("_", " ")}</div>
                              </div>
                              <div>
                                <div className="font-medium">Requested</div>
                                <div className="text-muted-foreground">{toIsoDate(it.createdAt)}</div>
                              </div>
                              <div>
                                <div className="font-medium">Budget</div>
                                <div className="text-muted-foreground">{it.budget || "-"}</div>
                              </div>
                              <div>
                                <div className="font-medium">Deadline</div>
                                <div className="text-muted-foreground">{it.deadline ? toIsoDate(it.deadline) : "-"}</div>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Project to Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {assigningRequest && (
              <div className="text-sm text-muted-foreground">
                Project: <strong>{assigningRequest.title}</strong>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Select Team Member</label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a team member" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp._id} value={emp._id}>
                      {emp.name} ({emp.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={assignProject} disabled={!selectedEmployeeId}>
                Assign Project
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

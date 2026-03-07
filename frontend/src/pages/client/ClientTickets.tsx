import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search, RefreshCw, Eye } from "lucide-react";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";

type ProjectDoc = {
  _id: string;
  title?: string;
  status?: string;
};

type TicketDoc = {
  _id: string;
  ticketNo?: number;
  projectId?: string;
  title?: string;
  description?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

const toIsoDate = (d?: any) => {
  try {
    if (!d) return "";
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return "";
  }
};

export default function ClientTickets() {
  const location = useLocation();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectDoc[]>([]);
  const [tickets, setTickets] = useState<TicketDoc[]>([]);

  const [openNew, setOpenNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newProjectId, setNewProjectId] = useState("");

  const filteredTickets = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter((t) => {
      const title = String(t?.title || "").toLowerCase();
      const desc = String(t?.description || "").toLowerCase();
      const id = String(t?.ticketNo != null ? t.ticketNo : t._id || "").toLowerCase();
      return title.includes(q) || desc.includes(q) || id.includes(q);
    });
  }, [tickets, query]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      const [projectsRes, ticketsRes] = await Promise.all([
        fetch(`${API_BASE}/api/client/projects`, { headers }),
        fetch(`${API_BASE}/api/client/tickets`, { headers }),
      ]);

      const projectsJson = projectsRes.ok ? await projectsRes.json().catch(() => []) : [];
      const ticketsJson = ticketsRes.ok ? await ticketsRes.json().catch(() => []) : [];

      setProjects(Array.isArray(projectsJson) ? projectsJson : []);
      setTickets(Array.isArray(ticketsJson) ? ticketsJson : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    const sp = new URLSearchParams(location.search || "");
    if (sp.get("new") === "1") {
      setOpenNew(true);
    }
  }, [location.search]);

  const resetNew = () => {
    setNewTitle("");
    setNewDescription("");
    setNewProjectId("");
  };

  const createTicket = async () => {
    try {
      const title = newTitle.trim();
      if (!title) return toast.error("Title is required");
      if (!newProjectId) return toast.error("Project is required");

      const headers = getAuthHeaders({ "Content-Type": "application/json" });
      const res = await fetch(`${API_BASE}/api/client/tickets`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title,
          description: newDescription,
          projectId: newProjectId,
          type: "general",
          labels: [],
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || json?.message || "Failed to create ticket");

      toast.success("Ticket created");
      setOpenNew(false);
      resetNew();
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message || "Failed to create ticket");
    }
  };

  const projectTitleById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of projects) {
      if (p?._id) m.set(String(p._id), String(p.title || "Project"));
    }
    return m;
  }, [projects]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Support Tickets</h1>
          <p className="text-sm text-muted-foreground">Create and track tickets for your projects.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadAll} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setOpenNew(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Ticket
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Tickets</CardTitle>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tickets..." className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {loading ? "Loading..." : "No tickets found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTickets.map((t) => {
                  const no = t?.ticketNo != null ? String(t.ticketNo) : "";
                  const ticketCode = no ? `TK-${no.padStart(3, "0")}` : String(t?._id || "").slice(0, 8);
                  const statusRaw = String(t?.status || "open").toLowerCase();
                  const statusLabel = statusRaw === "closed" ? "Closed" : statusRaw === "open" ? "Open" : "In Progress";
                  const variant = statusRaw === "closed" ? "default" : statusRaw === "open" ? "secondary" : "secondary";
                  return (
                    <TableRow key={t._id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{t.title || "Ticket"}</div>
                          <div className="text-xs text-muted-foreground">{ticketCode}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {t.projectId ? projectTitleById.get(String(t.projectId)) || "Project" : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={variant as any}>{statusLabel}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{toIsoDate(t.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/client/tickets/${t._id}`)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={openNew} onOpenChange={(o) => {
        setOpenNew(o);
        if (!o) resetNew();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Ticket</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={newProjectId} onValueChange={setNewProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.title || "Project"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="What do you need help with?" />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Add details..." rows={5} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNew(false)}>Cancel</Button>
            <Button onClick={createTicket}>Create Ticket</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

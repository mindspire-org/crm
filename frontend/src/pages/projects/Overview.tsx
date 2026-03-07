import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar, Filter, Plus, Search, Upload, Tags, Paperclip, MoreVertical, Eye, Pencil, Trash2, FolderKanban, TrendingUp, Users, Clock, DollarSign, Target, BarChart3, Activity, Briefcase, Sparkles, Zap, Star, Printer } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { canViewFinancialData, getCurrentUser } from "@/utils/roleAccess";
import { cn } from "@/lib/utils";

function ImportProjectsDialog({ onImported }: { onImported: (created: any[]) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const prevent = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
  };
  const onChoose = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const downloadSample = () => {
    const csv = [
      "project_title,institute_name,client_name,phone,requirements,status,assignee,total_amount,advance_payment,pending_payment",
      "Shifa pharmacy,Shifa Pharmacy,Nasif Khan,0333-5943653,Pharmacy,Install,Mahnoor,50000,10000,40000",
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "projects-import-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCsvLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (ch === "," && !inQuotes) {
        out.push(cur.trim());
        cur = "";
        continue;
      }
      cur += ch;
    }
    out.push(cur.trim());
    return out;
  };

  const parseCsv = async (f: File): Promise<any[]> => {
    const text = await f.text();
    const lines = text.split(/\r?\n/).filter((l) => String(l || "").trim().length);
    if (!lines.length) return [];
    const header = parseCsvLine(lines[0]).map((s) => s.trim().toLowerCase());
    const out: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      const row: any = {};
      header.forEach((h, idx) => (row[h] = cols[idx] || ""));
      out.push(row);
    }
    return out;
  };

  const norm = (s: any) => String(s || "").trim();
  const normLower = (s: any) => norm(s).toLowerCase();
  const parseMoney = (s: any) => {
    const n = Number(String(s || "0").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };
  const mapStatus = (s: any): "Open" | "In Progress" | "Completed" | "Hold" => {
    const t = normLower(s);
    if (!t) return "Open";
    if (t.includes("progress")) return "In Progress";
    if (t.includes("hold")) return "Hold";
    if (t.includes("complete") || t.includes("done")) return "Completed";
    return "Open";
  };

  const importNow = async () => {
    if (!file) return;
    try {
      setLoading(true);
      const headers = getAuthHeaders({ "Content-Type": "application/json" });

      const [clientsRes, employeesRes] = await Promise.all([
        fetch(`${API_BASE}/api/clients`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/employees`, { headers: getAuthHeaders() }),
      ]);
      const clientsJson = await clientsRes.json().catch(() => []);
      const employeesJson = await employeesRes.json().catch(() => []);

      const existingClients: any[] = Array.isArray(clientsJson) ? clientsJson : [];
      const employees: any[] = Array.isArray(employeesJson) ? employeesJson : [];

      const findClientByName = (name: string) => {
        const q = normLower(name);
        if (!q) return null;
        return (
          existingClients.find((c: any) => normLower(c.company) === q) ||
          existingClients.find((c: any) => normLower(c.person) === q) ||
          existingClients.find((c: any) => normLower(c.owner) === q) ||
          null
        );
      };
      const findEmployeeIdByName = (name: string) => {
        const q = normLower(name);
        if (!q) return "";
        const hit = employees.find((e: any) => normLower(e.name) === q) || employees.find((e: any) => normLower(`${e.firstName || ""} ${e.lastName || ""}`) === q);
        return hit?._id ? String(hit._id) : "";
      };

      const rows = await parseCsv(file);
      const created: any[] = [];
      for (const r of rows) {
        const projectTitle = norm(r.project_title || r["project title"] || r.title);
        const instituteName = norm(r.institute_name || r["institute name"] || r.institute || r.company);
        const clientName = norm(r.client_name || r["client name"] || r.client || r.owner);
        const phone = norm(r.phone);
        const requirements = norm(r.requirements);
        const status = mapStatus(r.status);
        const assigneeRaw = norm(r.assignee);
        const total = parseMoney(r.total_amount || r["total amount"] || r.price);
        const advance = parseMoney(r.advance_payment || r["advance payment"] || r.advance);
        const pending = parseMoney(r.pending_payment || r["pending payment"] || r.pending);

        if (!projectTitle) continue;

        // Upsert client (best-effort)
        let clientDoc = findClientByName(instituteName) || findClientByName(clientName);
        if (!clientDoc) {
          const payload: any = {
            type: "org",
            company: instituteName || projectTitle,
            owner: clientName || undefined,
            phone: phone || undefined,
          };
          const res = await fetch(`${API_BASE}/api/clients`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            clientDoc = await res.json().catch(() => null);
            if (clientDoc) existingClients.unshift(clientDoc);
          }
        }

        const employeeId = assigneeRaw ? findEmployeeIdByName(assigneeRaw.split("+")[0]) : "";
        const descriptionParts = [
          requirements ? `Requirements: ${requirements}` : "",
          instituteName ? `Institute: ${instituteName}` : "",
          clientName ? `Client: ${clientName}` : "",
          phone ? `Phone: ${phone}` : "",
          advance ? `Advance: ${advance}` : "",
          pending ? `Pending: ${pending}` : "",
        ].filter(Boolean);

        const projectPayload: any = {
          title: projectTitle,
          client: clientDoc ? (clientDoc.company || clientDoc.person || instituteName || clientName || "-") : (instituteName || clientName || "-"),
          clientId: clientDoc?._id ? String(clientDoc._id) : undefined,
          employeeId: employeeId || undefined,
          price: Number(total || 0) || 0,
          status,
          description: descriptionParts.join("\n"),
        };

        const pr = await fetch(`${API_BASE}/api/projects`, {
          method: "POST",
          headers,
          body: JSON.stringify(projectPayload),
        });
        if (pr.ok) {
          const doc = await pr.json().catch(() => null);
          if (doc) created.push(doc);
        }
      }

      toast.success(`Imported ${created.length} projects`);
      onImported(created);
    } catch {
      toast.error("Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogContent className="bg-card">
      <DialogHeader>
        <DialogTitle>Import projects (CSV)</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Export your Excel file as <span className="font-medium">CSV</span>, then upload here.
        </div>
        <div
          className="border-2 border-dashed rounded-lg p-10 text-center text-sm text-muted-foreground"
          onDragOver={prevent}
          onDragEnter={prevent}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          Drag-and-drop CSV here
          <br />
          (or click to browse...)
          <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={onChoose} />
        </div>
        {file && (
          <div className="text-xs">
            Selected: <span className="font-medium">{file.name}</span>
          </div>
        )}
      </div>
      <DialogFooter>
        <div className="w-full flex items-center justify-between">
          <Button variant="outline" type="button" onClick={downloadSample}>Download sample file</Button>
          <div className="flex items-center gap-2">
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
            <Button onClick={importNow} disabled={!file || loading}>{loading ? "Importing..." : "Import"}</Button>
          </div>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}

const getStoredAuthUser = () => {
  const raw = localStorage.getItem("auth_user") || sessionStorage.getItem("auth_user");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};

interface Row {
  id: string;
  title: string;
  clientId?: string;
  client: string;
  employeeId?: string;
  price: string;
  start: string; // yyyy-mm-dd
  due: string; // yyyy-mm-dd
  progress: number; // 0-100
  status: "Open" | "In Progress" | "Completed" | "Hold";
  labels?: string;
  description?: string;
}


export default function Overview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clientIdFromQuery = searchParams.get("clientId") || "";
  const builtinLabels = useMemo(() => ["Low Priority", "Normal", "Urgent", "Critical"], []);

  const getLabelVariant = (label: string) => {
    const l = String(label || "").trim().toLowerCase();
    if (l === "low priority") return "secondary";
    if (l === "normal") return "default";
    if (l === "urgent") return "destructive";
    if (l === "critical") return "destructive";
    return "secondary";
  };
  const getLabelClassName = (label: string) => {
    const l = String(label || "").trim().toLowerCase();
    if (l === "low priority") return "bg-gray-100 text-gray-800 border-gray-200";
    if (l === "normal") return "bg-blue-100 text-blue-800 border-blue-200";
    if (l === "urgent") return "bg-orange-100 text-orange-800 border-orange-200";
    if (l === "critical") return "bg-red-100 text-red-800 border-red-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  // Helper: canonicalize label (title case)
  const canonicalLabel = (label: string) => {
    const toTitleCase = (s: string) => {
      const trimmed = String(s || "").trim();
      if (!trimmed) return trimmed;
      const lower = trimmed.toLowerCase();
      if (lower === "in progress") return "In Progress";
      if (lower === "todo") return "Todo";
      if (lower === "done") return "Done";
      if (lower === "critical") return "Critical";
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    };

    return toTitleCase(label);
  };

  const canViewPricing = useMemo(() => {
    const u = getCurrentUser();
    return Boolean(u && (u.role === "admin" || u.role === "finance_manager"));
  }, []);

  const [meRole, setMeRole] = useState<string>(() => {
    const u: any = getStoredAuthUser();
    return String(u?.role || u?.user?.role || "");
  });
  const roleLc = String(meRole || "").trim().toLowerCase();
  const isAdmin = roleLc === "admin";
  const canCreate = roleLc === "admin" || roleLc === "project_manager";
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [openLabels, setOpenLabels] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [loading, setLoading] = useState(true);
  // form state
  const [title, setTitle] = useState("");
  const [projectType, setProjectType] = useState("Client Project");
  const [client, setClient] = useState("");
  const [clientIdSel, setClientIdSel] = useState("");
  const [clientOptions, setClientOptions] = useState<{ id: string; name: string }[]>([]);
  const [desc, setDesc] = useState("");
  const [start, setStart] = useState("");
  const [deadline, setDeadline] = useState("");
  const [price, setPrice] = useState("");
  const [labels, setLabels] = useState("");
  const [developerId, setDeveloperId] = useState("");
  const [developerOptions, setDeveloperOptions] = useState<{ _id: string; name: string; email: string }[]>([]);
  const [developerQuery, setDeveloperQuery] = useState("");
  const [developerOpen, setDeveloperOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("__all__");
  const [labelFilter, setLabelFilter] = useState("__all__");
  const [startFrom, setStartFrom] = useState("");
  const [deadlineTo, setDeadlineTo] = useState("");
  const [labelOptions, setLabelOptions] = useState<string[]>([]);
  const [labelDraft, setLabelDraft] = useState<string[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isEditMode = Boolean(editingId);

  const safeDateTs = (ymd: string) => {
    if (!ymd || ymd === "-") return NaN;
    const t = new Date(ymd).getTime();
    return Number.isFinite(t) ? t : NaN;
  };

  // Progress editor dialog state
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressProjectId, setProgressProjectId] = useState<string | null>(null);
  const [progressValue, setProgressValue] = useState<number>(0);

  // Calculate analytics
  const analytics = useMemo(() => {
    const totalProjects = rows.length;
    const completedProjects = rows.filter(r => r.status === "Completed").length;
    const activeProjects = rows.filter(r => r.status === "Open" || r.status === "In Progress").length;
    const onHoldProjects = rows.filter(r => r.status === "Hold").length;
    const avgProgress = totalProjects > 0 ? Math.round(rows.reduce((acc, r) => acc + r.progress, 0) / totalProjects) : 0;

    return {
      totalProjects,
      completedProjects,
      activeProjects,
      onHoldProjects,
      avgProgress
    };
  }, [rows]);

  const clientNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of clientOptions) {
      const id = String((o as any)?.id || "").trim();
      const name = String((o as any)?.name || "").trim();
      if (id && name) m.set(id, name);
    }
    return m;
  }, [clientOptions]);

  const toYmd = (v: any) => {
    if (v === undefined || v === null) return "-";
    if (typeof v === "string" && !v.trim()) return "-";
    const dt = v instanceof Date ? v : new Date(v);
    const t = dt.getTime();
    if (!Number.isFinite(t)) return "-";
    return dt.toISOString().slice(0, 10);
  };

  const mapProjectRow = useCallback((d: any): Row => {
    const id = String(d?._id || "");

    const clientIdRaw = d?.clientId;
    const clientId = clientIdRaw ? String(clientIdRaw) : "";

    const clientText =
      String(d?.client || "").trim() ||
      String(d?.clientName || "").trim() ||
      String(d?.client_name || "").trim() ||
      String(d?.instituteName || "").trim() ||
      String(d?.institute_name || "").trim() ||
      (clientId ? String(clientNameById.get(clientId) || "").trim() : "");

    const startRaw = d?.start ?? d?.startDate ?? d?.start_date ?? d?.projectStart ?? d?.project_start;
    const deadlineRaw = d?.deadline ?? d?.dueDate ?? d?.due_date ?? d?.endDate ?? d?.end_date;

    return {
      id,
      title: d?.title || "-",
      clientId: clientId || undefined,
      client: clientText || "-",
      employeeId: d?.employeeId ? String(d.employeeId) : undefined,
      price: d?.price != null ? String(d.price) : "-",
      start: toYmd(startRaw),
      due: toYmd(deadlineRaw),
      progress: (() => {
        const p = typeof d?.progress === "number" ? Number(d.progress) : d?.status === "Completed" ? 100 : 0;
        return Math.max(0, Math.min(100, Number.isFinite(p) ? p : 0));
      })(),
      status: (d?.status as any) || "Open",
      labels: typeof d?.labels === "string" ? d.labels : Array.isArray(d?.labels) ? d.labels.join(", ") : "",
      description: d?.description || "",
    };
  }, [clientNameById]);

  const lastLoadedAtRef = useRef(0);

  const loadProjects = useCallback(async (q: string, opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (clientIdFromQuery) params.set("clientId", clientIdFromQuery);
      const url = `${API_BASE}/api/projects${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setRows((Array.isArray(data) ? data : []).map(mapProjectRow));
      lastLoadedAtRef.current = Date.now();
    } catch {
      // ignore
    } finally {
      if (!silent) setLoading(false);
    }
  }, [mapProjectRow, clientIdFromQuery]);

  useEffect(() => {
    void loadProjects(query);
  }, [query, loadProjects]);

  useEffect(() => {
    const refreshIfStale = () => {
      const now = Date.now();
      if (now - lastLoadedAtRef.current < 3000) return;
      void loadProjects(query, { silent: true });
    };

    const onFocus = () => refreshIfStale();
    const onVis = () => {
      if (!document.hidden) refreshIfStale();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    const t = window.setInterval(() => {
      if (!document.hidden) refreshIfStale();
    }, 30000);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(t);
    };
  }, [query, loadProjects]);

  useEffect(() => {
    if (String(meRole || "").trim()) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/users/me`, { headers: getAuthHeaders() });
        const json = await res.json().catch(() => null);
        const role = String(json?.user?.role || json?.role || "");
        if (res.ok && role) setMeRole(role);
      } catch {
        // ignore
      }
    })();
  }, [meRole]);

  useEffect(() => {
    const fetchDevelopers = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/employees?role=developer`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        const opts = (Array.isArray(data) ? data : []).map((e: any) => ({
          _id: String(e._id || ""),
          name: String(e.name || "").trim(),
          email: String(e.email || "").trim(),
        }));
        setDeveloperOptions(opts);
      } catch {}
    };

    void fetchDevelopers();
  }, []);

  useEffect(() => {
    if (!openAdd) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/employees?role=developer`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        const opts = (Array.isArray(data) ? data : []).map((e: any) => ({
          _id: String(e._id || ""),
          name: String(e.name || "").trim(),
          email: String(e.email || "").trim(),
        }));
        setDeveloperOptions(opts);
      } catch {}
    })();
  }, [openAdd]);

  const filteredDeveloperOptions = useMemo(() => {
    if (!developerQuery) return developerOptions;
    const q = developerQuery.toLowerCase();
    return developerOptions.filter((d) =>
      d.name.toLowerCase().includes(q) || d.email.toLowerCase().includes(q)
    );
  }, [developerOptions, developerQuery]);

  const selectedDeveloper = useMemo(() => {
    if (!developerId) return null;
    return developerOptions.find((d) => String(d._id) === String(developerId)) || null;
  }, [developerId, developerOptions]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/clients`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        const opts: { id: string; name: string }[] = (Array.isArray(data) ? data : [])
          .map((c: any) => ({ id: String(c._id || ""), name: (c.company || c.person || "-") }))
          .filter((c: any) => c.id && c.name);
        setClientOptions(opts);
        if (!client && opts.length) {
          setClient(opts[0].name);
          setClientIdSel(opts[0].id);
        }
      } catch { }
    })();
  }, []);

  useEffect(() => {
    try {
      const ls = JSON.parse(localStorage.getItem("project_labels") || "[]");
      if (Array.isArray(ls)) {
        const next = ls
          .map((x: any) => canonicalLabel(String(x || "")).trim())
          .filter(Boolean);
        const merged = Array.from(new Set([...builtinLabels, ...next])).sort((a, b) => a.localeCompare(b));
        setLabelOptions(merged);
      } else {
        setLabelOptions(builtinLabels);
      }
    } catch {
      setLabelOptions(builtinLabels);
    }
  }, [builtinLabels]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/projects/labels`, { headers: getAuthHeaders() });
        const json = await res.json().catch(() => []);
        if (res.ok && Array.isArray(json)) {
          const next = json.map((x: any) => canonicalLabel(String(x || "")).trim()).filter(Boolean);
          const merged = Array.from(new Set([...builtinLabels, ...next])).sort((a, b) => a.localeCompare(b));
          setLabelOptions(merged);
        }
      } catch { }
    })();
  }, []);

  useEffect(() => {
    if (!openLabels) return;
    setLabelDraft(labelOptions);
    setNewLabel("");
  }, [openLabels, labelOptions]);

  const createProject = async () => {
    if (!canCreate) {
      toast.error("Only admins and project managers can create projects");
      return;
    }
    if (!title.trim()) {
      toast.error("Project title is required");
      return;
    }
    try {
      setLoading(true);
      const payload: any = {
        title: title.trim(),
        client: clientIdSel ? undefined : String(client || "").trim(),
        clientId: clientIdSel || undefined,
        employeeId: developerId || undefined,
        price: price ? Number(price) : 0,
        start: start ? new Date(start) : undefined,
        deadline: deadline ? new Date(deadline) : undefined,
        status: "Open",
        description: desc,
        labels: labels
          ? labels
            .split(",")
            .map((l) => l.trim())
            .filter(Boolean)
            .join(", ")
          : "",
      };
      const isEdit = Boolean(editingId);
      const url = isEdit ? `${API_BASE}/api/projects/${editingId}` : `${API_BASE}/api/projects`;
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || (isEdit ? "Failed to update project" : "Failed to create project"));

      await loadProjects(query);
      toast.success(isEdit ? "Project updated successfully" : "Project created successfully");
      setOpenAdd(false);
      setEditingId(null);
      // Reset form
      setTitle("");
      setClient("");
      setClientIdSel("");
      setStart("");
      setDeadline("");
      setPrice("");
      setLabels("");
      setDeveloperId("");
      setDeveloperQuery("");
      setDeveloperOpen(false);
      setDesc("");
      setProjectType("Client Project");
    } catch {
      toast.error("Failed to save project");
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (id: string) => {
    try {
      if (!isAdmin) {
        toast.error("Only admins can delete projects");
        return;
      }
      if (!window.confirm("Delete this project?")) return;
      const res = await fetch(`${API_BASE}/api/projects/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to delete");
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success("Project removed");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete project");
    }
  };

  const updateProjectStatus = async (id: string, status: Row["status"]) => {
    try {
      const res = await fetch(`${API_BASE}/api/projects/${id}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to update status");
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status, progress: status === "Completed" ? 100 : r.progress } : r)));
      toast.success("Status updated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update status");
    }
  };

  const openEdit = (r: Row) => {
    setEditingId(r.id);
    setTitle(r.title || "");
    setClient(r.client || "");
    if (r.clientId) setClientIdSel(r.clientId);
    setDeveloperId(r.employeeId || "");
    setDeveloperQuery("");
    setDeveloperOpen(false);
    setStart(r.start && r.start !== "-" ? r.start : "");
    setDeadline(r.due && r.due !== "-" ? r.due : "");
    setPrice(r.price && r.price !== "-" ? r.price : "");
    setLabels(r.labels || "");
    setDesc(r.description || "");
    setOpenAdd(true);
  };

  const openProgressEditor = (r: Row) => {
    setProgressProjectId(r.id);
    setProgressValue(r.progress || 0);
    setProgressOpen(true);
  };

  const saveProgressValue = async () => {
    if (!progressProjectId) return;
    const value = Math.max(0, Math.min(100, Number(progressValue) || 0));
    try {
      const res = await fetch(`${API_BASE}/api/projects/${progressProjectId}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ progress: value }),
      });
      if (res.ok) {
        setRows(prev => prev.map(r => r.id === progressProjectId ? { ...r, progress: value, status: r.status } : r));
        toast.success("Progress updated");
      } else {
        setRows(prev => prev.map(r => r.id === progressProjectId ? { ...r, progress: value } : r));
      }
    } catch {
      setRows(prev => prev.map(r => r.id === progressProjectId ? { ...r, progress: value } : r));
    } finally {
      setProgressOpen(false);
      setProgressProjectId(null);
    }
  };

  const filtered = useMemo(() => {
    let out = rows;
    // Filter by clientId from query param if present
    if (clientIdFromQuery) {
      out = out.filter(r => r.clientId === clientIdFromQuery);
    }
    if (query) {
      const s = query.toLowerCase();
      out = out.filter(r => [r.title, r.client, r.status].some(v => v.toLowerCase().includes(s)));
    }
    if (statusFilter && statusFilter !== "__all__") out = out.filter(r => r.status.toLowerCase() === statusFilter.toLowerCase());
    if (labelFilter && labelFilter !== "__all__") out = out.filter(r => (r.labels || "").split(",").map(x => x.trim().toLowerCase()).includes(labelFilter.toLowerCase()));
    if (startFrom) out = out.filter(r => r.start && r.start !== "-" && r.start >= startFrom);
    if (deadlineTo) out = out.filter(r => r.due && r.due !== "-" && r.due <= deadlineTo);
    return out;
  }, [rows, query, statusFilter, labelFilter, startFrom, deadlineTo, clientIdFromQuery]);

  const manageLabels = () => {
    setOpenLabels(true);
  };

  const handleImportedProjects = async () => {
    await loadProjects(query);
  };

  const saveLabels = () => {
    const arr = labelDraft.map((x) => canonicalLabel(String(x || "")).trim()).filter(Boolean);
    const merged = Array.from(new Set([...builtinLabels, ...arr])).sort((a, b) => a.localeCompare(b));
    setLabelOptions(merged);
    localStorage.setItem("project_labels", JSON.stringify(merged));
    toast.success("Labels updated");
    setOpenLabels(false);
  };

  const addDraftLabel = () => {
    const v = String(newLabel || "").trim();
    if (!v) return;
    if (labelDraft.some((x) => String(x).toLowerCase() === v.toLowerCase())) {
      setNewLabel("");
      return;
    }
    setLabelDraft((p) => [...p, v]);
    setNewLabel("");
  };

  const resetFilters = () => {
    setStatusFilter("__all__");
    setLabelFilter("__all__");
    setStartFrom("");
    setDeadlineTo("");
    setQuery("");
  };

  const exportToCSV = () => {
    const header = canViewPricing
      ? ["ID", "Title", "Client", "Price", "Start date", "Deadline", "Progress", "Status", "Labels"]
      : ["ID", "Title", "Client", "Start date", "Deadline", "Progress", "Status", "Labels"];
    const lines = filtered.map((r, idx) =>
      canViewPricing
        ? [idx + 1, r.title, r.client, r.price, r.start, r.due, `${r.progress}%`, r.status, r.labels || ""]
        : [idx + 1, r.title, r.client, r.start, r.due, `${r.progress}%`, r.status, r.labels || ""]
    );
    const csv = [header, ...lines].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'projects.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const printTable = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const rowsHtml = filtered.map((r, idx) => `<tr>
      <td>${idx + 1}</td>
      <td>${r.title}</td>
      <td>${r.client}</td>
      ${canViewPricing ? `<td>${r.price}</td>` : ""}
      <td>${r.start}</td>
      <td>${r.due}</td>
      <td>${r.progress}%</td>
      <td>${r.status}</td>
    </tr>`).join("");
    w.document.write(`<!doctype html><html><head><title>Projects</title></head><body>
      <h3>Projects</h3>
      <table border="1" cellspacing="0" cellpadding="6">
        <thead><tr><th>#</th><th>Title</th><th>Client</th>${canViewPricing ? "<th>Price</th>" : ""}<th>Start date</th><th>Deadline</th><th>Progress</th><th>Status</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </body></html>`);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  const triggerImport = () => fileInputRef.current?.click();
  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length === 0) return;
      const header = lines[0].toLowerCase();
      const hasHeader = ["title", "client", "price", "start", "deadline"].every(k => header.includes(k));
      const body = hasHeader ? lines.slice(1) : lines;
      let imported = 0;
      for (const line of body) {
        const cols = line.split(",").map(c => c.replace(/^\"|\"$/g, "").trim());
        const [t, c, p, s, d, st] = cols;
        if (!t) continue;
        const payload: any = {
          title: t,
          client: c,
          price: p ? Number(p) : 0,
          start: s ? new Date(s) : undefined,
          deadline: d ? new Date(d) : undefined,
          status: st || "Open",
        };
        const res = await fetch(`${API_BASE}/api/projects`, { method: "POST", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
        if (res.ok) imported++;
      }
      toast.success(`Imported ${imported} project(s)`);
      const ref = await fetch(`${API_BASE}/api/projects${query ? `?q=${encodeURIComponent(query)}` : ""}`, { headers: getAuthHeaders() });
      if (ref.ok) {
        const data = await ref.json();
        setRows((Array.isArray(data) ? data : []).map(mapProjectRow));
      }
    } catch {
      toast.error("Failed to import projects");
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-800 dark:via-indigo-800 dark:to-purple-800">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`, animation: 'pulse 3s ease-in-out infinite' }} />
        <div className="relative px-6 py-12 sm:px-12 lg:px-16">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
                  <FolderKanban className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                    Projects Overview
                  </h1>
                  <p className="mt-2 text-lg text-white/80">
                    Manage and track all your projects efficiently
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                  <Target className="w-3 h-3 mr-1" />
                  {analytics.totalProjects} Total Projects
                </Badge>
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                  <Activity className="w-3 h-3 mr-1" />
                  {analytics.activeProjects} Active
                </Badge>
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {analytics.avgProgress}% Avg Progress
                </Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="secondary" size="lg" className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm">
                <Link to="/projects/timeline">
                  <Clock className="w-4 h-4 mr-2" />
                  Timeline View
                </Link>
              </Button>
              {canCreate && (
                <Dialog
                  open={openAdd}
                  onOpenChange={(v) => {
                    setOpenAdd(v);
                    if (!v) {
                      setEditingId(null);
                      setTitle("");
                      setClient("");
                      setClientIdSel("");
                      setDeveloperId("");
                      setDeveloperQuery("");
                      setDeveloperOpen(false);
                      setStart("");
                      setDeadline("");
                      setPrice("");
                      setLabels("");
                      setDesc("");
                      setProjectType("Client Project");
                    }
                  }}
                >
                  <Button
                    size="lg"
                    className="bg-white text-blue-600 hover:bg-white/90"
                    onClick={() => {
                      if (!canCreate) {
                        toast.error("Only admins can create projects");
                        return;
                      }
                      setOpenAdd(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Project
                  </Button>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{isEditMode ? "Edit Project" : "Create New Project"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="title" className="text-right">Title</Label>
                        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="col-span-3" />
                      </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="type" className="text-right">Type</Label>
                      <Select value={projectType} onValueChange={setProjectType}>
                        <SelectTrigger className="col-span-3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Client Project">Client Project</SelectItem>
                          <SelectItem value="Internal Project">Internal Project</SelectItem>
                          <SelectItem value="Research Project">Research Project</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="client" className="text-right">Client</Label>
                      {clientOptions.length ? (
                        <Select value={clientIdSel} onValueChange={(v) => {
                          if (v === "__none__") {
                            setClientIdSel("");
                            setClient("");
                            return;
                          }
                          setClientIdSel(v);
                          const name = clientOptions.find((o) => o.id === v)?.name || "";
                          setClient(name);
                        }}>
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select client" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">No client</SelectItem>
                            {clientOptions.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id="client"
                          value={client}
                          onChange={(e) => setClient(e.target.value)}
                          className="col-span-3"
                          placeholder="Client name"
                        />
                      )}
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="developer" className="text-right">Developer</Label>
                      <Popover open={developerOpen} onOpenChange={setDeveloperOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            id="developer"
                            variant="outline"
                            role="combobox"
                            aria-expanded={developerOpen}
                            className="col-span-3 justify-between"
                          >
                            {selectedDeveloper
                              ? `${selectedDeveloper.name || selectedDeveloper.email}`
                              : "Select developer"}
                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="col-span-3 p-0" align="start">
                          <Command>
                            <CommandInput
                              placeholder="Type to search…"
                              value={developerQuery}
                              onValueChange={setDeveloperQuery}
                            />
                            <CommandList>
                              <CommandEmpty>No developer found.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  value="__none__"
                                  onSelect={() => {
                                    setDeveloperId("");
                                    setDeveloperQuery("");
                                    setDeveloperOpen(false);
                                  }}
                                >
                                  No developer
                                </CommandItem>
                                {filteredDeveloperOptions.map((d) => (
                                  <CommandItem
                                    key={d._id}
                                    value={`${d.name} ${d.email}`}
                                    onSelect={() => {
                                      setDeveloperId(d._id);
                                      setDeveloperQuery("");
                                      setDeveloperOpen(false);
                                    }}
                                  >
                                    <div className="flex flex-col">
                                      <span className="text-sm font-medium">{d.name || d.email}</span>
                                      {d.email ? <span className="text-xs text-muted-foreground">{d.email}</span> : null}
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="desc" className="text-right">Description</Label>
                      <Textarea id="desc" value={desc} onChange={(e) => setDesc(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="start" className="text-right">Start Date</Label>
                      <div className="col-span-3">
                        <DatePicker value={start} onChange={setStart} placeholder="Pick start date" />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="deadline" className="text-right">Deadline</Label>
                      <div className="col-span-3">
                        <DatePicker value={deadline} onChange={setDeadline} placeholder="Pick deadline" />
                      </div>
                    </div>
                    {canViewPricing && (
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="price" className="text-right">Price</Label>
                        <Input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="col-span-3" />
                      </div>
                    )}
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="labels" className="text-right">Labels</Label>
                      <Select
                        value={(String(labels || "").split(",")[0]?.trim() || "__none__")}
                        onValueChange={(v) => setLabels(v === "__none__" ? "" : v)}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select label" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">No label</SelectItem>
                          {labelOptions.map((l) => (
                            <SelectItem key={l} value={l}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="submit"
                      onClick={createProject}
                      disabled={!canCreate || loading}
                    >
                      {isEditMode ? "Save Changes" : "Create Project"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-8 sm:px-12 lg:px-16 space-y-8">
        {/* Analytics Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 opacity-50" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
            <CardHeader className="relative pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-emerald-100">
                <Briefcase className="w-5 h-5" /> Total Projects
              </CardTitle>
            </CardHeader>
            <CardContent className="relative space-y-3">
              <div className="text-3xl font-bold">{analytics.totalProjects}</div>
              <div className="flex items-center gap-2 text-sm text-emerald-100">
                <TrendingUp className="w-4 h-4" />
                All Projects
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 opacity-50" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
            <CardHeader className="relative pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-100">
                <Activity className="w-5 h-5" /> Active Projects
              </CardTitle>
            </CardHeader>
            <CardContent className="relative space-y-3">
              <div className="text-3xl font-bold">{analytics.activeProjects}</div>
              <div className="flex items-center gap-2 text-sm text-blue-100">
                <Zap className="w-4 h-4" />
                In Progress
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-500 via-purple-600 to-pink-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 opacity-50" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
            <CardHeader className="relative pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-purple-100">
                <Star className="w-5 h-5" /> Completed
              </CardTitle>
            </CardHeader>
            <CardContent className="relative space-y-3">
              <div className="text-3xl font-bold">{analytics.completedProjects}</div>
              <div className="flex items-center gap-2 text-sm text-purple-100">
                <Sparkles className="w-4 h-4" />
                Finished Projects
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 opacity-50" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
            <CardHeader className="relative pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-100">
                <Target className="w-5 h-5" /> Avg Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="relative space-y-3">
              <div className="text-3xl font-bold">{analytics.avgProgress}%</div>
              <div className="flex items-center gap-2 text-sm text-amber-100">
                <BarChart3 className="w-4 h-4" />
                Overall Progress
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm dark:bg-slate-800/80">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Filters:</span>
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Status</SelectItem>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Hold">Hold</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={labelFilter} onValueChange={setLabelFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Label" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Labels</SelectItem>
                    {labelOptions.map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div className="w-40">
                    <DatePicker value={startFrom} onChange={setStartFrom} placeholder="Start from" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-40">
                    <DatePicker value={deadlineTo} onChange={setDeadlineTo} placeholder="Deadline to" />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {isAdmin && (
                  <Dialog open={openLabels} onOpenChange={setOpenLabels}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Tags className="w-4 h-4 mr-2" />
                        Manage Labels
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Manage Project Labels</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <Input
                            placeholder="New label name"
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") addDraftLabel();
                            }}
                          />
                          <Button type="button" onClick={addDraftLabel}>Add</Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {labelDraft.map((label) => (
                            <Badge
                              key={label}
                              variant="outline"
                              className="cursor-pointer"
                              onClick={() => setLabelDraft((p) => p.filter((l) => l !== label))}
                            >
                              {label} ×
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpenLabels(false)}>Close</Button>
                        <Button type="button" onClick={saveLabels}>Save</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}

                {isAdmin && (
                  <Dialog open={openImport} onOpenChange={setOpenImport}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Upload className="w-4 h-4 mr-2" />
                        Import
                      </Button>
                    </DialogTrigger>
                    <ImportProjectsDialog
                      onImported={async () => {
                        setOpenImport(false);
                        await handleImportedProjects();
                      }}
                    />
                  </Dialog>
                )}

                <Button variant="outline" size="sm" onClick={exportToCSV}>
                  <Upload className="w-4 h-4 mr-2" />
                  Export
                </Button>

                <Button variant="outline" size="sm" onClick={printTable}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    className="pl-9 w-64"
                    placeholder="Search projects..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projects Table */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm dark:bg-slate-800/80">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-blue-600" />
              Projects ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="md:hidden space-y-3">
              {filtered.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <div className="flex flex-col items-center gap-2">
                    <FolderKanban className="w-12 h-12 text-muted-foreground/50" />
                    <p className="text-lg font-medium">No projects found</p>
                    <p className="text-sm">Try adjusting your filters or create a new project</p>
                  </div>
                </div>
              ) : (
                filtered.map((r, idx) => (
                  <div key={r.id} className="rounded-xl border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">#{idx + 1}</div>
                        <Button
                          variant="link"
                          className="p-0 h-auto font-medium text-primary text-left whitespace-normal"
                          onClick={() => navigate(`/projects/overview/${r.id}`)}
                        >
                          {r.title}
                        </Button>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon" aria-label="Actions">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/projects/overview/${r.id}`)}>
                            <Eye className="w-4 h-4 mr-2" /> View Details
                          </DropdownMenuItem>
                          {isAdmin ? (
                            <>
                              <DropdownMenuItem onClick={() => openEdit(r)}>
                                <Pencil className="w-4 h-4 mr-2"/> Edit Project
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => deleteProject(r.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2"/> Delete Project
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                      <div className="text-muted-foreground">Client</div>
                      <div className="text-right truncate">
                        {r.clientId ? (
                          <Button
                            variant="link"
                            className="p-0 h-auto text-primary"
                            onClick={() => navigate(`/clients/${r.clientId}`)}
                          >
                            {r.client}
                          </Button>
                        ) : (
                          r.client
                        )}
                      </div>

                      {canViewPricing ? (
                        <>
                          <div className="text-muted-foreground">Price</div>
                          <div className="text-right font-medium">{r.price}</div>
                        </>
                      ) : null}

                      <div className="text-muted-foreground">Start</div>
                      <div className="text-right">{r.start}</div>

                      <div className="text-muted-foreground">Deadline</div>
                      <div
                        className={cn(
                          "text-right",
                          (() => {
                            const dueTs = safeDateTs(r.due);
                            const startTs = safeDateTs(r.start);
                            if (!Number.isFinite(dueTs) || !Number.isFinite(startTs)) return "";
                            return dueTs < startTs ? "text-destructive font-medium" : "";
                          })()
                        )}
                      >
                        {r.due}
                      </div>
                    </div>

                    <div className="mt-3">
                      <button
                        className="w-full text-left hover:opacity-80 transition-opacity"
                        onClick={() => openProgressEditor(r)}
                        title="Click to update progress"
                      >
                        <div className="flex items-center gap-2">
                          <Progress value={r.progress} className="flex-1 h-2" />
                          <div className="text-xs text-muted-foreground w-10 text-right font-medium">
                            {r.progress}%
                          </div>
                        </div>
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div>
                        {(() => {
                          const first = String(r.labels || "")
                            .split(",")
                            .map((x) => x.trim())
                            .filter(Boolean)[0];
                          return first ? <Badge className={getLabelClassName(first)}>{first}</Badge> : <span className="text-muted-foreground">-</span>;
                        })()}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            {r.status}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => updateProjectStatus(r.id, "Open")}>
                            <Badge variant="outline" className="mr-2">Open</Badge>
                            Mark as Open
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateProjectStatus(r.id, "In Progress")}>
                            <Badge variant="outline" className="mr-2">In Progress</Badge>
                            Mark as In Progress
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateProjectStatus(r.id, "Completed")}>
                            <Badge variant="default" className="mr-2">Completed</Badge>
                            Mark as Completed
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateProjectStatus(r.id, "Hold")}>
                            <Badge variant="secondary" className="mr-2">Hold</Badge>
                            Put on Hold
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Client</TableHead>
                    {canViewPricing && <TableHead>Price</TableHead>}
                    <TableHead>Start Date</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r, idx) => (
                    <TableRow key={r.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{idx + 1}</TableCell>
                      <TableCell>
                        <Button
                          variant="link"
                          className="p-0 h-auto font-medium text-primary"
                          onClick={() => navigate(`/projects/overview/${r.id}`)}
                        >
                          {r.title}
                        </Button>
                      </TableCell>
                      <TableCell>
                        {r.clientId ? (
                          <Button
                            variant="link"
                            className="p-0 h-auto text-primary"
                            onClick={() => navigate(`/clients/${r.clientId}`)}
                          >
                            {r.client}
                          </Button>
                        ) : (
                          r.client
                        )}
                      </TableCell>
                      {canViewPricing && <TableCell className="font-medium">{r.price}</TableCell>}
                      <TableCell>{r.start}</TableCell>
                      <TableCell
                        className={(() => {
                          const dueTs = safeDateTs(r.due);
                          const startTs = safeDateTs(r.start);
                          if (!Number.isFinite(dueTs) || !Number.isFinite(startTs)) return "";
                          return dueTs < startTs ? "text-destructive font-medium" : "";
                        })()}
                      >
                        {r.due}
                      </TableCell>
                      <TableCell className="min-w-[140px]">
                        <button
                          className="w-full text-left hover:opacity-80 transition-opacity"
                          onClick={() => openProgressEditor(r)}
                          title="Click to update progress"
                        >
                          <div className="flex items-center gap-2">
                            <Progress value={r.progress} className="flex-1 h-2" />
                            <div className="text-xs text-muted-foreground w-10 text-right font-medium">
                              {r.progress}%
                            </div>
                          </div>
                        </button>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const first = String(r.labels || "")
                            .split(",")
                            .map((x) => x.trim())
                            .filter(Boolean)[0];
                          return first ? <Badge className={getLabelClassName(first)}>{first}</Badge> : <span className="text-muted-foreground">-</span>;
                        })()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              {r.status}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => updateProjectStatus(r.id, "Open")}>
                              <Badge variant="outline" className="mr-2">Open</Badge>
                              Mark as Open
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateProjectStatus(r.id, "In Progress")}>
                              <Badge variant="outline" className="mr-2">In Progress</Badge>
                              Mark as In Progress
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateProjectStatus(r.id, "Completed")}>
                              <Badge variant="default" className="mr-2">Completed</Badge>
                              Mark as Completed
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateProjectStatus(r.id, "Hold")}>
                              <Badge variant="secondary" className="mr-2">Hold</Badge>
                              Put on Hold
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" aria-label="Actions">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/projects/overview/${r.id}`)}>
                              <Eye className="w-4 h-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            {isAdmin ? (
                              <>
                                <DropdownMenuItem onClick={() => openEdit(r)}>
                                  <Pencil className="w-4 h-4 mr-2"/> Edit Project
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => deleteProject(r.id)} 
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2"/> Delete Project
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-12">
                        <div className="flex flex-col items-center gap-2">
                          <FolderKanban className="w-12 h-12 text-muted-foreground/50" />
                          <p className="text-lg font-medium">No projects found</p>
                          <p className="text-sm">Try adjusting your filters or create a new project</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Progress Editor Dialog */}
        <Dialog open={progressOpen} onOpenChange={setProgressOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Update Project Progress</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Progress: {progressValue}%</Label>
                <Input
                  type="range"
                  min={0}
                  max={100}
                  value={progressValue}
                  onChange={(e) => setProgressValue(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="progress-number">Progress Percentage</Label>
                <Input
                  id="progress-number"
                  type="number"
                  min={0}
                  max={100}
                  value={progressValue}
                  onChange={(e) => setProgressValue(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={saveProgressValue}>Update Progress</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

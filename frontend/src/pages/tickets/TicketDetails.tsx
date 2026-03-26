import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, Download, FileText, MoreHorizontal, Paperclip, Send, Tags } from "lucide-react";
import { toast } from "sonner";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// API base centralized via Vite env

type TicketMessage = {
  text?: string;
  createdBy?: string;
  createdAt?: string;
};

type TicketDoc = {
  _id: string;
  ticketNo?: number;
  title: string;
  client?: string;
  clientId?: string;
  description?: string;
  requestedBy?: string;
  type?: string;
  labels?: string[];
  assignedTo?: string;
  status?: string;
  lastActivity?: string;
  createdAt?: string;
  messages?: TicketMessage[];
};

type TicketLabelDoc = { _id: string; name: string; color?: string };

type TaskDoc = {
  _id: string;
  taskNo?: number;
  title: string;
  status?: string;
  createdAt?: string;
};

type FileDoc = {
  _id: string;
  name?: string;
  path?: string;
  url?: string;
  createdAt?: string;
};

type TicketTemplateDoc = {
  _id: string;
  name: string;
  body: string;
  type?: string;
};

export default function TicketDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<TicketDoc | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [ticketLabels, setTicketLabels] = useState<TicketLabelDoc[]>([]);
  const [labelDraft, setLabelDraft] = useState("-");
  const [labelSaving, setLabelSaving] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  const [tasks, setTasks] = useState<TaskDoc[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [openAddTask, setOpenAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [addingTask, setAddingTask] = useState(false);

  const [files, setFiles] = useState<FileDoc[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [templates, setTemplates] = useState<TicketTemplateDoc[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [openManageTemplates, setOpenManageTemplates] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateBody, setNewTemplateBody] = useState("");
  const [newTemplateType, setNewTemplateType] = useState("all");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [confirmDeleteTemplateOpen, setConfirmDeleteTemplateOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  const [openEdit, setOpenEdit] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editType, setEditType] = useState("general");
  const [editAssignedTo, setEditAssignedTo] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [openMerge, setOpenMerge] = useState(false);
  const [mergeSourceId, setMergeSourceId] = useState("-");
  const [merging, setMerging] = useState(false);
  const [mergeCandidates, setMergeCandidates] = useState<TicketDoc[]>([]);

  const ticketTitle = useMemo(() => {
    if (!ticket) return "Ticket";
    const no = ticket.ticketNo ? `#${ticket.ticketNo}` : "";
    return `Ticket ${no}${ticket.title ? ` - ${ticket.title}` : ""}`.trim();
  }, [ticket]);

  const statusBadge = useMemo(() => {
    const s = (ticket?.status || "open").toLowerCase();
    if (s === "closed") return { label: "Closed", className: "bg-muted text-muted-foreground" };
    return { label: "New", className: "bg-amber-400 text-white" };
  }, [ticket]);

  const loadTicket = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/tickets/${id}`, { headers: getAuthHeaders() });
      const text = await res.text().catch(() => "");
      const json = text ? (() => {
        try {
          return JSON.parse(text);
        } catch {
          return null;
        }
      })() : null;
      if (!res.ok) {
        const detail = (json as any)?.error || (text || "").slice(0, 200);
        throw new Error(`Failed to load ticket (HTTP ${res.status})${detail ? `: ${detail}` : ""}`);
      }
      setTicket((json as any) || null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load ticket");
    } finally {
      setLoading(false);
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

  const loadTasks = async () => {
    if (!id) return;
    try {
      setLoadingTasks(true);
      const res = await fetch(`${API_BASE}/api/tasks?ticketId=${encodeURIComponent(id)}`, { headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load tasks");
      setTasks(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load tasks");
    } finally {
      setLoadingTasks(false);
    }
  };

  const loadFiles = async () => {
    if (!id) return;
    try {
      setLoadingFiles(true);
      const res = await fetch(`${API_BASE}/api/files?ticketId=${encodeURIComponent(id)}`, { headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load files");
      setFiles(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load files");
    } finally {
      setLoadingFiles(false);
    }
  };

  const loadTemplates = async (typeArg?: string) => {
    try {
      setLoadingTemplates(true);
      const t = (typeArg || "").toString().trim();
      const qs = t ? `?type=${encodeURIComponent(t)}` : "";
      const res = await fetch(`${API_BASE}/api/ticket-templates${qs}`, { headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load templates");
      setTemplates(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load templates");
    } finally {
      setLoadingTemplates(false);
    }
  };

  useEffect(() => {
    loadTicket();
    loadTicketLabels();
    loadTasks();
    loadFiles();
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    loadTemplates(ticket?.type || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.type]);

  const filteredTemplates = useMemo(() => {
    const t = (ticket?.type || "").toString().trim().toLowerCase();
    if (!t) return templates;
    return templates.filter((x) => {
      const xt = (x.type || "all").toString().trim().toLowerCase();
      return xt === "all" || xt === t;
    });
  }, [templates, ticket?.type]);

  const insertTemplate = (t: TicketTemplateDoc) => {
    const body = (t?.body || "").toString();
    setMsg((m) => (m ? `${m}\n\n${body}` : body));
  };

  const createTemplate = async () => {
    const name = newTemplateName.trim();
    const body = newTemplateBody.trim();
    const type = (newTemplateType || "all").toString().trim().toLowerCase();
    if (!name) {
      toast.error("Template name is required");
      return;
    }
    if (!body) {
      toast.error("Template body is required");
      return;
    }
    try {
      setSavingTemplate(true);
      const res = await fetch(`${API_BASE}/api/ticket-templates`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ name, body, type }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to create template");
      toast.success("Template saved");
      setNewTemplateName("");
      setNewTemplateBody("");
      setNewTemplateType("all");
      await loadTemplates(ticket?.type || "");
    } catch (e: any) {
      toast.error(e?.message || "Failed to create template");
    } finally {
      setSavingTemplate(false);
    }
  };

  const deleteTemplate = async (idToDelete: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/ticket-templates/${idToDelete}`, { method: "DELETE", headers: getAuthHeaders() });

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to delete template");
      toast.success("Template deleted");
      await loadTemplates(ticket?.type || "");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete template");
    }
  };

  const toggleClosed = async () => {
    if (!id || !ticket) return;
    try {
      const nextStatus = (ticket.status || "open") === "closed" ? "open" : "closed";
      const res = await fetch(`${API_BASE}/api/tickets/${id}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status: nextStatus, lastActivity: new Date().toISOString() }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to update ticket");
      setTicket(json);
      toast.success(nextStatus === "closed" ? "Marked as closed" : "Re-opened");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update ticket");
    }
  };

  const addLabel = async () => {
    if (!id || !ticket) return;
    const name = (labelDraft || "").toString().trim();
    if (!name || name === "-") return;
    try {
      setLabelSaving(true);
      const current = Array.isArray(ticket.labels) ? ticket.labels : [];
      const next = current.includes(name) ? current : [...current, name];
      const res = await fetch(`${API_BASE}/api/tickets/${id}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ labels: next, lastActivity: new Date().toISOString() }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to add label");
      setTicket(json);
      setLabelDraft("-");
      toast.success("Label added");
    } catch (e: any) {
      toast.error(e?.message || "Failed to add label");
    } finally {
      setLabelSaving(false);
    }
  };

  const openEditDialog = () => {
    if (!ticket) return;
    setEditTitle(ticket.title || "");
    setEditDescription(ticket.description || "");
    setEditType(ticket.type || "general");
    setEditAssignedTo(ticket.assignedTo || "");
    setOpenEdit(true);
  };

  const saveEdit = async () => {
    if (!id || !ticket) return;
    const title = editTitle.trim();
    if (!title) {
      toast.error("Title is required");
      return;
    }
    try {
      setSavingEdit(true);
      const res = await fetch(`${API_BASE}/api/tickets/${id}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          title,
          description: editDescription || "",
          type: editType || "general",
          assignedTo: editAssignedTo || "",
          lastActivity: new Date().toISOString(),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to update ticket");
      setTicket(json);
      setOpenEdit(false);
      toast.success("Updated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update ticket");
    } finally {
      setSavingEdit(false);
    }
  };

  const openMergeDialog = async () => {
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE}/api/tickets`, { headers: getAuthHeaders() });

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load tickets");
      const items = Array.isArray(json) ? json : [];
      setMergeCandidates(items.filter((t: TicketDoc) => t?._id && t._id !== id));
      setMergeSourceId("-");
      setOpenMerge(true);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load tickets");
    }
  };

  const doMerge = async () => {
    if (!id) return;
    if (!mergeSourceId || mergeSourceId === "-") {
      toast.error("Select a ticket to merge");
      return;
    }
    try {
      setMerging(true);
      const res = await fetch(`${API_BASE}/api/tickets/${id}/merge`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ sourceId: mergeSourceId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to merge");
      setTicket(json);
      setOpenMerge(false);
      toast.success("Merged");
      await loadTasks();
      await loadFiles();
    } catch (e: any) {
      toast.error(e?.message || "Failed to merge");
    } finally {
      setMerging(false);
    }
  };

  const addTask = async () => {
    if (!id) return;
    const title = newTaskTitle.trim();
    if (!title) {
      toast.error("Task title is required");
      return;
    }
    try {
      setAddingTask(true);
      const res = await fetch(`${API_BASE}/api/tasks`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ title, ticketId: id, status: "todo", priority: "medium" }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to add task");
      toast.success("Task added");
      setNewTaskTitle("");
      setOpenAddTask(false);
      await loadTasks();
    } catch (e: any) {
      toast.error(e?.message || "Failed to add task");
    } finally {
      setAddingTask(false);
    }
  };

  const uploadFiles = async (selected: FileList | null) => {
    if (!id) return;
    if (!selected || !selected.length) return;
    try {
      setUploading(true);
      for (const f of Array.from(selected)) {
        // eslint-disable-next-line no-await-in-loop
        const form = new FormData();
        form.append("file", f);
        form.append("ticketId", id);
        // eslint-disable-next-line no-await-in-loop
        const res = await fetch(`${API_BASE}/api/files`, { method: "POST", headers: getAuthHeaders(), body: form });
        // eslint-disable-next-line no-await-in-loop
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || "Failed to upload");
      }
      toast.success("Uploaded");
      await loadFiles();
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const sendMessage = async () => {
    if (!id) return;
    const text = msg.trim();
    if (!text) return;
    try {
      setSending(true);
      const res = await fetch(`${API_BASE}/api/tickets/${id}/messages`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ text, createdBy: "" }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to send");
      setTicket(json);
      setMsg("");
      toast.success("Sent");
    } catch (e: any) {
      toast.error(e?.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const saveAsNote = async () => {
    if (!ticket) return;
    const text = msg.trim();
    if (!text) {
      toast.error("Write a comment first");
      return;
    }
    try {
      setSavingNote(true);
      const title = `${ticket.ticketNo ? `Ticket #${ticket.ticketNo}` : "Ticket"}${ticket.title ? ` - ${ticket.title}` : ""}`.trim();
      const res = await fetch(`${API_BASE}/api/notes`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ title, text, private: true }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to save note");
      toast.success("Saved as note");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save note");
    } finally {
      setSavingNote(false);
    }
  };

  const inCount = (ticket?.messages || []).length;
  const outCount = 0;

  const downloadCompletionDoc = () => {
    if (!ticket) return;
    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Popup blocked. Please allow popups to download the document.");
      return;
    }

    const companyName = "HealthSpire";
    const date = new Date().toLocaleDateString();
    const ticketNo = ticket.ticketNo ? `#${ticket.ticketNo}` : ticket._id.slice(-6).toUpperCase();
    
    const tasksHtml = tasks.length > 0 
      ? `<ul>${tasks.map(t => `<li>${t.title} (${t.status || 'Done'})</li>`).join('')}</ul>`
      : "<p>N/A</p>";

    const html = `
      <html>
        <head>
          <title>Ticket Completion - ${ticketNo}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; max-width: 800px; margin: 0 auto; }
            .header { border-bottom: 2px solid #4f46e5; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
            .company-name { font-size: 28px; font-weight: 800; color: #4f46e5; letter-spacing: -0.025em; }
            .doc-type { font-size: 14px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; }
            .ticket-info { background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 30px; display: grid; grid-template-cols: 1fr 1fr; gap: 10px; }
            .info-item { font-size: 14px; }
            .info-label { font-weight: 600; color: #64748b; margin-right: 8px; }
            h2 { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 30px; margin-bottom: 15px; border-left: 4px solid #4f46e5; padding-left: 12px; }
            .section { margin-bottom: 30px; }
            ul { padding-left: 20px; }
            li { margin-bottom: 8px; }
            .footer { margin-top: 60px; border-top: 1px solid #e2e8f0; pt: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
            @media print { .no-print { display: none; } body { padding: 0; } }
            .btn { background: #4f46e5; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; cursor: pointer; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="no-print" style="text-align: right;">
            <button class="btn" onclick="window.print()">Print / Save as PDF</button>
          </div>
          <div class="header">
            <div>
              <div class="company-name">${companyName}</div>
              <div class="doc-type">Ticket Completion Certificate</div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 700; font-size: 18px;">${ticketNo}</div>
              <div style="font-size: 14px; color: #64748b;">Date: ${date}</div>
            </div>
          </div>

          <div class="section">
            <p>Dear <strong>${ticket.client || 'Valued Client'}</strong>,</p>
            <p>We are pleased to inform you that your support ticket has been successfully resolved. Below is a summary of the work performed.</p>
          </div>

          <div class="ticket-info">
            <div class="info-item"><span class="info-label">Subject:</span> ${ticket.title}</div>
            <div class="info-item"><span class="info-label">Status:</span> Resolved & Closed</div>
            <div class="info-item"><span class="info-label">Requested By:</span> ${ticket.requestedBy || '-'}</div>
            <div class="info-item"><span class="info-label">Assigned To:</span> ${ticket.assignedTo || '-'}</div>
          </div>

          <div class="section">
            <h2>Original Request</h2>
            <div style="background: #fff; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; font-size: 14px; white-space: pre-wrap;">${ticket.description || 'No description provided.'}</div>
          </div>

          <div class="section">
            <h2>What We Have Done</h2>
            ${tasksHtml}
            <p style="font-size: 14px; margin-top: 15px;">All requested changes and fixes have been implemented and verified. The ticket is now marked as complete in our system.</p>
          </div>

          <div class="section">
            <p>Thank you for choosing <strong>${companyName}</strong>. If you have any further questions regarding this ticket, please don't hesitate to contact us.</p>
          </div>

          <div class="footer">
            &copy; ${new Date().getFullYear()} mindspire.org • HealthSpire Management Platform
          </div>
        </body>
      </html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            Back
          </Button>
          <h1 className="text-base font-semibold">{ticketTitle}</h1>
        </div>
        <div className="flex items-center gap-2">
          {ticket?.status === "closed" && (
            <Button
              variant="outline"
              size="sm"
              onClick={downloadCompletionDoc}
              className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
            >
              <FileText className="w-4 h-4 mr-2" />
              Completion Doc
            </Button>
          )}
          <Button onClick={toggleClosed} disabled={!ticket} className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {(ticket?.status || "open") === "closed" ? "Mark as Open" : "Mark as Closed"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <span className={`text-xs px-3 py-1 rounded-full ${statusBadge.className}`}>{statusBadge.label}</span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <button type="button" className="hover:underline inline-flex items-center gap-2" onClick={() => {}}>
                <Tags className="w-4 h-4" />
                Add Label
              </button>
              <span className="text-muted-foreground">|</span>
              <span>{ticket?.assignedTo || "-"}</span>
              <span>{ticket?.lastActivity ? `${new Date(ticket.lastActivity).toLocaleString()}` : ""}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <Select value={labelDraft} onValueChange={setLabelDraft}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Add label" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-">Add label</SelectItem>
                {ticketLabels.map((l) => (
                  <SelectItem key={l._id} value={l.name}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={addLabel} disabled={!ticket || labelSaving || labelDraft === "-"}>
              {labelSaving ? "Saving..." : "Add"}
            </Button>
            <div className="flex items-center gap-1 flex-wrap">
              {(ticket?.labels || []).map((l) => (
                <span key={l} className="text-xs px-2 py-0.5 rounded-full border">
                  {l}
                </span>
              ))}
            </div>
          </div>

          <Card>
            <CardContent className="p-4 space-y-3">
              {loading ? (
                <div className="text-muted-foreground">Loading...</div>
              ) : ticket ? (
                <>
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-semibold">
                      {(ticket.client || "M").slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium">{ticket.client || "Mindspire"}</div>
                      <div className="text-xs text-muted-foreground">{ticket.createdAt ? `Today at ${new Date(ticket.createdAt).toLocaleTimeString()}` : ""}</div>
                      <div className="text-sm mt-1 whitespace-pre-wrap">{ticket.description || ""}</div>
                    </div>
                  </div>

                  <div className="border rounded-md overflow-hidden">
                    <Textarea
                      placeholder="Write a comment..."
                      value={msg}
                      onChange={(e) => setMsg(e.target.value)}
                      className="min-h-[180px] border-0 rounded-none"
                    />
                    <div className="flex items-center justify-between p-3 border-t bg-muted/20 flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <label>
                          <input
                            type="file"
                            multiple
                            className="hidden"
                            disabled={!ticket || uploading}
                            onChange={(e) => uploadFiles(e.target.files)}
                          />
                          <Button variant="outline" size="sm" className="gap-2" disabled={!ticket || uploading}>
                            <Paperclip className="w-4 h-4" />
                            {uploading ? "Uploading..." : "Upload File"}
                          </Button>
                        </label>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" disabled={!ticket || loadingTemplates}>
                              {loadingTemplates ? "Loading..." : "Template"}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {filteredTemplates.length ? (
                              filteredTemplates.map((t) => (
                                <DropdownMenuItem key={t._id} onClick={() => insertTemplate(t)}>
                                  {t.name}
                                </DropdownMenuItem>
                              ))
                            ) : (
                              <DropdownMenuItem disabled>No templates</DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setOpenManageTemplates(true)}>
                              Manage templates
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={saveAsNote} disabled={!ticket || savingNote || !msg.trim()}>
                          {savingNote ? "Saving..." : "Save as note"}
                        </Button>
                        <Button size="sm" className="gap-2" onClick={sendMessage} disabled={sending || !msg.trim()}>
                          <Send className="w-4 h-4" />
                          {sending ? "Sending..." : "Send"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">Files</div>
                    {loadingFiles ? (
                      <div className="text-sm text-muted-foreground">Loading...</div>
                    ) : files.length ? (
                      <div className="flex flex-col gap-1">
                        {files.map((f) => {
                          const href = f.url || f.path || "";
                          return (
                            <a
                              key={f._id}
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm text-primary hover:underline"
                            >
                              {f.name || "file"}
                            </a>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No files</div>
                    )}
                  </div>

                  <div className="space-y-3">
                    {(ticket.messages || []).length ? (
                      (ticket.messages || []).map((m, idx) => (
                        <div key={idx} className="rounded-md border p-3">
                          <div className="text-xs text-muted-foreground">
                            {(m.createdBy || "") || ""}{m.createdAt ? ` • ${new Date(m.createdAt).toLocaleString()}` : ""}
                          </div>
                          <div className="text-sm whitespace-pre-wrap">{m.text || ""}</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-muted-foreground text-sm">No messages</div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-muted-foreground">Ticket not found</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">Ticket info</div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="more">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={openEditDialog}>Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={openMergeDialog}>Merge</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="rounded-md border p-2 text-center text-sm">
                {ticket?.type || "general"}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md border p-3 text-center">
                  <div className="text-xs text-muted-foreground">In messages</div>
                  <div className="text-lg font-semibold text-red-500">{inCount}</div>
                </div>
                <div className="rounded-md border p-3 text-center">
                  <div className="text-xs text-muted-foreground">Out messages</div>
                  <div className="text-lg font-semibold text-blue-600">{outCount}</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {ticket?.createdAt ? `Today at ${new Date(ticket.createdAt).toLocaleTimeString()}` : ""}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium">Assigned</div>
              <div className="text-sm text-muted-foreground mt-1">{ticket?.assignedTo || "-"}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Tasks</div>
                <Button variant="ghost" size="icon-sm" aria-label="add task" onClick={() => setOpenAddTask(true)}>
                  +
                </Button>
              </div>
              {loadingTasks ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : tasks.length ? (
                <div className="space-y-2">
                  {tasks.slice(0, 5).map((t) => (
                    <button
                      key={t._id}
                      type="button"
                      className="w-full text-left text-sm hover:underline"
                      onClick={() => navigate(`/tasks/${t._id}`)}
                    >
                      {t.taskNo ? `#${t.taskNo} ` : ""}{t.title}
                    </button>
                  ))}
                </div>
              ) : (
                <button type="button" className="text-sm text-primary hover:underline" onClick={() => setOpenAddTask(true)}>
                  + Add task
                </button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-sm">Title</div>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-1">
              <div className="text-sm">Ticket type</div>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger><SelectValue placeholder="General Support" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Support</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <div className="text-sm">Assigned</div>
              <Input value={editAssignedTo} onChange={(e) => setEditAssignedTo(e.target.value)} placeholder="Assignee name" />
            </div>
            <div className="space-y-1">
              <div className="text-sm">Description</div>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="min-h-[120px]" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenEdit(false)}>Close</Button>
            <Button onClick={saveEdit} disabled={savingEdit}>{savingEdit ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openMerge} onOpenChange={setOpenMerge}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Merge ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Select a ticket to merge into this one.</div>
            <Select value={mergeSourceId} onValueChange={setMergeSourceId}>
              <SelectTrigger><SelectValue placeholder="Select ticket" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="-">Select ticket</SelectItem>
                {mergeCandidates.map((t) => (
                  <SelectItem key={t._id} value={t._id}>
                    {(t.ticketNo ? `#${t.ticketNo} ` : "") + (t.title || t._id.slice(-6))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenMerge(false)}>Close</Button>
            <Button onClick={doMerge} disabled={merging}>{merging ? "Merging..." : "Merge"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openAddTask} onOpenChange={setOpenAddTask}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add task</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div className="text-sm">Task title</div>
            <Input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Task title" />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenAddTask(false)}>Close</Button>
            <Button onClick={addTask} disabled={addingTask || !newTaskTitle.trim()}>{addingTask ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openManageTemplates} onOpenChange={setOpenManageTemplates}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ticket templates</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="text-sm font-medium">Create template</div>
              <div className="space-y-1">
                <div className="text-sm">Name</div>
                <Input value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} placeholder="e.g. Initial response" />
              </div>
              <div className="space-y-1">
                <div className="text-sm">Ticket type</div>
                <Select value={newTemplateType} onValueChange={setNewTemplateType}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="general">General Support</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <div className="text-sm">Body</div>
                <Textarea value={newTemplateBody} onChange={(e) => setNewTemplateBody(e.target.value)} className="min-h-[160px]" placeholder="Template message..." />
              </div>
              <div className="flex justify-end">
                <Button onClick={createTemplate} disabled={savingTemplate || !newTemplateName.trim() || !newTemplateBody.trim()}>
                  {savingTemplate ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium">Saved templates</div>
              {loadingTemplates ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : templates.length ? (
                <div className="space-y-2">
                  {templates.map((t) => (
                    <div key={t._id} className="border rounded-md p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium text-sm">{t.name}</div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => insertTemplate(t)}>
                            Use
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => { setTemplateToDelete(t._id); setConfirmDeleteTemplateOpen(true); }}>
                            Delete
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-pre-wrap mt-2">{t.body}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No templates</div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenManageTemplates(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDeleteTemplateOpen}
        onOpenChange={setConfirmDeleteTemplateOpen}
        onConfirm={() => templateToDelete && deleteTemplate(templateToDelete)}
        title="Delete Template"
        description="Are you sure you want to delete this ticket template?"
        variant="destructive"
      />
    </div>
  );
}

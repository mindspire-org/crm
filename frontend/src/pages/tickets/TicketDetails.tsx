import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, Download, FileText, MoreHorizontal, Paperclip, Send, Tags, User, Clock, MessageSquare, Activity, Calendar, ShieldCheck, ChevronRight, Plus } from "lucide-react";
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
          <title>Ticket Resolution - ${ticketNo}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            
            :root {
              --primary: #4f46e5;
              --primary-light: #eef2ff;
              --text-main: #0f172a;
              --text-muted: #64748b;
              --border: #e2e8f0;
              --success: #10b981;
              --bg-light: #f8fafc;
            }

            body { 
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              padding: 0; 
              margin: 0;
              color: var(--text-main); 
              line-height: 1.5; 
              background: #fff;
            }

            .page-container {
              max-width: 850px;
              margin: 0 auto;
              padding: 60px 50px;
            }

            .header { 
              display: flex; 
              justify-content: space-between; 
              align-items: flex-start; 
              margin-bottom: 48px;
            }

            .logo-section {
              display: flex;
              align-items: center;
              gap: 12px;
            }

            .logo-mark {
              width: 40px;
              height: 40px;
              background: var(--primary);
              border-radius: 10px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: 800;
              font-size: 20px;
            }

            .company-name { 
              font-size: 24px; 
              font-weight: 800; 
              color: var(--text-main); 
              letter-spacing: -0.02em; 
            }

            .doc-badge {
              display: inline-block;
              padding: 6px 12px;
              background: var(--primary-light);
              color: var(--primary);
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              border-radius: 6px;
              margin-top: 4px;
            }

            .ticket-meta { 
              text-align: right; 
            }

            .ticket-no { 
              font-size: 20px; 
              font-weight: 700; 
              color: var(--primary);
            }

            .ticket-date { 
              font-size: 14px; 
              color: var(--text-muted); 
              margin-top: 4px;
            }

            .hero-section {
              background: var(--bg-light);
              border: 1px solid var(--border);
              border-radius: 16px;
              padding: 32px;
              margin-bottom: 40px;
              position: relative;
              overflow: hidden;
            }

            .hero-section::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              width: 4px;
              height: 100%;
              background: var(--primary);
            }

            .status-banner {
              display: flex;
              align-items: center;
              gap: 8px;
              color: var(--success);
              font-weight: 700;
              font-size: 14px;
              margin-bottom: 12px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }

            .hero-title {
              font-size: 28px;
              font-weight: 700;
              margin: 0 0 16px 0;
              color: var(--text-main);
              line-height: 1.2;
            }

            .grid-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 24px;
              margin-top: 24px;
              padding-top: 24px;
              border-top: 1px solid var(--border);
            }

            .info-box h4 {
              font-size: 12px;
              color: var(--text-muted);
              text-transform: uppercase;
              margin: 0 0 4px 0;
              letter-spacing: 0.05em;
            }

            .info-box p {
              font-size: 15px;
              font-weight: 600;
              margin: 0;
            }

            .section-title { 
              font-size: 18px; 
              font-weight: 700; 
              color: var(--text-main); 
              margin: 40px 0 20px 0; 
              display: flex;
              align-items: center;
              gap: 10px;
            }

            .section-title::after {
              content: '';
              flex: 1;
              height: 1px;
              background: var(--border);
            }

            .content-block {
              font-size: 15px;
              color: #334155;
              line-height: 1.6;
              background: #fff;
              border: 1px solid var(--border);
              padding: 24px;
              border-radius: 12px;
            }

            .task-list {
              list-style: none;
              padding: 0;
              margin: 0;
            }

            .task-item {
              display: flex;
              align-items: flex-start;
              gap: 12px;
              padding: 12px 0;
              border-bottom: 1px solid var(--bg-light);
            }

            .task-item:last-child { border-bottom: none; }

            .check-icon {
              width: 20px;
              height: 20px;
              background: var(--success);
              color: white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
              flex-shrink: 0;
              margin-top: 2px;
            }

            .footer { 
              margin-top: 80px; 
              padding-top: 32px;
              border-top: 1px solid var(--border); 
              text-align: center; 
            }

            .footer-text {
              font-size: 13px;
              color: var(--text-muted);
            }

            .footer-brand {
              font-weight: 700;
              color: var(--primary);
              margin-top: 8px;
            }

            @media print { 
              .no-print { display: none; } 
              body { background: #fff; }
              .page-container { padding: 40px 30px; }
            }

            .btn-print { 
              background: var(--primary); 
              color: white; 
              border: none; 
              padding: 12px 24px; 
              border-radius: 8px; 
              font-weight: 600; 
              font-size: 14px;
              cursor: pointer; 
              transition: opacity 0.2s;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            }
            .btn-print:hover { opacity: 0.9; }
          </style>
        </head>
        <body>
          <div class="no-print" style="padding: 20px; background: var(--bg-light); border-bottom: 1px solid var(--border); text-align: right;">
            <button class="btn-print" onclick="window.print()">Download as PDF</button>
          </div>

          <div class="page-container">
            <div class="header">
              <div class="logo-section">
                <div class="logo-mark">H</div>
                <div>
                  <div class="company-name">${companyName}</div>
                  <div class="doc-badge">Resolution Certificate</div>
                </div>
              </div>
              <div class="ticket-meta">
                <div class="ticket-no">${ticketNo}</div>
                <div class="ticket-date">${date}</div>
              </div>
            </div>

            <div class="hero-section">
              <div class="status-banner">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Resolved Successfully
              </div>
              <h1 class="hero-title">${ticket.title}</h1>
              <p style="color: var(--text-muted); margin: 0; font-size: 15px;">
                This document serves as official confirmation that the support request has been completed and verified by our technical team.
              </p>

              <div class="grid-info">
                <div class="info-box">
                  <h4>Client Name</h4>
                  <p>${ticket.client || 'Valued Client'}</p>
                </div>
                <div class="info-box">
                  <h4>Requested By</h4>
                  <p>${ticket.requestedBy || '-'}</p>
                </div>
                <div class="info-box">
                  <h4>Technical Representative</h4>
                  <p>${ticket.assignedTo || '-'}</p>
                </div>
                <div class="info-box">
                  <h4>Resolution Date</h4>
                  <p>${date}</p>
                </div>
              </div>
            </div>

            <div class="section-title">Original Requirement</div>
            <div class="content-block" style="white-space: pre-wrap;">${ticket.description || 'No description provided.'}</div>

            <div class="section-title">Work Performed</div>
            <div class="content-block">
              ${tasks.length > 0 
                ? `<ul class="task-list">
                    ${tasks.map(t => `
                      <li class="task-item">
                        <div class="check-icon">✓</div>
                        <div>
                          <div style="font-weight: 600;">${t.title}</div>
                          <div style="font-size: 13px; color: var(--text-muted);">Completed successfully</div>
                        </div>
                      </li>
                    `).join('')}
                   </ul>`
                : `<p style="margin: 0; color: var(--text-muted);">All standard resolution procedures were followed and implemented.</p>`
              }
            </div>

            <div class="section-title">Next Steps</div>
            <p style="font-size: 15px; color: var(--text-muted); line-height: 1.6;">
              Your satisfaction is our top priority. If you encounter any issues related to this resolution or have additional questions, please feel free to reach out to our support team quoting the ticket reference <strong>${ticketNo}</strong>.
            </p>

            <div class="footer">
              <div class="footer-text">
                Thank you for choosing ${companyName} for your technical needs.
              </div>
              <div class="footer-brand">${companyName} Support Portal</div>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 16px;">
                &copy; ${new Date().getFullYear()} HealthSpire Management • Confidential Document
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Enhanced Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-background p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="rounded-full hover:bg-muted"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${statusBadge.className}`}>
                {statusBadge.label}
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                {ticket?.type || "General"} Support
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">{ticketTitle}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {ticket?.status === "closed" && (
            <Button
              variant="outline"
              size="sm"
              onClick={downloadCompletionDoc}
              className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800 transition-colors shadow-sm"
            >
              <FileText className="w-4 h-4 mr-2" />
              Resolution Doc
            </Button>
          )}
          <Button 
            onClick={toggleClosed} 
            disabled={!ticket} 
            variant={(ticket?.status || "open") === "closed" ? "outline" : "default"}
            className="gap-2 shadow-sm"
          >
            {(ticket?.status || "open") === "closed" ? (
              <Activity className="w-4 h-4" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {(ticket?.status || "open") === "closed" ? "Re-open Ticket" : "Close Ticket"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Label Management Bar */}
          <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl border border-dashed">
            <Tags className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
              {(ticket?.labels || []).length > 0 ? (
                (ticket?.labels || []).map((l) => (
                  <span key={l} className="text-[11px] font-semibold bg-background border px-2.5 py-1 rounded-lg shadow-sm whitespace-nowrap">
                    {l}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted-foreground italic">No labels applied</span>
              )}
            </div>
            <div className="flex items-center gap-2 border-l pl-3 ml-1">
              <Select value={labelDraft} onValueChange={setLabelDraft}>
                <SelectTrigger className="h-8 w-[140px] text-xs bg-background">
                  <SelectValue placeholder="Add Label" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">Select Label</SelectItem>
                  {ticketLabels.map((l) => (
                    <SelectItem key={l._id} value={l.name}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={addLabel} 
                disabled={!ticket || labelSaving || labelDraft === "-"}
                className="h-8 px-3 text-xs"
              >
                {labelSaving ? "..." : "Apply"}
              </Button>
            </div>
          </div>

          <Card className="overflow-hidden border-none shadow-md ring-1 ring-border">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-12 text-center text-muted-foreground animate-pulse">
                  <Activity className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  Loading ticket data...
                </div>
              ) : ticket ? (
                <div className="flex flex-col h-full">
                  {/* Original Request Header */}
                  <div className="p-6 border-b bg-muted/10">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shadow-inner">
                        {(ticket.client || "M").slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-bold text-base">{ticket.client || "External User"}</h3>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : ""}
                          </span>
                        </div>
                        <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap bg-background p-4 rounded-xl border shadow-sm italic border-primary/10">
                          {ticket.description || "No description provided."}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Activity/Message Feed */}
                  <div className="p-6 bg-slate-50/50">
                    <div className="flex items-center gap-2 mb-6">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500">Activity & Discussion</h4>
                    </div>

                    <div className="space-y-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {(ticket.messages || []).length ? (
                        (ticket.messages || []).map((m, idx) => (
                          <div key={idx} className="relative pl-12">
                            <div className="absolute left-0 top-1 h-10 w-10 rounded-full bg-background border-2 border-slate-200 flex items-center justify-center z-10">
                              <User className="w-5 h-5 text-slate-400" />
                            </div>
                            <div className="bg-background rounded-2xl border p-4 shadow-sm group hover:shadow-md transition-shadow">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-bold text-slate-700">{(m.createdBy || "System Agent") || ""}</span>
                                <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                  {m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}
                                </span>
                              </div>
                              <div className="text-sm text-slate-600 whitespace-pre-wrap">{m.text || ""}</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="pl-12 py-4">
                          <div className="text-sm text-slate-400 italic bg-white border border-dashed p-4 rounded-xl text-center">
                            No activity messages recorded yet.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reply Editor */}
                  <div className="p-6 border-t bg-background">
                    <div className="relative group">
                      <Textarea
                        placeholder="Type your response or internal note..."
                        value={msg}
                        onChange={(e) => setMsg(e.target.value)}
                        className="min-h-[160px] p-4 text-sm rounded-xl border-slate-200 focus-visible:ring-primary/20 transition-all resize-none shadow-sm"
                      />
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2">
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              multiple
                              className="hidden"
                              disabled={!ticket || uploading}
                              onChange={(e) => uploadFiles(e.target.files)}
                            />
                            <Button variant="outline" size="sm" className="h-9 gap-2 rounded-lg border-slate-200 hover:bg-slate-50" disabled={!ticket || uploading}>
                              <Paperclip className="w-3.5 h-3.5" />
                              <span className="text-xs">{uploading ? "Uploading..." : "Attach File"}</span>
                            </Button>
                          </label>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-9 gap-2 rounded-lg border-slate-200 hover:bg-slate-50" disabled={!ticket || loadingTemplates}>
                                <FileText className="w-3.5 h-3.5" />
                                <span className="text-xs">{loadingTemplates ? "..." : "Templates"}</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56 rounded-xl p-2 shadow-xl border-slate-200">
                              {filteredTemplates.length ? (
                                filteredTemplates.map((t) => (
                                  <DropdownMenuItem key={t._id} onClick={() => insertTemplate(t)} className="rounded-lg text-xs py-2">
                                    {t.name}
                                  </DropdownMenuItem>
                                ))
                              ) : (
                                <DropdownMenuItem disabled className="text-xs">No templates found</DropdownMenuItem>
                              )}
                              <div className="h-px bg-slate-100 my-1" />
                              <DropdownMenuItem onClick={() => setOpenManageTemplates(true)} className="rounded-lg text-xs py-2 font-medium text-primary">
                                Manage Templates
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={saveAsNote} 
                            disabled={!ticket || savingNote || !msg.trim()}
                            className="h-9 text-xs font-medium text-slate-500 hover:text-slate-700"
                          >
                            {savingNote ? "Saving..." : "Save as internal note"}
                          </Button>
                          <Button 
                            size="sm" 
                            className="h-9 gap-2 px-5 rounded-lg shadow-md hover:shadow-lg transition-all" 
                            onClick={sendMessage} 
                            disabled={sending || !msg.trim()}
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span className="text-xs font-bold">{sending ? "Sending..." : "Send Response"}</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Attached Files Section */}
                  <div className="p-6 bg-slate-50/50 border-t">
                    <div className="flex items-center gap-2 mb-4">
                      <Paperclip className="w-4 h-4 text-slate-400" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Shared Files</h4>
                    </div>
                    {loadingFiles ? (
                      <div className="text-sm text-muted-foreground">Loading attachments...</div>
                    ) : files.length ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {files.map((f) => {
                          const href = f.url || f.path || "";
                          return (
                            <a
                              key={f._id}
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-3 p-3 bg-background border rounded-xl hover:border-primary/30 hover:shadow-sm transition-all group"
                            >
                              <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                                <FileText className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold truncate text-slate-700">{f.name || "Unnamed File"}</div>
                                <div className="text-[10px] text-slate-400">{f.createdAt ? new Date(f.createdAt).toLocaleDateString() : "No date"}</div>
                              </div>
                              <Download className="w-3.5 h-3.5 text-slate-300 group-hover:text-primary" />
                            </a>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic p-4 border border-dashed rounded-xl text-center bg-white">
                        No files have been shared yet.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-20 text-center text-muted-foreground">
                  Ticket not found or has been removed.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info Panels */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="shadow-md border-none ring-1 ring-border overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-slate-900 text-white p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <h3 className="font-bold text-sm uppercase tracking-wider">Ticket Summary</h3>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/10">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 rounded-xl">
                      <DropdownMenuItem onClick={openEditDialog} className="text-xs">Edit Details</DropdownMenuItem>
                      <DropdownMenuItem onClick={openMergeDialog} className="text-xs">Merge Ticket</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                    <div className="text-[10px] text-white/50 uppercase font-bold mb-1">Incoming</div>
                    <div className="text-xl font-bold">{inCount}</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                    <div className="text-[10px] text-white/50 uppercase font-bold mb-1">Outgoing</div>
                    <div className="text-xl font-bold">{outCount}</div>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-5">
                <div className="flex items-center gap-4">
                  <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Assigned Agent</div>
                    <div className="text-sm font-bold truncate text-slate-700">{ticket?.assignedTo || "Unassigned"}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Created On</div>
                    <div className="text-sm font-bold truncate text-slate-700">
                      {ticket?.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : "-"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Activity className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="min-w-0 w-full">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-1">Resolution Progress</div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${ticket?.status === "closed" ? "w-full bg-emerald-500" : "w-1/3 bg-primary"}`} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md border-none ring-1 ring-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-sm uppercase tracking-wider">Sub-Tasks</h3>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-lg hover:bg-slate-100" 
                  onClick={() => setOpenAddTask(true)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {loadingTasks ? (
                <div className="text-xs text-muted-foreground animate-pulse">Updating tasks...</div>
              ) : tasks.length ? (
                <div className="space-y-3">
                  {tasks.map((t) => (
                    <button
                      key={t._id}
                      type="button"
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-transparent hover:border-slate-200 hover:bg-white transition-all text-left group shadow-sm hover:shadow-md"
                      onClick={() => navigate(`/tasks/${t._id}`)}
                    >
                      <div className={`h-2 w-2 rounded-full flex-shrink-0 ${t.status === "completed" ? "bg-emerald-500" : "bg-amber-400"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Task {t.taskNo ? `#${t.taskNo}` : ""}</div>
                        <div className="text-xs font-bold truncate text-slate-700 group-hover:text-primary transition-colors">{t.title}</div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-primary transition-colors" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 px-4 border border-dashed rounded-xl bg-slate-50">
                  <p className="text-xs text-slate-400 mb-3 italic">No tasks created yet</p>
                  <Button variant="outline" size="sm" className="h-8 text-xs font-bold rounded-lg border-slate-200" onClick={() => setOpenAddTask(true)}>
                    Create First Task
                  </Button>
                </div>
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

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { ExternalLink, Mic, Paperclip, Pencil, Plus, RefreshCw, Trash2, Tag, Clock, MessageSquare, Users, Calendar, Flag, Link2, CheckSquare, ListTodo, Image as ImageIcon, FileText, Activity, Play, Pause, RotateCcw, Bell, User, Send, Copy, Zap } from "lucide-react";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { cn } from "@/lib/utils";

const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem("auth_user") || sessionStorage.getItem("auth_user");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const getCurrentUserRole = () => {
  const u = getCurrentUser();
  return u?.role || "admin";
};

type Employee = { _id: string; name?: string; firstName?: string; lastName?: string; avatar?: string; image?: string };

type TaskLabel = { _id: string; name: string; color?: string };

type LeadDoc = { _id: string; ownerId?: string; name?: string };

type TaskDoc = {
  _id: string;
  taskNo?: number;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  start?: string;
  deadline?: string;
  assignees?: Array<{ name?: string; initials?: string }>;
  collaborators?: string[];
  tags?: string[];
  leadId?: string;
  projectId?: string;
  invoiceId?: string;
  checklist?: Array<{ _id?: string; text?: string; done?: boolean }>;
  subTasks?: Array<{ _id?: string; title?: string; done?: boolean }>;
  reminders?: Array<{ _id?: string; title?: string; when?: string; repeat?: string; priority?: string; createdBy?: string; createdByName?: string; notifyTargets?: string[] }>;
  taskComments?: Array<{ _id?: string; authorName?: string; text?: string; attachmentCount?: number; attachments?: Array<{ _id?: string; name?: string; url?: string; path?: string }>; createdAt?: string }>;
  attachments?: number | Array<{ _id?: string; name?: string; url?: string; path?: string } | string>;
  dependencies?: { blockedBy?: string[]; blocking?: string[] };
  activity?: Array<{ _id?: string; type?: string; message?: string; authorName?: string; createdAt?: string }>;
  createdByUserId?: string;
  createdByEmail?: string;
  progress?: number;
};

export default function Tasks() {
  const navigate = useNavigate();
  const [items, setItems] = useState<TaskDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const currentUserRole = getCurrentUserRole();
  const canManage = currentUserRole === "admin" || currentUserRole === "project_manager";

  const [view, setView] = useState<"list" | "kanban" | "gantt" | "dashboard">("dashboard");

  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    assignedTo: "",
    tag: "",
    deadlineFrom: "",
    deadlineTo: "",
  });

  const [labels, setLabels] = useState<TaskLabel[]>([]);
  const [openManageLabels, setOpenManageLabels] = useState(false);
  const [manageLabelName, setManageLabelName] = useState("");
  const [manageLabelColor, setManageLabelColor] = useState("bg-blue-600");

  const [employees, setEmployees] = useState<Employee[]>([]);
  const employeeNames = useMemo(() => {
    return (employees || [])
      .map((e) => (e.name || `${e.firstName || ""} ${e.lastName || ""}`.trim() || "").trim())
      .filter(Boolean);
  }, [employees]);

  const employeeByName = useMemo(() => {
    const m = new Map<string, Employee>();
    for (const e of employees || []) {
      const name = (e.name || `${e.firstName || ""} ${e.lastName || ""}`.trim() || "").trim();
      if (!name) continue;
      m.set(name, e);
    }
    return m;
  }, [employees]);

  const [leadOwnerByLeadId, setLeadOwnerByLeadId] = useState<Map<string, string>>(new Map());
  const [leadNameByLeadId, setLeadNameByLeadId] = useState<Map<string, string>>(new Map());

  const draggingTaskIdRef = useRef<string | null>(null);
  const draggingFromStatusRef = useRef<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);

  const [openAddTask, setOpenAddTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string>("");
  const [openTaskInfo, setOpenTaskInfo] = useState(false);
  const [taskInfo, setTaskInfo] = useState<TaskDoc | null>(null);
  const [taskInfoLoading, setTaskInfoLoading] = useState(false);
  const [editingTask, setEditingTask] = useState(false);
  const [taskForm, setTaskForm] = useState<Partial<TaskDoc>>({});
  const [timeTracking, setTimeTracking] = useState<{ isRunning: boolean; startTime: number | null; elapsed: number; manualHours: string }>({
    isRunning: false,
    startTime: null,
    elapsed: 0,
    manualHours: "",
  });
  const [attachments, setAttachments] = useState<Array<{ _id?: string; name?: string; url?: string; path?: string }>>([]);

  const [checklistDraft, setChecklistDraft] = useState("");
  const [subTaskDraft, setSubTaskDraft] = useState("");
  const [reminderDraft, setReminderDraft] = useState({
    priority: "medium",
    title: "",
    date: "",
    time: "",
    repeat: "",
  });
  const [commentDraft, setCommentDraft] = useState("");
  const [commentFiles, setCommentFiles] = useState<File[]>([]);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [confirmDeleteLabelOpen, setConfirmDeleteLabelOpen] = useState(false);
  const [labelToDelete, setLabelToDelete] = useState<string | null>(null);
  const [confirmCloneOpen, setConfirmCloneOpen] = useState(false);
  const [taskToClone, setTaskToClone] = useState<TaskDoc | null>(null);
  const [confirmDeleteCommentOpen, setConfirmDeleteCommentOpen] = useState(false);
  const [commentToDeleteIdx, setCommentToDeleteIdx] = useState<number | null>(null);

  const [depOpen, setDepOpen] = useState(false);
  const [depBlockedBy, setDepBlockedBy] = useState<string>("");
  const [depBlocking, setDepBlocking] = useState<string>("");
  const [taskUploading, setTaskUploading] = useState(false);
  const [taskSelectedFiles, setTaskSelectedFiles] = useState<File[]>([]);
  const [addTaskForm, setAddTaskForm] = useState({
    title: "",
    description: "",
    points: "1",
    assignTo: "",
    collaborators: "",
    status: "todo",
    priority: "medium",
    labels: "",
    start: "",
    deadline: "",
  });

  const resetTaskForm = () => {
    setEditingTaskId("");
    setAddTaskForm({
      title: "",
      description: "",
      points: "1",
      assignTo: "",
      collaborators: "",
      status: "todo",
      priority: "medium",
      labels: "",
      start: "",
      deadline: "",
    });
    setTaskSelectedFiles([]);
  };

  const createLabel = async () => {
    const name = (manageLabelName || "").trim();
    if (!name) return;
    try {
      const r = await fetch(`${API_BASE}/api/task-labels`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ name, color: manageLabelColor }),
      });
      if (r.ok) {
        const created = await r.json();
        setLabels((p) => [created, ...p]);
        setManageLabelName("");
        toast.success("Label added");
        return;
      }
    } catch {
    }
    toast.error("Failed to add label");
  };

  const deleteLabel = async (id: string) => {
    try {
      const r = await fetch(`${API_BASE}/api/task-labels/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      if (r.ok) {
        setLabels((p) => p.filter((x) => x._id !== id));
        toast.success("Label deleted");
        return;
      }
    } catch {
    }
    toast.error("Failed to delete");
  };

  const uploadTaskFiles = async (taskId?: string) => {
    if (!taskSelectedFiles.length) return 0;
    setTaskUploading(true);
    try {
      let uploaded = 0;
      for (const f of taskSelectedFiles) {
        const fd = new FormData();
        fd.append("file", f);
        fd.append("name", f.name);
        if (taskId) fd.append("taskId", taskId);
        const r = await fetch(`${API_BASE}/api/files`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: fd,
        });
        if (r.ok) uploaded += 1;
      }
      return uploaded;
    } catch {
      return 0;
    } finally {
      setTaskUploading(false);
    }
  };

  const saveTask = async (mode: "save" | "save_show") => {
    const title = (addTaskForm.title || "").trim();
    if (!title) return;

    const attachmentsUploaded = await uploadTaskFiles(editingTaskId || undefined);
    const payload: any = {
      title,
      description: (addTaskForm.description || "").trim() || undefined,
      points: addTaskForm.points ? Number(addTaskForm.points) : undefined,
      status: addTaskForm.status,
      priority: addTaskForm.priority,
      start: addTaskForm.start || undefined,
      deadline: addTaskForm.deadline || undefined,
      assignees: addTaskForm.assignTo ? [{ name: addTaskForm.assignTo, initials: addTaskForm.assignTo.slice(0, 2).toUpperCase() }] : [],
      collaborators: (addTaskForm.collaborators || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      tags: (addTaskForm.labels || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      attachments: attachmentsUploaded,
    };

    try {
      const method = editingTaskId ? "PUT" : "POST";
      const url = editingTaskId ? `${API_BASE}/api/tasks/${editingTaskId}` : `${API_BASE}/api/tasks`;
      const r = await fetch(url, {
        method,
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        const created = await r.json();
        setItems((prev) => {
          if (editingTaskId) return prev.map((x) => (x._id === editingTaskId ? created : x));
          return [created, ...prev];
        });
        toast.success(editingTaskId ? "Task updated" : "Task added");
        setOpenAddTask(false);
        resetTaskForm();
        if (mode === "save_show") navigate(`/tasks/${created._id}`);
        return;
      }
    } catch {
    }

    const optimistic: TaskDoc = {
      _id: crypto.randomUUID(),
      title,
      description: payload.description,
      status: payload.status,
      priority: payload.priority,
      start: payload.start,
      deadline: payload.deadline,
      assignees: payload.assignees,
      collaborators: payload.collaborators,
      tags: payload.tags,
    };
    setItems((prev) => {
      if (editingTaskId) return prev.map((x) => (x._id === editingTaskId ? optimistic : x));
      return [optimistic, ...prev];
    });
    setOpenAddTask(false);
    resetTaskForm();
    if (mode === "save_show") navigate(`/tasks/${optimistic._id}`);
  };

  const load = async (next?: Partial<{ q: string } & typeof filters>) => {
    setLoading(true);
    try {
      const qValue = next?.q ?? q;
      const statusValue = next?.status ?? filters.status;
      const priorityValue = next?.priority ?? filters.priority;
      const assignedToValue = next?.assignedTo ?? filters.assignedTo;
      const tagValue = next?.tag ?? filters.tag;
      const deadlineFromValue = next?.deadlineFrom ?? filters.deadlineFrom;
      const deadlineToValue = next?.deadlineTo ?? filters.deadlineTo;
      const params = new URLSearchParams();
      if ((qValue || "").trim()) params.set("q", qValue.trim());
      if ((statusValue || "").trim()) params.set("status", statusValue.trim());
      if ((priorityValue || "").trim()) params.set("priority", priorityValue.trim());
      if ((assignedToValue || "").trim()) params.set("assignedTo", assignedToValue.trim());
      if ((tagValue || "").trim()) params.set("tag", tagValue.trim());
      if ((deadlineFromValue || "").trim()) params.set("deadlineFrom", deadlineFromValue.trim());
      if ((deadlineToValue || "").trim()) params.set("deadlineTo", deadlineToValue.trim());
      const r = await fetch(`${API_BASE}/api/tasks?${params.toString()}`, { headers: getAuthHeaders() });
      if (r.ok) {
        const d = await r.json();
        setItems(Array.isArray(d) ? d : []);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = window.setTimeout(() => load(), 200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/employees`, { headers: getAuthHeaders() });
        if (r.ok) {
          const d = await r.json();
          setEmployees(Array.isArray(d) ? d : []);
        }
      } catch {
      }
    })();
  }, []);

  const loadLabels = async () => {
    try {
      const r = await fetch(`${API_BASE}/api/task-labels`, { headers: getAuthHeaders() });
      if (r.ok) {
        const d = await r.json();
        setLabels(Array.isArray(d) ? d : []);
      }
    } catch {
    }
  };

  useEffect(() => {
    void loadLabels();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/leads`, { headers: getAuthHeaders() });
        if (r.ok) {
          const d = (await r.json()) as LeadDoc[];
          const m = new Map<string, string>();
          const n = new Map<string, string>();
          (Array.isArray(d) ? d : []).forEach((l) => {
            if (l?._id && l?.ownerId) m.set(String(l._id), String(l.ownerId));
            if (l?._id && l?.name) n.set(String(l._id), String(l.name));
          });
          setLeadOwnerByLeadId(m);
          setLeadNameByLeadId(n);
        }
      } catch {
      }
    })();
  }, []);

  const rows = useMemo(() => items, [items]);

  const columns = useMemo(
    () => [
      { id: "backlog", title: "Backlog", color: "bg-slate-400" },
      { id: "todo", title: "To do", color: "bg-amber-500" },
      { id: "in-progress", title: "In progress", color: "bg-blue-600" },
      { id: "review", title: "Review", color: "bg-fuchsia-600" },
      { id: "done", title: "Done", color: "bg-emerald-600" },
    ],
    []
  );

  const kanbanGroups = useMemo(() => {
    const m: Record<string, TaskDoc[]> = {};
    for (const c of columns) m[c.id] = [];
    for (const t of rows) {
      const s = (t.status || "todo").toLowerCase();
      const key = columns.some((c) => c.id === s) ? s : "todo";
      m[key].push(t);
    }
    return m;
  }, [rows, columns]);

  const dashboardMetrics = useMemo(() => {
    const total = rows.length;
    const completed = rows.filter(t => (t.status || "").toLowerCase() === "done").length;
    const inProgress = rows.filter(t => (t.status || "").toLowerCase() === "in-progress").length;
    const todo = rows.filter(t => (t.status || "").toLowerCase() === "todo").length;
    const highPriority = rows.filter(t => (t.priority || "").toLowerCase() === "high" || (t.priority || "").toLowerCase() === "urgent").length;
    
    // Team activity calculation
    const allActivities: any[] = [];
    rows.forEach(t => {
      if (t.activity && Array.isArray(t.activity)) {
        t.activity.forEach(a => {
          allActivities.push({
            ...a,
            taskId: t._id,
            taskTitle: t.title
          });
        });
      }
    });
    
    const sortedActivities = allActivities.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    }).slice(0, 20);

    return {
      total,
      completed,
      inProgress,
      todo,
      highPriority,
      activities: sortedActivities
    };
  }, [rows]);

  const updateTaskStatus = async (taskId: string, nextStatus: string) => {
    const prev = items.find((x) => x._id === taskId);
    const prevStatus = prev?.status || "todo";
    if ((prevStatus || "").toLowerCase() === nextStatus.toLowerCase()) return;

    // Optimistic UI update
    setItems((p) => p.map((x) => (x._id === taskId ? { ...x, status: nextStatus } : x)));

    try {
      const r = await fetch(`${API_BASE}/api/tasks/${taskId}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status: nextStatus }),
      });
      if (r.ok) {
        const updated = await r.json();
        setItems((p) => p.map((x) => (x._id === taskId ? updated : x)));
        toast.success("Task status updated");
        return;
      }
    } catch {
      toast.error("Failed to update status");
    }

    // Revert on error
    setItems((p) => p.map((x) => (x._id === taskId ? { ...x, status: prevStatus } : x)));
  };

  const getInitials = (name?: string) => {
    const s = (name || "").trim();
    if (!s) return "-";
    return s
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const openEmployeeProfile = (employeeId?: string, employeeName?: string) => {
    if (!employeeId) return;
    navigate(`/hrm/employees/${employeeId}`, {
      state: {
        dbId: employeeId,
        employee: { id: 0, name: employeeName || "Employee", initials: getInitials(employeeName || "") },
      },
    });
  };

  const PersonChip = ({ name }: { name?: string }) => {
    const display = (name || "").trim();
    if (!display) return <span className="text-muted-foreground">-</span>;
    const emp = employeeByName.get(display);
    const img = emp?.avatar || emp?.image;
    const clickable = !!emp?._id;
    return (
      <button
        type="button"
        className={clickable ? "flex items-center gap-2 text-primary hover:underline" : "flex items-center gap-2"}
        onClick={() => openEmployeeProfile(emp?._id, display)}
      >
        <Avatar className="h-6 w-6">
          {img ? <AvatarImage src={`${API_BASE}${img}`} alt={display} /> : null}
          <AvatarFallback className="text-[10px]">{getInitials(display)}</AvatarFallback>
        </Avatar>
        <span className="truncate max-w-[140px]">{display}</span>
      </button>
    );
  };

  const handleEdit = (t: TaskDoc) => {
    setEditingTaskId(t._id);
    setAddTaskForm({
      title: t.title || "",
      description: t.description || "",
      points: "1",
      assignTo: (t.assignees || [])[0]?.name || "",
      collaborators: (t.collaborators || []).join(", "),
      status: t.status || "todo",
      priority: t.priority || "medium",
      labels: (t.tags || []).join(", "),
      start: t.start || "",
      deadline: t.deadline || "",
    });
    setOpenAddTask(true);
  };

  const openTaskInfoDialog = (t: TaskDoc) => {
    setTaskInfo(t);
    setOpenTaskInfo(true);
    // Reset shown reminders when opening a new task so notifications can appear
    setShownReminders(new Set());
    setChecklistDraft("");
    setSubTaskDraft("");
    setReminderDraft({ priority: "medium", title: "", date: "", time: "", repeat: "" });
    setCommentDraft("");
    setCommentFiles([]);
    setDepOpen(false);
    setDepBlockedBy("");
    setDepBlocking("");
    // Initialize attachments from task data if available
    const taskAttachments = Array.isArray(t.attachments) ? t.attachments : [];
    setAttachments(taskAttachments as any);
    if (!t?._id) return;
    setTaskInfoLoading(true);
    // Fetch full task details
    fetch(`${API_BASE}/api/tasks/${t._id}`, { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?._id) {
          setTaskInfo(d);
          // Update attachments from fetched data
          const fetchedAttachments = Array.isArray(d.attachments) ? d.attachments : [];
          setAttachments(fetchedAttachments);
        }
      })
      .catch(() => {})
      .finally(() => setTaskInfoLoading(false));
    // Also fetch files via files API for this task
    fetch(`${API_BASE}/api/files?taskId=${t._id}`, { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((files) => {
        if (Array.isArray(files) && files.length > 0) {
          setAttachments(files.map((f: any) => ({
            _id: f._id,
            name: f.name,
            url: f.url,
            path: f.path,
          })));
        }
      })
      .catch(() => {});
  };

  const updateTask = async (taskId: string, patch: any) => {
    try {
      const r = await fetch(`${API_BASE}/api/tasks/${taskId}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(patch),
      });
      if (r.ok) {
        const updated = await r.json();
        setTaskInfo(updated);
        setItems((p) => p.map((x) => (x._id === taskId ? updated : x)));
        setTaskInfo((p) => (p?._id === taskId ? updated : p));
        return { ok: true as const, updated };
      }
    } catch {
    }
    return { ok: false as const, updated: null as any };
  };

  const pushActivity = async (taskId: string, message: string) => {
    const current = taskInfo?._id === taskId ? taskInfo : items.find((x) => x._id === taskId);
    const author = (() => {
      try {
        const u = localStorage.getItem("auth_user") || sessionStorage.getItem("auth_user");
        if (!u) return "";
        const j = JSON.parse(u);
        return j?.name || j?.email || "";
      } catch {
        return "";
      }
    })();
    const next = [{ type: "update", message, authorName: author }, ...(current?.activity || [])];
    await updateTask(taskId, { activity: next });
  };

  const uploadCommentFiles = async (): Promise<Array<{ _id?: string; name?: string; url?: string; path?: string }>> => {
    if (!commentFiles.length) return [];
    try {
      const uploadedFiles: Array<{ _id?: string; name?: string; url?: string; path?: string }> = [];
      for (const f of commentFiles) {
        const fd = new FormData();
        fd.append("file", f);
        fd.append("name", f.name);
        const r = await fetch(`${API_BASE}/api/files`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: fd,
        });
        if (r.ok) {
          const uploaded = await r.json();
          uploadedFiles.push({
            _id: uploaded._id,
            name: uploaded.name || f.name,
            url: uploaded.url,
            path: uploaded.path,
          });
        }
      }
      return uploadedFiles;
    } catch {
      return [];
    }
  };

  const isTaskCreator = (task: TaskDoc | null): boolean => {
    if (!task) return false;
    const user = getCurrentUser();
    if (!user) return false;
    const byUserId = task.createdByUserId && String(task.createdByUserId) === String(user._id);
    const byEmail = task.createdByEmail && String(task.createdByEmail).toLowerCase() === String(user.email || "").toLowerCase();
    return byUserId || byEmail || false;
  };

  const isTaskAssignee = (task: TaskDoc | null): boolean => {
    if (!task) return false;
    const user = getCurrentUser();
    if (!user) return false;
    return task.assignees?.some((a) => 
      String(a.name).toLowerCase() === String(user.name || "").toLowerCase() ||
      String(a.name).toLowerCase() === String(user.email || "").toLowerCase()
    ) || false;
  };

  const isTaskCollaborator = (task: TaskDoc | null): boolean => {
    if (!task) return false;
    const user = getCurrentUser();
    if (!user) return false;
    return task.collaborators?.some((c) => 
      String(c).toLowerCase() === String(user.name || "").toLowerCase() ||
      String(c).toLowerCase() === String(user.email || "").toLowerCase()
    ) || false;
  };

  const canEditTask = (task: TaskDoc | null): boolean => {
    if (!task) return false;
    const user = getCurrentUser();
    if (!user) return false;
    // Admin can edit any task
    if (user.role === "admin") return true;
    // Only creator can edit (not assignees or collaborators)
    return isTaskCreator(task);
  };

  const canUpdateTaskStatus = (task: TaskDoc | null): boolean => {
    if (!task) return false;
    const user = getCurrentUser();
    if (!user) return false;
    // Admin can update any task status
    if (user.role === "admin") return true;
    // Creator can update status
    if (isTaskCreator(task)) return true;
    // Assignees can update status
    if (isTaskAssignee(task)) return true;
    // Collaborators can update status
    if (isTaskCollaborator(task)) return true;
    return false;
  };

  const canDeleteComment = (comment: any): boolean => {
    if (!comment) return false;
    const user = getCurrentUser();
    if (!user) return false;
    // Admin can delete any comment
    if (user.role === "admin") return true;
    // Only comment author can delete their own comment
    const authorName = comment.authorName || "";
    return authorName.toLowerCase() === String(user.name || "").toLowerCase() ||
           authorName.toLowerCase() === String(user.email || "").toLowerCase();
  };

  const canCloneTask = (task: TaskDoc | null): boolean => {
    // Only creator can clone
    return isTaskCreator(task);
  };

  // Everyone who can view the task can add their own reminder
  const canAddReminder = (task: TaskDoc | null): boolean => {
    if (!task) return false;
    const user = getCurrentUser();
    if (!user) return false;
    // Admin can add reminder
    if (user.role === "admin") return true;
    // Task creator can add reminder
    if (isTaskCreator(task)) return true;
    // Assignees can add reminder
    if (isTaskAssignee(task)) return true;
    // Collaborators can add reminder
    if (isTaskCollaborator(task)) return true;
    return false;
  };

  // Can delete reminder if: admin, task creator, or the one who created the reminder
  const canDeleteReminder = (reminder: any, task: TaskDoc | null): boolean => {
    if (!reminder || !task) return false;
    const user = getCurrentUser();
    if (!user) return false;
    // Admin can delete any reminder
    if (user.role === "admin") return true;
    // Task creator can delete any reminder
    if (isTaskCreator(task)) return true;
    // Reminder creator can delete their own reminder
    const creator = reminder.createdBy || reminder.createdByName || "";
    if (creator) {
      return creator.toLowerCase() === String(user._id || "").toLowerCase() ||
             creator.toLowerCase() === String(user.name || "").toLowerCase() ||
             creator.toLowerCase() === String(user.email || "").toLowerCase();
    }
    return false;
  };

  // Determine notification targets for a reminder based on who created it
  const getReminderNotifyTargets = (reminder: any, task: TaskDoc | null): string[] => {
    if (!reminder || !task) return [];
    const user = getCurrentUser();
    if (!user) return [];

    const creatorId = String(user._id || user.id || "");
    const creatorName = String(user.name || user.email || "");
    const reminderCreator = reminder.createdBy || reminder.createdByName || creatorName;

    // If reminder was created by task owner/creator, notify: creator, assignees, collaborators
    const isTaskOwnerCreating = isTaskCreator(task) || 
                                reminderCreator.toLowerCase() === creatorName.toLowerCase() && isTaskCreator(task);

    if (isTaskOwnerCreating) {
      const targets = new Set<string>();
      // Always notify creator
      targets.add(creatorName);
      // Add assignees
      task.assignees?.forEach(a => { if (a.name) targets.add(a.name); });
      // Add collaborators
      task.collaborators?.forEach(c => targets.add(c));
      return Array.from(targets);
    }

    // If reminder was created by assignee or collaborator, only notify the creator of the reminder
    return [creatorName];
  };

  // Track which reminders have been shown to avoid duplicates
  const [shownReminders, setShownReminders] = useState<Set<string>>(new Set());

  // Check for due reminders and show notifications
  useEffect(() => {
    if (!taskInfo?._id || !taskInfo?.reminders?.length) return;

    const checkReminders = () => {
      const now = new Date();
      const currentUserData = getCurrentUser();
      if (!currentUserData) return;

      taskInfo.reminders?.forEach(async (reminder) => {
        if (!reminder.when) return;
        
        const reminderId = reminder._id || `${reminder.title}-${reminder.when}`;
        // Skip if already shown
        if (shownReminders.has(reminderId)) return;
        
        const reminderTime = new Date(reminder.when);
        const timeDiff = now.getTime() - reminderTime.getTime();
        
        // Check if reminder is due (within 1 minute past the time or exactly at time)
        if (timeDiff >= 0 && timeDiff <= 60000) {
          // Determine who should be notified
          const notifyTargets = reminder.notifyTargets || getReminderNotifyTargets(reminder, taskInfo);
          const currentUserName = String(currentUserData.name || currentUserData.email || "");
          
          // Only show notification if current user is in the notify targets
          if (notifyTargets.some(target => target.toLowerCase() === currentUserName.toLowerCase())) {
            // Show toast for current user
            toast.info(`Reminder: ${reminder.title}`, {
              description: fmt(reminder.when) || "Now",
              duration: 10000,
            });
            
            // Send notification to ALL targets (creator, assignees, collaborators)
            // Look up userId for each target from employeeByName map
            const notificationPromises = notifyTargets.map(async (targetName) => {
              try {
                // Look up employee to get their userId
                const employee = employeeByName.get(targetName);
                const targetUserId = employee?._id; // Use employee ID if found
                
                await fetch(`${API_BASE}/api/notifications`, {
                  method: "POST",
                  headers: getAuthHeaders({ "Content-Type": "application/json" }),
                  body: JSON.stringify({
                    userId: targetUserId, // Send to specific user if found, otherwise backend defaults to current user
                    type: "reminder",
                    title: `Reminder: ${reminder.title}`,
                    message: `Task: ${taskInfo.title || "Unknown"}`,
                    href: `/tasks/${taskInfo._id}`,
                    meta: { 
                      reminderId: reminder._id,
                      taskId: taskInfo._id,
                      when: reminder.when,
                      priority: reminder.priority,
                      targetUser: targetName,
                      targetUserId: targetUserId || null,
                      createdBy: currentUserName,
                    },
                  }),
                });
              } catch {
                // Silent fail for individual targets
              }
            });
            
            // Fire and forget - don't block on notification creation
            void Promise.all(notificationPromises);
            
            // Mark as shown
            setShownReminders(prev => new Set([...prev, reminderId]));
          }
        }
      });
    };

    // Check immediately and then every 30 seconds for more responsive notifications
    checkReminders();
    const interval = setInterval(checkReminders, 30000);
    return () => clearInterval(interval);
  }, [taskInfo?._id, taskInfo?.reminders, shownReminders]);

  const labelColors = [
    "bg-lime-500",
    "bg-emerald-500",
    "bg-sky-500",
    "bg-slate-400",
    "bg-yellow-500",
    "bg-orange-500",
    "bg-red-500",
    "bg-pink-500",
    "bg-fuchsia-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-blue-600",
  ];

  const handleDelete = async (t: TaskDoc) => {
    try {
      const r = await fetch(`${API_BASE}/api/tasks/${t._id}`, { method: "DELETE", headers: getAuthHeaders() });
      if (r.ok) {
        setItems((prev) => prev.filter((x) => x._id !== t._id));
        toast.success("Task deleted");
        return;
      }
    } catch {
    }
    toast.error("Failed to delete");
  };

  const cloneTask = async (t: TaskDoc) => {
    const payload: any = {
      title: `${t.title} (Copy)`,
      description: t.description || "",
      status: "todo",
      priority: t.priority || "medium",
      start: t.start,
      deadline: t.deadline,
      assignees: t.assignees || [],
      collaborators: t.collaborators || [],
      tags: t.tags || [],
      leadId: t.leadId,
      projectId: t.projectId,
      checklist: (t.checklist || []).map(x => ({ text: x.text, done: false })),
      subTasks: (t.subTasks || []).map(x => ({ title: x.title, done: false })),
    };
    try {
      const res = await fetch(`${API_BASE}/api/tasks`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const created = await res.json();
        setItems(prev => [created, ...prev]);
        toast.success("Task cloned");
        return;
      }
    } catch (e) {
      console.error("Failed to clone task", e);
    }
    toast.error("Failed to clone task");
  };

  const deleteComment = async (idx: number) => {
    if (!taskInfo?._id) return;
    const next = (taskInfo.taskComments || []).filter((_, i) => i !== idx);
    const removedComment = (taskInfo.taskComments || [])[idx];
    const removedAttCount = removedComment?.attachments?.length || removedComment?.attachmentCount || 0;
    const prevAttachmentCount = Array.isArray((taskInfo as any).attachments)
      ? (taskInfo as any).attachments.length
      : Number((taskInfo as any).attachments || 0);
    const r = await updateTask(taskInfo._id, {
      taskComments: next,
      comments: next.length,
      attachments: Math.max(0, prevAttachmentCount - removedAttCount),
    });
    if (r.ok) {
      toast.success("Comment deleted");
    } else {
      toast.error("Failed to delete comment");
    }
  };

  const fmt = (iso?: string) => {
    if (!iso) return "-";
    try {
      return new Date(iso).toISOString().slice(0, 10);
    } catch {
      return "-";
    }
  };

  const statusLabel = (s?: string) => {
    const v = (s || "").toLowerCase();
    if (v === "in-progress") return "In progress";
    if (v === "todo") return "To do";
    if (v === "done") return "Done";
    if (v === "backlog") return "Backlog";
    if (v === "review") return "Review";
    return s || "-";
  };

  const fmtCompact = (iso?: string) => {
    if (!iso) return "";
    try {
      return new Date(iso).toISOString().slice(0, 10);
    } catch {
      return "";
    }
  };

  const ganttItems = useMemo(() => {
    const parse = (v?: string) => {
      if (!v) return null;
      const d = new Date(v);
      return Number.isFinite(d.getTime()) ? d : null;
    };
    return rows
      .map((t) => {
        const start = parse(t.start) || parse(t.deadline);
        const end = parse(t.deadline) || parse(t.start);
        if (!start || !end) return null;
        const s = start.getTime() <= end.getTime() ? start : end;
        const e = start.getTime() <= end.getTime() ? end : start;
        return { task: t, start: s, end: e };
      })
      .filter(Boolean) as Array<{ task: TaskDoc; start: Date; end: Date }>;
  }, [rows]);

  const ganttRange = useMemo(() => {
    if (!ganttItems.length) return null;
    let min = ganttItems[0].start;
    let max = ganttItems[0].end;
    for (const it of ganttItems) {
      if (it.start.getTime() < min.getTime()) min = it.start;
      if (it.end.getTime() > max.getTime()) max = it.end;
    }
    // pad 1 day on each side
    const oneDay = 24 * 60 * 60 * 1000;
    return {
      min: new Date(min.getTime() - oneDay),
      max: new Date(max.getTime() + oneDay),
    };
  }, [ganttItems]);

  const ganttDays = useMemo(() => {
    if (!ganttRange) return [] as Date[];
    const days: Date[] = [];
    const d = new Date(ganttRange.min);
    d.setHours(0, 0, 0, 0);
    const end = new Date(ganttRange.max);
    end.setHours(0, 0, 0, 0);
    while (d.getTime() <= end.getTime() && days.length < 120) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return days;
  }, [ganttRange]);

  return (
    <div className="p-4 space-y-4">
      <Tabs value={view} onValueChange={(v) => setView(v as any)}>
        <Card>
          <CardHeader className="p-4 pb-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <div className="text-2xl font-bold">Tasks</div>
                <TabsList className="bg-muted/60">
                  <TabsTrigger value="dashboard" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Dashboard</TabsTrigger>
                  <TabsTrigger value="list" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">List</TabsTrigger>
                  <TabsTrigger value="kanban" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Kanban</TabsTrigger>
                  <TabsTrigger value="gantt" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Gantt</TabsTrigger>
                </TabsList>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {canManage && (
                  <Button type="button" variant="outline" onClick={() => { void loadLabels(); setOpenManageLabels(true); }} className="gap-2">
                    <Tag className="w-4 h-4" />
                    Manage labels
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={() => load()} disabled={loading} className="gap-2">
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                {canManage && (
                  <Button type="button" onClick={() => { resetTaskForm(); setOpenAddTask(true); }} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add task
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <TabsContent value="list" className="m-0 border-t">
              <div className="w-full">
                <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-12 px-2 text-[10px] uppercase font-black tracking-widest opacity-50">ID</TableHead>
                    <TableHead className="min-w-[180px] px-2 text-[10px] uppercase font-black tracking-widest opacity-50">Title</TableHead>
                    <TableHead className="w-24 px-2 text-[10px] uppercase font-black tracking-widest opacity-50">Deadline</TableHead>
                    <TableHead className="w-32 px-2 text-[10px] uppercase font-black tracking-widest opacity-50">Assigned</TableHead>
                    <TableHead className="w-28 px-2 text-[10px] uppercase font-black tracking-widest opacity-50 text-center">Status</TableHead>
                    <TableHead className="w-16 px-2 text-[10px] uppercase font-black tracking-widest opacity-50 text-right">Files</TableHead>
                    <TableHead className="w-20 px-2"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length ? (
                    rows.map((t) => (
                      <TableRow key={t._id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="px-2 text-[10px] font-bold text-muted-foreground italic">#{t.taskNo || String(t._id || "").slice(-4)}</TableCell>
                        <TableCell className="px-2">
                          <button
                            type="button"
                            className="text-sm font-bold text-primary hover:underline text-left truncate max-w-[250px] block"
                            onClick={() => openTaskInfoDialog(t)}
                          >
                            {t.title || "-"}
                          </button>
                          {t.leadId && (
                            <p className="text-[9px] text-muted-foreground truncate max-w-[200px]">
                              Rel: {leadNameByLeadId.get(String(t.leadId)) || "Lead"}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="px-2 text-xs font-medium">
                          {t.deadline ? (
                            <div className={cn(
                              "flex flex-col",
                              new Date(t.deadline) < new Date() && t.status !== 'done' ? "text-rose-500" : ""
                            )}>
                              <span>{new Date(t.deadline).toLocaleDateString()}</span>
                              <span className="text-[9px] opacity-50">{new Date(t.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="px-2">
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-6 w-6 shrink-0 border shadow-sm">
                              {(() => {
                                const name = t.assignees?.[0]?.name;
                                const emp = name ? employeeByName.get(String(name).trim()) : undefined;
                                const img = emp?.avatar || emp?.image;
                                return img ? <AvatarImage src={`${API_BASE}${img}`} /> : null;
                              })()}
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                                {getInitials(t.assignees?.[0]?.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-bold truncate max-w-[80px]">{t.assignees?.[0]?.name || "Unassigned"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-2 text-center">
                          <Badge variant="outline" className={cn(
                            "text-[9px] uppercase font-black tracking-tighter px-2 py-0 h-5",
                            t.status === 'done' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            t.status === 'in-progress' ? "bg-blue-50 text-blue-700 border-blue-200" :
                            "bg-slate-50 text-slate-600 border-slate-200"
                          )}>
                            {statusLabel(t.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-2 text-right">
                          {(() => {
                            const count = typeof t.attachments === "number" 
                              ? t.attachments 
                              : Array.isArray(t.attachments) 
                                ? t.attachments.length 
                                : 0;
                            return count > 0 ? (
                              <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[9px] h-5 px-1.5 font-bold">
                                <Paperclip className="w-2.5 h-2.5 mr-1" /> {count}
                              </Badge>
                            ) : <span className="text-[10px] opacity-20">-</span>;
                          })()}
                        </TableCell>
                        <TableCell className="px-2 text-right">
                          <div className="flex items-center justify-end">
                            {canEditTask(t) && (
                              <div className="flex gap-0.5">
                                <Button type="button" size="icon" variant="ghost" className="h-7 w-7 rounded-full hover:bg-indigo-50 hover:text-indigo-600" onClick={() => handleEdit(t)}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button type="button" size="icon" variant="ghost" className="h-7 w-7 rounded-full hover:bg-rose-50 hover:text-rose-600" onClick={() => { setTaskToDelete(t._id); setConfirmDeleteOpen(true); }}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-20 text-muted-foreground italic text-sm">
                        No active tasks found in this view.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
            </TabsContent>

            <TabsContent value="kanban" className="m-0 bg-slate-50/30 dark:bg-slate-900/30">
              <div className="flex gap-6 overflow-x-auto pb-8 p-6 snap-x no-scrollbar">
                {columns.map((c) => (
                  <div key={c.id} className="flex-shrink-0 w-[320px] snap-start">
                    <div className="flex flex-col h-[calc(100vh-340px)] min-h-[550px]">
                      {/* Column Header */}
                      <div className="flex items-center justify-between mb-4 px-2">
                        <div className="flex items-center gap-2.5">
                          <div className={cn("w-2.5 h-2.5 rounded-full shadow-sm", c.color.replace('bg-', 'bg-'))} />
                          <h3 className="text-xs font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                            {c.title}
                          </h3>
                        </div>
                        <Badge variant="secondary" className="bg-white/90 dark:bg-slate-800 text-[10px] font-black px-2 py-0.5 h-5 shadow-sm border-none">
                          {kanbanGroups[c.id]?.length || 0}
                        </Badge>
                      </div>

                      {/* Column Body */}
                      <Card 
                        className={cn(
                          "flex-1 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/40 dark:bg-slate-800/20 overflow-y-auto no-scrollbar rounded-[24px] transition-all duration-300",
                          dragOverStatus === c.id && "bg-indigo-50/80 dark:bg-indigo-900/30 ring-2 ring-indigo-500/30 scale-[1.01]"
                        )}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverStatus(c.id);
                        }}
                        onDragLeave={() => setDragOverStatus((s) => (s === c.id ? null : s))}
                        onDrop={(e) => {
                          e.preventDefault();
                          const taskId = e.dataTransfer.getData("text/taskId") || draggingTaskIdRef.current;
                          setDragOverStatus(null);
                          if (!taskId) return;
                          void updateTaskStatus(taskId, c.id);
                          draggingTaskIdRef.current = null;
                          draggingFromStatusRef.current = null;
                        }}
                      >
                        <CardContent className="p-4 space-y-4">
                          {(kanbanGroups[c.id] || []).map((t) => (
                            <div
                              key={t._id}
                              draggable
                              onDragStart={(e) => {
                                draggingTaskIdRef.current = t._id;
                                draggingFromStatusRef.current = t.status || "todo";
                                e.dataTransfer.setData("text/taskId", t._id);
                                e.dataTransfer.effectAllowed = "move";
                              }}
                              onDragEnd={() => {
                                draggingTaskIdRef.current = null;
                                draggingFromStatusRef.current = null;
                                setDragOverStatus(null);
                              }}
                              className="group/card bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 p-4 rounded-2xl shadow-sm hover:shadow-[0_10px_40px_rgba(0,0,0,0.08)] hover:border-indigo-500/20 hover:-translate-y-1 transition-all duration-300 cursor-grab active:cursor-grabbing relative overflow-hidden"
                            >
                              {/* Minimal Priority Bar */}
                              <div className={cn(
                                "absolute top-0 left-0 w-1.5 h-full opacity-80",
                                (t.priority || "").toLowerCase() === 'urgent' ? "bg-rose-500" :
                                (t.priority || "").toLowerCase() === 'high' ? "bg-amber-500" :
                                (t.priority || "").toLowerCase() === 'medium' ? "bg-blue-500" : "bg-slate-200"
                              )} />

                              <div className="flex items-start justify-between gap-3 mb-3">
                                <button
                                  type="button"
                                  className="font-bold text-sm text-slate-800 dark:text-white hover:text-indigo-600 transition-colors text-left leading-tight line-clamp-2"
                                  onClick={() => openTaskInfoDialog(t)}
                                >
                                  {t.title || "-"}
                                </button>
                                
                                <div className="flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity shrink-0">
                                  {canEditTask(t) && (
                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-xl hover:bg-indigo-50 hover:text-indigo-600" onClick={(e) => { e.stopPropagation(); handleEdit(t); }}>
                                      <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 mb-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-800">
                                  #{t.taskNo || String(t._id || "").slice(-4)}
                                </span>
                                {(t.priority || "").toLowerCase() === 'urgent' && (
                                  <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/30 text-rose-600 text-[9px] font-black px-2 py-0.5 rounded-lg uppercase animate-pulse">
                                    <Zap className="w-2.5 h-2.5 fill-current" /> Urgent
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-700/30">
                                <div className="flex items-center gap-2 text-slate-400">
                                  <div className={cn(
                                    "p-1.5 rounded-lg",
                                    t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done' ? "bg-rose-50 text-rose-500" : "bg-slate-50 dark:bg-slate-900"
                                  )}>
                                    <Clock className="w-3 h-3" />
                                  </div>
                                  <span className={cn(
                                    "text-[10px] font-bold",
                                    t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done' ? "text-rose-600" : "text-slate-500"
                                  )}>
                                    {t.deadline ? new Date(t.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' }) : "Open"}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  {t.attachments && (
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                      <Paperclip className="w-3 h-3" />
                                      {Array.isArray(t.attachments) ? t.attachments.length : t.attachments}
                                    </div>
                                  )}
                                  <Avatar className="h-7 w-7 border-2 border-white dark:border-slate-800 shadow-sm ring-1 ring-slate-100 dark:ring-slate-700">
                                    {(() => {
                                      const name = t.assignees?.[0]?.name;
                                      const emp = name ? employeeByName.get(String(name).trim()) : undefined;
                                      const img = emp?.avatar || emp?.image;
                                      return img ? <AvatarImage src={`${API_BASE}${img}`} /> : null;
                                    })()}
                                    <AvatarFallback className="text-[10px] bg-indigo-50 text-indigo-600 font-black">
                                      {getInitials(t.assignees?.[0]?.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          <Button 
                            variant="ghost" 
                            className="w-full h-12 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl text-slate-400 hover:text-indigo-600 hover:border-indigo-500/30 hover:bg-indigo-50/20 transition-all text-[11px] font-black uppercase tracking-widest"
                            onClick={() => {
                              setAddTaskForm(prev => ({ ...prev, status: c.id }));
                              setEditingTaskId(null);
                              setOpenAddTask(true);
                            }}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Quick Add
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="gantt" className="m-0">
              <div className="p-6">
                {!ganttItems.length ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-200/60">
                    <div className="p-5 bg-white rounded-3xl shadow-sm">
                      <Calendar className="w-10 h-10 text-slate-300" />
                    </div>
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">No tasks scheduled yet</p>
                  </div>
                ) : (
                  <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden rounded-[32px] bg-white dark:bg-slate-900">
                    <div className="overflow-x-auto no-scrollbar">
                      <div className="min-w-[1100px]">
                        {/* Gantt Header */}
                        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 backdrop-blur-md sticky top-0 z-10">
                          <div className="w-[380px] shrink-0 px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-r border-slate-100 dark:border-slate-800">Timeline Analysis</div>
                          <div className="flex-1 flex overflow-hidden">
                            {ganttDays.map((d, i) => {
                              const isToday = d.toDateString() === new Date().toDateString();
                              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                              return (
                                <div 
                                  key={i} 
                                  className={cn(
                                    "w-12 shrink-0 border-r border-slate-100 dark:border-slate-800 py-4 text-center flex flex-col items-center justify-center gap-1.5 transition-all",
                                    isToday ? "bg-indigo-50/50 dark:bg-indigo-900/10" : "",
                                    isWeekend ? "bg-slate-50/20 dark:bg-slate-800/10" : ""
                                  )}
                                >
                                  <span className={cn("text-[8px] font-black uppercase tracking-tighter", isToday ? "text-indigo-600" : "text-slate-400")}>
                                    {d.toLocaleDateString([], { weekday: 'short' })}
                                  </span>
                                  <span className={cn(
                                    "text-[11px] font-black w-7 h-7 flex items-center justify-center rounded-xl transition-all",
                                    isToday ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 scale-110" : "text-slate-600 dark:text-slate-400"
                                  )}>
                                    {d.getDate()}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Gantt Rows */}
                        <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                          {ganttItems.map(({ task, start, end }) => {
                            const minT = ganttRange!.min.getTime();
                            const dayMs = 24 * 60 * 60 * 1000;
                            const offsetDays = Math.max(0, Math.floor((start.getTime() - minT) / dayMs));
                            const durationDays = Math.max(1, Math.floor((end.getTime() - start.getTime()) / dayMs) + 1);
                            
                            return (
                              <div key={task._id} className="flex group/row hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-all duration-300">
                                <div className="w-[380px] shrink-0 px-8 py-5 border-r border-slate-100 dark:border-slate-800 flex flex-col justify-center">
                                  <div className="flex items-center gap-3 mb-2">
                                    <div className={cn(
                                      "w-2 h-2 rounded-full",
                                      task.status === 'done' ? "bg-emerald-500" :
                                      task.status === 'in-progress' ? "bg-indigo-500" : "bg-slate-300"
                                    )} />
                                    <button
                                      type="button"
                                      className="text-sm font-black text-slate-800 dark:text-white hover:text-indigo-600 transition-colors text-left truncate tracking-tight"
                                      onClick={() => openTaskInfoDialog(task)}
                                    >
                                      {task.title || "-"}
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {durationDays} Days</span>
                                    <div className="flex items-center gap-1.5">
                                      <Avatar className="h-4 w-4 ring-1 ring-slate-100">
                                        <AvatarFallback className="text-[6px] bg-slate-100 text-slate-600 font-black">
                                          {getInitials(task.assignees?.[0]?.name)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span>{task.assignees?.[0]?.name?.split(' ')[0] || "None"}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex-1 relative h-20 flex items-center overflow-hidden">
                                  {/* Minimalist Grid background lines */}
                                  <div className="absolute inset-0 flex pointer-events-none">
                                    {ganttDays.map((_, i) => (
                                      <div key={i} className="w-12 border-r border-slate-50 dark:border-slate-800/30 h-full" />
                                    ))}
                                  </div>
                                  
                                  {/* Modern Task Bar */}
                                  <div
                                    className={cn(
                                      "absolute h-9 rounded-2xl shadow-xl shadow-indigo-500/5 flex items-center px-4 group/bar cursor-pointer transition-all duration-500 hover:scale-[1.02] hover:z-20 group-hover/row:brightness-105",
                                      task.status === 'done' ? "bg-gradient-to-r from-emerald-400 via-teal-500 to-teal-600" :
                                      task.status === 'in-progress' ? "bg-gradient-to-r from-indigo-500 via-blue-600 to-indigo-700" :
                                      "bg-gradient-to-r from-slate-300 to-slate-400"
                                    )}
                                    style={{ 
                                      left: `${offsetDays * 48}px`, 
                                      width: `${durationDays * 48}px`,
                                      minWidth: '32px'
                                    }}
                                    onClick={() => openTaskInfoDialog(task)}
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span className="text-[10px] font-black text-white/90 uppercase tracking-[0.1em] truncate">
                                        {Math.round(task.progress || 0)}%
                                      </span>
                                      <div className="w-1.5 h-1.5 rounded-full bg-white/40 group-hover/bar:bg-white transition-colors" />
                                    </div>
                                    
                                    {/* Tooltip on hover */}
                                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-black px-3 py-2 rounded-xl opacity-0 group-hover/bar:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-2xl z-30">
                                      {fmtCompact(task.start)} — {fmtCompact(task.deadline)}
                                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="dashboard" className="m-0">
              <div className="p-6 space-y-6 bg-slate-50/50 dark:bg-slate-900/50 min-h-[600px]">
                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <Card className="border-none shadow-sm bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                        <ListTodo className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Tasks</div>
                        <div className="text-2xl font-bold">{dashboardMetrics.total}</div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-none shadow-sm bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">To Do</div>
                        <div className="text-2xl font-bold">{dashboardMetrics.todo}</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-sm bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">In Progress</div>
                        <div className="text-2xl font-bold">{dashboardMetrics.inProgress}</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-sm bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
                        <CheckSquare className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Completed</div>
                        <div className="text-2xl font-bold">{dashboardMetrics.completed}</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-sm bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-900/30 text-rose-600">
                        <Flag className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Critical</div>
                        <div className="text-2xl font-bold">{dashboardMetrics.highPriority}</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Activity Stream */}
                  <Card className="lg:col-span-2 border-none shadow-sm bg-white dark:bg-slate-800">
                    <CardHeader className="pb-2 border-b">
                      <div className="flex items-center gap-2 font-semibold">
                        <Activity className="w-5 h-5 text-primary" />
                        Team Activity Stream
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="max-h-[450px] overflow-y-auto">
                        {dashboardMetrics.activities.length > 0 ? (
                          <div className="divide-y">
                            {dashboardMetrics.activities.map((a, idx) => (
                              <div key={idx} className="p-4 hover:bg-muted/30 transition-colors flex gap-4">
                                <Avatar className="h-8 w-8 mt-1">
                                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                    {getInitials(a.authorName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="space-y-1 flex-1 min-w-0">
                                  <div className="text-sm">
                                    <span className="font-bold text-slate-900 dark:text-slate-100">{a.authorName || "System"}</span>
                                    <span className="text-muted-foreground mx-1.5">{a.message || a.type}</span>
                                    {a.taskTitle && (
                                      <button 
                                        onClick={() => {
                                          const t = items.find(x => x._id === a.taskId);
                                          if (t) openTaskInfoDialog(t);
                                        }}
                                        className="text-primary font-medium hover:underline inline-flex items-center gap-1"
                                      >
                                        <Link2 className="w-3 h-3" />
                                        {a.taskTitle}
                                      </button>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {a.createdAt ? new Date(a.createdAt).toLocaleString() : "Just now"}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-20 text-center space-y-3">
                            <Activity className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                            <p className="text-muted-foreground italic">No recent activity detected</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Task Distribution / Summary */}
                  <div className="space-y-6">
                    <Card className="border-none shadow-sm bg-white dark:bg-slate-800">
                      <CardHeader className="pb-2 border-b">
                        <div className="flex items-center gap-2 font-semibold">
                          <Users className="w-5 h-5 text-indigo-600" />
                          Team Workload
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="space-y-4">
                          {employeeNames.slice(0, 5).map(name => {
                            const taskCount = items.filter(t => t.assignees?.some(a => a.name === name)).length;
                            if (taskCount === 0) return null;
                            const percentage = Math.round((taskCount / (items.length || 1)) * 100);
                            return (
                              <div key={name} className="space-y-1.5">
                                <div className="flex justify-between text-xs font-medium">
                                  <span>{name}</span>
                                  <span className="text-muted-foreground">{taskCount} tasks</span>
                                </div>
                                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-indigo-500 rounded-full" 
                                    style={{ width: `${Math.min(100, percentage)}%` }}
                                  />
                                </div>
                              </div>
                            );
                          }).filter(Boolean)}
                          {!items.some(t => t.assignees?.length) && (
                            <div className="text-center py-6 text-muted-foreground text-xs italic">
                              No assignments found
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-gradient-to-br from-indigo-600 to-violet-700 text-white">
                      <CardContent className="p-6 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                            <Zap className="w-5 h-5" />
                          </div>
                          <div className="font-bold tracking-tight">Productivity Tip</div>
                        </div>
                        <p className="text-sm text-indigo-100 leading-relaxed">
                          Keep your team activity high by updating task statuses frequently. 
                          High-priority tasks should be tackled first to avoid bottlenecks.
                        </p>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="w-full bg-white text-indigo-600 hover:bg-indigo-50 border-none font-bold"
                          onClick={() => setView("kanban")}
                        >
                          View Kanban Board
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>

      <Dialog open={openAddTask} onOpenChange={setOpenAddTask}>
        <DialogContent className="bg-card max-w-3xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editingTaskId ? "Edit task" : "Add task"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-5 items-center">
              <div className="text-sm text-muted-foreground sm:col-span-1">Title</div>
              <Input className="sm:col-span-4" placeholder="Title" value={addTaskForm.title} onChange={(e)=>setAddTaskForm((p)=>({ ...p, title: e.target.value }))} />
            </div>
            <div className="grid gap-2 sm:grid-cols-5 items-start">
              <div className="text-sm text-muted-foreground sm:col-span-1">Description</div>
              <Textarea className="sm:col-span-4" placeholder="Description" value={addTaskForm.description} onChange={(e)=>setAddTaskForm((p)=>({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid gap-2 sm:grid-cols-5 items-center">
              <div className="text-sm text-muted-foreground sm:col-span-1">Points</div>
              <Select value={addTaskForm.points} onValueChange={(v)=>setAddTaskForm((p)=>({ ...p, points: v }))}>
                <SelectTrigger className="sm:col-span-4"><SelectValue placeholder="1 Point"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Point</SelectItem>
                  <SelectItem value="2">2 Points</SelectItem>
                  <SelectItem value="3">3 Points</SelectItem>
                  <SelectItem value="4">4 Points</SelectItem>
                  <SelectItem value="5">5 Points</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:grid-cols-5 items-center">
              <div className="text-sm text-muted-foreground sm:col-span-1">Assign to</div>
              <Select value={addTaskForm.assignTo || "__none__"} onValueChange={(v)=>setAddTaskForm((p)=>({ ...p, assignTo: v === "__none__" ? "" : v }))}>
                <SelectTrigger className="sm:col-span-4"><SelectValue placeholder="Mindspire tech"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-</SelectItem>
                  {employeeNames.map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:grid-cols-5 items-center">
              <div className="text-sm text-muted-foreground sm:col-span-1">Collaborators</div>
              <div className="sm:col-span-4">
                <Input
                  list="tasks-module-collaborators"
                  placeholder="Collaborators (comma separated)"
                  value={addTaskForm.collaborators}
                  onChange={(e)=>setAddTaskForm((p)=>({ ...p, collaborators: e.target.value }))}
                />
                <datalist id="tasks-module-collaborators">
                  {employeeNames.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-5 items-center">
              <div className="text-sm text-muted-foreground sm:col-span-1">Status</div>
              <Select value={addTaskForm.status} onValueChange={(v)=>setAddTaskForm((p)=>({ ...p, status: v }))}>
                <SelectTrigger className="sm:col-span-4"><SelectValue placeholder="To do"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To do</SelectItem>
                  <SelectItem value="in-progress">In progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:grid-cols-5 items-center">
              <div className="text-sm text-muted-foreground sm:col-span-1">Priority</div>
              <Select value={addTaskForm.priority} onValueChange={(v)=>setAddTaskForm((p)=>({ ...p, priority: v }))}>
                <SelectTrigger className="sm:col-span-4"><SelectValue placeholder="Priority"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:grid-cols-5 items-center">
              <div className="text-sm text-muted-foreground sm:col-span-1">Labels</div>
              <Input className="sm:col-span-4" placeholder="Labels" value={addTaskForm.labels} onChange={(e)=>setAddTaskForm((p)=>({ ...p, labels: e.target.value }))} />
            </div>
            <div className="grid gap-2 sm:grid-cols-5 items-center">
              <div className="text-sm text-muted-foreground sm:col-span-1">Start date</div>
              <div className="sm:col-span-4">
                <DatePicker value={addTaskForm.start} onChange={(v)=>setAddTaskForm((p)=>({ ...p, start: v }))} placeholder="Pick start date" />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-5 items-center">
              <div className="text-sm text-muted-foreground sm:col-span-1">Deadline</div>
              <div className="sm:col-span-4">
                <DatePicker value={addTaskForm.deadline} onChange={(v)=>setAddTaskForm((p)=>({ ...p, deadline: v }))} placeholder="Pick deadline" />
              </div>
            </div>
          </div>

          <DialogFooter className="items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="file"
                multiple
                className="hidden"
                id="tasks-module-files"
                onChange={(e) => setTaskSelectedFiles(Array.from(e.target.files || []))}
              />
              <Button type="button" variant="outline" onClick={() => document.getElementById("tasks-module-files")?.click()} disabled={taskUploading}>
                <Paperclip className="w-4 h-4 mr-2" />
                Upload File
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => toast.success("Voice note coming soon")}> <Mic className="w-4 h-4" /> </Button>
              <div className="text-xs text-muted-foreground truncate">
                {taskSelectedFiles.length ? `${taskSelectedFiles.length} file(s) selected` : ""}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => setOpenAddTask(false)}>Close</Button>
              <Button type="button" variant="secondary" onClick={() => saveTask("save_show")} disabled={taskUploading}>Save & show</Button>
              <Button type="button" onClick={() => saveTask("save")} disabled={taskUploading}>Save</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openManageLabels} onOpenChange={setOpenManageLabels}>
        <DialogContent className="bg-card max-w-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Manage labels</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {labelColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`h-6 w-6 rounded ${c} ${manageLabelColor === c ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : ""}`}
                  onClick={() => setManageLabelColor(c)}
                  aria-label={c}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Input placeholder="Label" value={manageLabelName} onChange={(e) => setManageLabelName(e.target.value)} />
              <Button type="button" onClick={createLabel}>Save</Button>
            </div>

            <Separator />

            <div className="space-y-2">
              {labels.length ? (
                labels.map((l) => (
                  <div key={l._id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`h-2.5 w-2.5 rounded-full ${l.color || "bg-slate-300"}`} />
                      <div className="truncate">{l.name}</div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setLabelToDelete(l._id); setConfirmDeleteLabelOpen(true); }} className="text-destructive">
                      Delete
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">No labels</div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpenManageLabels(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openTaskInfo} onOpenChange={setOpenTaskInfo}>
        <DialogContent className="bg-card max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0" aria-describedby={undefined}>
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b bg-muted/30">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Task {taskInfo?.taskNo ? `#${taskInfo.taskNo}` : taskInfo?._id ? `#${String(taskInfo._id).slice(-6)}` : ""}
                  </span>
                  <Badge 
                    variant={taskInfo?.status === "done" ? "default" : taskInfo?.status === "in-progress" ? "secondary" : "outline"}
                    className={`text-xs ${
                      taskInfo?.status === "done" ? "bg-green-500/20 text-green-700 hover:bg-green-500/30" :
                      taskInfo?.status === "in-progress" ? "bg-blue-500/20 text-blue-700 hover:bg-blue-500/30" :
                      taskInfo?.status === "review" ? "bg-purple-500/20 text-purple-700 hover:bg-purple-500/30" :
                      taskInfo?.status === "todo" ? "bg-orange-500/20 text-orange-700 hover:bg-orange-500/30" :
                      "bg-gray-500/20 text-gray-700 hover:bg-gray-500/30"
                    }`}
                  >
                    {(taskInfo?.status || "todo").replace(/-/g, " ")}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      taskInfo?.priority === "urgent" ? "border-red-300 bg-red-50 text-red-700" :
                      taskInfo?.priority === "high" ? "border-orange-300 bg-orange-50 text-orange-700" :
                      taskInfo?.priority === "medium" ? "border-blue-300 bg-blue-50 text-blue-700" :
                      "border-green-300 bg-green-50 text-green-700"
                    }`}
                  >
                    {taskInfo?.priority || "medium"}
                  </Badge>
                </div>
                <DialogTitle className="text-xl font-semibold leading-tight">
                  {editingTask ? (
                    <Input
                      value={taskForm.title || ""}
                      onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))}
                      placeholder="Task title"
                      className="text-lg font-semibold h-10"
                    />
                  ) : (
                    <div className="truncate">{taskInfo?.title || "Untitled Task"}</div>
                  )}
                </DialogTitle>
                {taskInfo?.leadId && (
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline mt-1 inline-flex items-center gap-1"
                    onClick={() => navigate(`/crm/leads/${taskInfo.leadId}`)}
                  >
                    <Link2 className="w-3 h-3" />
                    Lead: {leadNameByLeadId.get(String(taskInfo.leadId)) || "Lead"}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (!taskInfo?._id) return;
                    setOpenTaskInfo(false);
                    navigate(`/tasks/${taskInfo._id}`);
                  }}
                  className="gap-1"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Main Content - Left Column */}
                <div className="lg:col-span-8 space-y-6">
                  {/* Description Section */}
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <MessageSquare className="w-4 h-4 text-muted-foreground" />
                        Description
                      </div>
                      {!editingTask && canEditTask(taskInfo) && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => { 
                            setEditingTask(true); 
                            setTaskForm({ 
                              title: taskInfo?.title || "", 
                              description: taskInfo?.description || "", 
                              status: taskInfo?.status || "", 
                              priority: taskInfo?.priority || "", 
                              start: taskInfo?.start || "", 
                              deadline: taskInfo?.deadline || "" 
                            }); 
                          }}
                          className="h-7 gap-1"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </Button>
                      )}
                    </div>
                    {editingTask ? (
                      <div className="space-y-3">
                        <Textarea
                          value={taskForm.description || ""}
                          onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))}
                          placeholder="Task description"
                          rows={4}
                          className="text-sm resize-none"
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={async () => {
                              if (!taskInfo?._id) return;
                              const r = await updateTask(taskInfo._id, {
                                title: taskForm.title,
                                description: taskForm.description,
                                status: taskForm.status,
                                priority: taskForm.priority,
                                start: taskForm.start,
                                deadline: taskForm.deadline,
                              });
                              if (r.ok) {
                                setEditingTask(false);
                                toast.success("Task updated");
                              }
                            }}
                          >
                            Save Changes
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => setEditingTask(false)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-foreground/80 whitespace-pre-wrap">
                        {taskInfo?.description || <span className="text-muted-foreground italic">No description provided</span>}
                      </div>
                    )}
                  </div>

                  {/* Checklist Section */}
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <CheckSquare className="w-4 h-4 text-muted-foreground" />
                        Checklist
                        <Badge variant="secondary" className="text-xs">
                          {(taskInfo?.checklist || []).filter((x) => !!x?.done).length}/{(taskInfo?.checklist || []).length}
                        </Badge>
                      </div>
                    </div>
                    {(taskInfo?.checklist || []).length > 0 && (
                      <div className="w-full bg-muted rounded-full h-2 mb-4">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{
                            width: `${(taskInfo?.checklist || []).length ? ((taskInfo?.checklist || []).filter((x) => !!x?.done).length / (taskInfo?.checklist || []).length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      {(taskInfo?.checklist || []).map((it, idx) => (
                        <div key={it._id || String(idx)} className="flex items-center gap-3 p-2 rounded-md bg-card border group hover:border-primary/30 transition-colors">
                          <Checkbox
                            checked={!!it.done}
                            onCheckedChange={async () => {
                              if (!taskInfo?._id) return;
                              const next = (taskInfo.checklist || []).map((x, i) => (i === idx ? { ...x, done: !x.done } : x));
                              const r = await updateTask(taskInfo._id, { checklist: next });
                              if (r.ok) void pushActivity(taskInfo._id, `Updated checklist item`);
                            }}
                          />
                          <span className={`text-sm flex-1 ${it.done ? "line-through text-muted-foreground" : ""}`}>
                            {it.text || "-"}
                          </span>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={async () => {
                              if (!taskInfo?._id) return;
                              const next = (taskInfo.checklist || []).filter((_, i) => i !== idx);
                              const r = await updateTask(taskInfo._id, { checklist: next });
                              if (r.ok) void pushActivity(taskInfo._id, `Removed checklist item`);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 pt-2">
                        <Input 
                          placeholder="Add checklist item..." 
                          value={checklistDraft} 
                          onChange={(e) => setChecklistDraft(e.target.value)} 
                          className="h-9 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const text = (checklistDraft || "").trim();
                              if (!text || !taskInfo?._id) return;
                              const next = [{ text, done: false }, ...(taskInfo.checklist || [])];
                              updateTask(taskInfo._id, { checklist: next }).then((r) => {
                                if (r.ok) {
                                  setChecklistDraft("");
                                  void pushActivity(taskInfo._id, `Added checklist item`);
                                }
                              });
                            }
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={async () => {
                            const text = (checklistDraft || "").trim();
                            if (!text || !taskInfo?._id) return;
                            const next = [{ text, done: false }, ...(taskInfo.checklist || [])];
                            const r = await updateTask(taskInfo._id, { checklist: next });
                            if (r.ok) {
                              setChecklistDraft("");
                              void pushActivity(taskInfo._id, `Added checklist item`);
                            }
                          }}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Subtasks Section */}
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <ListTodo className="w-4 h-4 text-muted-foreground" />
                        Subtasks
                        <Badge variant="secondary" className="text-xs">
                          {taskInfo?.subTasks?.filter((x) => x.done).length || 0}/{taskInfo?.subTasks?.length || 0}
                        </Badge>
                      </div>
                    </div>
                    {(taskInfo?.subTasks || []).length > 0 && (
                      <div className="w-full bg-muted rounded-full h-2 mb-4">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{
                            width: `${taskInfo?.subTasks?.length ? (taskInfo.subTasks.filter((x) => x.done).length / taskInfo.subTasks.length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      {(taskInfo?.subTasks || []).map((st, idx) => (
                        <div key={st._id || String(idx)} className="flex items-center gap-3 p-3 rounded-md bg-card border group hover:border-primary/30 transition-colors">
                          <Checkbox
                            checked={!!st.done}
                            onCheckedChange={async () => {
                              if (!taskInfo?._id) return;
                              const next = (taskInfo.subTasks || []).map((x, i) => (i === idx ? { ...x, done: !x.done } : x));
                              const r = await updateTask(taskInfo._id, { subTasks: next });
                              if (r.ok) void pushActivity(taskInfo._id, `Updated subtask: ${st.title}`);
                            }}
                          />
                          <span className={`text-sm flex-1 ${st.done ? "line-through text-muted-foreground" : ""}`}>
                            {st.title || "-"}
                          </span>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={async () => {
                              if (!taskInfo?._id) return;
                              const next = (taskInfo.subTasks || []).filter((_, i) => i !== idx);
                              const r = await updateTask(taskInfo._id, { subTasks: next });
                              if (r.ok) void pushActivity(taskInfo._id, `Removed subtask`);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 pt-2">
                        <Input 
                          placeholder="Create a subtask..." 
                          value={subTaskDraft} 
                          onChange={(e) => setSubTaskDraft(e.target.value)} 
                          className="h-9 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const title = (subTaskDraft || "").trim();
                              if (!title || !taskInfo?._id) return;
                              const next = [{ title, done: false }, ...(taskInfo.subTasks || [])];
                              updateTask(taskInfo._id, { subTasks: next }).then((r) => {
                                if (r.ok) {
                                  setSubTaskDraft("");
                                  void pushActivity(taskInfo._id, `Added subtask: ${title}`);
                                }
                              });
                            }
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={async () => {
                            const title = (subTaskDraft || "").trim();
                            if (!title || !taskInfo?._id) return;
                            const next = [{ title, done: false }, ...(taskInfo.subTasks || [])];
                            const r = await updateTask(taskInfo._id, { subTasks: next });
                            if (r.ok) {
                              setSubTaskDraft("");
                              void pushActivity(taskInfo._id, `Added subtask: ${title}`);
                            }
                          }}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Attachments Section */}
                  <div id="task-attachments" className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Paperclip className="w-4 h-4 text-muted-foreground" />
                        Attachments
                        <Badge variant="secondary" className="text-xs">{attachments.length}</Badge>
                      </div>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        id="task-attachments-upload"
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          if (!files.length || !taskInfo?._id) return;
                          let uploadedCount = 0;
                          for (const file of files) {
                            const formData = new FormData();
                            formData.append("file", file);
                            formData.append("taskId", taskInfo._id);
                            formData.append("name", file.name);
                            formData.append("type", file.type || "application/octet-stream");
                            formData.append("size", String(file.size));
                            try {
                              const res = await fetch(`${API_BASE}/api/files`, {
                                method: "POST",
                                headers: { Authorization: getAuthHeaders().Authorization },
                                body: formData,
                              });
                              if (res.ok) {
                                const uploaded = await res.json();
                                setAttachments((p) => [...p, { 
                                  _id: uploaded._id, 
                                  name: uploaded.name || file.name, 
                                  url: uploaded.url, 
                                  path: uploaded.path 
                                }]);
                                uploadedCount++;
                              }
                            } catch {}
                          }
                          if (uploadedCount > 0) {
                            toast.success(`${uploadedCount} file(s) uploaded`);
                            const currentCount = Array.isArray(taskInfo.attachments) 
                              ? taskInfo.attachments.length 
                              : Number(taskInfo.attachments || 0);
                            const newCount = currentCount + uploadedCount;
                            
                            // Update items array immediately for real-time count in list view
                            setItems((prev) => prev.map((t) => 
                              t._id === taskInfo._id 
                                ? { ...t, attachments: newCount } 
                                : t
                            ));
                            
                            // Also update taskInfo
                            setTaskInfo((prev) => prev ? { ...prev, attachments: newCount } : prev);
                            
                            updateTask(taskInfo._id, { attachments: newCount }).catch(() => {});
                          }
                          (e.target as any).value = "";
                        }}
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        className="gap-1"
                        onClick={() => document.getElementById("task-attachments-upload")?.click()}
                      >
                        <Plus className="w-3 h-3" />
                        Add File
                      </Button>
                    </div>
                    {attachments.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {attachments.map((att) => {
                          const href = att.url || (att.path ? `${API_BASE}${att.path.startsWith("/") ? "" : "/"}${att.path}` : "#");
                          const isImage = att.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                          return (
                            <a 
                              key={att._id || att.name} 
                              href={href} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="flex items-center gap-3 p-3 rounded-md bg-card border hover:border-primary/50 hover:shadow-sm transition-all group"
                            >
                              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                                {isImage ? (
                                  <ImageIcon className="w-5 h-5 text-muted-foreground" />
                                ) : (
                                  <FileText className="w-5 h-5 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                  {att.name || "File"}
                                </div>
                                <div className="text-xs text-muted-foreground">Click to view</div>
                              </div>
                              <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-md">
                        <Paperclip className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        No attachments yet
                      </div>
                    )}
                  </div>

                  {/* Comments Section */}
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-sm font-medium mb-3">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      Comments
                      <Badge variant="secondary" className="text-xs">{taskInfo?.taskComments?.length || 0}</Badge>
                    </div>
                    <div className="space-y-4">
                      {(taskInfo?.taskComments || []).length > 0 ? (
                        <div className="space-y-3">
                          {(taskInfo?.taskComments || []).map((comment, idx) => (
                            <div key={comment._id || String(idx)} className="flex gap-3 group">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-medium text-primary">
                                  {(comment.authorName || "U").charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1">
                                <div className="bg-card rounded-lg p-3 border">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium">{comment.authorName || "Unknown"}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground">
                                        {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : ""}
                                      </span>
                                      {canDeleteComment(comment) && (
                                        <Button
                                          type="button"
                                          size="icon"
                                          variant="ghost"
                                          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                          onClick={() => {
                                            if (!taskInfo?._id) return;
                                            setCommentToDeleteIdx(idx);
                                            setConfirmDeleteCommentOpen(true);
                                          }}
                                        >
                                          <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-sm text-foreground/80">{comment.text}</div>
                                  {comment.attachments && comment.attachments.length > 0 ? (
                                    <div className="flex flex-col gap-1 mt-2">
                                      {comment.attachments.map((att, attIdx) => {
                                        // Try multiple possible URL sources
                                        let href = att.url;
                                        if (!href && att.path) {
                                          const cleanPath = att.path.startsWith("/") ? att.path : `/${att.path}`;
                                          href = `${API_BASE}${cleanPath}`;
                                        }
                                        if (!href && att._id) {
                                          href = `${API_BASE}/api/files/${att._id}`;
                                        }
                                        const finalHref = href || "#";
                                        return (
                                          <a 
                                            key={att._id || attIdx} 
                                            href={finalHref}
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
                                          >
                                            <Paperclip className="w-3 h-3 flex-shrink-0" />
                                            <span className="truncate">{att.name || "File"}</span>
                                          </a>
                                        );
                                      })}
                                    </div>
                                  ) : comment.attachmentCount ? (
                                    <button
                                      onClick={() => {
                                        // Scroll to attachments section
                                        const attSection = document.getElementById("task-attachments");
                                        if (attSection) attSection.scrollIntoView({ behavior: "smooth", block: "center" });
                                      }}
                                      className="flex items-center gap-1 mt-2 text-xs text-primary hover:underline cursor-pointer"
                                    >
                                      <Paperclip className="w-3 h-3" />
                                      {comment.attachmentCount} attachment(s) - click to view
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          No comments yet
                        </div>
                      )}
                      <div className="flex gap-3 pt-2">
                        <Textarea 
                          placeholder="Write a comment..." 
                          value={commentDraft} 
                          onChange={(e) => setCommentDraft(e.target.value)}
                          className="text-sm resize-none flex-1"
                          rows={2}
                        />
                        <div className="flex flex-col gap-2">
                          <input
                            type="file"
                            multiple
                            className="hidden"
                            id="comment-files"
                            onChange={(e) => setCommentFiles(Array.from(e.target.files || []))}
                          />
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => document.getElementById("comment-files")?.click()}
                          >
                            <Paperclip className="w-4 h-4" />
                          </Button>
                          <Button 
                            type="button" 
                            size="icon"
                            className="h-9 w-9"
                            onClick={async () => {
                              const text = (commentDraft || "").trim();
                              if (!taskInfo?._id || !text) return;
                              const uploadedFiles = await uploadCommentFiles();
                              const author = (() => {
                                try {
                                  const u = localStorage.getItem("auth_user") || sessionStorage.getItem("auth_user");
                                  if (!u) return "";
                                  const j = JSON.parse(u);
                                  return j?.name || j?.email || "";
                                } catch { return ""; }
                              })();
                              const next = [{ 
                                authorName: author, 
                                text, 
                                attachmentCount: uploadedFiles.length,
                                attachments: uploadedFiles 
                              }, ...(taskInfo.taskComments || [])];
                              const prevAttachmentCount = Array.isArray((taskInfo as any).attachments)
                                ? (taskInfo as any).attachments.length
                                : Number((taskInfo as any).attachments || 0);
                              const r = await updateTask(taskInfo._id, {
                                taskComments: next,
                                comments: next.length,
                                attachments: prevAttachmentCount + uploadedFiles.length,
                              });
                              if (r.ok) {
                                setCommentDraft("");
                                setCommentFiles([]);
                                void pushActivity(taskInfo._id, `Posted a comment`);
                              } else {
                                toast.error("Failed to post comment");
                              }
                            }}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {commentFiles.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Paperclip className="w-3 h-3" />
                          {commentFiles.length} file(s) selected for upload
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Activity Section */}
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-sm font-medium mb-3">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                      Activity
                    </div>
                    {(taskInfo?.activity || []).length > 0 ? (
                      <div className="space-y-3">
                        {(taskInfo?.activity || []).slice(0, 10).map((a, idx) => (
                          <div key={a._id || String(idx)} className="flex gap-3">
                            <div className="w-2 h-2 rounded-full bg-primary/50 mt-2 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="text-sm">
                                <span className="font-medium">{a.authorName || "System"}</span>
                                <span className="text-muted-foreground"> {a.message || a.type || ""}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        No activity yet
                      </div>
                    )}
                  </div>
                </div>

                {/* Sidebar - Right Column */}
                <div className="lg:col-span-4 space-y-4">
                  {/* Status & Assignee Card */}
                  <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</label>
                      <Select
                        value={(taskInfo?.status || "todo")}
                        onValueChange={async (v) => {
                          if (!taskInfo?._id || !canUpdateTaskStatus(taskInfo)) return;
                          const r = await updateTask(taskInfo._id, { status: v });
                          if (r.ok) void pushActivity(taskInfo._id, `Status changed to ${statusLabel(v)}`);
                        }}
                        disabled={!canUpdateTaskStatus(taskInfo)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="backlog">Backlog</SelectItem>
                          <SelectItem value="todo">To Do</SelectItem>
                          <SelectItem value="in-progress">In Progress</SelectItem>
                          <SelectItem value="review">Review</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assignee</label>
                      <div className="flex items-center gap-2 p-2 rounded-md bg-card border">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-sm font-medium">
                          {taskInfo?.assignees?.[0]?.name || "Unassigned"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Priority</label>
                      <Select
                        value={(taskInfo?.priority || "medium")}
                        onValueChange={async (v) => {
                          if (!taskInfo?._id || !canEditTask(taskInfo)) return;
                          const r = await updateTask(taskInfo._id, { priority: v });
                          if (r.ok) void pushActivity(taskInfo._id, `Priority updated to ${v}`);
                        }}
                        disabled={!canEditTask(taskInfo)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="urgent">Critical</SelectItem>
                          <SelectItem value="high">Major</SelectItem>
                          <SelectItem value="medium">Minor</SelectItem>
                          <SelectItem value="low">Blocker</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Dates Card */}
                  <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium mb-3">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      Dates
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Start Date</label>
                      <DatePicker
                        value={taskInfo?.start ? String(taskInfo.start).slice(0, 10) : ""}
                        onChange={async (v) => {
                          if (!taskInfo?._id || !canEditTask(taskInfo)) return;
                          const r = await updateTask(taskInfo._id, { start: v || undefined });
                          if (r.ok) void pushActivity(taskInfo._id, `Start date updated`);
                        }}
                        placeholder="Select date"
                        className="h-9 w-full"
                        disabled={!canEditTask(taskInfo)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Due Date</label>
                      <DatePicker
                        value={taskInfo?.deadline ? String(taskInfo.deadline).slice(0, 10) : ""}
                        onChange={async (v) => {
                          if (!taskInfo?._id || !canEditTask(taskInfo)) return;
                          const r = await updateTask(taskInfo._id, { deadline: v || undefined });
                          if (r.ok) void pushActivity(taskInfo._id, `Deadline updated`);
                        }}
                        placeholder="Select date"
                        className="h-9 w-full"
                        disabled={!canEditTask(taskInfo)}
                      />
                    </div>
                  </div>

                  {/* Time Tracking Card */}
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-sm font-medium mb-3">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      Time Tracking
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2 rounded-md bg-card border">
                        <div className="text-sm font-mono">
                          {timeTracking.isRunning
                            ? `${Math.floor((timeTracking.elapsed + (Date.now() - (timeTracking.startTime || 0))) / 60000).toString().padStart(2, "0")}:${Math.floor(((timeTracking.elapsed + (Date.now() - (timeTracking.startTime || 0))) % 60000) / 1000).toString().padStart(2, "0")}`
                            : `${Math.floor(timeTracking.elapsed / 60000).toString().padStart(2, "0")}:${Math.floor((timeTracking.elapsed % 60000) / 1000).toString().padStart(2, "0")}`
                          }
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant={timeTracking.isRunning ? "destructive" : "default"}
                            className="h-7 px-2"
                            onClick={() => {
                              if (timeTracking.isRunning) {
                                const totalElapsed = timeTracking.elapsed + (Date.now() - (timeTracking.startTime || 0));
                                setTimeTracking((p) => ({ ...p, isRunning: false, startTime: null, elapsed: totalElapsed }));
                                toast.success(`Timer stopped`);
                              } else {
                                setTimeTracking((p) => ({ ...p, isRunning: true, startTime: Date.now() }));
                                toast.success("Timer started");
                              }
                            }}
                          >
                            {timeTracking.isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2"
                            onClick={() => setTimeTracking((p) => ({ ...p, isRunning: false, startTime: null, elapsed: 0 }))}
                          >
                            <RotateCcw className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Hours"
                          value={timeTracking.manualHours}
                          onChange={(e) => setTimeTracking((p) => ({ ...p, manualHours: e.target.value }))}
                          className="h-8 text-sm"
                          type="number"
                          step="0.5"
                          min="0"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={() => {
                            const hours = parseFloat(timeTracking.manualHours);
                            if (!isNaN(hours) && hours > 0) {
                              const ms = hours * 3600000;
                              setTimeTracking((p) => ({ ...p, elapsed: p.elapsed + ms, manualHours: "" }));
                              toast.success(`Added ${hours}h`);
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Label Card */}
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-sm font-medium mb-3">
                      <Tag className="w-4 h-4 text-muted-foreground" />
                      Label
                    </div>
                    <Select
                      value={((taskInfo?.tags || [])[0] || "__none__")}
                      onValueChange={async (v) => {
                        if (!taskInfo?._id || !canEditTask(taskInfo)) return;
                        const nextTags = v === "__none__" ? [] : [v];
                        const r = await updateTask(taskInfo._id, { tags: nextTags });
                        if (r.ok) void pushActivity(taskInfo._id, `Label updated`);
                      }}
                      disabled={!canEditTask(taskInfo)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select label" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {labels.map((l) => (
                          <SelectItem key={l._id} value={l.name}>{l.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Collaborators Card */}
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-sm font-medium mb-3">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      Collaborators
                    </div>
                    {Array.isArray(taskInfo?.collaborators) && taskInfo?.collaborators?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {taskInfo.collaborators.map((n) => (
                          <div key={n} className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-xs">
                            <User className="w-3 h-3" />
                            {n}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No collaborators</div>
                    )}
                  </div>

                  {/* Reminders Card */}
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Bell className="w-4 h-4 text-muted-foreground" />
                        Reminders
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Input 
                        placeholder="Reminder title" 
                        value={reminderDraft.title} 
                        onChange={(e) => setReminderDraft((p) => ({ ...p, title: e.target.value }))} 
                        className="h-8 text-sm" 
                        disabled={!canAddReminder(taskInfo)}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <DatePicker 
                          value={reminderDraft.date} 
                          onChange={(v) => setReminderDraft((p) => ({ ...p, date: v }))} 
                          placeholder="Date" 
                          className="h-8" 
                          disabled={!canAddReminder(taskInfo)}
                        />
                        <Input 
                          type="time" 
                          value={reminderDraft.time} 
                          onChange={(e) => setReminderDraft((p) => ({ ...p, time: e.target.value }))} 
                          className="h-8 text-sm" 
                          disabled={!canAddReminder(taskInfo)}
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={async () => {
                          if (!taskInfo?._id || !canAddReminder(taskInfo)) return;
                          const title = (reminderDraft.title || "").trim();
                          if (!title) return;
                          const user = getCurrentUser();
                          const creatorName = user?.name || user?.email || "";
                          const when = reminderDraft.date
                            ? new Date(`${reminderDraft.date}T${reminderDraft.time || "00:00"}:00`).toISOString()
                            : undefined;
                          // Determine notification targets based on who is creating the reminder
                          const notifyTargets = getReminderNotifyTargets({ ...reminderDraft, createdBy: creatorName, createdByName: creatorName }, taskInfo);
                          const next = [{
                            title,
                            when,
                            repeat: (reminderDraft.repeat || "").trim(),
                            priority: reminderDraft.priority,
                            createdBy: String(user?._id || user?.id || ""),
                            createdByName: creatorName,
                            notifyTargets,
                          }, ...(taskInfo.reminders || [])];
                          const r = await updateTask(taskInfo._id, { reminders: next });
                          if (r.ok) {
                            setReminderDraft({ priority: "medium", title: "", date: "", time: "", repeat: "" });
                            void pushActivity(taskInfo._id, `Added reminder`);
                          }
                        }}
                        disabled={!canAddReminder(taskInfo)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Reminder
                      </Button>
                    </div>
                    {(taskInfo?.reminders || []).length > 0 && (
                      <div className="mt-3 space-y-2">
                        {(taskInfo?.reminders || []).slice(0, 5).map((r, idx) => (
                          <div key={r._id || String(idx)} className="flex items-center justify-between gap-2 p-2 rounded-md bg-card border text-xs">
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium">{r.title}</div>
                              <div className="text-muted-foreground">{fmt(r.when as any) || "No date"}</div>
                              {r.createdByName && (
                                <div className="text-[10px] text-muted-foreground">By: {r.createdByName}</div>
                              )}
                            </div>
                            {canDeleteReminder(r, taskInfo) && (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={async () => {
                                  if (!taskInfo?._id) return;
                                  const next = (taskInfo.reminders || []).filter((_, i) => i !== idx);
                                  const rr = await updateTask(taskInfo._id, { reminders: next });
                                  if (rr.ok) void pushActivity(taskInfo._id, `Removed reminder`);
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-4 border-t bg-muted/30">
            <div className="flex items-center justify-end gap-2 w-full">
              {canCloneTask(taskInfo) && (
                <Button type="button" variant="outline" onClick={() => { if (taskInfo) { setTaskToClone(taskInfo); setConfirmCloneOpen(true); } }} disabled={!taskInfo} className="gap-1">
                  <Copy className="w-4 h-4" />
                  Clone
                </Button>
              )}
              {canEditTask(taskInfo) && (
                <Button type="button" variant="secondary" onClick={() => { if (taskInfo) handleEdit(taskInfo); setOpenTaskInfo(false); }} disabled={!taskInfo} className="gap-1">
                  <Pencil className="w-4 h-4" />
                  Edit
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => setOpenTaskInfo(false)}>Close</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        onConfirm={() => taskToDelete && handleDelete({ _id: taskToDelete } as any)}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        variant="destructive"
      />

      <ConfirmDialog
        open={confirmDeleteLabelOpen}
        onOpenChange={setConfirmDeleteLabelOpen}
        onConfirm={() => labelToDelete && deleteLabel(labelToDelete)}
        title="Delete Label"
        description="Are you sure you want to delete this label?"
        variant="destructive"
      />

      <ConfirmDialog
        open={confirmCloneOpen}
        onOpenChange={setConfirmCloneOpen}
        onConfirm={() => taskToClone && cloneTask(taskToClone)}
        title="Clone Task"
        description={`Are you sure you want to clone "${taskToClone?.title}"?`}
        confirmText="Clone"
      />

      <ConfirmDialog
        open={confirmDeleteCommentOpen}
        onOpenChange={setConfirmDeleteCommentOpen}
        onConfirm={() => commentToDeleteIdx !== null && deleteComment(commentToDeleteIdx)}
        title="Delete Comment"
        description="Are you sure you want to delete this comment?"
        variant="destructive"
      />
    </div>
  );
};

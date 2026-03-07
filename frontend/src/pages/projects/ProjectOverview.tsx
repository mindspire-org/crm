import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RefreshCcw, Settings, Printer, FileDown, LayoutGrid, ChevronLeft, ChevronRight, Paperclip, Mic, CalendarDays, Plus, MoreVertical, Pencil, Trash2, AlertCircle, Eye } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/sonner";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";
import { getCurrentUser } from "@/utils/roleAccess";

interface Project {
  id: string;
  title: string;
  clientId?: string;
  client?: string;
  price?: number;
  start?: string; // ISO
  deadline?: string; // ISO
  status?: string;
  description?: string;
  members?: string[];
  clientRequirements?: string;
  deliveryDocument?: string;
  labels?: string;
}

interface TaskRow {
  id: string;
  title: string;
  status: string;
  start: string;
  deadline: string;
  priority: string;
  labels?: string;
  assignedTo?: string;
  collaborators?: string[];
  attachments?: number;
  createdByUserId?: string;
  createdByEmail?: string;
}

type Employee = { _id: string; name?: string; firstName?: string; lastName?: string };

interface ContractRow {
  id: string;
  title: string;
  amount: string;
  contractDate: string;
  validUntil: string;
  status: string;
  type?: string;
  owner?: string;
  signed?: boolean;
  notes?: string;
}

interface SimpleItem { 
  id: string; 
  text: string; 
  at?: string; 
  title?: string; 
  category?: string; 
  tags?: string; 
  author?: string; 
  kind?: string; 
  pinned?: boolean 
}

interface FileItem { 
  id: string; 
  name: string; 
  size?: number; 
  type?: string; 
  url?: string; 
  uploadedBy?: string; 
  at?: string; 
  description?: string;
  taskId?: string;
}

interface InvoiceItem { 
  id: string; 
  number?: string; 
  total?: number; 
  status?: string; 
  date?: string; 
  dueDate?: string; 
  currency?: string; 
  tax?: number; 
  discount?: number; 
  notes?: string 
}

interface PaymentItem { 
  id: string; 
  amount?: number; 
  fee?: number;
  date?: string; 
  method?: string; 
  status?: string;
  payer?: string;
  receivedBy?: string; 
  reference?: string; 
  transactionId?: string;
  bankName?: string;
  account?: string;
  receiptUrl?: string;
  currency?: string; 
  notes?: string 
}

interface ExpenseItem { 
  id: string; 
  title?: string; 
  amount?: number; 
  date?: string; 
  category?: string; 
  vendor?: string; 
  receiptUrl?: string; 
  reimbursable?: boolean; 
  notes?: string 
}

interface TimesheetItem { 
  id: string; 
  user?: string; 
  date?: string; 
  hours?: number; 
  task?: string; 
  billable?: boolean; 
  rate?: number; 
  notes?: string 
}

interface MilestoneItem { 
  id: string; 
  title?: string; 
  due?: string; 
  status?: string 
}

interface FeedbackItem { 
  id: string; 
  author?: string; 
  text?: string; 
  at?: string; 
  rating?: number; 
  category?: string; 
  status?: string; 
  followUpRequired?: boolean; 
  sentiment?: string 
}

export default function ProjectOverviewPage() {
  const { id } = useParams();
  // Persist the current project id for cross-page context (Proposal Editor uses this)
  useEffect(() => {
    if (id) {
      try { localStorage.setItem("current_project_id", String(id)); } catch {}
    }
  }, [id]);
  const role = useMemo(() => {
    try {
      const raw = localStorage.getItem("auth_user") || sessionStorage.getItem("auth_user");
      const u = raw ? JSON.parse(raw) : null;
      return String(u?.role || "").trim().toLowerCase();
    } catch {
      return "";
    }
  }, []);
  const normalizedRole = role === "finance manager" ? "finance_manager" : role;
  const isMarketer = normalizedRole === "marketer";
  const canViewProjectFinancials = normalizedRole === "admin" || normalizedRole === "finance_manager";
  const [projectLoading, setProjectLoading] = useState(true);
  const [projectError, setProjectError] = useState<string>("");
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [activity, setActivity] = useState<Array<{ id: string; text: string; at: string }>>([]);
  const [countdownNow, setCountdownNow] = useState(() => Date.now());
  const [showProjectCountdown, setShowProjectCountdown] = useState(false);
  const [deadlineAlerted, setDeadlineAlerted] = useState(false);
  const [editDeadline, setEditDeadline] = useState("");
  const [taskQuery, setTaskQuery] = useState("");
  const [taskStatus, setTaskStatus] = useState("__all__");
  const [taskPriority, setTaskPriority] = useState("__all__");
  const [taskQuickFilter, setTaskQuickFilter] = useState("__none__");
  const [taskMilestoneFilter, setTaskMilestoneFilter] = useState("__all__");
  const [taskLabelFilter, setTaskLabelFilter] = useState("__all__");
  const [taskAssignedFilter, setTaskAssignedFilter] = useState("__all__");
  const [taskDeadlineFilter, setTaskDeadlineFilter] = useState("__all__");
  const [taskPageSize, setTaskPageSize] = useState("10");
  const [tasksCompact, setTasksCompact] = useState(false);
  const [openTaskSettings, setOpenTaskSettings] = useState(false);
  const [labelOptions, setLabelOptions] = useState<string[]>([]);
  const [openManageLabels, setOpenManageLabels] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [labelDraft, setLabelDraft] = useState<string[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const miscLoadedRef = useRef(false);
  const financeLoadedRef = useRef(false);
  const contractsLoadedRef = useRef(false);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [notes, setNotes] = useState<SimpleItem[]>([]);
  const [comments, setComments] = useState<SimpleItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [timesheets, setTimesheets] = useState<TimesheetItem[]>([]);
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [newNote, setNewNote] = useState("");
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteCategory, setNewNoteCategory] = useState("General");
  const [newNoteTags, setNewNoteTags] = useState("");
  const [newNotePinned, setNewNotePinned] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [newCommentAuthor, setNewCommentAuthor] = useState("");
  const [newCommentKind, setNewCommentKind] = useState("General");
  const [showAddNote, setShowAddNote] = useState(false);
  const [showAddComment, setShowAddComment] = useState(false);

  // Project overview inline editors
  const [editDescOpen, setEditDescOpen] = useState(false);
  const [descDraft, setDescDraft] = useState("");
  const [membersOpen, setMembersOpen] = useState(false);
  const [membersDraft, setMembersDraft] = useState<string[]>([]);
  const [newMember, setNewMember] = useState("");

  const [clientRequirementsDraft, setClientRequirementsDraft] = useState("");
  const [deliveryDocumentDraft, setDeliveryDocumentDraft] = useState("");
  const [savingDocs, setSavingDocs] = useState(false);

  const requirementsPdfRef = useRef<HTMLDivElement | null>(null);
  const deliveryPdfRef = useRef<HTMLDivElement | null>(null);

  const loadHtml2Pdf = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      const w = window as any;
      if (w.html2pdf) return resolve(w.html2pdf);
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js";
      script.async = true;
      script.onload = () => resolve((window as any).html2pdf);
      script.onerror = () => reject(new Error("Failed to load html2pdf"));
      document.head.appendChild(script);
    });
  };

  const brand = {
    name: "HealthSpire",
    address: "761/D2 Shah Jelani Rd Township Lahore",
    email: "info@healthspire.org",
    phone: "+92 312 7231875",
    website: "www.healthspire.org",
    logo: "/HealthSpire%20logo.png",
  };

  const saveProjectDocs = async (kind: "requirements" | "delivery") => {
    if (!id) return;
    setSavingDocs(true);
    try {
      const payload: any = {};
      if (kind === "requirements") payload.clientRequirements = clientRequirementsDraft;
      if (kind === "delivery") payload.deliveryDocument = deliveryDocumentDraft;

      const r = await fetch(`${API_BASE}/api/projects/${encodeURIComponent(String(id))}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(String((d as any)?.error || "Failed to save"));

      setProject((p) => (p ? { ...p, ...payload } : p));
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    } finally {
      setSavingDocs(false);
    }
  };

  const downloadPdf = async (mode: "requirements" | "delivery") => {
    try {
      const ref = mode === "requirements" ? requirementsPdfRef : deliveryPdfRef;
      const el = ref.current;
      if (!el) return;
      const html2pdf = await loadHtml2Pdf();
      const projectId = String(project?.id || id || "project");
      const filename =
        mode === "requirements" ? `project-${projectId}-requirements.pdf` : `project-${projectId}-delivery.pdf`;
      await html2pdf()
        .set({
          margin: 0,
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["avoid-all", "css", "legacy"], avoid: ["tr", "table"] },
        } as any)
        .from(el)
        .save();
    } catch (e: any) {
      toast.error(e?.message || "Failed to download PDF");
    }
  };

  type ItemKind = "task" | "milestone" | "note" | "comment" | "file" | "feedback" | "timesheet" | "invoice" | "payment" | "expense" | "contract";
  const [editOpen, setEditOpen] = useState(false);
  const [editKind, setEditKind] = useState<ItemKind | null>(null);
  const [editId, setEditId] = useState("");
  const [editFields, setEditFields] = useState<any>({});
  const [editTaskFiles, setEditTaskFiles] = useState<any[]>([]);
  const [editTaskNewFiles, setEditTaskNewFiles] = useState<File[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteKind, setDeleteKind] = useState<ItemKind | null>(null);
  const [deleteId, setDeleteId] = useState("");
  const [deleteLabel, setDeleteLabel] = useState("");

  // View task details state
  const [viewTaskOpen, setViewTaskOpen] = useState(false);
  const [viewTaskData, setViewTaskData] = useState<TaskRow | null>(null);
  const [viewTaskFiles, setViewTaskFiles] = useState<any[]>([]);

  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddMultipleTasks, setShowAddMultipleTasks] = useState(false);
  const [bulkTasksText, setBulkTasksText] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState("todo");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [newTaskStart, setNewTaskStart] = useState("");
  const [newTaskDeadline, setNewTaskDeadline] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPoints, setNewTaskPoints] = useState<number | "">(1);
  const [newTaskMilestoneId, setNewTaskMilestoneId] = useState("__none__");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [newTaskCollaborators, setNewTaskCollaborators] = useState("");
  const [newTaskCollaboratorPick, setNewTaskCollaboratorPick] = useState("__none__");
  const [newTaskLabels, setNewTaskLabels] = useState("");
  const [newTaskFiles, setNewTaskFiles] = useState<File[]>([]);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const employeeNames = useMemo(() => {
    return (employees || [])
      .map((e) => (e.name || `${e.firstName || ""} ${e.lastName || ""}`.trim() || "").trim())
      .filter(Boolean);
  }, [employees]);

  const getInitials = (name: string) => {
    return String(name || "")
      .split(/\s+/)
      .map((p) => p.trim())
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || "")
      .join("");
  };

  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneDue, setNewMilestoneDue] = useState("");
  const [newMilestoneStatus, setNewMilestoneStatus] = useState("Open");
  const [milestoneStatusFilter, setMilestoneStatusFilter] = useState("__all__");

  const [showAddFile, setShowAddFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileSize, setNewFileSize] = useState<number | "">("");
  const [newFileType, setNewFileType] = useState("Document");
  const [newFileUrl, setNewFileUrl] = useState("");
  const [newFileUploadedBy, setNewFileUploadedBy] = useState("");
  const [newFileDescription, setNewFileDescription] = useState("");
  const [newFileBlob, setNewFileBlob] = useState<File | null>(null);

  const [showAddFeedback, setShowAddFeedback] = useState(false);
  const [newFeedbackAuthor, setNewFeedbackAuthor] = useState("");
  const [newFeedbackText, setNewFeedbackText] = useState("");
  const [newFeedbackRating, setNewFeedbackRating] = useState<number | "">(5);
  const [newFeedbackCategory, setNewFeedbackCategory] = useState("General");
  const [newFeedbackStatus, setNewFeedbackStatus] = useState("New");
  const [newFeedbackFollowUp, setNewFeedbackFollowUp] = useState(false);
  const [newFeedbackSentiment, setNewFeedbackSentiment] = useState("Positive");

  const [showAddTimesheet, setShowAddTimesheet] = useState(false);
  const [newTimesheetDate, setNewTimesheetDate] = useState("");
  const [newTimesheetUser, setNewTimesheetUser] = useState("");
  const [newTimesheetTask, setNewTimesheetTask] = useState("");
  const [newTimesheetHours, setNewTimesheetHours] = useState<number | "">("");
  const [newTimesheetBillable, setNewTimesheetBillable] = useState(true);
  const [newTimesheetRate, setNewTimesheetRate] = useState<number | "">("");
  const [newTimesheetNotes, setNewTimesheetNotes] = useState("");

  const [showAddInvoice, setShowAddInvoice] = useState(false);
  const [newInvoiceNumber, setNewInvoiceNumber] = useState("");
  const [newInvoiceDate, setNewInvoiceDate] = useState("");
  const [newInvoiceDueDate, setNewInvoiceDueDate] = useState("");
  const [newInvoiceStatus, setNewInvoiceStatus] = useState("Draft");
  const [newInvoiceTotal, setNewInvoiceTotal] = useState<number | "">("");
  const [newInvoiceCurrency, setNewInvoiceCurrency] = useState("PKR");
  const [newInvoiceTax, setNewInvoiceTax] = useState<number | "">("");
  const [newInvoiceDiscount, setNewInvoiceDiscount] = useState<number | "">("");
  const [newInvoiceNotes, setNewInvoiceNotes] = useState("");

  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newPaymentDate, setNewPaymentDate] = useState("");
  const [newPaymentMethod, setNewPaymentMethod] = useState("Cash");
  const [newPaymentAmount, setNewPaymentAmount] = useState<number | "">("");
  const [newPaymentFee, setNewPaymentFee] = useState<number | "">("");
  const [newPaymentReference, setNewPaymentReference] = useState("");
  const [newPaymentCurrency, setNewPaymentCurrency] = useState("PKR");
  const [newPaymentStatus, setNewPaymentStatus] = useState("Received");
  const [newPaymentPayer, setNewPaymentPayer] = useState("");
  const [newPaymentReceivedBy, setNewPaymentReceivedBy] = useState("");
  const [newPaymentTransactionId, setNewPaymentTransactionId] = useState("");
  const [newPaymentBankName, setNewPaymentBankName] = useState("");
  const [newPaymentAccount, setNewPaymentAccount] = useState("");
  const [newPaymentReceiptUrl, setNewPaymentReceiptUrl] = useState("");
  const [newPaymentNotes, setNewPaymentNotes] = useState("");

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpenseTitle, setNewExpenseTitle] = useState("");
  const [newExpenseDate, setNewExpenseDate] = useState("");
  const [newExpenseCategory, setNewExpenseCategory] = useState("General");
  const [newExpenseAmount, setNewExpenseAmount] = useState<number | "">("");
  const [newExpenseVendor, setNewExpenseVendor] = useState("");
  const [newExpenseReceiptUrl, setNewExpenseReceiptUrl] = useState("");
  const [newExpenseReimbursable, setNewExpenseReimbursable] = useState(false);
  const [newExpenseNotes, setNewExpenseNotes] = useState("");

  const [showAddContract, setShowAddContract] = useState(false);
  const [newContractTitle, setNewContractTitle] = useState("");
  const [newContractAmount, setNewContractAmount] = useState<number | "">("");
  const [newContractDate, setNewContractDate] = useState("");
  const [newContractValidUntil, setNewContractValidUntil] = useState("");
  const [newContractStatus, setNewContractStatus] = useState("draft");
  const [newContractType, setNewContractType] = useState("Service");
  const [newContractOwner, setNewContractOwner] = useState("");
  const [newContractSigned, setNewContractSigned] = useState(false);
  const [newContractNotes, setNewContractNotes] = useState("");

  useEffect(() => {
    if (!id) {
      setProject(null);
      setProjectLoading(false);
      setProjectError("Missing project id in URL");
      return;
    }
    (async () => {
      try {
        setProjectLoading(true);
        setProjectError("");
        const r = await fetch(`${API_BASE}/api/projects/${encodeURIComponent(String(id))}`, { headers: getAuthHeaders() });
        const d = await r.json().catch(() => null);
        if (!r.ok) {
          const msg = String((d as any)?.error || (d as any)?.message || "Failed to load project");
          setProject(null);
          setProjectError(msg);
          return;
        }
        setProject({
          id: String((d as any)?._id || id),
          title: (d as any)?.title || "-",
          clientId: (d as any)?.clientId ? String((d as any).clientId) : undefined,
          client: (d as any)?.client || "-",
          price: (d as any)?.price,
          start: (d as any)?.start ? new Date((d as any).start).toISOString() : undefined,
          deadline: (d as any)?.deadline ? new Date((d as any).deadline).toISOString() : undefined,
          status: (d as any)?.status || "Open",
          description: (d as any)?.description || "",
          members: Array.isArray((d as any)?.members) ? (d as any).members.map((x: any) => String(x)).filter(Boolean) : [],
          clientRequirements: (d as any)?.clientRequirements || "",
          deliveryDocument: (d as any)?.deliveryDocument || "",
          labels: typeof (d as any)?.labels === "string" ? (d as any).labels : Array.isArray((d as any)?.labels) ? (d as any).labels.join(", ") : "",
        });

        setClientRequirementsDraft(String((d as any)?.clientRequirements || ""));
        setDeliveryDocumentDraft(String((d as any)?.deliveryDocument || ""));
      } catch (e: any) {
        setProject(null);
        setProjectError(String(e?.message || "Failed to load project"));
      } finally {
        setProjectLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    try {
      const ls = JSON.parse(localStorage.getItem("project_labels") || "[]");
      if (Array.isArray(ls)) setLabelOptions(ls.filter((x: any) => typeof x === "string" && x.trim()).map((x: string) => x.trim()));
    } catch {}
  }, []);

  useEffect(() => {
    if (!openManageLabels) return;
    setLabelDraft(labelOptions);
    setNewLabel("");
  }, [openManageLabels, labelOptions]);

  useEffect(() => {
    setDeadlineAlerted(false);
  }, [id, project?.deadline]);

  useEffect(() => {
    if (!project?.deadline) {
      setEditDeadline("");
      return;
    }
    const dt = new Date(project.deadline);
    if (Number.isNaN(dt.getTime())) {
      setEditDeadline("");
      return;
    }
    const pad = (n: number) => String(n).padStart(2, "0");
    const local = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    setEditDeadline(local);
  }, [project?.deadline]);

  useEffect(() => {
    if (editDescOpen) setDescDraft(project?.description || "");
  }, [editDescOpen, project?.description]);

  useEffect(() => {
    if (membersOpen) {
      setMembersDraft(Array.isArray(project?.members) ? project!.members! : []);
      setNewMember("");
    }
  }, [membersOpen, project?.members]);

  useEffect(() => {
    const t = window.setInterval(() => setCountdownNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    miscLoadedRef.current = false;
    financeLoadedRef.current = false;
    contractsLoadedRef.current = false;
    setContracts([]);
    setNotes([]);
    setComments([]);
    setFiles([]);
    setInvoices([]);
    setPayments([]);
    setExpenses([]);
    setTimesheets([]);
    setMilestones([]);
    setFeedback([]);
  }, [id]);

  // Load contracts and related items (best-effort; ignore errors)
  useEffect(() => {
    if (!id) return;
    if (activeTab !== "contracts") return;
    if (contractsLoadedRef.current) return;
    contractsLoadedRef.current = true;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/contracts?projectId=${id}`, { headers: getAuthHeaders() });
        if (r.ok) {
          const data = await r.json();
          setContracts((Array.isArray(data) ? data : []).map((c:any)=> ({
            id: String(c._id || ""),
            title: c.title || "-",
            amount: c.amount != null ? String(c.amount) : "-",
            contractDate: c.contractDate ? new Date(c.contractDate).toISOString().slice(0,10) : "-",
            validUntil: c.validUntil ? new Date(c.validUntil).toISOString().slice(0,10) : "-",
            status: c.status || "Open",
            type: c.type || c.kind || undefined,
            owner: c.owner || c.ownerName || undefined,
            signed: c.signed != null ? Boolean(c.signed) : undefined,
            notes: c.notes || undefined,
          })));
        }
      } catch {}
    })();
  }, [id, activeTab]);

  useEffect(() => {
    if (!id) return;
    const miscTabs = new Set(["notes", "comments", "files", "timesheets", "milestones", "customer-feedback"]);
    const financeTabs = new Set(["invoices", "payments", "expenses"]);
    const shouldLoadMisc = miscTabs.has(activeTab);
    const shouldLoadFinance = canViewProjectFinancials && financeTabs.has(activeTab);
    if (!shouldLoadMisc && !shouldLoadFinance) return;

    if (shouldLoadMisc && miscLoadedRef.current && (!shouldLoadFinance || financeLoadedRef.current)) return;

    (async () => {
      // best-effort fetches; fallbacks are empty arrays
      const safeFetch = async (path: string) => {
        try {
          const r = await fetch(path, { headers: getAuthHeaders() });
          if (!r.ok) return [];
          return await r.json();
        } catch {
          return [];
        }
      };

      if (shouldLoadMisc && !miscLoadedRef.current) {
        miscLoadedRef.current = true;
        const [notesRes, commentsRes, filesRes, timesheetsRes, milestonesRes, feedbackRes] = await Promise.all([
          safeFetch(`${API_BASE}/api/notes?projectId=${id}`),
          safeFetch(`${API_BASE}/api/comments?projectId=${id}`),
          safeFetch(`${API_BASE}/api/files?projectId=${id}`),
          safeFetch(`${API_BASE}/api/timesheets?projectId=${id}`),
          safeFetch(`${API_BASE}/api/milestones?projectId=${id}`),
          safeFetch(`${API_BASE}/api/feedback?projectId=${id}`),
        ]);

        setNotes((Array.isArray(notesRes) ? notesRes : []).map((n:any)=> ({
          id: String(n._id || crypto.randomUUID()),
          text: String(n.text || n.note || "-"),
          at: n.at ? new Date(n.at).toISOString().slice(0,10) : undefined,
          title: n.title || undefined,
          category: n.category || undefined,
          tags: n.tags || undefined,
          pinned: Boolean(n.pinned || false),
        })));
        setComments((Array.isArray(commentsRes) ? commentsRes : []).map((n:any)=> ({
          id: String(n._id || crypto.randomUUID()),
          text: String(n.text || n.comment || "-"),
          at: n.at ? new Date(n.at).toISOString().slice(0,10) : undefined,
          author: n.author || n.user || undefined,
          kind: n.kind || n.type || undefined,
        })));
        setFiles((Array.isArray(filesRes) ? filesRes : []).map((f:any)=> ({
          id: String(f._id || crypto.randomUUID()),
          name: f.name || f.filename || "file",
          size: f.size,
          type: f.type || f.kind || undefined,
          url: f.url || f.link || (f.path ? `${API_BASE}${String(f.path)}` : undefined),
          uploadedBy: f.uploadedBy || f.user || undefined,
          at: (f.at || f.createdAt) ? new Date(f.at || f.createdAt).toISOString().slice(0,10) : undefined,
          description: f.description || undefined,
        })));
        setTimesheets((Array.isArray(timesheetsRes) ? timesheetsRes : []).map((t:any)=> ({
          id: String(t._id || ""),
          user: t.user || t.member || "-",
          date: t.date ? new Date(t.date).toISOString().slice(0,10) : "-",
          hours: Number(t.hours ?? 0),
          task: t.task || "-",
          billable: t.billable != null ? Boolean(t.billable) : undefined,
          rate: t.rate != null ? Number(t.rate) : undefined,
          notes: t.notes || undefined,
        })));
        setMilestones((Array.isArray(milestonesRes) ? milestonesRes : []).map((m:any)=> ({ id: String(m._id || ""), title: m.title || "-", due: m.due ? new Date(m.due).toISOString().slice(0,10) : "-", status: m.status || "Open" })));
        setFeedback((Array.isArray(feedbackRes) ? feedbackRes : []).map((f:any)=> ({
          id: String(f._id || ""),
          author: f.author || f.name || "-",
          text: f.text || f.feedback || "-",
          at: f.at ? new Date(f.at).toISOString().slice(0,10) : undefined,
          rating: f.rating != null ? Number(f.rating) : undefined,
          category: f.category || undefined,
          status: f.status || undefined,
          followUpRequired: f.followUpRequired != null ? Boolean(f.followUpRequired) : undefined,
          sentiment: f.sentiment || undefined,
        })));
      }

      if (shouldLoadFinance && !financeLoadedRef.current) {
        financeLoadedRef.current = true;
        const [invoicesRes, paymentsRes, expensesRes] = await Promise.all([
          safeFetch(`${API_BASE}/api/invoices?projectId=${id}`),
          safeFetch(`${API_BASE}/api/payments?projectId=${id}`),
          safeFetch(`${API_BASE}/api/expenses?projectId=${id}`),
        ]);

        setInvoices((Array.isArray(invoicesRes) ? invoicesRes : []).map((i:any)=> ({
          id: String(i._id || ""),
          number: i.number || i.code,
          total: i.total ?? i.amount,
          status: i.status,
          date: i.date ? new Date(i.date).toISOString().slice(0,10) : undefined,
          dueDate: i.dueDate ? new Date(i.dueDate).toISOString().slice(0,10) : undefined,
          currency: i.currency || undefined,
          tax: i.tax != null ? Number(i.tax) : undefined,
          discount: i.discount != null ? Number(i.discount) : undefined,
          notes: i.notes || undefined,
        })));
        setPayments((Array.isArray(paymentsRes) ? paymentsRes : []).map((p:any)=> ({
          id: String(p._id || ""),
          amount: p.amount ?? p.total,
          fee: p.fee != null ? Number(p.fee) : undefined,
          date: p.date ? new Date(p.date).toISOString().slice(0,10) : undefined,
          method: p.method,
          status: p.status || undefined,
          payer: p.payer || undefined,
          reference: p.reference || p.ref || undefined,
          transactionId: p.transactionId || p.txnId || undefined,
          bankName: p.bankName || p.bank || undefined,
          account: p.account || p.accountNumber || undefined,
          receiptUrl: p.receiptUrl || p.receipt || undefined,
          currency: p.currency || undefined,
          receivedBy: p.receivedBy || undefined,
          notes: p.notes || p.note || undefined,
        })));
        setExpenses((Array.isArray(expensesRes) ? expensesRes : []).map((e:any)=> ({
          id: String(e._id || ""),
          title: e.title || e.category || "-",
          amount: e.amount ?? e.total,
          date: e.date ? new Date(e.date).toISOString().slice(0,10) : undefined,
          category: e.category,
          vendor: e.vendor || undefined,
          receiptUrl: e.receiptUrl || e.receipt || undefined,
          reimbursable: Boolean(e.reimbursable || false),
          notes: e.notes || undefined,
        })));
      }
    })();
  }, [id, activeTab, canViewProjectFinancials]);

  const addNote = async () => {
    const text = newNote.trim();
    if (!text || !id) return;
    try {
      const payload = { projectId: id, text, title: newNoteTitle || undefined, category: newNoteCategory || undefined, tags: newNoteTags || undefined, pinned: newNotePinned };
      const r = await fetch(`${API_BASE}/api/notes`, { method: "POST", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
      if (r.ok) {
        const d = await r.json();
        setNotes((prev) => [{ id: String(d._id || crypto.randomUUID()), text, at: new Date().toISOString().slice(0,10), title: newNoteTitle || undefined, category: newNoteCategory || undefined, tags: newNoteTags || undefined, pinned: newNotePinned }, ...prev]);
        setNewNote("");
        setNewNoteTitle("");
        setNewNoteCategory("General");
        setNewNoteTags("");
        setNewNotePinned(false);
        toast.success("Note added");
        return;
      }
    } catch {}
    // fallback local update
    setNotes((prev) => [{ id: crypto.randomUUID(), text, at: new Date().toISOString().slice(0,10), title: newNoteTitle || undefined, category: newNoteCategory || undefined, tags: newNoteTags || undefined, pinned: newNotePinned }, ...prev]);
    setNewNote("");
    setNewNoteTitle("");
    setNewNoteCategory("General");
    setNewNoteTags("");
    setNewNotePinned(false);
  };

  const addComment = async () => {
    const text = newComment.trim();
    if (!text || !id) return;
    try {
      const payload = { projectId: id, text, author: newCommentAuthor || undefined, kind: newCommentKind || undefined };
      const r = await fetch(`${API_BASE}/api/comments`, { method: "POST", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
      if (r.ok) {
        const d = await r.json();
        setComments((prev) => [{ id: String(d._id || crypto.randomUUID()), text, at: new Date().toISOString().slice(0,10), author: newCommentAuthor || undefined, kind: newCommentKind || undefined }, ...prev]);
        setNewComment("");
        setNewCommentAuthor("");
        setNewCommentKind("General");
        toast.success("Comment added");
        return;
      }
    } catch {}
    setComments((prev) => [{ id: crypto.randomUUID(), text, at: new Date().toISOString().slice(0,10), author: newCommentAuthor || undefined, kind: newCommentKind || undefined }, ...prev]);
    setNewComment("");
    setNewCommentAuthor("");
    setNewCommentKind("General");
  };

  const addTask = async () => {
    if (!id || !newTaskTitle) return;
    const title = newTaskTitle.trim();
    if (!title) return;

    const collaboratorsArr = String(newTaskCollaborators || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      projectId: id,
      title,
      description: newTaskDescription || undefined,
      points: newTaskPoints !== "" ? Number(newTaskPoints) : undefined,
      milestoneId: newTaskMilestoneId !== "__none__" ? newTaskMilestoneId : undefined,
      assignees: newTaskAssignee
        ? [{ name: newTaskAssignee, initials: getInitials(newTaskAssignee) }]
        : [],
      collaborators: collaboratorsArr,
      tags: String(newTaskLabels || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      status: newTaskStatus,
      priority: newTaskPriority,
      start: newTaskStart || undefined,
      deadline: newTaskDeadline || undefined,
    };
    try {
      const r = await fetch(`${API_BASE}/api/tasks`, { method: "POST", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
      if (r.ok) {
        const d = await r.json();
        const taskId = String(d._id || "");
        
        // Upload files if any
        if (taskId && newTaskFiles.length > 0) {
          for (const file of newTaskFiles) {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("taskId", taskId);
            fd.append("name", file.name);
            fd.append("type", file.type || "application/octet-stream");
            fd.append("size", String(file.size));
            try {
              await fetch(`${API_BASE}/api/files`, { method: "POST", headers: getAuthHeaders(), body: fd });
            } catch {
              // Silent fail for individual file upload
            }
          }
        }
        
        setTasks(prev => [{ id: taskId || crypto.randomUUID(), title, status: newTaskStatus, start: newTaskStart || "-", deadline: newTaskDeadline || "-", priority: newTaskPriority, labels: newTaskLabels || undefined, assignedTo: newTaskAssignee || "", collaborators: collaboratorsArr, attachments: newTaskFiles.length }, ...prev]);
        toast.success("Task added");
        setNewTaskFiles([]);
      } else {
        setTasks(prev => [{ id: crypto.randomUUID(), title, status: newTaskStatus, start: newTaskStart || "-", deadline: newTaskDeadline || "-", priority: newTaskPriority, labels: newTaskLabels || undefined, assignedTo: newTaskAssignee || "", collaborators: collaboratorsArr, attachments: 0 }, ...prev]);
      }
    } catch {
      setTasks(prev => [{ id: crypto.randomUUID(), title, status: newTaskStatus, start: newTaskStart || "-", deadline: newTaskDeadline || "-", priority: newTaskPriority, labels: newTaskLabels || undefined, assignedTo: newTaskAssignee || "", collaborators: collaboratorsArr, attachments: 0 }, ...prev]);
    }
    setNewTaskTitle("");
    setNewTaskStart("");
    setNewTaskDeadline("");
    setNewTaskPriority("medium");
    setNewTaskStatus("todo");
    setNewTaskDescription("");
    setNewTaskPoints(1);
    setNewTaskMilestoneId("__none__");
    setNewTaskAssignee("");
    setNewTaskCollaborators("");
    setNewTaskCollaboratorPick("__none__");
    setNewTaskLabels("");
    setShowAddTask(false);
  };

  // Tasks toolbar helpers (component scope)
  const addMultipleTasks = async () => {
    if (!id) return;
    const lines = bulkTasksText.split(/\r?\n/).map((l)=>l.trim()).filter(Boolean);
    for (const line of lines) {
      const parts = line.split("|").map((p)=>p.trim());
      const title = parts[0] || "Untitled";
      const status = (parts[1] || "todo") as string;
      const priority = (parts[2] || "medium") as string;
      const start = parts[3] || undefined;
      const deadline = parts[4] || undefined;
      const payload:any = { projectId: id, title, status, priority, start, deadline };
      try {
        const r = await fetch(`${API_BASE}/api/tasks`, { method: "POST", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
        if (r.ok) {
          const d = await r.json();
          setTasks(prev => [{ id: String(d._id || crypto.randomUUID()), title, status, start: start || "-", deadline: deadline || "-", priority, attachments: 0 }, ...prev]);
        } else {
          setTasks(prev => [{ id: crypto.randomUUID(), title, status, start: start || "-", deadline: deadline || "-", priority, attachments: 0 }, ...prev]);
        }
      } catch {
        setTasks(prev => [{ id: crypto.randomUUID(), title, status, start: start || "-", deadline: deadline || "-", priority, attachments: 0 }, ...prev]);
      }
    }
    toast.success(`Added ${lines.length} task${lines.length!==1 ? 's' : ''}`);
    setBulkTasksText("");
    setShowAddMultipleTasks(false);
  };

  const reloadTasks = async () => {
    if (!id) return;
    try {
      const r = await fetch(`${API_BASE}/api/tasks?projectId=${id}`, { headers: getAuthHeaders() });
      if (r.ok) {
        const data = await r.json();
        const t = (Array.isArray(data) ? data : []).map((t:any)=> ({
          id: String(t._id || ""),
          title: t.title || "-",
          status: t.status || "todo",
          start: t.start ? new Date(t.start).toISOString().slice(0,10) : "-",
          deadline: t.deadline ? new Date(t.deadline).toISOString().slice(0,10) : "-",
          priority: t.priority || "medium",
          labels: Array.isArray(t.tags) ? t.tags.join(", ") : typeof t.labels === "string" ? t.labels : Array.isArray(t.labels) ? t.labels.join(", ") : undefined,
          assignedTo: (Array.isArray(t.assignees) ? t.assignees : [])[0]?.name || "",
          collaborators: Array.isArray(t.collaborators) ? t.collaborators : [],
          attachments: t.attachments || 0,
        }));
        setTasks(t);
        toast.success("Tasks reloaded");
      }
    } catch {}
  };

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/employees`, { headers: getAuthHeaders() });
        const data = await r.json().catch(() => []);
        if (r.ok) setEmployees(Array.isArray(data) ? data : []);
      } catch {}
    })();
  }, []);

  const exportTasksCSV = () => {
    const rows = [
      ["Title","Status","Priority","Start","Deadline","Labels"],
      ...filteredTasks.map(t=>[t.title,t.status,t.priority,t.start,t.deadline,String(t.labels||"")])
    ];
    const csv = rows.map(r=>r.map((c)=>`"${String(c||"").replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `tasks_${id}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const printTasksTable = () => {
    window.print();
  };

  const saveDescription = async () => {
    if (!id) return;
    try {
      const r = await fetch(`${API_BASE}/api/projects/${id}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ description: descDraft || "" }),
      });
      if (r.ok) toast.success("Description updated");
    } catch {}
    setProject((prev) => (prev ? { ...prev, description: descDraft || "" } : prev));
    setEditDescOpen(false);
  };

  const saveMembers = async () => {
    if (!id) return;
    const list = membersDraft.map((x) => String(x).trim()).filter(Boolean);
    try {
      const r = await fetch(`${API_BASE}/api/projects/${id}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ members: list }),
      });
      if (r.ok) toast.success("Members updated");
    } catch {}
    setProject((prev) => (prev ? { ...prev, members: list } : prev));
    setMembersOpen(false);
  };

  const addMilestone = async () => {
    const title = newMilestoneTitle.trim();
    if (!id || !title) return;
    const payload = { projectId: id, title, due: newMilestoneDue || undefined, status: newMilestoneStatus };
    try {
      const r = await fetch(`${API_BASE}/api/milestones`, { method: "POST", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
      if (r.ok) {
        const d = await r.json();
        setMilestones(prev => [{ id: String(d._id || crypto.randomUUID()), title, due: newMilestoneDue || "-", status: newMilestoneStatus }, ...prev]);
        toast.success("Milestone added");
      } else {
        setMilestones(prev => [{ id: crypto.randomUUID(), title, due: newMilestoneDue || "-", status: newMilestoneStatus }, ...prev]);
      }
    } catch {
      setMilestones(prev => [{ id: crypto.randomUUID(), title, due: newMilestoneDue || "-", status: newMilestoneStatus }, ...prev]);
    }
    setNewMilestoneTitle("");
    setNewMilestoneDue("");
    setNewMilestoneStatus("Open");
    setShowAddMilestone(false);
  };

  const addFile = async () => {
    const name = newFileName.trim();
    if (!id || !name) return;
    const size = Number(newFileSize) || undefined;

    try {
      if (newFileBlob) {
        const fd = new FormData();
        fd.append("file", newFileBlob);
        fd.append("projectId", id);
        fd.append("name", name);
        if (newFileType) fd.append("type", newFileType);
        if (newFileUrl) fd.append("url", newFileUrl);
        if (newFileUploadedBy) fd.append("uploadedBy", newFileUploadedBy);
        if (newFileDescription) fd.append("description", newFileDescription);

        const r = await fetch(`${API_BASE}/api/files`, { method: "POST", headers: getAuthHeaders(), body: fd });
        if (r.ok) {
          const d = await r.json();
          const fileUrl = d?.url || (d?.path ? `${API_BASE}${String(d.path)}` : (newFileUrl || undefined));
          setFiles((prev) => [{
            id: String(d._id || crypto.randomUUID()),
            name,
            size: Number(d?.size) || size,
            type: d?.type || newFileType || undefined,
            url: fileUrl,
            uploadedBy: d?.uploadedBy || newFileUploadedBy || undefined,
            description: d?.description || newFileDescription || undefined,
            at: new Date(d?.createdAt || Date.now()).toISOString().slice(0, 10),
          }, ...prev]);
          toast.success("File uploaded");
        } else {
          setFiles((prev) => [{ id: crypto.randomUUID(), name, size, type: newFileType || undefined, url: newFileUrl || undefined, uploadedBy: newFileUploadedBy || undefined, description: newFileDescription || undefined, at: new Date().toISOString().slice(0,10) }, ...prev]);
          toast.success("File saved locally");
        }
      } else {
        const payload = { projectId: id, name, size, type: newFileType || undefined, url: newFileUrl || undefined, uploadedBy: newFileUploadedBy || undefined, description: newFileDescription || undefined };
        const r = await fetch(`${API_BASE}/api/files`, { method: "POST", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
        if (r.ok) {
          const d = await r.json();
          setFiles((prev) => [{ id: String(d._id || crypto.randomUUID()), name, size, type: newFileType || undefined, url: newFileUrl || undefined, uploadedBy: newFileUploadedBy || undefined, description: newFileDescription || undefined, at: new Date().toISOString().slice(0,10) }, ...prev]);
          toast.success("File added");
        } else {
          setFiles((prev) => [{ id: crypto.randomUUID(), name, size, type: newFileType || undefined, url: newFileUrl || undefined, uploadedBy: newFileUploadedBy || undefined, description: newFileDescription || undefined, at: new Date().toISOString().slice(0,10) }, ...prev]);
        }
      }
    } catch {
      setFiles((prev) => [{ id: crypto.randomUUID(), name, size, type: newFileType || undefined, url: newFileUrl || undefined, uploadedBy: newFileUploadedBy || undefined, description: newFileDescription || undefined, at: new Date().toISOString().slice(0,10) }, ...prev]);
    }
    setNewFileName("");
    setNewFileSize("");
    setNewFileType("Document");
    setNewFileUrl("");
    setNewFileUploadedBy("");
    setNewFileDescription("");
    setNewFileBlob(null);
    setShowAddFile(false);
  };

  const addFeedback = async () => {
    const text = newFeedbackText.trim();
    if (!id || !text) return;
    const author = newFeedbackAuthor.trim() || "Client";
    const rating = Number(newFeedbackRating) || 0;
    const payload = { projectId: id, author, text, rating: rating || undefined, category: newFeedbackCategory || undefined, status: newFeedbackStatus || undefined, followUpRequired: newFeedbackFollowUp, sentiment: newFeedbackSentiment || undefined };
    try {
      const r = await fetch(`${API_BASE}/api/feedback`, { method: "POST", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
      if (r.ok) {
        const d = await r.json();
        setFeedback(prev => [{ id: String(d._id || crypto.randomUUID()), author, text, at: new Date().toISOString().slice(0,10), rating: rating || undefined, category: newFeedbackCategory || undefined, status: newFeedbackStatus || undefined, followUpRequired: newFeedbackFollowUp, sentiment: newFeedbackSentiment || undefined }, ...prev]);
        toast.success("Feedback added");
      } else {
        setFeedback(prev => [{ id: crypto.randomUUID(), author, text, at: new Date().toISOString().slice(0,10), rating: rating || undefined, category: newFeedbackCategory || undefined, status: newFeedbackStatus || undefined, followUpRequired: newFeedbackFollowUp, sentiment: newFeedbackSentiment || undefined }, ...prev]);
      }
    } catch {
      setFeedback(prev => [{ id: crypto.randomUUID(), author, text, at: new Date().toISOString().slice(0,10), rating: rating || undefined, category: newFeedbackCategory || undefined, status: newFeedbackStatus || undefined, followUpRequired: newFeedbackFollowUp, sentiment: newFeedbackSentiment || undefined }, ...prev]);
    }
    setNewFeedbackAuthor("");
    setNewFeedbackText("");
    setNewFeedbackRating(5);
    setNewFeedbackCategory("General");
    setNewFeedbackStatus("New");
    setNewFeedbackFollowUp(false);
    setNewFeedbackSentiment("Positive");
    setShowAddFeedback(false);
  };

  const addTimesheet = async () => {
    if (!id || !newTimesheetDate || !newTimesheetUser || !newTimesheetHours) return;
    const hours = Number(newTimesheetHours) || 0;
    const rate = newTimesheetRate !== "" ? Number(newTimesheetRate) || 0 : undefined;
    const payload = { projectId: id, date: newTimesheetDate, user: newTimesheetUser, task: newTimesheetTask || undefined, hours, billable: newTimesheetBillable, rate, notes: newTimesheetNotes || undefined };
    try {
      const r = await fetch(`${API_BASE}/api/timesheets`, { method: "POST", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
      if (r.ok) {
        const d = await r.json();
        setTimesheets(prev => [{ id: String(d._id || crypto.randomUUID()), date: newTimesheetDate, user: newTimesheetUser, task: newTimesheetTask || "-", hours, billable: newTimesheetBillable, rate, notes: newTimesheetNotes || undefined }, ...prev]);
        toast.success("Timesheet added");
      } else {
        setTimesheets(prev => [{ id: crypto.randomUUID(), date: newTimesheetDate, user: newTimesheetUser, task: newTimesheetTask || "-", hours, billable: newTimesheetBillable, rate, notes: newTimesheetNotes || undefined }, ...prev]);
      }
    } catch {
      setTimesheets(prev => [{ id: crypto.randomUUID(), date: newTimesheetDate, user: newTimesheetUser, task: newTimesheetTask || "-", hours, billable: newTimesheetBillable, rate, notes: newTimesheetNotes || undefined }, ...prev]);
    }
    setNewTimesheetDate("");
    setNewTimesheetUser("");
    setNewTimesheetTask("");
    setNewTimesheetHours("");
    setNewTimesheetBillable(true);
    setNewTimesheetRate("");
    setNewTimesheetNotes("");
    setShowAddTimesheet(false);
  };

  const addInvoice = async () => {
    if (!canViewProjectFinancials) {
      toast.error("Access denied");
      return;
    }
    if (!id || !newInvoiceNumber) return;
    const total = Number(newInvoiceTotal) || 0;
    const tax = newInvoiceTax !== "" ? Number(newInvoiceTax) || 0 : undefined;
    const discount = newInvoiceDiscount !== "" ? Number(newInvoiceDiscount) || 0 : undefined;
    const payload = { projectId: id, number: newInvoiceNumber, date: newInvoiceDate || undefined, dueDate: newInvoiceDueDate || undefined, status: newInvoiceStatus, total, currency: newInvoiceCurrency || undefined, tax, discount, notes: newInvoiceNotes || undefined };
    try {
      const r = await fetch(`${API_BASE}/api/invoices`, { method: "POST", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
      if (r.ok) {
        const d = await r.json();
        setInvoices(prev => [{ id: String(d._id || crypto.randomUUID()), number: newInvoiceNumber, date: newInvoiceDate || "-", dueDate: newInvoiceDueDate || undefined, status: newInvoiceStatus, total, currency: newInvoiceCurrency || undefined, tax, discount, notes: newInvoiceNotes || undefined }, ...prev]);
        toast.success("Invoice added");
      } else {
        setInvoices(prev => [{ id: crypto.randomUUID(), number: newInvoiceNumber, date: newInvoiceDate || "-", dueDate: newInvoiceDueDate || undefined, status: newInvoiceStatus, total, currency: newInvoiceCurrency || undefined, tax, discount, notes: newInvoiceNotes || undefined }, ...prev]);
      }
    } catch {
      setInvoices(prev => [{ id: crypto.randomUUID(), number: newInvoiceNumber, date: newInvoiceDate || "-", dueDate: newInvoiceDueDate || undefined, status: newInvoiceStatus, total, currency: newInvoiceCurrency || undefined, tax, discount, notes: newInvoiceNotes || undefined }, ...prev]);
    }
    setNewInvoiceNumber("");
    setNewInvoiceDate("");
    setNewInvoiceDueDate("");
    setNewInvoiceStatus("Draft");
    setNewInvoiceTotal("");
    setNewInvoiceCurrency("PKR");
    setNewInvoiceTax("");
    setNewInvoiceDiscount("");
    setNewInvoiceNotes("");
    setShowAddInvoice(false);
  };

  const addPayment = async () => {
    if (!canViewProjectFinancials) {
      toast.error("Access denied");
      return;
    }
    if (!id || !newPaymentDate || !newPaymentAmount) return;
    const amount = Number(newPaymentAmount) || 0;
    const fee = newPaymentFee !== "" ? Number(newPaymentFee) || 0 : undefined;
    const payload = {
      projectId: id,
      date: newPaymentDate,
      method: newPaymentMethod,
      amount,
      fee,
      currency: newPaymentCurrency || undefined,
      status: newPaymentStatus || undefined,
      payer: newPaymentPayer || undefined,
      receivedBy: newPaymentReceivedBy || undefined,
      reference: newPaymentReference || undefined,
      transactionId: newPaymentTransactionId || undefined,
      bankName: newPaymentBankName || undefined,
      account: newPaymentAccount || undefined,
      receiptUrl: newPaymentReceiptUrl || undefined,
      notes: newPaymentNotes || undefined,
    };
    try {
      const r = await fetch(`${API_BASE}/api/payments`, { method: "POST", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
      if (r.ok) {
        const d = await r.json();
        setPayments(prev => [{
          id: String(d._id || crypto.randomUUID()),
          date: newPaymentDate,
          method: newPaymentMethod,
          amount,
          fee,
          currency: newPaymentCurrency || undefined,
          status: newPaymentStatus || undefined,
          payer: newPaymentPayer || undefined,
          receivedBy: newPaymentReceivedBy || undefined,
          reference: newPaymentReference || undefined,
          transactionId: newPaymentTransactionId || undefined,
          bankName: newPaymentBankName || undefined,
          account: newPaymentAccount || undefined,
          receiptUrl: newPaymentReceiptUrl || undefined,
          notes: newPaymentNotes || undefined,
        }, ...prev]);
        toast.success("Payment added");
      } else {
        setPayments(prev => [{
          id: crypto.randomUUID(),
          date: newPaymentDate,
          method: newPaymentMethod,
          amount,
          fee,
          currency: newPaymentCurrency || undefined,
          status: newPaymentStatus || undefined,
          payer: newPaymentPayer || undefined,
          receivedBy: newPaymentReceivedBy || undefined,
          reference: newPaymentReference || undefined,
          transactionId: newPaymentTransactionId || undefined,
          bankName: newPaymentBankName || undefined,
          account: newPaymentAccount || undefined,
          receiptUrl: newPaymentReceiptUrl || undefined,
          notes: newPaymentNotes || undefined,
        }, ...prev]);
      }
    } catch {
      setPayments(prev => [{
        id: crypto.randomUUID(),
        date: newPaymentDate,
        method: newPaymentMethod,
        amount,
        fee,
        currency: newPaymentCurrency || undefined,
        status: newPaymentStatus || undefined,
        payer: newPaymentPayer || undefined,
        receivedBy: newPaymentReceivedBy || undefined,
        reference: newPaymentReference || undefined,
        transactionId: newPaymentTransactionId || undefined,
        bankName: newPaymentBankName || undefined,
        account: newPaymentAccount || undefined,
        receiptUrl: newPaymentReceiptUrl || undefined,
        notes: newPaymentNotes || undefined,
      }, ...prev]);
    }
    setNewPaymentAmount("");
    setNewPaymentFee("");
    setNewPaymentDate("");
    setNewPaymentMethod("Cash");
    setNewPaymentReference("");
    setNewPaymentCurrency("PKR");
    setNewPaymentStatus("Received");
    setNewPaymentPayer("");
    setNewPaymentReceivedBy("");
    setNewPaymentTransactionId("");
    setNewPaymentBankName("");
    setNewPaymentAccount("");
    setNewPaymentReceiptUrl("");
    setNewPaymentNotes("");
    setShowAddPayment(false);
  };

  const addExpense = async () => {
    if (!canViewProjectFinancials) {
      toast.error("Access denied");
      return;
    }
    if (!id || !newExpenseTitle || !newExpenseAmount) return;
    const amount = Number(newExpenseAmount) || 0;
    const payload = { projectId: id, title: newExpenseTitle, date: newExpenseDate || undefined, category: newExpenseCategory, amount, vendor: newExpenseVendor || undefined, receiptUrl: newExpenseReceiptUrl || undefined, reimbursable: newExpenseReimbursable, notes: newExpenseNotes || undefined };
    try {
      const r = await fetch(`${API_BASE}/api/expenses`, { method: "POST", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
      if (r.ok) {
        const d = await r.json();
        setExpenses(prev => [{ id: String(d._id || crypto.randomUUID()), title: newExpenseTitle, date: newExpenseDate || "-", category: newExpenseCategory, amount, vendor: newExpenseVendor || undefined, receiptUrl: newExpenseReceiptUrl || undefined, reimbursable: newExpenseReimbursable, notes: newExpenseNotes || undefined }, ...prev]);
        toast.success("Expense added");
      } else {
        setExpenses(prev => [{ id: crypto.randomUUID(), title: newExpenseTitle, date: newExpenseDate || "-", category: newExpenseCategory, amount, vendor: newExpenseVendor || undefined, receiptUrl: newExpenseReceiptUrl || undefined, reimbursable: newExpenseReimbursable, notes: newExpenseNotes || undefined }, ...prev]);
      }
    } catch {
      setExpenses(prev => [{ id: crypto.randomUUID(), title: newExpenseTitle, date: newExpenseDate || "-", category: newExpenseCategory, amount, vendor: newExpenseVendor || undefined, receiptUrl: newExpenseReceiptUrl || undefined, reimbursable: newExpenseReimbursable, notes: newExpenseNotes || undefined }, ...prev]);
    }
    setNewExpenseTitle("");
    setNewExpenseDate("");
    setNewExpenseCategory("General");
    setNewExpenseAmount("");
    setNewExpenseVendor("");
    setNewExpenseReceiptUrl("");
    setNewExpenseReimbursable(false);
    setNewExpenseNotes("");
    setShowAddExpense(false);
  };

  const addContract = async () => {
    if (!id || !newContractTitle) return;
    const amount = Number(newContractAmount) || 0;
    const payload = { projectId: id, title: newContractTitle, amount, contractDate: newContractDate || undefined, validUntil: newContractValidUntil || undefined, status: newContractStatus, type: newContractType || undefined, owner: newContractOwner || undefined, signed: newContractSigned, notes: newContractNotes || undefined };
    try {
      const r = await fetch(`${API_BASE}/api/contracts`, { method: "POST", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
      if (r.ok) {
        const d = await r.json();
        setContracts(prev => [{ id: String(d._id || crypto.randomUUID()), title: newContractTitle, amount: String(amount), contractDate: newContractDate || "-", validUntil: newContractValidUntil || "-", status: newContractStatus, type: newContractType || undefined, owner: newContractOwner || undefined, signed: newContractSigned, notes: newContractNotes || undefined }, ...prev] as any);
        toast.success("Contract added");
      } else {
        setContracts(prev => [{ id: crypto.randomUUID(), title: newContractTitle, amount: String(amount), contractDate: newContractDate || "-", validUntil: newContractValidUntil || "-", status: newContractStatus, type: newContractType || undefined, owner: newContractOwner || undefined, signed: newContractSigned, notes: newContractNotes || undefined }, ...prev] as any);
      }
    } catch {
      setContracts(prev => [{ id: crypto.randomUUID(), title: newContractTitle, amount: String(amount), contractDate: newContractDate || "-", validUntil: newContractValidUntil || "-", status: newContractStatus, type: newContractType || undefined, owner: newContractOwner || undefined, signed: newContractSigned, notes: newContractNotes || undefined }, ...prev] as any);
    }
    setNewContractTitle("");
    setNewContractAmount("");
    setNewContractDate("");
    setNewContractValidUntil("");
    setNewContractStatus("draft");
    setNewContractType("Service");
    setNewContractOwner("");
    setNewContractSigned(false);
    setNewContractNotes("");
    setShowAddContract(false);
  };

  const kindEndpoint = (k: ItemKind) => {
    if (k === "task") return "tasks";
    if (k === "milestone") return "milestones";
    if (k === "note") return "notes";
    if (k === "comment") return "comments";
    if (k === "file") return "files";
    if (k === "feedback") return "feedback";
    if (k === "timesheet") return "timesheets";
    if (k === "invoice") return "invoices";
    if (k === "payment") return "payments";
    if (k === "expense") return "expenses";
    return "contracts";
  };

  // Permission helper functions for task access control
  const getCurrentUserData = () => {
    try {
      const raw = localStorage.getItem("auth_user") || sessionStorage.getItem("auth_user");
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const isTaskCreator = (task: TaskRow | null): boolean => {
    if (!task) return false;
    const user = getCurrentUserData();
    if (!user) return false;
    const byUserId = task.createdByUserId && String(task.createdByUserId) === String(user._id || user.id);
    const byEmail = task.createdByEmail && String(task.createdByEmail).toLowerCase() === String(user.email || "").toLowerCase();
    return byUserId || byEmail || false;
  };

  const isTaskAssignee = (task: TaskRow | null): boolean => {
    if (!task) return false;
    const user = getCurrentUserData();
    if (!user) return false;
    return task.assignedTo?.toLowerCase() === String(user.name || "").toLowerCase() ||
           task.assignedTo?.toLowerCase() === String(user.email || "").toLowerCase() || false;
  };

  const isTaskCollaborator = (task: TaskRow | null): boolean => {
    if (!task) return false;
    const user = getCurrentUserData();
    if (!user) return false;
    return task.collaborators?.some((c) => 
      String(c).toLowerCase() === String(user.name || "").toLowerCase() ||
      String(c).toLowerCase() === String(user.email || "").toLowerCase()
    ) || false;
  };

  const canEditTask = (task: TaskRow | null): boolean => {
    if (!task) return false;
    const user = getCurrentUserData();
    if (!user) return false;
    // Admin can edit any task
    if (user.role === "admin") return true;
    // Only creator can edit (not assignees or collaborators)
    return isTaskCreator(task);
  };

  const canDeleteTask = (task: TaskRow | null): boolean => {
    if (!task) return false;
    const user = getCurrentUserData();
    if (!user) return false;
    // Admin can delete any task
    if (user.role === "admin") return true;
    // Only creator can delete
    return isTaskCreator(task);
  };

  const canUpdateTaskStatus = (task: TaskRow | null): boolean => {
    if (!task) return false;
    const user = getCurrentUserData();
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

  const canUploadAttachment = (task: TaskRow | null): boolean => {
    if (!task) return false;
    const user = getCurrentUserData();
    if (!user) return false;
    // Admin can upload
    if (user.role === "admin") return true;
    // Creator can upload
    if (isTaskCreator(task)) return true;
    // Assignees can upload
    if (isTaskAssignee(task)) return true;
    // Collaborators can upload
    if (isTaskCollaborator(task)) return true;
    return false;
  };

  const canDeleteAttachment = (file: any): boolean => {
    if (!file) return false;
    const user = getCurrentUserData();
    if (!user) return false;
    // Admin can delete any attachment
    if (user.role === "admin") return true;
    // Users can only delete their own attachments
    const fileUploadedBy = file.uploadedBy || file.uploadedByName;
    if (fileUploadedBy) {
      return fileUploadedBy.toLowerCase() === String(user.name || "").toLowerCase() ||
             fileUploadedBy.toLowerCase() === String(user.email || "").toLowerCase();
    }
    // If no uploadedBy info, only allow creator to delete
    return false;
  };

  const openEdit = async (k: ItemKind, item: any) => {
    setEditKind(k);
    setEditId(String(item?.id || ""));
    setEditFields({ ...(item || {}) });
    setEditTaskFiles([]);
    setEditTaskNewFiles([]);
    
    // Fetch files if editing a task
    if (k === "task" && item?.id) {
      try {
        const res = await fetch(`${API_BASE}/api/files?taskId=${item.id}`, { headers: getAuthHeaders() });
        if (res.ok) {
          const files = await res.json();
          setEditTaskFiles(files || []);
        }
      } catch {
        // Silent fail
      }
    }
    
    setEditOpen(true);
  };

  const openViewTask = async (task: TaskRow) => {
    setViewTaskData(task);
    setViewTaskFiles([]);
    
    // Fetch files for this task
    try {
      const res = await fetch(`${API_BASE}/api/files?taskId=${task.id}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const files = await res.json();
        setViewTaskFiles(files || []);
      }
    } catch {
      // Ignore fetch errors
    }
    
    setViewTaskOpen(true);
  };

  const openDelete = (k: ItemKind, item: any, label: string) => {
    setDeleteKind(k);
    setDeleteId(String(item?.id || ""));
    setDeleteLabel(label || "this item");
    setDeleteOpen(true);
  };

  const saveEdit = async () => {
    if (!id || !editKind || !editId) return;
    const endpoint = kindEndpoint(editKind);
    const url = `${API_BASE}/api/${endpoint}/${editId}`;
    const payload: any = { projectId: id };

    if (editKind === "task") {
      payload.title = editFields.title;
      payload.status = editFields.status;
      payload.start = editFields.start && editFields.start !== "-" ? editFields.start : undefined;
      payload.deadline = editFields.deadline && editFields.deadline !== "-" ? editFields.deadline : undefined;
      payload.priority = editFields.priority;
      payload.labels = editFields.labels || undefined;
      setTasks((prev) => prev.map((t) => (t.id === editId ? { ...t, title: editFields.title, status: editFields.status, start: editFields.start || "-", deadline: editFields.deadline || "-", priority: editFields.priority, labels: editFields.labels || undefined } : t)));
      
      // Upload new files if any
      if (editTaskNewFiles.length > 0) {
        let uploadedCount = 0;
        for (const file of editTaskNewFiles) {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("taskId", editId);
          fd.append("name", file.name);
          fd.append("type", file.type || "application/octet-stream");
          fd.append("size", String(file.size));
          try {
            await fetch(`${API_BASE}/api/files`, { method: "POST", headers: getAuthHeaders(), body: fd });
            uploadedCount++;
          } catch {
            // Silent fail for individual file upload
          }
        }
        // Update attachments count in local state after successful uploads
        if (uploadedCount > 0) {
          setTasks((prev) => prev.map((t) => (t.id === editId ? { ...t, attachments: (t.attachments || 0) + uploadedCount } : t)));
        }
      }
    } else if (editKind === "milestone") {
      payload.title = editFields.title;
      payload.due = editFields.due && editFields.due !== "-" ? editFields.due : undefined;
      payload.status = editFields.status;
      setMilestones((prev) => prev.map((m) => (m.id === editId ? { ...m, title: editFields.title, due: editFields.due || "-", status: editFields.status } : m)));
    } else if (editKind === "note") {
      payload.text = editFields.text;
      payload.title = editFields.title || undefined;
      payload.category = editFields.category || undefined;
      payload.tags = editFields.tags || undefined;
      payload.pinned = Boolean(editFields.pinned);
      setNotes((prev) => prev.map((n) => (n.id === editId ? { ...n, text: editFields.text, title: editFields.title || undefined, category: editFields.category || undefined, tags: editFields.tags || undefined, pinned: Boolean(editFields.pinned) } : n)));
    } else if (editKind === "comment") {
      payload.text = editFields.text;
      payload.author = editFields.author || undefined;
      payload.kind = editFields.kind || undefined;
      setComments((prev) => prev.map((n) => (n.id === editId ? { ...n, text: editFields.text, author: editFields.author || undefined, kind: editFields.kind || undefined } : n)));
    } else if (editKind === "file") {
      payload.name = editFields.name;
      payload.size = editFields.size != null && editFields.size !== "" ? Number(editFields.size) : undefined;
      payload.type = editFields.type || undefined;
      payload.url = editFields.url || undefined;
      payload.uploadedBy = editFields.uploadedBy || undefined;
      payload.description = editFields.description || undefined;
      setFiles((prev) => prev.map((f) => (f.id === editId ? { ...f, name: editFields.name, size: editFields.size != null && editFields.size !== "" ? Number(editFields.size) : undefined, type: editFields.type || undefined, url: editFields.url || undefined, uploadedBy: editFields.uploadedBy || undefined, description: editFields.description || undefined } : f)));
    } else if (editKind === "feedback") {
      payload.author = editFields.author;
      payload.text = editFields.text;
      payload.rating = editFields.rating != null && editFields.rating !== "" ? Number(editFields.rating) : undefined;
      payload.category = editFields.category || undefined;
      payload.status = editFields.status || undefined;
      payload.followUpRequired = Boolean(editFields.followUpRequired);
      payload.sentiment = editFields.sentiment || undefined;
      setFeedback((prev) => prev.map((f) => (f.id === editId ? { ...f, author: editFields.author, text: editFields.text, rating: editFields.rating != null && editFields.rating !== "" ? Number(editFields.rating) : undefined, category: editFields.category || undefined, status: editFields.status || undefined, followUpRequired: Boolean(editFields.followUpRequired), sentiment: editFields.sentiment || undefined } : f)));
    } else if (editKind === "timesheet") {
      payload.date = editFields.date;
      payload.user = editFields.user;
      payload.task = editFields.task || undefined;
      payload.hours = Number(editFields.hours) || 0;
      payload.billable = editFields.billable != null ? Boolean(editFields.billable) : undefined;
      payload.rate = editFields.rate != null && editFields.rate !== "" ? Number(editFields.rate) : undefined;
      payload.notes = editFields.notes || undefined;
      setTimesheets((prev) => prev.map((t) => (t.id === editId ? { ...t, date: editFields.date, user: editFields.user, task: editFields.task || "-", hours: Number(editFields.hours) || 0, billable: editFields.billable != null ? Boolean(editFields.billable) : undefined, rate: editFields.rate != null && editFields.rate !== "" ? Number(editFields.rate) : undefined, notes: editFields.notes || undefined } : t)));
    } else if (editKind === "invoice") {
      payload.number = editFields.number;
      payload.date = editFields.date || undefined;
      payload.status = editFields.status;
      payload.total = Number(editFields.total) || 0;
      payload.dueDate = editFields.dueDate || undefined;
      payload.currency = editFields.currency || undefined;
      payload.tax = editFields.tax != null && editFields.tax !== "" ? Number(editFields.tax) : undefined;
      payload.discount = editFields.discount != null && editFields.discount !== "" ? Number(editFields.discount) : undefined;
      payload.notes = editFields.notes || undefined;
      setInvoices((prev) => prev.map((i) => (i.id === editId ? { ...i, number: editFields.number, date: editFields.date || "-", dueDate: editFields.dueDate || undefined, status: editFields.status, total: Number(editFields.total) || 0, currency: editFields.currency || undefined, tax: editFields.tax != null && editFields.tax !== "" ? Number(editFields.tax) : undefined, discount: editFields.discount != null && editFields.discount !== "" ? Number(editFields.discount) : undefined, notes: editFields.notes || undefined } : i)));
    } else if (editKind === "payment") {
      payload.date = editFields.date;
      payload.method = editFields.method;
      payload.amount = Number(editFields.amount) || 0;
      payload.fee = editFields.fee != null && editFields.fee !== "" ? Number(editFields.fee) : undefined;
      payload.currency = editFields.currency || undefined;
      payload.status = editFields.status || undefined;
      payload.payer = editFields.payer || undefined;
      payload.receivedBy = editFields.receivedBy || undefined;
      payload.reference = editFields.reference || undefined;
      payload.transactionId = editFields.transactionId || undefined;
      payload.bankName = editFields.bankName || undefined;
      payload.account = editFields.account || undefined;
      payload.receiptUrl = editFields.receiptUrl || undefined;
      payload.notes = editFields.notes || undefined;
      setPayments((prev) => prev.map((p) => (p.id === editId ? {
        ...p,
        date: editFields.date,
        method: editFields.method,
        amount: Number(editFields.amount) || 0,
        fee: editFields.fee != null && editFields.fee !== "" ? Number(editFields.fee) : undefined,
        currency: editFields.currency || undefined,
        status: editFields.status || undefined,
        payer: editFields.payer || undefined,
        receivedBy: editFields.receivedBy || undefined,
        reference: editFields.reference || undefined,
        transactionId: editFields.transactionId || undefined,
        bankName: editFields.bankName || undefined,
        account: editFields.account || undefined,
        receiptUrl: editFields.receiptUrl || undefined,
        notes: editFields.notes || undefined,
      } : p)));
    } else if (editKind === "expense") {
      payload.title = editFields.title;
      payload.date = editFields.date || undefined;
      payload.category = editFields.category;
      payload.amount = Number(editFields.amount) || 0;
      payload.vendor = editFields.vendor || undefined;
      payload.receiptUrl = editFields.receiptUrl || undefined;
      payload.reimbursable = Boolean(editFields.reimbursable);
      payload.notes = editFields.notes || undefined;
      setExpenses((prev) => prev.map((e) => (e.id === editId ? { ...e, title: editFields.title, date: editFields.date || "-", category: editFields.category, amount: Number(editFields.amount) || 0, vendor: editFields.vendor || undefined, receiptUrl: editFields.receiptUrl || undefined, reimbursable: Boolean(editFields.reimbursable), notes: editFields.notes || undefined } : e)));
    } else if (editKind === "contract") {
      payload.title = editFields.title;
      payload.amount = Number(editFields.amount) || 0;
      payload.contractDate = editFields.contractDate || undefined;
      payload.validUntil = editFields.validUntil || undefined;
      payload.status = editFields.status;
      payload.type = editFields.type || undefined;
      payload.owner = editFields.owner || undefined;
      payload.signed = editFields.signed != null ? Boolean(editFields.signed) : undefined;
      payload.notes = editFields.notes || undefined;
      setContracts((prev) => prev.map((c) => (c.id === editId ? {
        ...c,
        title: editFields.title,
        amount: String(Number(editFields.amount) || 0),
        contractDate: editFields.contractDate || "-",
        validUntil: editFields.validUntil || "-",
        status: editFields.status,
        type: editFields.type || undefined,
        owner: editFields.owner || undefined,
        signed: editFields.signed != null ? Boolean(editFields.signed) : undefined,
        notes: editFields.notes || undefined,
      } : c)));
    }

    try {
      const r = await fetch(url, { method: "PUT", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
      if (r.ok) toast.success("Updated");
      else toast.success("Updated locally");
    } catch {
      toast.success("Updated locally");
    }
    setEditOpen(false);
  };

  const confirmDelete = async () => {
    if (!id || !deleteKind || !deleteId) return;
    const endpoint = kindEndpoint(deleteKind);
    const url = deleteKind === "comment"
      ? `${API_BASE}/api/${endpoint}/${deleteId}?projectId=${id}`
      : `${API_BASE}/api/${endpoint}/${deleteId}`;

    if (deleteKind === "task") setTasks((prev) => prev.filter((t) => t.id !== deleteId));
    else if (deleteKind === "milestone") setMilestones((prev) => prev.filter((m) => m.id !== deleteId));
    else if (deleteKind === "note") setNotes((prev) => prev.filter((n) => n.id !== deleteId));
    else if (deleteKind === "comment") setComments((prev) => prev.filter((n) => n.id !== deleteId));
    else if (deleteKind === "file") {
      // Find the file to check if it's linked to a task
      const fileToDelete = files.find((f) => f.id === deleteId);
      if (fileToDelete?.taskId) {
        // Decrement attachments count for the linked task
        setTasks((prev) => prev.map((t) => (t.id === fileToDelete.taskId ? { ...t, attachments: Math.max(0, (t.attachments || 0) - 1) } : t)));
      }
      setFiles((prev) => prev.filter((f) => f.id !== deleteId));
    }
    else if (deleteKind === "feedback") setFeedback((prev) => prev.filter((f) => f.id !== deleteId));
    else if (deleteKind === "timesheet") setTimesheets((prev) => prev.filter((t) => t.id !== deleteId));
    else if (deleteKind === "invoice") setInvoices((prev) => prev.filter((i) => i.id !== deleteId));
    else if (deleteKind === "payment") setPayments((prev) => prev.filter((p) => p.id !== deleteId));
    else if (deleteKind === "expense") setExpenses((prev) => prev.filter((e) => e.id !== deleteId));
    else if (deleteKind === "contract") setContracts((prev) => prev.filter((c) => c.id !== deleteId));

    try {
      const r = await fetch(url, { method: "DELETE", headers: getAuthHeaders() });
      if (!r.ok) throw new Error("delete failed");
      toast.success("Deleted");
    } catch {
      toast.success("Deleted locally");
    }
    setDeleteOpen(false);
  };
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/tasks?projectId=${id}`, { headers: getAuthHeaders() });
        if (r.ok) {
          const data = await r.json();
          const t = (Array.isArray(data) ? data : []).map((t:any)=> ({
            id: String(t._id || ""),
            title: t.title || "-",
            status: t.status || "todo",
            start: t.start ? new Date(t.start).toISOString().slice(0,10) : "-",
            deadline: t.deadline ? new Date(t.deadline).toISOString().slice(0,10) : "-",
            priority: t.priority || "medium",
            labels: Array.isArray(t.tags) ? t.tags.join(", ") : typeof t.labels === "string" ? t.labels : Array.isArray(t.labels) ? t.labels.join(", ") : undefined,
            assignedTo: (Array.isArray(t.assignees) ? t.assignees : [])[0]?.name || "",
            collaborators: Array.isArray(t.collaborators) ? t.collaborators : [],
            attachments: t.attachments || 0,
          }));
          setTasks(t);
          setActivity(t.slice(0, 5).map((x) => ({ id: x.id, text: `Task: ${x.title}`, at: x.start })));
        }
      } catch {}
    })();
  }, [id]);

  const progress = useMemo(() => {
    if (!project?.start || !project.deadline) return 0;
    const s = new Date(project.start).getTime();
    const e = new Date(project.deadline).getTime();
    if (e <= s) return 0;
    const pct = Math.round(((Date.now() - s) / (e - s)) * 100);
    return Math.max(0, Math.min(100, pct));
  }, [project?.start, project?.deadline]);

  const filteredTasks = useMemo(() => {
    let out = tasks;
    if (taskQuery) {
      const q = taskQuery.toLowerCase();
      out = out.filter((t) => [t.title, t.status, t.priority, t.labels].some((v) => String(v || "").toLowerCase().includes(q)));
    }
    if (taskStatus && taskStatus !== "__all__") {
      out = out.filter((t) => String(t.status).toLowerCase() === taskStatus.toLowerCase());
    }
    if (taskPriority && taskPriority !== "__all__") {
      out = out.filter((t) => String(t.priority).toLowerCase() === taskPriority.toLowerCase());
    }

    if (taskLabelFilter && taskLabelFilter !== "__all__") {
      out = out.filter((t) => {
        const labels = String(t.labels || "")
          .split(",")
          .map((x) => x.trim().toLowerCase())
          .filter(Boolean);
        return labels.includes(taskLabelFilter.toLowerCase());
      });
    }
    if (taskDeadlineFilter && taskDeadlineFilter !== "__all__") {
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      out = out.filter((t) => {
        const hasDeadline = t.deadline && t.deadline !== "-";
        if (!hasDeadline) return taskDeadlineFilter === "no_deadline";
        const d = new Date(t.deadline as any).getTime();
        if (taskDeadlineFilter === "past_due") return d < startOfToday;
        if (taskDeadlineFilter === "next_7_days") {
          const in7 = startOfToday + 7 * 24 * 60 * 60 * 1000;
          return d >= startOfToday && d <= in7;
        }
        return true;
      });
    }
    if (taskQuickFilter && taskQuickFilter !== "__none__") {
      if (taskQuickFilter === "high_priority") {
        out = out.filter((t) => String(t.priority).toLowerCase() === "high");
      } else if (taskQuickFilter === "overdue") {
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        out = out.filter((t) => {
          if (!t.deadline || t.deadline === "-") return false;
          const done = String(t.status || "").toLowerCase();
          const isDone = done.includes("done") || done.includes("complete");
          const d = new Date(t.deadline as any).getTime();
          return !isDone && d < startOfToday;
        });
      } else if (taskQuickFilter === "completed") {
        out = out.filter((t) => {
          const s = String(t.status || "").toLowerCase();
          return s.includes("done") || s.includes("complete");
        });
      }
    }
    return out;
  }, [tasks, taskQuery, taskStatus, taskPriority, taskDeadlineFilter, taskQuickFilter, taskLabelFilter]);

  const saveLabels = () => {
    const arr = labelDraft.map((x) => String(x || "").trim()).filter(Boolean);
    setLabelOptions(arr);
    localStorage.setItem("project_labels", JSON.stringify(arr));
    toast.success("Labels updated");
    setOpenManageLabels(false);
  };

  const statusCounts = useMemo(() => {
    const map = { todo: 0, in_progress: 0, done: 0 } as Record<string, number>;
    tasks.forEach((t) => {
      const s = String(t.status || "todo").toLowerCase().replace("-", "_");
      if (s.includes("progress")) map.in_progress += 1;
      else if (s.includes("done") || s.includes("complete")) map.done += 1;
      else map.todo += 1;
    });
    return map;
  }, [tasks]);

  const priorityCounts = useMemo(() => {
    const map = { low: 0, medium: 0, high: 0 } as Record<string, number>;
    tasks.forEach((t) => {
      const p = String(t.priority || "medium").toLowerCase();
      if (p in map) map[p] += 1; else map.medium += 1;
    });
    return map;
  }, [tasks]);

  const pad2 = (n: number) => String(Math.max(0, n)).padStart(2, "0");

  const milestoneStatusCounts = useMemo(() => {
    const res = { open: 0, done: 0, overdue: 0 };
    const today = Date.now();
    milestones.forEach((m) => {
      const s = String(m.status || "Open").toLowerCase();
      const due = m.due ? new Date(m.due).getTime() : undefined;
      if (s.includes("done") || s.includes("complete")) res.done += 1;
      else if (due && due < today) res.overdue += 1;
      else res.open += 1;
    });
    return res;
  }, [milestones]);

  const totalFileSize = useMemo(() => files.reduce((a, f) => a + (Number((f as any).size) || 0), 0), [files]);

  const invoiceStatusCounts = useMemo(() => {
    const res: Record<string, number> = {};
    invoices.forEach((i) => {
      const s = String(i.status || "unknown").toLowerCase();
      res[s] = (res[s] || 0) + 1;
    });
    return res;
  }, [invoices]);

  const paymentMethodTotals = useMemo(() => {
    const res: Record<string, number> = {};
    payments.forEach((p) => {
      const m = String(p.method || "other");
      res[m] = (res[m] || 0) + (Number(p.amount) || 0);
    });
    return res;
  }, [payments]);

  const expenseCategoryTotals = useMemo(() => {
    const res: Record<string, number> = {};
    expenses.forEach((e) => {
      const c = String(e.category || "Other");
      res[c] = (res[c] || 0) + (Number(e.amount) || 0);
    });
    return res;
  }, [expenses]);

  const timesheetUserSegments = useMemo(() => {
    const map: Record<string, number> = {};
    timesheets.forEach((t) => { const u = String(t.user || ""); map[u] = (map[u] || 0) + (Number(t.hours) || 0); });
    const entries = Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const palette = ["#60a5fa","#34d399","#f59e0b","#a78bfa","#f87171"];
    return entries.map(([k,v],i)=>({ value: v, color: palette[i % palette.length] }));
  }, [timesheets]);

  const contractStatusCounts = useMemo(() => {
    const res: Record<string, number> = {};
    contracts.forEach((c)=>{ const s = String(c.status || "Open").toLowerCase(); res[s] = (res[s] || 0) + 1; });
    return res;
  }, [contracts]);

  const statusBadgeClass = (s: string) => {
    const v = String(s || "").toLowerCase();
    if (v.includes("progress")) return "bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-800/50";
    if (v.includes("done") || v.includes("complete")) return "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800/50";
    return "bg-zinc-50 text-zinc-700 border border-zinc-200 dark:bg-zinc-900/50 dark:text-zinc-200 dark:border-zinc-700/60";
  };

  const milestoneBadgeClass = (s: string) => {
    const v = String(s || "Open").toLowerCase();
    if (v.includes("done")) return "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800/50";
    if (v.includes("overdue")) return "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800/50";
    return "bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-800/50";
  };

  const filteredMilestones = useMemo(() => {
    if (milestoneStatusFilter === "__all__") return milestones;
    const v = milestoneStatusFilter.toLowerCase();
    if (v === "overdue") {
      const today = Date.now();
      return milestones.filter((m)=> m.due ? new Date(m.due).getTime() < today && String(m.status||"").toLowerCase() !== "done" : false);
    }
    return milestones.filter((m)=> String(m.status||"").toLowerCase() === v);
  }, [milestones, milestoneStatusFilter]);

  const fileSizeSegments = useMemo(() => {
    const entries = files
      .map((f) => [f.name, Number((f as any).size) || 0] as [string, number])
      .sort((a,b)=>b[1]-a[1])
      .slice(0,5);
    const palette = ["#60a5fa","#34d399","#f59e0b","#a78bfa","#f87171"];
    return entries.map(([,v],i)=>({ value: v || 1, color: palette[i % palette.length] }));
  }, [files]);

  const feedbackAuthorSegments = useMemo(() => {
    const map: Record<string, number> = {};
    feedback.forEach((f)=>{ const a = String(f.author || "Client"); map[a] = (map[a] || 0) + 1; });
    const entries = Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const palette = ["#60a5fa","#34d399","#f59e0b","#a78bfa","#f87171"];
    return entries.map(([,v],i)=>({ value: v, color: palette[i % palette.length] }));
  }, [feedback]);

  const totalTimesheetHours = useMemo(() => timesheets.reduce((a, t) => a + (Number(t.hours) || 0), 0), [timesheets]);
  const totalPayments = useMemo(() => payments.reduce((a, p) => a + (Number(p.amount) || 0), 0), [payments]);
  const totalExpenses = useMemo(() => expenses.reduce((a, e) => a + (Number(e.amount) || 0), 0), [expenses]);
  const totalInvoicesTotal = useMemo(() => invoices.reduce((a, i) => a + (Number(i.total) || 0), 0), [invoices]);

  function DonutChart({ segments, size = 96, stroke = 12, centerText }: { segments: { value: number; color: string }[]; size?: number; stroke?: number; centerText?: string }) {
    const total = segments.reduce((a, b) => a + b.value, 0) || 1;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    let offset = 0;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {segments.map((s, i) => {
            const len = (s.value / total) * c;
            const dash = `${len} ${c - len}`;
            const el = (
              <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="transparent" stroke={s.color} strokeWidth={stroke} strokeDasharray={dash} strokeDashoffset={-offset} />
            );
            offset += len;
            return el;
          })}
        </g>
        {centerText && (
          <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="text-sm" fill="currentColor">{centerText}</text>
        )}
      </svg>
    );
  }

  function MiniBarChart({ values, height = 44, width = 180 }: { values: number[]; height?: number; width?: number }) {
    const max = Math.max(...values, 1);
    const barW = values.length ? width / values.length : width;
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {values.map((v, i) => {
          const h = (v / max) * (height - 6);
          const x = i * barW + 2;
          const y = height - h - 2;
          const w = Math.max(2, barW - 4);
          return <rect key={i} x={x} y={y} width={w} height={h} rx={2} fill="#60a5fa" opacity={0.9} />;
        })}
      </svg>
    );
  }

  const last7Days = useMemo(() => {
    const today = new Date();
    const days: string[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days;
  }, []);

  const tasksLast7Created = useMemo(() => {
    const map: Record<string, number> = {};
    tasks.forEach((t) => {
      const k = String(t.start || "");
      if (k && k !== "-") map[k] = (map[k] || 0) + 1;
    });
    return last7Days.map((d) => map[d] || 0);
  }, [last7Days, tasks]);

  const tasksLast7Done = useMemo(() => {
    const map: Record<string, number> = {};
    tasks.forEach((t) => {
      const s = String(t.status || "").toLowerCase();
      const isDone = s.includes("done") || s.includes("complete");
      if (!isDone) return;
      const k = String(t.start || "");
      if (k && k !== "-") map[k] = (map[k] || 0) + 1;
    });
    return last7Days.map((d) => map[d] || 0);
  }, [last7Days, tasks]);

  const milestonesLast7Due = useMemo(() => {
    const map: Record<string, number> = {};
    milestones.forEach((m) => {
      const k = String(m.due || "");
      if (k && k !== "-") map[k] = (map[k] || 0) + 1;
    });
    return last7Days.map((d) => map[d] || 0);
  }, [last7Days, milestones]);

  const milestonesLast7Done = useMemo(() => {
    const map: Record<string, number> = {};
    milestones.forEach((m) => {
      const s = String(m.status || "").toLowerCase();
      const isDone = s.includes("done") || s.includes("complete");
      if (!isDone) return;
      const k = String(m.due || "");
      if (k && k !== "-") map[k] = (map[k] || 0) + 1;
    });
    return last7Days.map((d) => map[d] || 0);
  }, [last7Days, milestones]);

  const notesLast7 = useMemo(() => {
    const map: Record<string, number> = {};
    notes.forEach((n) => {
      const k = String(n.at || "");
      if (k) map[k] = (map[k] || 0) + 1;
    });
    return last7Days.map((d) => map[d] || 0);
  }, [last7Days, notes]);

  const notesLast7Chars = useMemo(() => {
    const map: Record<string, number> = {};
    notes.forEach((n) => {
      const k = String(n.at || "");
      if (k) map[k] = (map[k] || 0) + String(n.text || "").length;
    });
    return last7Days.map((d) => map[d] || 0);
  }, [last7Days, notes]);

  const notesCategorySegments = useMemo(() => {
    const map: Record<string, number> = {};
    notes.forEach((n) => {
      const c = String(n.category || "General");
      map[c] = (map[c] || 0) + 1;
    });
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const palette = ["#60a5fa", "#34d399", "#f59e0b", "#a78bfa", "#f87171"];
    return entries.map(([, v], i) => ({ value: v || 1, color: palette[i % palette.length] }));
  }, [notes]);

  const commentsLast7 = useMemo(() => {
    const map: Record<string, number> = {};
    comments.forEach((n) => {
      const k = String(n.at || "");
      if (k) map[k] = (map[k] || 0) + 1;
    });
    return last7Days.map((d) => map[d] || 0);
  }, [comments, last7Days]);

  const commentsLast7Chars = useMemo(() => {
    const map: Record<string, number> = {};
    comments.forEach((n) => {
      const k = String(n.at || "");
      if (k) map[k] = (map[k] || 0) + String(n.text || "").length;
    });
    return last7Days.map((d) => map[d] || 0);
  }, [comments, last7Days]);

  const commentsKindSegments = useMemo(() => {
    const map: Record<string, number> = {};
    comments.forEach((c) => {
      const k = String(c.kind || "General");
      map[k] = (map[k] || 0) + 1;
    });
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const palette = ["#60a5fa", "#34d399", "#f59e0b", "#a78bfa", "#f87171"];
    return entries.map(([, v], i) => ({ value: v || 1, color: palette[i % palette.length] }));
  }, [comments]);

  const feedbackLast7 = useMemo(() => {
    const map: Record<string, number> = {};
    feedback.forEach((f) => {
      const k = String(f.at || "");
      if (k) map[k] = (map[k] || 0) + 1;
    });
    return last7Days.map((d) => map[d] || 0);
  }, [feedback, last7Days]);

  const feedbackLast7AvgRating = useMemo(() => {
    const sum: Record<string, number> = {};
    const cnt: Record<string, number> = {};
    feedback.forEach((f) => {
      const k = String(f.at || "");
      const r = Number(f.rating);
      if (!k || Number.isNaN(r) || !r) return;
      sum[k] = (sum[k] || 0) + r;
      cnt[k] = (cnt[k] || 0) + 1;
    });
    return last7Days.map((d) => (cnt[d] ? Math.round((sum[d] / cnt[d]) * 10) / 10 : 0));
  }, [feedback, last7Days]);

  const feedbackStatusSegments = useMemo(() => {
    const map: Record<string, number> = {};
    feedback.forEach((f) => {
      const s = String(f.status || "New");
      map[s] = (map[s] || 0) + 1;
    });
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const palette = ["#60a5fa", "#34d399", "#f59e0b", "#a78bfa", "#f87171"];
    return entries.map(([, v], i) => ({ value: v || 1, color: palette[i % palette.length] }));
  }, [feedback]);

  const timesheetsLast7Hours = useMemo(() => {
    const map: Record<string, number> = {};
    timesheets.forEach((t) => {
      const k = String(t.date || "");
      if (k) map[k] = (map[k] || 0) + (Number(t.hours) || 0);
    });
    return last7Days.map((d) => map[d] || 0);
  }, [last7Days, timesheets]);

  const timesheetsLast7BillableHours = useMemo(() => {
    const map: Record<string, number> = {};
    timesheets.forEach((t) => {
      const k = String(t.date || "");
      if (!k) return;
      if (t.billable === false) return;
      map[k] = (map[k] || 0) + (Number(t.hours) || 0);
    });
    return last7Days.map((d) => map[d] || 0);
  }, [last7Days, timesheets]);

  const timesheetBillableSegments = useMemo(() => {
    const billable = timesheets.reduce((a, t) => a + (t.billable === false ? 0 : (Number(t.hours) || 0)), 0);
    const non = timesheets.reduce((a, t) => a + (t.billable === false ? (Number(t.hours) || 0) : 0), 0);
    return [
      { value: billable || 0, color: "#60a5fa" },
      { value: non || 0, color: "#e4e4e7" },
    ];
  }, [timesheets]);

  const paymentsLast7Amounts = useMemo(() => {
    const map: Record<string, number> = {};
    payments.forEach((p) => {
      const k = String(p.date || "");
      if (k) map[k] = (map[k] || 0) + (Number(p.amount) || 0);
    });
    return last7Days.map((d) => map[d] || 0);
  }, [last7Days, payments]);

  const expensesLast7Amounts = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      const k = String(e.date || "");
      if (k) map[k] = (map[k] || 0) + (Number(e.amount) || 0);
    });
    return last7Days.map((d) => map[d] || 0);
  }, [expenses, last7Days]);

  const invoicesLast7Totals = useMemo(() => {
    const map: Record<string, number> = {};
    invoices.forEach((i) => {
      const k = String(i.date || "");
      if (k) map[k] = (map[k] || 0) + (Number(i.total) || 0);
    });
    return last7Days.map((d) => map[d] || 0);
  }, [invoices, last7Days]);

  const invoicesLast7Counts = useMemo(() => {
    const map: Record<string, number> = {};
    invoices.forEach((i) => {
      const k = String(i.date || "");
      if (k) map[k] = (map[k] || 0) + 1;
    });
    return last7Days.map((d) => map[d] || 0);
  }, [invoices, last7Days]);

  const paymentsLast7Counts = useMemo(() => {
    const map: Record<string, number> = {};
    payments.forEach((p) => {
      const k = String(p.date || "");
      if (k) map[k] = (map[k] || 0) + 1;
    });
    return last7Days.map((d) => map[d] || 0);
  }, [last7Days, payments]);

  const expensesLast7ReimbursableAmounts = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      const k = String(e.date || "");
      if (!k) return;
      if (!e.reimbursable) return;
      map[k] = (map[k] || 0) + (Number(e.amount) || 0);
    });
    return last7Days.map((d) => map[d] || 0);
  }, [expenses, last7Days]);

  const expensesReimbursableSegments = useMemo(() => {
    const reimb = expenses.reduce((a, e) => a + (e.reimbursable ? (Number(e.amount) || 0) : 0), 0);
    const non = expenses.reduce((a, e) => a + (!e.reimbursable ? (Number(e.amount) || 0) : 0), 0);
    return [
      { value: reimb || 0, color: "#60a5fa" },
      { value: non || 0, color: "#e4e4e7" },
    ];
  }, [expenses]);

  const contractsLast7Counts = useMemo(() => {
    const map: Record<string, number> = {};
    contracts.forEach((c) => {
      const k = String(c.contractDate || "");
      if (k && k !== "-") map[k] = (map[k] || 0) + 1;
    });
    return last7Days.map((d) => map[d] || 0);
  }, [contracts, last7Days]);

  const countdownTarget = useMemo(() => {
    const raw = project?.deadline || project?.start;
    if (!raw) return null;
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) return null;
    return dt;
  }, [project?.deadline, project?.start]);

  const countdown = useMemo(() => {
    if (!countdownTarget) return null;
    const diff = countdownTarget.getTime() - countdownNow;
    const ms = Math.abs(diff);
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / (24 * 3600));
    const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return { diff, days, hours, minutes, seconds };
  }, [countdownNow, countdownTarget]);

  const daysLeft = useMemo(() => {
    if (!countdownTarget || !countdown) return "-";
    const day = 24 * 60 * 60 * 1000;
    const d = Math.ceil(Math.abs(countdownTarget.getTime() - countdownNow) / day);
    if (Number.isNaN(d)) return "-";
    return `${d}d ${countdown.diff >= 0 ? "left" : "overdue"}`;
  }, [countdown, countdownNow, countdownTarget]);

  const updateProjectDeadline = async () => {
    if (!id) return;
    if (!editDeadline) return;
    const dt = new Date(editDeadline);
    if (Number.isNaN(dt.getTime())) {
      toast.error("Invalid deadline date/time");
      return;
    }

    const localIso = dt.toISOString();
    setProject((prev) => (prev ? { ...prev, deadline: localIso } : prev));
    setDeadlineAlerted(false);

    try {
      const payload: any = { deadline: dt };
      const r = await fetch(`${API_BASE}/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        const d = await r.json().catch(() => null);
        const saved = d?.deadline ? new Date(d.deadline).toISOString() : localIso;
        setProject((prev) => (prev ? { ...prev, deadline: saved } : prev));
        toast.success("Deadline updated");
      } else {
        toast.success("Deadline updated locally");
      }
    } catch {
      toast.success("Deadline updated locally");
    }
  };

  useEffect(() => {
    if (!project?.deadline) return;
    if (!countdownTarget || !countdown) return;
    if (deadlineAlerted) return;
    if (countdown.diff <= 0) {
      setDeadlineAlerted(true);
      toast.error("Project deadline reached");
    }
  }, [countdown, countdownTarget, deadlineAlerted, project?.deadline]);

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <Card className="w-full max-w-md p-6">
          <div className="text-sm text-muted-foreground">Loading project…</div>
          <div className="mt-2 text-base font-semibold">Please wait</div>
        </Card>
      </div>
    );
  }

  if (projectError) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <Card className="w-full max-w-lg p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Could not open project</div>
              <div className="mt-1 text-base font-semibold">{projectError}</div>
              <div className="mt-2 text-xs text-muted-foreground font-mono break-all">{String(id || "")}</div>
            </div>
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/projects">Back to Projects</Link>
            </Button>
            <Button onClick={() => window.location.reload()}>Reload</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-800 dark:via-indigo-800 dark:to-purple-800">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.12'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />

        <div className="relative mx-auto w-full max-w-7xl px-3 py-6 sm:px-4 sm:py-8 lg:px-6 lg:py-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-4">
              <div className="flex items-center gap-3">
                <BackButton to="/projects" variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10" />
                <div className="flex items-center gap-2 text-white/80 min-w-0 text-sm">
                  <Link to="/projects" className="hover:text-white transition-colors">Projects</Link>
                  <span>/</span>
                  <span className="text-white font-medium truncate">{project?.title || "Project"}</span>
                </div>
              </div>

              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white truncate">
                  {project?.title || "Project"}
                </h1>
                <p className="text-white/80 text-sm sm:text-base">
                  {project?.clientId ? (
                    <Link to={`/clients/${encodeURIComponent(String(project.clientId))}`} className="hover:underline">
                      Client: {project?.client || "Client"}
                    </Link>
                  ) : (
                    <span>Client: {project?.client || "-"}</span>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 justify-start lg:justify-end">
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                  {project?.status || "-"}
                </Badge>
                {(() => {
                  const first = String(project?.labels || "")
                    .split(",")
                    .map((x) => x.trim())
                    .filter(Boolean)[0];
                  return first ? (
                    <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">{first}</Badge>
                  ) : null;
                })()}
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                  Progress: {progress}%
                </Badge>
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                  Days left: {daysLeft}
                </Badge>
                {canViewProjectFinancials ? (
                  <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                    Budget: {project?.price != null ? String(project.price) : "-"}
                  </Badge>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg bg-white/10 border border-white/20 p-3">
                  <div className="text-xs text-white/70">Start</div>
                  <div className="text-sm font-medium text-white whitespace-nowrap">{project?.start ? project.start.slice(0, 10) : "-"}</div>
                </div>
                <div className="rounded-lg bg-white/10 border border-white/20 p-3">
                  <div className="text-xs text-white/70">Deadline</div>
                  <div className="text-sm font-medium text-white whitespace-nowrap">{project?.deadline ? project.deadline.slice(0, 10) : "-"}</div>
                </div>
                <div className="rounded-lg bg-white/10 border border-white/20 p-3">
                  <div className="text-xs text-white/70">Tasks</div>
                  <div className="text-sm font-medium text-white whitespace-nowrap">{tasks.length || 0}</div>
                </div>
                <div className="rounded-lg bg-white/10 border border-white/20 p-3">
                  <div className="text-xs text-white/70">Completed</div>
                  <div className="text-sm font-medium text-white whitespace-nowrap">{statusCounts.done}</div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Button asChild variant="secondary" className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm">
                <Link to="/projects/timeline">
                  <CalendarDays className="w-4 h-4 mr-2" />
                  Timeline
                </Link>
              </Button>
              <Button variant="outline" className="bg-white/10 text-white hover:bg-white/20 border-white/20" onClick={() => window.location.reload()}>
                <RefreshCcw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="bg-white/10 text-white hover:bg-white/20 border-white/20">
                    <MoreVertical className="w-4 h-4 mr-2" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {!isMarketer ? <DropdownMenuItem onClick={() => setMembersOpen(true)}>Manage members</DropdownMenuItem> : null}
                  {!isMarketer ? <DropdownMenuItem onClick={() => setEditDescOpen(true)}>Edit description</DropdownMenuItem> : null}
                  {!isMarketer ? (
                    <DropdownMenuItem
                      onClick={() => {
                        setActiveTab("tasks-list");
                        setOpenManageLabels(true);
                      }}
                    >
                      Manage task labels
                    </DropdownMenuItem>
                  ) : null}
                  {!isMarketer ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuItem asChild>
                    <Link to="/projects">Back to Projects</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">

      <div className="space-y-6">
        {project?.deadline && countdownTarget && countdown && countdown.diff <= 0 && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-destructive">
            <div className="font-medium">Deadline reached</div>
            <div className="text-sm text-destructive/90">This project is overdue. Deadline was {countdownTarget.toLocaleString()}.</div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:grid-cols-[260px_1fr]">
            <div className="lg:sticky lg:top-4 h-fit">
              <TabsList className="w-full flex h-auto flex-nowrap items-center justify-start gap-1 overflow-x-auto bg-muted/40 lg:flex-col lg:items-stretch lg:overflow-visible lg:bg-muted/20 lg:border lg:rounded-lg lg:p-2">
                <TabsTrigger className="whitespace-nowrap lg:w-full lg:justify-start" value="overview">Overview</TabsTrigger>
                <TabsTrigger className="whitespace-nowrap lg:w-full lg:justify-start" value="client-requirements">Client requirements</TabsTrigger>
                <TabsTrigger className="whitespace-nowrap lg:w-full lg:justify-start" value="delivery-document">Delivery document</TabsTrigger>
                <TabsTrigger className="whitespace-nowrap lg:w-full lg:justify-start" value="tasks-list">Tasks List</TabsTrigger>
                <TabsTrigger className="whitespace-nowrap lg:w-full lg:justify-start" value="milestones">Milestones</TabsTrigger>
                <TabsTrigger className="whitespace-nowrap lg:w-full lg:justify-start" value="gantt">Gantt</TabsTrigger>
                <TabsTrigger className="whitespace-nowrap lg:w-full lg:justify-start" value="notes">Notes</TabsTrigger>
                <TabsTrigger className="whitespace-nowrap lg:w-full lg:justify-start" value="files">Files</TabsTrigger>
                <TabsTrigger className="whitespace-nowrap lg:w-full lg:justify-start" value="comments">Comments</TabsTrigger>
                <TabsTrigger className="whitespace-nowrap lg:w-full lg:justify-start" value="customer-feedback">Customer feedback</TabsTrigger>
                <TabsTrigger className="whitespace-nowrap lg:w-full lg:justify-start" value="timesheets">Timesheets</TabsTrigger>
                {canViewProjectFinancials ? <TabsTrigger className="whitespace-nowrap lg:w-full lg:justify-start" value="invoices">Invoices</TabsTrigger> : null}
                {canViewProjectFinancials ? <TabsTrigger className="whitespace-nowrap lg:w-full lg:justify-start" value="payments">Payments</TabsTrigger> : null}
                {canViewProjectFinancials ? <TabsTrigger className="whitespace-nowrap lg:w-full lg:justify-start" value="expenses">Expenses</TabsTrigger> : null}
                <TabsTrigger className="whitespace-nowrap lg:w-full lg:justify-start" value="contracts">Contracts</TabsTrigger>
              </TabsList>
            </div>

            <div className="min-w-0">

              <TabsContent value="overview" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="p-4 border-0 shadow-lg bg-background/80 backdrop-blur-sm rounded-xl">
              <div className="rounded-lg border border-sky-200 bg-sky-50/40 dark:border-sky-800/50 dark:bg-sky-950/30 px-3 py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-wide text-sky-700 dark:text-sky-200">Tasks</div>
                  <div className="text-sm font-semibold text-foreground">Status overview</div>
                </div>
                <Badge variant="secondary" className="bg-white/70 border border-sky-200 text-sky-800 dark:bg-slate-900/60 dark:border-sky-800/50 dark:text-sky-200">Total: {tasks.length || 0}</Badge>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-center">
                <div className="text-xs space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: "#e4e4e7" }} />
                      <span>Todo</span>
                    </div>
                    <div className="text-sm font-semibold text-foreground tabular-nums">{statusCounts.todo}</div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sky-800 dark:text-sky-200">
                      <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: "#60a5fa" }} />
                      <span className="whitespace-nowrap">In progress</span>
                    </div>
                    <div className="text-sm font-semibold text-foreground tabular-nums">{statusCounts.in_progress}</div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
                      <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: "#34d399" }} />
                      <span>Done</span>
                    </div>
                    <div className="text-sm font-semibold text-foreground tabular-nums">{statusCounts.done}</div>
                  </div>
                </div>

                <div className="justify-self-center sm:justify-self-end">
                  <DonutChart
                    segments={[
                      { value: statusCounts.todo, color: "#e4e4e7" },
                      { value: statusCounts.in_progress, color: "#60a5fa" },
                      { value: statusCounts.done, color: "#34d399" },
                    ]}
                    centerText={`${tasks.length || 0}`}
                  />
                </div>
              </div>
            </Card>

            <Card className="p-4 space-y-3 lg:col-span-2 border-0 shadow-lg bg-background/80 backdrop-blur-sm rounded-xl">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-sky-600">Project members</div>
                <Button size="sm" variant="outline" onClick={() => setMembersOpen(true)} disabled={isMarketer}>Manage</Button>
              </div>
              {project?.members && project.members.length > 0 ? (
                <div className="flex flex-wrap gap-2 justify-start lg:justify-end">
                  {project.members.map((m, idx) => (
                    <Badge key={`${m}-${idx}`} variant="secondary">{m}</Badge>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">No members yet. Add people to keep delivery transparent.</div>
              )}
            </Card>

            <Card className="p-4 space-y-2 lg:col-span-2 border-0 shadow-lg bg-background/80 backdrop-blur-sm rounded-xl">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-sky-600">Description</div>
                <Button size="sm" variant="outline" onClick={() => setEditDescOpen(true)} disabled={isMarketer}>Edit</Button>
              </div>
              <div className="text-sm whitespace-pre-wrap text-foreground/90">
                {project?.description ? project.description : (
                  <div className="rounded-lg border bg-muted/20 p-4 text-muted-foreground">No description. Add a short brief so your team stays aligned.</div>
                )}
              </div>
            </Card>

            <Card className="p-4 space-y-3 lg:col-span-1 border-0 shadow-lg bg-background/80 backdrop-blur-sm rounded-xl">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Tasks</div>
                <div className="text-sm font-semibold">Priorities</div>
              </div>
              <div className="space-y-3 text-sm">
                {(["high","medium","low"] as const).map((k) => (
                  <div key={k} className="space-y-1">
                    <div className="flex items-center justify-between"><span className="capitalize">{k}</span><span className="text-muted-foreground">{priorityCounts[k]}</span></div>
                    <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
                      <div className={`h-2 rounded ${k === 'high' ? 'bg-rose-400' : k === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${tasks.length ? Math.round((priorityCounts[k] / tasks.length) * 100) : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
              </TabsContent>

              <TabsContent value="client-requirements">
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Client requirements</div>
                <div className="text-xs text-muted-foreground">Capture requirements as text and export as branded PDF</div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadPdf("requirements")}> <FileDown className="w-4 h-4 mr-2" />Download PDF</Button>
                <Button size="sm" disabled={savingDocs || isMarketer} onClick={() => saveProjectDocs("requirements")}>Save</Button>
              </div>
            </div>

            <Textarea
              className="min-h-[320px]"
              placeholder="Write client requirements here..."
              value={clientRequirementsDraft}
              disabled={isMarketer}
              onChange={(e) => setClientRequirementsDraft(e.target.value)}
            />

            <div className="hidden">
              <div ref={requirementsPdfRef} className="p-8" style={{ width: "210mm", minHeight: "297mm", background: "#ffffff", color: "#111827" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                  <div>
                    <div style={{ fontSize: "18px", fontWeight: 700 }}>{brand.name}</div>
                    <div style={{ fontSize: "12px", color: "#4b5563" }}>{brand.address}</div>
                    <div style={{ fontSize: "12px", color: "#4b5563" }}>{brand.email} | {brand.phone} | {brand.website}</div>
                  </div>
                  <img src={brand.logo} alt={brand.name} style={{ height: "42px" }} />
                </div>

                <div style={{ marginTop: "18px", borderTop: "1px solid #e5e7eb" }} />
                <div style={{ marginTop: "14px" }}>
                  <div style={{ fontSize: "16px", fontWeight: 700 }}>Client Requirements</div>
                  <div style={{ fontSize: "12px", color: "#4b5563" }}>Project: {project?.title || "-"}</div>
                  <div style={{ fontSize: "12px", color: "#4b5563" }}>Client: {project?.client || "-"}</div>
                  <div style={{ fontSize: "12px", color: "#4b5563" }}>Date: {new Date().toLocaleDateString()}</div>
                </div>

                <div style={{ marginTop: "16px", whiteSpace: "pre-wrap", fontSize: "12.5px", lineHeight: 1.55 }}>
                  {clientRequirementsDraft || "-"}
                </div>
              </div>
            </div>
          </Card>
              </TabsContent>

        <TabsContent value="delivery-document">
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Delivery document</div>
                <div className="text-xs text-muted-foreground">Share a clear commitment vs delivery document with the client</div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadPdf("delivery")}> <FileDown className="w-4 h-4 mr-2" />Download PDF</Button>
                <Button size="sm" disabled={savingDocs || isMarketer} onClick={() => saveProjectDocs("delivery")}>Save</Button>
              </div>
            </div>

            <Textarea
              className="min-h-[320px]"
              placeholder={
                "Template suggestion:\n\n" +
                "1) Scope committed\n- ...\n\n" +
                "2) Timeline committed\n- ...\n\n" +
                "3) Deliverables\n- ...\n\n" +
                "4) Assumptions / Exclusions\n- ...\n\n" +
                "5) Acceptance criteria\n- ...\n"
              }
              value={deliveryDocumentDraft}
              disabled={isMarketer}
              onChange={(e) => setDeliveryDocumentDraft(e.target.value)}
            />

            <div className="hidden">
              <div ref={deliveryPdfRef} className="p-8" style={{ width: "210mm", minHeight: "297mm", background: "#ffffff", color: "#111827" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                  <div>
                    <div style={{ fontSize: "18px", fontWeight: 700 }}>{brand.name}</div>
                    <div style={{ fontSize: "12px", color: "#4b5563" }}>{brand.address}</div>
                    <div style={{ fontSize: "12px", color: "#4b5563" }}>{brand.email} | {brand.phone} | {brand.website}</div>
                  </div>
                  <img src={brand.logo} alt={brand.name} style={{ height: "42px" }} />
                </div>

                <div style={{ marginTop: "18px", borderTop: "1px solid #e5e7eb" }} />
                <div style={{ marginTop: "14px" }}>
                  <div style={{ fontSize: "16px", fontWeight: 700 }}>Delivery Document</div>
                  <div style={{ fontSize: "12px", color: "#4b5563" }}>Project: {project?.title || "-"}</div>
                  <div style={{ fontSize: "12px", color: "#4b5563" }}>Client: {project?.client || "-"}</div>
                  <div style={{ fontSize: "12px", color: "#4b5563" }}>Date: {new Date().toLocaleDateString()}</div>
                </div>

                <div style={{ marginTop: "16px", whiteSpace: "pre-wrap", fontSize: "12.5px", lineHeight: 1.55 }}>
                  {deliveryDocumentDraft || "-"}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="tasks-list">
          <Card className="p-0 overflow-hidden shadow-sm rounded-xl">
            <div className={`p-3 border-b bg-muted/20 flex items-center justify-between ${tasksCompact ? 'text-[13px]' : ''}`}>
              <div className="text-sm font-medium text-sky-600">Tasks</div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setOpenManageLabels(true)}>Manage labels</Button>
                <Button variant="outline" size="sm" onClick={() => setShowAddMultipleTasks(true)}>Add multiple tasks</Button>
                <Button size="sm" onClick={()=>setShowAddTask(v=>!v)}><Plus className="w-4 h-4 mr-1"/>Add task</Button>
              </div>
            </div>
            <div className="p-3 border-b bg-muted/10 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">Tasks created (last 7 days)</div>
              <MiniBarChart values={last7Days.map((d) => tasks.filter((t) => t.start === d).length)} />
            </div>
            <Dialog open={openManageLabels} onOpenChange={setOpenManageLabels}>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Manage labels</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Input placeholder="New label" value={newLabel} onChange={(e)=>setNewLabel(e.target.value)} />
                    <Button
                      variant="outline"
                      onClick={() => {
                        const v = newLabel.trim();
                        if (!v) return;
                        setLabelDraft((prev) => [v, ...prev]);
                        setNewLabel("");
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {labelDraft.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No labels yet.</div>
                    ) : (
                      labelDraft.map((l, idx) => (
                        <div key={`${l}-${idx}`} className="flex items-center gap-2">
                          <Input value={l} onChange={(e)=>setLabelDraft((prev)=> prev.map((x,i)=> i===idx ? e.target.value : x))} />
                          <Button variant="outline" onClick={()=>setLabelDraft((prev)=> prev.filter((_,i)=> i!==idx))}>Remove</Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Close</Button>
                  </DialogClose>
                  <Button onClick={saveLabels}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <div className="p-3 border-b bg-muted/10 space-y-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="icon" onClick={()=>setTasksCompact(v=>!v)} title="Toggle compact rows">
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={reloadTasks} title="Reload">
                    <RefreshCcw className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={()=>setOpenTaskSettings(true)} title="Settings">
                    <Settings className="w-4 h-4" />
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="text-sm">
                        <FileDown className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={exportTasksCSV}><FileDown className="w-4 h-4 mr-2" />Excel</DropdownMenuItem>
                      <DropdownMenuItem onClick={printTasksTable}><Printer className="w-4 h-4 mr-2" />Print</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="w-full lg:w-[360px] relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input className="pl-9 w-full h-9 text-sm placeholder:text-sm" placeholder="Search tasks" value={taskQuery} onChange={(e)=>setTaskQuery(e.target.value)} />
                </div>
              </div>

              <div className="w-full overflow-hidden">
                <div className="flex flex-nowrap items-center gap-1 text-xs">
                  <div className="w-[130px] shrink min-w-0">
                    <Select value={taskQuickFilter} onValueChange={setTaskQuickFilter}>
                      <SelectTrigger className="h-8 px-2 text-xs"><SelectValue placeholder="Quick filter"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">- Quick filters -</SelectItem>
                        <SelectItem value="high_priority">High priority</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-[110px] shrink min-w-0">
                    <Select value={taskStatus} onValueChange={setTaskStatus}>
                      <SelectTrigger className="h-8 px-2 text-xs"><SelectValue placeholder="Status"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All</SelectItem>
                        <SelectItem value="todo">Todo</SelectItem>
                        <SelectItem value="in_progress">In progress</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-[110px] shrink min-w-0">
                    <Select value={taskPriority} onValueChange={setTaskPriority}>
                      <SelectTrigger className="h-8 px-2 text-xs"><SelectValue placeholder="Priority"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-[130px] shrink min-w-0">
                    <Select value={taskDeadlineFilter} onValueChange={setTaskDeadlineFilter}>
                      <SelectTrigger className="h-8 px-2 text-xs"><SelectValue placeholder="Deadline"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All</SelectItem>
                        <SelectItem value="past_due">Past due</SelectItem>
                        <SelectItem value="next_7_days">Next 7 days</SelectItem>
                        <SelectItem value="no_deadline">No deadline</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-[150px] shrink min-w-0">
                    <Select value={taskMilestoneFilter} onValueChange={setTaskMilestoneFilter}>
                      <SelectTrigger className="h-8 px-2 text-xs"><SelectValue placeholder="Milestone"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">- Milestone -</SelectItem>
                        {milestones.map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-[120px] shrink min-w-0">
                    <Select value={taskLabelFilter} onValueChange={setTaskLabelFilter}>
                      <SelectTrigger className="h-8 px-2 text-xs"><SelectValue placeholder="Label"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">- Label -</SelectItem>
                        {labelOptions.map((l) => (
                          <SelectItem key={l} value={l}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-[130px] shrink min-w-0">
                    <Select value={taskAssignedFilter} onValueChange={setTaskAssignedFilter}>
                      <SelectTrigger className="h-8 px-2 text-xs"><SelectValue placeholder="Assigned to"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">- Assigned to -</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <Dialog open={showAddMultipleTasks} onOpenChange={setShowAddMultipleTasks}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add multiple tasks</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">One per line. Optional format: Title | status | priority | YYYY-MM-DD (start) | YYYY-MM-DD (deadline)</div>
                  <Textarea className="min-h-[200px]" placeholder="Design landing page | in_progress | high | 2025-01-02 | 2025-01-08\nIntegrate payments | todo | medium" value={bulkTasksText} onChange={(e)=>setBulkTasksText(e.target.value)} />
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                  <Button onClick={addMultipleTasks}>Add</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={openTaskSettings} onOpenChange={setOpenTaskSettings}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Task settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <div className="text-sm font-medium">Compact rows</div>
                      <div className="text-xs text-muted-foreground">Reduce spacing for denser view</div>
                    </div>
                    <Checkbox checked={tasksCompact} onCheckedChange={(v)=>setTasksCompact(Boolean(v))} />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
                  <Button onClick={()=>setOpenTaskSettings(false)}>Apply</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Add task</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-1">Title</div>
                    <Input className="sm:col-span-4" placeholder="Title" value={newTaskTitle} onChange={(e)=>setNewTaskTitle(e.target.value)} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-start">
                    <div className="text-sm text-muted-foreground sm:col-span-1">Description</div>
                    <Textarea className="sm:col-span-4" placeholder="Description" value={newTaskDescription} onChange={(e)=>setNewTaskDescription(e.target.value)} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-1">Points</div>
                    <Select value={String(newTaskPoints)} onValueChange={(v)=>setNewTaskPoints(Number(v))}>
                      <SelectTrigger className="sm:col-span-4"><SelectValue placeholder="Points"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Point</SelectItem>
                        <SelectItem value="2">2 Points</SelectItem>
                        <SelectItem value="3">3 Points</SelectItem>
                        <SelectItem value="5">5 Points</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-1">Milestone</div>
                    <Select value={newTaskMilestoneId} onValueChange={setNewTaskMilestoneId}>
                      <SelectTrigger className="sm:col-span-4"><SelectValue placeholder="Milestone"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {milestones.map((m)=> (
                          <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-1">Assign to</div>
                    <Select value={newTaskAssignee || "__none__"} onValueChange={(v)=>setNewTaskAssignee(v === "__none__" ? "" : v)}>
                      <SelectTrigger className="sm:col-span-4"><SelectValue placeholder="Select assignee"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {employeeNames.map((n) => (
                          <SelectItem key={n} value={n}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-1">Collaborators</div>
                    <div className="sm:col-span-4 grid gap-2">
                      <Select
                        value={newTaskCollaboratorPick}
                        onValueChange={(v) => {
                          setNewTaskCollaboratorPick(v);
                          if (!v || v === "__none__") return;
                          setNewTaskCollaborators((prev) => {
                            const list = String(prev || "")
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean);
                            if (!list.some((x) => x.toLowerCase() === v.toLowerCase())) list.push(v);
                            return list.join(", ");
                          });
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="Add collaborator"/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Select...</SelectItem>
                          {employeeNames.map((n) => (
                            <SelectItem key={n} value={n}>{n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Collaborators (comma separated)"
                        value={newTaskCollaborators}
                        onChange={(e)=>setNewTaskCollaborators(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-1">Status</div>
                    <Select value={newTaskStatus} onValueChange={setNewTaskStatus}>
                      <SelectTrigger className="sm:col-span-4"><SelectValue placeholder="To do"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">To do</SelectItem>
                        <SelectItem value="in_progress">In progress</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-1">Priority</div>
                    <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                      <SelectTrigger className="sm:col-span-4"><SelectValue placeholder="Priority"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-start">
                    <div className="text-sm text-muted-foreground sm:col-span-1">Files</div>
                    <div className="sm:col-span-4 space-y-2">
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        id="new-task-files"
                        onChange={(e) => setNewTaskFiles((prev) => [...prev, ...Array.from(e.target.files || [])])}
                      />
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("new-task-files")?.click()}>
                          <Paperclip className="w-4 h-4 mr-2"/> Add files
                        </Button>
                        {newTaskFiles.length > 0 && (
                          <span className="text-xs text-muted-foreground">{newTaskFiles.length} selected</span>
                        )}
                      </div>
                      {newTaskFiles.length > 0 && (
                        <div className="space-y-1">
                          {newTaskFiles.map((file, idx) => (
                            <div key={`${file.name}-${idx}`} className="flex items-center justify-between gap-2 text-sm">
                              <span className="truncate">{file.name}</span>
                              <Button type="button" variant="ghost" size="sm" onClick={() => setNewTaskFiles((prev) => prev.filter((_, i) => i !== idx))}>
                                Remove
                              </Button>
                            </div>
                          ))}
                          <Button type="button" variant="ghost" size="sm" onClick={() => setNewTaskFiles([])}>Clear all</Button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-1">Start date</div>
                    <div className="sm:col-span-4">
                      <DatePicker value={newTaskStart} onChange={setNewTaskStart} placeholder="Pick start date" />
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-1">Deadline</div>
                    <div className="sm:col-span-4">
                      <DatePicker value={newTaskDeadline} onChange={setNewTaskDeadline} placeholder="Pick deadline" />
                    </div>
                  </div>
                </div>
                <DialogFooter className="items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      id="new-task-files"
                      onChange={(e) => setNewTaskFiles(Array.from(e.target.files || []))}
                    />
                    <Button variant="outline" onClick={() => document.getElementById("new-task-files")?.click()}>
                      <Paperclip className="w-4 h-4 mr-2"/> {newTaskFiles.length > 0 ? `${newTaskFiles.length} file(s)` : "Upload File"}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={()=>toast.success("Voice note coming soon")}> <Mic className="w-4 h-4"/> </Button>
                    {newTaskFiles.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={() => setNewTaskFiles([])}>Clear</Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
                    <Button variant="secondary" onClick={()=>{ addTask(); toast.success("Saved (show view coming soon)"); }}>Save & show</Button>
                    <Button onClick={addTask}>Save</Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <div className="overflow-x-auto -mx-4 px-4"><Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Task</TableHead>
                  <TableHead>Start date</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Milestone</TableHead>
                  <TableHead>Assigned to</TableHead>
                  <TableHead>Collaborators</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map(t => (
                  <TableRow key={t.id} className="hover:bg-muted/50">
                    <TableCell>{t.title}</TableCell>
                    <TableCell>{t.start}</TableCell>
                    <TableCell>{t.deadline}</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>{t.assignedTo || "-"}</TableCell>
                    <TableCell>{Array.isArray(t.collaborators) && t.collaborators.length ? t.collaborators.join(", ") : "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusBadgeClass(t.status)}>{t.status}</Badge>
                      {t.attachments > 0 && (
                        <span className="ml-2 text-xs text-muted-foreground" title={`${t.attachments} attachment(s)`}>
                          <Paperclip className="w-3 h-3 inline" />
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openViewTask(t)}><Eye className="w-4 h-4 mr-2" />View</DropdownMenuItem>
                          {canEditTask(t) && (
                            <DropdownMenuItem onClick={() => openEdit("task", t)}><Pencil className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
                          )}
                          {canDeleteTask(t) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openDelete("task", t, t.title)}><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTasks.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No record found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table></div>
            <div className="p-3 border-t flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Select value={taskPageSize} onValueChange={setTaskPageSize}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground">
                  {filteredTasks.length ? `1-${Math.min(filteredTasks.length, Number(taskPageSize))} / ${filteredTasks.length}` : "0-0 / 0"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" disabled><ChevronLeft className="w-4 h-4" /></Button>
                <Button variant="outline" size="icon" disabled><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>

            <div className="p-3 border-t bg-muted/10">
              <div className="text-sm font-medium text-sky-600">Analytics</div>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-md border bg-background p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground">Tasks created (7d)</div>
                  <div className="mt-1"><MiniBarChart values={tasksLast7Created} width={220} /></div>
                </div>
                <div className="rounded-md border bg-background p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground">Tasks done (7d)</div>
                  <div className="mt-1"><MiniBarChart values={tasksLast7Done} width={220} /></div>
                </div>
                <div className="rounded-md border bg-background p-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Statuses</div>
                    <div className="text-sm text-muted-foreground">Distribution</div>
                  </div>
                  <DonutChart
                    size={72}
                    segments={[
                      { value: statusCounts.todo, color: "#e4e4e7" },
                      { value: statusCounts.in_progress, color: "#60a5fa" },
                      { value: statusCounts.done, color: "#34d399" },
                    ]}
                    centerText={`${tasks.length}`}
                  />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Milestones */}
        <TabsContent value="milestones">
          <Card className="p-0 overflow-hidden shadow-sm rounded-xl">
            <div className="p-3 border-b bg-muted/20 flex items-center justify-between">
              <div className="text-sm font-medium text-sky-600">Milestones</div>
              <div className="flex items-center gap-3">
                <DonutChart size={64} segments={[{ value: milestoneStatusCounts.open, color: '#60a5fa' }, { value: milestoneStatusCounts.done, color: '#34d399' }, { value: milestoneStatusCounts.overdue, color: '#f87171' }]} centerText={`${milestones.length}`} />
                <Button onClick={()=>setShowAddMilestone(true)}><Plus className="w-4 h-4 mr-1"/>Add milestone</Button>
              </div>
            </div>
            <div className="p-3 border-b bg-muted/10 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Open</div>
                <div className="text-base font-semibold">{milestoneStatusCounts.open}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Done</div>
                <div className="text-base font-semibold">{milestoneStatusCounts.done}</div>
              </div>
              <div className="rounded-md border p-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Due soon (7 days)</div>
                  <div className="text-base font-semibold">{milestones.filter((m)=>{ if (!m.due || m.due === "-") return false; const dt = new Date(m.due).getTime(); const now = Date.now(); return dt >= now && dt <= now + 7*24*3600*1000; }).length}</div>
                </div>
                <MiniBarChart values={filteredMilestones.slice(0, 7).map((_,i)=>Math.max(1,7-i))} />
              </div>
            </div>
            <div className="p-3 border-b bg-muted/10 flex flex-wrap items-center gap-2">
              <Select value={milestoneStatusFilter} onValueChange={setMilestoneStatusFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="- Status -"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" size="sm"><FileDown className="w-4 h-4 mr-2"/>Excel</Button>
                <Button variant="outline" size="sm"><Printer className="w-4 h-4 mr-2"/>Print</Button>
                <div className="text-xs text-muted-foreground">Total: {filteredMilestones.length}</div>
              </div>
            </div>
            <Dialog open={showAddMilestone} onOpenChange={setShowAddMilestone}>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Add milestone</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Title</div>
                    <Input className="sm:col-span-3" placeholder="Title" value={newMilestoneTitle} onChange={(e)=>setNewMilestoneTitle(e.target.value)} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Due</div>
                    <div className="sm:col-span-3">
                      <DatePicker value={newMilestoneDue} onChange={setNewMilestoneDue} placeholder="Pick due date" />
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Status</div>
                    <Select value={newMilestoneStatus} onValueChange={setNewMilestoneStatus}>
                      <SelectTrigger className="sm:col-span-3"><SelectValue placeholder="Status"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="Done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                  <Button onClick={addMilestone}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <div className="overflow-x-auto -mx-4 px-4"><Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMilestones.map(m => (
                  <TableRow key={m.id} className="hover:bg-muted/50">
                    <TableCell>{m.id}</TableCell>
                    <TableCell>{m.title}</TableCell>
                    <TableCell>{m.due}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={milestoneBadgeClass(m.status || "Open")}>
                        {m.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit("milestone", m)}><Pencil className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openDelete("milestone", m, m.title || "Milestone")}><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredMilestones.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No milestones</TableCell></TableRow>
                )}
              </TableBody>
            </Table></div>

            <div className="p-3 border-t bg-muted/10">
              <div className="text-sm font-medium text-sky-600">Analytics</div>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-md border bg-background p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground">Milestones due (7d)</div>
                  <div className="mt-1"><MiniBarChart values={milestonesLast7Due} width={220} /></div>
                </div>
                <div className="rounded-md border bg-background p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground">Milestones done (7d)</div>
                  <div className="mt-1"><MiniBarChart values={milestonesLast7Done} width={220} /></div>
                </div>
                <div className="rounded-md border bg-background p-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Statuses</div>
                    <div className="text-sm text-muted-foreground">Distribution</div>
                  </div>
                  <DonutChart
                    size={72}
                    segments={[
                      { value: milestoneStatusCounts.open, color: "#60a5fa" },
                      { value: milestoneStatusCounts.done, color: "#34d399" },
                      { value: milestoneStatusCounts.overdue, color: "#f87171" },
                    ]}
                    centerText={`${milestones.length}`}
                  />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Gantt */}
        <TabsContent value="gantt">
          <Card className="p-0 overflow-hidden rounded-xl">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="text-sm font-medium text-sky-600">Gantt</div>
              <div className="flex items-center gap-3">
                <DonutChart size={64} segments={[{ value: tasks.length || 1, color: '#60a5fa' }]} centerText={`${tasks.length}`} />
                <Link to="/projects/timeline"><Button variant="outline">Open timeline</Button></Link>
              </div>
            </div>
            <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Todo</div>
                <div className="text-base font-semibold">{statusCounts.todo}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">In progress</div>
                <div className="text-base font-semibold">{statusCounts.in_progress}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Done</div>
                <div className="text-base font-semibold">{statusCounts.done}</div>
              </div>
            </div>
            <div className="px-3 pb-3 text-sm text-muted-foreground">Open the full project timeline</div>

            <div className="p-3 border-t bg-muted/10">
              <div className="text-sm font-medium text-sky-600">Analytics</div>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-md border bg-background p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground">Tasks created (7d)</div>
                  <div className="mt-1"><MiniBarChart values={tasksLast7Created} width={220} /></div>
                </div>
                <div className="rounded-md border bg-background p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground">Tasks done (7d)</div>
                  <div className="mt-1"><MiniBarChart values={tasksLast7Done} width={220} /></div>
                </div>
                <div className="rounded-md border bg-background p-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Statuses</div>
                    <div className="text-sm text-muted-foreground">Distribution</div>
                  </div>
                  <DonutChart
                    size={72}
                    segments={[
                      { value: statusCounts.todo, color: "#e4e4e7" },
                      { value: statusCounts.in_progress, color: "#60a5fa" },
                      { value: statusCounts.done, color: "#34d399" },
                    ]}
                    centerText={`${tasks.length}`}
                  />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes">
          <Card className="p-0 overflow-hidden rounded-xl">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="text-sm font-medium text-sky-600">Notes</div>
              <div className="flex items-center gap-3">
                <DonutChart size={64} segments={[{ value: notes.length, color: '#60a5fa' }]} centerText={`${notes.length}`} />
                <Button onClick={() => setShowAddNote(true)}><Plus className="w-4 h-4 mr-1" />Add note</Button>
              </div>
            </div>
            <div className="p-3 border-b bg-muted/10 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Notes created (last 7 days)</div>
              <MiniBarChart values={notesLast7} />
            </div>
            <Dialog open={showAddNote} onOpenChange={setShowAddNote}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add note</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Title</div>
                    <Input className="sm:col-span-3" placeholder="Optional title" value={newNoteTitle} onChange={(e)=>setNewNoteTitle(e.target.value)} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Category</div>
                    <Select value={newNoteCategory} onValueChange={setNewNoteCategory}>
                      <SelectTrigger className="sm:col-span-3"><SelectValue placeholder="Category"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General">General</SelectItem>
                        <SelectItem value="Meeting">Meeting</SelectItem>
                        <SelectItem value="Decision">Decision</SelectItem>
                        <SelectItem value="Risk">Risk</SelectItem>
                        <SelectItem value="Idea">Idea</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-start">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Note</div>
                    <Textarea className="sm:col-span-3 min-h-[140px]" placeholder="Write your note" value={newNote} onChange={(e)=>setNewNote(e.target.value)} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Tags</div>
                    <Input className="sm:col-span-3" placeholder="e.g. urgent, client, sprint-1" value={newNoteTags} onChange={(e)=>setNewNoteTags(e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <div className="text-sm font-medium">Pin note</div>
                      <div className="text-xs text-muted-foreground">Pinned notes appear first</div>
                    </div>
                    <Checkbox checked={newNotePinned} onCheckedChange={(v)=>setNewNotePinned(Boolean(v))} />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                  <Button onClick={async () => { await addNote(); setShowAddNote(false); }}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="p-3 space-y-3">
              <div className="space-y-2 text-sm">
                {notes
                  .slice()
                  .sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1))
                  .map(n => (
                    <div key={n.id} className={`p-3 rounded border ${n.pinned ? "border-sky-200 bg-sky-50/30" : ""}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {n.title ? <div className="font-medium truncate">{n.title}</div> : <div className="font-medium">Note</div>}
                            {n.category ? <Badge variant="outline" className="bg-sky-50 text-sky-700 border border-sky-200">{n.category}</Badge> : null}
                            {n.pinned ? <Badge variant="outline" className="bg-sky-50 text-sky-700 border border-sky-200">Pinned</Badge> : null}
                          </div>
                          <div className="whitespace-pre-wrap break-words">{n.text}</div>
                          {(n.tags || n.at) && (
                            <div className="text-xs text-muted-foreground">
                              {n.at || ""}
                              {n.tags ? ` · Tags: ${n.tags}` : ""}
                              {` · ${String(n.text || "").length} chars`}
                            </div>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit("note", n)}><Pencil className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openDelete("note", n, String(n.title || "Note"))}><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                {notes.length === 0 && <div className="text-muted-foreground">No notes</div>}
              </div>
            </div>

            <div className="p-3 border-t bg-muted/10">
              <div className="text-sm font-medium text-sky-600">Analytics</div>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-md border bg-background p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground">Notes created (7d)</div>
                  <div className="mt-1"><MiniBarChart values={notesLast7} width={220} /></div>
                </div>
                <div className="rounded-md border bg-background p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground">Characters written (7d)</div>
                  <div className="mt-1"><MiniBarChart values={notesLast7Chars} width={220} /></div>
                </div>
                <div className="rounded-md border bg-background p-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Categories</div>
                    <div className="text-sm text-muted-foreground">Top distribution</div>
                  </div>
                  <DonutChart size={72} segments={notesCategorySegments.length ? notesCategorySegments : [{ value: 1, color: "#60a5fa" }]} centerText={`${notes.length}`} />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Files */}
        <TabsContent value="files">
          <Card className="p-0 overflow-hidden rounded-xl">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="text-sm font-medium text-sky-600">Files</div>
              <div className="flex items-center gap-3">
                <DonutChart size={64} segments={fileSizeSegments} centerText={`${Math.round(totalFileSize/1024)}KB`} />
                <Button onClick={()=>setShowAddFile(true)}><Plus className="w-4 h-4 mr-1" />Add file</Button>
              </div>
            </div>
            <div className="p-3 border-b bg-muted/10 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Largest files (top 7)</div>
              <MiniBarChart values={files.slice().sort((a,b)=>(Number((b as any).size)||0)-(Number((a as any).size)||0)).slice(0,7).map((f)=>Number((f as any).size)||1)} />
            </div>
            <Dialog open={showAddFile} onOpenChange={setShowAddFile}>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Add file</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Upload</div>
                    <div className="sm:col-span-3 space-y-1">
                      <Input
                        className="sm:col-span-3"
                        type="file"
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          setNewFileBlob(f);
                          if (!f) return;
                          setNewFileName(f.name || "");
                          setNewFileSize(f.size || "");
                          const mt = String(f.type || "").toLowerCase();
                          if (mt.startsWith("image/")) setNewFileType("Image");
                          else if (mt === "application/pdf") setNewFileType("PDF");
                          else if (mt.includes("sheet") || mt.includes("excel") || mt.includes("spreadsheet")) setNewFileType("Spreadsheet");
                          else setNewFileType("Document");
                        }}
                      />
                      {newFileBlob ? (
                        <div className="text-xs text-muted-foreground">
                          Selected: {newFileBlob.name} · {Math.max(1, Math.round((newFileBlob.size || 0) / 1024))} KB
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Name</div>
                    <Input className="sm:col-span-3" placeholder="File name" value={newFileName} onChange={(e)=>setNewFileName(e.target.value)} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Type</div>
                    <Select value={newFileType} onValueChange={setNewFileType}>
                      <SelectTrigger className="sm:col-span-3"><SelectValue placeholder="Type"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Document">Document</SelectItem>
                        <SelectItem value="Image">Image</SelectItem>
                        <SelectItem value="PDF">PDF</SelectItem>
                        <SelectItem value="Spreadsheet">Spreadsheet</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Size (bytes)</div>
                    <Input className="sm:col-span-3" type="number" placeholder="0" value={newFileSize as any} onChange={(e)=>setNewFileSize(e.target.value ? Number(e.target.value) : "")} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">URL</div>
                    <Input className="sm:col-span-3" placeholder="https://..." value={newFileUrl} onChange={(e)=>setNewFileUrl(e.target.value)} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Uploaded by</div>
                    <Input className="sm:col-span-3" placeholder="Name" value={newFileUploadedBy} onChange={(e)=>setNewFileUploadedBy(e.target.value)} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-start">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Description</div>
                    <Textarea className="sm:col-span-3" placeholder="Optional description" value={newFileDescription} onChange={(e)=>setNewFileDescription(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                  <Button onClick={addFile}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <div className="p-3 space-y-2 text-sm">
              {files.map(f => (
                <div key={f.id} className="p-3 rounded border flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-medium truncate">{f.name}</div>
                      {f.type ? <Badge variant="outline" className="bg-sky-50 text-sky-700 border border-sky-200">{f.type}</Badge> : null}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(f as any).size ? `${Math.round((Number((f as any).size))/1024)} KB` : "-"}
                      {f.uploadedBy ? ` · ${f.uploadedBy}` : ""}
                      {f.at ? ` · ${f.at}` : ""}
                      {` · ID: ${f.id}`}
                    </div>
                    {f.url ? (
                      <a className="text-xs text-sky-700 truncate block" href={f.url} target="_blank" rel="noreferrer">
                        {f.url}
                      </a>
                    ) : null}
                    {f.description ? <div className="text-xs text-muted-foreground line-clamp-2">{f.description}</div> : null}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit("file", f)}><Pencil className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => openDelete("file", f, f.name)}><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
              {files.length === 0 && <div className="text-muted-foreground">No files</div>}
            </div>

            <div className="p-3 border-t bg-muted/10">
              <div className="text-sm font-medium text-sky-600">Analytics</div>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-md border bg-background p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground">Largest files</div>
                  <div className="mt-1"><MiniBarChart values={files.slice().sort((a,b)=>(Number((b as any).size)||0)-(Number((a as any).size)||0)).slice(0,7).map((f)=>Number((f as any).size)||1)} width={220} /></div>
                </div>
                <div className="rounded-md border bg-background p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground">All file sizes</div>
                  <div className="mt-1"><MiniBarChart values={files.slice(0, 7).map((f)=>Number((f as any).size)||0)} width={220} /></div>
                </div>
                <div className="rounded-md border bg-background p-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Storage</div>
                    <div className="text-sm text-muted-foreground">Top contributors</div>
                  </div>
                  <DonutChart size={72} segments={fileSizeSegments.length ? fileSizeSegments : [{ value: 1, color: "#60a5fa" }]} centerText={`${Math.round(totalFileSize/1024)}KB`} />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Comments */}
        <TabsContent value="comments">
          <Card className="p-0 overflow-hidden rounded-xl">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="text-sm font-medium text-sky-600">Comments</div>
              <div className="flex items-center gap-3">
                <DonutChart size={64} segments={[{ value: comments.length, color: '#60a5fa' }]} centerText={`${comments.length}`} />
                <Button onClick={() => setShowAddComment(true)}><Plus className="w-4 h-4 mr-1" />Add comment</Button>
              </div>
            </div>
            <div className="p-3 border-b bg-muted/10 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Comments created (last 7 days)</div>
              <MiniBarChart values={commentsLast7} />
            </div>
            <Dialog open={showAddComment} onOpenChange={setShowAddComment}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add comment</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Author</div>
                    <Input className="sm:col-span-3" placeholder="Name" value={newCommentAuthor} onChange={(e)=>setNewCommentAuthor(e.target.value)} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Type</div>
                    <Select value={newCommentKind} onValueChange={setNewCommentKind}>
                      <SelectTrigger className="sm:col-span-3"><SelectValue placeholder="Type"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General">General</SelectItem>
                        <SelectItem value="Update">Update</SelectItem>
                        <SelectItem value="Question">Question</SelectItem>
                        <SelectItem value="Decision">Decision</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-start">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Comment</div>
                    <Textarea className="sm:col-span-3 min-h-[140px]" placeholder="Write your comment" value={newComment} onChange={(e)=>setNewComment(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                  <Button onClick={async () => { await addComment(); setShowAddComment(false); }}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="p-3 space-y-3">
              <div className="space-y-2 text-sm">
                {comments.map(n => (
                  <div key={n.id} className="p-3 rounded border">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{n.author || "Comment"}</div>
                          {n.kind ? <Badge variant="outline" className="bg-sky-50 text-sky-700 border border-sky-200">{n.kind}</Badge> : null}
                        </div>
                        <div className="whitespace-pre-wrap break-words">{n.text}</div>
                        <div className="text-xs text-muted-foreground">{n.at || ""} · {String(n.text || "").length} chars</div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit("comment", n)}><Pencil className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openDelete("comment", n, "Comment")}><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
                {comments.length === 0 && <div className="text-muted-foreground">No comments</div>}
              </div>
            </div>

            <div className="p-3 border-t bg-muted/10">
              <div className="text-sm font-medium text-sky-600">Analytics</div>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-md border bg-background p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground">Comments created (7d)</div>
                  <div className="mt-1"><MiniBarChart values={commentsLast7} width={220} /></div>
                </div>
                <div className="rounded-md border bg-background p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground">Characters written (7d)</div>
                  <div className="mt-1"><MiniBarChart values={commentsLast7Chars} width={220} /></div>
                </div>
                <div className="rounded-md border bg-background p-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Types</div>
                    <div className="text-sm text-muted-foreground">Top distribution</div>
                  </div>
                  <DonutChart size={72} segments={commentsKindSegments.length ? commentsKindSegments : [{ value: 1, color: "#60a5fa" }]} centerText={`${comments.length}`} />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Customer feedback */}
        <TabsContent value="customer-feedback">
          <Card className="p-0 overflow-hidden rounded-xl">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="text-sm font-medium text-sky-600">Customer feedback</div>
              <div className="flex items-center gap-3">
                <DonutChart size={64} segments={feedbackAuthorSegments} centerText={`${feedback.length}`} />
                <Button onClick={()=>setShowAddFeedback(true)}><Plus className="w-4 h-4 mr-1" />Add feedback</Button>
              </div>
            </div>
            <div className="p-3 border-b bg-muted/10 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Feedback received (last 7 days)</div>
              <MiniBarChart values={feedbackLast7} />
            </div>
            <Dialog open={showAddFeedback} onOpenChange={setShowAddFeedback}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add feedback</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Author</div>
                    <Input className="sm:col-span-3" placeholder="Client" value={newFeedbackAuthor} onChange={(e)=>setNewFeedbackAuthor(e.target.value)} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Category</div>
                    <Select value={newFeedbackCategory} onValueChange={setNewFeedbackCategory}>
                      <SelectTrigger className="sm:col-span-3"><SelectValue placeholder="Category"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General">General</SelectItem>
                        <SelectItem value="Quality">Quality</SelectItem>
                        <SelectItem value="Timeline">Timeline</SelectItem>
                        <SelectItem value="Communication">Communication</SelectItem>
                        <SelectItem value="Support">Support</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Rating</div>
                    <Select value={String(newFeedbackRating)} onValueChange={(v)=>setNewFeedbackRating(Number(v))}>
                      <SelectTrigger className="sm:col-span-3"><SelectValue placeholder="Rating"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 (Excellent)</SelectItem>
                        <SelectItem value="4">4 (Good)</SelectItem>
                        <SelectItem value="3">3 (Okay)</SelectItem>
                        <SelectItem value="2">2 (Poor)</SelectItem>
                        <SelectItem value="1">1 (Bad)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Status</div>
                    <Select value={newFeedbackStatus} onValueChange={setNewFeedbackStatus}>
                      <SelectTrigger className="sm:col-span-3"><SelectValue placeholder="Status"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New">New</SelectItem>
                        <SelectItem value="In progress">In progress</SelectItem>
                        <SelectItem value="Resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Sentiment</div>
                    <Select value={newFeedbackSentiment} onValueChange={setNewFeedbackSentiment}>
                      <SelectTrigger className="sm:col-span-3"><SelectValue placeholder="Sentiment"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Positive">Positive</SelectItem>
                        <SelectItem value="Neutral">Neutral</SelectItem>
                        <SelectItem value="Negative">Negative</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-start">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Feedback</div>
                    <Textarea className="sm:col-span-3 min-h-[140px]" placeholder="Write feedback" value={newFeedbackText} onChange={(e)=>setNewFeedbackText(e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <div className="text-sm font-medium">Follow up required</div>
                      <div className="text-xs text-muted-foreground">Mark if you need to contact the customer</div>
                    </div>
                    <Checkbox checked={newFeedbackFollowUp} onCheckedChange={(v)=>setNewFeedbackFollowUp(Boolean(v))} />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                  <Button onClick={addFeedback}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <div className="p-3 space-y-2 text-sm">
              {feedback.map(f => (
                <div key={f.id} className="p-3 rounded border">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-sm font-medium">{f.author || "Client"}</div>
                        {typeof f.rating === "number" ? <Badge variant="outline" className="bg-sky-50 text-sky-700 border border-sky-200">{f.rating}/5</Badge> : null}
                        {f.category ? <Badge variant="outline" className="bg-sky-50 text-sky-700 border border-sky-200">{f.category}</Badge> : null}
                        {f.status ? <Badge variant="outline" className="bg-zinc-50 text-zinc-700 border border-zinc-200">{f.status}</Badge> : null}
                        {f.sentiment ? <Badge variant="outline" className={f.sentiment === "Negative" ? "bg-rose-50 text-rose-700 border border-rose-200" : f.sentiment === "Neutral" ? "bg-zinc-50 text-zinc-700 border border-zinc-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}>{f.sentiment}</Badge> : null}
                        {f.followUpRequired ? <Badge variant="outline" className="bg-amber-50 text-amber-700 border border-amber-200">Follow up</Badge> : null}
                      </div>
                      <div className="text-sm mt-1 whitespace-pre-wrap">{f.text}</div>
                      <div className="text-xs text-muted-foreground mt-1">{f.at || ""} · {String(f.text || "").length} chars</div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit("feedback", f)}><Pencil className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openDelete("feedback", f, "Feedback")}><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
              {feedback.length === 0 && <div className="text-muted-foreground text-sm">No customer feedback</div>}
            </div>

            <div className="p-3 border-t bg-muted/10">
              <div className="text-sm font-medium text-sky-600">Analytics</div>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-md border bg-background p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground">Feedback received (7d)</div>
                  <div className="mt-1"><MiniBarChart values={feedbackLast7} width={220} /></div>
                </div>
                <div className="rounded-md border bg-background p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground">Avg rating (7d)</div>
                  <div className="mt-1"><MiniBarChart values={feedbackLast7AvgRating} width={220} /></div>
                </div>
                <div className="rounded-md border bg-background p-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Statuses</div>
                    <div className="text-sm text-muted-foreground">Top distribution</div>
                  </div>
                  <DonutChart size={72} segments={feedbackStatusSegments.length ? feedbackStatusSegments : [{ value: 1, color: "#60a5fa" }]} centerText={`${feedback.length}`} />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Timesheets */}
        <TabsContent value="timesheets">
          <Card className="p-0 overflow-hidden rounded-xl">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="text-sm font-medium text-sky-600">Timesheets</div>
              <div className="flex items-center gap-3">
                <DonutChart size={64} segments={timesheetUserSegments} centerText={`${totalTimesheetHours}h`} />
                <Button onClick={()=>setShowAddTimesheet(true)}><Plus className="w-4 h-4 mr-1" />Add timesheet</Button>
              </div>
            </div>
            <div className="p-3 border-b bg-muted/10 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Hours logged (last 7 days)</div>
              <MiniBarChart values={timesheetsLast7Hours} />
            </div>
            <Dialog open={showAddTimesheet} onOpenChange={setShowAddTimesheet}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add timesheet</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Date</div>
                    <div className="sm:col-span-3">
                      <DatePicker value={newTimesheetDate} onChange={setNewTimesheetDate} placeholder="Pick date" />
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">User</div>
                    <Input className="sm:col-span-3" placeholder="User" value={newTimesheetUser} onChange={(e)=>setNewTimesheetUser(e.target.value)} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Task</div>
                    <Input className="sm:col-span-3" placeholder="Task" value={newTimesheetTask} onChange={(e)=>setNewTimesheetTask(e.target.value)} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Hours</div>
                    <Input className="sm:col-span-3" type="number" placeholder="0" value={newTimesheetHours as any} onChange={(e)=>setNewTimesheetHours(e.target.value ? Number(e.target.value) : "")} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Rate</div>
                    <Input className="sm:col-span-3" type="number" placeholder="Optional" value={newTimesheetRate as any} onChange={(e)=>setNewTimesheetRate(e.target.value ? Number(e.target.value) : "")} />
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <div className="text-sm font-medium">Billable</div>
                      <div className="text-xs text-muted-foreground">Counts toward billing</div>
                    </div>
                    <Checkbox checked={newTimesheetBillable} onCheckedChange={(v)=>setNewTimesheetBillable(Boolean(v))} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-start">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Notes</div>
                    <Textarea className="sm:col-span-3" placeholder="Optional notes" value={newTimesheetNotes} onChange={(e)=>setNewTimesheetNotes(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                  <Button onClick={addTimesheet}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <div className="overflow-x-auto -mx-4 px-4"><Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Billable</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timesheets.map(t => (
                  <TableRow key={t.id}>
                    <TableCell>{t.date}</TableCell>
                    <TableCell>{t.user}</TableCell>
                    <TableCell>{t.task}</TableCell>
                    <TableCell>{t.hours}</TableCell>
                    <TableCell>{t.billable === false ? <Badge variant="outline" className="bg-zinc-50 text-zinc-700 border border-zinc-200">No</Badge> : <Badge variant="outline" className="bg-sky-50 text-sky-700 border border-sky-200">Yes</Badge>}</TableCell>
                    <TableCell>{t.rate != null ? t.rate : "-"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit("timesheet", t)}><Pencil className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openDelete("timesheet", t, "Timesheet") }><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {timesheets.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No timesheets</TableCell></TableRow>
                )}
              </TableBody>
            </Table></div>

            <div className="p-3 border-t bg-muted/10">
              <div className="text-sm font-medium text-sky-600">Analytics</div>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-md border bg-background p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground">Hours logged (7d)</div>
                  <div className="mt-1"><MiniBarChart values={timesheetsLast7Hours} width={220} /></div>
                </div>
                <div className="rounded-md border bg-background p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground">Billable hours (7d)</div>
                  <div className="mt-1"><MiniBarChart values={timesheetsLast7BillableHours} width={220} /></div>
                </div>
                <div className="rounded-md border bg-background p-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Billable split</div>
                    <div className="text-sm text-muted-foreground">Hours distribution</div>
                  </div>
                  <DonutChart size={72} segments={timesheetBillableSegments} centerText={`${totalTimesheetHours}h`} />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {canViewProjectFinancials ? (
        <TabsContent value="invoices">
          <Card className="p-0 overflow-hidden rounded-xl">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="text-sm font-medium text-sky-600">Invoices</div>
              <div className="flex items-center gap-3">
                <DonutChart size={64} segments={Object.entries(invoiceStatusCounts).map(([k,v],i)=>({ value: v, color: ['#60a5fa','#34d399','#f59e0b','#a78bfa','#f87171'][i%5] }))} centerText={`${Math.round(totalInvoicesTotal)}`} />
                <Button onClick={()=>setShowAddInvoice(true)}><Plus className="w-4 h-4 mr-1" />Add invoice</Button>
              </div>
            </div>
            <div className="p-3 border-b bg-muted/10 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Invoice totals (last 7 days)</div>
              <MiniBarChart values={invoicesLast7Totals} />
            </div>
            <Dialog open={showAddInvoice} onOpenChange={setShowAddInvoice}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add invoice</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Number</div>
                    <Input className="sm:col-span-3" placeholder="# Number" value={newInvoiceNumber} onChange={(e)=>setNewInvoiceNumber(e.target.value)} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Date</div>
                    <div className="sm:col-span-3">
                      <DatePicker value={newInvoiceDate} onChange={setNewInvoiceDate} placeholder="Pick invoice date" />
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Due date</div>
                    <div className="sm:col-span-3">
                      <DatePicker value={newInvoiceDueDate} onChange={setNewInvoiceDueDate} placeholder="Pick due date" />
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Status</div>
                    <Select value={newInvoiceStatus} onValueChange={setNewInvoiceStatus}>
                      <SelectTrigger className="sm:col-span-3"><SelectValue placeholder="Status"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Sent">Sent</SelectItem>
                        <SelectItem value="Paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Currency</div>
                    <Select value={newInvoiceCurrency} onValueChange={setNewInvoiceCurrency}>
                      <SelectTrigger className="sm:col-span-3"><SelectValue placeholder="Currency"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PKR">PKR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Total</div>
                    <Input className="sm:col-span-3" type="number" placeholder="0" value={newInvoiceTotal as any} onChange={(e)=>setNewInvoiceTotal(e.target.value ? Number(e.target.value) : "")} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Tax</div>
                    <Input className="sm:col-span-3" type="number" placeholder="Optional" value={newInvoiceTax as any} onChange={(e)=>setNewInvoiceTax(e.target.value ? Number(e.target.value) : "")} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Discount</div>
                    <Input className="sm:col-span-3" type="number" placeholder="Optional" value={newInvoiceDiscount as any} onChange={(e)=>setNewInvoiceDiscount(e.target.value ? Number(e.target.value) : "")} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-start">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Notes</div>
                    <Textarea className="sm:col-span-3" placeholder="Optional notes" value={newInvoiceNotes} onChange={(e)=>setNewInvoiceNotes(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                  <Button onClick={addInvoice}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <div className="overflow-x-auto -mx-4 px-4"><Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map(i => (
                  <TableRow key={i.id}>
                    <TableCell>{i.number || i.id}</TableCell>
                    <TableCell>{i.date || "-"}</TableCell>
                    <TableCell>{i.dueDate || "-"}</TableCell>
                    <TableCell>{i.status || "-"}</TableCell>
                    <TableCell>{i.currency || "-"}</TableCell>
                    <TableCell>{i.total ?? "-"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit("invoice", i)}><Pencil className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openDelete("invoice", i, String(i.number || "Invoice"))}><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {invoices.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No invoices</TableCell></TableRow>
                )}
              </TableBody>
            </Table></div>

            <div className="p-3 border-t bg-muted/10">
              <div className="text-sm font-medium text-sky-600">Analytics</div>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-md border bg-background p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground">Invoice totals (7d)</div>
                  <div className="mt-1"><MiniBarChart values={invoicesLast7Totals} width={220} /></div>
                </div>
                <div className="rounded-md border bg-background p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground">Invoices created (7d)</div>
                  <div className="mt-1"><MiniBarChart values={invoicesLast7Counts} width={220} /></div>
                </div>
                <div className="rounded-md border bg-background p-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Statuses</div>
                    <div className="text-sm text-muted-foreground">Distribution</div>
                  </div>
                  <DonutChart size={72} segments={Object.entries(invoiceStatusCounts).map(([k,v],idx)=>({ value: v || 1, color: ['#60a5fa','#34d399','#f59e0b','#a78bfa','#f87171'][idx%5] }))} centerText={`${invoices.length}`} />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        ) : null}

        {canViewProjectFinancials ? (
        <TabsContent value="payments">
          <Card className="p-0 overflow-hidden rounded-xl">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="text-sm font-medium text-sky-600">Payments</div>
              <div className="flex items-center gap-3">
                <DonutChart size={64} segments={Object.entries(paymentMethodTotals).map(([k,v],i)=>({ value: v, color: ['#60a5fa','#34d399','#f59e0b','#a78bfa','#f87171'][i%5] }))} centerText={`${Math.round(totalPayments)}`} />
                <Button onClick={()=>setShowAddPayment(true)}><Plus className="w-4 h-4 mr-1" />Add payment</Button>
              </div>
            </div>
            <div className="p-3 border-b bg-muted/10 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Payments (last 7 days)</div>
              <MiniBarChart values={paymentsLast7Amounts} />
            </div>
            <Dialog open={showAddPayment} onOpenChange={setShowAddPayment}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add payment</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Date</div>
                    <div className="sm:col-span-3">
                      <DatePicker value={newPaymentDate} onChange={setNewPaymentDate} placeholder="Pick date" />
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Method</div>
                    <Select value={newPaymentMethod} onValueChange={setNewPaymentMethod}>
                      <SelectTrigger className="sm:col-span-3"><SelectValue placeholder="Method"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Card">Card</SelectItem>
                        <SelectItem value="Bank">Bank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Status</div>
                    <Select value={newPaymentStatus} onValueChange={setNewPaymentStatus}>
                      <SelectTrigger className="sm:col-span-3"><SelectValue placeholder="Status"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Received">Received</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Failed">Failed</SelectItem>
                        <SelectItem value="Refunded">Refunded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Amount</div>
                    <Input className="sm:col-span-3" type="number" placeholder="0" value={newPaymentAmount as any} onChange={(e)=>setNewPaymentAmount(e.target.value ? Number(e.target.value) : "")} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Fee</div>
                    <Input className="sm:col-span-3" type="number" placeholder="Optional" value={newPaymentFee as any} onChange={(e)=>setNewPaymentFee(e.target.value ? Number(e.target.value) : "")} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Currency</div>
                    <Select value={newPaymentCurrency} onValueChange={setNewPaymentCurrency}>
                      <SelectTrigger className="sm:col-span-3"><SelectValue placeholder="Currency"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PKR">PKR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Payer</div>
                    <Input className="sm:col-span-3" placeholder="Client / Company" value={newPaymentPayer} onChange={(e)=>setNewPaymentPayer(e.target.value)} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Received by</div>
                    <Input className="sm:col-span-3" placeholder="Team member" value={newPaymentReceivedBy} onChange={(e)=>setNewPaymentReceivedBy(e.target.value)} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Reference</div>
                    <Input className="sm:col-span-3" placeholder="Txn / Cheque / Ref" value={newPaymentReference} onChange={(e)=>setNewPaymentReference(e.target.value)} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Transaction ID</div>
                    <Input className="sm:col-span-3" placeholder="Optional" value={newPaymentTransactionId} onChange={(e)=>setNewPaymentTransactionId(e.target.value)} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Bank name</div>
                    <Input className="sm:col-span-3" placeholder="Optional" value={newPaymentBankName} onChange={(e)=>setNewPaymentBankName(e.target.value)} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Account</div>
                    <Input className="sm:col-span-3" placeholder="Optional" value={newPaymentAccount} onChange={(e)=>setNewPaymentAccount(e.target.value)} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Receipt URL</div>
                    <Input className="sm:col-span-3" placeholder="https://..." value={newPaymentReceiptUrl} onChange={(e)=>setNewPaymentReceiptUrl(e.target.value)} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-start">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Notes</div>
                    <Textarea className="sm:col-span-3" placeholder="Optional notes" value={newPaymentNotes} onChange={(e)=>setNewPaymentNotes(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                  <Button onClick={addPayment}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <div className="overflow-x-auto -mx-4 px-4"><Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payer / Received</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Bank / Txn</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Net</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>{p.date || "-"}</TableCell>
                    <TableCell>{p.method || "-"}</TableCell>
                    <TableCell>
                      {p.status ? (
                        <Badge
                          variant="outline"
                          className={
                            String(p.status).toLowerCase().includes("fail")
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : String(p.status).toLowerCase().includes("pend")
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : String(p.status).toLowerCase().includes("refund")
                                  ? "bg-zinc-50 text-zinc-700 border border-zinc-200"
                                  : "bg-sky-50 text-sky-700 border border-sky-200"
                          }
                        >
                          {p.status}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <div className="truncate">{p.payer || "-"}</div>
                      <div className="text-xs text-muted-foreground truncate">{p.receivedBy ? `Received by ${p.receivedBy}` : ""}</div>
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <div className="truncate">{p.reference || "-"}</div>
                      <div className="text-xs text-muted-foreground truncate">{p.transactionId ? `Txn: ${p.transactionId}` : ""}</div>
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <div className="truncate">{p.bankName || "-"}</div>
                      <div className="text-xs text-muted-foreground truncate">{p.account ? `Acct: ${p.account}` : ""}</div>
                    </TableCell>
                    <TableCell>{p.currency || "-"}</TableCell>
                    <TableCell>{p.fee != null ? p.fee : "-"}</TableCell>
                    <TableCell>{(Number(p.amount) || 0) - (Number(p.fee) || 0)}</TableCell>
                    <TableCell>
                      {p.receiptUrl ? (
                        <a className="text-xs text-sky-700" href={p.receiptUrl} target="_blank" rel="noreferrer">View</a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit("payment", p)}><Pencil className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openDelete("payment", p, "Payment")}><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {payments.length === 0 && (
                  <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground">No payments</TableCell></TableRow>
                )}
              </TableBody>
            </Table></div>

            <div className="p-3 border-t bg-muted/10">
              <div className="text-sm font-medium text-sky-600">Analytics</div>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-md border bg-background p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground">Amounts (7d)</div>
                  <div className="mt-1"><MiniBarChart values={paymentsLast7Amounts} width={220} /></div>
                </div>
                <div className="rounded-md border bg-background p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground">Payments count (7d)</div>
                  <div className="mt-1"><MiniBarChart values={paymentsLast7Counts} width={220} /></div>
                </div>
                <div className="rounded-md border bg-background p-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Methods</div>
                    <div className="text-sm text-muted-foreground">Distribution</div>
                  </div>
                  <DonutChart size={72} segments={Object.entries(paymentMethodTotals).map(([k,v],idx)=>({ value: v || 1, color: ['#60a5fa','#34d399','#f59e0b','#a78bfa','#f87171'][idx%5] }))} centerText={`${payments.length}`} />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        ) : null}

        {canViewProjectFinancials ? (
        <TabsContent value="expenses">
          <Card className="p-0 overflow-hidden rounded-xl">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="text-sm font-medium text-sky-600">Expenses</div>
              <div className="flex items-center gap-3">
                <DonutChart size={64} segments={Object.entries(expenseCategoryTotals).map(([k,v],i)=>({ value: v, color: ['#60a5fa','#34d399','#f59e0b','#a78bfa','#f87171'][i%5] }))} centerText={`${Math.round(totalExpenses)}`} />
                <Button onClick={()=>setShowAddExpense(true)}><Plus className="w-4 h-4 mr-1" />Add expense</Button>
              </div>
            </div>
            <div className="p-3 border-b bg-muted/10 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Expenses (last 7 days)</div>
              <MiniBarChart values={expensesLast7Amounts} />
            </div>
            <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add expense</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Title</div>
                    <Input className="sm:col-span-3" placeholder="Title" value={newExpenseTitle} onChange={(e)=>setNewExpenseTitle(e.target.value)} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Date</div>
                    <div className="sm:col-span-3">
                      <DatePicker value={newExpenseDate} onChange={setNewExpenseDate} placeholder="Pick date" />
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Category</div>
                    <Input className="sm:col-span-3" placeholder="Category" value={newExpenseCategory} onChange={(e)=>setNewExpenseCategory(e.target.value)} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Amount</div>
                    <Input className="sm:col-span-3" type="number" placeholder="0" value={newExpenseAmount as any} onChange={(e)=>setNewExpenseAmount(e.target.value ? Number(e.target.value) : "")} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Vendor</div>
                    <Input className="sm:col-span-3" placeholder="Vendor name" value={newExpenseVendor} onChange={(e)=>setNewExpenseVendor(e.target.value)} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Receipt URL</div>
                    <Input className="sm:col-span-3" placeholder="https://..." value={newExpenseReceiptUrl} onChange={(e)=>setNewExpenseReceiptUrl(e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <div className="text-sm font-medium">Reimbursable</div>
                      <div className="text-xs text-muted-foreground">Mark if you will reimburse this expense</div>
                    </div>
                    <Checkbox checked={newExpenseReimbursable} onCheckedChange={(v)=>setNewExpenseReimbursable(Boolean(v))} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-start">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Notes</div>
                    <Textarea className="sm:col-span-3" placeholder="Optional notes" value={newExpenseNotes} onChange={(e)=>setNewExpenseNotes(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                  <Button onClick={addExpense}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <div className="overflow-x-auto -mx-4 px-4"><Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Title</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Reimb.</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map(e => (
                  <TableRow key={e.id}>
                    <TableCell>{e.title || e.id}</TableCell>
                    <TableCell>{e.date || "-"}</TableCell>
                    <TableCell>{e.category || "-"}</TableCell>
                    <TableCell>{e.vendor || "-"}</TableCell>
                    <TableCell>{e.reimbursable ? <Badge variant="outline" className="bg-sky-50 text-sky-700 border border-sky-200">Yes</Badge> : <Badge variant="outline" className="bg-zinc-50 text-zinc-700 border border-zinc-200">No</Badge>}</TableCell>
                    <TableCell>{e.amount ?? "-"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit("expense", e)}><Pencil className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openDelete("expense", e, String(e.title || "Expense"))}><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {expenses.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No expenses</TableCell></TableRow>
                )}
              </TableBody>
            </Table></div>

            <div className="p-3 border-t bg-muted/10">
              <div className="text-sm font-medium text-sky-600">Analytics</div>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-md border bg-background p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground">Amounts (7d)</div>
                  <div className="mt-1"><MiniBarChart values={expensesLast7Amounts} width={220} /></div>
                </div>
                <div className="rounded-md border bg-background p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground">Reimbursable (7d)</div>
                  <div className="mt-1"><MiniBarChart values={expensesLast7ReimbursableAmounts} width={220} /></div>
                </div>
                <div className="rounded-md border bg-background p-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Reimbursable split</div>
                    <div className="text-sm text-muted-foreground">Amount distribution</div>
                  </div>
                  <DonutChart size={72} segments={expensesReimbursableSegments} centerText={`${Math.round(totalExpenses)}`} />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        ) : null}

        {/* Contracts */}
        <TabsContent value="contracts">
          <Card className="p-0 overflow-hidden rounded-xl">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="text-sm font-medium text-sky-600">Contracts</div>
              <div className="flex items-center gap-3">
                <DonutChart size={64} segments={Object.entries(contractStatusCounts).map(([k,v],i)=>({ value: v, color: ['#60a5fa','#34d399','#f59e0b','#a78bfa','#f87171'][i%5] }))} centerText={`${contracts.length}`} />
                <Button onClick={()=>setShowAddContract(true)}><Plus className="w-4 h-4 mr-1" />Add contract</Button>
              </div>
            </div>
            <Dialog open={showAddContract} onOpenChange={setShowAddContract}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Add contract</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Title</div>
                    <Input className="sm:col-span-3" placeholder="Title" value={newContractTitle} onChange={(e)=>setNewContractTitle(e.target.value)} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Amount</div>
                    <Input className="sm:col-span-3" type="number" placeholder="0" value={newContractAmount as any} onChange={(e)=>setNewContractAmount(e.target.value ? Number(e.target.value) : "")} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Contract date</div>
                    <div className="sm:col-span-3">
                      <DatePicker value={newContractDate} onChange={setNewContractDate} placeholder="Pick contract date" />
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Valid until</div>
                    <div className="sm:col-span-3">
                      <DatePicker value={newContractValidUntil} onChange={setNewContractValidUntil} placeholder="Pick valid until" />
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Status</div>
                    <Select value={newContractStatus} onValueChange={setNewContractStatus}>
                      <SelectTrigger className="sm:col-span-3"><SelectValue placeholder="Status"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="payment pending">Payment Pending</SelectItem>
                        <SelectItem value="running">Running</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Type</div>
                    <Select value={newContractType} onValueChange={setNewContractType}>
                      <SelectTrigger className="sm:col-span-3"><SelectValue placeholder="Type"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Service">Service</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                        <SelectItem value="Subscription">Subscription</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-center">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Owner</div>
                    <Input className="sm:col-span-3" placeholder="Contract owner" value={newContractOwner} onChange={(e)=>setNewContractOwner(e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <div className="text-sm font-medium">Signed</div>
                      <div className="text-xs text-muted-foreground">Mark if signed by both parties</div>
                    </div>
                    <Checkbox checked={newContractSigned} onCheckedChange={(v)=>setNewContractSigned(Boolean(v))} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5 items-start">
                    <div className="text-sm text-muted-foreground sm:col-span-2">Notes</div>
                    <Textarea className="sm:col-span-3" placeholder="Optional notes" value={newContractNotes} onChange={(e)=>setNewContractNotes(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                  <Button onClick={addContract}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <div className="overflow-x-auto -mx-4 px-4"><Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Contract date</TableHead>
                  <TableHead>Valid until</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Signed</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>{c.id}</TableCell>
                    <TableCell>{c.title}</TableCell>
                    <TableCell>{c.amount}</TableCell>
                    <TableCell>{c.contractDate}</TableCell>
                    <TableCell>{c.validUntil}</TableCell>
                    <TableCell>{c.status}</TableCell>
                    <TableCell>{c.type || "-"}</TableCell>
                    <TableCell>{c.signed ? <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border border-emerald-200">Yes</Badge> : <Badge variant="outline" className="bg-zinc-50 text-zinc-700 border border-zinc-200">No</Badge>}</TableCell>
                    <TableCell className="text-muted-foreground">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit("contract", c)}><Pencil className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openDelete("contract", c, c.title)}><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {contracts.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No contracts</TableCell></TableRow>
                )}
              </TableBody>
            </Table></div>

            <div className="p-3 border-t bg-muted/10">
              <div className="text-sm font-medium text-sky-600">Analytics</div>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-md border bg-background p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground">Contracts created (7d)</div>
                  <div className="mt-1"><MiniBarChart values={contractsLast7Counts} width={220} /></div>
                </div>
                <div className="rounded-md border bg-background p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground">Status counts</div>
                  <div className="mt-1"><MiniBarChart values={Object.values(contractStatusCounts).slice(0, 7).map((v)=>Number(v)||0)} width={220} /></div>
                </div>
                <div className="rounded-md border bg-background p-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Statuses</div>
                    <div className="text-sm text-muted-foreground">Distribution</div>
                  </div>
                  <DonutChart size={72} segments={Object.entries(contractStatusCounts).map(([k,v],idx)=>({ value: v || 1, color: ['#60a5fa','#34d399','#f59e0b','#a78bfa','#f87171'][idx%5] }))} centerText={`${contracts.length}`} />
                </div>
              </div>
            </div>
          </Card>
              </TabsContent>

            </div>
          </div>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {editKind === "note" ? (
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Title</div>
                  <Input className="sm:col-span-3" value={String(editFields.title || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, title: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Category</div>
                  <Input className="sm:col-span-3" value={String(editFields.category || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, category: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Tags</div>
                  <Input className="sm:col-span-3" value={String(editFields.tags || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, tags: e.target.value }))} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="text-sm font-medium">Pinned</div>
                    <div className="text-xs text-muted-foreground">Pinned notes appear first</div>
                  </div>
                  <Checkbox checked={Boolean(editFields.pinned)} onCheckedChange={(v)=>setEditFields((p:any)=>({ ...p, pinned: Boolean(v) }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-start">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Text</div>
                  <Textarea className="sm:col-span-3 min-h-[140px]" value={String(editFields.text || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, text: e.target.value }))} />
                </div>
              </div>
            ) : editKind === "comment" ? (
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Author</div>
                  <Input className="sm:col-span-3" value={String(editFields.author || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, author: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Type</div>
                  <Input className="sm:col-span-3" value={String(editFields.kind || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, kind: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-start">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Text</div>
                  <Textarea className="sm:col-span-3 min-h-[140px]" value={String(editFields.text || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, text: e.target.value }))} />
                </div>
              </div>
            ) : editKind === "feedback" ? (
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Author</div>
                  <Input className="sm:col-span-3" value={String(editFields.author || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, author: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Category</div>
                  <Input className="sm:col-span-3" value={String(editFields.category || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, category: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Rating</div>
                  <Input className="sm:col-span-3" type="number" value={editFields.rating as any} onChange={(e)=>setEditFields((p:any)=>({ ...p, rating: e.target.value ? Number(e.target.value) : "" }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Status</div>
                  <Input className="sm:col-span-3" value={String(editFields.status || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, status: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Sentiment</div>
                  <Input className="sm:col-span-3" value={String(editFields.sentiment || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, sentiment: e.target.value }))} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="text-sm font-medium">Follow up required</div>
                    <div className="text-xs text-muted-foreground">Mark if follow-up is needed</div>
                  </div>
                  <Checkbox checked={Boolean(editFields.followUpRequired)} onCheckedChange={(v)=>setEditFields((p:any)=>({ ...p, followUpRequired: Boolean(v) }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-start">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Text</div>
                  <Textarea className="sm:col-span-3 min-h-[140px]" value={String(editFields.text || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, text: e.target.value }))} />
                </div>
              </div>
            ) : editKind === "file" ? (
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Name</div>
                  <Input className="sm:col-span-3" value={String(editFields.name || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, name: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Type</div>
                  <Input className="sm:col-span-3" value={String(editFields.type || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, type: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Size (bytes)</div>
                  <Input className="sm:col-span-3" type="number" value={editFields.size as any} onChange={(e)=>setEditFields((p:any)=>({ ...p, size: e.target.value ? Number(e.target.value) : "" }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">URL</div>
                  <Input className="sm:col-span-3" value={String(editFields.url || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, url: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Uploaded by</div>
                  <Input className="sm:col-span-3" value={String(editFields.uploadedBy || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, uploadedBy: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-start">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Description</div>
                  <Textarea className="sm:col-span-3" value={String(editFields.description || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, description: e.target.value }))} />
                </div>
              </div>
            ) : editKind === "milestone" ? (
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Title</div>
                  <Input className="sm:col-span-3" value={String(editFields.title || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, title: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Due</div>
                  <div className="sm:col-span-3">
                    <DatePicker value={String(editFields.due || "")} onChange={(v)=>setEditFields((p:any)=>({ ...p, due: v }))} placeholder="Pick due date" />
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Status</div>
                  <Select value={String(editFields.status || "Open")} onValueChange={(v)=>setEditFields((p:any)=>({ ...p, status: v }))}>
                    <SelectTrigger className="sm:col-span-3"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Open">Open</SelectItem>
                      <SelectItem value="Done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : editKind === "timesheet" ? (
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Date</div>
                  <div className="sm:col-span-3">
                    <DatePicker value={String(editFields.date || "")} onChange={(v)=>setEditFields((p:any)=>({ ...p, date: v }))} placeholder="Pick date" />
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">User</div>
                  <Input className="sm:col-span-3" value={String(editFields.user || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, user: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Task</div>
                  <Input className="sm:col-span-3" value={String(editFields.task || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, task: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Hours</div>
                  <Input className="sm:col-span-3" type="number" value={editFields.hours as any} onChange={(e)=>setEditFields((p:any)=>({ ...p, hours: e.target.value ? Number(e.target.value) : "" }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Rate</div>
                  <Input className="sm:col-span-3" type="number" value={editFields.rate as any} onChange={(e)=>setEditFields((p:any)=>({ ...p, rate: e.target.value ? Number(e.target.value) : "" }))} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="text-sm font-medium">Billable</div>
                    <div className="text-xs text-muted-foreground">Counts toward billing</div>
                  </div>
                  <Checkbox checked={editFields.billable !== false} onCheckedChange={(v)=>setEditFields((p:any)=>({ ...p, billable: Boolean(v) }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-start">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Notes</div>
                  <Textarea className="sm:col-span-3" value={String(editFields.notes || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, notes: e.target.value }))} />
                </div>
              </div>
            ) : editKind === "invoice" ? (
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Number</div>
                  <Input className="sm:col-span-3" value={String(editFields.number || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, number: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Date</div>
                  <div className="sm:col-span-3">
                    <DatePicker value={String(editFields.date || "")} onChange={(v)=>setEditFields((p:any)=>({ ...p, date: v }))} placeholder="Pick invoice date" />
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Due date</div>
                  <div className="sm:col-span-3">
                    <DatePicker value={String(editFields.dueDate || "")} onChange={(v)=>setEditFields((p:any)=>({ ...p, dueDate: v }))} placeholder="Pick due date" />
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Status</div>
                  <Input className="sm:col-span-3" value={String(editFields.status || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, status: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Currency</div>
                  <Input className="sm:col-span-3" value={String(editFields.currency || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, currency: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Total</div>
                  <Input className="sm:col-span-3" type="number" value={editFields.total as any} onChange={(e)=>setEditFields((p:any)=>({ ...p, total: e.target.value ? Number(e.target.value) : "" }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Tax</div>
                  <Input className="sm:col-span-3" type="number" value={editFields.tax as any} onChange={(e)=>setEditFields((p:any)=>({ ...p, tax: e.target.value ? Number(e.target.value) : "" }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Discount</div>
                  <Input className="sm:col-span-3" type="number" value={editFields.discount as any} onChange={(e)=>setEditFields((p:any)=>({ ...p, discount: e.target.value ? Number(e.target.value) : "" }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-start">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Notes</div>
                  <Textarea className="sm:col-span-3" value={String(editFields.notes || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, notes: e.target.value }))} />
                </div>
              </div>
            ) : editKind === "payment" ? (
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Date</div>
                  <div className="sm:col-span-3">
                    <DatePicker value={String(editFields.date || "")} onChange={(v)=>setEditFields((p:any)=>({ ...p, date: v }))} placeholder="Pick date" />
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Method</div>
                  <Input className="sm:col-span-3" value={String(editFields.method || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, method: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Status</div>
                  <Select value={String(editFields.status || "Received")} onValueChange={(v)=>setEditFields((p:any)=>({ ...p, status: v }))}>
                    <SelectTrigger className="sm:col-span-3"><SelectValue placeholder="Status"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Received">Received</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Failed">Failed</SelectItem>
                      <SelectItem value="Refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Reference</div>
                  <Input className="sm:col-span-3" value={String(editFields.reference || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, reference: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Transaction ID</div>
                  <Input className="sm:col-span-3" value={String(editFields.transactionId || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, transactionId: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Currency</div>
                  <Input className="sm:col-span-3" value={String(editFields.currency || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, currency: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Amount</div>
                  <Input className="sm:col-span-3" type="number" value={editFields.amount as any} onChange={(e)=>setEditFields((p:any)=>({ ...p, amount: e.target.value ? Number(e.target.value) : "" }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Fee</div>
                  <Input className="sm:col-span-3" type="number" value={editFields.fee as any} onChange={(e)=>setEditFields((p:any)=>({ ...p, fee: e.target.value ? Number(e.target.value) : "" }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Payer</div>
                  <Input className="sm:col-span-3" value={String(editFields.payer || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, payer: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Received by</div>
                  <Input className="sm:col-span-3" value={String(editFields.receivedBy || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, receivedBy: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Bank name</div>
                  <Input className="sm:col-span-3" value={String(editFields.bankName || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, bankName: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Account</div>
                  <Input className="sm:col-span-3" value={String(editFields.account || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, account: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Receipt URL</div>
                  <Input className="sm:col-span-3" value={String(editFields.receiptUrl || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, receiptUrl: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-start">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Notes</div>
                  <Textarea className="sm:col-span-3" value={String(editFields.notes || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, notes: e.target.value }))} />
                </div>
              </div>
            ) : editKind === "expense" ? (
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Title</div>
                  <Input className="sm:col-span-3" value={String(editFields.title || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, title: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Date</div>
                  <div className="sm:col-span-3">
                    <DatePicker value={String(editFields.date || "")} onChange={(v)=>setEditFields((p:any)=>({ ...p, date: v }))} placeholder="Pick date" />
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Category</div>
                  <Input className="sm:col-span-3" value={String(editFields.category || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, category: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Vendor</div>
                  <Input className="sm:col-span-3" value={String(editFields.vendor || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, vendor: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Receipt URL</div>
                  <Input className="sm:col-span-3" value={String(editFields.receiptUrl || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, receiptUrl: e.target.value }))} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="text-sm font-medium">Reimbursable</div>
                    <div className="text-xs text-muted-foreground">Mark if reimbursable</div>
                  </div>
                  <Checkbox checked={Boolean(editFields.reimbursable)} onCheckedChange={(v)=>setEditFields((p:any)=>({ ...p, reimbursable: Boolean(v) }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Amount</div>
                  <Input className="sm:col-span-3" type="number" value={editFields.amount as any} onChange={(e)=>setEditFields((p:any)=>({ ...p, amount: e.target.value ? Number(e.target.value) : "" }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-start">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Notes</div>
                  <Textarea className="sm:col-span-3" value={String(editFields.notes || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, notes: e.target.value }))} />
                </div>
              </div>
            ) : editKind === "contract" ? (
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Title</div>
                  <Input className="sm:col-span-3" value={String(editFields.title || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, title: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Amount</div>
                  <Input className="sm:col-span-3" type="number" value={editFields.amount as any} onChange={(e)=>setEditFields((p:any)=>({ ...p, amount: e.target.value ? Number(e.target.value) : "" }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Contract date</div>
                  <div className="sm:col-span-3">
                    <DatePicker value={String(editFields.contractDate || "")} onChange={(v)=>setEditFields((p:any)=>({ ...p, contractDate: v }))} placeholder="Pick contract date" />
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Valid until</div>
                  <div className="sm:col-span-3">
                    <DatePicker value={String(editFields.validUntil || "")} onChange={(v)=>setEditFields((p:any)=>({ ...p, validUntil: v }))} placeholder="Pick valid until" />
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Status</div>
                  <Input className="sm:col-span-3" value={String(editFields.status || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, status: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Type</div>
                  <Input className="sm:col-span-3" value={String(editFields.type || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, type: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Owner</div>
                  <Input className="sm:col-span-3" value={String(editFields.owner || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, owner: e.target.value }))} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="text-sm font-medium">Signed</div>
                    <div className="text-xs text-muted-foreground">Mark if signed</div>
                  </div>
                  <Checkbox checked={Boolean(editFields.signed)} onCheckedChange={(v)=>setEditFields((p:any)=>({ ...p, signed: Boolean(v) }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-start">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Notes</div>
                  <Textarea className="sm:col-span-3" value={String(editFields.notes || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, notes: e.target.value }))} />
                </div>
              </div>
            ) : editKind === "task" ? (
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Title</div>
                  <Input className="sm:col-span-3" value={String(editFields.title || "")} onChange={(e)=>setEditFields((p:any)=>({ ...p, title: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Start</div>
                  <div className="sm:col-span-3">
                    <DatePicker 
                      value={String(editFields.start || "")} 
                      onChange={(v)=>setEditFields((p:any)=>({ ...p, start: v }))} 
                      placeholder="Pick start date" 
                      disabled={editKind === "task" && !canEditTask(tasks.find(t => t.id === editId) || null)}
                    />
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Deadline</div>
                  <div className="sm:col-span-3">
                    <DatePicker 
                      value={String(editFields.deadline || "")} 
                      onChange={(v)=>setEditFields((p:any)=>({ ...p, deadline: v }))} 
                      placeholder="Pick deadline" 
                      disabled={editKind === "task" && !canEditTask(tasks.find(t => t.id === editId) || null)}
                    />
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Status</div>
                  <div className="sm:col-span-3">
                    <Select value={String(editFields.status || "")} onValueChange={(v)=>setEditFields((p:any)=>({ ...p, status: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select status"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">To do</SelectItem>
                        <SelectItem value="in_progress">In progress</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Priority</div>
                  <div className="sm:col-span-3">
                    <Select value={String(editFields.priority || "")} onValueChange={(v)=>setEditFields((p:any)=>({ ...p, priority: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select priority"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-start">
                  <div className="text-sm text-muted-foreground sm:col-span-2">Files</div>
                  <div className="sm:col-span-3 space-y-2">
                    {/* Existing files */}
                    {editTaskFiles.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Existing files</div>
                        {editTaskFiles.map((file: any) => (
                          <div key={file._id} className="flex items-center justify-between gap-2 text-sm">
                            <a href={file.url || `${API_BASE}${file.path}`} target="_blank" rel="noreferrer" className="truncate text-primary hover:underline">
                              {file.name}
                            </a>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={!canDeleteAttachment(file)}
                              onClick={async () => {
                                if (!canDeleteAttachment(file)) {
                                  toast.error("You can only delete your own attachments");
                                  return;
                                }
                                try {
                                  await fetch(`${API_BASE}/api/files/${file._id}`, { method: "DELETE", headers: getAuthHeaders() });
                                  setEditTaskFiles((prev) => prev.filter((f) => f._id !== file._id));
                                  // Decrement attachments count in task list
                                  setTasks((prev) => prev.map((t) => (t.id === editId ? { ...t, attachments: Math.max(0, (t.attachments || 0) - 1) } : t)));
                                  toast.success("File deleted");
                                } catch {
                                  toast.error("Failed to delete file");
                                }
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* New files */}
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      id="edit-task-new-files"
                      onChange={(e) => setEditTaskNewFiles((prev) => [...prev, ...Array.from(e.target.files || [])])}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => document.getElementById("edit-task-new-files")?.click()}
                      disabled={!canUploadAttachment(tasks.find(t => t.id === editId) || null)}
                    >
                      <Paperclip className="w-4 h-4 mr-2"/> Add files
                    </Button>
                    {editTaskNewFiles.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">New files to upload</div>
                        {editTaskNewFiles.map((file, idx) => (
                          <div key={`${file.name}-${idx}`} className="flex items-center justify-between gap-2 text-sm">
                            <span className="truncate">{file.name}</span>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setEditTaskNewFiles((prev) => prev.filter((_, i) => i !== idx))}>
                              Remove
                            </Button>
                          </div>
                        ))}
                        <Button type="button" variant="ghost" size="sm" onClick={() => setEditTaskNewFiles([])}>Clear all</Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Select an item to edit.</div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
            <Button onClick={saveEdit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Task Dialog */}
      <Dialog open={viewTaskOpen} onOpenChange={setViewTaskOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {viewTaskData && (
              <>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="text-sm text-muted-foreground">Title</div>
                  <div className="sm:col-span-2 font-medium">{viewTaskData.title}</div>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div className="sm:col-span-2">
                    <Badge variant="outline">{viewTaskData.status}</Badge>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="text-sm text-muted-foreground">Priority</div>
                  <div className="sm:col-span-2">
                    <Badge variant={viewTaskData.priority === "high" ? "destructive" : viewTaskData.priority === "medium" ? "default" : "secondary"}>
                      {viewTaskData.priority}
                    </Badge>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="text-sm text-muted-foreground">Start Date</div>
                  <div className="sm:col-span-2">{viewTaskData.start}</div>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="text-sm text-muted-foreground">Deadline</div>
                  <div className="sm:col-span-2">{viewTaskData.deadline}</div>
                </div>
                {viewTaskData.assignedTo && (
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="text-sm text-muted-foreground">Assigned To</div>
                    <div className="sm:col-span-2">{viewTaskData.assignedTo}</div>
                  </div>
                )}
                {viewTaskData.collaborators && viewTaskData.collaborators.length > 0 && (
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="text-sm text-muted-foreground">Collaborators</div>
                    <div className="sm:col-span-2">{viewTaskData.collaborators.join(", ")}</div>
                  </div>
                )}
                {viewTaskData.labels && (
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="text-sm text-muted-foreground">Labels</div>
                    <div className="sm:col-span-2">{viewTaskData.labels}</div>
                  </div>
                )}
                
                {/* Attached Files Section */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Paperclip className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Attached Files</span>
                    <Badge variant="secondary">{viewTaskFiles.length}</Badge>
                  </div>
                  
                  {viewTaskFiles.length > 0 ? (
                    <div className="space-y-2">
                      {viewTaskFiles.map((file: any) => (
                        <div key={file._id} className="flex items-center justify-between gap-2 p-2 rounded-md border bg-muted/30">
                          <div className="flex items-center gap-2 min-w-0">
                            <Paperclip className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm truncate">{file.name}</span>
                            {file.size && (
                              <span className="text-xs text-muted-foreground">
                                ({(file.size / 1024).toFixed(1)} KB)
                              </span>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a 
                              href={file.url || `${API_BASE}${file.path}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              View
                            </a>
                          </Button>
                          {canDeleteAttachment(file) && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await fetch(`${API_BASE}/api/files/${file._id}`, { method: "DELETE", headers: getAuthHeaders() });
                                  setViewTaskFiles((prev) => prev.filter((f) => f._id !== file._id));
                                  // Decrement attachments count in task list
                                  setTasks((prev) => prev.map((t) => (t.id === viewTaskData?.id ? { ...t, attachments: Math.max(0, (t.attachments || 0) - 1) } : t)));
                                  toast.success("File deleted");
                                } catch {
                                  toast.error("Failed to delete file");
                                }
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">No files attached</div>
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
            {viewTaskData && canEditTask(viewTaskData) && (
              <Button onClick={() => {
                setViewTaskOpen(false);
                openEdit("task", viewTaskData);
              }}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit Task
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">Are you sure you want to delete {deleteLabel}?</div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDescOpen} onOpenChange={setEditDescOpen}>
        <DialogContent className="bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit description</DialogTitle>
          </DialogHeader>
          <Textarea value={descDraft} onChange={(e)=>setDescDraft(e.target.value)} className="min-h-[160px]" />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={saveDescription}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={membersOpen} onOpenChange={setMembersOpen}>
        <DialogContent className="bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage members</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input placeholder="Member name or email" value={newMember} onChange={(e)=>setNewMember(e.target.value)} />
              <Button variant="outline" onClick={()=>{ const v = newMember.trim(); if (!v) return; setMembersDraft(prev=> [v, ...prev]); setNewMember(""); }}>Add</Button>
            </div>
            <div className="space-y-2">
              {membersDraft.length === 0 ? (
                <div className="text-sm text-muted-foreground">No members yet.</div>
              ) : (
                membersDraft.map((m, idx) => (
                  <div key={`${m}-${idx}`} className="flex items-center gap-2">
                    <Input value={m} onChange={(e)=> setMembersDraft(prev => prev.map((x,i)=> i===idx ? e.target.value : x))} />
                    <Button variant="outline" onClick={()=> setMembersDraft(prev => prev.filter((_,i)=> i!==idx))}>Remove</Button>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
            <Button onClick={saveMembers}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
    </div>
  );
}

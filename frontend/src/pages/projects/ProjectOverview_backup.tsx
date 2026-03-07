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

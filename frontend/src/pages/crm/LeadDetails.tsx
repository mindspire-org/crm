import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import Events from "../events/Events";
import Files from "../files/Files";
import Notes from "../notes/Notes";
import { Paperclip, Mic, ExternalLink as ExternalLinkIcon } from "lucide-react";
import {
  Check,
  CheckCircle,
  Clock,
  Download,
  Plus,
  Printer,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { BackButton } from "@/components/ui/back-button";

type Employee = { _id: string; name?: string; firstName?: string; lastName?: string };

type LeadLabel = { _id: string; name: string; color?: string };

type LeadDoc = {
  _id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  expectedPrice?: string;
  systemNeeded?: string;
  type?: "Organization" | "Person";
  ownerId?: string;
  status?: string;
  source?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  website?: string;
  vatNumber?: string;
  gstNumber?: string;
  currency?: string;
  currencySymbol?: string;
  labels?: string[];
  createdAt?: string;
  conversationNotes?: string;
};

type ContactDoc = {
  _id: string;
  leadId?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  email: string;
  phone?: string;
  skype?: string;
  isPrimaryContact?: boolean;
  gender?: "male" | "female" | "other" | "";
};

type ReminderDoc = {
  _id: string;
  leadId: string;
  title?: string;
  dueAt?: string;
  repeat?: boolean;
  doneAt?: string;
  channel?: string;
  message?: string;
  createdAt?: string;
};

type TaskDoc = {
  _id: string;
  leadId?: string;
  title?: string;
  description?: string;
  points?: number;
  status?: string;
  priority?: string;
  start?: string;
  deadline?: string;
  assignees?: Array<{ name?: string; initials?: string }>;
  collaborators?: string[];
  tags?: string[];
  attachments?: number;
  createdAt?: string;
};

type ProjectDoc = {
  _id: string;
  title?: string;
};

type ContractDoc = {
  _id: string;
  leadId?: string;
  title?: string;
  projectId?: string;
  contractDate?: string;
  validUntil?: string;
  status?: string;
  tax1?: number;
  tax2?: number;
  note?: string;
  fileIds?: string[];
  createdAt?: string;
};

type ProposalDoc = {
  _id: string;
  leadId?: string;
  proposalDate?: string;
  validUntil?: string;
  status?: string;
  tax1?: number;
  tax2?: number;
  note?: string;
  fileIds?: string[];
  createdAt?: string;
};

type EstimateDoc = {
  _id: string;
  leadId?: string;
  number?: string;
  estimateDate?: string;
  validUntil?: string;
  status?: string;
  tax?: number;
  tax2?: number;
  note?: string;
  advancedAmount?: number;
  amount?: number;
  fileIds?: string[];
  createdAt?: string;
};

const STATUS_OPTIONS = [
  "New",
  "Qualified",
  "Discussion",
  "Negotiation",
  "Won",
  "Lost",
];

const SOURCE_OPTIONS = [
  "Website",
  "LinkedIn",
  "Referral",
  "Cold Call",
  "Trade Show",
  "WhatsApp",
];

const TABS = [
  { id: "contacts", label: "Contacts" },
  { id: "lead-info", label: "Lead info" },
  { id: "tasks", label: "Tasks" },
  { id: "estimates", label: "Estimates" },
  { id: "estimate-requests", label: "Estimate Requests" },
  { id: "proposals", label: "Proposals" },
  { id: "contracts", label: "Contracts" },
  { id: "notes", label: "Notes" },
  { id: "files", label: "Files" },
  { id: "events", label: "Events" },
] as const;

function toStr(v: any) {
  return v === undefined || v === null ? "" : String(v);
}

function formatLeadValue(lead?: LeadDoc | null) {
  const raw = String((lead as any)?.expectedPrice ?? "").trim();
  if (!raw) return "-";
  const cur = String((lead as any)?.currencySymbol || (lead as any)?.currency || "").trim();
  const n = Number(raw.replace(/,/g, ""));
  const formatted = Number.isFinite(n) ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n) : raw;
  return cur ? `${cur} ${formatted}` : formatted;
}

function parseTimeToHoursMinutes(raw: string) {
  const t = (raw || "").trim();
  if (!t) return { hh: 0, mm: 0 };

  // Accept "HH:MM" (24h)
  const m24 = t.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (m24) return { hh: Number(m24[1]), mm: Number(m24[2]) };

  // Accept "H:MM AM/PM" (12h)
  const m12 = t.match(/^([1-9]|1[0-2]):([0-5]\d)\s*([AaPp][Mm])$/);
  if (m12) {
    let hh = Number(m12[1]);
    const mm = Number(m12[2]);
    const ap = m12[3].toUpperCase();
    if (ap === "PM" && hh !== 12) hh += 12;
    if (ap === "AM" && hh === 12) hh = 0;
    return { hh, mm };
  }

  return null;
}

function formatYmd(iso?: string) {
  if (!iso) return "-";
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return "-";
  }
}

function statusLabel(s?: string) {
  const v = (s || "").toLowerCase();
  if (v === "in-progress") return "In progress";
  if (v === "todo") return "To do";
  if (v === "done") return "Done";
  if (v === "backlog") return "Backlog";
  if (v === "review") return "Review";
  return s || "-";
}

export default function LeadDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("contacts");
  const [loading, setLoading] = useState(false);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [labels, setLabels] = useState<LeadLabel[]>([]);
  const [projects, setProjects] = useState<ProjectDoc[]>([]);

  const employeeNames = useMemo(() => {
    return (employees || [])
      .map((e) => (e.name || `${e.firstName || ""} ${e.lastName || ""}`.trim() || "").trim())
      .filter(Boolean);
  }, [employees]);

  const [lead, setLead] = useState<LeadDoc | null>(null);
  const [leadForm, setLeadForm] = useState({
    type: "Organization" as "Organization" | "Person",
    name: "",
    email: "",
    phone: "",
    expectedPrice: "",
    systemNeeded: "",
    ownerId: "-",
    status: "New",
    source: "",
    website: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    vatNumber: "",
    gstNumber: "",
    currency: "",
    currencySymbol: "",
    labels: [] as string[],
    conversationNotes: "",
  });

  const [contacts, setContacts] = useState<ContactDoc[]>([]);
  const [contactsQuery, setContactsQuery] = useState("");

  const [tasks, setTasks] = useState<TaskDoc[]>([]);
  const [tasksQuery, setTasksQuery] = useState("");
  const [openAddTask, setOpenAddTask] = useState(false);
  const [taskUploading, setTaskUploading] = useState(false);
  const taskFilesRef = useRef<HTMLInputElement>(null);
  const [taskSelectedFiles, setTaskSelectedFiles] = useState<File[]>([]);
  const [taskForm, setTaskForm] = useState({
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

  const loadTasks = async () => {
    if (!id) return;
    try {
      const params = new URLSearchParams();
      params.set("leadId", id);
      const q = (tasksQuery || "").trim();
      if (q) params.set("q", q);
      const r = await fetch(`${API_BASE}/api/tasks?${params.toString()}`, { headers: getAuthHeaders() });
      if (r.ok) {
        const d = await r.json();
        setTasks(Array.isArray(d) ? d : []);
      }
    } catch {
      setTasks([]);
    }
  };

  useEffect(() => {
    if (activeTab !== "tasks") return;
    const t = window.setTimeout(() => {
      loadTasks();
    }, 200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, tasksQuery, id]);

  const resetTaskForm = () => {
    setTaskForm({
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

  const uploadTaskFiles = async () => {
    if (!taskSelectedFiles.length || !id) return 0;
    setTaskUploading(true);
    try {
      let uploaded = 0;
      for (const f of taskSelectedFiles) {
        const fd = new FormData();
        fd.append("file", f);
        fd.append("leadId", id);
        fd.append("name", f.name);
        const r = await fetch(`${API_BASE}/api/files`, { method: "POST", headers: getAuthHeaders(), body: fd });
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
    if (!id) return;
    const title = (taskForm.title || "").trim();
    if (!title) return;

    const attachmentsUploaded = await uploadTaskFiles();
    const payload: any = {
      leadId: id,
      title,
      description: (taskForm.description || "").trim() || undefined,
      points: taskForm.points ? Number(taskForm.points) : undefined,
      status: taskForm.status,
      priority: taskForm.priority,
      start: taskForm.start || undefined,
      deadline: taskForm.deadline || undefined,
      assignees: taskForm.assignTo ? [{ name: taskForm.assignTo, initials: taskForm.assignTo.slice(0, 2).toUpperCase() }] : [],
      collaborators: (taskForm.collaborators || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      tags: (taskForm.labels || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      attachments: attachmentsUploaded,
    };

    try {
      const r = await fetch(`${API_BASE}/api/tasks`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        const created = await r.json();
        setTasks((prev) => [created, ...prev]);
        toast.success("Task added");
        setOpenAddTask(false);
        resetTaskForm();
        if (mode === "save_show") navigate(`/tasks/${created._id}`);
        return;
      }
    } catch {
    }

    // fallback optimistic
    const optimistic: TaskDoc = {
      _id: crypto.randomUUID(),
      leadId: id,
      title,
      description: payload.description,
      points: payload.points,
      status: payload.status,
      priority: payload.priority,
      start: payload.start,
      deadline: payload.deadline,
      assignees: payload.assignees,
      collaborators: payload.collaborators,
      tags: payload.tags,
      attachments: payload.attachments,
    };
    setTasks((prev) => [optimistic, ...prev]);
    setOpenAddTask(false);
    resetTaskForm();
    if (mode === "save_show") navigate(`/tasks/${optimistic._id}`);
  };

  const [openReminders, setOpenReminders] = useState(false);
  const [remindersLoading, setRemindersLoading] = useState(false);
  const [reminders, setReminders] = useState<ReminderDoc[]>([]);
  const [reminderForm, setReminderForm] = useState({
    title: "",
    date: "",
    time: "",
    repeat: false,
  });

  const leadPhoneForWhatsapp = useMemo(() => {
    const p = (lead?.phone || leadForm.phone || contacts.find((c) => c.isPrimaryContact)?.phone || contacts[0]?.phone || "").toString();
    return p;
  }, [lead?.phone, leadForm.phone, contacts]);

  const openWhatsappFollowup = (msg: string) => {
    const phone = String(leadPhoneForWhatsapp || "")
      .trim()
      .replace(/[^0-9]/g, "");
    if (!phone) {
      toast.error("No phone number found");
      return;
    }
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const [contracts, setContracts] = useState<ContractDoc[]>([]);
  const [contractsQuery, setContractsQuery] = useState("");
  const [openAddContract, setOpenAddContract] = useState(false);
  const [contractForm, setContractForm] = useState({
    title: "",
    contractDate: "",
    validUntil: "",
    projectId: "-",
    tax1: "0",
    tax2: "0",
    note: "",
  });
  const contractFilesRef = useRef<HTMLInputElement>(null);
  const [contractSelectedFiles, setContractSelectedFiles] = useState<File[]>([]);

  const [proposals, setProposals] = useState<ProposalDoc[]>([]);
  const [proposalsQuery, setProposalsQuery] = useState("");
  const [openAddProposal, setOpenAddProposal] = useState(false);
  const [proposalForm, setProposalForm] = useState({
    title: "",
    amount: "",
    proposalDate: "",
    validUntil: "",
    tax1: "0",
    tax2: "0",
    note: "",
  });
  const proposalFilesRef = useRef<HTMLInputElement>(null);
  const [proposalSelectedFiles, setProposalSelectedFiles] = useState<File[]>([]);

  const [estimates, setEstimates] = useState<EstimateDoc[]>([]);
  const [estimatesQuery, setEstimatesQuery] = useState("");
  const [openAddEstimate, setOpenAddEstimate] = useState(false);
  const [estimateForm, setEstimateForm] = useState({
    estimateDate: "",
    validUntil: "",
    tax: "0",
    tax2: "0",
    note: "",
    advancedAmount: "",
  });
  const estimateFilesRef = useRef<HTMLInputElement>(null);
  const [estimateSelectedFiles, setEstimateSelectedFiles] = useState<File[]>([]);

  const [openAddContact, setOpenAddContact] = useState(false);
  const [contactForm, setContactForm] = useState({
    firstName: "",
    lastName: "",
    jobTitle: "",
    email: "",
    phone: "",
    skype: "",
    isPrimaryContact: false,
    gender: "" as "male" | "female" | "other" | "",
  });

  const [convertMode, setConvertMode] = useState<"client" | "contact">("client");
  const [makeClientOpen, setMakeClientOpen] = useState(false);
  const [makeClientStep, setMakeClientStep] = useState<"details" | "contact">("details");
  const [makeClientForm, setMakeClientForm] = useState({
    type: "Organization" as "Organization" | "Person",
    name: "",
    owner: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    phone: "",
    website: "",
    vatNumber: "",
    gstNumber: "",
    clientGroups: "",
    labels: "",
    currency: "",
    currencySymbol: "",
    disableOnlinePayment: false,
    firstName: "",
    lastName: "",
    email: "",
    contactPhone: "",
    skype: "",
    jobTitle: "",
    gender: "male" as "male" | "female" | "other",
    password: "",
    primaryContact: true,
  });

  const contactsPrintRef = useRef<HTMLDivElement>(null);

  const primaryContact = useMemo(() => {
    return contacts.find((c) => c.isPrimaryContact);
  }, [contacts]);

  const employeeNameById = useMemo(() => {
    const m = new Map<string, string>();
    employees.forEach((e) => {
      const name = (e.name || `${e.firstName || ""} ${e.lastName || ""}`.trim() || "-").trim();
      if (e._id) m.set(e._id, name);
    });
    return m;
  }, [employees]);

  const projectTitleById = useMemo(() => {
    const m = new Map<string, string>();
    projects.forEach((p) => {
      if (p._id) m.set(p._id, p.title || "-");
    });
    return m;
  }, [projects]);

  const title = lead?.name || "Lead";
  const leadClientName = lead?.name || "";

  const formatDateTime = (iso?: string) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      const yyyyMmDd = d.toISOString().slice(0, 10);
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${yyyyMmDd} ${hh}:${mm}`;
    } catch {
      return "";
    }
  };

  const loadProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/projects`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      setProjects(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load projects");
    }
  };

  const uploadLeadFiles = async (filesToUpload: File[]) => {
    if (!id) return [] as string[];
    const uploadedIds: string[] = [];
    for (const f of filesToUpload) {
      const fd = new FormData();
      fd.append("leadId", id);
      fd.append("name", f.name);
      fd.append("file", f);
      const res = await fetch(`${API_BASE}/api/files`, { method: "POST", headers: getAuthHeaders(), body: fd });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      if (json?._id) uploadedIds.push(String(json._id));
    }
    return uploadedIds;
  };

  const loadContracts = async () => {
    if (!id) return;
    try {
      const params = new URLSearchParams();
      params.set("leadId", id);
      if (contractsQuery.trim()) params.set("q", contractsQuery.trim());
      const res = await fetch(`${API_BASE}/api/contracts?${params.toString()}`, { headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      setContracts(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load contracts");
    }
  };

  const saveContract = async () => {
    if (!id) return;
    try {
      const t = contractForm.title.trim();
      if (!t) {
        toast.error("Title is required");
        return;
      }

      const fileIds = contractSelectedFiles.length ? await uploadLeadFiles(contractSelectedFiles) : [];
      const res = await fetch(`${API_BASE}/api/contracts`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          leadId: id,
          client: leadClientName,
          title: t,
          contractDate: contractForm.contractDate ? new Date(contractForm.contractDate).toISOString() : undefined,
          validUntil: contractForm.validUntil ? new Date(contractForm.validUntil).toISOString() : undefined,
          projectId: contractForm.projectId !== "-" ? contractForm.projectId : undefined,
          tax1: Number(contractForm.tax1 || 0),
          tax2: Number(contractForm.tax2 || 0),
          note: contractForm.note || "",
          fileIds,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");

      toast.success("Contract created");
      setOpenAddContract(false);
      setContractForm({ title: "", contractDate: "", validUntil: "", projectId: "-", tax1: "0", tax2: "0", note: "" });
      setContractSelectedFiles([]);
      if (contractFilesRef.current) contractFilesRef.current.value = "";
      await loadContracts();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save contract");
    }
  };

  const deleteContract = async (contractId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/contracts/${contractId}`, { method: "DELETE", headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      toast.success("Contract deleted");
      await loadContracts();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete contract");
    }
  };

  const loadProposals = async () => {
    if (!id) return;
    try {
      const params = new URLSearchParams();
      params.set("leadId", id);
      if (proposalsQuery.trim()) params.set("q", proposalsQuery.trim());
      const res = await fetch(`${API_BASE}/api/proposals?${params.toString()}`, { headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      setProposals(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load proposals");
    }
  };

  const saveProposal = async () => {
    if (!id) return;
    try {
      if (!proposalForm.proposalDate) {
        toast.error("Proposal date is required");
        return;
      }

      const fileIds = proposalSelectedFiles.length ? await uploadLeadFiles(proposalSelectedFiles) : [];
      const res = await fetch(`${API_BASE}/api/proposals`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          leadId: id,
          client: leadClientName,
          title: proposalForm.title || "",
          amount: proposalForm.amount ? Number(proposalForm.amount) : 0,
          proposalDate: proposalForm.proposalDate ? new Date(proposalForm.proposalDate).toISOString() : undefined,
          validUntil: proposalForm.validUntil ? new Date(proposalForm.validUntil).toISOString() : undefined,
          tax1: Number(proposalForm.tax1 || 0),
          tax2: Number(proposalForm.tax2 || 0),
          note: proposalForm.note || "",
          fileIds,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");

      toast.success("Proposal created");
      setOpenAddProposal(false);
      setProposalForm({ title: "", amount: "", proposalDate: "", validUntil: "", tax1: "0", tax2: "0", note: "" });
      setProposalSelectedFiles([]);
      if (proposalFilesRef.current) proposalFilesRef.current.value = "";
      await loadProposals();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save proposal");
    }
  };

  const deleteProposal = async (proposalId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/proposals/${proposalId}`, { method: "DELETE", headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      toast.success("Proposal deleted");
      await loadProposals();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete proposal");
    }
  };

  const loadEstimates = async () => {
    if (!id) return;
    try {
      const params = new URLSearchParams();
      params.set("leadId", id);
      if (estimatesQuery.trim()) params.set("q", estimatesQuery.trim());
      const res = await fetch(`${API_BASE}/api/estimates?${params.toString()}`, { headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      setEstimates(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load estimates");
    }
  };

  const saveEstimate = async () => {
    if (!id) return;
    try {
      if (!estimateForm.estimateDate) {
        toast.error("Estimate date is required");
        return;
      }

      const fileIds = estimateSelectedFiles.length ? await uploadLeadFiles(estimateSelectedFiles) : [];
      const res = await fetch(`${API_BASE}/api/estimates`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          leadId: id,
          client: leadClientName || "-",
          estimateDate: estimateForm.estimateDate ? new Date(estimateForm.estimateDate).toISOString() : undefined,
          validUntil: estimateForm.validUntil ? new Date(estimateForm.validUntil).toISOString() : undefined,
          tax: Number(estimateForm.tax || 0),
          tax2: Number(estimateForm.tax2 || 0),
          note: estimateForm.note || "",
          advancedAmount: estimateForm.advancedAmount ? Number(estimateForm.advancedAmount || 0) : 0,
          items: [],
          fileIds,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");

      toast.success("Estimate created");
      setOpenAddEstimate(false);
      setEstimateForm({ estimateDate: "", validUntil: "", tax: "0", tax2: "0", note: "", advancedAmount: "" });
      setEstimateSelectedFiles([]);
      if (estimateFilesRef.current) estimateFilesRef.current.value = "";
      await loadEstimates();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save estimate");
    }
  };

  const deleteEstimate = async (estimateId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/estimates/${estimateId}`, { method: "DELETE", headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      toast.success("Estimate deleted");
      await loadEstimates();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete estimate");
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/employees`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load employees");
    }
  };

  const loadReminders = async () => {
    if (!id) return;
    try {
      setRemindersLoading(true);
      const params = new URLSearchParams();
      params.set("leadId", id);
      const res = await fetch(`${API_BASE}/api/reminders?${params.toString()}`, { headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Reminders API not found. Restart backend server.");
        throw new Error(json?.error || "Failed");
      }
      setReminders(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load reminders");
    } finally {
      setRemindersLoading(false);
    }
  };

  const addReminder = async () => {
    if (!id) return;
    try {
      const title = reminderForm.title.trim();
      if (!title) {
        toast.error("Title is required");
        return;
      }
      if (!reminderForm.date) {
        toast.error("Date is required");
        return;
      }
      const parts = parseTimeToHoursMinutes(reminderForm.time);
      if (!parts) {
        toast.error("Invalid time format");
        return;
      }
      const dueAt = new Date(`${reminderForm.date}T00:00:00`);
      dueAt.setHours(parts.hh, parts.mm, 0, 0);
      if (Number.isNaN(dueAt.getTime())) {
        toast.error("Invalid date/time");
        return;
      }

      const res = await fetch(`${API_BASE}/api/reminders`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          leadId: id,
          title,
          repeat: reminderForm.repeat,
          dueAt: dueAt.toISOString(),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Reminders API not found. Restart backend server.");
        throw new Error(json?.error || "Failed");
      }

      setReminderForm({ title: "", date: "", time: "", repeat: false });
      if (json?._id) {
        setReminders((p) => [json, ...p]);
      }
      await loadReminders();
      toast.success("Reminder added");
    } catch (e: any) {
      toast.error(e?.message || "Failed to add reminder");
    }
  };

  const setReminderDone = async (rid: string, done: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/api/reminders/${rid}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ doneAt: done ? new Date().toISOString() : null }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      await loadReminders();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update reminder");
    }
  };

  const makePrimaryContact = async (contactId: string) => {
    try {
      const updates = contacts
        .filter((c) => c._id !== contactId && c.isPrimaryContact)
        .map((c) =>
          fetch(`${API_BASE}/api/contacts/${c._id}`, {
            method: "PUT",
            headers: getAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ isPrimaryContact: false }),
          })
        );
      await Promise.all(updates);
      const res = await fetch(`${API_BASE}/api/contacts/${contactId}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ isPrimaryContact: true }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      toast.success("Primary contact updated");
      await loadContacts();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update primary contact");
    }
  };

  const deleteReminder = async (rid: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/reminders/${rid}`, { method: "DELETE", headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      await loadReminders();
      toast.success("Reminder deleted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete reminder");
    }
  };

  const loadLabels = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/lead-labels`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setLabels(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load labels");
    }
  };

  const loadLead = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/leads/${id}`, { headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      setLead(json);
      setLeadForm({
        type: json?.type || "Organization",
        name: json?.name || "",
        email: json?.email || "",
        phone: json?.phone || "",
        expectedPrice: json?.expectedPrice || "",
        systemNeeded: json?.systemNeeded || "",
        ownerId: json?.ownerId || "-",
        status: json?.status || "New",
        source: json?.source || "",
        website: json?.website || "",
        address: json?.address || "",
        city: json?.city || "",
        state: json?.state || "",
        zip: json?.zip || "",
        country: json?.country || "",
        vatNumber: json?.vatNumber || "",
        gstNumber: json?.gstNumber || "",
        currency: json?.currency || "",
        currencySymbol: json?.currencySymbol || "",
        labels: Array.isArray(json?.labels) ? json.labels.map((x: any) => x?.toString?.() ?? String(x)) : [],
        conversationNotes: json?.conversationNotes || "",
      });
    } catch (e: any) {
      toast.error(e?.message || "Failed to load lead");
    } finally {
      setLoading(false);
    }
  };

  const loadContacts = async () => {
    if (!id) return;
    try {
      const params = new URLSearchParams();
      params.set("leadId", id);
      if (contactsQuery.trim()) params.set("q", contactsQuery.trim());
      const res = await fetch(`${API_BASE}/api/contacts?${params.toString()}`, { headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      setContacts(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load contacts");
    }
  };

  useEffect(() => {
    loadEmployees();
    loadLabels();
    loadProjects();
  }, []);

  useEffect(() => {
    loadLead();
    loadContacts();
  }, [id]);

  useEffect(() => {
    if (!openReminders) return;
    loadReminders();
  }, [openReminders, id]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      loadContacts();
    }, 250);
    return () => window.clearTimeout(t);
  }, [contactsQuery]);

  useEffect(() => {
    if (activeTab !== "contracts") return;
    loadContracts();
  }, [activeTab, id]);

  useEffect(() => {
    if (activeTab !== "contracts") return;
    const t = window.setTimeout(() => {
      loadContracts();
    }, 250);
    return () => window.clearTimeout(t);
  }, [contractsQuery, activeTab]);

  useEffect(() => {
    if (activeTab !== "proposals") return;
    loadProposals();
  }, [activeTab, id]);

  useEffect(() => {
    if (activeTab !== "proposals") return;
    const t = window.setTimeout(() => {
      loadProposals();
    }, 250);
    return () => window.clearTimeout(t);
  }, [proposalsQuery, activeTab]);

  useEffect(() => {
    if (activeTab !== "estimates") return;
    loadEstimates();
  }, [activeTab, id]);

  useEffect(() => {
    if (activeTab !== "estimates") return;
    const t = window.setTimeout(() => {
      loadEstimates();
    }, 250);
    return () => window.clearTimeout(t);
  }, [estimatesQuery, activeTab]);

  const toggleLeadLabel = (labelId: string) => {
    const lid = labelId?.toString?.() ?? String(labelId);
    setLeadForm((p) => {
      const selected = (p.labels || []).some((x) => (x?.toString?.() ?? String(x)) === lid);
      return { ...p, labels: selected ? [] : [lid] };
    });
  };

  const saveLead = async () => {
    if (!id) return;
    try {
      if (!leadForm.name.trim()) {
        toast.error("Name is required");
        return;
      }
      const payload: any = {
        type: leadForm.type,
        name: leadForm.name.trim(),
        email: leadForm.email,
        phone: leadForm.phone,
        expectedPrice: leadForm.expectedPrice,
        systemNeeded: leadForm.systemNeeded,
        status: leadForm.status,
        source: leadForm.source,
        website: leadForm.website,
        address: leadForm.address,
        city: leadForm.city,
        state: leadForm.state,
        zip: leadForm.zip,
        country: leadForm.country,
        vatNumber: leadForm.vatNumber,
        gstNumber: leadForm.gstNumber,
        currency: leadForm.currency,
        currencySymbol: leadForm.currencySymbol,
        labels: (leadForm.labels || []).map((x) => x?.toString?.() ?? String(x)),
        conversationNotes: leadForm.conversationNotes,
      };
      if (leadForm.ownerId !== "-") payload.ownerId = leadForm.ownerId;

      const res = await fetch(`${API_BASE}/api/leads/${id}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      toast.success("Saved");
      setLead(json);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    }
  };

  const openNewContract = () => {
    setContractForm({ title: "", contractDate: "", validUntil: "", projectId: "-", tax1: "0", tax2: "0", note: "" });
    setContractSelectedFiles([]);
    if (contractFilesRef.current) contractFilesRef.current.value = "";
    setOpenAddContract(true);
  };

  const openNewProposal = () => {
    setProposalForm({ title: "", amount: "", proposalDate: "", validUntil: "", tax1: "0", tax2: "0", note: "" });
    setProposalSelectedFiles([]);
    if (proposalFilesRef.current) proposalFilesRef.current.value = "";
    setOpenAddProposal(true);
  };

  const openNewEstimate = () => {
    setEstimateForm({ estimateDate: "", validUntil: "", tax: "0", tax2: "0", note: "", advancedAmount: "" });
    setEstimateSelectedFiles([]);
    if (estimateFilesRef.current) estimateFilesRef.current.value = "";
    setOpenAddEstimate(true);
  };

  const openNewContact = () => {
    setContactForm({
      firstName: "",
      lastName: "",
      jobTitle: "",
      email: "",
      phone: "",
      skype: "",
      isPrimaryContact: false,
      gender: "",
    });
    setOpenAddContact(true);
  };

  const saveContact = async () => {
    if (!id) return;
    try {
      const firstName = contactForm.firstName.trim();
      const lastName = contactForm.lastName.trim();
      if (!firstName) {
        toast.error("First name is required");
        return;
      }
      if (!contactForm.email.trim()) {
        toast.error("Email is required");
        return;
      }

      const fullName = `${firstName}${lastName ? ` ${lastName}` : ""}`.trim();

      if (contactForm.isPrimaryContact) {
        await Promise.all(
          contacts
            .filter((c) => c.isPrimaryContact)
            .map((c) =>
              fetch(`${API_BASE}/api/contacts/${c._id}`, {
                method: "PUT",
                headers: getAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ isPrimaryContact: false }),
              })
            )
        );
      }

      const res = await fetch(`${API_BASE}/api/contacts`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          leadId: id,
          name: fullName,
          firstName,
          lastName,
          jobTitle: contactForm.jobTitle,
          email: contactForm.email.trim(),
          phone: contactForm.phone,
          skype: contactForm.skype,
          isPrimaryContact: contactForm.isPrimaryContact,
          gender: contactForm.gender,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");

      toast.success("Contact added");
      setOpenAddContact(false);
      await loadContacts();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save contact");
    }
  };

  const deleteContact = async (contactId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/contacts/${contactId}`, { method: "DELETE", headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      toast.success("Contact deleted");
      await loadContacts();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete contact");
    }
  };

  const downloadCsv = (filename: string, rows: string[][]) => {
    const csv = rows
      .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportContacts = () => {
    const rows: string[][] = [
      ["Name", "Job title", "Email", "Phone", "Skype", "Primary"],
      ...contacts.map((c) => [
        c.name || "",
        c.jobTitle || "",
        c.email || "",
        c.phone || "",
        c.skype || "",
        c.isPrimaryContact ? "Yes" : "No",
      ]),
    ];
    downloadCsv(`lead_${id}_contacts.csv`, rows);
  };

  const exportContracts = () => {
    const rows: string[][] = [
      ["Title", "Project", "Contract Date", "Valid Until", "Tax1", "Tax2", "Status", "Note"],
      ...contracts.map((c) => [
        c.title || "",
        c.projectId ? (projectTitleById.get(c.projectId) || "-") : "-",
        formatYmd(c.contractDate),
        formatYmd(c.validUntil),
        String(c.tax1 ?? 0),
        String(c.tax2 ?? 0),
        c.status || "-",
        c.note || "",
      ]),
    ];
    downloadCsv(`lead_${id}_contracts.csv`, rows);
  };

  const exportProposals = () => {
    const rows: string[][] = [
      ["Proposal Date", "Valid Until", "Tax1", "Tax2", "Status", "Note"],
      ...proposals.map((p) => [
        formatYmd(p.proposalDate),
        formatYmd(p.validUntil),
        String(p.tax1 ?? 0),
        String(p.tax2 ?? 0),
        p.status || "-",
        p.note || "",
      ]),
    ];
    downloadCsv(`lead_${id}_proposals.csv`, rows);
  };

  const exportEstimates = () => {
    const rows: string[][] = [
      ["Estimate Date", "Valid Until", "Tax", "Tax2", "Advanced", "Amount", "Status", "Note"],
      ...estimates.map((e) => [
        formatYmd(e.estimateDate),
        formatYmd(e.validUntil),
        String(e.tax ?? 0),
        String(e.tax2 ?? 0),
        String(e.advancedAmount ?? 0),
        String(e.amount ?? 0),
        e.status || "-",
        e.note || "",
      ]),
    ];
    downloadCsv(`lead_${id}_estimates.csv`, rows);
  };

  const printContacts = () => {
    const rowsHtml = contacts
      .map((c) => {
        return `
          <tr>
            <td>${toStr(c.name)}</td>
            <td>${toStr(c.jobTitle)}</td>
            <td>${toStr(c.email)}</td>
            <td>${toStr(c.phone)}</td>
            <td>${toStr(c.skype)}</td>
            <td>${c.isPrimaryContact ? "Yes" : "No"}</td>
          </tr>`;
      })
      .join("");

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Contacts</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 16px; }
      h1 { font-size: 18px; margin: 0 0 12px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
      th { background: #f5f5f5; text-align: left; }
    </style>
  </head>
  <body>
    <h1>Contacts</h1>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Job title</th>
          <th>Email</th>
          <th>Phone</th>
          <th>Skype</th>
          <th>Primary</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  </body>
</html>
<script>
  window.onload = function () {
    try { window.focus(); } catch (e) {}
    try { window.print(); } catch (e) {}
  };
</script>`;

    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Popup blocked");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const printEstimates = () => {
    const rowsHtml = estimates
      .map((e) => {
        return `
          <tr>
            <td>${toStr(formatYmd(e.estimateDate))}</td>
            <td>${toStr(formatYmd(e.validUntil))}</td>
            <td>${toStr(e.tax ?? 0)}</td>
            <td>${toStr(e.tax2 ?? 0)}</td>
            <td>${toStr(e.advancedAmount ?? 0)}</td>
            <td>${toStr(e.amount ?? 0)}</td>
            <td>${toStr(e.status || "-")}</td>
            <td>${toStr(e.note)}</td>
          </tr>`;
      })
      .join("");

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Estimates</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 16px; }
      h1 { font-size: 18px; margin: 0 0 12px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
      th { background: #f5f5f5; text-align: left; }
    </style>
  </head>
  <body>
    <h1>Estimates</h1>
    <table>
      <thead>
        <tr>
          <th>Estimate Date</th>
          <th>Valid Until</th>
          <th>Tax</th>
          <th>Tax2</th>
          <th>Advanced</th>
          <th>Amount</th>
          <th>Status</th>
          <th>Note</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  </body>
</html>
<script>
  window.onload = function () {
    try { window.focus(); } catch (e) {}
    try { window.print(); } catch (e) {}
  };
</script>`;

    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Popup blocked");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const printProposals = () => {
    const rowsHtml = proposals
      .map((p) => {
        return `
          <tr>
            <td>${toStr(formatYmd(p.proposalDate))}</td>
            <td>${toStr(formatYmd(p.validUntil))}</td>
            <td>${toStr(p.tax1 ?? 0)}</td>
            <td>${toStr(p.tax2 ?? 0)}</td>
            <td>${toStr(p.status || "-")}</td>
            <td>${toStr(p.note)}</td>
          </tr>`;
      })
      .join("");

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Proposals</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 16px; }
      h1 { font-size: 18px; margin: 0 0 12px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
      th { background: #f5f5f5; text-align: left; }
    </style>
  </head>
  <body>
    <h1>Proposals</h1>
    <table>
      <thead>
        <tr>
          <th>Proposal Date</th>
          <th>Valid Until</th>
          <th>Tax1</th>
          <th>Tax2</th>
          <th>Status</th>
          <th>Note</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  </body>
</html>
<script>
  window.onload = function () {
    try { window.focus(); } catch (e) {}
    try { window.print(); } catch (e) {}
  };
</script>`;

    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Popup blocked");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const printContracts = () => {
    const rowsHtml = contracts
      .map((c) => {
        const project = c.projectId ? (projectTitleById.get(c.projectId) || "-") : "-";
        return `
          <tr>
            <td>${toStr(c.title)}</td>
            <td>${toStr(project)}</td>
            <td>${toStr(formatYmd(c.contractDate))}</td>
            <td>${toStr(formatYmd(c.validUntil))}</td>
            <td>${toStr(c.tax1 ?? 0)}</td>
            <td>${toStr(c.tax2 ?? 0)}</td>
            <td>${toStr(c.status || "-")}</td>
            <td>${toStr(c.note)}</td>
          </tr>`;
      })
      .join("");

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Contracts</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 16px; }
      h1 { font-size: 18px; margin: 0 0 12px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
      th { background: #f5f5f5; text-align: left; }
    </style>
  </head>
  <body>
    <h1>Contracts</h1>
    <table>
      <thead>
        <tr>
          <th>Title</th>
          <th>Project</th>
          <th>Contract Date</th>
          <th>Valid Until</th>
          <th>Tax1</th>
          <th>Tax2</th>
          <th>Status</th>
          <th>Note</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  </body>
</html>
<script>
  window.onload = function () {
    try { window.focus(); } catch (e) {}
    try { window.print(); } catch (e) {}
  };
</script>`;

    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Popup blocked");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const openConvertDialog = (mode: "client" | "contact") => {
    if (!lead) return;
    const ownerName = lead.ownerId ? (employeeNameById.get(lead.ownerId) || "") : "";
    const primary = contacts.find((c) => c.isPrimaryContact);
    const full = (primary?.name || "").trim();
    const [fn, ...rest] = full.split(" ").filter(Boolean);
    const ln = rest.join(" ").trim();

    setConvertMode(mode);
    setMakeClientStep(mode === "contact" ? "contact" : "details");
    setMakeClientForm({
      type: lead.type || "Organization",
      name: lead.name || "",
      owner: ownerName,
      address: lead.address || "",
      city: lead.city || "",
      state: lead.state || "",
      zip: lead.zip || "",
      country: lead.country || "",
      phone: lead.phone || "",
      website: lead.website || "",
      vatNumber: lead.vatNumber || "",
      gstNumber: lead.gstNumber || "",
      clientGroups: "",
      labels: "",
      currency: lead.currency || "",
      currencySymbol: lead.currencySymbol || "",
      disableOnlinePayment: false,
      firstName: primary?.firstName || fn || "",
      lastName: primary?.lastName || ln || "",
      email: primary?.email || lead.email || "",
      contactPhone: primary?.phone || lead.phone || "",
      skype: primary?.skype || "",
      jobTitle: primary?.jobTitle || "",
      gender: (primary?.gender as any) || "male",
      password: "",
      primaryContact: true,
    });
    setMakeClientOpen(true);
  };

  const createLeadContactFromForm = async (leadId: string) => {
    const firstName = makeClientForm.firstName.trim();
    const lastName = makeClientForm.lastName.trim();
    if (!firstName) {
      toast.error("First name is required");
      return null;
    }
    if (!makeClientForm.email.trim()) {
      toast.error("Email is required");
      return null;
    }
    const fullName = `${firstName}${lastName ? ` ${lastName}` : ""}`.trim();

    if (makeClientForm.primaryContact) {
      await Promise.all(
        contacts
          .filter((c) => c.isPrimaryContact)
          .map((c) =>
            fetch(`${API_BASE}/api/contacts/${c._id}`, {
              method: "PUT",
              headers: getAuthHeaders({ "Content-Type": "application/json" }),
              body: JSON.stringify({ isPrimaryContact: false }),
            })
          )
      );
    }

    const res = await fetch(`${API_BASE}/api/contacts`, {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        leadId,
        name: fullName,
        firstName,
        lastName,
        jobTitle: makeClientForm.jobTitle,
        email: makeClientForm.email.trim(),
        phone: makeClientForm.contactPhone || makeClientForm.phone,
        skype: makeClientForm.skype,
        isPrimaryContact: Boolean(makeClientForm.primaryContact),
        gender: makeClientForm.gender,
      }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error || "Failed to create contact");
    return json;
  };

  const saveMakeClient = async () => {
    if (!lead || !id) return;
    try {
      if (convertMode === "contact") {
        await createLeadContactFromForm(id);
        toast.success("Contact added");
        setMakeClientOpen(false);
        await loadContacts();
        return;
      }

      const isOrg = makeClientForm.type === "Organization";
      const payload: any = {
        type: isOrg ? "org" : "person",
        company: isOrg ? makeClientForm.name : "",
        person: isOrg ? "" : makeClientForm.name,
        owner: makeClientForm.owner,
        email: makeClientForm.email.trim(),
        phone: makeClientForm.phone,
        website: makeClientForm.website,
        address: makeClientForm.address,
        city: makeClientForm.city,
        state: makeClientForm.state,
        zip: makeClientForm.zip,
        country: makeClientForm.country,
        vatNumber: makeClientForm.vatNumber,
        gstNumber: makeClientForm.gstNumber,
        currency: makeClientForm.currency,
        currencySymbol: makeClientForm.currencySymbol,
        clientGroups: makeClientForm.clientGroups,
        labels: makeClientForm.labels,
        disableOnlinePayment: Boolean(makeClientForm.disableOnlinePayment),
        primaryContact: {
          firstName: makeClientForm.firstName.trim(),
          lastName: makeClientForm.lastName.trim(),
          email: makeClientForm.email.trim(),
          phone: makeClientForm.contactPhone || makeClientForm.phone,
          skype: makeClientForm.skype,
          jobTitle: makeClientForm.jobTitle,
          gender: makeClientForm.gender,
          password: makeClientForm.password,
          isPrimaryContact: Boolean(makeClientForm.primaryContact),
        },
      };

      const res = await fetch(`${API_BASE}/api/clients`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to create client");

      try {
        await createLeadContactFromForm(id);
      } catch {
        // ignore
      }

      toast.success("Client created");
      setMakeClientOpen(false);
      await loadContacts();
      if (json?._id) navigate(`/clients/${json._id}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to create client");
    }
  };

  const SimpleEmptyTab = ({ title }: { title: string }) => {
    return (
      <Card>
        <CardHeader className="p-4">
          <div className="text-sm font-medium">{title}</div>
        </CardHeader>
        <CardContent className="p-4 text-sm text-muted-foreground">No record found.</CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton to="/leads" />
          <div>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              Lead details - {title}
              {lead?.status === "Won" && lead?.approvalStatus === "pending" && (
                <Badge variant="outline" className="text-yellow-600 bg-yellow-50 border-yellow-200">
                  <Clock className="w-3 h-3 mr-1" />
                  Pending Approval
                </Badge>
              )}
              {lead?.status === "Won" && lead?.approvalStatus === "approved" && (
                <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Approved
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Primary contact: <span className="text-foreground">{primaryContact?.name || "-"}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Lead value: <span className="text-foreground font-medium">{formatLeadValue(lead)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => setOpenReminders(true)}>Reminders</Button>
          <Button type="button" onClick={() => openConvertDialog("client")}>Make client</Button>
        </div>
      </div>

      <Dialog open={makeClientOpen} onOpenChange={setMakeClientOpen}>
        <DialogContent className="bg-card max-w-3xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {convertMode === "contact"
                ? (lead?.name ? `+ Contact: ${lead.name}` : "+ Contact")
                : (lead?.name ? `Make client: ${lead.name}` : "Make client")}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={makeClientStep} onValueChange={(v) => setMakeClientStep(v as any)}>
            <TabsList className="bg-muted/40">
              <TabsTrigger value="details" disabled={convertMode === "contact"}>Client details</TabsTrigger>
              <TabsTrigger value="contact">Client contacts</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <Label className="sm:col-span-2 text-muted-foreground">Type</Label>
                  <div className="sm:col-span-10">
                    <RadioGroup
                      value={makeClientForm.type}
                      onValueChange={(v) => setMakeClientForm((p) => ({ ...p, type: v as any }))}
                      className="flex items-center gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Organization" id="client-type-org" />
                        <Label htmlFor="client-type-org">Organization</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Person" id="client-type-person" />
                        <Label htmlFor="client-type-person">Person</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input value={makeClientForm.name} onChange={(e) => setMakeClientForm((p) => ({ ...p, name: e.target.value }))} />
                </div>

                <div className="space-y-1">
                  <Label>Owner</Label>
                  <Input value={makeClientForm.owner} onChange={(e) => setMakeClientForm((p) => ({ ...p, owner: e.target.value }))} placeholder="Owner" />
                </div>

                <div className="space-y-1">
                  <Label>Address</Label>
                  <Textarea value={makeClientForm.address} onChange={(e) => setMakeClientForm((p) => ({ ...p, address: e.target.value }))} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>City</Label><Input value={makeClientForm.city} onChange={(e) => setMakeClientForm((p) => ({ ...p, city: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>State</Label><Input value={makeClientForm.state} onChange={(e) => setMakeClientForm((p) => ({ ...p, state: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Zip</Label><Input value={makeClientForm.zip} onChange={(e) => setMakeClientForm((p) => ({ ...p, zip: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Country</Label><Input value={makeClientForm.country} onChange={(e) => setMakeClientForm((p) => ({ ...p, country: e.target.value }))} /></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Phone</Label><Input value={makeClientForm.phone} onChange={(e) => setMakeClientForm((p) => ({ ...p, phone: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Website</Label><Input value={makeClientForm.website} onChange={(e) => setMakeClientForm((p) => ({ ...p, website: e.target.value }))} /></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>VAT Number</Label><Input value={makeClientForm.vatNumber} onChange={(e) => setMakeClientForm((p) => ({ ...p, vatNumber: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>GST Number</Label><Input value={makeClientForm.gstNumber} onChange={(e) => setMakeClientForm((p) => ({ ...p, gstNumber: e.target.value }))} /></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Client groups</Label><Input placeholder="Comma separated" value={makeClientForm.clientGroups} onChange={(e) => setMakeClientForm((p) => ({ ...p, clientGroups: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Labels</Label><Input placeholder="Comma separated" value={makeClientForm.labels} onChange={(e) => setMakeClientForm((p) => ({ ...p, labels: e.target.value }))} /></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Currency</Label><Input value={makeClientForm.currency} onChange={(e) => setMakeClientForm((p) => ({ ...p, currency: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Currency Symbol</Label><Input value={makeClientForm.currencySymbol} onChange={(e) => setMakeClientForm((p) => ({ ...p, currencySymbol: e.target.value }))} /></div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="disable-online-payment"
                    type="checkbox"
                    checked={makeClientForm.disableOnlinePayment}
                    onChange={(e) => setMakeClientForm((p) => ({ ...p, disableOnlinePayment: e.target.checked }))}
                  />
                  <Label htmlFor="disable-online-payment">Disable online payment</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contact" className="mt-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>First name</Label><Input value={makeClientForm.firstName} onChange={(e) => setMakeClientForm((p) => ({ ...p, firstName: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Last name</Label><Input value={makeClientForm.lastName} onChange={(e) => setMakeClientForm((p) => ({ ...p, lastName: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Email</Label><Input type="email" value={makeClientForm.email} onChange={(e) => setMakeClientForm((p) => ({ ...p, email: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Phone</Label><Input value={makeClientForm.contactPhone} onChange={(e) => setMakeClientForm((p) => ({ ...p, contactPhone: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Skype</Label><Input value={makeClientForm.skype} onChange={(e) => setMakeClientForm((p) => ({ ...p, skype: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Job Title</Label><Input value={makeClientForm.jobTitle} onChange={(e) => setMakeClientForm((p) => ({ ...p, jobTitle: e.target.value }))} /></div>
                </div>

                <div className="space-y-2">
                  <Label>Gender</Label>
                  <RadioGroup
                    value={makeClientForm.gender}
                    onValueChange={(v) => setMakeClientForm((p) => ({ ...p, gender: v as any }))}
                    className="flex items-center gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="male" id="gender-male" />
                      <Label htmlFor="gender-male">Male</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="female" id="gender-female" />
                      <Label htmlFor="gender-female">Female</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="other" id="gender-other" />
                      <Label htmlFor="gender-other">Other</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Password</Label><Input type="password" value={makeClientForm.password} onChange={(e) => setMakeClientForm((p) => ({ ...p, password: e.target.value }))} placeholder="Password" /></div>
                  <div className="flex items-center gap-2 mt-6">
                    <input
                      id="primary-contact"
                      type="checkbox"
                      checked={makeClientForm.primaryContact}
                      onChange={(e) => setMakeClientForm((p) => ({ ...p, primaryContact: e.target.checked }))}
                    />
                    <Label htmlFor="primary-contact">Primary contact</Label>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setMakeClientOpen(false)}>Close</Button>
            {makeClientStep === "contact" ? (
              <Button type="button" variant="outline" onClick={() => setMakeClientStep("details")}>Previous</Button>
            ) : null}
            {makeClientStep === "details" ? (
              <Button type="button" onClick={() => setMakeClientStep("contact")}>Next</Button>
            ) : (
              <Button type="button" onClick={saveMakeClient}>Save</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={openReminders} onOpenChange={setOpenReminders}>
        <SheetContent side="right" className="p-0 sm:max-w-[420px]">
          <div className="p-4 border-b">
            <SheetHeader className="space-y-0">
              <SheetTitle className="text-base">{title || "Reminders"}</SheetTitle>
            </SheetHeader>
          </div>

          <div className="p-4 space-y-3">
            <Input
              placeholder="Title"
              value={reminderForm.title}
              onChange={(e) => setReminderForm((p) => ({ ...p, title: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <DatePicker value={reminderForm.date} onChange={(v) => setReminderForm((p) => ({ ...p, date: v }))} placeholder="Pick date" />
              <Input type="time" value={reminderForm.time} onChange={(e) => setReminderForm((p) => ({ ...p, time: e.target.value }))} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Repeat</span>
                <span className="text-muted-foreground">?</span>
              </div>
              <Checkbox
                checked={reminderForm.repeat}
                onCheckedChange={(v) => setReminderForm((p) => ({ ...p, repeat: Boolean(v) }))}
              />
            </div>

            <Button type="button" className="w-full" onClick={addReminder}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Add
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => openWhatsappFollowup(`Hello${lead?.name ? ` ${lead.name}` : ""}, just following up regarding your inquiry.`)}
              >
                <ExternalLinkIcon className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
              <Button type="button" variant="outline" onClick={loadReminders}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>

            <div className="pt-2">
              {remindersLoading ? (
                <div className="text-sm text-muted-foreground text-center">Loading...</div>
              ) : reminders.length ? (
                <div className="space-y-2">
                  {reminders.map((r) => (
                    <div key={r._id} className="flex items-start justify-between gap-3 border rounded-md p-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{r.title || "-"}</div>
                        <div className="text-xs text-muted-foreground">{formatDateTime(r.dueAt)}</div>
                        <div className="mt-2 flex items-center gap-2">
                          {(() => {
                            const done = !!r.doneAt;
                            const due = r.dueAt ? new Date(r.dueAt) : null;
                            const now = new Date();
                            const overdue = !done && !!due && due.getTime() < now.getTime();
                            if (done) return <Badge variant="success">Done</Badge>;
                            if (overdue) return <Badge variant="destructive">Overdue</Badge>;
                            return <Badge variant="secondary">Upcoming</Badge>;
                          })()}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setReminderDone(r._id, !r.doneAt)}
                        >
                          {r.doneAt ? "Reopen" : "Done"}
                        </Button>
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => deleteReminder(r._id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center">No record found.</div>
              )}
            </div>
          </div>

          <SheetFooter className="p-4 border-t">
            <Button type="button" variant="outline" className="w-full" onClick={() => toast.message("Coming soon")}>
              Show all reminders
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="bg-muted/40 flex flex-wrap justify-start">
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="contacts" className="mt-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Contacts</div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={exportContacts}><Download className="w-4 h-4 mr-2"/>Excel</Button>
                  <Button type="button" variant="outline" onClick={printContacts}><Printer className="w-4 h-4 mr-2"/>Print</Button>
                  <Button type="button" variant="outline" onClick={loadContacts}><RefreshCw className="w-4 h-4"/></Button>
                  <Button type="button" onClick={openNewContact}><Plus className="w-4 h-4 mr-2"/>Add contact</Button>
                </div>
              </div>
              <div className="flex items-center justify-end mt-2">
                <Input className="w-64" placeholder="Search" value={contactsQuery} onChange={(e) => setContactsQuery(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="p-0" ref={contactsPrintRef}>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Name</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Skype</TableHead>
                    <TableHead className="w-44"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.length ? contacts.map((c) => (
                    <TableRow key={c._id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="text-primary underline cursor-pointer"
                            onClick={() => navigate(`/crm/contacts/${c._id}`)}
                          >
                            {c.name}
                          </button>
                          {c.isPrimaryContact ? <Badge variant="secondary">Primary contact</Badge> : null}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{c.jobTitle || "-"}</TableCell>
                      <TableCell className="whitespace-nowrap">{c.email || "-"}</TableCell>
                      <TableCell className="whitespace-nowrap">{c.phone || "-"}</TableCell>
                      <TableCell className="whitespace-nowrap">{c.skype || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!c.isPrimaryContact ? (
                            <Button type="button" variant="outline" size="sm" onClick={() => makePrimaryContact(c._id)}>
                              Make primary
                            </Button>
                          ) : null}
                          <Button type="button" variant="ghost" size="icon-sm" onClick={() => deleteContact(c._id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">No record found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={openAddContact} onOpenChange={setOpenAddContact}>
            <DialogContent className="bg-card max-w-2xl" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>Add contact</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">First name</Label>
                  <div className="col-span-9"><Input placeholder="First name" value={contactForm.firstName} onChange={(e)=>setContactForm((p)=>({ ...p, firstName: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Last name</Label>
                  <div className="col-span-9"><Input placeholder="Last name" value={contactForm.lastName} onChange={(e)=>setContactForm((p)=>({ ...p, lastName: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Email</Label>
                  <div className="col-span-9"><Input type="email" placeholder="Email" value={contactForm.email} onChange={(e)=>setContactForm((p)=>({ ...p, email: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Phone</Label>
                  <div className="col-span-9"><Input placeholder="Phone" value={contactForm.phone} onChange={(e)=>setContactForm((p)=>({ ...p, phone: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Skype</Label>
                  <div className="col-span-9"><Input placeholder="Skype" value={contactForm.skype} onChange={(e)=>setContactForm((p)=>({ ...p, skype: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Job Title</Label>
                  <div className="col-span-9"><Input placeholder="Job Title" value={contactForm.jobTitle} onChange={(e)=>setContactForm((p)=>({ ...p, jobTitle: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Gender</Label>
                  <div className="col-span-9">
                    <RadioGroup value={contactForm.gender} onValueChange={(v)=>setContactForm((p)=>({ ...p, gender: v as any }))} className="flex items-center gap-6">
                      <div className="flex items-center gap-2"><RadioGroupItem id="c-m" value="male" /><Label htmlFor="c-m">Male</Label></div>
                      <div className="flex items-center gap-2"><RadioGroupItem id="c-f" value="female" /><Label htmlFor="c-f">Female</Label></div>
                      <div className="flex items-center gap-2"><RadioGroupItem id="c-o" value="other" /><Label htmlFor="c-o">Other</Label></div>
                    </RadioGroup>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Checkbox checked={contactForm.isPrimaryContact} onCheckedChange={(v)=>setContactForm((p)=>({ ...p, isPrimaryContact: Boolean(v) }))} />
                  <Label>Primary contact</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenAddContact(false)}>Close</Button>
                <Button type="button" onClick={saveContact}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="lead-info" className="mt-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Lead info</div>
                <Button type="button" onClick={saveLead} disabled={loading}>Save</Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                <Label className="sm:col-span-2 text-muted-foreground">Type</Label>
                <div className="sm:col-span-10">
                  <RadioGroup value={leadForm.type} onValueChange={(v)=>setLeadForm((p)=>({ ...p, type: v as any }))} className="flex items-center gap-6">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Organization" id="lead-type-org" />
                      <Label htmlFor="lead-type-org">Organization</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Person" id="lead-type-person" />
                      <Label htmlFor="lead-type-person">Person</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <div className="space-y-1">
                <Label>{leadForm.type === "Organization" ? "Company" : "Name"}</Label>
                <Input
                  placeholder={leadForm.type === "Organization" ? "Company name" : "Name"}
                  value={leadForm.name}
                  onChange={(e)=>setLeadForm((p)=>({ ...p, name: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Email</Label><Input type="email" value={leadForm.email} onChange={(e)=>setLeadForm((p)=>({ ...p, email: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Phone</Label><Input value={leadForm.phone} onChange={(e)=>setLeadForm((p)=>({ ...p, phone: e.target.value }))} /></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Expected Price</Label><Input placeholder="Expected Price" value={leadForm.expectedPrice} onChange={(e)=>setLeadForm((p)=>({ ...p, expectedPrice: e.target.value }))} /></div>
                <div className="space-y-1"><Label>System Needed</Label><Input placeholder="System Needed" value={leadForm.systemNeeded} onChange={(e)=>setLeadForm((p)=>({ ...p, systemNeeded: e.target.value }))} /></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Owner</Label>
                  <Select value={leadForm.ownerId} onValueChange={(v)=>setLeadForm((p)=>({ ...p, ownerId: v }))}>
                    <SelectTrigger><SelectValue placeholder="- Owner -" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-">- Owner -</SelectItem>
                      {employees.map((e) => (
                        <SelectItem key={e._id} value={e._id}>{(e.name || `${e.firstName || ""} ${e.lastName || ""}`.trim() || "-").trim()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Source</Label>
                  <Select value={leadForm.source || "-"} onValueChange={(v)=>setLeadForm((p)=>({ ...p, source: v === "-" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-">Source</SelectItem>
                      {SOURCE_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={leadForm.status} onValueChange={(v)=>setLeadForm((p)=>({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Website</Label><Input value={leadForm.website} onChange={(e)=>setLeadForm((p)=>({ ...p, website: e.target.value }))} /></div>
              </div>

              <div className="space-y-1">
                <Label>Address</Label>
                <Textarea value={leadForm.address} onChange={(e)=>setLeadForm((p)=>({ ...p, address: e.target.value }))} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1"><Label>City</Label><Input value={leadForm.city} onChange={(e)=>setLeadForm((p)=>({ ...p, city: e.target.value }))} /></div>
                <div className="space-y-1"><Label>State</Label><Input value={leadForm.state} onChange={(e)=>setLeadForm((p)=>({ ...p, state: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Zip</Label><Input value={leadForm.zip} onChange={(e)=>setLeadForm((p)=>({ ...p, zip: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Country</Label><Input value={leadForm.country} onChange={(e)=>setLeadForm((p)=>({ ...p, country: e.target.value }))} /></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1"><Label>VAT Number</Label><Input value={leadForm.vatNumber} onChange={(e)=>setLeadForm((p)=>({ ...p, vatNumber: e.target.value }))} /></div>
                <div className="space-y-1"><Label>GST Number</Label><Input value={leadForm.gstNumber} onChange={(e)=>setLeadForm((p)=>({ ...p, gstNumber: e.target.value }))} /></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Currency</Label><Input placeholder="Keep it blank to use the default (PKR)" value={leadForm.currency} onChange={(e)=>setLeadForm((p)=>({ ...p, currency: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Currency Symbol</Label><Input placeholder="Keep it blank to use the default (Rs.)" value={leadForm.currencySymbol} onChange={(e)=>setLeadForm((p)=>({ ...p, currencySymbol: e.target.value }))} /></div>
              </div>

              <div className="space-y-2">
                <Label>Labels</Label>
                <div className="flex flex-wrap gap-2">
                  {labels.length ? labels.map((l) => {
                    const lid = l._id?.toString?.() ?? String(l._id);
                    const selected = (leadForm.labels || []).some((x) => (x?.toString?.() ?? String(x)) === lid);
                    return (
                      <button
                        key={l._id}
                        type="button"
                        onClick={() => toggleLeadLabel(lid)}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
                          selected ? "border-primary bg-primary/10" : "bg-transparent"
                        )}
                      >
                        <span className={cn("h-2 w-2 rounded-full", l.color || "bg-slate-300")} />
                        <span>{l.name}</span>
                        {selected ? <Check className="w-3 h-3" /> : null}
                      </button>
                    );
                  }) : (
                    <div className="text-sm text-muted-foreground">No labels</div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Conversation Notes</Label>
                <Textarea 
                  placeholder="Enter notes about your last conversation with the client..." 
                  value={leadForm.conversationNotes} 
                  onChange={(e)=>setLeadForm((p)=>({ ...p, conversationNotes: e.target.value }))}
                  className="min-h-[120px]"
                />
                <p className="text-xs text-muted-foreground">
                  Keep track of your conversations with this lead. You can edit this anytime.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Tasks</div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={loadTasks}><RefreshCw className="w-4 h-4" /></Button>
                  <Button type="button" onClick={() => { resetTaskForm(); setOpenAddTask(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add task
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-end mt-2">
                <Input className="w-64" placeholder="Search" value={tasksQuery} onChange={(e) => setTasksQuery(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-24">ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Start date</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Assigned to</TableHead>
                    <TableHead>Collaborators</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.length ? (
                    tasks.map((t) => (
                      <TableRow key={t._id} className="hover:bg-muted/30">
                        <TableCell className="text-xs text-muted-foreground">{String(t._id || "").slice(-6)}</TableCell>
                        <TableCell>
                          <button type="button" className="text-primary underline" onClick={() => navigate(`/tasks/${t._id}`)}>
                            {t.title || "-"}
                          </button>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{formatYmd(t.start)}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatYmd(t.deadline)}</TableCell>
                        <TableCell className="whitespace-nowrap">{t.assignees?.[0]?.name || "-"}</TableCell>
                        <TableCell className="max-w-[220px] truncate">{(t.collaborators || []).join(", ") || "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">{statusLabel(t.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button type="button" variant="ghost" size="icon-sm" onClick={() => navigate(`/tasks/${t._id}`)}>
                            <ExternalLinkIcon className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">No record found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={openAddTask} onOpenChange={setOpenAddTask}>
            <DialogContent className="bg-card max-w-3xl" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>Add task</DialogTitle>
              </DialogHeader>

              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-1">Title</div>
                  <Input className="sm:col-span-4" placeholder="Title" value={taskForm.title} onChange={(e)=>setTaskForm((p)=>({ ...p, title: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-start">
                  <div className="text-sm text-muted-foreground sm:col-span-1">Description</div>
                  <Textarea className="sm:col-span-4" placeholder="Description" value={taskForm.description} onChange={(e)=>setTaskForm((p)=>({ ...p, description: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-1">Points</div>
                  <Select value={taskForm.points} onValueChange={(v)=>setTaskForm((p)=>({ ...p, points: v }))}>
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
                  <Select value={taskForm.assignTo || "__none__"} onValueChange={(v)=>setTaskForm((p)=>({ ...p, assignTo: v === "__none__" ? "" : v }))}>
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
                      list="lead-task-collaborators"
                      placeholder="Collaborators (comma separated)"
                      value={taskForm.collaborators}
                      onChange={(e)=>setTaskForm((p)=>({ ...p, collaborators: e.target.value }))}
                    />
                    <datalist id="lead-task-collaborators">
                      {employeeNames.map((n) => (
                        <option key={n} value={n} />
                      ))}
                    </datalist>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-1">Status</div>
                  <Select value={taskForm.status} onValueChange={(v)=>setTaskForm((p)=>({ ...p, status: v }))}>
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
                  <Select value={taskForm.priority} onValueChange={(v)=>setTaskForm((p)=>({ ...p, priority: v }))}>
                    <SelectTrigger className="sm:col-span-4"><SelectValue placeholder="Priority"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Minor</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-1">Labels</div>
                  <Input className="sm:col-span-4" placeholder="Labels" value={taskForm.labels} onChange={(e)=>setTaskForm((p)=>({ ...p, labels: e.target.value }))} />
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-1">Start date</div>
                  <div className="sm:col-span-4">
                    <DatePicker value={taskForm.start} onChange={(v)=>setTaskForm((p)=>({ ...p, start: v }))} placeholder="Pick start date" />
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-5 items-center">
                  <div className="text-sm text-muted-foreground sm:col-span-1">Deadline</div>
                  <div className="sm:col-span-4">
                    <DatePicker value={taskForm.deadline} onChange={(v)=>setTaskForm((p)=>({ ...p, deadline: v }))} placeholder="Pick deadline" />
                  </div>
                </div>
              </div>

              <DialogFooter className="items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    ref={taskFilesRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => setTaskSelectedFiles(Array.from(e.target.files || []))}
                  />
                  <Button type="button" variant="outline" onClick={() => taskFilesRef.current?.click()} disabled={taskUploading}>
                    <Paperclip className="w-4 h-4 mr-2" />
                    Upload File
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => toast.success("Voice note coming soon")}>
                    <Mic className="w-4 h-4" />
                  </Button>
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
        </TabsContent>
        <TabsContent value="estimates" className="mt-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Estimates</div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={exportEstimates}><Download className="w-4 h-4 mr-2"/>Excel</Button>
                  <Button type="button" variant="outline" onClick={printEstimates}><Printer className="w-4 h-4 mr-2"/>Print</Button>
                  <Button type="button" variant="outline" onClick={loadEstimates}><RefreshCw className="w-4 h-4"/></Button>
                  <Button type="button" onClick={openNewEstimate}><Plus className="w-4 h-4 mr-2"/>Add estimate</Button>
                </div>
              </div>
              <div className="flex items-center justify-end mt-2">
                <Input className="w-64" placeholder="Search" value={estimatesQuery} onChange={(e) => setEstimatesQuery(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Estimate</TableHead>
                    <TableHead>Estimate Date</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Tax</TableHead>
                    <TableHead>Tax2</TableHead>
                    <TableHead>Advanced</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estimates.length ? estimates.map((e) => (
                    <TableRow key={e._id}>
                      <TableCell className="whitespace-nowrap">
                        <button
                          type="button"
                          className="text-primary underline cursor-pointer"
                          onClick={() => navigate(`/prospects/estimates/${e._id}`)}
                        >
                          Estimate: {e.number || "-"}
                        </button>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatYmd(e.estimateDate)}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatYmd(e.validUntil)}</TableCell>
                      <TableCell className="whitespace-nowrap">{String(e.tax ?? 0)}</TableCell>
                      <TableCell className="whitespace-nowrap">{String(e.tax2 ?? 0)}</TableCell>
                      <TableCell className="whitespace-nowrap">{String(e.advancedAmount ?? 0)}</TableCell>
                      <TableCell className="whitespace-nowrap">{String(e.amount ?? 0)}</TableCell>
                      <TableCell className="whitespace-nowrap">{e.status || "-"}</TableCell>
                      <TableCell className="max-w-[420px] truncate">{e.note || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => deleteEstimate(e._id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground">No record found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={openAddEstimate} onOpenChange={setOpenAddEstimate}>
            <DialogContent className="bg-card max-w-2xl" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>Add estimate</DialogTitle>
              </DialogHeader>

              <div className="grid gap-3">
                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Estimate date</Label>
                  <div className="col-span-9">
                    <DatePicker value={estimateForm.estimateDate} onChange={(v) => setEstimateForm((p) => ({ ...p, estimateDate: v }))} placeholder="Pick estimate date" />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Valid until</Label>
                  <div className="col-span-9">
                    <DatePicker value={estimateForm.validUntil} onChange={(v) => setEstimateForm((p) => ({ ...p, validUntil: v }))} placeholder="Pick valid until" />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Tax</Label>
                  <div className="col-span-9">
                    <Input type="number" value={estimateForm.tax} onChange={(e) => setEstimateForm((p) => ({ ...p, tax: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Tax 2</Label>
                  <div className="col-span-9">
                    <Input type="number" value={estimateForm.tax2} onChange={(e) => setEstimateForm((p) => ({ ...p, tax2: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Advanced</Label>
                  <div className="col-span-9">
                    <Input type="number" value={estimateForm.advancedAmount} onChange={(e) => setEstimateForm((p) => ({ ...p, advancedAmount: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-start gap-3">
                  <Label className="col-span-3 text-muted-foreground">Note</Label>
                  <div className="col-span-9">
                    <Textarea placeholder="Note" value={estimateForm.note} onChange={(e) => setEstimateForm((p) => ({ ...p, note: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Files</Label>
                  <div className="col-span-9">
                    <input
                      ref={estimateFilesRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => setEstimateSelectedFiles(Array.from(e.target.files || []))}
                    />
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" onClick={() => estimateFilesRef.current?.click()}>
                        <Upload className="w-4 h-4 mr-2" />
                        Choose files
                      </Button>
                      <div className="text-xs text-muted-foreground truncate">
                        {estimateSelectedFiles.length ? `${estimateSelectedFiles.length} file(s) selected` : "No files selected"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenAddEstimate(false)}>Close</Button>
                <Button type="button" onClick={saveEstimate}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
        <TabsContent value="estimate-requests" className="mt-4"><SimpleEmptyTab title="Estimate Requests" /></TabsContent>
        <TabsContent value="proposals" className="mt-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Proposals</div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={exportProposals}><Download className="w-4 h-4 mr-2"/>Excel</Button>
                  <Button type="button" variant="outline" onClick={printProposals}><Printer className="w-4 h-4 mr-2"/>Print</Button>
                  <Button type="button" variant="outline" onClick={loadProposals}><RefreshCw className="w-4 h-4"/></Button>
                  <Button type="button" onClick={openNewProposal}><Plus className="w-4 h-4 mr-2"/>Add proposal</Button>
                </div>
              </div>
              <div className="flex items-center justify-end mt-2">
                <Input className="w-64" placeholder="Search" value={proposalsQuery} onChange={(e) => setProposalsQuery(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Proposal Date</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Tax1</TableHead>
                    <TableHead>Tax2</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proposals.length ? proposals.map((p) => (
                    <TableRow key={p._id}>
                      <TableCell className="whitespace-nowrap">
                        <button
                          type="button"
                          className="text-primary underline cursor-pointer"
                          onClick={() => navigate(`/prospects/proposals/${p._id}`)}
                        >
                          {formatYmd(p.proposalDate)}
                        </button>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatYmd(p.validUntil)}</TableCell>
                      <TableCell className="whitespace-nowrap">{String(p.tax1 ?? 0)}</TableCell>
                      <TableCell className="whitespace-nowrap">{String(p.tax2 ?? 0)}</TableCell>
                      <TableCell className="whitespace-nowrap">{p.status || "-"}</TableCell>
                      <TableCell className="max-w-[420px] truncate">{p.note || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => deleteProposal(p._id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">No record found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={openAddProposal} onOpenChange={setOpenAddProposal}>
            <DialogContent className="bg-card max-w-2xl" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>Add proposal</DialogTitle>
              </DialogHeader>

              <div className="grid gap-3">
                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Title</Label>
                  <div className="col-span-9">
                    <Input placeholder="Proposal title" value={proposalForm.title} onChange={(v) => setProposalForm((p) => ({ ...p, title: v.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Amount</Label>
                  <div className="col-span-9">
                    <Input type="number" placeholder="Amount" value={proposalForm.amount} onChange={(v) => setProposalForm((p) => ({ ...p, amount: v.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Proposal date</Label>
                  <div className="col-span-9">
                    <DatePicker value={proposalForm.proposalDate} onChange={(v) => setProposalForm((p) => ({ ...p, proposalDate: v }))} placeholder="Pick proposal date" />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Valid until</Label>
                  <div className="col-span-9">
                    <DatePicker value={proposalForm.validUntil} onChange={(v) => setProposalForm((p) => ({ ...p, validUntil: v }))} placeholder="Pick valid until" />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Tax 1</Label>
                  <div className="col-span-9">
                    <Input type="number" value={proposalForm.tax1} onChange={(e) => setProposalForm((p) => ({ ...p, tax1: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Tax 2</Label>
                  <div className="col-span-9">
                    <Input type="number" value={proposalForm.tax2} onChange={(e) => setProposalForm((p) => ({ ...p, tax2: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-start gap-3">
                  <Label className="col-span-3 text-muted-foreground">Note</Label>
                  <div className="col-span-9">
                    <Textarea placeholder="Note" value={proposalForm.note} onChange={(e) => setProposalForm((p) => ({ ...p, note: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Files</Label>
                  <div className="col-span-9">
                    <input
                      ref={proposalFilesRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => setProposalSelectedFiles(Array.from(e.target.files || []))}
                    />
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" onClick={() => proposalFilesRef.current?.click()}>
                        <Upload className="w-4 h-4 mr-2" />
                        Choose files
                      </Button>
                      <div className="text-xs text-muted-foreground truncate">
                        {proposalSelectedFiles.length ? `${proposalSelectedFiles.length} file(s) selected` : "No files selected"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenAddProposal(false)}>Close</Button>
                <Button type="button" onClick={saveProposal}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
        <TabsContent value="contracts" className="mt-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Contracts</div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={exportContracts}><Download className="w-4 h-4 mr-2"/>Excel</Button>
                  <Button type="button" variant="outline" onClick={printContracts}><Printer className="w-4 h-4 mr-2"/>Print</Button>
                  <Button type="button" variant="outline" onClick={loadContracts}><RefreshCw className="w-4 h-4"/></Button>
                  <Button type="button" onClick={openNewContract}><Plus className="w-4 h-4 mr-2"/>Add contract</Button>
                </div>
              </div>
              <div className="flex items-center justify-end mt-2">
                <Input className="w-64" placeholder="Search" value={contractsQuery} onChange={(e) => setContractsQuery(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Title</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Contract Date</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Tax1</TableHead>
                    <TableHead>Tax2</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.length ? contracts.map((c) => (
                    <TableRow key={c._id}>
                      <TableCell className="whitespace-nowrap">
                        <button
                          type="button"
                          className="text-primary underline cursor-pointer"
                          onClick={() => navigate(`/sales/contracts/${c._id}`)}
                        >
                          {c.title || "-"}
                        </button>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{c.projectId ? (projectTitleById.get(c.projectId) || "-") : "-"}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatYmd(c.contractDate)}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatYmd(c.validUntil)}</TableCell>
                      <TableCell className="whitespace-nowrap">{String(c.tax1 ?? 0)}</TableCell>
                      <TableCell className="whitespace-nowrap">{String(c.tax2 ?? 0)}</TableCell>
                      <TableCell className="whitespace-nowrap">{c.status || "-"}</TableCell>
                      <TableCell className="max-w-[340px] truncate">{c.note || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => deleteContract(c._id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">No record found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={openAddContract} onOpenChange={setOpenAddContract}>
            <DialogContent className="bg-card max-w-2xl" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>Add contract</DialogTitle>
              </DialogHeader>

              <div className="grid gap-3">
                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Title</Label>
                  <div className="col-span-9">
                    <Input placeholder="Title" value={contractForm.title} onChange={(e) => setContractForm((p) => ({ ...p, title: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Project</Label>
                  <div className="col-span-9">
                    <Select value={contractForm.projectId} onValueChange={(v) => setContractForm((p) => ({ ...p, projectId: v }))}>
                      <SelectTrigger><SelectValue placeholder="- Project -" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-">- Project -</SelectItem>
                        {projects.map((p) => (
                          <SelectItem key={p._id} value={p._id}>{p.title || "-"}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Contract date</Label>
                  <div className="col-span-9">
                    <DatePicker value={contractForm.contractDate} onChange={(v) => setContractForm((p) => ({ ...p, contractDate: v }))} placeholder="Pick contract date" />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Valid until</Label>
                  <div className="col-span-9">
                    <DatePicker value={contractForm.validUntil} onChange={(v) => setContractForm((p) => ({ ...p, validUntil: v }))} placeholder="Pick valid until" />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Tax 1</Label>
                  <div className="col-span-9">
                    <Input type="number" value={contractForm.tax1} onChange={(e) => setContractForm((p) => ({ ...p, tax1: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Tax 2</Label>
                  <div className="col-span-9">
                    <Input type="number" value={contractForm.tax2} onChange={(e) => setContractForm((p) => ({ ...p, tax2: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-start gap-3">
                  <Label className="col-span-3 text-muted-foreground">Note</Label>
                  <div className="col-span-9">
                    <Textarea placeholder="Note" value={contractForm.note} onChange={(e) => setContractForm((p) => ({ ...p, note: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <Label className="col-span-3 text-muted-foreground">Files</Label>
                  <div className="col-span-9">
                    <input
                      ref={contractFilesRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => setContractSelectedFiles(Array.from(e.target.files || []))}
                    />
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" onClick={() => contractFilesRef.current?.click()}>
                        <Upload className="w-4 h-4 mr-2" />
                        Choose files
                      </Button>
                      <div className="text-xs text-muted-foreground truncate">
                        {contractSelectedFiles.length ? `${contractSelectedFiles.length} file(s) selected` : "No files selected"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenAddContract(false)}>Close</Button>
                <Button type="button" onClick={saveContract}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
        <TabsContent value="notes" className="mt-4"><Notes leadId={id} /></TabsContent>
        <TabsContent value="files" className="mt-4"><Files leadId={id} /></TabsContent>
        <TabsContent value="events" className="mt-4"><Events /></TabsContent>
      </Tabs>
    </div>
  );
}

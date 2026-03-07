import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  Download,
  MoreHorizontal,
  Edit,
  Trash2,
  RefreshCw,
  Check,
  X,
  Tags,
  Printer,
  UserPlus,
  ExternalLink,
  Users,
  Paperclip,
  FileSignature,
  ChevronsUpDown,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { hasCrmPermission } from "@/utils/roleAccess";
import { openWhatsappChat } from "@/lib/whatsapp";


const getStoredAuthUser = () => {
  const raw = localStorage.getItem("auth_user") || sessionStorage.getItem("auth_user");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};

type Employee = { _id: string; name?: string; firstName?: string; lastName?: string; email?: string; image?: string; avatar?: string };
type LeadLabel = { _id: string; name: string; color?: string };

const LEAD_SYSTEM_CUSTOM_VALUE = "__custom__";

type ContactDoc = {
  _id: string;
  leadId?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  isPrimaryContact?: boolean;
  avatar?: string;
  phone?: string;
};

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
  value?: string;
  lastContact?: string;
  initials?: string;
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
  reminderDate?: string;
  conversationNotes?: string;
  approvalStatus?: string;
  clientId?: string;
  orderId?: string;
};

const STATUS_OPTIONS = [
  { value: "New", label: "New", variant: "default" as const },
  { value: "Qualified", label: "Qualified", variant: "default" as const },
  { value: "Discussion", label: "Discussion", variant: "secondary" as const },
  { value: "Negotiation", label: "Negotiation", variant: "warning" as const },
  { value: "Won", label: "Won", variant: "success" as const },
  { value: "Lost", label: "Lost", variant: "destructive" as const },
];

const STATUS_VARIANT_BY_VALUE = new Map(STATUS_OPTIONS.map((s) => [s.value, s.variant] as const));

export default function Leads() {
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState<LeadDoc[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [labels, setLabels] = useState<LeadLabel[]>([]);
  const [contacts, setContacts] = useState<ContactDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const role = (getStoredAuthUser()?.role || "admin") as string;
  const canCreateLead = hasCrmPermission('leads.create');
  const canUpdateLead = hasCrmPermission('leads.update');
  const canDeleteLead = hasCrmPermission('leads.delete');

  // Helper to check if current user is the lead owner
  const isLeadOwner = (lead: LeadDoc) => {
    const me = getStoredAuthUser();
    if (!me || !lead.ownerId) return false;
    const meEmail = String(me?.email || me?.user?.email || "").trim().toLowerCase();
    const ownerEmployee = employees.find(e => String(e._id) === String(lead.ownerId));
    return ownerEmployee && String(ownerEmployee.email || "").trim().toLowerCase() === meEmail;
  };

  // Helper to check if lead can be deleted (not converted)
  const canDeleteThisLead = (lead: LeadDoc) => {
    const isConverted = lead.approvalStatus === "approved" || lead.clientId || lead.orderId;
    if (isConverted) return false;
    // Allow if has delete permission OR is the owner
    return canDeleteLead || isLeadOwner(lead);
  };

  const openWhatsappDirect = (phoneRaw?: string, name?: string) => {
    const msg = `Hello ${name || ""}, I'm reaching out from our CRM regarding your interest.`;
    const r = openWhatsappChat(phoneRaw, msg, { defaultCountryCode: "92" });
    if (!r.ok) toast.error("Invalid or missing phone number");
  };

  const openWhatsappReminder = (phoneRaw?: string, leadName?: string) => {
    const msg = `Reminder: following up on your inquiry${leadName ? ` (${leadName})` : ""}.`;
    const r = openWhatsappChat(phoneRaw, msg, { defaultCountryCode: "92" });
    if (!r.ok) toast.error("Invalid or missing phone number");
  };

  const [kanbanCounts, setKanbanCounts] = useState<Record<string, { contacts: number; files: number; contracts: number }>>({});

  const [nextReminderByLeadId, setNextReminderByLeadId] = useState<Record<string, any>>({});
  const [reminderCountsByLeadId, setReminderCountsByLeadId] = useState<Record<string, number>>({});
  const [openQuickReminder, setOpenQuickReminder] = useState(false);
  const [quickReminderLead, setQuickReminderLead] = useState<LeadDoc | null>(null);
  const [quickReminderForm, setQuickReminderForm] = useState({ title: "", date: "", time: "", repeat: false });

  const draggingLeadIdRef = useRef<string | null>(null);
  const draggingFromStatusRef = useRef<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);

  const [convertMode, setConvertMode] = useState<"client" | "contact">("client");
  const [makeClientOpen, setMakeClientOpen] = useState(false);
  const [makeClientStep, setMakeClientStep] = useState<"details" | "contact">("details");
  const [makeClientLead, setMakeClientLead] = useState<LeadDoc | null>(null);
  const [makeClientForm, setMakeClientForm] = useState({
    // client details
    type: "Person" as "Organization" | "Person",
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
    currency: "",
    currencySymbol: "",
    labels: "",
    disableOnlinePayment: false,
    // contact
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

  const loadNextReminders = async (leadIds: string[], opts?: { includeOverdue?: boolean }) => {
    try {
      if (!leadIds.length) { setNextReminderByLeadId({}); setReminderCountsByLeadId({}); return; }
      const chunkSize = 40;
      const chunks: string[][] = [];
      for (let i = 0; i < leadIds.length; i += chunkSize) chunks.push(leadIds.slice(i, i + chunkSize));

      const merged: Record<string, any> = {};
      const counts: Record<string, number> = {};
      for (const chunk of chunks) {
        const qs = new URLSearchParams();
        qs.set("leadIds", chunk.join(","));
        if (opts?.includeOverdue) qs.set("includeOverdue", "1");
        const res = await fetch(`${API_BASE}/api/reminders/next?${qs.toString()}`, { headers: getAuthHeaders() });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) continue;
        if (json && typeof json === "object") {
          for (const [k, v] of Object.entries(json)) {
            merged[k] = v;
            if (v && typeof v === "object" && (v as any)._id) {
              counts[k] = (counts[k] || 0) + 1;
            }
          }
        }
      }
      setNextReminderByLeadId(merged);
      setReminderCountsByLeadId(counts);
    } catch {
    }
  };

  const markReminderDone = async (reminderId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/reminders/${reminderId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete reminder");
      toast.success("Follow-up completed and removed");
      await loadNextReminders(items.map((x) => x._id));
    } catch (e: any) {
      toast.error(e?.message || "Failed to complete follow-up");
    }
  };

  const openAddFollowup = (lead: LeadDoc) => {
    setQuickReminderLead(lead);
    // Pre-populate with existing lead reminder data if available
    const existingReminder = lead.reminderDate ? new Date(lead.reminderDate) : null;
    const hasValidReminder = existingReminder && !isNaN(existingReminder.getTime());
    setQuickReminderForm({
      title: `Follow up: ${lead.name}`,
      date: hasValidReminder ? existingReminder.toISOString().slice(0, 10) : "",
      time: hasValidReminder ? existingReminder.toISOString().slice(11, 16) : "",
      repeat: false,
    });
    setOpenQuickReminder(true);
  };

  const parseTimeToHoursMinutes = (raw: string) => {
    const t = (raw || "").trim();
    if (!t) return { hh: 0, mm: 0 };
    const m24 = t.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (m24) return { hh: Number(m24[1]), mm: Number(m24[2]) };
    return null;
  };

  const saveQuickReminder = async () => {
    try {
      const lead = quickReminderLead;
      if (!lead?._id) return;
      const title = quickReminderForm.title.trim();
      if (!title) { toast.error("Title is required"); return; }
      if (!quickReminderForm.date) { toast.error("Date is required"); return; }
      const parts = parseTimeToHoursMinutes(quickReminderForm.time);
      if (!parts) { toast.error("Invalid time"); return; }
      const dueAt = new Date(`${quickReminderForm.date}T00:00:00`);
      dueAt.setHours(parts.hh, parts.mm, 0, 0);
      
      // Create reminder only - do NOT sync with lead reminderDate
      const res = await fetch(`${API_BASE}/api/reminders`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ leadId: lead._id, title, repeat: quickReminderForm.repeat, dueAt: dueAt.toISOString() }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      
      toast.success("Follow-up scheduled");
      setOpenQuickReminder(false);
      setQuickReminderLead(null);
      setQuickReminderForm({ title: "", date: "", time: "", repeat: false });
      await loadNextReminders(items.map((x) => x._id));
    } catch (e: any) {
      toast.error(e?.message || "Failed to add follow-up");
    }
  };

  // Kanban columns and grouping
  const columns = [
    { id: "New", title: "New", color: "bg-slate-400" },
    { id: "Qualified", title: "Qualified", color: "bg-emerald-500" },
    { id: "Discussion", title: "Discussion", color: "bg-sky-500" },
    { id: "Negotiation", title: "Negotiation", color: "bg-amber-500" },
    { id: "Won", title: "Won", color: "bg-green-600" },
    { id: "Lost", title: "Lost", color: "bg-rose-500" },
  ] as const;

  const [searchQuery, setSearchQuery] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [openManageLabels, setOpenManageLabels] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [filterOwnerId, setFilterOwnerId] = useState("-");
  const [filterStatus, setFilterStatus] = useState("-");
  const [filterLabelId, setFilterLabelId] = useState("-");
  const [filterSource, setFilterSource] = useState("-");
  const [filterCreatedFrom, setFilterCreatedFrom] = useState("");
  const [filterCreatedTo, setFilterCreatedTo] = useState("");
  const [followupFilter, setFollowupFilter] = useState<"-" | "overdue" | "today" | "upcoming">("-");

  const displayItems = useMemo(() => {
    if (followupFilter === "-") return items;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return items.filter((lead) => {
      const r = nextReminderByLeadId?.[String(lead._id)];
      const dueAt = r?.dueAt ? new Date(r.dueAt) : null;
      if (!dueAt || Number.isNaN(dueAt.getTime())) return false;

      if (followupFilter === "overdue") return dueAt < start;
      if (followupFilter === "today") return dueAt >= start && dueAt < end;
      if (followupFilter === "upcoming") return dueAt >= end;
      return true;
    });
  }, [followupFilter, items, nextReminderByLeadId]);

  const kanbanGroups: Record<string, LeadDoc[]> = useMemo(() => {
    const map: Record<string, LeadDoc[]> = Object.fromEntries(columns.map((c) => [c.id, []]));
    for (const l of displayItems) {
      const s = (l.status && columns.find((c) => c.id === l.status)?.id) || "New";
      map[s].push(l);
    }
    return map;
  }, [columns, displayItems]);

  // add lead form state
  const [leadForm, setLeadForm] = useState({
    type: "Organization" as "Organization" | "Person",
    name: "",
    company: "",
    email: "",
    phone: "",
    expectedPrice: "",
    systemNeeded: "",
    systemNeededCustom: "",
    status: "New",
    source: "",
    ownerId: "-",
    labels: [] as string[],
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    website: "",
    vatNumber: "",
    gstNumber: "",
    currency: "",
    currencySymbol: "",
    reminderDate: "",
    conversationNotes: "",
  });

  const [leadOwnerOpen, setLeadOwnerOpen] = useState(false);
  const [leadOwnerSearch, setLeadOwnerSearch] = useState("");
  const [leadSystemOpen, setLeadSystemOpen] = useState(false);
  const [leadSystemSearch, setLeadSystemSearch] = useState("");
  const [leadLabelOpen, setLeadLabelOpen] = useState(false);
  const [leadLabelSearch, setLeadLabelSearch] = useState("");

  const [manageLabelName, setManageLabelName] = useState("");
  const [manageLabelColor, setManageLabelColor] = useState("bg-blue-600");

  const importRef = useRef<HTMLInputElement>(null);

  const employeeNameById = useMemo(() => {
    const m = new Map<string, string>();
    employees.forEach((e) => {
      const name = (e.name || `${e.firstName || ""} ${e.lastName || ""}`.trim() || "-").trim();
      if (e._id) m.set(e._id, name);
    });
    return m;
  }, [employees]);

  const employeeDisplayName = (e: Employee) => (e.name || `${e.firstName || ""} ${e.lastName || ""}`.trim() || "-").trim();

  useEffect(() => {
    if (!openAdd) return;
    if (editingId) return;
    if (leadForm.ownerId !== "-") return;
    if (!employees.length) return;

    const me: any = getStoredAuthUser();
    if (!me) return;

    const meId = String(me?._id || me?.id || me?.user?._id || me?.user?.id || "").trim();
    const meEmail = String(me?.email || me?.user?.email || "").trim().toLowerCase();
    const meName = String(
      me?.name ||
        me?.user?.name ||
        `${me?.firstName || ""} ${me?.lastName || ""}`.trim() ||
        "",
    ).trim();

    const byId = meId ? employees.find((e) => String(e._id) === meId) : undefined;
    const byEmail = !byId && meEmail
      ? employees.find((e) => String(e.email || "").trim().toLowerCase() === meEmail)
      : undefined;
    const byName = !byId && meName
      ? employees.find((e) => employeeDisplayName(e).toLowerCase() === meName.toLowerCase())
      : undefined;

    const hit = byId || byEmail || byName;
    if (!hit?._id) return;

    setLeadForm((p) => (p.ownerId === "-" ? { ...p, ownerId: String(hit._id) } : p));
  }, [openAdd, editingId, leadForm.ownerId, employees]);

  const labelById = useMemo(() => {
    const m = new Map<string, LeadLabel>();
    labels.forEach((l) => m.set(l._id, l));
    return m;
  }, [labels]);

  const primaryContactByLeadId = useMemo(() => {
    const m = new Map<string, ContactDoc>();
    for (const c of contacts) {
      const leadId = c.leadId?.toString?.() ?? (c.leadId ? String(c.leadId) : "");
      if (!leadId) continue;
      if (!c.isPrimaryContact) continue;
      m.set(leadId, c);
    }
    return m;
  }, [contacts]);

  // Extract unique system needed values from leads
  const uniqueSystemNeededOptions = useMemo(() => {
    const uniqueValues = new Set<string>();
    items.forEach(lead => {
      if (lead.systemNeeded && lead.systemNeeded.trim()) {
        uniqueValues.add(lead.systemNeeded.trim());
      }
    });
    return Array.from(uniqueValues).sort();
  }, [items]);

  const contactCountByLeadId = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of contacts) {
      const leadId = c.leadId?.toString?.() ?? (c.leadId ? String(c.leadId) : "");
      if (!leadId) continue;
      m.set(leadId, (m.get(leadId) || 0) + 1);
    }
    return m;
  }, [contacts]);

  const displayContactName = (c?: ContactDoc | null) => {
    if (!c) return "-";
    const n = `${c.firstName || ""}${c.lastName ? ` ${c.lastName}` : ""}`.trim();
    return n || c.name || "-";
  };

  const approveLead = async (leadId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/leads/${leadId}/approve`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to approve");
      toast.success("Lead approved and converted to client");
      await loadLeads();
      if (json?.clientId) navigate(`/clients/${json.clientId}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to approve lead");
    }
  };

  const formatLeadValue = (lead: LeadDoc) => {
    const raw = String((lead as any)?.expectedPrice ?? "").trim();
    if (!raw) return "-";
    const cur = String((lead as any)?.currencySymbol || (lead as any)?.currency || "").trim();
    const n = Number(raw.replace(/,/g, ""));
    const formatted = Number.isFinite(n) ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n) : raw;
    return cur ? `${cur} ${formatted}` : formatted;
  };

  const updateLeadStatus = async (leadId: string, status: string) => {
    const prev = items;
    setItems((p) => p.map((l) => (String(l._id) === String(leadId) ? { ...l, status } : l)));
    try {
      const res = await fetch(`${API_BASE}/api/leads/${leadId}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      setItems(prev);
      toast.error("Failed to update status");
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "-";
    try {
      return new Date(iso).toISOString().slice(0, 10);
    } catch {
      return "-";
    }
  };

  const getInitials = (s?: string) => {
    const v = (s || "").trim();
    if (!v) return "-";
    return v
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const formatRelative = (iso?: string) => {
    if (!iso) return "-";
    try {
      const d = new Date(iso).getTime();
      const diff = Date.now() - d;
      const min = Math.floor(diff / 60000);
      if (min < 60) return `${Math.max(1, min)} min ago`;
      const hr = Math.floor(min / 60);
      if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
      const day = Math.floor(hr / 24);
      if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
      return formatDate(iso);
    } catch {
      return "-";
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

  const loadContacts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/contacts`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      setContacts(Array.isArray(data) ? data : []);
    } catch {
      // Silent failure: leads list should still work
    }
  };

  const loadLeads = async (overrides?: {
    q?: string;
    ownerId?: string;
    status?: string;
    labelId?: string;
    source?: string;
    createdFrom?: string;
    createdTo?: string;
  }) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      const q = overrides?.q !== undefined ? overrides.q : searchQuery;
      const ownerId = overrides?.ownerId !== undefined ? overrides.ownerId : filterOwnerId;
      const status = overrides?.status !== undefined ? overrides.status : filterStatus;
      const labelId = overrides?.labelId !== undefined ? overrides.labelId : filterLabelId;
      const source = overrides?.source !== undefined ? overrides.source : filterSource;
      const createdFrom = overrides?.createdFrom !== undefined ? overrides.createdFrom : filterCreatedFrom;
      const createdTo = overrides?.createdTo !== undefined ? overrides.createdTo : filterCreatedTo;

      if (String(q || "").trim()) params.set("q", String(q).trim());
      if (String(ownerId || "-") !== "-") params.set("ownerId", String(ownerId));
      if (String(status || "-") !== "-") params.set("status", String(status));
      if (String(labelId || "-") !== "-") params.set("labelId", String(labelId));
      if (String(source || "-") !== "-") params.set("source", String(source));
      if (String(createdFrom || "").trim()) params.set("createdFrom", String(createdFrom));
      if (String(createdTo || "").trim()) params.set("createdTo", String(createdTo));
      const url = `${API_BASE}/api/leads${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
    loadLabels();
    loadContacts();
  }, []);

  useEffect(() => {
    const sp = new URLSearchParams(location.search || "");
    const q = String(sp.get("q") || "").trim();
    const ownerId = String(sp.get("ownerId") || "").trim();
    const status = String(sp.get("status") || "").trim();
    const source = String(sp.get("source") || "").trim();
    const labelId = String(sp.get("labelId") || "").trim();
    const createdFrom = String(sp.get("createdFrom") || "").trim();
    const createdTo = String(sp.get("createdTo") || "").trim();
    const followup = String(sp.get("followup") || "").trim().toLowerCase();

    setSearchQuery(q);
    setFilterOwnerId(ownerId || "-");
    setFilterStatus(status || "-");
    setFilterSource(source || "-");
    setFilterLabelId(labelId || "-");
    setFilterCreatedFrom(createdFrom);
    setFilterCreatedTo(createdTo);
    setFollowupFilter(followup === "overdue" || followup === "today" || followup === "upcoming" ? (followup as any) : "-");

    void loadLeads({
      q,
      ownerId: ownerId || "-",
      status: status || "-",
      labelId: labelId || "-",
      source: source || "-",
      createdFrom,
      createdTo,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  useEffect(() => {
    const ids = (items || []).map((x) => x._id).filter(Boolean);
    if (!ids.length) { setNextReminderByLeadId({}); return; }
    void loadNextReminders(ids, { includeOverdue: followupFilter !== "-" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  useEffect(() => {
    let cancelled = false;
    const safeJson = async (url: string) => {
      try {
        const res = await fetch(url, { headers: getAuthHeaders() });
        if (!res.ok) return [];
        const json = await res.json().catch(() => []);
        return Array.isArray(json) ? json : [];
      } catch {
        return [];
      }
    };

    (async () => {
      if (!items.length) {
        setKanbanCounts({});
        return;
      }

      const entries = await Promise.all(
        items.map(async (lead) => {
          const leadId = String(lead._id);
          const contactsCount = contactCountByLeadId.get(leadId) || 0;
          const [files, contracts] = await Promise.all([
            safeJson(`${API_BASE}/api/files?leadId=${encodeURIComponent(leadId)}`),
            safeJson(`${API_BASE}/api/contracts?leadId=${encodeURIComponent(leadId)}`),
          ]);
          return [leadId, { contacts: contactsCount, files: files.length, contracts: contracts.length }] as const;
        })
      );

      if (cancelled) return;
      const next: Record<string, { contacts: number; files: number; contracts: number }> = {};
      for (const [id, v] of entries) next[id] = v;
      setKanbanCounts(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [items, contactCountByLeadId]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      loadLeads();
    }, 250);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  const applyFilters = () => {
    loadLeads();
  };

  const clearFilters = () => {
    setFilterOwnerId("-");
    setFilterStatus("-");
    setFilterLabelId("-");
    setFilterSource("-");
    setFilterCreatedFrom("");
    setFilterCreatedTo("");
    setSearchQuery("");
    window.setTimeout(() => loadLeads(), 0);
  };

  const openCreateLead = () => {
    void loadLabels();
    void loadEmployees();
    setEditingId(null);
    setLeadOwnerOpen(false);
    setLeadOwnerSearch("");
    setLeadSystemOpen(false);
    setLeadSystemSearch("");
    setLeadLabelOpen(false);
    setLeadLabelSearch("");
    setLeadForm({
      type: "Organization",
      name: "",
      company: "",
      email: "",
      phone: "",
      expectedPrice: "",
      systemNeeded: "",
      systemNeededCustom: "",
      status: "New",
      source: "",
      ownerId: "-",
      labels: [],
      address: "",
      city: "",
      state: "",
      zip: "",
      country: "",
      website: "",
      vatNumber: "",
      gstNumber: "",
      currency: "",
      currencySymbol: "",
      reminderDate: "",
      conversationNotes: "",
    });
    setOpenAdd(true);
  };

  const openEditLead = (lead: LeadDoc) => {
    void loadLabels();
    void loadEmployees();
    setEditingId(lead._id);
    setLeadOwnerOpen(false);
    setLeadOwnerSearch("");
    setLeadSystemOpen(false);
    setLeadSystemSearch("");
    setLeadLabelOpen(false);
    setLeadLabelSearch("");
    setLeadForm({
      type: (lead.type as any) || "Organization",
      name: lead.name || "",
      company: lead.company || "",
      email: lead.email || "",
      phone: lead.phone || "",
      expectedPrice: lead.expectedPrice || "",
      systemNeeded: lead.systemNeeded || "",
      systemNeededCustom: "",
      status: lead.status || "New",
      source: lead.source || "",
      ownerId: lead.ownerId || "-",
      labels: Array.isArray(lead.labels) ? lead.labels.map((x) => x?.toString?.() ?? String(x)) : [],
      address: lead.address || "",
      city: lead.city || "",
      state: lead.state || "",
      zip: lead.zip || "",
      country: lead.country || "",
      website: lead.website || "",
      vatNumber: lead.vatNumber || "",
      gstNumber: lead.gstNumber || "",
      currency: lead.currency || "",
      currencySymbol: lead.currencySymbol || "",
      reminderDate: lead.reminderDate ? lead.reminderDate.slice(0, 16) : "",
      conversationNotes: (lead as any).conversationNotes || "",
    });
    setOpenAdd(true);
  };

  const toggleLeadLabel = (labelId: string) => {
    const id = labelId?.toString?.() ?? String(labelId);
    setLeadForm((p) => {
      const selected = (p.labels || []).some((x) => (x?.toString?.() ?? String(x)) === id);
      return { ...p, labels: selected ? [] : [id] };
    });
  };

  const [openDuplicateWarning, setOpenDuplicateWarning] = useState(false);
  const [duplicateLeadData, setDuplicateLeadData] = useState<any>(null);

  const saveLead = async (bypassDuplicateCheck = false) => {
    if (isSaving) return;
    
    if (!bypassDuplicateCheck && !editingId) {
      try {
        const checkRes = await fetch(`${API_BASE}/api/leads/check-duplicate`, {
          method: "POST",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ email: leadForm.email, phone: leadForm.phone }),
        });
        const checkJson = await checkRes.json();
        if (checkJson.exists) {
          setDuplicateLeadData(checkJson.lead);
          setOpenDuplicateWarning(true);
          return;
        }
      } catch (err) {
        console.error("Duplicate check failed:", err);
      }
    }

    setIsSaving(true);
    try {
      if (!leadForm.name.trim()) {
        toast.error("Name is required");
        setIsSaving(false);
        return;
      }

      const payload: any = {
        type: leadForm.type,
        name: leadForm.name.trim(),
        company: leadForm.company,
        email: leadForm.email,
        phone: leadForm.phone,
        expectedPrice: leadForm.expectedPrice,
        systemNeeded: leadForm.systemNeeded === LEAD_SYSTEM_CUSTOM_VALUE ? (leadForm.systemNeededCustom || "") : leadForm.systemNeeded,
        status: leadForm.status,
        source: leadForm.source,
        address: leadForm.address,
        city: leadForm.city,
        state: leadForm.state,
        zip: leadForm.zip,
        country: leadForm.country,
        website: leadForm.website,
        vatNumber: leadForm.vatNumber,
        gstNumber: leadForm.gstNumber,
        currency: leadForm.currency,
        currencySymbol: leadForm.currencySymbol,
        labels: (leadForm.labels || []).map((x) => x?.toString?.() ?? String(x)),
        reminderDate: leadForm.reminderDate ? new Date(leadForm.reminderDate).toISOString() : undefined,
        conversationNotes: leadForm.conversationNotes,
      };
      if (leadForm.ownerId !== "-") payload.ownerId = leadForm.ownerId;

      const url = editingId ? `${API_BASE}/api/leads/${editingId}` : `${API_BASE}/api/leads`;
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to save");
      toast.success(editingId ? "Lead updated" : "Lead created");
      setOpenAdd(false);
      setEditingId(null);
      try {
        localStorage.setItem("crm_leads_changed", String(Date.now()));
      } catch {}
      try {
        window.dispatchEvent(new Event("crm:leads:changed"));
      } catch {}
      await loadLeads();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save lead");
    } finally {
      setIsSaving(false);
    }
  };
    const deleteLead = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/leads/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      toast.success("Lead deleted");
      try {
        localStorage.setItem("crm_leads_changed", String(Date.now()));
      } catch {}
      try {
        window.dispatchEvent(new Event("crm:leads:changed"));
      } catch {}
      await loadLeads();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete lead");
    }
  };

  const createLabel = async () => {
    try {
      const name = manageLabelName.trim();
      if (!name) {
        toast.error("Label is required");
        return;
      }
      const res = await fetch(`${API_BASE}/api/lead-labels`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ name, color: manageLabelColor }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      toast.success("Label created");
      setManageLabelName("");
      await loadLabels();
    } catch (e: any) {
      toast.error(e?.message || "Failed to create label");
    }
  };

  const deleteLabel = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/lead-labels/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      toast.success("Label deleted");
      await loadLabels();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete label");
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

  const exportExcel = () => {
    const rows: string[][] = [
      ["Name", "Primary contact", "Phone", "Owner", "Lead value", "Labels", "Created", "Status", "Source"],
      ...displayItems.map((l) => [
        l.name || "",
        displayContactName(primaryContactByLeadId.get(l._id)),
        l.phone || "",
        l.ownerId ? (employeeNameById.get(l.ownerId) || "-") : "-",
        formatLeadValue(l),
        Array.isArray(l.labels) ? l.labels.map((id) => labelById.get(id)?.name).filter(Boolean).join(", ") : "",
        formatDate(l.createdAt),
        l.status || "New",
        l.source || "",
      ]),
    ];
    downloadCsv(`leads_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const printLeads = () => {
    const rowsHtml = displayItems
      .map((l) => {
        const owner = l.ownerId ? (employeeNameById.get(l.ownerId) || "-") : "-";
        const value = formatLeadValue(l);
        const labels = Array.isArray(l.labels) ? l.labels.map((id) => labelById.get(id)?.name).filter(Boolean).join(", ") : "";
        const created = formatDate(l.createdAt);
        const status = l.status || "New";
        const source = l.source || "-";
        return `
          <tr>
            <td>${l.name || "-"}</td>
            <td>${displayContactName(primaryContactByLeadId.get(l._id))}</td>
            <td>${l.phone || "-"}</td>
            <td>${owner}</td>
            <td>${value}</td>
            <td>${labels || "-"}</td>
            <td>${created}</td>
            <td>${status}</td>
            <td>${source}</td>
          </tr>
        `;
      })
      .join("");

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Leads</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 16px; }
      h1 { font-size: 18px; margin: 0 0 12px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
      th { background: #f5f5f5; text-align: left; }
    </style>
  </head>
  <body>
    <h1>Leads</h1>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Primary contact</th>
          <th>Phone</th>
          <th>Owner</th>
          <th>Lead value</th>
          <th>Labels</th>
          <th>Created</th>
          <th>Status</th>
          <th>Source</th>
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

  const downloadSampleImport = () => {
    const rows: string[][] = [
      ["name", "company", "phone", "status", "source"],
      ["Sarah Johnson", "Tech Solutions Inc", "+1 (555) 123-4567", "Qualified", "Website"],
      ["Michael Chen", "Digital Dynamics", "+1 (555) 234-5678", "New", "LinkedIn"],
    ];
    downloadCsv("leads_sample.csv", rows);
  };

  const parseCsv = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return [];
    const header = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const rows = lines.slice(1).map((line) => {
      const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const obj: any = {};
      header.forEach((h, i) => {
        obj[h] = cols[i] ?? "";
      });
      return obj;
    });
    return rows;
  };

  const importLeads = async () => {
    try {
      const f = importRef.current?.files?.[0];
      if (!f) {
        toast.error("Please choose a CSV file");
        return;
      }
      const rows = await parseCsv(f);
      if (!rows.length) {
        toast.error("No rows found");
        return;
      }

      const res = await fetch(`${API_BASE}/api/leads/bulk`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ items: rows }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to import");
      toast.success("Imported");
      setOpenImport(false);
      if (importRef.current) importRef.current.value = "";
      await loadLeads();
    } catch (e: any) {
      toast.error(e?.message || "Failed to import");
    }
  };

  const createLeadContactFromForm = async (leadId: string) => {
    const firstName = String(makeClientForm.firstName || "").trim();
    const lastName = String(makeClientForm.lastName || "").trim();
    const email = String(makeClientForm.email || "").trim();
    const phone = String(makeClientForm.contactPhone || makeClientForm.phone || "").trim();
    const jobTitle = String(makeClientForm.jobTitle || "").trim();
    const skype = String(makeClientForm.skype || "").trim();

    const name = `${firstName}${lastName ? ` ${lastName}` : ""}`.trim();
    if (!name) throw new Error("Contact name is required");
    if (!email) throw new Error("Contact email is required");

    if (makeClientForm.primaryContact) {
      try {
        const params = new URLSearchParams();
        params.set("leadId", leadId);
        const r = await fetch(`${API_BASE}/api/contacts?${params.toString()}`, { headers: getAuthHeaders() });
        const json = await r.json().catch(() => null);
        if (r.ok && Array.isArray(json)) {
          const updates = json
            .filter((c: any) => c?._id && c.isPrimaryContact)
            .map((c: any) =>
              fetch(`${API_BASE}/api/contacts/${c._id}`, {
                method: "PUT",
                headers: getAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ isPrimaryContact: false }),
              })
            );
          await Promise.all(updates);
        }
      } catch {
      }
    }

    const res = await fetch(`${API_BASE}/api/contacts`, {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        leadId,
        firstName,
        lastName,
        name,
        email,
        phone,
        skype,
        jobTitle,
        gender: makeClientForm.gender,
        isPrimaryContact: Boolean(makeClientForm.primaryContact),
      }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error || "Failed to create contact");
    await loadContacts();
  };

  const openConvertDialog = (mode: "client" | "contact", lead: LeadDoc) => {
    setConvertMode(mode);
    setMakeClientLead(lead);
    setMakeClientStep(mode === "contact" ? "contact" : "details");

    setMakeClientForm((p) => ({
      ...p,
      type: ((lead.type as any) || "Organization") as any,
      name: lead.name || "",
      phone: lead.phone || "",
      contactPhone: lead.phone || p.contactPhone,
      email: lead.email || p.email,
      firstName: p.firstName,
      lastName: p.lastName,
      primaryContact: true,
    }));

    setMakeClientOpen(true);
  };

  const saveMakeClient = async () => {
    try {
      const leadId = makeClientLead?._id;
      if (!leadId) return;

      if (convertMode === "contact") {
        await createLeadContactFromForm(leadId);
        toast.success("Contact added");
        setMakeClientOpen(false);
        setMakeClientLead(null);
        return;
      }

      const isOrg = makeClientForm.type === "Organization";
      const payload: any = {
        type: isOrg ? "org" : "person",
        company: isOrg ? makeClientForm.name : "",
        person: isOrg ? "" : makeClientForm.name,
        owner: makeClientForm.owner,
        address: makeClientForm.address,
        city: makeClientForm.city,
        state: makeClientForm.state,
        zip: makeClientForm.zip,
        country: makeClientForm.country,
        phone: makeClientForm.phone,
        website: makeClientForm.website,
        vatNumber: makeClientForm.vatNumber,
        gstNumber: makeClientForm.gstNumber,
        clientGroups: makeClientForm.clientGroups
          ? makeClientForm.clientGroups.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        currency: makeClientForm.currency,
        currencySymbol: makeClientForm.currencySymbol,
        labels: makeClientForm.labels
          ? makeClientForm.labels.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        disableOnlinePayment: Boolean(makeClientForm.disableOnlinePayment),
        // primary contact fields
        firstName: makeClientForm.firstName,
        lastName: makeClientForm.lastName,
        email: makeClientForm.email,
        contactPhone: makeClientForm.contactPhone || makeClientForm.phone,
        skype: makeClientForm.skype,
        jobTitle: makeClientForm.jobTitle,
        gender: makeClientForm.gender,
        isPrimaryContact: Boolean(makeClientForm.primaryContact),
      };

      const res = await fetch(`${API_BASE}/api/clients`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to create client");

      // Also create the lead contact record for CRM contacts list (same dialog data)
      try {
        await createLeadContactFromForm(leadId);
      } catch {
        // If contact creation fails, still allow client creation
      }

      toast.success("Client created");
      setMakeClientOpen(false);
      setMakeClientLead(null);
      navigate(`/clients/${json._id}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to create client");
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Duplicate Warning Dialog */}
      <Dialog open={openDuplicateWarning} onOpenChange={setOpenDuplicateWarning}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              Lead Already Exists
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-gray-600">
              A lead with this email or phone number already exists in the system:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 space-y-1">
              <p className="text-sm font-bold text-gray-900">{duplicateLeadData?.name}</p>
              <p className="text-xs text-gray-500">{duplicateLeadData?.email || "No email"}</p>
              <p className="text-xs text-gray-500">{duplicateLeadData?.phone || "No phone"}</p>
              <Badge variant="outline" className="mt-2 capitalize bg-white">
                Status: {duplicateLeadData?.status}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 font-medium">
              Do you still want to create this duplicate lead?
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpenDuplicateWarning(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white" 
              onClick={() => {
                setOpenDuplicateWarning(false);
                saveLead(true);
              }}
            >
              Yes, create duplicate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-6 text-sm">
          <h1 className="text-2xl font-bold font-display">Leads</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Dialog open={openManageLabels} onOpenChange={setOpenManageLabels}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline"><Tags className="w-4 h-4 mr-2"/>Manage labels</Button>
            </DialogTrigger>
            <DialogContent className="bg-card sm:max-w-2xl" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>Manage labels</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    "bg-lime-500",
                    "bg-green-500",
                    "bg-teal-500",
                    "bg-cyan-500",
                    "bg-slate-300",
                    "bg-orange-500",
                    "bg-amber-500",
                    "bg-red-500",
                    "bg-pink-500",
                    "bg-fuchsia-600",
                    "bg-sky-500",
                    "bg-slate-600",
                    "bg-blue-600",
                    "bg-violet-500",
                    "bg-purple-300",
                  ].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setManageLabelColor(c)}
                      className={cn(
                        "h-6 w-6 rounded-full border",
                        c,
                        manageLabelColor === c ? "ring-2 ring-offset-2 ring-primary" : ""
                      )}
                      aria-label={c}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input placeholder="Label" value={manageLabelName} onChange={(e)=>setManageLabelName(e.target.value)} />
                  <Button type="button" onClick={createLabel}>Save</Button>
                </div>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Label</TableHead>
                        <TableHead className="w-24">Color</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {labels.length ? labels.map((l) => (
                        <TableRow key={l._id}>
                          <TableCell>{l.name}</TableCell>
                          <TableCell><div className={cn("h-4 w-8 rounded", l.color || "bg-slate-300")} /></TableCell>
                          <TableCell className="text-right">
                            <Button type="button" variant="ghost" size="icon-sm" onClick={() => deleteLabel(l._id)} aria-label="delete">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">No labels</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={()=>setOpenManageLabels(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={openImport} onOpenChange={setOpenImport}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline"><Download className="w-4 h-4 mr-2"/>Import leads</Button>
            </DialogTrigger>
            <DialogContent className="bg-card sm:max-w-2xl" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>Import leads</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="border border-dashed rounded-md p-10 text-center text-sm text-muted-foreground">
                  <div className="mb-3">Drag-and-drop documents here</div>
                  <div className="mb-4">(or click to browse...)</div>
                  <input ref={importRef} type="file" accept=".csv,text/csv" className="hidden" />
                  <Button type="button" variant="outline" onClick={()=>importRef.current?.click()}>Browse</Button>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={downloadSampleImport}>Download sample file</Button>
                <Button type="button" variant="outline" onClick={()=>setOpenImport(false)}>Close</Button>
                <Button type="button" onClick={importLeads}>Next</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {canCreateLead && (
            <Button type="button" variant="gradient" onClick={openCreateLead}><Plus className="w-4 h-4 mr-2"/>Add lead</Button>
          )}

          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogContent className="bg-card max-w-3xl" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit lead" : "Add lead"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
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
                  <div className="space-y-1"><Label>Email</Label><Input type="email" placeholder="Email" value={leadForm.email} onChange={(e)=>setLeadForm((p)=>({ ...p, email: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Phone</Label><Input placeholder="Phone" value={leadForm.phone} onChange={(e)=>setLeadForm((p)=>({ ...p, phone: e.target.value }))} /></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-primary">Expected Lead Price *</Label>
                    <Input 
                      type="number" 
                      placeholder="Enter expected lead value in PKR" 
                      value={leadForm.expectedPrice} 
                      onChange={(e)=>setLeadForm((p)=>({ ...p, expectedPrice: e.target.value }))} 
                      className="border-primary/20 focus:border-primary focus:ring-primary/20"
                    />
                    <p className="text-xs text-muted-foreground">
                      This helps with lead prioritization and sales forecasting
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">System Needed</Label>
                    <Popover open={leadSystemOpen} onOpenChange={setLeadSystemOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={leadSystemOpen}
                          className="w-full justify-between"
                        >
                          {leadForm.systemNeeded === LEAD_SYSTEM_CUSTOM_VALUE
                            ? "Custom"
                            : leadForm.systemNeeded
                              ? leadForm.systemNeeded
                              : "-"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command value={leadSystemSearch} onValueChange={setLeadSystemSearch}>
                          <CommandInput placeholder="Search system..." />
                          <CommandList>
                            <CommandGroup>
                              <CommandItem
                                value="-"
                                onSelect={() => {
                                  setLeadForm((p) => ({ ...p, systemNeeded: "", systemNeededCustom: "" }));
                                  setLeadSystemSearch("");
                                  setLeadSystemOpen(false);
                                }}
                              >
                                <Check className={`mr-2 h-4 w-4 ${!leadForm.systemNeeded ? "opacity-100" : "opacity-0"}`} />
                                -
                              </CommandItem>

                              {uniqueSystemNeededOptions
                                .filter((option) => {
                                  const q = String(leadSystemSearch || "").trim().toLowerCase();
                                  if (!q) return true;
                                  return option.toLowerCase().includes(q);
                                })
                                .map((option) => {
                                  const selected = leadForm.systemNeeded === option;
                                  return (
                                    <CommandItem
                                      key={option}
                                      value={option}
                                      onSelect={() => {
                                        setLeadForm((p) => ({ ...p, systemNeeded: option, systemNeededCustom: "" }));
                                        setLeadSystemSearch("");
                                        setLeadSystemOpen(false);
                                      }}
                                    >
                                      <Check className={`mr-2 h-4 w-4 ${selected ? "opacity-100" : "opacity-0"}`} />
                                      {option}
                                    </CommandItem>
                                  );
                                })}

                              <CommandItem
                                value={LEAD_SYSTEM_CUSTOM_VALUE}
                                onSelect={() => {
                                  setLeadForm((p) => ({ ...p, systemNeeded: LEAD_SYSTEM_CUSTOM_VALUE, systemNeededCustom: "" }));
                                  setLeadSystemSearch("");
                                  setLeadSystemOpen(false);
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${leadForm.systemNeeded === LEAD_SYSTEM_CUSTOM_VALUE ? "opacity-100" : "opacity-0"}`}
                                />
                                + Add Custom Value
                              </CommandItem>
                            </CommandGroup>
                            {uniqueSystemNeededOptions.filter((option) => {
                              const q = String(leadSystemSearch || "").trim().toLowerCase();
                              if (!q) return false;
                              return option.toLowerCase().includes(q);
                            }).length === 0 && String(leadSystemSearch || "").trim() ? (
                              <CommandEmpty>No system found.</CommandEmpty>
                            ) : null}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {leadForm.systemNeeded === LEAD_SYSTEM_CUSTOM_VALUE ? (
                      <Input
                        placeholder="Enter custom system needed"
                        value={leadForm.systemNeededCustom}
                        onChange={(e) => setLeadForm((p) => ({ ...p, systemNeededCustom: e.target.value }))}
                        className="mt-2"
                      />
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Owner</Label>
                    <Popover open={leadOwnerOpen} onOpenChange={setLeadOwnerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={leadOwnerOpen}
                          className="w-full justify-between"
                        >
                          {leadForm.ownerId !== "-" ? employeeNameById.get(leadForm.ownerId) || "-" : "-"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command value={leadOwnerSearch} onValueChange={setLeadOwnerSearch}>
                          <CommandInput placeholder="Search owner..." />
                          <CommandList>
                            <CommandGroup>
                              <CommandItem
                                value="-"
                                onSelect={() => {
                                  setLeadForm((p) => ({ ...p, ownerId: "-" }));
                                  setLeadOwnerSearch("");
                                  setLeadOwnerOpen(false);
                                }}
                              >
                                <Check className={`mr-2 h-4 w-4 ${leadForm.ownerId === "-" ? "opacity-100" : "opacity-0"}`} />
                                -
                              </CommandItem>
                              {employees
                                .filter((e) => {
                                  const q = String(leadOwnerSearch || "").trim().toLowerCase();
                                  if (!q) return true;
                                  const label = employeeDisplayName(e).toLowerCase();
                                  return label.includes(q);
                                })
                                .map((e) => {
                                  const label = employeeDisplayName(e);
                                  const selected = leadForm.ownerId === e._id;
                                  return (
                                    <CommandItem
                                      key={e._id}
                                      value={label}
                                      onSelect={() => {
                                        setLeadForm((p) => ({ ...p, ownerId: e._id }));
                                        setLeadOwnerSearch("");
                                        setLeadOwnerOpen(false);
                                      }}
                                    >
                                      <Check className={`mr-2 h-4 w-4 ${selected ? "opacity-100" : "opacity-0"}`} />
                                      {label}
                                    </CommandItem>
                                  );
                                })}
                            </CommandGroup>
                            {employees.filter((e) => {
                              const q = String(leadOwnerSearch || "").trim().toLowerCase();
                              if (!q) return false;
                              const label = employeeDisplayName(e).toLowerCase();
                              return label.includes(q);
                            }).length === 0 && String(leadOwnerSearch || "").trim() ? (
                              <CommandEmpty>No owner found.</CommandEmpty>
                            ) : null}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1">
                    <Label>Source</Label>
                    <Select value={leadForm.source || "-"} onValueChange={(v)=>setLeadForm((p)=>({ ...p, source: v === "-" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-">Source</SelectItem>
                        <SelectItem value="Website">Website</SelectItem>
                        <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                        <SelectItem value="Referral">Referral</SelectItem>
                        <SelectItem value="Cold Call">Cold Call</SelectItem>
                        <SelectItem value="Trade Show">Trade Show</SelectItem>
                        <SelectItem value="WhatsApp">WhatsApp</SelectItem>
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
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label>Website</Label><Input placeholder="Website" value={leadForm.website} onChange={(e)=>setLeadForm((p)=>({ ...p, website: e.target.value }))} /></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>VAT Number</Label><Input placeholder="VAT Number" value={leadForm.vatNumber} onChange={(e)=>setLeadForm((p)=>({ ...p, vatNumber: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>GST Number</Label><Input placeholder="GST Number" value={leadForm.gstNumber} onChange={(e)=>setLeadForm((p)=>({ ...p, gstNumber: e.target.value }))} /></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Currency</Label><Input placeholder="Keep it blank to use the default (PKR)" value={leadForm.currency} onChange={(e)=>setLeadForm((p)=>({ ...p, currency: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Currency Symbol</Label><Input placeholder="Keep it blank to use the default (Rs.)" value={leadForm.currencySymbol} onChange={(e)=>setLeadForm((p)=>({ ...p, currencySymbol: e.target.value }))} /></div>
                </div>

                <div className="space-y-1">
                  <Label>Address</Label>
                  <Textarea placeholder="Address" value={leadForm.address} onChange={(e)=>setLeadForm((p)=>({ ...p, address: e.target.value }))} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="space-y-1"><Label>City</Label><Input value={leadForm.city} onChange={(e)=>setLeadForm((p)=>({ ...p, city: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>State</Label><Input value={leadForm.state} onChange={(e)=>setLeadForm((p)=>({ ...p, state: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Zip</Label><Input value={leadForm.zip} onChange={(e)=>setLeadForm((p)=>({ ...p, zip: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Country</Label><Input value={leadForm.country} onChange={(e)=>setLeadForm((p)=>({ ...p, country: e.target.value }))} /></div>
                </div>

                <div className="space-y-2">
                  <Label>Reminder Date & Time</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <DatePicker 
                        value={leadForm.reminderDate ? leadForm.reminderDate.slice(0, 10) : ""} 
                        onChange={(v) => {
                          const time = leadForm.reminderDate ? leadForm.reminderDate.slice(11, 16) : "09:00";
                          setLeadForm((p) => ({ ...p, reminderDate: v ? `${v}T${time}` : "" }));
                        }} 
                        placeholder="Pick reminder date" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Input 
                        type="time" 
                        value={leadForm.reminderDate ? leadForm.reminderDate.slice(11, 16) : "09:00"}
                        onChange={(e) => {
                          const date = leadForm.reminderDate ? leadForm.reminderDate.slice(0, 10) : "";
                          setLeadForm((p) => ({ ...p, reminderDate: date ? `${date}T${e.target.value}` : "" }));
                        }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Set a reminder to notify you when it's time to connect with this lead
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Conversation Notes</Label>
                  <Textarea 
                    placeholder="Enter notes about your last conversation with the client..." 
                    value={leadForm.conversationNotes} 
                    onChange={(e)=>setLeadForm((p)=>({ ...p, conversationNotes: e.target.value }))}
                    className="min-h-[100px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Keep track of your conversations with this lead. You can edit this anytime.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Labels</Label>
                  <Popover open={leadLabelOpen} onOpenChange={setLeadLabelOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={leadLabelOpen}
                        className="w-full justify-between"
                      >
                        {(() => {
                          const selectedId = (leadForm.labels || [])[0];
                          if (!selectedId) return "-";
                          const l = labelById.get(selectedId);
                          return l?.name || "-";
                        })()}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command value={leadLabelSearch} onValueChange={setLeadLabelSearch}>
                        <CommandInput placeholder="Search label..." autoComplete="off" />
                        <CommandList>
                          <CommandGroup>
                            <CommandItem
                              value="-"
                              onSelect={() => {
                                setLeadForm((p) => ({ ...p, labels: [] }));
                                setLeadLabelSearch("");
                                setLeadLabelOpen(false);
                              }}
                            >
                              <Check className={`mr-2 h-4 w-4 ${(leadForm.labels || []).length === 0 ? "opacity-100" : "opacity-0"}`} />
                              -
                            </CommandItem>
                            {labels
                              .filter((l) => {
                                const q = String(leadLabelSearch || "").trim().toLowerCase();
                                if (!q) return true;
                                return String(l?.name || "").toLowerCase().includes(q);
                              })
                              .map((l) => {
                                const id = l._id?.toString?.() ?? String(l._id);
                                const selected = (leadForm.labels || []).some((x) => (x?.toString?.() ?? String(x)) === id);
                                return (
                                  <CommandItem
                                    key={l._id}
                                    value={String(l?.name || "")}
                                    onSelect={() => {
                                      toggleLeadLabel(id);
                                      setLeadLabelSearch("");
                                      setLeadLabelOpen(false);
                                    }}
                                  >
                                    <Check className={`mr-2 h-4 w-4 ${selected ? "opacity-100" : "opacity-0"}`} />
                                    <span className={cn("mr-2 h-2 w-2 rounded-full", l.color || "bg-slate-300")} />
                                    <span>{l.name}</span>
                                  </CommandItem>
                                );
                              })}
                          </CommandGroup>
                          {!labels.length && !String(leadLabelSearch || "").trim() ? (
                            <CommandEmpty>No labels available.</CommandEmpty>
                          ) : null}
                          {labels.filter((l) => {
                            const q = String(leadLabelSearch || "").trim().toLowerCase();
                            if (!q) return false;
                            return String(l?.name || "").toLowerCase().includes(q);
                          }).length === 0 && String(leadLabelSearch || "").trim() ? (
                            <CommandEmpty>No label found.</CommandEmpty>
                          ) : null}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenAdd(false)} disabled={isSaving}>Close</Button>
                <Button type="button" onClick={() => saveLead()} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="list">
        <TabsList className="bg-muted/40">
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
        </TabsList>

        {/* Filter toolbar */}
        <Card className="p-3 mt-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="icon" onClick={() => loadLeads()}><RefreshCw className="w-4 h-4"/></Button>
            <Select value={filterOwnerId} onValueChange={setFilterOwnerId}>
              <SelectTrigger className="w-40"><SelectValue placeholder="- Owner -"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="-">- Owner -</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e._id} value={e._id}>{(e.name || `${e.firstName || ""} ${e.lastName || ""}`.trim() || "-").trim()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40"><SelectValue placeholder="- Status -"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="-">- Status -</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterLabelId} onValueChange={setFilterLabelId}>
              <SelectTrigger className="w-40"><SelectValue placeholder="- Label -"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="-">- Label -</SelectItem>
                {labels.map((l) => (
                  <SelectItem key={l._id} value={l._id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-40"><SelectValue placeholder="- Source -"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="-">- Source -</SelectItem>
                <SelectItem value="Website">Website</SelectItem>
                <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                <SelectItem value="Referral">Referral</SelectItem>
                <SelectItem value="Cold Call">Cold Call</SelectItem>
                <SelectItem value="Trade Show">Trade Show</SelectItem>
                <SelectItem value="WhatsApp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
            <div className="w-40">
              <DatePicker value={filterCreatedFrom} onChange={setFilterCreatedFrom} placeholder="Created from" />
            </div>
            <div className="w-40">
              <DatePicker value={filterCreatedTo} onChange={setFilterCreatedTo} placeholder="Created to" />
            </div>
            <Button type="button" variant="success" size="icon" onClick={applyFilters}><Check className="w-4 h-4"/></Button>
            <Button type="button" variant="outline" size="icon" onClick={clearFilters}><X className="w-4 h-4"/></Button>
            <div className="ml-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9 w-64" placeholder="Search" value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} />
            </div>
          </div>
        </Card>

        {/* List */}
        <TabsContent value="list" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-b">
                <div className="text-sm text-muted-foreground">{loading ? "Loading..." : `${displayItems.length} leads`}</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button type="button" variant="outline" onClick={printLeads}><Printer className="w-4 h-4 mr-2"/>Print</Button>
                  <Button type="button" variant="outline" onClick={exportExcel}><Download className="w-4 h-4 mr-2"/>Excel</Button>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Name</TableHead>
                    <TableHead>Primary contact</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Next follow-up</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Lead value</TableHead>
                    <TableHead>Labels</TableHead>
                    <TableHead>Created date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayItems.length ? displayItems.map((lead) => {
                    const status = lead.status || "New";
                    const variant = (STATUS_VARIANT_BY_VALUE.get(status) || "default") as any;
                    const ownerName = lead.ownerId ? (employeeNameById.get(lead.ownerId) || "-") : "-";
                    const owner = lead.ownerId ? employees.find((e) => String(e._id) === String(lead.ownerId)) : undefined;
                    const leadLabels = Array.isArray(lead.labels) ? lead.labels.map((id) => labelById.get(id)).filter(Boolean) : [];
                    const primary = primaryContactByLeadId.get(lead._id);
                    const primaryPhone = primary?.phone;
                    const phoneForWhatsapp = lead.phone || primaryPhone || "";
                    const next = nextReminderByLeadId?.[lead._id];
                    return (
                      <TableRow key={lead._id}>
                        <TableCell className="whitespace-nowrap">
                          <button
                            type="button"
                            className="text-primary underline cursor-pointer"
                            onClick={() => navigate(`/crm/leads/${lead._id}`)}
                          >
                            {lead.name}
                          </button>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {primary ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                {primary.avatar ? <AvatarImage src={`${API_BASE}${primary.avatar}`} alt="avatar" /> : null}
                                <AvatarFallback className="text-[10px]">
                                  {getInitials(displayContactName(primary))}
                                </AvatarFallback>
                              </Avatar>
                              <button
                                type="button"
                                className="text-primary underline cursor-pointer"
                                onClick={() => navigate(`/crm/contacts/${primary._id}`)}
                              >
                                {displayContactName(primary)}
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{lead.phone || "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {next?.dueAt ? (
                            <div className="flex items-center gap-2">
                              {(() => {
                                const dueAt = new Date(next.dueAt);
                                const now = new Date();
                                const isOverdue = dueAt < now;
                                const reminderCount = reminderCountsByLeadId[lead._id] || 1;
                                return (
                                  <>
                                    <span className={cn(
                                      "text-xs",
                                      isOverdue ? "text-red-600 font-semibold dark:text-red-400" : "text-muted-foreground"
                                    )}>
                                      {dueAt.toLocaleString()}
                                      {isOverdue && " (Overdue)"}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <Badge 
                                        variant={isOverdue ? "destructive" : "secondary"} 
                                        className={cn(
                                          "max-w-[120px] truncate",
                                          isOverdue && "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"
                                        )}
                                      >
                                        {String(next.title || "Follow-up")}
                                      </Badge>
                                      {reminderCount > 1 && (
                                        <Badge 
                                          variant="outline" 
                                          className="text-xs px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
                                          title={`${reminderCount} follow-ups total`}
                                        >
                                          +{reminderCount - 1}
                                        </Badge>
                                      )}
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {lead.ownerId ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                {(owner?.avatar || owner?.image) ? (
                                  <AvatarImage src={`${API_BASE}${owner?.avatar || owner?.image}`} alt="avatar" />
                                ) : null}
                                <AvatarFallback className="text-[10px]">{getInitials(ownerName)}</AvatarFallback>
                              </Avatar>
                              <button
                                type="button"
                                className="text-primary underline cursor-pointer"
                                onClick={() =>
                                  navigate(`/hrm/employees/${lead.ownerId}`, {
                                    state: { dbId: lead.ownerId, employee: { id: 0, name: ownerName, initials: getInitials(ownerName) } },
                                  })
                                }
                              >
                                {ownerName}
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-semibold text-green-600 dark:text-green-400">{formatLeadValue(lead)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {leadLabels.length ? leadLabels.map((l) => (
                              <span key={l!._id} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
                                <span className={cn("h-2 w-2 rounded-full", l!.color || "bg-slate-300")} />
                                <span>{l!.name}</span>
                              </span>
                            )) : "-"}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{formatDate(lead.createdAt)}</TableCell>
                        <TableCell className="whitespace-nowrap"><Badge variant={variant}>{status}</Badge></TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="ghost" size="icon-sm"><MoreHorizontal className="w-4 h-4"/></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canUpdateLead && (
                                <DropdownMenuItem onClick={() => openWhatsappDirect(lead.phone, lead.name)}>
                                  <MessageSquare className="w-4 h-4 mr-2" />
                                  Chat on WhatsApp
                                </DropdownMenuItem>
                              )}
                              {canUpdateLead && (
                                <DropdownMenuItem onClick={() => openEditLead(lead)}><Edit className="w-4 h-4 mr-2"/>Edit</DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => openAddFollowup(lead)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add follow-up
                              </DropdownMenuItem>
                              {next?._id && (
                                <DropdownMenuItem 
                                  onClick={() => markReminderDone(next._id)}
                                  className="text-green-600 dark:text-green-400"
                                >
                                  <Check className="w-4 h-4 mr-2" />
                                  Mark follow-up done
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => openWhatsappReminder(phoneForWhatsapp, lead.name)}
                                disabled={!phoneForWhatsapp}
                              >
                                <ExternalLink className="w-4 h-4 mr-2"/>
                                WhatsApp reminder
                              </DropdownMenuItem>
                              {role === "admin" && (
                                <DropdownMenuItem onClick={() => approveLead(lead._id)}><Check className="w-4 h-4 mr-2"/>Approve to Client</DropdownMenuItem>
                              )}
                              {canDeleteThisLead(lead) && (
                                <DropdownMenuItem onClick={() => deleteLead(lead._id)} className="text-destructive"><Trash2 className="w-4 h-4 mr-2"/>Delete</DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  }) : (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground">No leads</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <Dialog open={openQuickReminder} onOpenChange={setOpenQuickReminder}>
          <DialogContent className="bg-card" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>Schedule follow-up</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="text-sm text-muted-foreground">
                Lead: <span className="text-foreground font-medium">{quickReminderLead?.name || "-"}</span>
              </div>
              <div className="space-y-1">
                <Label>Title</Label>
                <Input value={quickReminderForm.title} onChange={(e)=>setQuickReminderForm((p)=>({ ...p, title: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Date</Label>
                  <DatePicker value={quickReminderForm.date} onChange={(v)=>setQuickReminderForm((p)=>({ ...p, date: v }))} placeholder="Pick date" />
                </div>
                <div className="space-y-1">
                  <Label>Time</Label>
                  <Input type="time" value={quickReminderForm.time} onChange={(e)=>setQuickReminderForm((p)=>({ ...p, time: e.target.value }))} />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <Label>Repeat</Label>
                <Checkbox checked={quickReminderForm.repeat} onCheckedChange={(v)=>setQuickReminderForm((p)=>({ ...p, repeat: Boolean(v) }))} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={()=>setOpenQuickReminder(false)}>Close</Button>
              <Button type="button" onClick={saveQuickReminder}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Kanban */}
        <TabsContent value="kanban" className="mt-4">
          <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 lg:mx-0 lg:px-0">
            {columns.map((c) => (
              <div key={c.id} className="flex-shrink-0 w-[280px]">
                <Card className="h-full">
                  <CardHeader className="p-3 pb-2">
                    <div className="text-sm font-medium">{c.title}</div>
                    <div className={cn("h-0.5 mt-2 rounded", c.color)} />
                  </CardHeader>
                  <CardContent
                    className={cn(
                      "p-2 pt-0 space-y-2 min-h-[140px]",
                      dragOverStatus === c.id ? "bg-muted/30" : ""
                    )}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverStatus(c.id);
                    }}
                    onDragLeave={() => setDragOverStatus((s) => (s === c.id ? null : s))}
                    onDrop={(e) => {
                      e.preventDefault();
                      const leadId = e.dataTransfer.getData("text/leadId") || draggingLeadIdRef.current;
                      setDragOverStatus(null);
                      if (!leadId) return;
                      void updateLeadStatus(leadId, c.id);
                      draggingLeadIdRef.current = null;
                      draggingFromStatusRef.current = null;
                    }}
                  >
                    {kanbanGroups[c.id]?.map((lead) => (
                      <div
                        key={lead._id}
                        draggable
                        onDragStart={(e) => {
                          draggingLeadIdRef.current = lead._id;
                          draggingFromStatusRef.current = lead.status || "New";
                          e.dataTransfer.setData("text/leadId", lead._id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => {
                          draggingLeadIdRef.current = null;
                          draggingFromStatusRef.current = null;
                          setDragOverStatus(null);
                        }}
                        className="kanban-card cursor-grab active:cursor-grabbing group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            className="font-medium text-sm truncate text-left"
                            onClick={() => navigate(`/crm/leads/${lead._id}`)}
                          >
                            {lead.name}
                          </button>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {canCreateLead && (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openConvertDialog("contact", lead);
                                  }}
                                  aria-label="+ Contact"
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openConvertDialog("client", lead);
                                  }}
                                  aria-label="Make client"
                                >
                                  <UserPlus className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {canUpdateLead && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditLead(lead);
                                }}
                                aria-label="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`/crm/leads/${lead._id}`, "_blank", "noopener,noreferrer");
                              }}
                              aria-label="Open"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="mt-1 text-sm font-semibold">{formatLeadValue(lead)}</div>
                        <div className="text-xs text-muted-foreground mt-1">{lead.source || "-"}</div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                          <div className="inline-flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            <span>{kanbanCounts[String(lead._id)]?.contacts ?? (contactCountByLeadId.get(String(lead._id)) || 0)}</span>
                          </div>
                          <div className="inline-flex items-center gap-1">
                            <Paperclip className="w-3.5 h-3.5" />
                            <span>{kanbanCounts[String(lead._id)]?.files ?? 0}</span>
                          </div>
                          <div className="inline-flex items-center gap-1">
                            <FileSignature className="w-3.5 h-3.5" />
                            <span>{kanbanCounts[String(lead._id)]?.contracts ?? 0}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                          <span>{formatRelative(lead.createdAt)}</span>
                          <Avatar className="h-6 w-6">
                            {(() => {
                              const owner = lead.ownerId ? employees.find((e) => String(e._id) === String(lead.ownerId)) : undefined;
                              const src = owner?.avatar || owner?.image;
                              return src ? <AvatarImage src={`${API_BASE}${src}`} alt="avatar" /> : null;
                            })()}
                            <AvatarFallback>
                              {getInitials(lead.ownerId ? employeeNameById.get(lead.ownerId) : lead.name)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          <Dialog open={makeClientOpen} onOpenChange={setMakeClientOpen}>
            <DialogContent className="bg-card max-w-3xl" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>
                  {convertMode === "contact"
                    ? (makeClientLead?.name ? `+ Contact: ${makeClientLead.name}` : "+ Contact")
                    : (makeClientLead?.name ? `Make client: ${makeClientLead.name}` : "Make client")}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

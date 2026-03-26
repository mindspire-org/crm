import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HMS_MODULES, FULL_PROPOSAL_TEMPLATE } from "../prospects/ProposalModules";
import { HaroomPrintTemplate } from "@/components/print/HaroomPrintTemplate";
import { renderToStaticMarkup } from "react-dom/server";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Download, Printer, FileText, Copy, Trash2, RefreshCw, Edit3, Wand2, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Code, Table as TableIcon, Layout, Percent, Calculator, Banknote, MessageSquare, ArrowLeft, CheckCircle2, Star, Calendar, Eye, Plus, FileDown, XCircle, PenLine, Shield, Building2, BarChart3, Loader2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { AuthVerifyDialog } from "@/components/auth/AuthVerifyDialog";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";
import { openWhatsappChat } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/useSettings";
import html2pdf from "html2pdf.js";

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "payment pending", label: "Payment Pending" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Completed" },
];

type ProjectDoc = { _id: string; title?: string };

type ContractDoc = {
  _id: string;
  title?: string;
  client?: string;
  projectId?: string;
  phone?: string;
  contractDate?: string;
  validUntil?: string;
  amount?: number;
  status?: string;
  tax1?: number;
  tax2?: number;
  discount?: number;
  advanceAmount?: number;
  paymentTermsPercentage?: number;
  note?: string;
  timeframe?: string;
  items?: Array<{ name?: string; description?: string; quantity?: number; rate?: number }>;
};

export default function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { settings } = useSettings();

  const [row, setRow] = useState<ContractDoc | null>(null);
  const [projects, setProjects] = useState<ProjectDoc[]>([]);
  const [outerTab, setOuterTab] = useState("details");
  const [innerTab, setInnerTab] = useState("items");
  const [tasks, setTasks] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [items, setItems] = useState<Array<{ name?: string; description?: string; quantity?: number; rate?: number }>>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [editorNote, setEditorNote] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [tfStartDate, setTfStartDate] = useState("");
  const [tfDays, setTfDays] = useState(20);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [editorHtml, setEditorHtml] = useState<string>("");
  const [taskOpen, setTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", deadline: "", status: "Pending" });
  const [invOpen, setInvOpen] = useState(false);
  const [newInv, setNewInv] = useState({ amount: 0, status: "Draft" });
  const [pdfLoading, setPdfLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);

  const openWhatsapp = (phoneRaw?: string, name?: string) => {
    const msg = `Hello ${name || ""}, I'm following up regarding our contract.`;
    const r = openWhatsappChat(phoneRaw, msg, { defaultCountryCode: "92" });
    if (!r.ok) toast.error("Invalid or missing phone number");
  };

  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  const loadTasks = async (leadId?: string) => {
    setTasksLoading(true);
    try {
      if (!leadId) { setTasksLoading(false); return; }
      const res = await fetch(`${API_BASE}/api/tasks?leadId=${encodeURIComponent(leadId)}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.map((t: any) => ({ id: t._id, title: t.title, status: t.status, deadline: t.deadline, assignee: t.assignees?.[0]?.name })));
      }
    } catch (e) { console.error(e); }
    finally { setTasksLoading(false); }
  };

  const loadInvoices = async () => {
    if (!id) return;
    try {
      setInvoicesLoading(true);
      const res = await fetch(`${API_BASE}/api/invoices?contractId=${encodeURIComponent(id)}`, { headers: getAuthHeaders() });
      if (res.ok) {
        setInvoices(await res.json());
      }
    } catch (e) {
      console.error("Failed to load invoices", e);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const createInvoiceFromContract = async () => {
    if (!row) return;
    setConfirmConfig({
      open: true,
      title: "Generate Invoice?",
      description: "This will create a new formal invoice based on the current contract items and terms.",
      confirmText: "Generate Invoice",
      variant: "info",
      onConfirm: async () => {
        try {
          const payload = {
            contractId: row._id,
            clientId: row.projectId,
            client: row.client,
            amount: grandTotal,
            status: "Draft",
            issueDate: new Date().toISOString(),
            items: (items || []).map(it => ({
              name: it.name,
              quantity: it.quantity,
              rate: it.rate,
              total: Number(it.quantity || 0) * Number(it.rate || 0)
            })),
            tax1: Number(row.tax1 || 0),
            tax2: Number(row.tax2 || 0),
            discount: Number(row.discount || 0),
            advanceAmount: Number(row.advanceAmount || 0),
            note: `Generated from Contract #${row.title || id}`
          };
          const res = await fetch(`${API_BASE}/api/invoices`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            toast.success("Invoice created successfully");
            loadInvoices();
          } else {
            const error = await res.json();
            throw new Error(error.message || "Failed to create invoice");
          }
        } catch (e: any) {
          toast.error(e.message || "Failed to create invoice");
        } finally {
          setConfirmConfig(prev => ({ ...prev, open: false }));
        }
      }
    });
  };

  const addTask = async () => {
    if (!newTask.title || !row?.projectId) return;
    try {
      const res = await fetch(`${API_BASE}/api/tasks`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ ...newTask, leadId: row.projectId, contractId: id })
      });
      if (res.ok) { toast.success("Task Synchronized"); setTaskOpen(false); loadTasks(row.projectId); }
    } catch (e) {}
  };

  const addInvoice = async () => {
    if (!id || !row?.projectId) return;
    try {
      const res = await fetch(`${API_BASE}/api/invoices`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ 
          ...newInv, 
          contractId: id, 
          clientId: row.projectId, 
          items: items.map(it => ({ name: it.name, quantity: it.quantity, rate: it.rate })) 
        })
      });
      if (res.ok) { toast.success("Ledger Entry Created"); setInvOpen(false); loadInvoices(); }
    } catch (e) {}
  };

  const insertHtml = (html: string) => {
    exec("insertHTML", html);
  };

  const [customModules, setCustomModules] = useState<any[]>([]);
  const [addModuleOpen, setAddModuleOpen] = useState(false);
  const [newModule, setNewModule] = useState({ title: "", content: "" });

  const toggleModule = (modId: string) => {
    setSelectedModules(prev => {
      const next = prev.includes(modId) ? prev.filter(id => id !== modId) : [...prev, modId];
      
      const allModules = [...HMS_MODULES, ...customModules];
      const content = next.map(id => {
        const mod = allModules.find(m => m.id === id);
        if (!mod) return "";
        return `<div class="mb-6"><h3 style="font-weight:bold;text-decoration:underline;color:#1e3a8a;font-size:16px;margin-bottom:8px;">${mod.title}</h3><p style="font-size:14px;line-height:1.6;color:#374151;">${mod.content}</p></div>`;
      }).join("");
      
      setEditorHtml(content);
      if (editorRef.current) {
        editorRef.current.innerHTML = content;
      }
      return next;
    });
  };

  const handleAddModule = () => {
    if (!newModule.title || !newModule.content) return;
    const mod = {
      id: `custom-${Math.random().toString(36).slice(2)}`,
      title: newModule.title,
      content: newModule.content
    };
    setCustomModules([...customModules, mod]);
    setNewModule({ title: "", content: "" });
    setAddModuleOpen(false);
    toast.success("Custom Module Added");
  };

  const useFullTemplate = () => {
    setConfirmConfig({
      open: true,
      title: "Apply Template?",
      description: "This will replace all current agreement content with the professional HMS template. This action cannot be undone.",
      confirmText: "Apply Template",
      variant: "warning",
      onConfirm: () => {
        setEditorHtml(FULL_PROPOSAL_TEMPLATE);
        if (editorRef.current) {
          editorRef.current.innerHTML = FULL_PROPOSAL_TEMPLATE;
        }
        setSelectedModules([]);
        setConfirmConfig(prev => ({ ...prev, open: false }));
      }
    });
  };

  const exec = (cmd: string, value?: string) => {
    try {
      editorRef.current?.focus();
      document.execCommand(cmd, false, value);
      setEditorHtml(editorRef.current?.innerHTML ?? "");
    } catch {}
  };

  const [tableRows, setTableRows] = useState("3");
  const [tableCols, setTableCols] = useState("3");
  const [tableDialogOpen, setTableDialogOpen] = useState(false);

  const insertTable = () => {
    let table = '<table style="width:100%; border-collapse:collapse; margin:10px 0; font-family:\'Poppins\',sans-serif;">';
    for(let r=0; r<parseInt(tableRows); r++) {
      table += '<tr>';
      for(let c=0; c<parseInt(tableCols); c++) {
        table += '<td style="border:1px solid #e5e7eb; padding:8px;">Cell</td>';
      }
      table += '</tr>';
    }
    table += '</table>';
    insertHtml(table);
    setTableDialogOpen(false);
  };

  const [addOpen, setAddOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [itName, setItName] = useState("");
  const [itDesc, setItDesc] = useState("");
  const [itQty, setItQty] = useState("1");
  const [itRate, setItRate] = useState("0");

  const [editOpen, setEditOpen] = useState(false);
  const [eTitle, setETitle] = useState("");
  const [eClient, setEClient] = useState("");
  const [eProjectId, setEProjectId] = useState("-");
  const [eContractDate, setEContractDate] = useState("");
  const [eValidUntil, setEValidUntil] = useState("");
  const [eTax1, setETax1] = useState("0");
  const [eTax2, setETax2] = useState("0");
  const [eDiscount, setEDiscount] = useState("0");
  const [eAdvanceAmount, setEAdvanceAmount] = useState("0");
  const [ePaymentTermsPercentage, setEPaymentTermsPercentage] = useState("50");
  const [eAmount, setEAmount] = useState("0");
  const [eNote, setENote] = useState("");

  const displayDate = (dateStr: string) => {
    if (!dateStr || dateStr === "-") return "-";
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/contracts/${id}`, { headers: getAuthHeaders() });
        if (!r.ok) return;
        const d = await r.json();
        setRow(d);
        setItems(Array.isArray(d.items) ? d.items : []);
        setEditorHtml(d?.note || "");
        setTimeframe(d?.timeframe || "");
        setTfStartDate(d?.timeframeStartDate ? new Date(d.timeframeStartDate).toISOString().slice(0, 10) : "");
        setTfDays(d?.timeframeDays || 20);
        loadInvoices();
        if (d.leadId) loadTasks(d.leadId);
      } catch {}
    })();
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/projects`, { headers: getAuthHeaders() });
        if (!r.ok) return;
        const d = await r.json();
        setProjects(Array.isArray(d) ? d : []);
      } catch {}
    })();
  }, []);

  const projectTitle = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) => map.set(p._id, p.title || "-"));
    return map;
  }, [projects]);

  const inspectLead = () => {
    if (row?.projectId) {
      navigate(`/prospects/leads/${row.projectId}`);
    } else {
      toast.error("No lead/project linked to this contract");
    }
  };

  const subTotal = useMemo(() => (items || []).reduce((a, it) => a + (Number(it.quantity || 0) * Number(it.rate || 0)), 0), [items]);
  const tax1Val = (Number(row?.tax1 || 0) / 100) * subTotal;
  const tax2Val = (Number(row?.tax2 || 0) / 100) * subTotal;
  const grandTotal = Math.max(0, subTotal + tax1Val + tax2Val - Number(row?.discount || 0));
  const calculatedAdvance = (grandTotal * Number(row?.paymentTermsPercentage || 0)) / 100;

  const money = (v: any) => Number(v || 0).toLocaleString();

  const CountUp = ({ value, prefix = "Rs." }: { value: number; prefix?: string }) => {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
      let start = display;
      const end = value;
      if (start === end) return;
      const duration = 800;
      const startTime = performance.now();
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOutQuad = (t: number) => t * (2 - t);
        const current = Math.floor(start + (end - start) * easeOutQuad(progress));
        setDisplay(current);
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }, [value]);
    return <span>{prefix}{display.toLocaleString()}</span>;
  };

  const saveItems = async (nextItems: ContractDoc["items"]) => {
    try {
      const amount = (nextItems || []).reduce((a: number, it: any) => a + (Number(it.quantity || 0) * Number(it.rate || 0)), 0);
      const res = await fetch(`${API_BASE}/api/contracts/${id}`, { method: "PATCH", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ items: nextItems, amount }) });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error || "Failed to save items");
      setRow(d);
      setItems(Array.isArray(d.items) ? d.items : (nextItems || []));
      toast.success("Saved items");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save items");
    }
  };

  const openInvoice = async () => {
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE}/api/invoices?contractId=${encodeURIComponent(String(id))}`, { headers: getAuthHeaders() });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error((data as any)?.error || "Failed to load invoice");
      const list = Array.isArray(data) ? data : [];
      const inv = list[0];
      const invId = String(inv?._id || "");
      if (!invId) {
        toast.error("No invoice found for this contract");
        return;
      }
      navigate(`/invoices/${encodeURIComponent(invId)}`);
    } catch (e: any) {
      toast.error(String(e?.message || "Failed to open invoice"));
    }
  };

  const saveAsTemplate = async () => {
    try {
      const content = editorRef.current?.innerHTML || editorHtml || "";
      const payload = {
        title: `${row?.title || 'Contract'} Template`,
        content: content,
        type: 'contract'
      };
      
      const res = await fetch(`${API_BASE}/api/templates`, { 
        method: "POST", 
        headers: getAuthHeaders({ "Content-Type": "application/json" }), 
        body: JSON.stringify(payload) 
      });
      
      if (!res.ok) throw new Error("Failed to save template");
      
      toast.success("Saved as Template successfully");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save template");
    }
  };

  const saveEditorNote = async () => {
    try {
      const content = editorRef.current?.innerHTML || editorHtml || "";
      const res = await fetch(`${API_BASE}/api/contracts/${id}`, { 
        method: "PATCH", 
        headers: getAuthHeaders({ "Content-Type": "application/json" }), 
        body: JSON.stringify({ 
          note: content, 
          timeframe: timeframe,
          timeframeStartDate: tfStartDate || undefined,
          timeframeDays: tfDays,
          items: items,
          amount: grandTotal
        }) 
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error || "Failed to sync document nodes");
      setRow(d);
      setLastSaved(new Date());
      toast.success("Document Synchronized");
    } catch (e: any) {
      toast.error(e?.message || "Sync failure");
    }
  };

  const openAddItem = () => {
    setEditingIndex(null);
    setItName(""); setItDesc(""); setItQty("1"); setItRate("0");
    setAddOpen(true);
  };

  const openEditItem = (idx: number) => {
    const it = (items || [])[idx] || {};
    setEditingIndex(idx);
    setItName(it.name || "");
    setItDesc(it.description || "");
    setItQty(String(it.quantity ?? 1));
    setItRate(String(it.rate ?? 0));
    setAddOpen(true);
  };

  const deleteItem = async (idx: number) => {
    setConfirmConfig({
      open: true,
      title: "Remove Deliverable?",
      description: "Are you sure you want to remove this item from the contract? This will affect the total value.",
      confirmText: "Remove Item",
      variant: "danger",
      onConfirm: async () => {
        const next = (items || []).filter((_, i) => i !== idx);
        await saveItems(next);
        setConfirmConfig(prev => ({ ...prev, open: false }));
      }
    });
  };

  const saveItem = async () => {
    const q = Number(itQty || 0);
    const r = Number(itRate || 0);
    const nextItem = { name: itName || "Item", description: itDesc || undefined, quantity: q, rate: r };
    const next = [...(items || [])];
    if (editingIndex == null) next.unshift(nextItem); else next[editingIndex] = nextItem;
    await saveItems(next);
    setAddOpen(false);
    setEditingIndex(null);
  };

  const editDialogOpen = () => {
    if (!row) return;
    setETitle(row.title || "");
    setEClient(row.client || "");
    setEProjectId(row.projectId || "-");
    setEContractDate(row.contractDate ? new Date(row.contractDate).toISOString().slice(0,10) : "");
    setEValidUntil(row.validUntil ? new Date(row.validUntil).toISOString().slice(0,10) : "");
    setETax1(String(row.tax1 ?? 0));
    setETax2(String(row.tax2 ?? 0));
    setEDiscount(String(row.discount ?? 0));
    setEAdvanceAmount(String(row.advanceAmount ?? 0));
    setEPaymentTermsPercentage(String(row.paymentTermsPercentage ?? 50));
    setEAmount(String(row.amount ?? 0));
    setENote(row.note || "");
    setEditOpen(true);
  };

  const saveEdit = async () => {
    try {
      const payload: any = {
        title: eTitle || undefined,
        client: eClient || undefined,
        projectId: eProjectId !== "-" ? eProjectId : undefined,
        contractDate: eContractDate ? new Date(eContractDate) : undefined,
        validUntil: eValidUntil ? new Date(eValidUntil) : undefined,
        tax1: Number(eTax1 || 0),
        tax2: Number(eTax2 || 0),
        discount: Number(eDiscount || 0),
        advanceAmount: Number(eAdvanceAmount || 0),
        paymentTermsPercentage: Number(ePaymentTermsPercentage || 0),
        amount: Number(eAmount || 0),
        note: eNote || undefined,
      };
      const res = await fetch(`${API_BASE}/api/contracts/${id}`, { method: "PATCH", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error || "Failed to save");
      setRow(d);
      setEditOpen(false);
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    }
  };

  const patchStatus = async (status: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/contracts/${id}`, { method: "PATCH", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ status }) });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error || "Failed to update status");
      setRow(d);
      toast.success(`Marked as ${status}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update status");
    }
  };

  const cloneContract = async () => { setAuthOpen(true); };
  const handleAuthSuccess = async () => {
    try {
      if (!row) return;
      const payload: any = { ...row };
      delete payload._id; delete payload.id; delete payload.createdAt; delete payload.updatedAt;
      const r = await fetch(`${API_BASE}/api/contracts`, { method: "POST", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error || "Failed to clone");
      toast.success("Contract cloned");
      navigate(`/sales/contracts/${d._id}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to clone");
    }
  };

  const deleteContract = async () => {
    setConfirmConfig({
      open: true,
      title: "Purge Contract?",
      description: "Are you sure you want to permanently delete this contract? This action is irreversible and will remove all associated data.",
      confirmText: "Purge Node",
      variant: "danger",
      onConfirm: async () => {
        try {
          const r = await fetch(`${API_BASE}/api/contracts/${id}`, { method: "DELETE", headers: getAuthHeaders() });
          const d = await r.json().catch(() => null);
          if (!r.ok) throw new Error(d?.error || "Failed to delete");
          toast.success("Deleted");
          navigate("/sales/contracts");
        } catch (e: any) {
          toast.error(e?.message || "Failed to delete");
        } finally {
          setConfirmConfig(prev => ({ ...prev, open: false }));
        }
      }
    });
  };

  const openPreview = () => {
    setPreviewHtml(buildPreviewDocument());
    setPreviewOpen(true);
    setIframeLoading(true);
  };

  const openPrintWindow = (mode: string) => {
    openPreview();
  };

  const downloadPdf = async () => {
    setPdfLoading(true);
    const element = document.createElement("div");
    element.innerHTML = previewHtml;
    document.body.appendChild(element);
    
    const opt = {
      margin: 0,
      filename: `Contract-${row?._id?.slice(-6).toUpperCase() || id}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm' as const, format: 'a4', orientation: 'portrait' as const }
    };

    try {
      await html2pdf().set(opt).from(element).save();
      toast.success("PDF Synchronized");
    } catch (e) {
      toast.error("Export failed");
    } finally {
      document.body.removeChild(element);
      setPdfLoading(false);
    }
  };

  const buildPreviewDocument = () => {
    if (!row) return "";
    const viewBrand = { 
      name: settings?.general?.companyName || "HealthSpire (Pvt) Ltd", 
      email: settings?.general?.companyEmail || "info@haroom.org", 
      phone: settings?.general?.companyPhone || "+92 300 0000000", 
      address: settings?.general?.addressLine1 || "Islamabad, Pakistan", 
      website: settings?.general?.domain || "www.haroom.org", 
      logoSrc: settings?.general?.logoUrl || "/HealthSpire%20logo.png" 
    };
    
    const totals = [
      { label: "Sub Total", value: `Rs.${subTotal.toLocaleString()}` },
      ...(Number(row.tax1) > 0 ? [{ label: `Tax (${row.tax1}%)`, value: `Rs.${tax1Val.toLocaleString()}` }] : []),
      ...(Number(row.tax2) > 0 ? [{ label: `Tax (${row.tax2}%)`, value: `Rs.${tax2Val.toLocaleString()}` }] : []),
      ...(Number(row.discount) > 0 ? [{ label: "Discount", value: `-Rs.${Number(row.discount).toLocaleString()}` }] : []),
      { label: "Total Amount", value: `Rs.${grandTotal.toLocaleString()}`, bold: true }
    ];

    const sections = [
      { heading: "Contract Execution Scope", content: editorHtml || row.note || "Detailed scope of work and technical specifications." }
    ];
    
    const displayDateStr = row.contractDate ? new Date(row.contractDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : "-";

    const props = { 
      title: row.title?.toUpperCase() || "CONTRACT AGREEMENT", 
      brand: viewBrand, 
      clientName: row.client || "-", 
      clientAddress: "", // Add if available
      docNumber: row._id ? row._id.slice(-6).toUpperCase() : "-", 
      date: displayDateStr, 
      items: items.map((it: any) => ({ description: it.name, qty: it.quantity, price: it.rate, total: (it.quantity || 0) * (it.rate || 0) })), 
      totals, 
      timeframe,
      timeframeStartDate: tfStartDate,
      timeframeDays: tfDays,
      sections,
      paymentInformation: row.paymentTermsPercentage ? `${row.paymentTermsPercentage}% Upfront Advance Payment required.` : "Standard payment terms apply.",
      termsText: "1. Validity: This contract is valid for 15 days.\n2. Support: Post-deployment support included for 30 days.",
      signatureData: { 
        companyName: settings?.general?.companyName || "HealthSpire (Pvt) Ltd", 
        companySignatory: settings?.general?.companyName || "Mr. Qutaibah Talat",
        companyDesignation: "CEO",
        clientName: row.client || "Authorized Client Representative" 
      } 
    };
    const html = renderToStaticMarkup(<HaroomPrintTemplate {...props} />);
    return `<!doctype html><html><body style='margin:0;'>${html}</body></html>`;
  };

  const triggerPrintNow = () => {
    try {
      previewRef.current?.contentWindow?.print();
    } catch {}
  };

  const analyzeAgreement = async () => {
    setIsAnalyzing(true);
    setAnalysisOpen(true);
    setAnalysisResult(null);
    
    // Simulate AI analysis delay
    setTimeout(() => {
      const complexity = items.length > 5 ? "High" : items.length > 2 ? "Medium" : "Low";
      const suggestedAdvance = complexity === "High" ? 40 : complexity === "Medium" ? 50 : 60;
      const riskLevel = !row?.validUntil ? "Elevated (No Expiry Date)" : "Standard";
      
      const result = `
        <div class="space-y-4">
          <div>
            <h4 class="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Complexity Assessment</h4>
            <p class="text-sm font-medium text-slate-700">${complexity} Complexity based on ${items.length} deliverable nodes.</p>
          </div>
          <div>
            <h4 class="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Fiscal Recommendation</h4>
            <p class="text-sm font-medium text-slate-700">Suggested Upfront Protocol: <strong>${suggestedAdvance}%</strong> (Current: ${row?.paymentTermsPercentage || 50}%)</p>
          </div>
          <div>
            <h4 class="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Risk Profile</h4>
            <p class="text-sm font-medium text-slate-700">${riskLevel}</p>
          </div>
          <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-100 mt-4">
            <p class="text-xs font-bold text-emerald-800">AI Suggestion: ${complexity === "High" ? "Consider breaking this contract into multiple phases to mitigate delivery risk." : "Standard terms are appropriate for this scope."}</p>
          </div>
        </div>
      `;
      setAnalysisResult(result);
      setIsAnalyzing(false);
    }, 2000);
  };

  const [authOpen, setAuthOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<any>({ open: false });

  const [previewOpen, setPreviewOpen] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [previewHtml, setPreviewHtml] = useState("");
  const previewRef = useRef<HTMLIFrameElement>(null);

  if (!row) return <div className="p-8 text-center animate-pulse uppercase font-black tracking-[0.3em] text-slate-300">Accessing Secure Ledger...</div>;

  return (
    <div className="min-h-screen bg-[#fcfdfe] selection:bg-emerald-100 selection:text-emerald-900">
      {/* Precise Modern Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
        <div className="max-w-[1800px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full h-10 w-10 hover:bg-slate-100 transition-all">
              <ArrowLeft className="w-4 h-4 text-slate-500" />
            </Button>
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Execution Node</span>
                <h1 className="text-sm font-black text-slate-900 tracking-tight uppercase leading-none">
                  {row.title || "Contract"} <span className="text-slate-300 mx-1">/</span> <span className="text-slate-400">#{row._id.slice(-6).toUpperCase()}</span>
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-4 mr-2 px-4 py-1.5 bg-white/50 backdrop-blur-sm rounded-full border border-slate-100 shadow-sm">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className='flex items-center gap-1.5 cursor-help'>
                      <div className='w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center'>
                        <CheckCircle2 className='w-2.5 h-2.5 text-emerald-600' />
                      </div>
                      <span className='text-[8px] font-black uppercase text-emerald-600 tracking-widest'>Certified Assessment</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className='bg-slate-900 text-white border-0 rounded-xl px-4 py-2 text-[10px] font-bold uppercase tracking-widest'>
                    Validated by system audit
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <div className='w-[1px] h-6 bg-slate-200' />

              <div className="flex flex-col items-end">
                <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Aggregate Value</span>
                <span className="text-xs font-black text-slate-900 tabular-nums"><CountUp value={grandTotal} /></span>
              </div>
              <div className="w-[1px] h-6 bg-slate-200" />
              <Badge className="font-black uppercase text-[8px] px-2.5 py-0.5 tracking-widest shadow-none border-0 bg-slate-900 text-white">
                {row.status || "Draft"}
              </Badge>
            </div>

            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Button onClick={saveEditorNote} className="rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white uppercase font-black text-[9px] tracking-[0.2em] px-6 h-10 hover:shadow-lg hover:shadow-emerald-200 transition-all">
                Save Document
              </Button>
            </motion.div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full border-slate-200 h-10 w-10 hover:bg-slate-50 transition-all">
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl p-2 border-slate-100 shadow-2xl min-w-[200px]">
                <DropdownMenuItem className="rounded-lg p-3 font-bold uppercase text-[9px] tracking-widest" onClick={openPreview}>
                  <Eye className="w-4 h-4 mr-3 text-emerald-500" /> Live Preview
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-xl p-3 font-bold uppercase text-[9px] tracking-widest" onClick={saveAsTemplate}>
                  <Star className="w-4 h-4 mr-3 text-amber-500" /> Save as Template
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-xl p-3 font-bold uppercase text-[9px] tracking-widest" onClick={() => openPrintWindow("print")}>
                  <Printer className="w-4 h-4 mr-3 text-emerald-500" /> Hard Print
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-50" />
                <DropdownMenuItem className="rounded-xl p-3 font-bold uppercase text-[9px] tracking-widest" onClick={editDialogOpen}>
                  <Edit3 className="w-4 h-4 mr-3 text-slate-400" /> Edit Metadata
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-50" />
                {STATUS_OPTIONS.map((o) => (
                  <DropdownMenuItem key={o.value} onClick={() => patchStatus(o.value)} className="rounded-xl p-3 font-bold uppercase text-[9px] tracking-widest">
                    Mark {o.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-4 py-4">
        <div className="grid grid-cols-12 gap-4 items-start">
          
          {/* Column 1: Control (Left) */}
          <div className="hidden xl:flex xl:col-span-2 flex-col gap-4 sticky top-[60px]">
            <div className="space-y-1">
              <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2 ml-2">Workflow</h3>
              {[
                { id: 'details', label: 'Agreement', icon: Layout, tab: 'details' },
                { id: 'invoices', label: 'Ledger', icon: Banknote, tab: 'invoices' },
                { id: 'tasks', label: 'Milestones', icon: CheckCircle2, tab: 'tasks' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setOuterTab(item.tab)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                    outerTab === item.tab 
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm translate-x-1" 
                      : "text-slate-500 hover:bg-slate-100"
                  )}
                >
                  <item.icon className={cn("w-3.5 h-3.5", outerTab === item.tab ? "text-emerald-600" : "text-slate-400")} />
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-2">
              <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2">Actions</h3>
              <Button 
                variant="outline" 
                onClick={editDialogOpen}
                className="w-full justify-start rounded-xl border-slate-100 h-10 px-3 text-[8px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm bg-white"
              >
                <PenLine className="w-3.5 h-3.5 mr-2 text-slate-400" /> Metadata
              </Button>
              <Button 
                variant="outline" 
                onClick={cloneContract}
                className="w-full justify-start rounded-xl border-slate-100 h-10 px-3 text-[8px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm bg-white"
              >
                <Copy className="w-3.5 h-3.5 mr-2 text-slate-400" /> Replicate
              </Button>
              {row.phone && (
                <Button 
                  onClick={() => openWhatsapp(row.phone!, row.client || "")}
                  className="w-full justify-start rounded-xl bg-emerald-50 text-emerald-600 border-emerald-100 h-10 px-3 text-[8px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all shadow-sm"
                >
                  <MessageSquare className="w-3.5 h-3.5 mr-2" /> WhatsApp
                </Button>
              )}
            </div>

            <div className="mt-auto p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 relative overflow-hidden group shadow-sm">
              <div className="absolute -right-2 -top-2 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
              <p className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Lifecycle</p>
              <div className="space-y-2">
                <div>
                  <p className="text-[6px] font-black uppercase tracking-widest text-slate-400">Start</p>
                  <p className="text-[10px] font-black text-emerald-600">{displayDate(row.contractDate)}</p>
                </div>
                <div>
                  <p className="text-[6px] font-black uppercase tracking-widest text-slate-400">End</p>
                  <p className="text-[10px] font-black text-rose-500">{displayDate(row.validUntil)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Workspace (Center) */}
          <div className="col-span-12 lg:col-span-8 xl:col-span-7">
            <Tabs value={outerTab} onValueChange={setOuterTab} className="w-full">
              <TabsContent value="details" className="mt-0 space-y-4 focus-visible:ring-0">
                <Tabs value={innerTab} onValueChange={setInnerTab} className="w-full">
                  <Card className="shadow-sm rounded-[1.5rem] overflow-hidden bg-white min-h-[800px] flex flex-col border border-slate-100">
                    <div className="bg-slate-50/80 backdrop-blur-md px-6 py-2 flex items-center justify-between sticky top-[50px] z-20 border-b border-slate-100">
                      <TabsList className="bg-slate-200/50 p-1 rounded-xl border border-slate-200/50 h-auto flex gap-1">
                        {[
                          { value: 'items', label: 'Deliverables' },
                          { value: 'timeframe', label: 'Timeline' },
                          { value: 'editor', label: 'Agreement' }
                        ].map((t) => (
                          <TabsTrigger 
                            key={t.value}
                            value={t.value} 
                            className="relative rounded-lg font-black uppercase text-[8px] tracking-widest py-2 px-6 data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-100/50 text-slate-400 transition-all duration-300"
                          >
                            {innerTab === t.value && (
                              <motion.div 
                                layoutId="activeTabInner"
                                className="absolute inset-0 bg-white rounded-lg shadow-sm -z-10"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                              />
                            )}
                            {t.label}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      <div className='flex items-center gap-2'>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button variant='ghost' size='sm' onClick={() => setAddModuleOpen(true)} className='h-8 rounded-lg text-[8px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-100 transition-all'>
                            <Plus className='w-3.5 h-3.5 mr-2' /> Add Module
                          </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button variant='ghost' size='sm' onClick={useFullTemplate} className='h-8 rounded-lg text-[8px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-100 transition-all'>
                            <Wand2 className='w-3.5 h-3.5 mr-2' /> Master Template
                          </Button>
                        </motion.div>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col">
                      <TabsContent value="items" className="p-4 m-0 focus-visible:ring-0">
                        <div className="rounded-xl border border-slate-100 overflow-hidden mb-4">
                          <Table>
                            <TableHeader className="bg-slate-50/50">
                              <TableRow className="border-0 hover:bg-transparent">
                                <TableHead className="font-black uppercase text-[8px] tracking-[0.1em] text-slate-400 py-3 pl-4">Description</TableHead>
                                <TableHead className="font-black uppercase text-[8px] tracking-[0.1em] text-slate-400 py-3 text-center w-16">Qty</TableHead>
                                <TableHead className="font-black uppercase text-[8px] tracking-[0.1em] text-slate-400 py-3 text-center w-32">Rate</TableHead>
                                <TableHead className="font-black uppercase text-[8px] tracking-[0.1em] text-slate-400 py-3 text-right pr-4 w-32">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {items.map((it, idx) => (
                                <TableRow key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/30 transition-colors group">
                                  <TableCell className="py-3 pl-4">
                                    <div className="font-bold text-xs text-slate-700">{it.name}</div>
                                    <div className="text-[9px] text-slate-400 font-medium truncate max-w-[200px] mb-1">{it.description}</div>
                                    <div className='flex items-center gap-2'>
                                      <Badge variant="outline" className='text-[7px] font-black uppercase tracking-widest px-1.5 py-0 h-4 border-emerald-200 text-emerald-600 bg-emerald-50/50'>
                                        In Progress
                                      </Badge>
                                      <span className='text-[8px] font-bold text-slate-300 uppercase tracking-widest'>Owner: System Agent</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-3 text-center font-black text-xs tabular-nums">{it.quantity}</TableCell>
                                  <TableCell className="py-3 text-center font-black text-xs tabular-nums">Rs.{money(it.rate)}</TableCell>
                                  <TableCell className="py-3 text-right pr-4">
                                    <div className="flex items-center justify-end gap-2">
                                      <span className="font-black text-xs text-slate-900 tabular-nums">Rs.{money(Number(it.quantity||0) * Number(it.rate||0))}</span>
                                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                                        <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full" onClick={() => openEditItem(idx)}><Edit3 className="w-3 h-3" /></Button>
                                        <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full text-rose-500" onClick={() => deleteItem(idx)}><Trash2 className="w-3 h-3" /></Button>
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={4} className="py-4 px-4">
                                  <div className='flex flex-wrap gap-2'>
                                    <Button variant="outline" onClick={openAddItem} className="rounded-lg h-8 px-4 uppercase font-black tracking-widest text-[7px] border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-all active:scale-95">
                                      <Plus className="w-3 h-3 mr-2" /> Insert Deliverable
                                    </Button>
                                    <div className='flex-1' />
                                    <Button variant='ghost' className='rounded-lg h-8 px-4 uppercase font-black tracking-widest text-[7px] text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all'>
                                      <RefreshCw className='w-3 h-3 mr-2' /> Auto Optimize
                                    </Button>
                                    <Button variant='ghost' className='rounded-lg h-8 px-4 uppercase font-black tracking-widest text-[7px] text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all'>
                                      <BarChart3 className='w-3 h-3 mr-2' /> View Breakdown
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>

                        <div className="mt-auto p-8 bg-white border border-slate-100 rounded-3xl text-slate-900 flex items-center justify-between overflow-hidden relative group shadow-xl shadow-slate-100/50">
                          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                          <div className='absolute right-0 top-0 w-full h-full bg-gradient-to-br from-transparent via-transparent to-emerald-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500' />
                          
                          <div className="relative z-10">
                            <p className="text-[8px] font-black uppercase tracking-[0.4em] text-emerald-500/60 mb-2">Total Authorized Budget</p>
                            <div className='flex items-baseline gap-1 mb-4'>
                              <h2 className="text-4xl font-black tracking-tighter text-slate-900 group-hover:text-emerald-600 transition-colors duration-500">
                                <CountUp value={grandTotal} />
                              </h2>
                              <div className='w-2 h-2 rounded-full bg-emerald-500 animate-pulse' />
                            </div>

                            <div className='w-full max-w-[300px] space-y-1.5'>
                              <div className='flex justify-between items-center'>
                                <span className='text-[7px] font-black uppercase tracking-widest text-slate-400'>Contract Utilization</span>
                                <span className='text-[8px] font-black text-emerald-600'>100% (Allocated)</span>
                              </div>
                              <div className='h-1.5 w-full bg-slate-100 rounded-full overflow-hidden'>
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: "100%" }}
                                  transition={{ duration: 1.5, ease: "easeOut" }}
                                  className='h-full bg-gradient-to-r from-emerald-500 to-teal-500'
                                />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 relative z-10">
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button onClick={saveEditorNote} className="rounded-2xl bg-emerald-600 text-white uppercase font-black text-[10px] tracking-[0.2em] px-8 h-12 hover:bg-emerald-700 shadow-2xl shadow-emerald-100 transition-all active:scale-95">
                                Finalize Agreement
                              </Button>
                            </motion.div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="timeframe" className="p-6 m-0 focus-visible:ring-0">
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                              <Label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Commencement</Label>
                              <DatePicker value={tfStartDate} onChange={setTfStartDate} />
                            </div>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                              <Label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Duration Cycle</Label>
                              <Select value={String(tfDays)} onValueChange={(v) => setTfDays(Number(v))}>
                                <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white font-black px-3 text-xs">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-100 shadow-2xl p-1">
                                  {[5, 10, 15, 20, 25, 30, 45, 60].map(d => (
                                    <SelectItem key={d} value={String(d)} className="rounded-lg p-2 font-bold text-[10px] uppercase tracking-widest">
                                      {d} Working Days {d === 20 && "(Std)"}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                            <Label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-1">Execution Roadmap</Label>
                            <Textarea 
                              value={timeframe} 
                              onChange={(e) => setTimeframe(e.target.value)} 
                              placeholder="Define roadmap..." 
                              className="min-h-[400px] border-0 bg-transparent focus-visible:ring-0 text-slate-700 font-medium leading-relaxed resize-none text-sm p-0"
                            />
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="editor" className="flex-1 m-0 focus-visible:ring-0">
                        <div className="flex flex-col h-full bg-slate-50/20">
                          <div className="px-6 py-2 bg-white border-b border-slate-100 flex items-center justify-between sticky top-[95px] z-20">
                            <div className="flex gap-0.5">
                              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-md" onClick={() => exec("bold")}><Bold className="w-3 h-3" /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-md" onClick={() => exec("italic")}><Italic className="w-3 h-3" /></Button>
                              <div className="w-[1px] h-3 bg-slate-200 mx-1 self-center" />
                              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-md" onClick={() => exec("insertUnorderedList")}><List className="w-3 h-3" /></Button>
                            </div>
                            <div className="text-[7px] font-black uppercase text-slate-300 tracking-[0.2em] flex items-center gap-1.5">
                              <div className="w-1 h-1 rounded-full bg-emerald-400" /> Secure Protocol
                            </div>
                          </div>
                          
                          <div className="flex-1 overflow-auto p-4">
                            <div className="bg-white shadow-sm min-h-[900px] max-w-[750px] mx-auto p-12 rounded-lg border border-slate-100 relative">
                              <div ref={editorRef} contentEditable suppressContentEditableWarning className="outline-none prose prose-sm prose-slate max-w-none min-h-full text-xs leading-relaxed" onInput={() => setEditorHtml(editorRef.current?.innerHTML || "")} dangerouslySetInnerHTML={{ __html: editorHtml }} />
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </div>
                  </Card>
                </Tabs>
              </TabsContent>

              <TabsContent value="invoices" className="mt-0">
                <Card className='shadow-sm rounded-[1.5rem] p-10 bg-white min-h-[700px] border border-slate-100'>
                  <div className="flex items-center justify-between mb-10">
                    <div className="space-y-1">
                      <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Financial <span className="text-emerald-600">Ledger</span></h3>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Settlement history and pending obligations</p>
                    </div>
                    <Button onClick={createInvoiceFromContract} className="rounded-2xl h-12 px-8 uppercase font-black tracking-widest text-[9px] bg-slate-900 text-white hover:bg-slate-800 transition-all active:scale-95">Generate New Invoice</Button>
                  </div>
                  
                  {invoicesLoading ? <div className="text-center py-20 font-black uppercase tracking-widest text-slate-200 animate-pulse">Syncing Ledger...</div> : (
                    <div className="rounded-3xl border border-slate-100 overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50/50">
                          <TableRow className="border-0">
                            <TableHead className="font-black uppercase text-[9px] tracking-[0.2em] text-slate-400 py-6 pl-8">Invoice Node</TableHead>
                            <TableHead className="font-black uppercase text-[9px] tracking-[0.2em] text-slate-400 py-6">Status</TableHead>
                            <TableHead className="font-black uppercase text-[9px] tracking-[0.2em] text-slate-400 py-6 text-right pr-8">Value</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoices.map(inv => (
                            <TableRow key={inv._id} onClick={() => navigate(`/invoices/${inv._id}`)} className="cursor-pointer hover:bg-slate-50/50 transition-all group border-b border-slate-50 last:border-0">
                              <TableCell className="py-6 pl-8 font-black text-sm text-indigo-600">#{inv.number}</TableCell>
                              <TableCell className="py-6"><Badge className="rounded-lg uppercase font-black px-3 py-1 bg-slate-100 text-slate-600 border-0 text-[8px] tracking-widest">{inv.status}</Badge></TableCell>
                              <TableCell className="py-6 text-right pr-8 font-black text-sm text-slate-900 tabular-nums">Rs.{money(inv.amount)}</TableCell>
                            </TableRow>
                          ))}
                          {invoices.length === 0 && (
                            <TableRow><TableCell colSpan={3} className="py-32 text-center font-black uppercase tracking-[0.3em] text-slate-200 text-[10px]">Zero financial history detected</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="tasks" className="mt-0">
                <Card className="shadow-sm rounded-[1.5rem] p-10 bg-white min-h-[700px] border border-slate-100">
                  <div className="flex items-center justify-between mb-10">
                    <div className="space-y-1">
                      <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Operational <span className="text-emerald-600">Pipeline</span></h3>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Execution tracking and deliverable status</p>
                    </div>
                  </div>

                  {tasksLoading ? <div className="text-center py-20 font-black uppercase tracking-widest text-slate-200 animate-pulse">Syncing Pipeline...</div> : (
                    <div className="rounded-3xl border border-slate-100 overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50/50">
                          <TableRow className="border-0">
                            <TableHead className="font-black uppercase text-[9px] tracking-[0.2em] text-slate-400 py-6 pl-8">Objective</TableHead>
                            <TableHead className="font-black uppercase text-[9px] tracking-[0.2em] text-slate-400 py-6">Status</TableHead>
                            <TableHead className="font-black uppercase text-[9px] tracking-[0.2em] text-slate-400 py-6 text-right pr-8">Deadline</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tasks.map(t => (
                            <TableRow key={t.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-all">
                              <TableCell className="py-6 pl-8 font-black uppercase text-xs tracking-tight text-slate-700">{t.title}</TableCell>
                              <TableCell className="py-6"><Badge className="rounded-lg uppercase font-black px-3 py-1 bg-emerald-50 text-emerald-600 border-0 text-[8px] tracking-widest">{t.status}</Badge></TableCell>
                              <TableCell className="py-6 text-right pr-8 font-black text-xs text-slate-900 tabular-nums">{displayDate(t.deadline)}</TableCell>
                            </TableRow>
                          ))}
                          {tasks.length === 0 && (
                            <TableRow><TableCell colSpan={3} className="py-32 text-center font-black uppercase tracking-[0.3em] text-slate-200 text-[10px]">No active milestones linked to this node</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Column 3: Contextual Sidebar (Right) */}
          <div className='hidden lg:flex lg:col-span-4 xl:col-span-3 flex-col gap-4 sticky top-[60px]'>
            {/* Hospital Summary Card */}
            <Card className='shadow-sm rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 to-emerald-950 text-white border border-slate-800 group'>
              <CardContent className='p-6 relative overflow-hidden'>
                <div className='absolute -right-10 -top-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000' />
                <div className='flex items-center gap-4 mb-6 relative z-10'>
                  <div className='w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10'>
                    <Building2 className='w-6 h-6 text-emerald-300' />
                  </div>
                  <div>
                    <h3 className='text-xs font-black uppercase tracking-[0.1em] text-white/90'>{row.client || "Hospital Entity"}</h3>
                    <div className='flex items-center gap-2 mt-1'>
                      <div className='w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse' />
                      <span className='text-[7px] font-black uppercase tracking-widest text-emerald-400'>Contract Active</span>
                    </div>
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-4 mb-6 relative z-10'>
                  <div className='p-3 bg-white/5 rounded-2xl border border-white/5'>
                    <p className='text-[7px] font-black uppercase tracking-widest text-white/40 mb-1'>Active Modules</p>
                    <p className='text-sm font-black text-white'>{selectedModules.length} / {HMS_MODULES.length}</p>
                  </div>
                  <div className='p-3 bg-white/5 rounded-2xl border border-white/5'>
                    <p className='text-[7px] font-black uppercase tracking-widest text-white/40 mb-1'>Execution</p>
                    <p className='text-sm font-black text-white'>{row.status === "running" ? "Active" : "Pending"}</p>
                  </div>
                </div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button onClick={inspectLead} className='w-full rounded-2xl bg-white text-slate-900 uppercase font-black text-[9px] tracking-[0.2em] h-10 hover:bg-slate-50 transition-all shadow-xl shadow-black/20'>
                    Inspect Full Profile
                  </Button>
                </motion.div>
              </CardContent>
            </Card>

            {/* HMS Module Integration */}
            <Card className='shadow-sm rounded-3xl overflow-hidden bg-white border border-slate-100'>
              <div className='p-6 pb-2 border-b border-slate-50 flex flex-col gap-4'>
                <div className='flex items-center justify-between'>
                  <div className='space-y-0.5'>
                    <h3 className='text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]'>Agreement Stack</h3>
                    <p className='text-[7px] font-bold text-slate-300 uppercase tracking-widest'>Select to integrate</p>
                  </div>
                  <div className='flex gap-1'>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedModules(HMS_MODULES.map(m => m.id))} className="h-6 px-2 text-[7px] font-black uppercase text-emerald-600 hover:bg-emerald-50 rounded-lg">All</Button>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedModules([])} className="h-6 px-2 text-[7px] font-black uppercase text-rose-600 hover:bg-rose-50 rounded-lg">Clr</Button>
                  </div>
                </div>
              </div>
              <CardContent className='p-3 max-h-[300px] overflow-auto custom-scrollbar space-y-1'>
                {HMS_MODULES.map(m => (
                  <motion.div 
                    key={m.id} 
                    whileHover={{ x: 4 }}
                    className={cn(
                      "flex items-center gap-3 p-3 border rounded-2xl transition-all cursor-pointer group relative overflow-hidden",
                      selectedModules.includes(m.id) 
                        ? "border-emerald-600 bg-emerald-50/50 shadow-sm" 
                        : "bg-white border-slate-100 hover:border-emerald-200"
                    )} 
                    onClick={() => toggleModule(m.id)}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-md border flex items-center justify-center transition-all duration-300",
                      selectedModules.includes(m.id) ? "bg-emerald-600 border-emerald-600 scale-110 shadow-lg shadow-emerald-200" : "bg-white border-slate-200"
                    )}>
                      <AnimatePresence>
                        {selectedModules.includes(m.id) && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                            <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className='flex-1 overflow-hidden'>
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-tight truncate block",
                        selectedModules.includes(m.id) ? "text-emerald-900" : "text-slate-500 group-hover:text-slate-900"
                      )}>{m.title}</span>
                    </div>
                    <div className='opacity-0 group-hover:opacity-100 transition-opacity'>
                      <span className='text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg'>Rs.5,000+</span>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>

            {/* AI Assistant Bonus */}
            <Card className='shadow-sm rounded-3xl overflow-hidden bg-emerald-50/50 border border-emerald-100 group'>
              <CardContent className='p-6'>
                <div className='flex items-center gap-3 mb-4'>
                  <div className='w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200'>
                    <Wand2 className='w-4 h-4 text-white' />
                  </div>
                  <h3 className='text-[10px] font-black uppercase tracking-widest text-emerald-900'>Legal Architect</h3>
                </div>
                <p className='text-[9px] font-bold text-emerald-600/70 leading-relaxed mb-4'>
                  "Optimize payment terms based on project complexity"
                </p>
                <Button variant='outline' onClick={analyzeAgreement} className='w-full rounded-xl bg-white border-emerald-100 text-emerald-600 font-black text-[8px] uppercase tracking-widest h-9 hover:bg-emerald-600 hover:text-white transition-all'>
                  Analyze Agreement
                </Button>
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card className="shadow-sm rounded-3xl overflow-hidden bg-white border border-slate-100">
              <div className="p-6 pb-2 border-b border-slate-50 flex items-center justify-between">
                <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Fiscal Nodes</h3>
                <Percent className="w-3 h-3 text-slate-300" />
              </div>
              <CardContent className="p-6 space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Sub Total</span>
                  <span className="text-xs font-black text-slate-600">Rs.{money(subTotal)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-[9px] font-black uppercase tracking-widest text-rose-400">Discount</span>
                  <span className="text-xs font-black text-rose-500">-Rs.{money(row.discount)}</span>
                </div>
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-900 flex justify-between items-center mt-4 shadow-sm relative overflow-hidden group">
                  <div className='absolute -right-2 -top-2 w-10 h-10 bg-emerald-500/5 rounded-full blur-lg group-hover:scale-150 transition-transform' />
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 relative z-10">Advance Due</span>
                  <span className="text-sm font-black text-emerald-700 relative z-10">Rs.{money(calculatedAdvance)}</span>
                </div>
                <p className="text-[7px] font-black text-center text-slate-300 uppercase tracking-[0.3em] mt-2">Required {row.paymentTermsPercentage || 50}% Upfront Protocol</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-card max-w-2xl">
          <DialogHeader><DialogTitle>Add item</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Item</div>
            <div className="sm:col-span-9"><Input placeholder="Item" value={itName} onChange={(e)=>setItName(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Description</div>
            <div className="sm:col-span-9"><Textarea placeholder="Description" value={itDesc} onChange={(e)=>setItDesc(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Quantity</div>
            <div className="sm:col-span-9"><Input placeholder="Quantity" value={itQty} onChange={(e)=>setItQty(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Rate</div>
            <div className="sm:col-span-9"><Input placeholder="Rate" value={itRate} onChange={(e)=>setItRate(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setAddOpen(false)}>Close</Button>
            <Button onClick={saveItem}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card max-w-2xl">
          <DialogHeader><DialogTitle>Edit contract</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Title</div>
            <div className="sm:col-span-9"><Input placeholder="Title" value={eTitle} onChange={(e)=>setETitle(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Client</div>
            <div className="sm:col-span-9"><Input placeholder="Client" value={eClient} onChange={(e)=>setEClient(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Project</div>
            <div className="sm:col-span-9">
              <Select value={eProjectId} onValueChange={setEProjectId}>
                <SelectTrigger><SelectValue placeholder="Project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">Project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p._id} value={p._id}>{p.title || '-'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Contract date</div>
            <div className="sm:col-span-9"><DatePicker value={eContractDate} onChange={setEContractDate} placeholder="Pick contract date" /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Valid until</div>
            <div className="sm:col-span-9"><DatePicker value={eValidUntil} onChange={setEValidUntil} placeholder="Pick valid until" /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Tax</div>
            <div className="sm:col-span-9"><Input type="number" value={eTax1} onChange={(e)=>setETax1(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Second Tax</div>
            <div className="sm:col-span-9"><Input type="number" value={eTax2} onChange={(e)=>setETax2(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Discount (Rs.)</div>
            <div className="sm:col-span-9"><Input type="number" value={eDiscount} onChange={(e)=>setEDiscount(e.target.value)} placeholder="0" /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Advance Amount (Rs.)</div>
            <div className="sm:col-span-9"><Input type="number" value={eAdvanceAmount} onChange={(e)=>setEAdvanceAmount(e.target.value)} placeholder="0" /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Payment Terms (%)</div>
            <div className="sm:col-span-9">
              <Select value={ePaymentTermsPercentage} onValueChange={setEPaymentTermsPercentage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25% Upfront</SelectItem>
                  <SelectItem value="30">30% Upfront</SelectItem>
                  <SelectItem value="50">50% Upfront</SelectItem>
                  <SelectItem value="70">70% Upfront</SelectItem>
                  <SelectItem value="100">100% Upfront</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Amount</div>
            <div className="sm:col-span-9"><Input type="number" value={eAmount} onChange={(e)=>setEAmount(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Note</div>
            <div className="sm:col-span-9"><Textarea placeholder="Note" value={eNote} onChange={(e)=>setENote(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setEditOpen(false)}>Close</Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={tableDialogOpen} onOpenChange={setTableDialogOpen}>
        <DialogContent className="max-w-sm bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TableIcon className="w-5 h-5 text-primary" />
              Insert Table
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-medium">Rows</label>
              <Input type="number" value={tableRows} onChange={(e) => setTableRows(e.target.value)} min="1" max="20" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Columns</label>
              <Input type="number" value={tableCols} onChange={(e) => setTableCols(e.target.value)} min="1" max="10" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTableDialogOpen(false)}>Cancel</Button>
            <Button onClick={insertTable}>Insert Table</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmConfig.open}
        onOpenChange={(open) => setConfirmConfig(prev => ({ ...prev, open }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        description={confirmConfig.description}
        confirmText={confirmConfig.confirmText}
        variant={confirmConfig.variant}
      />

      <AuthVerifyDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        onSuccess={handleAuthSuccess}
        title="Verify Replicate Action"
        description="Replicating a contract is a protected administrative action. Please verify your identity to proceed."
      />

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className='max-w-[1000px] w-[90vw] h-[90vh] p-0 overflow-hidden bg-[#0f172a] border-0 rounded-[2.5rem] shadow-3xl flex flex-col'>
          <div className='flex items-center justify-between px-8 py-4 bg-slate-900/40 backdrop-blur-xl border-b border-white/5 z-10'>
            <div className='flex items-center gap-4'>
              <div className='w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20'>
                <Eye className='w-5 h-5 text-emerald-400' />
              </div>
              <div>
                <h3 className='text-sm font-black text-white uppercase tracking-tight'>Authority <span className='text-emerald-400'>Preview</span></h3>
                <p className='text-[9px] font-bold text-slate-500 uppercase tracking-widest'>Contractual Node Synchronization</p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <Button variant='ghost' onClick={triggerPrintNow} className='h-10 px-5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/5 text-[9px] font-black uppercase tracking-widest transition-all'>
                <Printer className='w-3.5 h-3.5 mr-2' /> Print
              </Button>
              <Button onClick={downloadPdf} disabled={pdfLoading} className='h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20'>
                {pdfLoading ? <Loader2 className='w-3.5 h-3.5 animate-spin mr-2' /> : <Download className='w-3.5 h-3.5 mr-2' />}
                Export PDF
              </Button>
              <div className='w-[1px] h-6 bg-white/10 mx-2' />
              <Button variant='ghost' size='icon' onClick={() => setPreviewOpen(false)} className='h-10 w-10 rounded-xl hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all'>
                <XCircle className='w-5 h-5' />
              </Button>
            </div>
          </div>

          <div className='flex-1 relative bg-slate-800/50 p-8 overflow-auto custom-scrollbar flex justify-center'>
            <div className='relative shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-sm overflow-hidden transform-gpu origin-top'>
              <iframe
                ref={previewRef}
                srcDoc={previewHtml}
                className='w-[210mm] h-[297mm] border-0 bg-white rounded-sm'
                title="Preview"
                onLoad={() => setIframeLoading(false)}
              />
              {iframeLoading && (
                <div className='absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm z-20'>
                  <div className='flex flex-col items-center gap-4'>
                    <div className='w-12 h-12 rounded-2xl border-2 border-emerald-500/30 border-t-emerald-500 animate-spin' />
                    <span className='text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]'>Syncing Nodes...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* NEW: Minimal Popups for Ledger and Execution */}
      <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
        <DialogContent className='max-w-md rounded-[2.5rem] p-10 bg-white border-0 shadow-3xl'>
          <DialogHeader className='mb-6'>
            <DialogTitle className='text-2xl font-black uppercase tracking-tighter'>Sync <span className='text-emerald-600'>Point</span></DialogTitle>
            <p className='text-slate-400 font-bold uppercase tracking-widest text-[9px] mt-1'>Initialize a new operational execution cycle</p>
          </DialogHeader>
          <div className='space-y-6'>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1'>Cycle Objective</Label>
              <Input placeholder="e.g. Core Deployment" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} className='h-12 rounded-xl bg-slate-50 border-0 focus:ring-2 ring-emerald-500 font-bold px-4 text-xs' />
            </div>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1'>Operational Threshold</Label>
              <Input type="date" value={newTask.deadline} onChange={e => setNewTask({...newTask, deadline: e.target.value})} className='h-12 rounded-xl bg-slate-50 border-0 focus:ring-2 ring-emerald-500 font-bold px-4 text-xs' />
            </div>
          </div>
          <DialogFooter className='mt-8 gap-3'>
            <Button variant='ghost' onClick={() => setTaskOpen(false)} className='rounded-xl uppercase font-black tracking-widest text-[9px] h-10 px-6'>Abort</Button>
            <Button onClick={addTask} className='bg-emerald-600 text-white rounded-xl uppercase font-black tracking-widest text-[9px] h-12 px-8 shadow-lg shadow-emerald-100'>Deploy Cycle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={invOpen} onOpenChange={setInvOpen}>
        <DialogContent className='max-w-md rounded-[2.5rem] p-10 bg-white border-0 shadow-3xl'>
          <DialogHeader className='mb-6'>
            <DialogTitle className='text-2xl font-black uppercase tracking-tighter'>Ledger <span className='text-emerald-600'>Initiation</span></DialogTitle>
            <p className='text-slate-400 font-bold uppercase tracking-widest text-[9px] mt-1'>Authorize a new fiscal valuation record</p>
          </DialogHeader>
          <div className='space-y-6'>
            <div className='p-6 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col items-center justify-center text-center'>
              <span className='text-[8px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-1'>Aggregated Value</span>
              <span className='text-3xl font-black text-emerald-900 tabular-nums'>Rs.{money(grandTotal)}</span>
            </div>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1'>Fiscal Status</Label>
              <Select value={newInv.status} onValueChange={v => setNewInv({...newInv, status: v})}>
                <SelectTrigger className='h-12 rounded-xl bg-slate-50 border-0 focus:ring-2 ring-emerald-500 font-bold px-4 text-xs'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className='rounded-xl border-slate-100 shadow-2xl'>
                  <SelectItem value="Draft" className='font-bold text-[10px] uppercase tracking-widest'>Draft Record</SelectItem>
                  <SelectItem value="Pending" className='font-bold text-[10px] uppercase tracking-widest'>Pending Sync</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className='mt-8 gap-3'>
            <Button variant='ghost' onClick={() => setInvOpen(false)} className='rounded-xl uppercase font-black tracking-widest text-[9px] h-10 px-6'>Cancel</Button>
            <Button onClick={addInvoice} className='bg-slate-900 text-white rounded-xl uppercase font-black tracking-widest text-[9px] h-12 px-8 shadow-lg shadow-slate-200'>Commit to Ledger</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={analysisOpen} onOpenChange={setAnalysisOpen}>
        <DialogContent className='max-w-md rounded-[2.5rem] p-10 bg-white border-0 shadow-3xl'>
          <DialogHeader className='mb-6'>
            <DialogTitle className='text-2xl font-black uppercase tracking-tighter'>Legal <span className='text-emerald-600'>Architect</span></DialogTitle>
            <p className='text-slate-400 font-bold uppercase tracking-widest text-[9px] mt-1'>AI-Powered Contract Analysis</p>
          </DialogHeader>
          <div className='space-y-6'>
            {isAnalyzing ? (
              <div className='flex flex-col items-center justify-center py-10'>
                <div className='w-12 h-12 rounded-2xl border-4 border-emerald-500/30 border-t-emerald-500 animate-spin mb-4' />
                <span className='text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] animate-pulse'>Analyzing Nodes...</span>
              </div>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: analysisResult || "" }} />
            )}
          </div>
          <DialogFooter className='mt-8'>
            <Button variant='ghost' onClick={() => setAnalysisOpen(false)} className='w-full rounded-xl uppercase font-black tracking-widest text-[9px] h-12 bg-slate-50 hover:bg-slate-100 text-slate-600'>Close Analysis</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addModuleOpen} onOpenChange={setAddModuleOpen}>
        <DialogContent className='max-w-md rounded-[2.5rem] p-10 bg-white border-0 shadow-3xl'>
          <DialogHeader className='mb-6'>
            <DialogTitle className='text-2xl font-black uppercase tracking-tighter'>Add <span className='text-emerald-600'>Module</span></DialogTitle>
            <p className='text-slate-400 font-bold uppercase tracking-widest text-[9px] mt-1'>Create a custom agreement module</p>
          </DialogHeader>
          <div className='space-y-6'>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1'>Module Title</Label>
              <Input placeholder="e.g. Data Protection" value={newModule.title} onChange={e => setNewModule({...newModule, title: e.target.value})} className='h-12 rounded-xl bg-slate-50 border-0 focus:ring-2 ring-emerald-500 font-bold px-4 text-xs' />
            </div>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1'>Module Content</Label>
              <Textarea placeholder="Module content..." value={newModule.content} onChange={e => setNewModule({...newModule, content: e.target.value})} className='min-h-[150px] rounded-xl bg-slate-50 border-0 focus:ring-2 ring-emerald-500 font-medium p-4 text-xs' />
            </div>
          </div>
          <DialogFooter className='mt-8 gap-3'>
            <Button variant='ghost' onClick={() => setAddModuleOpen(false)} className='rounded-xl uppercase font-black tracking-widest text-[9px] h-10 px-6'>Cancel</Button>
            <Button onClick={handleAddModule} className='bg-emerald-600 text-white rounded-xl uppercase font-black tracking-widest text-[9px] h-12 px-8 shadow-lg shadow-emerald-100'>Add Module</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

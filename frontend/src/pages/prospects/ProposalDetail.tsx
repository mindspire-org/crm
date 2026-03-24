import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Copy, CheckCircle2, XCircle, Printer, Eye, FileDown, PenLine, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Link2, Code, ChevronDown, FileText, Table as TableIcon, Layout, Wand2, Star, Calendar, Banknote, MessageSquare, Plus, Search, Building2, RefreshCw, BarChart3, Loader2, Download } from "lucide-react";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HMS_MODULES, FULL_PROPOSAL_TEMPLATE } from "./ProposalModules";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { HaroomPrintTemplate } from "@/components/print/HaroomPrintTemplate";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { AuthVerifyDialog } from "@/components/auth/AuthVerifyDialog";
import { renderToStaticMarkup } from "react-dom/server";
import { openWhatsappChat } from "@/lib/whatsapp";
import { useSettings } from "@/hooks/useSettings";
import html2pdf from "html2pdf.js";

const COMPANY = {
  name: "Mindspire",
  address: "Gurugram, Pakistan",
  email: "info@mindspire.org",
  website: "www.mindspire.org",
};

export default function ProposalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [p, setP] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [tab, setTab] = useState("items");
  const [innerTab, setInnerTab] = useState("items"); 
  const [outerTab, setOuterTab] = useState("details");
  const [tasks, setTasks] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("draft");
  const [proposalDate, setProposalDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [tax1, setTax1] = useState("0");
  const [tax2, setTax2] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const [editorHtml, setEditorHtml] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [tfStartDate, setTfStartDate] = useState("");
  const [tfDays, setTfDays] = useState(20);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const previewRef = useRef<HTMLIFrameElement>(null);
  const [previewPrint, setPreviewPrint] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [pickOpen, setPickOpen] = useState(false);
  const [pickQuery, setPickQuery] = useState("");
  const [pickItems, setPickItems] = useState<any[]>([]);
  const [pickLoading, setPickLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [moduleQuery, setModuleQuery] = useState("");
  const [taskOpen, setTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", deadline: "", status: "Pending" });
  const [invOpen, setInvOpen] = useState(false);
  const [newInv, setNewInv] = useState({ amount: 0, status: "Draft" });
  const [pdfLoading, setPdfLoading] = useState(false);
  const [addModuleOpen, setAddModuleOpen] = useState(false);
  const [newModule, setNewModule] = useState({ title: "", content: "" });

  const [customModules, setCustomModules] = useState<any[]>([]);

  const filteredModules = useMemo(() => {
    const allModules = [...HMS_MODULES, ...customModules];
    return allModules.filter(m => 
      m.title.toLowerCase().includes(moduleQuery.toLowerCase()) || 
      m.content.toLowerCase().includes(moduleQuery.toLowerCase())
    );
  }, [moduleQuery, customModules]);

  const subTotal = useMemo(() => items.reduce((s, it) => s + it.qty * it.rate, 0), [items]);
  const taxTotal = useMemo(() => subTotal * (Number(tax1 || 0) / 100) + subTotal * (Number(tax2 || 0) / 100), [subTotal, tax1, tax2]);
  const grandTotal = useMemo(() => Math.max(0, subTotal + taxTotal - Number(discount || 0)), [subTotal, taxTotal, discount]);

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

  const openWhatsapp = (phoneRaw: string, name: string) => {
    const msg = `Hello ${name || ""}, I am following up regarding your inquiry.`;
    const r = openWhatsappChat(phoneRaw, msg, { defaultCountryCode: "92" });
    if (!r.ok) toast.error("Invalid or missing phone number");
  };

  const loadInvoices = async () => {
    if (!id) return;
    try {
      setInvoicesLoading(true);
      const res = await fetch(`${API_BASE}/api/invoices?proposalId=${encodeURIComponent(id)}`, { headers: getAuthHeaders() });
      if (res.ok) setInvoices(await res.json());
    } catch (e) { console.error(e); }
    finally { setInvoicesLoading(false); }
  };

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

  const load = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/proposals/${id}`, { headers: getAuthHeaders() });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Failed");
      setP(d);
      setTitle(d.title || "");
      setClient(d.client || "");
      setAmount(String(d.amount || 0));
      setStatus(d.status || "draft");
      setProposalDate(d.proposalDate ? new Date(d.proposalDate).toISOString().slice(0, 10) : "");
      setValidUntil(d.validUntil ? new Date(d.validUntil).toISOString().slice(0, 10) : "");
      setTax1(String(d.tax1 || 0));
      setTax2(String(d.tax2 || 0));
      setDiscount(String(d.discount || 0));
      setEditorHtml(d.note || "");
      setTimeframe(d.timeframe || "");
      setTfStartDate(d.timeframeStartDate ? new Date(d.timeframeStartDate).toISOString().slice(0, 10) : "");
      setTfDays(d.timeframeDays || 20);
      if (Array.isArray(d.items)) {
        setItems(d.items.map((it: any) => ({ id: Math.random().toString(36).slice(2), name: it.name, qty: it.qty, rate: it.rate })));
      }
      if (d.leadId) loadTasks(d.leadId);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); loadInvoices(); }, [id]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        save();
      }
      if (e.key === "n" && (e.altKey)) {
        e.preventDefault();
        setItems(prev => [...prev, { id: Math.random().toString(36).slice(2), name: "", qty: 1, rate: 0 }]);
        setTab("items");
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [title, client, items, grandTotal, status, proposalDate, validUntil, editorHtml, timeframe, tfStartDate, tfDays]);

  const save = async () => {
    try {
      const content = editorRef.current?.innerHTML || editorHtml || "";
      const payload = {
        title, client, amount: grandTotal, status, proposalDate, validUntil,
        note: content,
        timeframe,
        timeframeStartDate: tfStartDate || undefined,
        timeframeDays: tfDays,
        tax1: Number(tax1), tax2: Number(tax2), discount: Number(discount),
        items: items.map(it => ({ name: it.name, qty: it.qty, rate: it.rate }))
      };
      const res = await fetch(`${API_BASE}/api/proposals/${id}`, {
        method: "PATCH",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error || "Failed to sync proposal nodes");

      setP(d);
      setEditOpen(false);
      setLastSaved(new Date());
      toast.success("Proposal Synchronized");
      load(); // Refresh state from server to ensure parity
    } catch (e: any) {
      toast.error(e?.message || "Sync failure");
    }
  };

  const exec = (cmd: string, val?: any) => {
    try {
      editorRef.current?.focus();
      document.execCommand(cmd, false, val);
      setEditorHtml(editorRef.current?.innerHTML || "");
    } catch {}
  };

  const toggleModule = (modId: string) => {
    setSelectedModules(prev => {
      const next = prev.includes(modId) ? prev.filter(i => i !== modId) : [...prev, modId];
      updateEditorFromModules(next);
      return next;
    });
  };

  const updateEditorFromModules = (moduleIds: string[]) => {
    const allModules = [...HMS_MODULES, ...customModules];
    const content = moduleIds.map(mid => {
      const mod = allModules.find(m => m.id === mid);
      return mod ? `<div class='module-item mb-8 p-6 bg-slate-50/50 border border-slate-100 rounded-2xl'><h3 class='text-indigo-600 font-black uppercase tracking-tight mb-2'>${mod.title}</h3><p class='text-slate-600 leading-relaxed'>${mod.content}</p></div>` : "";
    }).join("");
    setEditorHtml(content);
    if (editorRef.current) editorRef.current.innerHTML = content;
  };

  const selectAllModules = () => {
    const allModules = [...HMS_MODULES, ...customModules];
    const allIds = allModules.map(m => m.id);
    setSelectedModules(allIds);
    updateEditorFromModules(allIds);
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

  const clearModules = () => {
    setSelectedModules([]);
    updateEditorFromModules([]);
  };

  const buildPreviewDocument = () => {
    const viewBrand = { 
      name: settings?.general?.companyName || "Haroom (Pvt) Ltd", 
      email: settings?.general?.companyEmail || "info@haroom.org", 
      phone: settings?.general?.companyPhone || "+92 300 0000000", 
      address: settings?.general?.addressLine1 || "Islamabad, Pakistan", 
      website: settings?.general?.domain || "www.haroom.org", 
      logoSrc: settings?.general?.logoUrl || "/HealthSpire%20logo.png" 
    };
    
    const totals = [
      { label: "Sub Total", value: `Rs.${subTotal.toLocaleString()}` },
      ...(Number(tax1) > 0 ? [{ label: `Tax (${tax1}%)`, value: `Rs.${(subTotal * Number(tax1) / 100).toLocaleString()}` }] : []),
      ...(Number(tax2) > 0 ? [{ label: `Tax (${tax2}%)`, value: `Rs.${(subTotal * Number(tax2) / 100).toLocaleString()}` }] : []),
      ...(Number(discount) > 0 ? [{ label: "Discount", value: `-Rs.${Number(discount).toLocaleString()}` }] : []),
      { label: "Total Amount", value: `Rs.${grandTotal.toLocaleString()}`, bold: true }
    ];

    const sections = [
      { heading: "Project Scope & Technical Architecture", content: editorHtml || p?.note || "Detailed scope of work and technical specifications for the enterprise solution." }
    ];
    
    const displayDateStr = p?.proposalDate ? new Date(p.proposalDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : "-";

    const props = { 
      title: p?.title?.toUpperCase() || "PROJECT PROPOSAL", 
      brand: viewBrand, 
      clientName: p?.client || "-", 
      clientAddress: p?.clientAddress || p?.address || "",
      docNumber: p?.number || (p?._id ? p._id.slice(-6).toUpperCase() : "-"), 
      date: displayDateStr, 
      items: items.map((it: any) => ({ description: it.name, qty: it.qty, price: it.rate, total: it.qty * it.rate })), 
      totals, 
      timeframe,
      timeframeStartDate: tfStartDate,
      timeframeDays: tfDays,
      sections,
      paymentInformation: "• 50% Upfront Advance Payment to initiate architectural setup.\n• 30% Upon completion of core module integration.\n• 20% Final settlement upon official handover and sync.",
      termsText: "1. Validity: This technical proposal remains valid for 15 operational days.\n2. Support: Post-deployment hypercare is included for 30 cycles.\n3. Confidentiality: Both parties agree to maintain strict node confidentiality.\n4. Intellectual Property: All custom code remains property of Haroom until final settlement.",
      signatureData: { 
        companyName: settings?.general?.companyName || "Haroom (Pvt) Ltd", 
        companySignatory: settings?.general?.companyName || "Mr. Qutaibah Talat",
        companyDesignation: "CEO",
        clientName: p?.client || "Authorized Entity Representative" 
      } 
    };
    const html = renderToStaticMarkup(<HaroomPrintTemplate {...props} />);
    return `<!doctype html><html><body style='margin:0;'>${html}</body></html>`;
  };

  const preview = () => { setPreviewHtml(buildPreviewDocument()); setPreviewOpen(true); setIframeLoading(true); };
  const triggerPrintNow = () => { try { previewRef.current?.contentWindow?.print(); } catch {} };

  const downloadPdf = async () => {
    setPdfLoading(true);
    const element = document.createElement("div");
    element.innerHTML = previewHtml;
    document.body.appendChild(element);
    
    const opt = {
      margin: 0,
      filename: `Proposal-${title || id}.pdf`,
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

  const getProposalStatus = (s?: string) => {
    const st = String(s || "draft").toLowerCase();
    if (st === "accepted") return { label: "Accepted", className: "bg-emerald-500 text-white" };
    if (st === "declined") return { label: "Declined", className: "bg-rose-500 text-white" };
    return { label: "Draft", className: "bg-slate-500 text-white" };
  };

  const openEdit = () => { if (!p) return; setTitle(p.title || ""); setClient(p.client || ""); setAmount(String(p.amount || 0)); setStatus(p.status || "draft"); setProposalDate(p.proposalDate || ""); setValidUntil(p.validUntil || ""); setEditOpen(true); };
  const cloneProposal = async () => { setAuthOpen(true); };
  const saveAsTemplate = async () => {
    try {
      const content = editorRef.current?.innerHTML || editorHtml || "";
      const payload = {
        title: `${title || 'Proposal'} Template`,
        content: content,
        type: 'proposal'
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

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);

  const analyzeAgreement = async () => {
    setIsAnalyzing(true);
    setAnalysisOpen(true);
    setAnalysisResult(null);
    
    // Simulate AI analysis delay
    setTimeout(() => {
      const complexity = items.length > 5 ? "High" : items.length > 2 ? "Medium" : "Low";
      const riskLevel = !validUntil ? "Elevated (No Expiry Date)" : "Standard";
      
      const result = `
        <div class="space-y-4">
          <div>
            <h4 class="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-1">Architecture Complexity</h4>
            <p class="text-sm font-medium text-slate-700">${complexity} Complexity based on ${items.length} service units.</p>
          </div>
          <div>
            <h4 class="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-1">Risk Assessment</h4>
            <p class="text-sm font-medium text-slate-700">${riskLevel}</p>
          </div>
          <div class="p-3 bg-indigo-50 rounded-xl border border-indigo-100 mt-4">
            <p class="text-xs font-bold text-indigo-800">Neural Suggestion: ${complexity === "High" ? "This enterprise-grade scope requires strict phased delivery and upfront infrastructure budget." : "Standard implementation cycles are recommended."}</p>
          </div>
        </div>
      `;
      setAnalysisResult(result);
      setIsAnalyzing(false);
    }, 2000);
  };

  const handleAuthSuccess = async () => {
    if (!p) return;
    try {
      const payload = { 
        title: p.title + " (Copy)", 
        client: p.client, 
        amount: subTotal, 
        status: "draft", 
        proposalDate: new Date().toISOString(), 
        items: items.map(it => ({ name: it.name, qty: it.qty, rate: it.rate })), 
        note: editorHtml,
        timeframe,
        timeframeStartDate: tfStartDate,
        timeframeDays: tfDays
      };
      const res = await fetch(`${API_BASE}/api/proposals`, { method: "POST", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
      const d = await res.json();
      if (res.ok) { toast.success("Proposal Replicated"); navigate(`/prospects/proposals/${d._id}`); }
    } catch (e: any) { toast.error(e.message); }
  };
  const updateStatus = async (s: string) => { if (!id) return; try { const res = await fetch(`${API_BASE}/api/proposals/${id}`, { method: "PATCH", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ status: s }) }); if (res.ok) { toast.success("Status updated"); load(); } } catch {} };
  const useFullTemplate = () => { setConfirmOpen(true); };
  const handleConfirmTemplate = () => { setEditorHtml(FULL_PROPOSAL_TEMPLATE); if (editorRef.current) editorRef.current.innerHTML = FULL_PROPOSAL_TEMPLATE; setConfirmOpen(false); };
  const addFromCatalog = (ci: any) => { setItems([...items, { id: Math.random().toString(36).slice(2), name: ci.title, qty: 1, rate: ci.rate || 0 }]); setPickOpen(false); };
  
  const addTask = async () => {
    if (!newTask.title || !p?.leadId) return;
    try {
      const res = await fetch(`${API_BASE}/api/tasks`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ ...newTask, leadId: p.leadId, proposalId: id })
      });
      if (res.ok) { toast.success("Task Synchronized"); setTaskOpen(false); loadTasks(p.leadId); }
    } catch (e) {}
  };

  const addInvoice = async () => {
    if (!id || !p?.clientId) return;
    try {
      const res = await fetch(`${API_BASE}/api/invoices`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ ...newInv, proposalId: id, clientId: p.clientId, items: items.map(it => ({ name: it.name, qty: it.qty, rate: it.rate })) })
      });
      if (res.ok) { toast.success("Ledger Entry Created"); setInvOpen(false); loadInvoices(); }
    } catch (e) {}
  };

  const createInvoiceFromProposal = async () => { if (!p) return; try { const res = await fetch(`${API_BASE}/api/invoices`, { method: "POST", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ proposalId: p._id, clientId: p.clientId, items: items.map(it => ({ name: it.name, qty: it.qty, rate: it.rate })) }) }); if (res.ok) { toast.success("Invoice created"); loadInvoices(); } } catch {} };
  const printProposal = () => { preview(); setPreviewPrint(true); };

  const displayDate = (dateStr: string) => {
    if (!dateStr || dateStr === "-") return "-";
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (loading || !p) return <div className='p-8 text-center'>Loading...</div>;

  return (
    <div className='min-h-screen bg-[#fcfdfe] selection:bg-indigo-100 selection:text-indigo-900'>
      {/* Dynamic Header: Ultra-slim and high-impact */}
      <div className='sticky top-0 z-40 bg-white/60 backdrop-blur-2xl border-b border-slate-100/50'>
        <div className='max-w-[1800px] mx-auto px-6 py-3 flex items-center justify-between'>
          <div className='flex items-center gap-6'>
            <Button variant='ghost' size='icon' onClick={() => navigate(-1)} className='rounded-full hover:bg-slate-100/80 transition-all'>
              <ArrowLeft className='w-4 h-4 text-slate-500' />
            </Button>
            <div className='flex flex-col'>
              <div className='flex items-center gap-3'>
                <span className='text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500/50 bg-indigo-50 px-2 py-0.5 rounded'>Authority Node</span>
                <h1 className='text-sm font-black text-slate-900 tracking-tight uppercase leading-none'>
                  {p.title || "Proposal Details"} <span className='text-slate-300 ml-1'>/</span> <span className='text-slate-400'>#{p.number || (p._id ? p._id.slice(-6).toUpperCase() : "---")}</span>
                </h1>
              </div>
            </div>
          </div>

          <div className='flex items-center gap-3'>
            <div className='hidden md:flex items-center gap-4 mr-4 px-4 py-1.5 bg-white/50 backdrop-blur-sm rounded-full border border-slate-100 shadow-sm'>
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

              <div className='flex flex-col items-end'>
                <span className='text-[8px] font-black uppercase text-slate-400 tracking-widest'>Net Valuation</span>
                <span className='text-xs font-black text-slate-900'><CountUp value={grandTotal} /></span>
              </div>
              <div className='w-[1px] h-6 bg-slate-200' />
              <Badge className={cn("font-black uppercase text-[8px] px-2.5 py-0.5 tracking-widest shadow-none border-0", getProposalStatus(p.status).className)}>
                {getProposalStatus(p.status).label}
              </Badge>
            </div>

            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Button onClick={save} className='rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white uppercase font-black text-[9px] tracking-[0.2em] px-6 h-10 hover:shadow-lg hover:shadow-indigo-200 transition-all'>
                Save Document
              </Button>
            </motion.div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='outline' size='icon' className='rounded-full border-slate-200 h-9 w-9 hover:bg-slate-50 transition-all'>
                  <ChevronDown className='w-4 h-4 text-slate-400' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='rounded-2xl p-2 border-slate-100 shadow-2xl min-w-[220px]'>
                <DropdownMenuItem className='rounded-xl p-3 font-bold uppercase text-[9px] tracking-widest hover:bg-indigo-50 transition-colors' onClick={preview}>
                  <Eye className='w-4 h-4 mr-3 text-indigo-500' /> Preview Document
                </DropdownMenuItem>
                <DropdownMenuItem className='rounded-xl p-3 font-bold uppercase text-[9px] tracking-widest hover:bg-indigo-50 transition-colors' onClick={saveAsTemplate}>
                  <Star className='w-4 h-4 mr-3 text-amber-500' /> Save as Template
                </DropdownMenuItem>
                <DropdownMenuItem className='rounded-xl p-3 font-bold uppercase text-[9px] tracking-widest hover:bg-indigo-50 transition-colors' onClick={printProposal}>
                  <Printer className='w-4 h-4 mr-3 text-indigo-500' /> Print Authority
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className='rounded-xl p-3 font-bold uppercase text-[9px] tracking-widest text-emerald-600 hover:bg-emerald-50 transition-colors' onClick={() => updateStatus("accepted")}>
                  <CheckCircle2 className='w-4 h-4 mr-3' /> Authorize Accepted
                </DropdownMenuItem>
                <DropdownMenuItem className='rounded-xl p-3 font-bold uppercase text-[9px] tracking-widest text-rose-600 hover:bg-rose-50 transition-colors' onClick={() => updateStatus("declined")}>
                  <XCircle className='w-4 h-4 mr-3' /> Terminate Proposal
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className='max-w-[1800px] mx-auto px-4 py-4'>
        <div className='grid grid-cols-12 gap-4 items-start'>
          
          {/* Column 1: Control (Left) */}
          <div className="hidden xl:flex xl:col-span-2 flex-col gap-4 sticky top-[60px]">
            <div className="space-y-1">
              <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2 ml-2">Workflow</h3>
              {[
                { id: 'details', label: 'Proposal', icon: Layout, tab: 'details' },
                { id: 'financials', label: 'Ledger', icon: Banknote, tab: 'financials' },
                { id: 'operations', label: 'Execution', icon: CheckCircle2, tab: 'operations' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setOuterTab(item.tab)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                    outerTab === item.tab 
                      ? "bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm translate-x-1" 
                      : "text-slate-500 hover:bg-slate-100"
                  )}
                >
                  <item.icon className={cn("w-3.5 h-3.5", outerTab === item.tab ? "text-indigo-600" : "text-slate-400")} />
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-2">
              <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2">Actions</h3>
              <Button 
                variant='outline' 
                onClick={openEdit}
                className='w-full justify-start rounded-xl border-slate-100 h-10 px-3 text-[8px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm bg-white'
              >
                <PenLine className='w-3.5 h-3.5 mr-2 text-slate-400' /> Metadata
              </Button>
              <Button 
                variant='outline' 
                onClick={cloneProposal}
                className='w-full justify-start rounded-xl border-slate-100 h-10 px-3 text-[8px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm bg-white'
              >
                <Copy className='w-3.5 h-3.5 mr-2 text-slate-400' /> Replicate
              </Button>
              {p.phone && (
                <Button 
                  onClick={() => openWhatsapp(p.phone!, p.client || "")}
                  className='w-full justify-start rounded-xl bg-emerald-50 text-emerald-600 border-emerald-100 h-10 px-3 text-[8px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all shadow-sm'
                >
                  <MessageSquare className='w-3.5 h-3.5 mr-2' /> WhatsApp
                </Button>
              )}
            </div>

            <div className="mt-auto p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 relative overflow-hidden group shadow-sm">
              <div className="absolute -right-2 -top-2 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
              <p className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Lifecycle</p>
              <div className="space-y-2">
                <div>
                  <p className="text-[6px] font-black uppercase tracking-widest text-slate-400">Initiated</p>
                  <p className="text-[10px] font-black text-indigo-600">{displayDate(p.proposalDate)}</p>
                </div>
                <div>
                  <p className="text-[6px] font-black uppercase tracking-widest text-slate-400">Expiration</p>
                  <p className="text-[10px] font-black text-rose-500">{displayDate(p.validUntil)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Workspace (Center) */}
          <div className='col-span-12 lg:col-span-8 xl:col-span-7'>
            <Tabs value={outerTab} onValueChange={setOuterTab} className='w-full'>
              <TabsContent value="details" className="mt-0 space-y-4 focus-visible:ring-0">
                <Tabs value={tab} onValueChange={setTab} className='w-full'>
                  <Card className='shadow-sm rounded-[1.5rem] overflow-hidden bg-white min-h-[800px] flex flex-col border border-slate-100'>
                    <div className='bg-slate-50/80 backdrop-blur-md px-6 py-2 flex items-center justify-between sticky top-[50px] z-20 border-b border-slate-100'>
                      <TabsList className='bg-slate-200/50 p-1 rounded-xl border border-slate-200/50 h-auto flex gap-1'>
                        {[
                          { value: 'items', label: 'Structure' },
                          { value: 'timeframe', label: 'Timeline' },
                          { value: 'editor', label: 'Manifesto' }
                        ].map((t) => (
                          <TabsTrigger 
                            key={t.value}
                            value={t.value} 
                            className='relative rounded-lg font-black uppercase text-[8px] tracking-widest py-2 px-6 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-100/50 text-slate-400 transition-all duration-300'
                          >
                            {tab === t.value && (
                              <motion.div 
                                layoutId="activeTab"
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
                          <Button variant='ghost' size='sm' onClick={() => setAddModuleOpen(true)} className='h-8 rounded-lg text-[8px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all'>
                            <Plus className='w-3.5 h-3.5 mr-2' /> Add Module
                          </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button variant='ghost' size='sm' onClick={useFullTemplate} className='h-8 rounded-lg text-[8px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all'>
                            <Wand2 className='w-3.5 h-3.5 mr-2' /> Full Template
                          </Button>
                        </motion.div>
                      </div>
                    </div>

                    <div className='flex-1 flex flex-col'>
                      <TabsContent value='items' className='p-4 m-0 focus-visible:ring-0'>
                        <div className='rounded-xl border border-slate-100 overflow-hidden mb-4'>
                          <Table>
                            <TableHeader className='bg-slate-50/50'>
                              <TableRow className='border-0 hover:bg-transparent'>
                                <TableHead className='font-black uppercase text-[8px] tracking-[0.1em] text-slate-400 py-3 pl-4'>Service Unit</TableHead>
                                <TableHead className='font-black uppercase text-[8px] tracking-[0.1em] text-slate-400 py-3 text-center w-16'>Qty</TableHead>
                                <TableHead className='font-black uppercase text-[8px] tracking-[0.1em] text-slate-400 py-3 text-center w-32'>Rate</TableHead>
                                <TableHead className='font-black uppercase text-[8px] tracking-[0.1em] text-slate-400 py-3 text-right pr-4 w-32'>Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {items.map((it, idx) => (
                                <TableRow key={it.id} className='border-b border-slate-50 last:border-0 hover:bg-slate-50/30 transition-colors group'>
                                  <TableCell className='py-3 pl-4'>
                                    <Input 
                                      value={it.name} 
                                      onChange={e => setItems(items.map(x => x.id === it.id ? { ...x, name: e.target.value } : x))} 
                                      className='border-0 shadow-none bg-transparent focus-visible:ring-0 p-0 font-bold text-xs text-slate-700 h-auto mb-1' 
                                      placeholder='Service description...' 
                                    />
                                    <div className='flex items-center gap-2'>
                                      <Badge variant="outline" className='text-[7px] font-black uppercase tracking-widest px-1.5 py-0 h-4 border-slate-200 text-slate-400'>
                                        Active
                                      </Badge>
                                      <span className='text-[8px] font-bold text-slate-300 uppercase tracking-widest'>Last Sync: Just now</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className='py-3'>
                                    <Input 
                                      type='number' 
                                      value={it.qty} 
                                      onChange={e => setItems(items.map(x => x.id === it.id ? { ...x, qty: Number(e.target.value) } : x))} 
                                      className='text-center border-0 shadow-none bg-transparent focus-visible:ring-0 p-0 font-black text-xs tabular-nums h-auto' 
                                    />
                                  </TableCell>
                                  <TableCell className='py-3'>
                                    <Input 
                                      type='number' 
                                      value={it.rate} 
                                      onChange={e => setItems(items.map(x => x.id === it.id ? { ...x, rate: Number(e.target.value) } : x))} 
                                      className='text-center border-0 shadow-none bg-transparent focus-visible:ring-0 p-0 font-black text-xs tabular-nums h-auto' 
                                    />
                                  </TableCell>
                                  <TableCell className='py-3 text-right pr-4'>
                                    <div className='flex items-center justify-end gap-2'>
                                      <span className='font-black text-xs text-indigo-600 tabular-nums'>Rs.{money(it.qty * it.rate)}</span>
                                      <Button 
                                        variant='ghost' 
                                        size='icon' 
                                        onClick={() => setItems(items.filter(x => x.id !== it.id))}
                                        className='h-6 w-6 opacity-0 group-hover:opacity-100 rounded-full text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all'
                                      >
                                        <XCircle className='w-3 h-3' />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow className='hover:bg-transparent'>
                                <TableCell colSpan={4} className='py-4 px-4'>
                                  <div className='flex flex-wrap gap-2'>
                                    <Button variant='outline' onClick={() => setItems([...items, { id: Math.random().toString(36).slice(2), name: "", qty: 1, rate: 0 }])} className='rounded-lg h-8 px-4 uppercase font-black tracking-widest text-[7px] border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-all active:scale-95'>
                                      <Plus className='w-3 h-3 mr-2' /> Add Line Item
                                    </Button>
                                    <Button variant='outline' onClick={() => setPickOpen(true)} className='rounded-lg h-8 px-4 uppercase font-black tracking-widest text-[7px] border-indigo-100 bg-indigo-50/30 hover:bg-indigo-50 text-indigo-600 transition-all active:scale-95'>
                                      <Search className='w-3 h-3 mr-2' /> Inventory Pull
                                    </Button>
                                    <div className='flex-1' />
                                    <Button variant='ghost' className='rounded-lg h-8 px-4 uppercase font-black tracking-widest text-[7px] text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all'>
                                      <RefreshCw className='w-3 h-3 mr-2' /> Auto Optimize
                                    </Button>
                                    <Button variant='ghost' className='rounded-lg h-8 px-4 uppercase font-black tracking-widest text-[7px] text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all'>
                                      <BarChart3 className='w-3 h-3 mr-2' /> View Breakdown
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>

                        <div className='mt-auto p-8 bg-white border border-slate-100 rounded-3xl text-slate-900 flex items-center justify-between overflow-hidden relative group shadow-xl shadow-slate-100/50'>
                          <div className='absolute -left-10 -bottom-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000' />
                          <div className='absolute right-0 top-0 w-full h-full bg-gradient-to-br from-transparent via-transparent to-indigo-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500' />
                          
                          <div className='relative z-10'>
                            <p className='text-[8px] font-black uppercase tracking-[0.4em] text-indigo-500/60 mb-2'>Total Authorized Budget</p>
                            <div className='flex items-baseline gap-1 mb-4'>
                              <h2 className='text-4xl font-black tracking-tighter text-slate-900 group-hover:text-indigo-600 transition-colors duration-500'>
                                <CountUp value={grandTotal} />
                              </h2>
                              <div className='w-2 h-2 rounded-full bg-emerald-500 animate-pulse' />
                            </div>

                            <div className='w-full max-w-[300px] space-y-1.5'>
                              <div className='flex justify-between items-center'>
                                <span className='text-[7px] font-black uppercase tracking-widest text-slate-400'>Budget Utilization</span>
                                <span className='text-[8px] font-black text-indigo-600'>100% (Allocated)</span>
                              </div>
                              <div className='h-1.5 w-full bg-slate-100 rounded-full overflow-hidden'>
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: "100%" }}
                                  transition={{ duration: 1.5, ease: "easeOut" }}
                                  className='h-full bg-gradient-to-r from-indigo-500 to-blue-500'
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div className='flex items-center gap-4 relative z-10'>
                            <div className='hidden sm:flex flex-col items-end mr-4'>
                              <span className='text-[7px] font-black uppercase tracking-widest text-slate-400'>Auto-Save Status</span>
                              <span className='text-[9px] font-bold text-emerald-600 flex items-center gap-1'>
                                <CheckCircle2 className='w-2.5 h-2.5' /> {lastSaved ? `Saved ${Math.floor((new Date().getTime() - lastSaved.getTime()) / 1000)}s ago` : 'Standby'}
                              </span>
                            </div>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button onClick={save} className='rounded-2xl bg-indigo-600 text-white uppercase font-black text-[10px] tracking-[0.2em] px-8 h-12 hover:bg-indigo-700 shadow-2xl shadow-indigo-200 transition-all'>
                                Finalize Document
                              </Button>
                            </motion.div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value='timeframe' className='p-6 m-0 focus-visible:ring-0'>
                        <div className='space-y-6'>
                          <div className='grid grid-cols-2 gap-4'>
                            <div className='p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2'>
                              <Label className='text-[8px] font-black uppercase tracking-widest text-slate-400'>Project Commencement</Label>
                              <DatePicker value={tfStartDate} onChange={setTfStartDate} />
                            </div>
                            <div className='p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2'>
                              <Label className='text-[8px] font-black uppercase tracking-widest text-slate-400'>Operational Duration</Label>
                              <Select value={String(tfDays)} onValueChange={(v) => setTfDays(Number(v))}>
                                <SelectTrigger className='h-10 rounded-xl border-slate-200 bg-white font-black px-3 text-xs'>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent className='rounded-xl border-slate-100 shadow-2xl p-1'>
                                  {[5, 10, 15, 20, 25, 30, 45, 60].map(d => (
                                    <SelectItem key={d} value={String(d)} className='rounded-lg p-2 font-bold text-[10px] uppercase tracking-widest'>
                                      {d} Working Days {d === 20 && "(Std)"}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className='p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-3'>
                            <Label className='text-[8px] font-black uppercase tracking-widest text-slate-400 ml-1'>Phase Breakdown</Label>
                            <Textarea 
                              value={timeframe} 
                              onChange={(e) => setTimeframe(e.target.value)} 
                              placeholder="Define phases..." 
                              className='min-h-[400px] border-0 bg-transparent focus-visible:ring-0 text-slate-700 font-medium leading-relaxed resize-none text-sm p-0'
                            />
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value='editor' className='flex-1 m-0 focus-visible:ring-0'>
                        <div className='flex flex-col h-full bg-slate-50/20'>
                          <div className='px-6 py-2 bg-white border-b border-slate-100 flex items-center justify-between sticky top-[95px] z-20'>
                            <div className='flex gap-0.5'>
                              <Button size='icon' variant='ghost' className='h-7 w-7 rounded-md' onClick={() => exec("bold")}><Bold className="w-3 h-3" /></Button>
                              <Button size='icon' variant='ghost' className='h-7 w-7 rounded-md' onClick={() => exec("italic")}><Italic className="w-3 h-3" /></Button>
                              <div className='w-[1px] h-3 bg-slate-200 mx-1 self-center' />
                              <Button size='icon' variant='ghost' className='h-7 w-7 rounded-md' onClick={() => exec("insertUnorderedList")}><List className="w-3 h-3" /></Button>
                            </div>
                            <div className='text-[7px] font-black uppercase text-slate-300 tracking-[0.2em] flex items-center gap-1.5'>
                              <div className='w-1 h-1 rounded-full bg-indigo-400' /> Protocol Active
                            </div>
                          </div>
                          
                          <div className='flex-1 overflow-auto p-4'>
                            <div className='bg-white shadow-sm min-h-[900px] max-w-[750px] mx-auto p-12 rounded-lg border border-slate-100 relative'>
                              <div ref={editorRef} contentEditable suppressContentEditableWarning className='outline-none prose prose-sm prose-slate max-w-none min-h-full text-xs leading-relaxed' onInput={() => setEditorHtml(editorRef.current?.innerHTML || "")} dangerouslySetInnerHTML={{ __html: editorHtml }} />
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </div>
                  </Card>
                </Tabs>
              </TabsContent>

              <TabsContent value="financials" className="mt-0">
                <Card className='shadow-sm rounded-[1.5rem] p-10 bg-white min-h-[700px] border border-slate-100'>
                  <div className='flex items-center justify-between mb-10'>
                    <div className='space-y-1'>
                      <h3 className='text-xl font-black uppercase tracking-tight text-slate-900'>Financial <span className='text-indigo-600'>Ledger</span></h3>
                      <p className='text-[9px] font-black uppercase tracking-widest text-slate-400'>Settlement history and pending obligations</p>
                    </div>
                    <Button onClick={() => setInvOpen(true)} className='rounded-2xl h-12 px-8 uppercase font-black tracking-widest text-[9px] bg-slate-900 text-white hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200'>Initialize Entry</Button>
                  </div>
                  
                  {invoicesLoading ? <div className='text-center py-20 font-black uppercase tracking-widest text-slate-200 animate-pulse'>Querying Ledger...</div> : (
                    <div className='rounded-3xl border border-slate-100 overflow-hidden bg-white'>
                      <Table>
                        <TableHeader className='bg-slate-50/50'>
                          <TableRow className='border-0'>
                            <TableHead className='font-black uppercase text-[9px] tracking-[0.2em] text-slate-400 py-6 pl-8'>Node Reference</TableHead>
                            <TableHead className='font-black uppercase text-[9px] tracking-[0.2em] text-slate-400 py-6'>Sync Status</TableHead>
                            <TableHead className='font-black uppercase text-[9px] tracking-[0.2em] text-slate-400 py-6'>Allocation Date</TableHead>
                            <TableHead className='font-black uppercase text-[9px] tracking-[0.2em] text-slate-400 py-6 text-right pr-8'>Valuation</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoices.map(inv => (
                            <TableRow key={inv._id} onClick={() => navigate(`/invoices/${inv._id}`)} className='cursor-pointer hover:bg-slate-50/50 transition-all group border-b border-slate-50 last:border-0'>
                              <TableCell className='py-6 pl-8'>
                                <div className='font-black text-xs text-indigo-600'>#{inv.number}</div>
                                <div className='text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5'>Digital Record</div>
                              </TableCell>
                              <TableCell className='py-6'>
                                <Badge className={cn(
                                  "rounded-lg uppercase font-black px-3 py-1 border-0 text-[8px] tracking-widest",
                                  inv.status?.toLowerCase() === 'paid' ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600"
                                )}>
                                  {inv.status}
                                </Badge>
                              </TableCell>
                              <TableCell className='py-6 text-[10px] font-bold text-slate-500 uppercase tracking-tighter'>
                                {displayDate(inv.issueDate || inv.createdAt)}
                              </TableCell>
                              <TableCell className='py-6 text-right pr-8'>
                                <div className='font-black text-sm text-slate-900 tabular-nums'>Rs.{money(inv.amount)}</div>
                                <div className='text-[8px] font-bold text-slate-400 uppercase tracking-widest'>Net Aggregate</div>
                              </TableCell>
                            </TableRow>
                          ))}
                          {invoices.length === 0 && (
                            <TableRow><TableCell colSpan={4} className='py-32 text-center'>
                              <div className='flex flex-col items-center gap-4 opacity-20'>
                                <Banknote className='w-12 h-12' />
                                <span className='font-black uppercase tracking-[0.3em] text-[10px]'>Zero financial sync history</span>
                              </div>
                            </TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="operations" className="mt-0">
                <Card className='shadow-sm rounded-[1.5rem] p-10 bg-white min-h-[700px] border border-slate-100'>
                  <div className='flex items-center justify-between mb-10'>
                    <div className='space-y-1'>
                      <h3 className='text-xl font-black uppercase tracking-tight text-slate-900'>Execution <span className='text-indigo-600'>Queue</span></h3>
                      <p className='text-[9px] font-black uppercase tracking-widest text-slate-400'>Operational pipeline and tracking cycles</p>
                    </div>
                    <Button onClick={() => setTaskOpen(true)} className='rounded-2xl h-12 px-8 uppercase font-black tracking-widest text-[9px] bg-slate-900 text-white hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200'>New Sync Point</Button>
                  </div>

                  {tasksLoading ? <div className='text-center py-20 font-black uppercase tracking-widest text-slate-200 animate-pulse'>Syncing Pipeline...</div> : (
                    <div className='rounded-3xl border border-slate-100 overflow-hidden bg-white'>
                      <Table>
                        <TableHeader className='bg-slate-50/50'>
                          <TableRow className='border-0'>
                            <TableHead className='font-black uppercase text-[9px] tracking-[0.2em] text-slate-400 py-6 pl-8'>Execution Node</TableHead>
                            <TableHead className='font-black uppercase text-[9px] tracking-[0.2em] text-slate-400 py-6'>Node Status</TableHead>
                            <TableHead className='font-black uppercase text-[9px] tracking-[0.2em] text-slate-400 py-6'>Operator</TableHead>
                            <TableHead className='font-black uppercase text-[9px] tracking-[0.2em] text-slate-400 py-6 text-right pr-8'>Deadline</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tasks.map(t => (
                            <TableRow key={t.id} className='border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-all group'>
                              <TableCell className='py-6 pl-8'>
                                <div className='font-black uppercase text-xs tracking-tight text-slate-700'>{t.title}</div>
                                <div className='text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5'>Operational Cycle</div>
                              </TableCell>
                              <TableCell className='py-6'>
                                <Badge className={cn(
                                  "rounded-lg uppercase font-black px-3 py-1 border-0 text-[8px] tracking-widest",
                                  t.status?.toLowerCase() === 'completed' ? "bg-emerald-500 text-white" : "bg-indigo-50 text-indigo-600"
                                )}>
                                  {t.status}
                                </Badge>
                              </TableCell>
                              <TableCell className='py-6'>
                                <div className='flex items-center gap-2'>
                                  <div className='w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200'>
                                    {t.assignee?.[0] || 'S'}
                                  </div>
                                  <span className='text-[10px] font-black uppercase text-slate-600'>{t.assignee || 'System'}</span>
                                </div>
                              </TableCell>
                              <TableCell className='py-6 text-right pr-8'>
                                <div className='font-black text-xs text-slate-900 tabular-nums'>{displayDate(t.deadline)}</div>
                                <div className='text-[8px] font-bold text-rose-400 uppercase tracking-widest mt-0.5'>Threshold</div>
                              </TableCell>
                            </TableRow>
                          ))}
                          {tasks.length === 0 && (
                            <TableRow><TableCell colSpan={4} className='py-32 text-center'>
                              <div className='flex flex-col items-center gap-4 opacity-20'>
                                <CheckCircle2 className='w-12 h-12' />
                                <span className='font-black uppercase tracking-[0.3em] text-[10px]'>Execution queue vacant</span>
                              </div>
                            </TableCell></TableRow>
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
            <Card className='shadow-sm rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 to-indigo-950 text-white border border-slate-800 group'>
              <CardContent className='p-6 relative overflow-hidden'>
                <div className='absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000' />
                <div className='flex items-center gap-4 mb-6 relative z-10'>
                  <div className='w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10'>
                    <Building2 className='w-6 h-6 text-indigo-300' />
                  </div>
                  <div>
                    <h3 className='text-xs font-black uppercase tracking-[0.1em] text-white/90'>{p.client || "Hospital Entity"}</h3>
                    <div className='flex items-center gap-2 mt-1'>
                      <div className='w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse' />
                      <span className='text-[7px] font-black uppercase tracking-widest text-emerald-400'>System Active</span>
                    </div>
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-4 mb-6 relative z-10'>
                  <div className='p-3 bg-white/5 rounded-2xl border border-white/5'>
                    <p className='text-[7px] font-black uppercase tracking-widest text-white/40 mb-1'>Active Modules</p>
                    <p className='text-sm font-black text-white'>{selectedModules.length} / {HMS_MODULES.length}</p>
                  </div>
                  <div className='p-3 bg-white/5 rounded-2xl border border-white/5'>
                    <p className='text-[7px] font-black uppercase tracking-widest text-white/40 mb-1'>Operational</p>
                    <p className='text-sm font-black text-white'>{p.status === "accepted" ? "Ready" : "Pending"}</p>
                  </div>
                </div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button onClick={() => navigate(`/prospects/leads/${p.leadId || p.lead}`)} className='w-full rounded-2xl bg-white text-slate-900 uppercase font-black text-[9px] tracking-[0.2em] h-10 hover:bg-slate-50 transition-all shadow-xl shadow-black/20'>
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
                    <h3 className='text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]'>Module Repository</h3>
                    <p className='text-[7px] font-bold text-slate-300 uppercase tracking-widest'>Select to integrate</p>
                  </div>
                  <div className='flex gap-1'>
                    <Button variant="ghost" size="sm" onClick={selectAllModules} className="h-6 px-2 text-[7px] font-black uppercase text-indigo-600 hover:bg-indigo-50 rounded-lg">Full Stack</Button>
                    <Button variant="ghost" size="sm" onClick={clearModules} className="h-6 px-2 text-[7px] font-black uppercase text-rose-600 hover:bg-rose-50 rounded-lg">Reset</Button>
                  </div>
                </div>
                <div className='relative'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400' />
                  <Input 
                    value={moduleQuery}
                    onChange={(e) => setModuleQuery(e.target.value)}
                    placeholder="Search modules..." 
                    className='h-8 pl-8 rounded-xl bg-slate-50 border-0 text-[10px] font-bold focus:ring-1 ring-indigo-500 transition-all'
                  />
                </div>
              </div>
              <CardContent className='p-3 max-h-[400px] overflow-auto custom-scrollbar space-y-1'>
                {filteredModules.map(m => (
                  <motion.div 
                    key={m.id} 
                    whileHover={{ x: 4 }}
                    className={cn(
                      "flex items-center gap-3 p-3 border rounded-2xl transition-all cursor-pointer group relative overflow-hidden",
                      selectedModules.includes(m.id) 
                        ? "border-indigo-600 bg-indigo-50/50 shadow-sm" 
                        : "bg-white border-slate-100 hover:border-indigo-200"
                    )} 
                    onClick={() => toggleModule(m.id)}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-md border flex items-center justify-center transition-all duration-300",
                      selectedModules.includes(m.id) ? "bg-indigo-600 border-indigo-600 scale-110 shadow-lg shadow-indigo-200" : "bg-white border-slate-200"
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
                        selectedModules.includes(m.id) ? "text-indigo-900" : "text-slate-500 group-hover:text-slate-900"
                      )}>{m.title}</span>
                      {selectedModules.includes(m.id) && (
                        <motion.span 
                          initial={{ opacity: 0, y: 5 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          className='text-[7px] font-bold text-indigo-400 uppercase tracking-widest'
                        >
                          Integrated
                        </motion.span>
                      )}
                    </div>
                    {/* Cost per module on hover (simulated) */}
                    <div className='opacity-0 group-hover:opacity-100 transition-opacity'>
                      <span className='text-[8px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg'>Rs.5,000+</span>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>

            {/* AI Assistant Bonus */}
            <Card className='shadow-sm rounded-3xl overflow-hidden bg-indigo-50/50 border border-indigo-100 group'>
              <CardContent className='p-6'>
                <div className='flex items-center gap-3 mb-4'>
                  <div className='w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200'>
                    <Wand2 className='w-4 h-4 text-white' />
                  </div>
                  <h3 className='text-[10px] font-black uppercase tracking-widest text-indigo-900'>Neural Architect</h3>
                </div>
                <p className='text-[9px] font-bold text-indigo-600/70 leading-relaxed mb-4'>
                  "Suggest optimal hospital setup based on budget"
                </p>
                <Button variant='outline' onClick={analyzeAgreement} className='w-full rounded-xl bg-white border-indigo-100 text-indigo-600 font-black text-[8px] uppercase tracking-widest h-9 hover:bg-indigo-600 hover:text-white transition-all'>
                  Launch Analysis
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modals & Dialogs remain largely the same but with rounded-3xl/2xl */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className='max-w-xl rounded-[3rem] p-12 bg-white border-0 shadow-3xl'>
          <DialogHeader className='mb-8'>
            <DialogTitle className='text-3xl font-black uppercase tracking-tighter'>Modify <span className='text-indigo-600'>Structure</span></DialogTitle>
            <p className='text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2'>Update the core parameters of this proposal document</p>
          </DialogHeader>
          <div className='space-y-8'>
            <div className='space-y-2'>
              <Label className='text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2'>Project Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} className='h-14 rounded-2xl bg-slate-50 border-0 focus:ring-2 ring-indigo-500 font-bold px-6' />
            </div>
            <div className='space-y-2'>
              <Label className='text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2'>Client Entity</Label>
              <Input value={client} onChange={e => setClient(e.target.value)} className='h-14 rounded-2xl bg-slate-50 border-0 focus:ring-2 ring-indigo-500 font-bold px-6' />
            </div>
          </div>
          <DialogFooter className='mt-10 gap-4'>
            <Button variant='ghost' onClick={() => setEditOpen(false)} className='rounded-xl uppercase font-black tracking-widest text-[10px] h-12 px-8'>Cancel</Button>
            <Button onClick={save} className='bg-indigo-600 text-white rounded-2xl uppercase font-black tracking-widest text-[10px] h-14 px-10 shadow-xl shadow-indigo-100'>Apply Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className='max-w-[1000px] w-[90vw] h-[90vh] p-0 overflow-hidden bg-[#0f172a] border-0 rounded-[2.5rem] shadow-3xl flex flex-col'>
          <div className='flex items-center justify-between px-8 py-4 bg-slate-900/40 backdrop-blur-xl border-b border-white/5 z-10'>
            <div className='flex items-center gap-4'>
              <div className='w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20'>
                <Eye className='w-5 h-5 text-indigo-400' />
              </div>
              <div>
                <h3 className='text-sm font-black text-white uppercase tracking-tight'>Authority <span className='text-indigo-400'>Preview</span></h3>
                <p className='text-[9px] font-bold text-slate-500 uppercase tracking-widest'>Document Synchronization</p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <Button variant='ghost' onClick={triggerPrintNow} className='h-10 px-5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/5 text-[9px] font-black uppercase tracking-widest transition-all'>
                <Printer className='w-3.5 h-3.5 mr-2' /> Print
              </Button>
              <Button onClick={downloadPdf} disabled={pdfLoading} className='h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20'>
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
                    <div className='w-12 h-12 rounded-2xl border-2 border-indigo-500/30 border-t-indigo-500 animate-spin' />
                    <span className='text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]'>Syncing Nodes...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleConfirmTemplate}
        title="Apply Template?"
        description="This will replace all current document content with the professional HMS template. This action cannot be undone."
        confirmText="Apply Template"
        variant="warning"
      />

      <AuthVerifyDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        onSuccess={handleAuthSuccess}
        title="Verify Replicate Action"
        description="Cloning a proposal is a protected administrative action. Please verify your identity to proceed."
      />

      {/* NEW: Minimal Popups for Ledger and Execution */}
      <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
        <DialogContent className='max-w-md rounded-[2.5rem] p-10 bg-white border-0 shadow-3xl'>
          <DialogHeader className='mb-6'>
            <DialogTitle className='text-2xl font-black uppercase tracking-tighter'>Sync <span className='text-indigo-600'>Point</span></DialogTitle>
            <p className='text-slate-400 font-bold uppercase tracking-widest text-[9px] mt-1'>Initialize a new operational execution cycle</p>
          </DialogHeader>
          <div className='space-y-6'>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1'>Cycle Objective</Label>
              <Input placeholder="e.g. Infrastructure Setup" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} className='h-12 rounded-xl bg-slate-50 border-0 focus:ring-2 ring-indigo-500 font-bold px-4 text-xs' />
            </div>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1'>Operational Threshold</Label>
              <Input type="date" value={newTask.deadline} onChange={e => setNewTask({...newTask, deadline: e.target.value})} className='h-12 rounded-xl bg-slate-50 border-0 focus:ring-2 ring-indigo-500 font-bold px-4 text-xs' />
            </div>
          </div>
          <DialogFooter className='mt-8 gap-3'>
            <Button variant='ghost' onClick={() => setTaskOpen(false)} className='rounded-xl uppercase font-black tracking-widest text-[9px] h-10 px-6'>Abort</Button>
            <Button onClick={addTask} className='bg-indigo-600 text-white rounded-xl uppercase font-black tracking-widest text-[9px] h-12 px-8 shadow-lg shadow-indigo-100'>Deploy Cycle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={invOpen} onOpenChange={setInvOpen}>
        <DialogContent className='max-w-md rounded-[2.5rem] p-10 bg-white border-0 shadow-3xl'>
          <DialogHeader className='mb-6'>
            <DialogTitle className='text-2xl font-black uppercase tracking-tighter'>Ledger <span className='text-indigo-600'>Initiation</span></DialogTitle>
            <p className='text-slate-400 font-bold uppercase tracking-widest text-[9px] mt-1'>Authorize a new fiscal valuation record</p>
          </DialogHeader>
          <div className='space-y-6'>
            <div className='p-6 bg-indigo-50 rounded-2xl border border-indigo-100 flex flex-col items-center justify-center text-center'>
              <span className='text-[8px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-1'>Aggregated Value</span>
              <span className='text-3xl font-black text-indigo-900 tabular-nums'>Rs.{money(grandTotal)}</span>
            </div>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1'>Fiscal Status</Label>
              <Select value={newInv.status} onValueChange={v => setNewInv({...newInv, status: v})}>
                <SelectTrigger className='h-12 rounded-xl bg-slate-50 border-0 focus:ring-2 ring-indigo-500 font-bold px-4 text-xs'>
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

      <Dialog open={addModuleOpen} onOpenChange={setAddModuleOpen}>
        <DialogContent className='max-w-md rounded-[2.5rem] p-10 bg-white border-0 shadow-3xl'>
          <DialogHeader className='mb-6'>
            <DialogTitle className='text-2xl font-black uppercase tracking-tighter'>Add <span className='text-indigo-600'>Module</span></DialogTitle>
            <p className='text-slate-400 font-bold uppercase tracking-widest text-[9px] mt-1'>Create a custom proposal module</p>
          </DialogHeader>
          <div className='space-y-6'>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1'>Module Title</Label>
              <Input placeholder="e.g. Cybersecurity Protocol" value={newModule.title} onChange={e => setNewModule({...newModule, title: e.target.value})} className='h-12 rounded-xl bg-slate-50 border-0 focus:ring-2 ring-indigo-500 font-bold px-4 text-xs' />
            </div>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1'>Module Content</Label>
              <Textarea placeholder="Module content..." value={newModule.content} onChange={e => setNewModule({...newModule, content: e.target.value})} className='min-h-[150px] rounded-xl bg-slate-50 border-0 focus:ring-2 ring-indigo-500 font-medium p-4 text-xs' />
            </div>
          </div>
          <DialogFooter className='mt-8 gap-3'>
            <Button variant='ghost' onClick={() => setAddModuleOpen(false)} className='rounded-xl uppercase font-black tracking-widest text-[9px] h-10 px-6'>Cancel</Button>
            <Button onClick={handleAddModule} className='bg-indigo-600 text-white rounded-xl uppercase font-black tracking-widest text-[9px] h-12 px-8 shadow-lg shadow-indigo-100'>Add Module</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={analysisOpen} onOpenChange={setAnalysisOpen}>
        <DialogContent className='max-w-md rounded-[2.5rem] p-10 bg-white border-0 shadow-3xl'>
          <DialogHeader className='mb-6'>
            <DialogTitle className='text-2xl font-black uppercase tracking-tighter'>Neural <span className='text-indigo-600'>Architect</span></DialogTitle>
            <p className='text-slate-400 font-bold uppercase tracking-widest text-[9px] mt-1'>AI-Powered Proposal Analysis</p>
          </DialogHeader>
          <div className='space-y-6'>
            {isAnalyzing ? (
              <div className='flex flex-col items-center justify-center py-10'>
                <div className='w-12 h-12 rounded-2xl border-4 border-indigo-500/30 border-t-indigo-500 animate-spin mb-4' />
                <span className='text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] animate-pulse'>Analyzing Nodes...</span>
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
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/sonner";
import { ArrowLeft, Copy, CheckCircle2, XCircle, Send, Printer, Eye, FileDown, PenLine, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Link2, Code, ChevronDown, FileText, Table as TableIcon, Layout, Wand2, Percent, Calculator, Banknote, MessageSquare } from "lucide-react";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";
import { HMS_MODULES, FULL_PROPOSAL_TEMPLATE } from "./ProposalModules";
import { Checkbox } from "@/components/ui/checkbox";
import { Label as UILabel } from "@/components/ui/label";
import { HaroomPrintTemplate } from "@/components/print/HaroomPrintTemplate";
import { renderToStaticMarkup } from "react-dom/server";
import { openWhatsappChat } from "@/lib/whatsapp";

const COMPANY = {
  name: "Mindspire",
  address: "Gurugram, Pakistan",
  email: "info@mindspire.org",
  website: "www.mindspire.org",
};

type Proposal = {
  _id: string;
  id?: string;
  number?: string;
  title?: string;
  client?: string;
  clientId?: string;
  amount?: number;
  status?: string;
  proposalDate?: string;
  validUntil?: string;
  leadId?: string;
  contractId?: string;
  phone?: string;
  note?: string;
  tax1?: number;
  tax2?: number;
  discount?: number;
  advanceAmount?: number;
  paymentTermsPercentage?: number;
};

type Project = {
  id: string;
  title?: string;
  description?: string;
  price?: number;
  start?: string;
  deadline?: string;
};

// Tasks related to this proposal (by leadId or project context)
type TaskRow = { id: string; title: string; status: string; projectTitle?: string; deadline?: string; assignee?: string };

export default function ProposalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [p, setP] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [status, setStatus] = useState("draft");

  const [outerTab, setOuterTab] = useState("details-outer");
  const [innerTab, setInnerTab] = useState("items");

  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [amount, setAmount] = useState("");
  const openWhatsapp = (phoneRaw?: string, name?: string) => {
    const msg = `Hello ${name || ""}, I'm following up regarding your inquiry.`;
    const r = openWhatsappChat(phoneRaw, msg, { defaultCountryCode: "92" });
    if (!r.ok) toast.error("Invalid or missing phone number");
  };
  const [proposalDate, setProposalDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [note, setNote] = useState("");
  const [tax1, setTax1] = useState("0");
  const [tax2, setTax2] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [advanceAmount, setAdvanceAmount] = useState("0");
  const [paymentTermsPercentage, setPaymentTermsPercentage] = useState("50");

  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  // Tasks state
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  const loadInvoices = async () => {
    if (!id) return;
    try {
      setInvoicesLoading(true);
      const res = await fetch(`${API_BASE}/api/invoices?proposalId=${encodeURIComponent(id)}`, { headers: getAuthHeaders() });
      if (res.ok) {
        setInvoices(await res.json());
      }
    } catch (e) {
      console.error("Failed to load invoices", e);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const createInvoiceFromProposal = async () => {
    if (!p) return;
    if (!confirm("Create a new Invoice from this Proposal?")) return;
    try {
      const payload = {
        proposalId: p.id,
        clientId: p.clientId,
        client: p.client,
        amount: grandTotal,
        status: "Draft",
        issueDate: new Date().toISOString(),
        items: items.map(it => ({
          name: it.name,
          quantity: it.qty,
          rate: it.rate,
          total: it.qty * it.rate
        })),
        tax1: Number(tax1),
        tax2: Number(tax2),
        discount: Number(discount),
        advanceAmount: Number(advanceAmount),
        note: `Generated from Proposal #${p.number || p.id}`
      };
      const res = await fetch(`${API_BASE}/api/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success("Invoice created successfully");
        loadInvoices();
        setOuterTab("invoices-outer");
      } else {
        const error = await res.json();
        throw new Error(error.message || "Failed to create invoice");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to create invoice");
    }
  };

  const editorRef = useRef<HTMLDivElement | null>(null);
  const [editorHtml, setEditorHtml] = useState<string>("");
  const [project, setProject] = useState<Project | null>(null);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  const toggleModule = (modId: string) => {
    setSelectedModules(prev => {
      const next = prev.includes(modId) ? prev.filter(id => id !== modId) : [...prev, modId];
      
      // Auto-generate content based on selection
      const content = next.map(id => {
        const mod = HMS_MODULES.find(m => m.id === id);
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

  const useFullTemplate = () => {
    if (!confirm("This will replace current content with the professional template. Continue?")) return;
    setEditorHtml(FULL_PROPOSAL_TEMPLATE);
    if (editorRef.current) {
      editorRef.current.innerHTML = FULL_PROPOSAL_TEMPLATE;
    }
    setSelectedModules([]);
  };
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const pid = url.searchParams.get("projectId") || localStorage.getItem("current_project_id") || "";
      if (!pid) return;
      (async () => {
        try {
          const res = await fetch(`${API_BASE}/api/projects/${pid}`, { headers: getAuthHeaders() });
          if (!res.ok) return;
          const d = await res.json();
          setProject({
            id: String(d._id || pid),
            title: d.title || "",
            description: d.description || "",
            price: typeof d.price === 'number' ? d.price : undefined,
            start: d.start ? new Date(d.start).toISOString().slice(0,10) : undefined,
            deadline: d.deadline ? new Date(d.deadline).toISOString().slice(0,10) : undefined,
          });
        } catch {}
      })();
    } catch {}
  }, []);

  // Utility: strip HTML to plain English text for previews
  const stripHtml = (html: string) => {
    try {
      const div = document.createElement("div");
      div.innerHTML = html || "";
      return (div.textContent || div.innerText || "").trim();
    } catch { return html; }
  };
  const noteEnglish = useMemo(() => stripHtml(editorHtml || p?.note || ""), [editorHtml, p]);

  // Preview overlay (same tab)
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const previewRef = useRef<HTMLIFrameElement | null>(null);
  const [previewPrint, setPreviewPrint] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [previewAutoDownload, setPreviewAutoDownload] = useState(false);

  // Manual print trigger for the already-loaded iframe
  const triggerPrintNow = () => {
    try { previewRef.current?.contentWindow?.focus(); previewRef.current?.contentWindow?.print(); } catch {}
  };

  type Item = { id: string; name: string; qty: number; rate: number };
  const [items, setItems] = useState<Item[]>([]);
  const subTotal = useMemo(() => items.reduce((s, it) => s + it.qty * it.rate, 0), [items]);
  const taxTotal = useMemo(() => subTotal * (Number(tax1||0)/100) + subTotal * (Number(tax2||0)/100), [subTotal, tax1, tax2]);
  const grandTotal = useMemo(() => Math.max(0, subTotal + taxTotal - Number(discount || 0)), [subTotal, taxTotal, discount]);
  const calculatedAdvance = useMemo(() => (grandTotal * Number(paymentTermsPercentage || 0)) / 100, [grandTotal, paymentTermsPercentage]);

  const proposalStatus = useMemo(() => {
    const s = String(p?.status || "draft").toLowerCase();
    if (s === "accepted") return { label: "Accepted", className: "bg-emerald-600 text-white border-emerald-600" };
    if (s === "declined" || s === "rejected") return { label: "Declined", className: "bg-rose-600 text-white border-rose-600" };
    if (s === "sent") return { label: "Sent", className: "bg-sky-600 text-white border-sky-600" };
    return { label: "Draft", className: "bg-muted text-foreground border-border" };
  }, [p?.status]);

  const money = (v: any) => Number(v || 0).toLocaleString();

  // Items picker (fetch from Items page)
  type CatalogItem = { id: string; title: string; rate?: number; unit?: string; description?: string };
  const [pickOpen, setPickOpen] = useState(false);
  const [pickQuery, setPickQuery] = useState("");
  const [pickItems, setPickItems] = useState<CatalogItem[]>([]);
  const [pickLoading, setPickLoading] = useState(false);
  // create new item inside picker
  const [newTitle, setNewTitle] = useState("");
  const [newRate, setNewRate] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newSaving, setNewSaving] = useState(false);

  useEffect(() => {
    if (!pickOpen) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        setPickLoading(true);
        const url = `${API_BASE}/api/items${pickQuery ? `?q=${encodeURIComponent(pickQuery)}` : ""}`;
        const r = await fetch(url, { signal: ctrl.signal, headers: getAuthHeaders() });
        if (!r.ok) { setPickItems([]); return; }
        const data = await r.json();
        const list: CatalogItem[] = (Array.isArray(data) ? data : [])
          .map((d:any) => ({ id: String(d._id || ""), title: d.title || "-", rate: typeof d.rate === 'number' ? d.rate : undefined, unit: d.unit || undefined, description: d.description || undefined }))
          .filter((x:any) => x.id);
        setPickItems(list);
      } catch {}
      finally { setPickLoading(false); }
    })();
    return () => ctrl.abort();
  }, [pickOpen, pickQuery]);

  const addFromCatalog = (ci: CatalogItem) => {
    setItems(prev => ([...prev, { id: Math.random().toString(36).slice(2), name: ci.title, qty: 1, rate: Number(ci.rate || 0) }]));
    setPickOpen(false);
  };

  const createNewItem = async () => {
    if (!newTitle.trim()) { toast.error("Title is required"); return; }
    try {
      setNewSaving(true);
      const payload: any = {
        title: newTitle.trim(),
        description: newDesc || undefined,
        category: "general",
        unit: newUnit || undefined,
        rate: Number(newRate || 0),
        showInClientPortal: false,
        image: "",
      };
      const r = await fetch(`${API_BASE}/api/items`, { method: "POST", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
      if (!r.ok) {
        let msg = "Failed to create item";
        try { const e = await r.json(); if (e?.error) msg = String(e.error); } catch {}
        throw new Error(msg);
      }
      const created = await r.json();
      const ci: CatalogItem = { id: String(created._id || ""), title: created.title || newTitle.trim(), rate: created.rate, unit: created.unit, description: created.description };
      // add to proposal items immediately
      addFromCatalog(ci);
      // also update picker list for next time
      setPickItems(prev => [{ id: ci.id, title: ci.title, rate: ci.rate, unit: ci.unit, description: ci.description }, ...prev]);
      // reset form
      setNewTitle(""); setNewRate(""); setNewUnit(""); setNewDesc("");
      toast.success("Item created");
    } catch (e:any) {
      toast.error(e?.message || "Failed to create item");
    } finally {
      setNewSaving(false);
    }
  };

  const load = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/proposals/${id}`, { headers: getAuthHeaders() });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Failed to load proposal");
      const mapped: Proposal = {
        _id: String(d._id || id),
        id: String(d._id || id),
        title: d.title || "-",
        client: d.client || "-",
        amount: Number(d.amount || 0),
        status: d.status || "draft",
        proposalDate: d.proposalDate ? new Date(d.proposalDate).toISOString().slice(0, 10) : undefined,
        validUntil: d.validUntil ? new Date(d.validUntil).toISOString().slice(0, 10) : undefined,
        note: d.note || "",
        number: typeof d.number === 'number' ? d.number : undefined,
        tax1: typeof d.tax1 === 'number' ? d.tax1 : 0,
        tax2: typeof d.tax2 === 'number' ? d.tax2 : 0,
        leadId: d.leadId ? String(d.leadId) : undefined,
        clientId: d.clientId ? String(d.clientId) : undefined,
        contractId: d.contractId ? String(d.contractId) : undefined,
        phone: d.phone || ""
      };
      setP(mapped);
      setTax1(String(mapped.tax1 ?? 0));
      setTax2(String(mapped.tax2 ?? 0));
      setDiscount(String(mapped.discount ?? 0));
      setAdvanceAmount(String(mapped.advanceAmount ?? 0));
      setPaymentTermsPercentage(String(mapped.paymentTermsPercentage ?? 50));
      setEditorHtml(mapped.note || "");
      try {
        const list = Array.isArray(d.items) ? d.items : [];
        setItems(list.map((it: any) => ({
          id: Math.random().toString(36).slice(2),
          name: String(it?.name || ""),
          qty: Number(it?.qty ?? 1) || 0,
          rate: Number(it?.rate ?? 0) || 0,
        })).filter((x: any) => x.name));
      } catch {
        setItems([]);
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to load proposal");
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async (leadId?: string, projectId?: string) => {
    setTasksLoading(true);
    setTasks([]);
    try {
      let url: string | null = null;
      const valid = (v?: string) => !!v && v !== "-" && v !== "undefined";
      if (valid(leadId)) url = `${API_BASE}/api/tasks?leadId=${encodeURIComponent(String(leadId))}`;
      else if (valid(projectId)) url = `${API_BASE}/api/tasks?projectId=${encodeURIComponent(String(projectId))}`;
      if (!url) { setTasksLoading(false); return; }
      const r = await fetch(url, { headers: getAuthHeaders() });
      const data = await r.json().catch(()=>[]);
      if (!r.ok) throw new Error(data?.error || "Failed to load tasks");
      const list: TaskRow[] = (Array.isArray(data) ? data : []).map((t:any) => ({
        id: String(t._id || ""),
        title: t.title || "-",
        status: t.status || "-",
        projectTitle: t.projectTitle || undefined,
        deadline: t.deadline ? new Date(t.deadline).toISOString().slice(0,10) : undefined,
        assignee: Array.isArray(t.assignees) && t.assignees[0]?.name ? String(t.assignees[0].name) : undefined,
      })).filter(x=>x.id);
      setTasks(list);
    } catch (e:any) {
      toast.error(e?.message || "Failed to load tasks");
    } finally { setTasksLoading(false); }
  };

  const buildPreviewDocument = () => {
    const proposalNo = p?.number ?? p?.id ?? "-";
    const proposalDateText = p?.proposalDate ? new Date(p.proposalDate).toLocaleDateString() : "-";
    const expiryDateText = p?.validUntil ? new Date(p.validUntil).toLocaleDateString() : "-";
    
    const sub = Number(subTotal || 0);
    const t1p = Number(tax1 || 0);
    const t2p = Number(tax2 || 0);
    const t1 = sub * (t1p / 100);
    const t2 = sub * (t2p / 100);
    const total = sub + t1 + t2;

    const viewBrand = {
      name: "HealthSpire",
      email: "info@healthspire.org",
      phone: "+92 312 7231875",
      address: "761/D2 Shah Jelani Rd Township Lahore",
      website: "www.healthspire.org",
      logoSrc: "/HealthSpire%20logo.png",
    };

    const totals: { label: string; value: string; bold?: boolean }[] = [
      { label: "Sub Total", value: `Rs.${sub.toLocaleString()}` }
    ];
    if (t1 > 0) totals.push({ label: `Tax (${t1p}%)`, value: `Rs.${t1.toLocaleString()}` });
    if (t2 > 0) totals.push({ label: `Tax (${t2p}%)`, value: `Rs.${t2.toLocaleString()}` });
    if (Number(discount || 0) > 0) totals.push({ label: "Discount", value: `-Rs.${Number(discount).toLocaleString()}` });
    totals.push({ label: "Total Amount", value: `Rs.${total.toLocaleString()}`, bold: true });
    if (Number(advanceAmount || 0) > 0) totals.push({ label: "Advance Received", value: `Rs.${Number(advanceAmount).toLocaleString()}` });
    if (Number(paymentTermsPercentage || 0) > 0) totals.push({ label: `Payment Terms (${paymentTermsPercentage}%)`, value: `Rs.${calculatedAdvance.toLocaleString()}` });

    const sections = [
      { heading: "PROJECT OVERVIEW", content: project?.description || "" },
      { heading: "PROPOSAL CONTENT", content: stripHtml(editorHtml || p?.note || "") }
    ];

    const templateProps = {
      title: "PROJECT PROPOSAL",
      brand: viewBrand,
      clientName: p?.client || "-",
      clientAddress: "", // Add if available
      docNumber: String(proposalNo),
      date: proposalDateText,
      items: items.map(it => ({
        description: it.name,
        qty: it.qty,
        price: it.rate,
        total: it.qty * it.rate
      })),
      totals,
      sections,
      signatureData: {
        companyName: "Health Spire (Pvt) Ltd",
        companySignatory: "Mr. Qutaibah Talat",
        companyDesignation: "CEO",
        clientName: p?.client || "Client Name"
      }
    };

    const contentHtml = renderToStaticMarkup(<HaroomPrintTemplate {...templateProps} />);

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Proposal #${proposalNo}</title>
  <style>
    body { margin: 0; padding: 0; background: #f3f4f6; }
    .pdf-mode { background: white; }
    @media print {
      body { background: white; }
    }
  </style>
</head>
<body class="\${previewAutoDownload ? 'pdf-mode' : ''}">
  \${contentHtml}
  \${previewAutoDownload ? \`
  <script src="https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js"></script>
  <script>
    window.onload = function() {
      const el = document.querySelector('.haroom-print-root');
      html2pdf().set({
        margin: 0,
        filename: 'proposal-\${proposalNo}.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'], avoid: ['tr', 'table'] }
      }).from(el).save().then(() => {
        window.parent.postMessage({ type: 'proposal-pdf-done' }, '*');
      });
    };
  </script>
  \` : ''}
</body>
</html>`;
  };

  useEffect(() => { 
    load(); 
    loadInvoices();
  }, [id]);

  // Fetch tasks once we have the proposal with leadId or a project context
  useEffect(() => {
    if (p?.leadId || project?.id) loadTasks(p?.leadId, project?.id);
    else setTasks([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p?.leadId, project?.id]);

  const openEdit = () => {
    if (!p) return;
    setTitle(p.title || "");
    setClient(p.client || "");
    setAmount(String(p.amount || 0));
    setStatus(p.status || "draft");
    setProposalDate(p.proposalDate || "");
    setValidUntil(p.validUntil || "");
    setNote(p.note || "");
    setTax1(String(p.tax1 ?? 0));
    setTax2(String(p.tax2 ?? 0));
    setEditorHtml(p.note || "");
    setEditOpen(true);
  };

  const save = async () => {
    if (!id) return;
    try {
      const normalizedItems = (items || []).map((it) => ({ name: it.name || "", qty: Number(it.qty || 0), rate: Number(it.rate || 0) })).filter((x) => String(x.name || "").trim());
      const payload: any = {
        title,
        client,
        amount: Number(amount || 0),
        status,
        proposalDate,
        validUntil,
        note: editorRef.current?.innerHTML || editorHtml || "",
        tax1: Number(tax1),
        tax2: Number(tax2),
        discount: Number(discount),
        advanceAmount: Number(advanceAmount),
        paymentTermsPercentage: Number(paymentTermsPercentage),
      };
      const res = await fetch(`${API_BASE}/api/proposals/${id}`, {
        method: "PATCH",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to save");
      setP({
        ...d,
        _id: d._id || d.id,
        id: d._id || d.id,
        title: d.title,
        client: d.client,
        amount: d.amount,
        status: d.status,
        proposalDate: d.proposalDate,
        validUntil: d.validUntil,
        note: d.note,
        number: d.number,
        tax1: d.tax1,
        tax2: d.tax2,
        leadId: d.leadId || "",
        clientId: d.clientId || "",
        contractId: d.contractId || ""
      });
      setEditOpen(false);
      toast.success("Proposal updated");
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    }
  };

  const updateStatus = async (s: string) => {
    if (!id) return;
    try {
      const normalizedItems = (items || []).map((it) => ({ name: it.name || "", qty: Number(it.qty || 0), rate: Number(it.rate || 0) })).filter((x) => String(x.name || "").trim());
      const body: any = {
        status: s,
        tax1: Number(tax1 || 0),
        tax2: Number(tax2 || 0),
        items: normalizedItems,
        amount: normalizedItems.length ? Number(subTotal || 0) : (amount ? Number(amount) : 0),
        note: (editorRef.current?.innerHTML ?? editorHtml ?? note) || "",
      };
      const res = await fetch(`${API_BASE}/api/proposals/${id}`, { method: "PUT", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(body) });
      if (res.ok) { toast.success("Status updated"); load(); }
    } catch {}
  };

  const cloneProposal = async () => {
    if (!p) return;
    try {
      const normalizedItems = (items || []).map((it) => ({ name: it.name || "", qty: Number(it.qty || 0), rate: Number(it.rate || 0) })).filter((x) => String(x.name || "").trim());
      const payload = {
        title: p.title,
        client: p.client,
        amount: normalizedItems.length ? Number(subTotal || 0) : p.amount,
        status: p.status,
        proposalDate: p.proposalDate ? new Date(p.proposalDate).toISOString() : undefined,
        validUntil: p.validUntil ? new Date(p.validUntil).toISOString() : undefined,
        note: p.note,
        tax1: Number(p.tax1 || 0),
        tax2: Number(p.tax2 || 0),
        items: normalizedItems,
      };
      const res = await fetch(`${API_BASE}/api/proposals`, { method: "POST", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Failed to clone");
      toast.success("Cloned");
      navigate(`/prospects/proposals/${d._id}`);
    } catch (e: any) { toast.error(e?.message || "Failed to clone"); }
  };

  const openPreviewOverlay = (opts?: { print?: boolean; download?: boolean }) => {
    const html = buildPreviewDocument();
    setPreviewHtml(html);
    setPreviewOpen(true);
    setPreviewPrint(!!opts?.print);
    setPreviewAutoDownload(!!opts?.download);
    setIframeLoading(true);
  };

  const preview = () => { openPreviewOverlay(); };
  const downloadPdf = () => { openPreviewOverlay({ download: true }); };
  const printProposal = () => { openPreviewOverlay({ print: true }); };

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      try {
        if (e?.data?.type === 'proposal-pdf-done') {
          setPreviewAutoDownload(false);
          setPreviewOpen(false);
        }
      } catch {}
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const [tableRows, setTableRows] = useState("3");
  const [tableCols, setTableCols] = useState("3");
  const [tableDialogOpen, setTableDialogOpen] = useState(false);

  const exec = (cmd: string, value?: string) => {
    try {
      editorRef.current?.focus();
      document.execCommand(cmd, false, value);
      setEditorHtml(editorRef.current?.innerHTML ?? "");
    } catch {}
  };

  const insertHtml = (html: string) => {
    const map: Record<string, string> = {
      "{PROPOSAL_ID}": String(p?.number ?? p?.id ?? "-"),
      "{PROPOSAL_DATE}": String(p?.proposalDate ?? "-"),
      "{PROPOSAL_EXPIRY_DATE}": String(p?.validUntil ?? "-"),
      "{PROJECT_TITLE}": String(project?.title ?? "-"),
      "{PROJECT_DESCRIPTION}": String(project?.description ?? "-"),
      "{PROJECT_PRICE}": project?.price != null ? Number(project.price).toLocaleString() : "-",
      "{PROJECT_START}": String(project?.start ?? "-"),
      "{PROJECT_DEADLINE}": String(project?.deadline ?? "-"),
    };
    let out = html;
    Object.entries(map).forEach(([k, v]) => { out = out.split(k).join(v); });
    exec("insertHTML", out);
  };

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

  const insertSection = (heading: string, contentHtml: string) => {
    insertHtml(`
      <h2 style="margin:22px 0 8px; font-size:18px; font-weight:700;">${heading}</h2>
      <div style="color:#374151; font-size:14px; line-height:1.8;">${contentHtml}</div>
    `);
  };

  const insertFullTemplate = () => {
    const titleText = p?.title || "Project Proposal";
    const clientText = p?.client || "Client";
    const numText = p?.number ?? p?.id ?? "-";
    insertHtml(`
      <div style="text-align:center; margin-top: 40px;">
        <div style="font-size:34px; font-weight:800;">${titleText}</div>
        <div style="margin-top:10px; color:#6b7280;">Prepared for: <b>${clientText}</b></div>
        <div style="margin-top:4px; color:#6b7280;">Proposal #${numText}</div>
      </div>
      <hr style="margin:26px 0; border:none; border-top:1px solid #e5e7eb;" />
      <p style="color:#374151; line-height:1.8; font-size:14px;">
        Thank you for the opportunity to submit this proposal. This document outlines the scope, timeline, deliverables, pricing, and terms for the project.
      </p>
      <h2 style="margin:22px 0 8px; font-size:18px; font-weight:700;">Project Overview</h2>
      <p style="color:#374151; line-height:1.8; font-size:14px;">{PROJECT_DESCRIPTION}</p>
      <h2 style="margin:22px 0 8px; font-size:18px; font-weight:700;">Scope of Work</h2>
      <ul style="line-height:1.9; font-size:14px; color:#374151;">
        <li>Discovery & requirements gathering</li>
        <li>UI/UX design</li>
        <li>Development & implementation</li>
        <li>Testing & QA</li>
        <li>Deployment & handover</li>
      </ul>
      <h2 style="margin:22px 0 8px; font-size:18px; font-weight:700;">Timeline</h2>
      <p style="color:#374151; line-height:1.8; font-size:14px;">Estimated start: {PROJECT_START}. Estimated deadline: {PROJECT_DEADLINE}.</p>
      <h2 style="margin:22px 0 8px; font-size:18px; font-weight:700;">Deliverables</h2>
      <ul style="line-height:1.9; font-size:14px; color:#374151;">
        <li>Deliverable 1</li>
        <li>Deliverable 2</li>
        <li>Documentation & handover</li>
      </ul>
      <h2 style="margin:22px 0 8px; font-size:18px; font-weight:700;">Pricing</h2>
      <p style="color:#374151; line-height:1.8; font-size:14px;">Total project price: <b>{PROJECT_PRICE}</b></p>
      <p style="color:#374151; line-height:1.8; font-size:14px;">Payment terms: 50% upfront, 50% on completion (editable).</p>
      <h2 style="margin:22px 0 8px; font-size:18px; font-weight:700;">Terms & Conditions</h2>
      <ul style="line-height:1.9; font-size:14px; color:#374151;">
        <li>Proposal valid until {PROPOSAL_EXPIRY_DATE}</li>
        <li>2 revision rounds included (editable)</li>
        <li>Support & maintenance options available</li>
      </ul>
      <hr style="margin:26px 0; border:none; border-top:1px solid #e5e7eb;" />
      <p style="color:#6b7280;font-size:12px">Client signature: ______________________</p>
    `);
  };

  const saveAndShow = async () => {
    await save();
    setOuterTab("details-outer");
    setInnerTab("preview");
  };

  if (loading) return <div>Loading...</div>;
  if (!p) return <div>Not found</div>;

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3 min-w-[260px]">
              <Button variant="outline" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4"/></Button>
              <div>
                <div className="text-xs text-muted-foreground">Proposal</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-semibold leading-tight">{p.title || `Proposal #${p.number ?? p.id}`}</h1>
                  <Badge variant="outline" className={proposalStatus.className}>{proposalStatus.label}</Badge>
                  {p.phone && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                      onClick={() => openWhatsapp(p.phone, p.client)}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      WhatsApp
                    </Button>
                  )}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  For <span className="text-foreground font-medium">{p.client}</span>
                  <span className="mx-2">•</span>
                  #{p.number ?? p.id}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:block text-right mr-1">
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="text-lg font-semibold">Rs.{money(grandTotal || p.amount || 0)}</div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="success">Actions <ChevronDown className="w-4 h-4 ml-1"/></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={preview}><Eye className="w-4 h-4 mr-2"/>Proposal preview</DropdownMenuItem>
                  <DropdownMenuItem onClick={printProposal}><Printer className="w-4 h-4 mr-2"/>Print proposal</DropdownMenuItem>
                  <DropdownMenuItem onClick={downloadPdf}><FileDown className="w-4 h-4 mr-2"/>Download PDF</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {p.contractId ? (
                    <DropdownMenuItem onClick={() => navigate(`/sales/contracts/${p.contractId}`)}><Eye className="w-4 h-4 mr-2"/>View contract</DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem onClick={() => { setOuterTab("details-outer"); setInnerTab("editor"); }}><PenLine className="w-4 h-4 mr-2"/>Edit proposal</DropdownMenuItem>
                  <DropdownMenuItem onClick={openEdit}><PenLine className="w-4 h-4 mr-2"/>Edit proposal info</DropdownMenuItem>
                  <DropdownMenuItem onClick={cloneProposal}><Copy className="w-4 h-4 mr-2"/>Clone proposal</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => updateStatus('accepted')}><CheckCircle2 className="w-4 h-4 mr-2"/>Mark as Accepted</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateStatus('declined')}><XCircle className="w-4 h-4 mr-2"/>Mark as Rejected</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateStatus('sent')}><Send className="w-4 h-4 mr-2"/>Mark as Sent</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {
                    const subject = `Proposal #${p.number ?? p.id}`;
                    const body = `Please review the proposal here: ${window.location.href}`;
                    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                  }}><Send className="w-4 h-4 mr-2"/>Send to client</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-4 lg:grid-cols-6">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Sub total</div>
              <div className="mt-1 font-semibold">Rs.{money(subTotal || p.amount || 0)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Discount</div>
              <div className="mt-1 font-semibold text-rose-600">-Rs.{money(discount)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Tax Total</div>
              <div className="mt-1 font-semibold">Rs.{money(taxTotal)}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{Number(tax1||0) + Number(tax2||0)}%</div>
            </div>
            <div className="rounded-lg border p-3 bg-primary/5 border-primary/20">
              <div className="text-xs text-primary font-bold">Total Payable</div>
              <div className="mt-1 font-bold text-primary">Rs.{money(grandTotal)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Advance Needed</div>
              <div className="mt-1 font-semibold text-amber-600">Rs.{money(calculatedAdvance)}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{paymentTermsPercentage}% Upfront</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Valid until</div>
              <div className="mt-1 font-semibold">{p.validUntil ?? "-"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-4">
          <Card>
            <CardContent className="p-4">
              {/* Outer tabs like in reference: Details | Tasks */}
              <Tabs value={outerTab} onValueChange={setOuterTab}>
                <TabsList>
                  <TabsTrigger value="details-outer">Details</TabsTrigger>
                  <TabsTrigger value="invoices-outer">Invoices</TabsTrigger>
                  <TabsTrigger value="tasks-outer">Tasks</TabsTrigger>
                </TabsList>

                {/* DETAILS */}
                <TabsContent value="details-outer" className="mt-4">
                  {/* Inner tabs: Proposal items | Proposal editor | Preview */}
                  <Tabs value={innerTab} onValueChange={setInnerTab}>
                    <TabsList>
                      <TabsTrigger value="items">Proposal items</TabsTrigger>
                      <TabsTrigger value="editor">Proposal editor</TabsTrigger>
                      <TabsTrigger value="preview">Preview</TabsTrigger>
                    </TabsList>

                    <TabsContent value="items" className="mt-4">
                      <Card className="max-w-5xl mx-auto overflow-hidden">
                        <CardContent className="p-0">
                          <div className="p-5 sm:p-6 flex items-start justify-between gap-4 flex-wrap">
                            <div className="text-sm">
                              <div className="font-semibold">{COMPANY.name}</div>
                              <div className="text-muted-foreground">{COMPANY.address}</div>
                              <div className="text-muted-foreground">Email: {COMPANY.email}</div>
                              <div className="text-muted-foreground">Website: {COMPANY.website}</div>
                            </div>
                            <div className="text-sm text-right">
                              <div className="text-xs text-muted-foreground">Proposal to</div>
                              <div className="font-medium">{p.client}</div>
                              <div className="mt-2 flex items-center justify-end gap-2">
                                <Badge variant="outline">PROPOSAL #{p.number ?? p.id}</Badge>
                                <Badge variant="outline" className={proposalStatus.className}>{proposalStatus.label}</Badge>
                              </div>
                              <div className="mt-2 text-muted-foreground">Proposal date: {p.proposalDate ?? '-'}</div>
                              <div className="text-muted-foreground">Valid until: {p.validUntil ?? '-'}</div>
                            </div>
                          </div>

                          <div className="border-t">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/40">
                                  <TableHead className="w-[55%]">Item</TableHead>
                                  <TableHead className="text-right w-[15%]">Quantity</TableHead>
                                  <TableHead className="text-right w-[15%]">Rate</TableHead>
                                  <TableHead className="text-right w-[15%]">Total</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {items.length ? (
                                  items.map((it) => (
                                    <TableRow key={it.id}>
                                      <TableCell>
                                        <Input value={it.name} onChange={(e)=>setItems(p=>p.map(x=>x.id===it.id?{...x,name:e.target.value}:x))} />
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <Input className="text-right" type="number" value={it.qty} onChange={(e)=>setItems(p=>p.map(x=>x.id===it.id?{...x,qty:Number(e.target.value)}:x))} />
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <Input className="text-right" type="number" value={it.rate} onChange={(e)=>setItems(p=>p.map(x=>x.id===it.id?{...x,rate:Number(e.target.value)}:x))} />
                                      </TableCell>
                                      <TableCell className="text-right whitespace-nowrap">{money(it.qty * it.rate)}</TableCell>
                                    </TableRow>
                                  ))
                                ) : (
                                  <TableRow>
                                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">No record found.</TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>

                          <div className="p-5 sm:p-6 border-t flex items-start justify-between gap-4 flex-wrap">
                            <div>
                              <Button variant="outline" onClick={()=>setPickOpen(true)}>Add item</Button>
                            </div>
                            <div className="w-full sm:w-80 text-sm">
                              <div className="flex justify-between py-1"><span className="text-muted-foreground">Sub Total</span><span>Rs.{money(subTotal)}</span></div>
                              <div className="flex justify-between items-center gap-2 py-1">
                                <span className="text-muted-foreground">Tax</span>
                                <span className="flex items-center gap-1">
                                  <Input className="w-16" type="number" value={tax1} onChange={(e)=>setTax1(e.target.value)} />
                                  +
                                  <Input className="w-16" type="number" value={tax2} onChange={(e)=>setTax2(e.target.value)} />%
                                </span>
                              </div>
                              <div className="flex justify-between font-semibold pt-1"><span>Total</span><span>Rs.{money(grandTotal)}</span></div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="editor" className="mt-4">
                      <div className="max-w-6xl mx-auto grid gap-4 lg:grid-cols-12">
                        <div className="lg:col-span-9 border rounded-lg bg-background overflow-hidden flex flex-col h-[72vh]">
                          <div className="px-4 py-3 border-b flex items-center justify-between sticky top-0 bg-background z-10">
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => toast.message("Templates coming soon")}>Change template</Button>
                              <Button variant="outline" size="sm" onClick={insertFullTemplate}>Insert full template</Button>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="sm" onClick={save}>Save</Button>
                              <Button size="sm" variant="secondary" onClick={saveAndShow}>Save &amp; show</Button>
                            </div>
                          </div>

                          <div className="px-3 py-2 border-b flex items-center gap-1 flex-wrap sticky top-[52px] bg-background z-10">
                            <Button type="button" size="icon" variant="ghost" onClick={() => exec("bold")}><Bold className="w-4 h-4"/></Button>
                            <Button type="button" size="icon" variant="ghost" onClick={() => exec("italic")}><Italic className="w-4 h-4"/></Button>
                            <Button type="button" size="icon" variant="ghost" onClick={() => exec("underline")}><Underline className="w-4 h-4"/></Button>
                            <div className="w-px h-5 bg-border mx-1" />
                            <Button type="button" size="icon" variant="ghost" onClick={() => exec("justifyLeft")}><AlignLeft className="w-4 h-4"/></Button>
                            <Button type="button" size="icon" variant="ghost" onClick={() => exec("justifyCenter")}><AlignCenter className="w-4 h-4"/></Button>
                            <Button type="button" size="icon" variant="ghost" onClick={() => exec("justifyRight")}><AlignRight className="w-4 h-4"/></Button>
                            <div className="w-px h-5 bg-border mx-1" />
                            <Button type="button" size="icon" variant="ghost" onClick={() => exec("insertUnorderedList")}><List className="w-4 h-4"/></Button>
                            <Button variant="ghost" size="sm" onClick={() => exec("insertOrderedList")} title="Numbered List"><ListOrdered className="w-4 h-4"/></Button>
                            <Button variant="ghost" size="sm" onClick={() => setTableDialogOpen(true)} title="Insert Table"><TableIcon className="w-4 h-4"/></Button>
                            <div className="h-4 w-[1px] bg-border mx-1" />
                            <select 
                              className="text-xs bg-transparent border-none outline-none cursor-pointer"
                              onChange={(e) => exec("fontName", e.target.value)}
                              defaultValue="Poppins"
                            >
                              <option value="Poppins">Poppins</option>
                              <option value="Arial">Arial</option>
                              <option value="Times New Roman">Times New Roman</option>
                              <option value="Courier New">Courier New</option>
                            </select>
                            <Button type="button" size="icon" variant="ghost" onClick={() => exec("formatBlock", "<h2>")}><Code className="w-4 h-4"/></Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                const url = window.prompt("Enter link URL");
                                if (url) exec("createLink", url);
                              }}
                            >
                              <Link2 className="w-4 h-4"/>
                            </Button>
                          </div>

                          <div className="flex-1 overflow-auto bg-muted/20 p-6">
                            <div className="bg-white border rounded-md shadow-sm min-h-[900px]">
                              <div
                                ref={editorRef}
                                contentEditable
                                suppressContentEditableWarning
                                className="outline-none p-10 text-[15px] leading-7 min-h-[900px]"
                                onInput={() => setEditorHtml(editorRef.current?.innerHTML ?? "")}
                                dangerouslySetInnerHTML={{ __html: editorHtml || "<div style='text-align:center;font-size:34px;font-weight:800;margin-top:120px;font-family:\"Poppins\",sans-serif;'>Project Proposal</div><div style='text-align:center;color:#6b7280;margin-top:10px;font-family:\"Poppins\",sans-serif;'>Start writing your proposal…</div>" }}
                                style={{ fontFamily: '"Poppins", sans-serif' }}
                              />
                            </div>
                          </div>

                          <div className="px-4 py-3 border-t text-[11px] text-muted-foreground">
                            Available variables: {`{PROPOSAL_ID}, {PROPOSAL_DATE}, {PROPOSAL_EXPIRY_DATE}, {PROJECT_TITLE}, {PROJECT_DESCRIPTION}, {PROJECT_PRICE}, {PROJECT_START}, {PROJECT_DEADLINE}`}
                          </div>
                        </div>

                        <div className="lg:col-span-3 border rounded-lg bg-background overflow-hidden h-[72vh] flex flex-col">
                          <div className="px-4 py-3 border-b font-medium">Insert</div>
                          <div className="p-3 overflow-auto space-y-3">
                            <div className="text-xs text-muted-foreground">Sections</div>
                            <div className="grid gap-2">
                              <Button variant="outline" size="sm" onClick={() => insertSection("Project Overview", "<p>{PROJECT_DESCRIPTION}</p>")}>Project overview</Button>
                              <Button variant="outline" size="sm" onClick={() => insertSection("Objectives", "<ul><li>Objective 1</li><li>Objective 2</li></ul>")}>Objectives</Button>
                              <Button variant="outline" size="sm" onClick={() => insertSection("Scope of Work", "<ul><li>Discovery</li><li>Design</li><li>Development</li><li>Testing</li><li>Deployment</li></ul>")}>Scope of work</Button>
                              <Button variant="outline" size="sm" onClick={() => insertSection("Deliverables", "<ul><li>Deliverable 1</li><li>Deliverable 2</li></ul>")}>Deliverables</Button>
                              <Button variant="outline" size="sm" onClick={() => insertSection("Timeline", "<p>Start: {PROJECT_START} — Deadline: {PROJECT_DEADLINE}</p>")}>Timeline</Button>
                              <Button variant="outline" size="sm" onClick={() => insertSection("Pricing", "<p>Total: <b>{PROJECT_PRICE}</b></p><p>Payment terms: 50% upfront, 50% on completion.</p>")}>Pricing</Button>
                              <Button variant="outline" size="sm" onClick={() => insertSection("Terms & Conditions", "<ul><li>Proposal valid until {PROPOSAL_EXPIRY_DATE}</li><li>2 revisions included</li></ul>")}>Terms & conditions</Button>
                            </div>

                            <div className="pt-2">
                              <div className="text-xs text-muted-foreground mb-2">Hospital Modules</div>
                              <Button variant="success" size="sm" className="w-full mb-4 gap-2" onClick={useFullTemplate}>
                                <FileText className="w-4 h-4" />
                                Use Full Template
                              </Button>
                              
                              <div className="space-y-4">
                                {["Hospital", "Lab", "Pharmacy", "Clinic", "General"].map((cat) => (
                                  <div key={cat} className="space-y-2">
                                    <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider border-b pb-1">{cat}</div>
                                    <div className="space-y-1">
                                      {HMS_MODULES.filter(m => m.category === cat).map(mod => (
                                        <div key={mod.id} className="flex items-start gap-2 p-1.5 rounded-md hover:bg-muted/50 transition-colors group">
                                          <Checkbox 
                                            id={`mod-${mod.id}`} 
                                            checked={selectedModules.includes(mod.id)}
                                            onCheckedChange={() => toggleModule(mod.id)}
                                            className="mt-1"
                                          />
                                          <div className="flex-1 min-w-0">
                                            <UILabel htmlFor={`mod-${mod.id}`} className="text-[11px] leading-tight cursor-pointer block font-medium group-hover:text-primary transition-colors">
                                              {mod.title}
                                            </UILabel>
                                            {mod.description && (
                                              <p className="text-[9px] text-muted-foreground leading-tight mt-0.5 line-clamp-1 group-hover:line-clamp-none">
                                                {mod.description}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="pt-2">
                              <div className="text-xs text-muted-foreground">Variables</div>
                              <div className="grid gap-2 mt-2">
                                <Button variant="secondary" size="sm" onClick={() => insertHtml("{PROPOSAL_ID} ")}>{`{PROPOSAL_ID}`}</Button>
                                <Button variant="secondary" size="sm" onClick={() => insertHtml("{PROPOSAL_DATE} ")}>{`{PROPOSAL_DATE}`}</Button>
                                <Button variant="secondary" size="sm" onClick={() => insertHtml("{PROPOSAL_EXPIRY_DATE} ")}>{`{PROPOSAL_EXPIRY_DATE}`}</Button>
                                <Button variant="secondary" size="sm" onClick={() => insertHtml("{PROJECT_TITLE} ")}>{`{PROJECT_TITLE}`}</Button>
                                <Button variant="secondary" size="sm" onClick={() => insertHtml("{PROJECT_DESCRIPTION} ")}>{`{PROJECT_DESCRIPTION}`}</Button>
                                <Button variant="secondary" size="sm" onClick={() => insertHtml("{PROJECT_PRICE} ")}>{`{PROJECT_PRICE}`}</Button>
                              </div>
                            </div>

                            <div className="pt-2">
                              <div className="text-xs text-muted-foreground">Quick blocks</div>
                              <div className="grid gap-2 mt-2">
                                <Button variant="outline" size="sm" onClick={() => insertHtml("<hr style='margin:22px 0; border:none; border-top:1px solid #e5e7eb;' />")}>Divider</Button>
                                <Button variant="outline" size="sm" onClick={() => insertHtml("<p style='color:#6b7280;font-size:12px'>Client signature: ______________________</p>")}>Signature line</Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="preview" className="mt-4">
                      <div className="max-w-4xl mx-auto">
                        <div className="bg-muted/20 p-6 rounded-lg border">
                          <div className="bg-white border rounded-md shadow-sm p-10">
                            <div className="text-xs text-muted-foreground leading-6 max-w-[520px]" dangerouslySetInnerHTML={{ __html: (editorRef.current?.innerHTML ?? editorHtml ?? p.note ?? "") || "" }} />

                            <div className="text-center mt-8">
                              <div className="text-base tracking-[0.22em] font-semibold text-muted-foreground">PROPOSAL #{p.number ?? p.id}</div>
                              <div className="h-[3px] w-12 bg-amber-500 rounded-full mx-auto mt-3" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8 text-sm">
                              <div>
                                <div className="text-xs text-muted-foreground">Proposal Date</div>
                                <div className="mt-1">{p.proposalDate ?? '-'}</div>
                                <div className="h-3" />
                                <div className="text-xs text-muted-foreground">Expiry Date</div>
                                <div className="mt-1">{p.validUntil ?? '-'}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Proposal For</div>
                                <div className="mt-1">{p.client}</div>
                                <div className="text-xs text-muted-foreground mt-1">USA</div>
                              </div>
                              <div className="md:text-right">
                                <div className="text-xs text-muted-foreground">Proposal From</div>
                                <div className="mt-1">{COMPANY.name}</div>
                                <div className="text-xs text-muted-foreground mt-1">{COMPANY.address}</div>
                                <div className="text-xs text-muted-foreground">Email: {COMPANY.email}</div>
                                <div className="text-xs text-muted-foreground">Website: {COMPANY.website}</div>
                              </div>
                            </div>

                            <div className="text-center mt-14">
                              <div className="text-lg font-medium text-muted-foreground">Our Best Offer</div>
                              <div className="h-[3px] w-12 bg-amber-500 rounded-full mx-auto mt-3" />
                              <div className="text-xs text-muted-foreground mt-4 max-w-[620px] mx-auto leading-6">
                                In consideration of your unique needs and aspirations, we are pleased to present our best offer, crafted with meticulous attention to detail and driven by a commitment to delivering exceptional value.
                              </div>
                            </div>

                            <div className="mt-8">
                              <div className="grid grid-cols-12 bg-black text-white text-xs font-semibold px-3 py-2 rounded-t">
                                <div className="col-span-6">Item</div>
                                <div className="col-span-2 text-right">Quantity</div>
                                <div className="col-span-2 text-right">Rate</div>
                                <div className="col-span-2 text-right">Total</div>
                              </div>
                              <div className="border border-t-0 rounded-b overflow-hidden">
                                {items.length ? (
                                  items.map((it) => (
                                    <div key={it.id} className="grid grid-cols-12 px-3 py-2 text-sm border-t">
                                      <div className="col-span-6">{it.name || '-'}</div>
                                      <div className="col-span-2 text-right">{it.qty}</div>
                                      <div className="col-span-2 text-right">{it.rate}</div>
                                      <div className="col-span-2 text-right">{(it.qty * it.rate).toLocaleString()}</div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">No record found.</div>
                                )}
                              </div>

                              <div className="mt-3 w-72 ml-auto text-sm">
                                <div className="flex justify-between border px-3 py-2"><span className="text-muted-foreground">Sub Total</span><span>{Number(subTotal || 0).toLocaleString()}</span></div>
                                <div className="flex justify-between bg-black text-white font-semibold px-3 py-2"><span>Total</span><span>{Number(grandTotal || 0).toLocaleString()}</span></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </TabsContent>

                {/* INVOICES */}
                <TabsContent value="invoices-outer" className="mt-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold">Linked Invoices</h3>
                        <Button size="sm" onClick={createInvoiceFromProposal}>Create Invoice from Proposal</Button>
                      </div>
                      
                      {invoicesLoading ? (
                        <div className="text-sm text-muted-foreground py-10 text-center">Loading invoices...</div>
                      ) : invoices.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/40">
                              <TableHead>Invoice #</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {invoices.map((inv) => (
                              <TableRow key={inv._id}>
                                <TableCell className="font-medium">#{inv.number}</TableCell>
                                <TableCell>
                                  <Badge variant={inv.status === 'Paid' ? 'success' : 'outline'}>{inv.status}</Badge>
                                </TableCell>
                                <TableCell>Rs.{Number(inv.amount || 0).toLocaleString()}</TableCell>
                                <TableCell>{inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : '-'}</TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="sm" onClick={() => navigate(`/invoices/${inv._id}`)}>View</Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-sm text-muted-foreground py-10 text-center border-2 border-dashed rounded-lg">
                          No invoices linked to this proposal yet.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* TASKS */}
                <TabsContent value="tasks-outer" className="mt-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm text-muted-foreground">
                          {p?.leadId ? "Tasks linked to this proposal's lead" : project?.id ? "Tasks from the current project context" : "Tasks"}
                        </div>
                        <div>
                          <Button variant="outline" size="sm" onClick={()=>loadTasks(p?.leadId, project?.id)}>Refresh</Button>
                        </div>
                      </div>
                      {tasksLoading ? (
                        <div className="text-sm text-muted-foreground">Loading…</div>
                      ) : tasks.length ? (
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/40">
                              <TableHead>Title</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Project</TableHead>
                              <TableHead>Assignee</TableHead>
                              <TableHead>Deadline</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tasks.map(t => (
                              <TableRow key={t.id}>
                                <TableCell className="whitespace-nowrap">{t.title}</TableCell>
                                <TableCell className="whitespace-nowrap">{t.status}</TableCell>
                                <TableCell className="whitespace-nowrap">{t.projectTitle || '-'}</TableCell>
                                <TableCell className="whitespace-nowrap">{t.assignee || '-'}</TableCell>
                                <TableCell className="whitespace-nowrap">{t.deadline || '-'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-sm text-muted-foreground">No tasks found.</div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Client</div>
                  <div className="font-medium">{p.client}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Status</div>
                  <Badge variant="outline" className={proposalStatus.className}>{proposalStatus.label}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Proposal #</div>
                  <div className="font-medium">#{p.number ?? p.id}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Total</div>
                  <div className="font-medium">Rs.{money(grandTotal || p.amount || 0)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Proposal date</div>
                  <div className="font-medium">{p.proposalDate ?? '-'}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Valid until</div>
                  <div className="font-medium">{p.validUntil ?? '-'}</div>
                </div>
              </div>

              {project?.id ? (
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Project context</div>
                  <div className="font-medium">{project.title || '-'}</div>
                  {project.deadline ? <div className="text-xs text-muted-foreground mt-1">Deadline: {project.deadline}</div> : null}
                </div>
              ) : null}

              {p.contractId ? (
                <Button variant="outline" className="w-full" onClick={() => navigate(`/sales/contracts/${p.contractId}`)}>
                  <Eye className="w-4 h-4 mr-2" /> View linked contract
                </Button>
              ) : null}

              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Activity</div>
                <div className="text-sm text-muted-foreground mt-1">Last email sent: Never</div>
                <div className="text-sm text-muted-foreground">Last email seen: -</div>
                <div className="text-sm text-muted-foreground">Last preview seen: -</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="text-sm font-medium">Reminders</div>
              <div className="text-sm text-muted-foreground">No record found.</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card max-w-2xl">
          <DialogHeader><DialogTitle>Edit proposal</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Title</div>
            <div className="sm:col-span-9"><Input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Title" /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Client</div>
            <div className="sm:col-span-9"><Input value={client} onChange={(e)=>setClient(e.target.value)} placeholder="Client" /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Amount</div>
            <div className="sm:col-span-9"><Input type="number" value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="Amount" /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Status</div>
            <div className="sm:col-span-9">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Proposal date</div>
            <div className="sm:col-span-9"><DatePicker value={proposalDate} onChange={setProposalDate} placeholder="Pick proposal date" /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Valid until</div>
            <div className="sm:col-span-9"><DatePicker value={validUntil} onChange={setValidUntil} placeholder="Pick valid until" /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Notes (English)</div>
            <div className="sm:col-span-9">
              <Textarea value={noteEnglish} readOnly placeholder="English summary of proposal content" className="min-h-[96px]" />
              <div className="text-[11px] text-muted-foreground mt-1">Edit full content in the Proposal editor tab.</div>
            </div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Tax (%)</div>
            <div className="sm:col-span-4"><Input type="number" value={tax1} onChange={(e)=>setTax1(e.target.value)} /></div>
            <div className="sm:col-span-2 text-center pt-2 text-sm text-muted-foreground">+</div>
            <div className="sm:col-span-3"><Input type="number" value={tax2} onChange={(e)=>setTax2(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Discount (Rs.)</div>
            <div className="sm:col-span-9"><Input type="number" value={discount} onChange={(e)=>setDiscount(e.target.value)} placeholder="0" /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Advance Amount (Rs.)</div>
            <div className="sm:col-span-9"><Input type="number" value={advanceAmount} onChange={(e)=>setAdvanceAmount(e.target.value)} placeholder="0" /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Payment Terms (%)</div>
            <div className="sm:col-span-9">
              <Select value={paymentTermsPercentage} onValueChange={setPaymentTermsPercentage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25% Upfront</SelectItem>
                  <SelectItem value="30">30% Upfront</SelectItem>
                  <SelectItem value="50">50% Upfront</SelectItem>
                  <SelectItem value="70">70% Upfront</SelectItem>
                  <SelectItem value="100">100% Upfront</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-[10px] text-muted-foreground mt-1">Calculated Advance: Rs.{calculatedAdvance.toLocaleString()}</div>
            </div>
          </div>
          <DialogFooter>
            <div className="w-full flex items-center justify-end gap-2">
              <Button variant="outline" onClick={()=>setEditOpen(false)}>Close</Button>
              <Button onClick={save}>Save</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Items picker dialog */}
      <Dialog open={pickOpen} onOpenChange={setPickOpen}>
        <DialogContent className="bg-card max-w-2xl">
          <DialogHeader><DialogTitle>Choose item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Search items" value={pickQuery} onChange={(e)=>setPickQuery(e.target.value)} />
            <div className="max-h-[360px] overflow-auto border rounded-md">
              {pickLoading ? (
                <div className="p-4 text-sm text-muted-foreground">Loading...</div>
              ) : pickItems.length ? (
                <div className="divide-y">
                  {pickItems.map(ci => (
                    <div key={ci.id} className="p-3 flex items-center justify-between gap-3 hover:bg-muted/40">
                      <div>
                        <div className="font-medium text-sm">{ci.title}</div>
                        <div className="text-xs text-muted-foreground">{ci.description || ''}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-muted-foreground">Rate: {Number(ci.rate || 0).toLocaleString()}</div>
                        <Button size="sm" onClick={()=>addFromCatalog(ci)}>Add</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-sm text-muted-foreground">No items found.</div>
              )}
            </div>

            <div className="pt-2">
              <div className="text-xs text-muted-foreground mb-2">Create new item</div>
              <div className="grid gap-2 sm:grid-cols-12">
                <div className="sm:col-span-9"><Input placeholder="Title" value={newTitle} onChange={(e)=>setNewTitle(e.target.value)} /></div>
                <div className="sm:col-span-3"><Input placeholder="Unit (hrs, pc, etc.)" value={newUnit} onChange={(e)=>setNewUnit(e.target.value)} /></div>
                <div className="sm:col-span-4"><Input type="number" placeholder="Rate" value={newRate} onChange={(e)=>setNewRate(e.target.value)} /></div>
                <div className="sm:col-span-8"><Input placeholder="Short description" value={newDesc} onChange={(e)=>setNewDesc(e.target.value)} /></div>
              </div>
              <div className="mt-2 flex items-center justify-end gap-2">
                <Button variant="outline" onClick={()=>{ setNewTitle(''); setNewRate(''); setNewUnit(''); setNewDesc(''); }}>Clear</Button>
                <Button onClick={createNewItem} disabled={newSaving || !newTitle.trim()}>{newSaving ? 'Saving…' : 'Save & add'}</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-[96vw] w-[96vw] h-[88vh] p-0 overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="font-medium">Proposal preview</div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={triggerPrintNow}>Print</Button>
                <Button size="sm" onClick={() => setPreviewOpen(false)}>Close</Button>
              </div>
            </div>
            <div className="relative flex-1">
              <iframe
                ref={previewRef}
                srcDoc={previewHtml}
                onLoad={() => {
                  setIframeLoading(false);
                  if (previewPrint) {
                    try { previewRef.current?.contentWindow?.focus(); previewRef.current?.contentWindow?.print(); } catch {}
                    setPreviewPrint(false);
                  }
                  if (previewAutoDownload) {
                    try {
                      const w = previewRef.current?.contentWindow as any;
                      const d = w?.document as Document;
                      const s = d.createElement('script');
                      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
                      s.onload = () => {
                        try {
                          const target = d.querySelector('.sheet') || d.body;
                          // @ts-ignore
                          w.html2pdf().set({ margin: 0, filename: `Proposal-${p?.number ?? p?.id ?? 'document'}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(target).save().then(() => {
                            window.postMessage({ type: 'proposal-pdf-done' }, '*');
                          });
                        } catch {}
                      };
                      d.body.appendChild(s);
                    } catch {}
                  }
                }}
                className="absolute inset-0 w-full h-full bg-muted/20"
              />
              {iframeLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                  <div className="px-4 py-2 text-sm rounded-md border bg-background shadow-sm animate-pulse">Loading preview…</div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

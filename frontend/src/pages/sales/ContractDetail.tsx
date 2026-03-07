import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { HMS_MODULES, FULL_PROPOSAL_TEMPLATE } from "../prospects/ProposalModules";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Download, Printer, FileText, Copy, Trash2, RefreshCw, Edit3, Wand2, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Code, Table as TableIcon, Layout, Percent, Calculator, Banknote, MessageSquare } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";
import { openWhatsappChat } from "@/lib/whatsapp";

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
  items?: Array<{ name?: string; description?: string; quantity?: number; rate?: number }>;
};

export default function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [row, setRow] = useState<ContractDoc | null>(null);
  const [projects, setProjects] = useState<ProjectDoc[]>([]);
  const [items, setItems] = useState<Array<{ name?: string; description?: string; quantity?: number; rate?: number }>>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [editorNote, setEditorNote] = useState("");
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [editorHtml, setEditorHtml] = useState<string>("");

  const openWhatsapp = (phoneRaw?: string, name?: string) => {
    const msg = `Hello ${name || ""}, I'm following up regarding our contract.`;
    const r = openWhatsappChat(phoneRaw, msg, { defaultCountryCode: "92" });
    if (!r.ok) toast.error("Invalid or missing phone number");
  };

  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

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
    if (!confirm("Create a new Invoice from this Contract?")) return;
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
    }
  };

  const insertHtml = (html: string) => {
    exec("insertHTML", html);
  };

  const toggleModule = (modId: string) => {
    setSelectedModules(prev => {
      const next = prev.includes(modId) ? prev.filter(id => id !== modId) : [...prev, modId];
      
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

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/contracts/${id}`, { headers: getAuthHeaders() });
        if (!r.ok) return;
        const d = await r.json();
        setRow(d);
        setItems(Array.isArray(d.items) ? d.items : []);
        setEditorHtml(d?.note || "");
        loadInvoices();
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

  const subTotal = useMemo(() => (items || []).reduce((a, it) => a + (Number(it.quantity || 0) * Number(it.rate || 0)), 0), [items]);
  const tax1Val = (Number(row?.tax1 || 0) / 100) * subTotal;
  const tax2Val = (Number(row?.tax2 || 0) / 100) * subTotal;
  const grandTotal = Math.max(0, subTotal + tax1Val + tax2Val - Number(row?.discount || 0));
  const calculatedAdvance = (grandTotal * Number(row?.paymentTermsPercentage || 0)) / 100;

  const money = (v: any) => Number(v || 0).toLocaleString();

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

  const saveEditorNote = async () => {
    try {
      const content = editorRef.current?.innerHTML || editorHtml || "";
      const res = await fetch(`${API_BASE}/api/contracts/${id}`, { method: "PATCH", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ note: content }) });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error || "Failed to save editor");
      setRow(d);
      toast.success("Contract updated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save editor");
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
    if (!confirm("Delete this item?")) return;
    const next = (items || []).filter((_, i) => i !== idx);
    await saveItems(next);
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

  const cloneContract = async () => {
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
    if (!confirm("Delete this contract?")) return;
    try {
      const r = await fetch(`${API_BASE}/api/contracts/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error || "Failed to delete");
      toast.success("Deleted");
      navigate("/sales/contracts");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete");
    }
  };

  const openPreview = () => {
    if (!id) return;
    navigate(`/sales/contracts/${id}/preview`);
  };

  const openPrintWindow = (mode: "print" | "pdf") => {
    const url = `${window.location.origin}/sales/contracts/${id}/preview?print=1&mode=${mode}`;
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (w) w.focus();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">CONTRACT: {row?.title || '-'}</h1>
          {row?.phone && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
              onClick={() => openWhatsapp(row.phone, row.client)}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              WhatsApp
            </Button>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">Actions <ChevronDown className="w-4 h-4 ml-2"/></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={openPreview}><FileText className="w-4 h-4 mr-2"/>Contract preview</DropdownMenuItem>
            <DropdownMenuItem onClick={openInvoice}>View invoice</DropdownMenuItem>
            <DropdownMenuItem onClick={() => openPrintWindow("pdf")}><Download className="w-4 h-4 mr-2"/>Download PDF</DropdownMenuItem>
            <DropdownMenuItem onClick={() => openPrintWindow("print")}><Printer className="w-4 h-4 mr-2"/>Print contract</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/sales/contracts/${id}/preview`).then(()=>toast.success("URL copied"))}><Copy className="w-4 h-4 mr-2"/>Contract URL</DropdownMenuItem>
            <DropdownMenuItem onClick={editDialogOpen}><Edit3 className="w-4 h-4 mr-2"/>Edit contract</DropdownMenuItem>
            <DropdownMenuItem onClick={cloneContract}>Clone contract</DropdownMenuItem>
            {STATUS_OPTIONS.map((o) => (
              <DropdownMenuItem key={o.value} onClick={() => patchStatus(o.value)}>Mark as {o.label}</DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={deleteContract} className="text-red-600 focus:text-red-600">Delete contract</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-0">
            <Tabs defaultValue="items">
              <TabsList>
                <TabsTrigger value="items">Contract Items</TabsTrigger>
                <TabsTrigger value="editor">Contract Editor</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>

              <TabsContent value="items">
                <Card className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">Client</div>
                      <div className="font-medium">{row?.client || '-'}</div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div>Contract date: {row?.contractDate ? new Date(row.contractDate).toISOString().slice(0,10) : '-'}</div>
                      <div>Valid until: {row?.validUntil ? new Date(row.validUntil).toISOString().slice(0,10) : '-'}</div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="grid gap-3 sm:grid-cols-4 lg:grid-cols-6 mb-6">
                      <div className="rounded-lg border p-3">
                        <div className="text-xs text-muted-foreground">Sub total</div>
                        <div className="mt-1 font-semibold">Rs.{money(subTotal)}</div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-xs text-muted-foreground">Discount</div>
                        <div className="mt-1 font-semibold text-rose-600">-Rs.{money(row?.discount)}</div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-xs text-muted-foreground">Tax Total</div>
                        <div className="mt-1 font-semibold">Rs.{money(tax1Val + tax2Val)}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{Number(row?.tax1||0) + Number(row?.tax2||0)}%</div>
                      </div>
                      <div className="rounded-lg border p-3 bg-primary/5 border-primary/20">
                        <div className="text-xs text-primary font-bold">Total Payable</div>
                        <div className="mt-1 font-bold text-primary">Rs.{money(grandTotal)}</div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-xs text-muted-foreground">Advance Needed</div>
                        <div className="mt-1 font-semibold text-amber-600">Rs.{money(calculatedAdvance)}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{row?.paymentTermsPercentage || 50}% Upfront</div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-xs text-muted-foreground">Valid until</div>
                        <div className="mt-1 font-semibold">{row?.validUntil ? new Date(row.validUntil).toISOString().slice(0,10) : '-'}</div>
                      </div>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead>Item</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Rate</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">No record found.</TableCell>
                          </TableRow>
                        ) : (
                          items.map((it, idx) => (
                            <TableRow key={idx}>
                              <TableCell>
                                <div className="font-medium">{it.name}</div>
                                {it.description ? (
                                  <div className="text-xs text-muted-foreground">{it.description}</div>
                                ) : null}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">{it.quantity}</TableCell>
                              <TableCell className="whitespace-nowrap">Rs.{Number(it.rate || 0).toLocaleString()}</TableCell>
                              <TableCell>
                                <div className="flex items-center justify-between gap-3">
                                  <div>Rs.{Number((Number(it.quantity||0) * Number(it.rate||0)) || 0).toLocaleString()}</div>
                                  <div className="flex items-center gap-2">
                                    <Button size="sm" variant="outline" onClick={() => openEditItem(idx)}>Edit</Button>
                                    <Button size="sm" variant="destructive" onClick={() => deleteItem(idx)}>Delete</Button>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>

                    <div className="mt-3">
                      <Button variant="outline" size="sm" onClick={openAddItem}>+ Add item</Button>
                      <Button variant="outline" size="sm" className="ml-2" onClick={() => window.location.reload()}><RefreshCw className="w-4 h-4 mr-2"/>Refresh</Button>
                    </div>

                    <div className="mt-4">
                      <div className="ml-auto w-full sm:w-80">
                        <div className="flex items-center justify-between py-1">
                          <div className="text-muted-foreground">Sub Total</div>
                          <div>Rs.{subTotal.toLocaleString()}</div>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <div className="text-muted-foreground">Tax ({row?.tax1 || 0}%)</div>
                          <div>Rs.{tax1Val.toLocaleString()}</div>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <div className="text-muted-foreground">Tax ({row?.tax2 || 0}%)</div>
                          <div>Rs.{tax2Val.toLocaleString()}</div>
                        </div>
                        <div className="mt-1 border rounded overflow-hidden text-sm">
                          <div className="flex">
                            <div className="flex-1 px-3 py-2 font-medium">Total</div>
                            <div className="px-3 py-2 bg-primary text-primary-foreground font-semibold">Rs.{grandTotal.toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="editor">
                <div className="grid gap-4 lg:grid-cols-4">
                  <Card className="p-4 lg:col-span-1 border-r">
                    <div className="text-sm font-semibold mb-4 flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-primary" />
                      Hospital Modules
                    </div>
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
                              <div key={mod.id} className="flex items-start gap-2 p-1.5 rounded-md hover:bg-muted/50 transition-colors">
                                <Checkbox 
                                  id={`contract-mod-${mod.id}`} 
                                  checked={selectedModules.includes(mod.id)}
                                  onCheckedChange={() => toggleModule(mod.id)}
                                  className="mt-1"
                                />
                                <Label htmlFor={`contract-mod-${mod.id}`} className="text-[11px] leading-tight cursor-pointer font-medium">
                                  {mod.title}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 text-[10px] text-muted-foreground italic">
                      Selecting modules will automatically populate the editor with professional descriptions.
                    </div>
                    <div className="mt-6 text-[10px] text-muted-foreground italic">
                      Selecting modules will automatically populate the editor with professional descriptions.
                    </div>
                  </Card>

                  <Card className="p-6 lg:col-span-3 flex flex-col h-full border rounded-lg bg-background overflow-hidden">
                    <div className="text-sm font-medium px-4 py-3 border-b bg-muted/30">Contract Editor</div>
                    
                    <div className="px-3 py-2 border-b flex items-center gap-1 flex-wrap sticky top-0 bg-background z-10">
                      <Button type="button" size="icon" variant="ghost" onClick={() => exec("bold")} title="Bold"><Bold className="w-4 h-4"/></Button>
                      <Button type="button" size="icon" variant="ghost" onClick={() => exec("italic")} title="Italic"><Italic className="w-4 h-4"/></Button>
                      <Button type="button" size="icon" variant="ghost" onClick={() => exec("underline")} title="Underline"><Underline className="w-4 h-4"/></Button>
                      <div className="w-px h-5 bg-border mx-1" />
                      <Button type="button" size="icon" variant="ghost" onClick={() => exec("justifyLeft")} title="Align Left"><AlignLeft className="w-4 h-4"/></Button>
                      <Button type="button" size="icon" variant="ghost" onClick={() => exec("justifyCenter")} title="Align Center"><AlignCenter className="w-4 h-4"/></Button>
                      <Button type="button" size="icon" variant="ghost" onClick={() => exec("justifyRight")} title="Align Right"><AlignRight className="w-4 h-4"/></Button>
                      <div className="w-px h-5 bg-border mx-1" />
                      <Button type="button" size="icon" variant="ghost" onClick={() => exec("insertUnorderedList")} title="Bullet List"><List className="w-4 h-4"/></Button>
                      <Button type="button" size="icon" variant="ghost" onClick={() => exec("insertOrderedList")} title="Numbered List"><ListOrdered className="w-4 h-4"/></Button>
                      <Button type="button" size="icon" variant="ghost" onClick={() => setTableDialogOpen(true)} title="Insert Table"><TableIcon className="w-4 h-4"/></Button>
                      <div className="h-4 w-[1px] bg-border mx-1" />
                      <select 
                        className="text-xs bg-transparent border rounded-sm px-1 outline-none cursor-pointer h-7"
                        onChange={(e) => exec("fontName", e.target.value)}
                        defaultValue="Poppins"
                      >
                        <option value="Poppins">Poppins</option>
                        <option value="Arial">Arial</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Courier New">Courier New</option>
                      </select>
                    </div>

                    <div className="flex-wrap items-center gap-2 px-4 py-2 border-b bg-muted/10 hidden sm:flex">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground mr-2">Insert:</span>
                      {[
                        { k: "{{client}}", t: "Client" },
                        { k: "{{project}}", t: "Project" },
                        { k: "{{contract_date}}", t: "Contract date" },
                        { k: "{{valid_until}}", t: "Valid until" },
                        { k: "{{subtotal}}", t: "Sub Total" },
                        { k: "{{tax1}}", t: "Tax1" },
                        { k: "{{tax2}}", t: "Tax2" },
                        { k: "{{total}}", t: "Total" },
                      ].map((b) => (
                        <Button key={b.k} type="button" size="sm" variant="outline" className="h-7 text-[10px] px-2" onClick={() => insertHtml(b.k)}>{b.t}</Button>
                      ))}
                    </div>

                    <div className="flex-1 overflow-auto bg-muted/20 p-4">
                      <div className="bg-white border rounded-md shadow-sm min-h-[500px]">
                        <div
                          ref={editorRef}
                          contentEditable
                          suppressContentEditableWarning
                          className="outline-none p-8 text-[14px] leading-relaxed min-h-[500px]"
                          onInput={() => setEditorHtml(editorRef.current?.innerHTML ?? "")}
                          dangerouslySetInnerHTML={{ __html: editorHtml || (row?.note || "<div style='color:#6b7280;'>Start writing contract terms...</div>") }}
                          style={{ fontFamily: '"Poppins", sans-serif' }}
                        />
                      </div>
                    </div>

                    <div className="mt-auto p-4 border-t bg-muted/30 flex items-center justify-between">
                      <div className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                        <Layout className="w-3 h-3" />
                        Default Font: Poppins
                      </div>
                      <Button onClick={saveEditorNote}>Save Contract Content</Button>
                    </div>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="preview">
                <Card className="p-2">
                  <iframe title="Contract Preview" src={`/sales/contracts/${id}/preview`} className="w-full h-[80vh] border-0 rounded" />
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Project</div>
              <div className="font-medium">{row?.projectId ? (projectTitle.get(row.projectId!) || '-') : '-'}</div>
              <div className="mt-4 text-sm text-muted-foreground">Status</div>
              <div className="mt-1">
                <Select value={String(row?.status || "draft").toLowerCase()} onValueChange={patchStatus}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">Note</div>
              <div className="text-sm whitespace-pre-wrap">{row?.note || '-'}</div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Linked Invoices</h3>
                <Button size="sm" onClick={createInvoiceFromContract}>Create Invoice from Contract</Button>
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
                  No invoices linked to this contract yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card className="p-6 text-sm text-muted-foreground">No tasks linked.</Card>
        </TabsContent>
      </Tabs>

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
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, Plus, FileText, DollarSign, Mail, Printer, Download, Copy, MessageCircle, X, Trash2, Building2, CreditCard, Landmark, Receipt, FolderPlus } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { Separator } from "@/components/ui/separator";
import { getAuthHeaders } from "@/lib/api/auth";
import { toast } from "@/components/ui/sonner";
import { API_BASE } from "@/lib/api/base";
import { cn } from "@/lib/utils";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { HealthspirePrintTemplate } from "@/components/print/HealthspirePrintTemplate";

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

const DEFAULT_PAYMENT_INFO = `A/c Title: Health Spire Pvt LTd
Bank No: 3130301000008524
IBAN: PK81FAYS3130301000008524
Faysal Bank Bahria Orchard
Branch Code 3139.

A/c Title: Health Spire Pvt LTd
Bank No: 02220113618930
IBAN: PK86MEZN0002220113618930
Meezan Bank College
Road Branch Lahore Code 0222`;

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const brand = {
    name: "HealthSpire",
    phone: "+92 312 7231875",
    email: "info@healthspire.org",
    website: "www.healthspire.org",
    address: "764D2 Shah Jelani Rd Township Lahore",
    logo: "/HealthSpire%20logo.png",
  };
  const [inv, setInv] = useState<any | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [openInfo, setOpenInfo] = useState(false);
  const [infoName, setInfoName] = useState("");
  const [infoAddress, setInfoAddress] = useState("");
  const [infoPhone, setInfoPhone] = useState("");
  const [infoEmail, setInfoEmail] = useState("");
  const [infoWebsite, setInfoWebsite] = useState("");
  const [infoLogo, setInfoLogo] = useState("");
  const [paymentInfo, setPaymentInfo] = useState("");
  const [openPay, setOpenPay] = useState(false);
  const [openTask, setOpenTask] = useState(false);
  const [openItem, setOpenItem] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Bank Transfer");
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0,10));
  const [payNote, setPayNote] = useState("");
  const [paymentEditingId, setPaymentEditingId] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskStatus, setTaskStatus] = useState("Pending");
  const [taskPriority, setTaskPriority] = useState("Medium");
  const [taskEditingId, setTaskEditingId] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [itemRate, setItemRate] = useState("0");
  const [itemUnit, setItemUnit] = useState("");
  const [itemTaxable, setItemTaxable] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  
  const [isEditingDiscount, setIsEditingDiscount] = useState(false);
  const [isEditingAdvance, setIsEditingAdvance] = useState(false);
  const [discountInput, setDiscountInput] = useState("0");
  const [advanceInput, setAdvanceInput] = useState("0");

  const [openProjectPrompt, setOpenProjectPrompt] = useState(false);
  const [projectDraftTitle, setProjectDraftTitle] = useState("");
  const [projectDraftPrice, setProjectDraftPrice] = useState<string>("");
  const [projectDraftStart, setProjectDraftStart] = useState<string>(new Date().toISOString().slice(0, 10));
  const [projectDraftDeadline, setProjectDraftDeadline] = useState<string>("");

  const invoiceDbId = useMemo(() => String(inv?._id || ""), [inv?._id]);
  const pdfTargetRef = useRef<HTMLDivElement | null>(null);

  const saveInvoiceField = async (field: string, value: number) => {
    if (!inv?._id) return;
    try {
      const r = await fetch(`${API_BASE}/api/invoices/${inv._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ [field]: value }),
      });
      if (r.ok) {
        const updated = await r.json();
        setInv(updated);
        toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} updated`);
      }
    } catch (e) {
      toast.error("Failed to update field");
    }
  };

  useEffect(() => {
    if (inv) {
      setDiscountInput(String(inv.discount || 0));
      setAdvanceInput(String(inv.advanceAmount || 0));
    }
  }, [inv]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const invRes = await fetch(`${API_BASE}/api/invoices/${id}`, { headers: getAuthHeaders() });
        if (!invRes.ok) return;
        const invRow = await invRes.json();
        setInv(invRow);

        const invId = String(invRow?._id || "");
        const [payRes, taskRes] = await Promise.all([
          fetch(`${API_BASE}/api/payments?invoiceId=${encodeURIComponent(invId)}`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/api/tasks?invoiceId=${encodeURIComponent(invId)}`, { headers: getAuthHeaders() }),
        ]);
        if (payRes.ok) setPayments(await payRes.json());
        if (taskRes.ok) setTasks(await taskRes.json());
      } catch {}
    })();
  }, [id]);

  useEffect(() => {
    if (inv) setItems(Array.isArray(inv.items) ? inv.items : []);
  }, [inv]);

  const formatClient = (c: any) => {
    if (!c) return "-";
    if (typeof c === "string") return c;
    return c.name || c.company || c.person || "-";
  };

  const subtotal = useMemo(() => (items || []).reduce((s: number, it: any) => s + (Number(it.quantity||0) * Number(it.rate||0)), 0), [items]);
  
  const invoiceTotal = useMemo(() => {
    const amount = Number(inv?.amount);
    if (Number.isFinite(amount) && amount > 0) return amount;
    const tax1 = (Number(inv?.tax1 ?? 0) / 100) * subtotal;
    const tax2 = (Number(inv?.tax2 ?? 0) / 100) * subtotal;
    const tds = (Number(inv?.tds ?? 0) / 100) * subtotal;
    const discount = Number(inv?.discount || 0);
    return Math.max(0, subtotal + tax1 + tax2 - tds - discount);
  }, [inv?.amount, inv?.discount, inv?.tax1, inv?.tax2, inv?.tds, subtotal]);

  const paymentsTotal = useMemo(() => (payments || []).reduce((s: number, p: any) => s + (Number(p.amount||0)), 0), [payments]);
  const balanceDue = useMemo(() => Math.max(0, invoiceTotal - paymentsTotal), [invoiceTotal, paymentsTotal]);

  const printItems = useMemo(() => {
    const list: any[] = Array.isArray(items) ? items : [];
    const mapped = list
      .map((it) => {
        const name = String(it?.name || it?.title || it?.item || "").trim();
        const desc = String(it?.description || "").trim();
        // If there is both a name and a description, combine them. 
        // If only description exists (e.g. from older records), use it.
        const description = (name && desc) ? `<strong>${name}</strong><br/>${desc}` : (desc || name || "-");
        const qty = it?.quantity ?? it?.qty ?? "";
        const price = it?.rate ?? "";
        const rowTotal = Number(qty || 0) * Number(price || 0);
        return {
          description: description,
          qty: qty === "" ? "" : String(qty).padStart(2, "0"),
          price: price === "" ? "" : Number(price).toLocaleString(),
          total: Number.isFinite(rowTotal) ? rowTotal.toLocaleString() : "",
        };
      })
      .filter((x) => x.description && x.description !== "-");
    return mapped;
  }, [items]);

  const printTotals = useMemo(() => {
    const rows: Array<{ label: string; value: string; bold?: boolean }> = [];
    const advance = Number(inv?.advanceAmount || 0);
    if (advance) rows.push({ label: "Advance Amount", value: `${advance.toLocaleString()} pkr` });
    const disc = Number(inv?.discount || 0);
    if (disc) rows.push({ label: "Discount", value: `-${disc.toLocaleString()} pkr` });
    rows.push({ label: "Invoice Total", value: `${Number(invoiceTotal || 0).toLocaleString()} pkr` });
    rows.push({ label: "Already Paid", value: `${Number(paymentsTotal || 0).toLocaleString()} pkr` });
    rows.push({ label: "Balance Due", value: `${Number(balanceDue || 0).toLocaleString()} pkr`, bold: true });
    return rows;
  }, [inv?.advanceAmount, inv?.discount, invoiceTotal, paymentsTotal, balanceDue]);

  const downloadPdfDirect = async () => {
    if (!id) return;
    try {
      const html2pdf = await loadHtml2Pdf();
      const el = pdfTargetRef.current;
      if (!el) return;
      const filename = `invoice-${String(inv?.number || id).trim()}.pdf`;
      await html2pdf()
        .set({
          margin: 0,
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        } as any)
        .from(el)
        .save();
    } catch (e: any) {
      toast.error("Failed to download PDF");
    }
  };

  const convertToContract = async () => {
    if (!inv?._id) return;
    if (!confirm("This will create a new Contract based on this Invoice. Continue?")) return;
    try {
      const payload = {
        title: `Contract for ${inv.number}`,
        client: formatClient(inv.client),
        clientId: inv.clientId,
        projectId: inv.projectId,
        amount: invoiceTotal,
        status: "draft",
        contractDate: new Date().toISOString(),
        items: items.map(it => ({
          name: it.name,
          description: it.description,
          quantity: it.quantity,
          rate: it.rate
        })),
        note: `Generated from Invoice #${inv.number}`
      };
      const r = await fetch(`${API_BASE}/api/contracts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        const d = await r.json();
        toast.success("Contract created successfully");
        navigate(`/sales/contracts/${d._id}`);
      } else {
        throw new Error("Failed to create contract");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to convert to contract");
    }
  };

  const openCreateProjectPrompt = () => {
    setProjectDraftTitle(`Project - Invoice ${inv?.number || ""}`);
    setProjectDraftPrice(String(invoiceTotal || 0));
    setProjectDraftStart(new Date().toISOString().slice(0, 10));
    setProjectDraftDeadline(inv?.dueDate ? new Date(inv.dueDate).toISOString().slice(0, 10) : "");
    setOpenProjectPrompt(true);
  };

  const createProjectFromInvoice = async () => {
    try {
      const payload = {
        title: projectDraftTitle,
        client: formatClient(inv?.client),
        clientId: inv?.clientId,
        price: Number(projectDraftPrice),
        start: new Date(projectDraftStart),
        deadline: new Date(projectDraftDeadline),
        status: "Open",
      };
      const r = await fetch(`${API_BASE}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        toast.success("Project created");
        setOpenProjectPrompt(false);
      }
    } catch (e) {
      toast.error("Failed to create project");
    }
  };

  const openAddItem = () => {
    setEditingItemIndex(null);
    setItemName(""); setItemDesc(""); setItemUnit(""); setItemQty("1"); setItemRate("0"); setItemTaxable(false);
    setOpenItem(true);
  };

  const openEditItem = (idx: number) => {
    const it = items[idx];
    setEditingItemIndex(idx);
    setItemName(it?.name || "");
    setItemDesc(it?.description || "");
    setItemQty(String(it?.quantity ?? 1));
    setItemRate(String(it?.rate ?? 0));
    setItemUnit(it?.unit || "");
    setItemTaxable(Boolean(it?.taxable));
    setOpenItem(true);
  };

  const saveItem = async () => {
    const it = {
      name: itemName,
      description: itemDesc,
      quantity: Number(itemQty)||0,
      rate: Number(itemRate)||0,
      unit: itemUnit,
      taxable: Boolean(itemTaxable),
      total: (Number(itemQty)||0) * (Number(itemRate)||0),
    };
    const next = [...items];
    if (editingItemIndex == null) next.push(it); else next[editingItemIndex] = it;
    
    if (!inv?._id) return;
    const r = await fetch(`${API_BASE}/api/invoices/${inv._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ items: next })
    });
    if (r.ok) {
      const updated = await r.json();
      setItems(next);
      setInv(updated);
      setOpenItem(false);
      // Reset form fields
      setItemName("");
      setItemDesc("");
      setItemQty("1");
      setItemRate("0");
      setEditingItemIndex(null);
    }
  };

  const savePayment = async () => {
    try {
      const payload = {
        invoiceId: invoiceDbId,
        amount: Number(payAmount),
        method: payMethod,
        date: new Date(payDate),
        note: payNote,
      };
      const r = await fetch(`${API_BASE}/api/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload)
      });
      if (r.ok) {
        setOpenPay(false);
        const pRes = await fetch(`${API_BASE}/api/payments?invoiceId=${encodeURIComponent(invoiceDbId)}`, { headers: getAuthHeaders() });
        if (pRes.ok) setPayments(await pRes.json());
      }
    } catch {}
  };

  if (!inv) return <div className="p-4 text-center">Loading registry…</div>;

  const viewBrand = {
    name: inv?.branding?.name || brand.name,
    phone: inv?.branding?.phone || brand.phone,
    email: inv?.branding?.email || brand.email,
    website: inv?.branding?.website || brand.website,
    address: inv?.branding?.address || brand.address,
    logo: inv?.branding?.logo || brand.logo,
  };

  const viewPaymentInfo = (inv?.paymentInfo || DEFAULT_PAYMENT_INFO);

  return (
    <div className="p-4 space-y-4 min-h-screen bg-slate-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton to="/invoices" />
          <h1 className="text-xl font-bold uppercase tracking-tight">Invoice Protocol #{inv.number}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setOpenPay(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white"><DollarSign className="w-4 h-4 mr-2"/>Add Payment</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" size="sm">Actions</Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/invoices/${id}/preview`)}><FileText className="w-4 h-4 mr-2"/>Preview</DropdownMenuItem>
                <DropdownMenuItem onClick={downloadPdfDirect}><Download className="w-4 h-4 mr-2"/>Download PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={async () => {
                  if (!inv?.number || !confirm("Are you sure you want to delete this invoice?")) return;
                  try {
                    const r = await fetch(`${API_BASE}/api/invoices/${encodeURIComponent(inv.number)}`, { method: 'DELETE', headers: getAuthHeaders() });
                    if (r.ok) {
                      toast.success("Invoice deleted");
                      navigate("/invoices");
                    } else {
                      const err = await r.json().catch(() => ({}));
                      toast.error(err.error || "Failed to delete invoice");
                    }
                  } catch { toast.error("Failed to delete invoice"); }
                }} className="text-destructive"><Trash2 className="w-4 h-4 mr-2"/>Delete</DropdownMenuItem>
                <DropdownMenuItem onClick={convertToContract}><Copy className="w-4 h-4 mr-2"/>Convert to Contract</DropdownMenuItem>
                <DropdownMenuItem onClick={openCreateProjectPrompt}><FolderPlus className="w-4 h-4 mr-2"/>Create Project</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOpenInfo(true)}><MoreHorizontal className="w-4 h-4 mr-2"/>Branding Info</DropdownMenuItem>
              </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList className="bg-white border border-slate-200">
          <TabsTrigger value="details">Protocol Details</TabsTrigger>
          <TabsTrigger value="payments">Payment Log</TabsTrigger>
          <TabsTrigger value="tasks">Linked Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <Card className="lg:col-span-8 border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <img src={viewBrand.logo} alt="Logo" className="h-16 w-auto rounded-lg" />
                    <div className="text-sm">
                      <div className="font-bold text-lg">{viewBrand.name}</div>
                      <div className="text-muted-foreground">{viewBrand.address}</div>
                      <div className="text-muted-foreground">{viewBrand.email} • {viewBrand.phone}</div>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge className="bg-indigo-600 text-white rounded-lg px-4 py-1 font-bold">INVOICE #{inv.number}</Badge>
                    <div className="text-xs text-muted-foreground pt-2">Issued: {inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : "-"}</div>
                    <div className="text-xs text-muted-foreground">Due: {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "-"}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div><Label className="text-[10px] uppercase font-bold text-slate-400">Bill To</Label><div className="font-bold text-slate-900">{formatClient(inv.client)}</div></div>
                  <div><Label className="text-[10px] uppercase font-bold text-slate-400">Project Protocol</Label><div className="font-bold text-slate-900">{inv.project || "UNASSIGNED"}</div></div>
                </div>

                <Table>
                  <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Registry Item</TableHead><TableHead>Qty</TableHead><TableHead>Rate</TableHead><TableHead className="text-right">Total</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {items.map((it, idx) => (
                      <TableRow key={idx} className="group">
                        <TableCell className="max-w-[300px]">
                          <div className="font-bold text-slate-900">{it.name}</div>
                          {it.description && (
                            <div 
                              className="text-[11px] text-slate-500 prose-sm mt-1" 
                              dangerouslySetInnerHTML={{ __html: it.description }} 
                            />
                          )}
                        </TableCell>
                        <TableCell className="font-mono">{it.quantity}</TableCell>
                        <TableCell className="font-mono text-xs">Rs.{Number(it.rate).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold text-slate-900">Rs.{(it.quantity * it.rate).toLocaleString()}</TableCell>
                        <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => openEditItem(idx)}><MoreHorizontal className="w-4 h-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                    <TableRow><TableCell colSpan={5}><Button variant="outline" size="sm" onClick={openAddItem} className="w-full border-dashed"><Plus className="w-4 h-4 mr-2"/>Add Item</Button></TableCell></TableRow>
                    
                    <TableRow className="hover:bg-transparent"><TableCell colSpan={3}></TableCell><TableCell className="font-medium text-slate-500">Sub Total</TableCell><TableCell className="text-right font-bold text-slate-900">Rs.{subtotal.toLocaleString()}</TableCell></TableRow>
                    
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={3}></TableCell>
                      <TableCell className="font-medium text-slate-500">Discount</TableCell>
                      <TableCell className="text-right">
                        {isEditingDiscount ? (
                          <Input type="number" value={discountInput} onChange={(e)=>setDiscountInput(e.target.value)} onBlur={()=>{setIsEditingDiscount(false); saveInvoiceField("discount", Number(discountInput))}} autoFocus className="w-24 h-8 text-right ml-auto" />
                        ) : (
                          <div className="cursor-pointer font-bold text-indigo-600 hover:underline" onClick={()=>setIsEditingDiscount(true)}>Rs.{Number(inv.discount || 0).toLocaleString()}</div>
                        )}
                      </TableCell>
                    </TableRow>

                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={3}></TableCell>
                      <TableCell className="font-medium text-slate-500">Advanced Amount</TableCell>
                      <TableCell className="text-right">
                        {isEditingAdvance ? (
                          <Input type="number" value={advanceInput} onChange={(e)=>setAdvanceInput(e.target.value)} onBlur={()=>{setIsEditingAdvance(false); saveInvoiceField("advanceAmount", Number(advanceInput))}} autoFocus className="w-24 h-8 text-right ml-auto" />
                        ) : (
                          <div className="cursor-pointer font-bold text-indigo-600 hover:underline" onClick={()=>setIsEditingAdvance(true)}>Rs.{Number(inv.advanceAmount || 0).toLocaleString()}</div>
                        )}
                      </TableCell>
                    </TableRow>

                    <TableRow className="hover:bg-transparent border-t-2"><TableCell colSpan={3}></TableCell><TableCell className="font-bold text-slate-900">Total</TableCell><TableCell className="text-right font-black text-xl text-slate-900">Rs.{invoiceTotal.toLocaleString()}</TableCell></TableRow>
                    <TableRow className="hover:bg-transparent"><TableCell colSpan={3}></TableCell><TableCell className="font-bold text-rose-600">Balance Due</TableCell><TableCell className="text-right font-black text-xl text-rose-600 underline">Rs.{balanceDue.toLocaleString()}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="lg:col-span-4 border-slate-200 shadow-sm self-start overflow-hidden rounded-xl bg-white">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <CardTitle className="text-[10px] uppercase tracking-widest font-bold text-slate-500 flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5" />
                  Payment Protocol
                </CardTitle>
                <Badge variant="outline" className={cn(
                  "text-[9px] font-bold px-2 py-0 h-5 border-0 bg-transparent",
                  inv.status === 'Paid' ? 'text-emerald-600' : 'text-rose-600'
                )}>
                  {inv.status}
                </Badge>
              </div>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-5">
                  {viewPaymentInfo.split('\n\n').map((block, bIdx) => {
                    const lines = block.split('\n');
                    const title = lines[0]?.split(':')[1]?.trim() || "Account";
                    return (
                      <div key={bIdx} className="space-y-2">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{title}</div>
                        <div className="space-y-1">
                          {lines.slice(1).map((line, lIdx) => {
                            const [label, ...valueParts] = line.split(':');
                            const value = valueParts.join(':').trim();
                            if (!label || !value) return null;
                            return (
                              <div key={lIdx} className="flex justify-between text-[11px] leading-relaxed">
                                <span className="text-slate-400">{label.trim()}</span>
                                <span className="text-slate-700 font-medium">{value}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Total Paid</span>
                    <span className="font-semibold text-emerald-600">Rs.{paymentsTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-1">
                    <span className="font-bold text-slate-900">Balance Due</span>
                    <span className="font-bold text-rose-600">Rs.{balanceDue.toLocaleString()}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    className="w-full mt-2 h-9 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border border-indigo-100 rounded-lg"
                    onClick={() => setOpenPay(true)}
                  >
                    <DollarSign className="w-3.5 h-3.5 mr-2" />
                    Record Payment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payments">
          <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle>Payment History</CardTitle></CardHeader><CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Method</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {payments.map((p, i) => (<TableRow key={i}><TableCell>{new Date(p.date).toLocaleDateString()}</TableCell><TableCell>{p.method}</TableCell><TableCell className="text-right font-bold text-emerald-600">Rs.{Number(p.amount).toLocaleString()}</TableCell></TableRow>))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Item Dialog - Improved Design */}
      <Dialog open={openItem} onOpenChange={setOpenItem}>
        <DialogContent className="max-w-xl bg-white border-0 shadow-2xl rounded-2xl p-0 overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 px-6 py-5">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5" />
                {editingItemIndex === null ? "Add Registry Item" : "Edit Registry Item"}
              </DialogTitle>
              <p className="text-indigo-100 text-sm">Add line items to your invoice protocol</p>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-6">
            {/* Item Name */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                Item Title
              </Label>
              <Input 
                value={itemName} 
                onChange={(e) => setItemName(e.target.value)} 
                placeholder="Enter item name..."
                className="h-11 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg"
              />
            </div>

            {/* Rich Description */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                Description
              </Label>
              <div className="border border-slate-200 rounded-lg overflow-hidden focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 shadow-sm bg-white">
                <ReactQuill 
                  theme="snow" 
                  value={itemDesc} 
                  onChange={setItemDesc} 
                  modules={{ 
                    toolbar: [
                      ['bold', 'italic', 'underline'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      ['clean']
                    ] 
                  }}
                  className="min-h-[200px] [&_.ql-container]:h-[200px] [&_.ql-editor]:text-base"
                />
              </div>
            </div>

            {/* Quantity and Rate Row */}
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Quantity
                </Label>
                <div className="relative">
                  <Input 
                    type="number" 
                    value={itemQty} 
                    onChange={(e) => setItemQty(e.target.value)}
                    placeholder="1"
                    min="0"
                    step="0.01"
                    className="h-12 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-lg pl-10 text-lg font-semibold"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Plus className="w-4 h-4" />
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Rate (PKR)
                </Label>
                <div className="relative">
                  <Input 
                    type="number" 
                    value={itemRate} 
                    onChange={(e) => setItemRate(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="h-12 border-slate-200 focus:border-amber-500 focus:ring-amber-500 rounded-lg pl-10 text-lg font-semibold"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    Rs
                  </span>
                </div>
              </div>
            </div>

            {/* Live Preview Card */}
            <div className="bg-gradient-to-r from-slate-50 to-indigo-50 rounded-xl p-4 border border-indigo-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span>Preview:</span>
                  <span className="font-medium">{itemQty || 0} × Rs {Number(itemRate || 0).toLocaleString()}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500">Line Total</span>
                  <div className="text-2xl font-bold text-indigo-600">
                    Rs {((Number(itemQty) || 0) * (Number(itemRate) || 0)).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => setOpenItem(false)}
              className="h-11 px-6 rounded-xl border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-700"
            >
              Cancel
            </Button>
            <Button 
              onClick={saveItem} 
              disabled={!itemName.trim()}
              className="h-11 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 mr-2" />
              {editingItemIndex === null ? "Add Item" : "Update Item"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openProjectPrompt} onOpenChange={setOpenProjectPrompt}>
        <DialogContent className="bg-card max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Start a project for this invoice?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="text-muted-foreground">Create a project linked to this invoice so you can track tasks, milestones and deadline.</div>
            <div className="grid gap-3">
              <div className="space-y-1">
                <Label>Project title</Label>
                <Input value={projectDraftTitle} onChange={(e)=>setProjectDraftTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Price</Label>
                  <Input type="number" value={projectDraftPrice} onChange={(e)=>setProjectDraftPrice(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Start</Label>
                  <DatePicker value={projectDraftStart} onChange={setProjectDraftStart} placeholder="Pick start date" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Deadline</Label>
                <DatePicker value={projectDraftDeadline} onChange={setProjectDraftDeadline} placeholder="Pick deadline" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenProjectPrompt(false)}>Not now</Button>
            <Button onClick={createProjectFromInvoice}>Create project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="hidden">
        <div ref={pdfTargetRef}><HealthspirePrintTemplate title="Invoice" brand={{ name: viewBrand.name, email: viewBrand.email, phone: viewBrand.phone, website: viewBrand.website, address: viewBrand.address, logoSrc: viewBrand.logo }} invoiceToLabel="Bill To" invoiceToValue={formatClient(inv.client)} numberLabel="Invoice #" numberValue={inv.number} dateLabel="Date" dateValue={inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : "-"} items={printItems} paymentInformation={viewPaymentInfo} totals={printTotals} /></div>
      </div>
    </div>
  );
}

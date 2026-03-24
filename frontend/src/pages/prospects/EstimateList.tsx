import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Combobox } from "@/components/ui/combobox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Search, Plus, RefreshCw, ChevronLeft, ChevronRight, MoreVertical, Download, Eye, Trash2, FileText, Pencil, Receipt, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

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

type Row = {
  id: string;
  number: string;
  client: string;
  clientId?: string;
  estimateDate: string;
  validUntil?: string;
  amount: number;
  status: "Draft"|"Sent"|"Accepted"|"Declined";
  approvalStatus?: "Pending"|"Approved"|"Rejected";
  createdBy?: any;
  advancedAmount: number;
  tax?: number;
  tax2?: number;
  note?: string;
  items?: any[];
};

export default function EstimateList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("-");
  const [openAdd, setOpenAdd] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  
  // add form state
  const [estimateDate, setEstimateDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [client, setClient] = useState("");
  const [clientOptions, setClientOptions] = useState<string[]>([]);
  const [tax, setTax] = useState<string>("-");
  const [tax2, setTax2] = useState<string>("-");
  const [note, setNote] = useState("");
  const [advancedAmount, setAdvancedAmount] = useState<string>("");

  // Edit dialog state
  const [openEdit, setOpenEdit] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState<Row | null>(null);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [editTax, setEditTax] = useState<string>("-");
  const [editTax2, setEditTax2] = useState<string>("-");
  const [editAdvancedAmount, setEditAdvancedAmount] = useState<string>("");
  const [editNote, setEditNote] = useState("");
  const [editValidUntil, setEditValidUntil] = useState("");
  const [editStatus, setEditStatus] = useState<string>("Draft");

  // Item edit state
  const [openItem, setOpenItem] = useState(false);
  const [itemName, setItemName] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [itemRate, setItemRate] = useState("0");
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  // PDF ref
  const pdfTargetRef = useRef<HTMLDivElement | null>(null);
  const [pdfEstimate, setPdfEstimate] = useState<Row | null>(null);

  const urlClientId = useMemo(() => {
    const sp = new URLSearchParams(location.search || "");
    return String(sp.get("clientId") || "").trim();
  }, [location.search]);

  const urlAdd = useMemo(() => {
    const sp = new URLSearchParams(location.search || "");
    const v = String(sp.get("add") || "").trim();
    return v === "1" || v.toLowerCase() === "true";
  }, [location.search]);

  const load = async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (query) sp.set("q", query);
      if (status && status !== "-") sp.set("status", status);
      if (urlClientId) sp.set("clientId", urlClientId);
      const url = `${API_BASE}/api/estimates${sp.toString() ? `?${sp.toString()}` : ""}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      const mapped: Row[] = (Array.isArray(data) ? data : []).map((d:any)=> ({
        id: String(d._id||""),
        number: d.number || "-",
        client: d.client || "-",
        clientId: d.clientId,
        estimateDate: d.estimateDate ? new Date(d.estimateDate).toISOString().slice(0,10) : "-",
        validUntil: d.validUntil ? new Date(d.validUntil).toISOString().slice(0,10) : undefined,
        amount: Number(d.amount||0),
        status: (d.status as any) || "Draft",
        approvalStatus: (d.approvalStatus as any) || "Approved",
        createdBy: d.createdBy,
        advancedAmount: Number(d.advancedAmount||0),
        tax: d.tax,
        tax2: d.tax2,
        note: d.note,
        items: d.items || [],
      }));
      setRows(mapped);
    } catch {} finally { setLoading(false); }
  };

  const convertToInvoice = async (est: Row) => {
    if (!confirm("Convert this estimate into an invoice?")) return;
    try {
      const r = await fetch(`${API_BASE}/api/estimates/${est.id}/convert-to-invoice`, { method: "POST", headers: getAuthHeaders() });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error || "Failed to create invoice");
      toast.success("Invoice created");
      if (d?._id) navigate(`/invoices/${d._id}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to create invoice");
    }
  };

  const markStatus = async (est: Row, nextStatus: "Accepted" | "Declined") => {
    try {
      const r = await fetch(`${API_BASE}/api/estimates/${est.id}`, {
        method: "PATCH",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status: nextStatus }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error || "Failed to update status");
      setRows((p) => p.map((x) => (x.id === est.id ? { ...x, status: nextStatus } : x)));
      toast.success("Status updated");
    } catch (e: any) {
      toast.error(e.message || "Failed to update status");
    }
  };

  useEffect(() => { load(); }, [query, status, urlClientId]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/clients`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        const names: string[] = (Array.isArray(data) ? data : []).map((c:any)=> c.company || c.person).filter(Boolean);
        setClientOptions(names);
        if (!client && names.length) setClient(names[0]);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!urlClientId) return;
      try {
        const res = await fetch(`${API_BASE}/api/clients/${encodeURIComponent(urlClientId)}`, { headers: getAuthHeaders() });
        const row = await res.json().catch(() => null);
        if (!res.ok) return;
        const name = String(row?.company || row?.person || "").trim();
        if (name) setClient(name);
      } catch {}
    })();
  }, [urlClientId]);

  useEffect(() => { if (!urlAdd) return; setOpenAdd(true); }, [urlAdd]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/estimates/${id}`, { method: "PATCH", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ status: newStatus }) });
      if (res.ok) {
        setRows((p) => p.map((x) => (x.id === id ? { ...x, status: newStatus as any } : x)));
        toast.success("Status updated");
      }
    } catch {}
  };

  const openEditDialog = async (r: Row) => {
    try {
      const res = await fetch(`${API_BASE}/api/estimates/${r.id}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch estimate");
      const d = await res.json();
      setEditingEstimate({ ...r, items: d.items || [] });
      setEditItems(d.items || []);
      setEditTax(String(d.tax || "-"));
      setEditTax2(String(d.tax2 || "-"));
      setEditAdvancedAmount(String(d.advancedAmount || ""));
      setEditNote(d.note || "");
      setEditValidUntil(d.validUntil ? new Date(d.validUntil).toISOString().slice(0,10) : "");
      setEditStatus(d.status || "Draft");
      setOpenEdit(true);
    } catch (e: any) {
      toast.error(e.message || "Failed to load estimate");
    }
  };

  const saveEdit = async () => {
    if (!editingEstimate) return;
    try {
      const payload = {
        tax: editTax === "-" ? 0 : Number(editTax),
        tax2: editTax2 === "-" ? 0 : Number(editTax2),
        advancedAmount: editAdvancedAmount ? Number(editAdvancedAmount) : 0,
        note: editNote || undefined,
        validUntil: editValidUntil ? new Date(editValidUntil) : undefined,
        status: editStatus,
        items: editItems,
      };
      const res = await fetch(`${API_BASE}/api/estimates/${editingEstimate.id}`, { method: "PATCH", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Failed to update estimate");
      toast.success("Estimate updated");
      setOpenEdit(false);
      await load();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    }
  };

  // Item management
  const openAddItem = () => {
    setEditingItemIndex(null);
    setItemName("");
    setItemDesc("");
    setItemQty("1");
    setItemRate("0");
    setOpenItem(true);
  };

  const openEditItem = (idx: number) => {
    const it = editItems[idx];
    setEditingItemIndex(idx);
    setItemName(it?.name || "");
    setItemDesc(it?.description || "");
    setItemQty(String(it?.quantity ?? 1));
    setItemRate(String(it?.rate ?? 0));
    setOpenItem(true);
  };

  const saveItem = () => {
    const it = {
      name: itemName,
      description: itemDesc,
      quantity: Number(itemQty) || 0,
      rate: Number(itemRate) || 0,
      total: (Number(itemQty) || 0) * (Number(itemRate) || 0),
    };
    const next = [...editItems];
    if (editingItemIndex == null) next.push(it); else next[editingItemIndex] = it;
    setEditItems(next);
    setOpenItem(false);
  };

  const deleteItem = (idx: number) => {
    const next = editItems.filter((_, i) => i !== idx);
    setEditItems(next);
  };

  const downloadPdf = async (est: Row) => {
    try {
      const res = await fetch(`${API_BASE}/api/estimates/${est.id}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch estimate");
      const fullEst = await res.json();
      setPdfEstimate({ ...est, items: fullEst.items || [] });
      setTimeout(async () => {
        try {
          const html2pdf = await loadHtml2Pdf();
          const el = pdfTargetRef.current;
          if (!el) return;
          const filename = `estimate-${est.number}.pdf`;
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
      }, 500);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate PDF");
    }
  };

  const save = async () => {
    try {
      const payload: any = {
        client,
        clientId: urlClientId || undefined,
        estimateDate: estimateDate ? new Date(estimateDate) : undefined,
        validUntil: validUntil ? new Date(validUntil) : undefined,
        tax: tax === "-" ? 0 : Number(tax),
        tax2: tax2 === "-" ? 0 : Number(tax2),
        note: note || undefined,
        advancedAmount: advancedAmount ? Number(advancedAmount) : 0,
        items: [],
      };
      const res = await fetch(`${API_BASE}/api/estimates`, { method: "POST", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
      if (!res.ok) { const e = await res.json().catch(()=>null); toast.error(e?.error || "Failed to add estimate"); return; }
      const d = await res.json();
      const row: Row = { id: String(d._id||""), number: d.number || "-", client: d.client || client || "-", estimateDate: d.estimateDate ? new Date(d.estimateDate).toISOString().slice(0,10) : (estimateDate || "-"), amount: Number(d.amount||0), status: (d.status as any) || "Draft", approvalStatus: (d.approvalStatus as any) || "Approved", advancedAmount: Number(d.advancedAmount||0) };
      setRows((prev)=> [row, ...prev]);
      setOpenAdd(false);
      toast.success("Estimate created");
      if (d?._id) navigate(`/prospects/estimates/${String(d._id)}`);
    } catch {}
  };

  const convertToProposal = async (est: Row) => {
    if (!confirm("This will create a new Proposal based on this Estimate. Continue?")) return;
    try {
      // Fetch the full estimate details to get items
      const resEst = await fetch(`${API_BASE}/api/estimates/${est.id}`, { headers: getAuthHeaders() });
      if (!resEst.ok) throw new Error("Failed to fetch estimate details");
      const fullEst = await resEst.json();

      const payload = {
        title: `Proposal for ${est.number}`,
        client: est.client,
        amount: est.amount,
        status: "draft",
        proposalDate: new Date().toISOString(),
        items: (fullEst.items || []).map((it: any) => ({
          name: it.name || it.title || "Item",
          qty: it.quantity || it.qty || 1,
          rate: it.rate || 0
        })),
        note: `Generated from Estimate #${est.number}`
      };
      const r = await fetch(`${API_BASE}/api/proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        const d = await r.json();
        toast.success("Proposal created successfully");
        navigate(`/prospects/proposals/${d._id}`);
      } else {
        throw new Error("Failed to create proposal");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to convert to proposal");
    }
  };

  const deleteEstimate = async (estimateId: string) => {
    if (!confirm("Delete this estimate?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/estimates/${estimateId}`, { method: "DELETE", headers: getAuthHeaders() });
      if (!res.ok) return toast.error("Failed to delete estimate");
      setRows((prev) => prev.filter((r) => r.id !== estimateId));
      toast.success("Estimate deleted");
    } catch {}
  };

  const itemsSubtotal = useMemo(() => editItems.reduce((s, it) => s + (Number(it.quantity||0) * Number(it.rate||0)), 0), [editItems]);
  const editTotal = useMemo(() => {
    const tax1 = (Number(editTax === "-" ? 0 : editTax) / 100) * itemsSubtotal;
    const tax2 = (Number(editTax2 === "-" ? 0 : editTax2) / 100) * itemsSubtotal;
    const advance = Number(editAdvancedAmount || 0);
    return Math.max(0, itemsSubtotal + tax1 + tax2 - advance);
  }, [itemsSubtotal, editTax, editTax2, editAdvancedAmount]);

  // Print items helper
  const printItems = useMemo(() => {
    if (!pdfEstimate) return [];
    const list = pdfEstimate.items || [];
    return list.map((it: any) => {
      const name = String(it?.name || it?.title || "").trim();
      const desc = String(it?.description || "").trim();
      const description = (name && desc) ? `<strong>${name}</strong><br/>${desc}` : (desc || name || "-");
      const qty = it?.quantity ?? it?.qty ?? "";
      const price = it?.rate ?? "";
      const rowTotal = Number(qty || 0) * Number(price || 0);
      return {
        description,
        qty: qty === "" ? "" : String(qty).padStart(2, "0"),
        price: price === "" ? "" : Number(price).toLocaleString(),
        total: Number.isFinite(rowTotal) ? rowTotal.toLocaleString() : "",
      };
    }).filter((x: any) => x.description && x.description !== "-");
  }, [pdfEstimate, editTotal]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Hidden PDF template */}
      {pdfEstimate && (
        <div className="fixed -top-[9999px] left-0" ref={pdfTargetRef}>
          <div className="p-8 bg-white" style={{ width: "210mm", minHeight: "297mm" }}>
            <div className="border-2 border-gray-800 p-6">
              <div className="text-center font-bold text-xl mb-4">ESTIMATE #{pdfEstimate.number}</div>
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div><strong>Client:</strong> {pdfEstimate.client}</div>
                <div><strong>Date:</strong> {pdfEstimate.estimateDate}</div>
                <div><strong>Status:</strong> {pdfEstimate.status}</div>
                <div><strong>Valid Until:</strong> {pdfEstimate.validUntil || "-"}</div>
              </div>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">Description</th>
                    <th className="border p-2 text-center">Qty</th>
                    <th className="border p-2 text-right">Rate</th>
                    <th className="border p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {printItems.map((it: any, idx: number) => (
                    <tr key={idx}>
                      <td className="border p-2" dangerouslySetInnerHTML={{ __html: it.description }} />
                      <td className="border p-2 text-center">{it.qty}</td>
                      <td className="border p-2 text-right">{it.price}</td>
                      <td className="border p-2 text-right">{it.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 text-right font-bold text-lg">
                Total: Rs.{editTotal.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-sm text-muted-foreground">Estimates</h1>
        <div className="flex items-center gap-2">
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-2"/>Add estimate</Button>
            </DialogTrigger>
            <DialogContent className="bg-card max-w-2xl">
              <DialogHeader><DialogTitle>Add estimate</DialogTitle></DialogHeader>
              <div className="grid gap-3 sm:grid-cols-12">
                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Estimate date</div>
                <div className="sm:col-span-9"><DatePicker value={estimateDate} onChange={setEstimateDate} placeholder="Pick estimate date" /></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Valid until</div>
                <div className="sm:col-span-9"><DatePicker value={validUntil} onChange={setValidUntil} placeholder="Pick valid until" /></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Client</div>
                <div className="sm:col-span-9">
                  <Combobox
                    options={clientOptions.map((n) => ({ value: n, label: n }))}
                    value={client}
                    onValueChange={setClient}
                    placeholder="Select client"
                  />
                </div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">TAX</div>
                <div className="sm:col-span-9">
                  <Select value={tax} onValueChange={setTax}>
                    <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-">-</SelectItem>
                      <SelectItem value="10">Tax (10%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Second TAX</div>
                <div className="sm:col-span-9">
                  <Select value={tax2} onValueChange={setTax2}>
                    <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-">-</SelectItem>
                      <SelectItem value="10">Tax (10%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Note</div>
                <div className="sm:col-span-9"><Textarea placeholder="Note" className="min-h-[96px]" value={note} onChange={(e)=>setNote(e.target.value)} /></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Advanced Amount</div>
                <div className="sm:col-span-9"><Input placeholder="Advanced Amount" value={advancedAmount} onChange={(e)=>setAdvancedAmount(e.target.value)} /></div>
              </div>
              <DialogFooter>
                <div className="w-full flex items-center justify-end gap-2">
                  <Button variant="outline" onClick={()=>setOpenAdd(false)}>Close</Button>
                  <Button onClick={save}>Save</Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-40"><SelectValue placeholder="- Status -" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">- Status -</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Sent">Sent</SelectItem>
                  <SelectItem value="Accepted">Accepted</SelectItem>
                  <SelectItem value="Declined">Declined</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">Monthly</Button>
              <Button variant="outline" size="sm">Yearly</Button>
              <Button variant="outline" size="sm">Custom</Button>
              <Button variant="outline" size="sm">Dynamic</Button>
              <div className="inline-flex items-center gap-2">
                <Button variant="outline" size="icon"><ChevronLeft className="w-4 h-4"/></Button>
                <span className="text-sm text-muted-foreground">December 2025</span>
                <Button variant="outline" size="icon"><ChevronRight className="w-4 h-4"/></Button>
                <Button variant="outline" size="icon" onClick={load}><RefreshCw className="w-4 h-4"/></Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">Excel</Button>
              <Button variant="outline" size="sm">Print</Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search" value={query} onChange={(e)=>setQuery(e.target.value)} className="pl-9 w-56" />
              </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Estimate</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Estimate date</TableHead>
                <TableHead>Created by</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Advanced Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    {loading ? "Loading..." : "No record found."}
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {rows.map((r)=> (
                    <TableRow key={r.id}>
                      <TableCell className="text-primary underline cursor-pointer" onClick={()=>navigate(`/prospects/estimates/${r.id}`)}>Estimate: {r.number}</TableCell>
                      <TableCell className="text-primary underline cursor-pointer">{r.client}</TableCell>
                      <TableCell>{r.estimateDate}</TableCell>
                      <TableCell>{String(r?.createdBy?.name || r?.createdBy?.email || "-")}</TableCell>
                      <TableCell>Rs.{r.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Select value={r.status} onValueChange={(v)=>updateStatus(r.id, v)}>
                          <SelectTrigger className="w-[130px] h-8">
                            <Badge variant={r.status === "Accepted" ? "default" : r.status === "Declined" ? "destructive" : "outline"} className="text-xs">
                              {r.status}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Draft">Draft</SelectItem>
                            <SelectItem value="Sent">Sent</SelectItem>
                            <SelectItem value="Accepted">Accepted</SelectItem>
                            <SelectItem value="Declined">Declined</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">{r.advancedAmount ? `Rs.${r.advancedAmount}` : "-"}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/prospects/estimates/${r.id}/preview`)}>
                              <Eye className="w-4 h-4 mr-2"/>Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(r)}>
                              <Pencil className="w-4 h-4 mr-2"/>Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => convertToProposal(r)}>
                              <FileText className="w-4 h-4 mr-2"/>Convert to Proposal
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => convertToInvoice(r)}>
                              <Receipt className="w-4 h-4 mr-2"/>Convert to Invoice
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => markStatus(r, "Accepted")}>
                              <ThumbsUp className="w-4 h-4 mr-2"/>Mark Accepted (auto invoice)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => markStatus(r, "Declined")}>
                              <ThumbsDown className="w-4 h-4 mr-2"/>Mark Declined
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => downloadPdf(r)}>
                              <Download className="w-4 h-4 mr-2"/>Download PDF
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => deleteEstimate(r.id)} className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2"/>Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Estimate Dialog */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="bg-card max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Estimate {editingEstimate?.number}</DialogTitle></DialogHeader>
          
          <div className="space-y-6">
            {/* Status and Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Sent">Sent</SelectItem>
                    <SelectItem value="Accepted">Accepted</SelectItem>
                    <SelectItem value="Declined">Declined</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valid Until</Label>
                <DatePicker value={editValidUntil} onChange={setEditValidUntil} placeholder="Pick valid until" />
              </div>
              <div className="space-y-2">
                <Label>Advanced Amount</Label>
                <Input type="number" value={editAdvancedAmount} onChange={(e) => setEditAdvancedAmount(e.target.value)} placeholder="0" />
              </div>
            </div>

            {/* Taxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>TAX</Label>
                <Select value={editTax} onValueChange={setEditTax}>
                  <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-">-</SelectItem>
                    <SelectItem value="10">Tax (10%)</SelectItem>
                    <SelectItem value="16">Tax (16%)</SelectItem>
                    <SelectItem value="18">Tax (18%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Second TAX</Label>
                <Select value={editTax2} onValueChange={setEditTax2}>
                  <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-">-</SelectItem>
                    <SelectItem value="10">Tax (10%)</SelectItem>
                    <SelectItem value="5">Tax (5%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="Add note..." rows={3} />
            </div>

            {/* Items Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Line Items</Label>
                <Button variant="outline" size="sm" onClick={openAddItem}>
                  <Plus className="w-4 h-4 mr-2"/>Add Item
                </Button>
              </div>
              
              {editItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg">
                  No items yet. Click "Add Item" to add line items.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editItems.map((it, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <div className="font-medium">{it.name}</div>
                          {it.description && (
                            <div className="text-xs text-muted-foreground prose-sm mt-1" dangerouslySetInnerHTML={{ __html: it.description }} />
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">{it.quantity}</TableCell>
                        <TableCell className="text-right font-mono">Rs.{Number(it.rate).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono font-medium">Rs.{(it.quantity * it.rate).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditItem(idx)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteItem(idx)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2">
                      <TableCell colSpan={3} className="text-right font-medium">Subtotal</TableCell>
                      <TableCell className="text-right font-bold">Rs.{itemsSubtotal.toLocaleString()}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                    {Number(editAdvancedAmount || 0) > 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-right font-medium text-muted-foreground">Advanced Amount</TableCell>
                        <TableCell className="text-right font-medium text-muted-foreground">- Rs.{Number(editAdvancedAmount).toLocaleString()}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-bold text-lg">Total</TableCell>
                      <TableCell className="text-right font-bold text-lg text-primary">Rs.{editTotal.toLocaleString()}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setOpenEdit(false)}>Close</Button>
            <Button onClick={saveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Item Dialog */}
      <Dialog open={openItem} onOpenChange={setOpenItem}>
        <DialogContent className="bg-card max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItemIndex === null ? "Add Item" : "Edit Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Item Name</Label>
              <Input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="Enter item name" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <div className="border rounded-md overflow-hidden">
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
                  className="min-h-[120px]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" value={itemQty} onChange={(e) => setItemQty(e.target.value)} min="0" step="0.01" />
              </div>
              <div className="space-y-2">
                <Label>Rate (Rs)</Label>
                <Input type="number" value={itemRate} onChange={(e) => setItemRate(e.target.value)} min="0" step="0.01" />
              </div>
            </div>
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Line Total</span>
                <span className="text-lg font-bold">Rs.{((Number(itemQty) || 0) * (Number(itemRate) || 0)).toLocaleString()}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenItem(false)}>Cancel</Button>
            <Button onClick={saveItem}>{editingItemIndex === null ? "Add Item" : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

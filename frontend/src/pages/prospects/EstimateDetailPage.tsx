import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { CheckCircle, Download, Eye, FileText, MoreHorizontal, Pencil, Plus, Receipt, ThumbsDown, ThumbsUp, Trash2, XCircle, Printer, AlertCircle, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/utils/roleAccess";

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

type EstimateDoc = {
  _id: string;
  number?: string;
  client?: string;
  clientId?: string;
  estimateDate?: string;
  validUntil?: string;
  status?: "Draft" | "Sent" | "Accepted" | "Declined";
  approvalStatus?: "Pending" | "Approved" | "Rejected";
  tax?: number;
  tax2?: number;
  discount?: number;
  note?: string;
  advancedAmount?: number;
  amount?: number;
  items?: Array<{ item?: string; name?: string; description?: string; quantity?: number; rate?: number; total?: number }>;
};

export default function EstimateDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [est, setEst] = useState<EstimateDoc | null>(null);
  const [items, setItems] = useState<any[]>([]);

  const [status, setStatus] = useState<string>("Draft");
  const [validUntil, setValidUntil] = useState<string>("");
  const [tax, setTax] = useState<string>("0");
  const [tax2, setTax2] = useState<string>("0");
  const [discount, setDiscount] = useState<string>("0");
  const [advancedAmount, setAdvancedAmount] = useState<string>("0");
  const [note, setNote] = useState<string>("");

  const [openItem, setOpenItem] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [itemTitle, setItemTitle] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [itemRate, setItemRate] = useState("0");

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

  const pdfTargetRef = useRef<HTMLDivElement | null>(null);

  const fetchEstimate = async () => {
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE}/api/estimates/${id}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to load estimate");
      const d = (await res.json()) as EstimateDoc;
      setEst(d);
      const list = Array.isArray(d.items) ? d.items : [];
      setItems(list);
      setStatus(String(d.status || "Draft"));
      setValidUntil(d.validUntil ? new Date(d.validUntil).toISOString().slice(0, 10) : "");
      setTax(String(d.tax ?? 0));
      setTax2(String(d.tax2 ?? 0));
      setDiscount(String(d.discount ?? 0));
      setAdvancedAmount(String(d.advancedAmount ?? 0));
      setNote(String(d.note || ""));
    } catch (e: any) {
      toast.error(e.message || "Failed to load estimate");
    }
  };

  const currentUser = getCurrentUser();

  const canPrint = () => {
    if (currentUser?.role === 'admin' || currentUser?.role === 'marketing_manager' || currentUser?.role === 'sales_manager' || currentUser?.role === 'finance_manager') return true;
    return String(est?.approvalStatus || "Pending") === "Approved";
  };

  useEffect(() => {
    fetchEstimate();
  }, [id]);

  const subtotal = useMemo(() => {
    return (items || []).reduce((s, it) => s + Number(it.quantity || 0) * Number(it.rate || 0), 0);
  }, [items]);

  const total = useMemo(() => {
    const t1 = (Number(tax || 0) / 100) * subtotal;
    const t2 = (Number(tax2 || 0) / 100) * subtotal;
    const disc = Number(discount || 0);
    const adv = Number(advancedAmount || 0);
    return Math.max(0, subtotal + t1 + t2 - disc - adv);
  }, [subtotal, tax, tax2, discount, advancedAmount]);

  const openAddItem = () => {
    setEditingItemIndex(null);
    setItemTitle("");
    setItemDesc("");
    setItemQty("1");
    setItemRate("0");
    setOpenItem(true);
  };

  const openEditItem = (idx: number) => {
    const it = items[idx] || {};
    setEditingItemIndex(idx);
    setItemTitle(String(it.item || it.name || ""));
    setItemDesc(String(it.description || ""));
    setItemQty(String(it.quantity ?? 1));
    setItemRate(String(it.rate ?? 0));
    setOpenItem(true);
  };

  const saveItem = () => {
    const it = {
      item: itemTitle,
      description: itemDesc,
      quantity: Number(itemQty) || 0,
      rate: Number(itemRate) || 0,
      total: (Number(itemQty) || 0) * (Number(itemRate) || 0),
    };
    const next = [...items];
    if (editingItemIndex == null) next.push(it);
    else next[editingItemIndex] = it;
    setItems(next);
    setOpenItem(false);
  };

  const deleteItem = (idx: number) => {
    setItems((p) => p.filter((_, i) => i !== idx));
  };

  const saveEstimate = async () => {
    if (!id) return;
    try {
      const payload: any = {
        status,
        validUntil: validUntil ? new Date(validUntil) : undefined,
        tax: Number(tax || 0),
        tax2: Number(tax2 || 0),
        discount: Number(discount || 0),
        advancedAmount: Number(advancedAmount || 0),
        note: note || undefined,
        items,
        amount: total,
      };
      const res = await fetch(`${API_BASE}/api/estimates/${id}`, {
        method: "PATCH",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to save estimate");
      }
      const updated = (await res.json()) as EstimateDoc;
      setEst(updated);
      // Keep status in sync (server may coerce based on approval rules)
      setStatus(String(updated?.status || payload.status || "Draft"));
      if ((updated as any)?.approvalStatus) {
        // noop; UI uses est.approvalStatus
      }
      toast.success("Estimate saved");
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    }
  };

  const convertToProposal = async () => {
    if (!est?._id) return;
    if (!confirm("Convert this estimate into a proposal?")) return;
    try {
      const payload = {
        title: `Proposal for ${est.number || est._id}`,
        client: est.client,
        amount: total,
        status: "draft",
        proposalDate: new Date().toISOString(),
        items: (items || []).map((it: any) => ({
          name: String(it?.item || it?.name || "Item"),
          qty: Number(it?.quantity ?? 1) || 0,
          rate: Number(it?.rate ?? 0) || 0,
        })),
        note: `Generated from Estimate #${est.number || est._id}`,
      };
      const r = await fetch(`${API_BASE}/api/proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("Failed to create proposal");
      const d = await r.json();
      toast.success("Proposal created");
      if (d?._id) navigate(`/prospects/proposals/${d._id}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to convert");
    }
  };

  const convertToInvoice = async () => {
    if (!est?._id) return;
    if (!confirm("Convert this estimate into an invoice?")) return;
    try {
      const r = await fetch(`${API_BASE}/api/estimates/${est._id}/convert-to-invoice`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error || "Failed to convert");
      toast.success("Invoice created");
      if (d?._id) navigate(`/invoices/${d._id}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to convert");
    }
  };

  const approveEstimate = async () => {
    if (!est?._id) return;
    if (!confirm("Approve this estimate?")) return;
    try {
      const r = await fetch(`${API_BASE}/api/estimates/${est._id}/approve`, { method: "POST", headers: getAuthHeaders() });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error || "Failed to approve");
      setEst(d);
      toast.success("Estimate approved");
    } catch (e: any) {
      toast.error(e.message || "Failed to approve");
    }
  };

  const rejectEstimate = async () => {
    if (!est?._id) return;
    if (!confirm("Reject this estimate?")) return;
    try {
      const r = await fetch(`${API_BASE}/api/estimates/${est._id}/reject`, { method: "POST", headers: getAuthHeaders() });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error || "Failed to reject");
      setEst(d);
      toast.success("Estimate rejected");
    } catch (e: any) {
      toast.error(e.message || "Failed to reject");
    }
  };

  const setEstimateStatus = async (nextStatus: "Draft" | "Sent" | "Accepted" | "Declined") => {
    if (!est?._id) return;
    try {
      const r = await fetch(`${API_BASE}/api/estimates/${est._id}`, {
        method: "PATCH",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status: nextStatus }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error || "Failed to update status");
      setEst(d);
      setStatus(String(d?.status || nextStatus));
      toast.success("Status updated");
    } catch (e: any) {
      toast.error(e.message || "Failed to update status");
    }
  };

  const deleteEstimate = async () => {
    if (!id) return;
    if (!confirm("Delete this estimate?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/estimates/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to delete");
      }
      toast.success("Estimate deleted");
      navigate("/prospects/estimates");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    }
  };

  const downloadPdfDirect = async () => {
    if (!id) return;
    try {
      const html2pdf = await loadHtml2Pdf();
      const el = pdfTargetRef.current;
      if (!el) return;
      const filename = `estimate-${String(est?.number || id).trim()}.pdf`;
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
    } catch {
      toast.error("Failed to download PDF");
    }
  };

if (!est) return <div className="p-4 text-center">Loading…</div>;

return (
  <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
    <div className="mx-auto max-w-6xl px-4 py-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <BackButton to="/prospects/estimates" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="text-lg font-semibold tracking-tight">Estimate #{est.number || id}</div>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${status === "Accepted" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : status === "Declined" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-50 text-slate-700 border-slate-200"}`}>
                {status}
              </span>
              <Badge className={cn(
                "font-black uppercase text-[10px] tracking-widest px-2 py-0.5 ml-2",
                est?.approvalStatus === "Approved" ? "bg-emerald-100 text-emerald-700" :
                est?.approvalStatus === "Rejected" ? "bg-rose-100 text-rose-700" :
                "bg-amber-100 text-amber-700 animate-pulse"
              )}>
                {est?.approvalStatus || "Pending Approval"}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">Client: {est.client || "-"}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canPrint() ? (
            <Button 
              variant="outline" 
              className="rounded-xl border-slate-200 font-black uppercase text-xs tracking-widest h-11"
              onClick={downloadPdfDirect}
            >
              <Printer className="w-4 h-4 mr-2" />
              Print / Download
            </Button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-100 rounded-xl text-[10px] font-bold uppercase tracking-wider">
              <AlertCircle className="w-4 h-4" />
              Approval Required to Print
            </div>
          )}
          {(currentUser?.role === 'admin' || currentUser?.role === 'marketing_manager' || (String(est?.approvalStatus) !== "Approved" && String(est?.approvalStatus) !== "Pending")) && (
            <Button className="rounded-xl bg-slate-900 text-white font-black uppercase text-xs tracking-widest h-11 hover:bg-slate-800">
              <Edit className="w-4 h-4 mr-2" />
              Edit Estimate
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 bg-white shadow-sm">
                <MoreHorizontal className="h-4 w-4" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={convertToInvoice}>
                <Receipt className="h-4 w-4 mr-2" />
                Convert to Invoice
              </DropdownMenuItem>
              <DropdownMenuItem onClick={convertToProposal}>
                <FileText className="h-4 w-4 mr-2" />
                Convert to Proposal
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setEstimateStatus("Accepted")}>
                <ThumbsUp className="h-4 w-4 mr-2" />
                Mark Accepted (auto invoice)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEstimateStatus("Declined")}>
                <ThumbsDown className="h-4 w-4 mr-2" />
                Mark Declined
              </DropdownMenuItem>
              {String((est as any)?.approvalStatus || "") === "Pending" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={approveEstimate}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={rejectEstimate}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onClick={() => navigate(`/prospects/estimates/${id}/preview`)}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadPdfDirect}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={deleteEstimate} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-8 border-slate-200/70 shadow-sm rounded-2xl bg-white">
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Sent">Sent</SelectItem>
                    <SelectItem value="Accepted">Accepted</SelectItem>
                    <SelectItem value="Declined">Declined</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valid Until</Label>
                <DatePicker value={validUntil} onChange={setValidUntil} placeholder="Pick valid until" />
              </div>
            </div>

            <div className="rounded-2xl border bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/70">
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center">
                        <div className="text-sm font-medium">No items yet</div>
                        <div className="text-xs text-muted-foreground mt-1">Add line items to calculate totals.</div>
                        <div className="mt-4">
                          <Button variant="outline" size="sm" className="border-dashed" onClick={openAddItem}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Item
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {items.map((it, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-50/30 transition-colors group">
                          <TableCell className="max-w-[360px] py-4">
                            <div className="font-bold text-xs text-slate-700">{String(it.item || it.name || "-")}</div>
                            {it.description && (
                              <div className="text-[9px] text-slate-400 font-medium truncate max-w-[200px] mb-1 prose-sm mt-1" dangerouslySetInnerHTML={{ __html: String(it.description) }} />
                            )}
                            <div className='flex items-center gap-2'>
                              <Badge variant="outline" className='text-[7px] font-black uppercase tracking-widest px-1.5 py-0 h-4 border-slate-200 text-slate-400'>
                                Pending
                              </Badge>
                              <span className='text-[8px] font-bold text-slate-300 uppercase tracking-widest'>Last Updated: Just now</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-black text-xs tabular-nums">{Number(it.quantity || 0)}</TableCell>
                          <TableCell className="text-right font-black text-xs tabular-nums">Rs.{Number(it.rate || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right font-black text-xs tabular-nums text-indigo-600">Rs.{(Number(it.quantity || 0) * Number(it.rate || 0)).toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => openEditItem(idx)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-rose-500" onClick={() => deleteItem(idx)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={5}>
                          <Button variant="outline" size="sm" className="w-full border-dashed" onClick={openAddItem}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Item
                          </Button>
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 border-slate-200/70 shadow-sm rounded-2xl bg-white self-start">
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tax %</Label>
                <Input type="number" value={tax} onChange={(e) => setTax(e.target.value)} className="bg-white" />
              </div>
              <div className="space-y-1.5">
                <Label>Tax2 %</Label>
                <Input type="number" value={tax2} onChange={(e) => setTax2(e.target.value)} className="bg-white" />
              </div>
              <div className="space-y-1.5">
                <Label>Discount</Label>
                <Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} className="bg-white" />
              </div>
              <div className="space-y-1.5">
                <Label>Advance</Label>
                <Input type="number" value={advancedAmount} onChange={(e) => setAdvancedAmount(e.target.value)} className="bg-white" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Note</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} className="bg-white" />
            </div>

            <div className="mt-auto p-8 bg-white border border-slate-100 rounded-3xl text-slate-900 flex items-center justify-between overflow-hidden relative group shadow-xl shadow-slate-100/50">
              <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
              <div className='absolute right-0 top-0 w-full h-full bg-gradient-to-br from-transparent via-transparent to-indigo-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500' />
              
              <div className="relative z-10">
                <p className="text-[8px] font-black uppercase tracking-[0.4em] text-indigo-500/60 mb-2">Total Authorized Budget</p>
                <div className='flex items-baseline gap-1 mb-4'>
                  <h2 className="text-4xl font-black tracking-tighter text-slate-900 group-hover:text-indigo-600 transition-colors duration-500">
                    <CountUp value={total} />
                  </h2>
                  <div className='w-2 h-2 rounded-full bg-emerald-500 animate-pulse' />
                </div>

                <div className='w-full max-w-[300px] space-y-1.5'>
                  <div className='flex justify-between items-center'>
                    <span className='text-[7px] font-black uppercase tracking-widest text-slate-400'>Estimate Utilization</span>
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
              <div className="flex items-center gap-3 relative z-10">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button onClick={saveEstimate} className="rounded-2xl bg-indigo-600 text-white uppercase font-black text-[10px] tracking-[0.2em] px-8 h-12 hover:bg-indigo-700 shadow-2xl shadow-indigo-200 transition-all active:scale-95">
                    Finalize Estimate
                  </Button>
                </motion.div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PDF target: we rely on existing preview route for full template; this keeps direct PDF download basic */}
      <div className="fixed -top-[9999px] left-0" ref={pdfTargetRef}>
        <div className="p-10 bg-white" style={{ width: "210mm", minHeight: "297mm" }}>
          <h1 className="text-2xl font-bold mb-2">Estimate #{est.number || id}</h1>
          <div className="text-sm mb-6">Client: {est.client || "-"}</div>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Item</th>
                <th className="border p-2 text-right">Qty</th>
                <th className="border p-2 text-right">Rate</th>
                <th className="border p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx}>
                  <td className="border p-2">{String(it.item || it.name || "-")}</td>
                  <td className="border p-2 text-right">{Number(it.quantity || 0)}</td>
                  <td className="border p-2 text-right">{Number(it.rate || 0).toLocaleString()}</td>
                  <td className="border p-2 text-right">{(Number(it.quantity || 0) * Number(it.rate || 0)).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-6 text-right font-bold">Total: Rs.{total.toLocaleString()}</div>
        </div>
      </div>

      {/* Add/Edit Item Dialog */}
      <Dialog open={openItem} onOpenChange={setOpenItem}>
        <DialogContent className="bg-card max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItemIndex === null ? "Add Item" : "Edit Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Item Title</Label>
              <Input value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <div className="border rounded-md overflow-hidden">
                <ReactQuill
                  theme="snow"
                  value={itemDesc}
                  onChange={setItemDesc}
                  modules={{
                    toolbar: [
                      ["bold", "italic", "underline"],
                      [{ list: "ordered" }, { list: "bullet" }],
                      ["clean"],
                    ],
                  }}
                  className="min-h-[140px]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Quantity</Label>
                <Input type="number" value={itemQty} onChange={(e) => setItemQty(e.target.value)} min="0" step="0.01" />
              </div>
              <div className="space-y-1">
                <Label>Rate</Label>
                <Input type="number" value={itemRate} onChange={(e) => setItemRate(e.target.value)} min="0" step="0.01" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenItem(false)}>Close</Button>
            <Button onClick={saveItem}>Save Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  </div>
  );
}

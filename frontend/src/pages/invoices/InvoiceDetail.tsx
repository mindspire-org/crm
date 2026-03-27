import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoreHorizontal, Eye, Printer, Plus, Trash2, Edit } from "lucide-react";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [inv, setInv] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Payment state
  const [openPay, setOpenPay] = useState(false);
  const [payAmount, setPayAmount] = useState<string>("");
  const [payMethod, setPayMethod] = useState<string>("Bank Transfer");
  const [payDate, setPayDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [payNote, setPayNote] = useState<string>("");
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentEditingId, setPaymentEditingId] = useState<string>("");
  const [confirmDeletePaymentOpen, setConfirmDeletePaymentOpen] = useState(false);
  const [paymentToDeleteId, setPaymentToDeleteId] = useState<string | null>(null);

  const loadInvoice = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const r = await fetch(`${API_BASE}/api/invoices/${id}`, { headers: getAuthHeaders() });
      if (r.ok) {
        const data = await r.json();
        setInv(data);
        if (data._id) {
          loadPayments(data._id);
        }
      }
    } catch (e) {
      console.error("Failed to load invoice:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async (invoiceId: string) => {
    try {
      const pRes = await fetch(`${API_BASE}/api/payments?invoiceId=${encodeURIComponent(invoiceId)}`, { headers: getAuthHeaders() });
      if (pRes.ok) {
        const list = await pRes.json();
        setPayments(Array.isArray(list) ? list : []);
      }
    } catch (e) {
      console.error("Failed to load payments:", e);
    }
  };

  useEffect(() => {
    loadInvoice();
  }, [id]);

  const savePayment = async () => {
    try {
      if (!inv?._id) return;
      const payload: any = {
        invoiceId: inv._id,
        clientId: inv.clientId || (typeof inv.client === 'object' ? inv.client._id : inv.client),
        amount: payAmount ? Number(payAmount) : 0,
        method: payMethod,
        date: payDate ? new Date(payDate) : undefined,
        note: payNote,
      };

      const method = paymentEditingId ? 'PUT' : 'POST';
      const url = paymentEditingId ? `${API_BASE}/api/payments/${encodeURIComponent(paymentEditingId)}` : `${API_BASE}/api/payments`;
      const r = await fetch(url, {
        method,
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      });

      if (r.ok) {
        toast.success(paymentEditingId ? "Payment updated" : "Payment recorded");
        setOpenPay(false);
        resetPaymentForm();
        loadInvoice(); // Reload to get updated status/totals
      } else {
        const err = await r.json();
        toast.error(err.error || "Failed to save payment");
      }
    } catch (e) {
      toast.error("An error occurred while saving payment");
    }
  };

  const deletePayment = async (paymentId: string) => {
    try {
      const r = await fetch(`${API_BASE}/api/payments/${paymentId}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      if (r.ok) {
        toast.success("Payment deleted");
        loadInvoice();
      } else {
        toast.error("Failed to delete payment");
      }
    } catch (e) {
      toast.error("An error occurred while deleting payment");
    }
  };

  const resetPaymentForm = () => {
    setPayAmount("");
    setPayMethod("Bank Transfer");
    setPayNote("");
    setPayDate(new Date().toISOString().slice(0, 10));
    setPaymentEditingId("");
  };

  const openEditPayment = (p: any) => {
    setPaymentEditingId(p._id);
    setPayAmount(String(p.amount || ""));
    setPayMethod(p.method || "Bank Transfer");
    setPayDate(p.date ? new Date(p.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
    setPayNote(p.note || "");
    setOpenPay(true);
  };

  const idText = inv?.number ? `INVOICE #${inv.number}` : `Invoice`;
  const formatClient = (c: any) => {
    if (!c) return "-";
    if (typeof c === "string") return c;
    return c.name || c.company || c.person || "-";
  };

  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const balanceDue = (Number(inv?.amount) || 0) - totalPaid;

  return (
    <div className="space-y-4 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display">{idText}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(`/invoices/${id}/preview`)}>
            <Eye className="w-4 h-4 mr-2" />Preview
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline"><MoreHorizontal className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" />Print</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/invoices/${id}/preview`)}><Eye className="w-4 h-4 mr-2" />Preview</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-start gap-4">
            <img src="/HealthSpire%20logo.png" alt="HealthSpire" className="h-16" />
            <div className="text-sm text-muted-foreground">HealthSpire</div>
            <div className="ml-auto">
              <Badge>{idText}</Badge>
              <div className="text-xs text-muted-foreground mt-1 text-right">
                Bill date: {inv?.issueDate ? new Date(inv.issueDate).toISOString().slice(0, 10) : "-"}<br />
                Due date: {inv?.dueDate ? new Date(inv.dueDate).toISOString().slice(0, 10) : "-"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8 text-sm">
            <div className="bg-muted/30 p-4 rounded-xl">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Bill From</div>
              <div className="font-bold">HealthSpire</div>
              <div className="text-xs text-muted-foreground mt-1">
                Office 123, Tech Plaza<br />
                Islamabad, Pakistan
              </div>
            </div>
            <div className="bg-muted/30 p-4 rounded-xl">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Bill To</div>
              <div className="font-bold">{formatClient(inv?.client)}</div>
              {inv?.client?.email && <div className="text-xs text-muted-foreground">{inv.client.email}</div>}
            </div>
          </div>

          <Table className="mt-8">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="rounded-l-lg">Item Description</TableHead>
                <TableHead className="w-32">Quantity</TableHead>
                <TableHead className="w-32">Rate</TableHead>
                <TableHead className="w-32 text-right rounded-r-lg">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inv?.items?.length ? (
                inv.items.map((it: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{it.name || it.title || "-"}</TableCell>
                    <TableCell>{it.quantity ?? it.qty ?? "-"}</TableCell>
                    <TableCell>Rs. {(Number(it.rate) || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold">Rs. {(Number(it.total) || 0).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell className="font-medium">Invoice amount</TableCell>
                  <TableCell>1</TableCell>
                  <TableCell>Rs. {(Number(inv?.amount) || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right font-bold">Rs. {(Number(inv?.amount) || 0).toLocaleString()}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-4">
              {inv?.note && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Notes</div>
                  <div className="text-xs bg-slate-50 p-3 rounded-lg border border-dashed">{inv.note}</div>
                </div>
              )}
              {payments.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Payment History</div>
                  <div className="space-y-2">
                    {payments.map((p) => (
                      <div key={p._id} className="flex items-center justify-between text-[11px] bg-emerald-50/50 border border-emerald-100 p-2 rounded-lg group">
                        <div>
                          <span className="font-bold text-emerald-700">{p.method}</span>
                          <span className="mx-2 text-slate-300">|</span>
                          <span className="text-slate-500">{p.date ? new Date(p.date).toLocaleDateString() : ''}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold">Rs. {(p.amount || 0).toLocaleString()}</span>
                          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditPayment(p)} className="p-1 hover:text-primary"><Edit className="w-3 h-3" /></button>
                            <button onClick={() => { setPaymentToDeleteId(p._id); setConfirmDeletePaymentOpen(true); }} className="p-1 hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="bg-slate-900 text-white p-6 rounded-2xl space-y-3 shadow-xl h-fit">
              <div className="flex items-center justify-between text-xs opacity-60">
                <span>Sub Total</span>
                <span>Rs. {(Number(inv?.amount) || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs opacity-60">
                <span>Discount</span>
                <span>- Rs. {(inv?.discount || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-emerald-400 font-bold border-t border-white/10 pt-3">
                <span>Total Paid</span>
                <span>Rs. {totalPaid.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Balance Due</span>
                <span className={balanceDue > 0 ? "text-amber-400" : "text-emerald-400"}>
                  Rs. {Math.max(0, balanceDue).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-0 overflow-hidden h-fit shadow-md border-none ring-1 ring-border">
          <div className="bg-slate-50 p-6 border-b">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-500">Invoice Status</h3>
              <Badge variant={inv?.status === 'Paid' ? 'success' : inv?.status === 'Partially paid' ? 'secondary' : 'outline'}>
                {inv?.status || 'Unpaid'}
              </Badge>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-9 w-9 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                  <MoreHorizontal className="w-4 h-4 text-slate-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Client Name</div>
                  <div className="text-sm font-bold truncate text-slate-700">{formatClient(inv?.client)}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-9 w-9 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                  <MoreHorizontal className="w-4 h-4 text-slate-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Last Email Sent</div>
                  <div className="text-sm font-bold truncate text-slate-700">Never</div>
                </div>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-3">
            <Button className="w-full gap-2 shadow-md h-11 rounded-xl" onClick={() => { resetPaymentForm(); setOpenPay(true); }}>
              <Plus className="w-4 h-4" />
              Add Payment
            </Button>
            <Button className="w-full h-11 rounded-xl border-slate-200" variant="outline" onClick={() => navigate(`/invoices/${id}/preview`)}>
              <Eye className="w-4 h-4 mr-2" />
              View Preview
            </Button>
          </div>
        </Card>
      </div>

      {/* Add/Edit Payment Dialog */}
      <Dialog open={openPay} onOpenChange={setOpenPay}>
        <DialogContent className="bg-card max-w-md rounded-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{paymentEditingId ? "Edit Payment" : "Record Payment"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount Received</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">Rs.</span>
                <Input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-10 h-11 rounded-xl focus-visible:ring-primary/20"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Method</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Select Method" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-xl">
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Stripe">Stripe</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</Label>
                <DatePicker value={payDate} onChange={setPayDate} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notes / Reference</Label>
              <Textarea
                placeholder="Bank reference number, cheque details etc."
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                className="min-h-[100px] rounded-xl focus-visible:ring-primary/20 resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setOpenPay(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={savePayment} className="rounded-xl px-8 shadow-md">
              {paymentEditingId ? "Update Payment" : "Save Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDeletePaymentOpen}
        onOpenChange={setConfirmDeletePaymentOpen}
        onConfirm={() => paymentToDeleteId && deletePayment(paymentToDeleteId)}
        title="Delete Payment"
        description="Are you sure you want to remove this payment record? This will update the invoice balance."
        variant="destructive"
      />
    </div>
  );
}


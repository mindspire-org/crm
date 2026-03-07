import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RefreshCw, Search, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";

interface Invoice {
  _id: string;
  number: string;
  clientId?: string;
  client?: string;
  amount?: number;
}

interface Payment {
  _id: string;
  invoiceId?: any;
  invoiceNumber?: string;
  invoiceObjectId?: string;
  clientId?: string;
  client?: string;
  amount?: number;
  method?: string;
  date?: string;
  note?: string;
}

const getPaymentInvoiceMeta = (p: Payment) => {
  if ((p as any)?.invoiceObjectId || (p as any)?.invoiceNumber) {
    return {
      invoiceObjectId: String((p as any).invoiceObjectId || ""),
      invoiceNumber: String((p as any).invoiceNumber || ""),
    };
  }
  const raw = (p as any)?.invoiceId;
  if (!raw) return { invoiceObjectId: "", invoiceNumber: "" };
  if (typeof raw === "object") {
    return { invoiceObjectId: String(raw._id || ""), invoiceNumber: String(raw.number || "") };
  }
  return { invoiceObjectId: String(raw), invoiceNumber: "" };
};

const fmtDate = (d?: string) => {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toISOString().slice(0, 10);
};

const csvEscape = (v: any) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export default function Payments() {
  const [tab, setTab] = useState("list");
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState("-");
  const [currency, setCurrency] = useState("-");
  const [project, setProject] = useState("-");
  const [openAdd, setOpenAdd] = useState(false);
  const [year, setYear] = useState(2025);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);

  const [addInvoiceId, setAddInvoiceId] = useState<string>("");
  const [addDate, setAddDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [addMethod, setAddMethod] = useState<string>("Bank Transfer");
  const [addAmount, setAddAmount] = useState<string>("");
  const [addNote, setAddNote] = useState<string>("");

  const navigate = useNavigate();

  // Chart data (demo)
  const chartMonths = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const chartValues = useMemo(
    () => [0, 0, 1200, 600, 102000, 70000, 0, 140000, 47000, 0, 0, 32000],
    [year]
  );
  const maxVal = Math.max(1, ...chartValues);
  const prefix = currency === "PKR" ? "Rs." : currency === "EUR" ? "€" : currency === "USD" ? "$" : "";
  const fmt = (n: number) => `${prefix}${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n)}`;
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 60);
    return () => {
      clearTimeout(t);
      setAnimate(false);
    };
  }, [year, currency]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      const url = `${API_BASE}/api/payments${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setPayments(Array.isArray(data) ? data : []);
    } catch {}
    finally {
      setLoading(false);
    }
  };

  const loadInvoices = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/invoices`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setInvoices(Array.isArray(data) ? data : []);
    } catch {}
  };

  const exportExcel = () => {
    if (!payments.length) {
      toast({ title: "No data", description: "No payments to export", variant: "destructive" });
      return;
    }
    const rows = payments.map((p) => {
      const meta = getPaymentInvoiceMeta(p);
      const inv = meta.invoiceObjectId ? invoiceById.get(String(meta.invoiceObjectId)) : undefined;
      const invoiceNumber = meta.invoiceNumber || inv?.number || meta.invoiceObjectId || "";
      const client = p.client || inv?.client || "";
      return {
        invoice: invoiceNumber,
        client,
        date: fmtDate(p.date),
        method: p.method || "",
        note: p.note || "",
        amount: Number(p.amount || 0),
      };
    });

    const header = ["Invoice", "Client", "Payment Date", "Method", "Note", "Amount"];
    const lines = [
      header.map(csvEscape).join(","),
      ...rows.map((r) => [r.invoice, r.client, r.date, r.method, r.note, r.amount].map(csvEscape).join(",")),
      ["", "", "", "", "Total", totalAmount].map(csvEscape).join(","),
    ];

    const csv = `\uFEFF${lines.join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const printPayments = () => {
    if (!payments.length) {
      toast({ title: "No data", description: "No payments to print", variant: "destructive" });
      return;
    }

    const rowsHtml = payments
      .map((p) => {
        const meta = getPaymentInvoiceMeta(p);
        const inv = meta.invoiceObjectId ? invoiceById.get(String(meta.invoiceObjectId)) : undefined;
        const invoiceNumber = meta.invoiceNumber || inv?.number || meta.invoiceObjectId || "-";
        const client = p.client || inv?.client || "-";
        const date = fmtDate(p.date);
        const method = p.method || "-";
        const note = p.note || "—";
        const amount = `Rs.${Number(p.amount || 0).toLocaleString()}`;
        return `<tr><td>${invoiceNumber}</td><td>${client}</td><td>${date}</td><td>${method}</td><td>${note}</td><td style="text-align:right">${amount}</td></tr>`;
      })
      .join("");

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Payments</title>
    <style>
      body{font-family:Arial, Helvetica, sans-serif; padding:24px; color:#111;}
      h1{font-size:18px; margin:0 0 12px 0;}
      .meta{font-size:12px; color:#444; margin-bottom:16px;}
      table{width:100%; border-collapse:collapse; font-size:12px;}
      th,td{border:1px solid #ddd; padding:8px; vertical-align:top;}
      th{background:#f5f5f5; text-align:left;}
      tfoot td{font-weight:bold;}
    </style>
  </head>
  <body>
    <h1>Payments</h1>
    <div class="meta">Generated: ${new Date().toLocaleString()}</div>
    <table>
      <thead>
        <tr>
          <th>Invoice</th>
          <th>Client</th>
          <th>Payment date</th>
          <th>Method</th>
          <th>Note</th>
          <th style="text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5" style="text-align:right">Total</td>
          <td style="text-align:right">Rs.${Number(totalAmount || 0).toLocaleString()}</td>
        </tr>
      </tfoot>
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
      toast({ title: "Popup blocked", description: "Please allow popups to print", variant: "destructive" });
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  useEffect(() => {
    loadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    if (!openAdd) return;
    loadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openAdd]);

  const selectedInvoice = useMemo(
    () => invoices.find((i) => String(i._id) === String(addInvoiceId)),
    [invoices, addInvoiceId]
  );

  const invoiceById = useMemo(() => {
    const m = new Map<string, Invoice>();
    for (const inv of invoices) m.set(String(inv._id), inv);
    return m;
  }, [invoices]);

  const totalAmount = useMemo(
    () => (payments || []).reduce((s, p) => s + Number(p.amount || 0), 0),
    [payments]
  );

  const savePayment = async () => {
    if (!addInvoiceId) {
      toast({ title: "Missing invoice", description: "Please select an invoice", variant: "destructive" });
      return;
    }
    const amt = Number(addAmount || 0);
    if (!amt || amt <= 0) {
      toast({ title: "Invalid amount", description: "Please enter a valid amount", variant: "destructive" });
      return;
    }
    try {
      const payload: any = {
        invoiceId: addInvoiceId,
        clientId: selectedInvoice?.clientId,
        client: selectedInvoice?.client || "",
        amount: amt,
        method: addMethod || "Cash",
        date: addDate ? new Date(addDate) : new Date(),
        note: addNote,
      };
      const res = await fetch(`${API_BASE}/api/payments`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let msg = "Failed to save payment";
        try {
          const err = await res.json();
          if (err?.error) msg = String(err.error);
        } catch {}
        toast({ title: "Save failed", description: msg, variant: "destructive" });
        return;
      }
      toast({ title: "Saved", description: "Payment saved successfully" });
      setOpenAdd(false);
      setAddInvoiceId("");
      setAddAmount("");
      setAddNote("");
      setAddMethod("Bank Transfer");
      setAddDate(new Date().toISOString().slice(0, 10));
      loadPayments();
    } catch {}
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-sm text-muted-foreground">Payment Received</h1>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="bg-muted/40">
              <TabsTrigger value="list">List</TabsTrigger>
              <TabsTrigger value="chart">Chart</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-2"/>Add payment</Button>
          </DialogTrigger>
          <DialogContent className="bg-card" aria-describedby={undefined}>
            <DialogHeader><DialogTitle>Add payment</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="space-y-1">
                <label className="text-sm">Invoice</label>
                <Select value={addInvoiceId} onValueChange={setAddInvoiceId}>
                  <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
                  <SelectContent>
                    {invoices.map((inv) => (
                      <SelectItem key={String(inv._id)} value={String(inv._id)}>
                        {inv.number} {inv.client ? `- ${inv.client}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><label className="text-sm">Payment date</label><DatePicker value={addDate} onChange={setAddDate} placeholder="Pick date" /></div>
              <div className="space-y-1"><label className="text-sm">Payment method</label><Input placeholder="Bank Transfer" value={addMethod} onChange={(e)=>setAddMethod(e.target.value)} /></div>
              <div className="space-y-1"><label className="text-sm">Amount</label><Input placeholder="0.00" value={addAmount} onChange={(e)=>setAddAmount(e.target.value)} /></div>
              <div className="space-y-1"><label className="text-sm">Note</label><Input placeholder="-" value={addNote} onChange={(e)=>setAddNote(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={()=>setOpenAdd(false)}>Close</Button>
              <Button onClick={savePayment}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="w-44"><SelectValue placeholder="- Payment method -"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">- Payment method -</SelectItem>
                </SelectContent>
              </Select>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-36"><SelectValue placeholder="- Currency -"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">- Currency -</SelectItem>
                </SelectContent>
              </Select>
              <Select value={project} onValueChange={setProject}>
                <SelectTrigger className="w-36"><SelectValue placeholder="- Project -"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">- Project -</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">Monthly</Button>
              <Button variant="outline">Yearly</Button>
              <Button variant="outline">Custom</Button>
              <Button variant="outline">Dynamic</Button>
              <Button variant="outline">December 2025</Button>
              <Button variant="success" size="icon" onClick={loadPayments} disabled={loading}><RefreshCw className="w-4 h-4"/></Button>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={exportExcel}>Excel</Button>
              <Button type="button" variant="outline" size="sm" onClick={printPayments}>Print</Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search" value={query} onChange={(e)=>setQuery(e.target.value)} className="pl-9 w-56" />
              </div>
            </div>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsContent value="list">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Invoice ID</TableHead>
                        <TableHead>Payment date</TableHead>
                        <TableHead>Payment method</TableHead>
                        <TableHead>Note</TableHead>
                        <TableHead>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p) => (
                        <TableRow key={String(p._id)}>
                          <TableCell
                            className="text-primary underline cursor-pointer"
                            onClick={() => {
                              const meta = getPaymentInvoiceMeta(p);
                              if (meta.invoiceObjectId) navigate(`/invoices/${meta.invoiceObjectId}`);
                            }}
                          >
                            {(() => {
                              const meta = getPaymentInvoiceMeta(p);
                              const inv = meta.invoiceObjectId ? invoiceById.get(String(meta.invoiceObjectId)) : undefined;
                              return meta.invoiceNumber || inv?.number || meta.invoiceObjectId || "-";
                            })()}
                          </TableCell>
                          <TableCell>{fmtDate(p.date)}</TableCell>
                          <TableCell>{p.method || "-"}</TableCell>
                          <TableCell>{p.note || "—"}</TableCell>
                          <TableCell>Rs.{Number(p.amount || 0).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell className="font-medium">Total</TableCell>
                        <TableCell colSpan={3}></TableCell>
                        <TableCell className="font-semibold">Rs.{totalAmount.toLocaleString()}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="chart">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium">Chart</div>
                    <div className="flex items-center gap-2">
                      <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger className="w-36"><SelectValue placeholder="Currency"/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="-">Currency</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="PKR">PKR</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="inline-flex items-center gap-1">
                        <Button variant="outline" size="icon" onClick={() => setYear((y) => y - 1)}><ChevronLeft className="w-4 h-4"/></Button>
                        <span className="w-16 text-center text-sm">{year}</span>
                        <Button variant="outline" size="icon" onClick={() => setYear((y) => y + 1)}><ChevronRight className="w-4 h-4"/></Button>
                      </div>
                    </div>
                  </div>

                  {/* Animated Bar Chart */}
                  <div className="relative h-72 rounded-lg border bg-muted/20 overflow-hidden">
                    {/* horizontal grid lines */}
                    {[0,1,2,3,4,5].map((i) => (
                      <div key={i} className="absolute left-0 right-0 border-t border-border/60" style={{ top: `${(i/5)*100}%` }} />
                    ))}

                    {/* bars */}
                    <div className="absolute left-4 right-4 bottom-8 top-4 flex items-end gap-3">
                      {chartValues.map((v, idx) => {
                        const h = Math.round((v / maxVal) * 100);
                        return (
                          <div key={idx} className="group relative flex-1 flex flex-col items-center">
                            <div className="relative w-6 rounded-sm bg-primary/30 group-hover:bg-primary/50 transition-all duration-700 ease-out" style={{ height: `${animate ? h : 0}%` }}>
                              <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap rounded bg-popover px-2 py-1 text-xs text-popover-foreground shadow">
                                {fmt(v)}
                              </div>
                            </div>
                            <div className="mt-2 text-[11px] text-muted-foreground">{chartMonths[idx]}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

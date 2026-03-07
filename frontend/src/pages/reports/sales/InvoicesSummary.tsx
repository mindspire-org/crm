import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, RefreshCw, Search, FileDown, Printer, TrendingUp, Wallet, Receipt, CircleDollarSign, Filter, Eye } from "lucide-react";
import ReportsNav from "../ReportsNav";
import { Link } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";

type Invoice = {
  _id: string;
  clientId?: string;
  client?: string;
  amount?: number;
  issueDate?: string;
  tax1?: number;
  tax2?: number;
  tds?: number;
  discount?: number;
  advanceAmount?: number;
  items?: any[];
};

type Payment = { _id: string; clientId?: string; client?: string; invoiceId?: string; amount?: number; date?: string };
type Client = { _id: string; name?: string; company?: string; person?: string };
type Order = { _id: string; clientId?: string; client?: string; amount?: number; orderDate?: string };
type Contract = { _id: string; clientId?: string; client?: string; amount?: number; contractDate?: string; tax1?: number; tax2?: number };
type Expense = { _id: string; clientId?: string; amount?: number; tax?: number; tax2?: number; date?: string };

export default function InvoicesSummary() {
  const [currency, setCurrency] = useState("PKR");
  const [query, setQuery] = useState("");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [show, setShow] = useState({ kpis: true, invoices: true, invoiceDetails: true, orders: true, contracts: true, expenses: true, items: true });
  const [rangeMode, setRangeMode] = useState<'yearly' | 'monthly' | 'custom'>('yearly');
  const [month, setMonth] = useState<number>(new Date().getMonth());
  const [dateFrom, setDateFrom] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10));
  const [dateTo, setDateTo] = useState<string>(new Date().toISOString().slice(0,10));

  const load = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      const [invRes, payRes, cliRes, ordRes, conRes, expRes] = await Promise.all([
        fetch(`${API_BASE}/api/invoices`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/payments`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/clients`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/orders`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/contracts`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/expenses`, { headers: getAuthHeaders() }),
      ]);
      const invData = invRes.ok ? await invRes.json() : [];
      const payData = payRes.ok ? await payRes.json() : [];
      const cliData = cliRes.ok ? await cliRes.json() : [];
      const ordData = ordRes.ok ? await ordRes.json() : [];
      const conData = conRes.ok ? await conRes.json() : [];
      setInvoices(Array.isArray(invData) ? invData : []);
      setPayments(Array.isArray(payData) ? payData : []);
      setClients(Array.isArray(cliData) ? cliData : []);
      setOrders(Array.isArray(ordData) ? ordData : []);
      setContracts(Array.isArray(conData) ? conData : []);
      const expData = expRes.ok ? await expRes.json() : [];
      setExpenses(Array.isArray(expData) ? expData : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    try {
      const s = localStorage.getItem("reports_sales_sections");
      if (s) setShow((prev) => ({ ...prev, ...JSON.parse(s) }));
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("reports_sales_sections", JSON.stringify(show)); } catch {}
  }, [show]);
 
  const currencyFmt = useMemo(() => new Intl.NumberFormat("en-US", { style: "currency", currency }), [currency]);
  const money = (n: number) => currencyFmt.format(Number(n || 0));

  const withinRange = (raw?: any) => {
    if (!raw) return false;
    const d = new Date(raw as any);
    if (Number.isNaN(d.getTime())) return false;
    if (rangeMode === 'yearly') return d.getFullYear() === year;
    if (rangeMode === 'monthly') return d.getFullYear() === year && d.getMonth() === month;
    if (rangeMode === 'custom') {
      const from = dateFrom ? new Date(dateFrom) : undefined;
      const to = dateTo ? new Date(dateTo) : undefined;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    }
    return true;
  };

  const clientNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of clients) {
      const name = (c.name || c.company || c.person || "-").toString();
      m.set(String(c._id), name);
    }
    return m;
  }, [clients]);

  const invById = useMemo(() => {
    const m = new Map<string, Invoice>();
    for (const i of invoices) {
      if (i?._id) m.set(String(i._id), i);
    }
    return m;
  }, [invoices]);

  const filteredAgg = useMemo(() => {
    const matches = (s: string) => (s || "").toLowerCase().includes(query.trim().toLowerCase());
    const grp = new Map<string, { client: string; clientId?: string; count: number; total: number; tax1: number; tax2: number; tds: number; paid: number; discount: number }>();
    const inRangeInv = invoices.filter((i: any) => withinRange(i?.issueDate || i?.billDate || i?.billdate || i?.date || i?.createdAt || i?.dueDate));
    const invFiltered = inRangeInv.filter((i) => !query || matches(i.client || ""));
    for (const i of invFiltered) {
      const key = i.clientId || i.client || "-";
      const row = grp.get(key) || { client: i.client || "-", clientId: i.clientId, count: 0, total: 0, tax1: 0, tax2: 0, tds: 0, paid: 0, discount: 0 };
      row.count += 1;

      const list: any[] = Array.isArray((i as any).items) ? (i as any).items : [];
      const subTotal = list.length
        ? list.reduce((s, it) => s + (Number(it.quantity ?? it.qty ?? 0) * Number(it.rate ?? 0)), 0)
        : Number(i.amount || 0);

      const tax1Amt = subTotal * (Number(i.tax1 || 0) / 100);
      const tax2Amt = subTotal * (Number(i.tax2 || 0) / 100);
      const tdsAmt = subTotal * (Number(i.tds || 0) / 100);
      const advance = Number((i as any).advanceAmount || 0);
      const discount = Number((i as any).discount || 0);
      const total = Math.max(0, subTotal + tax1Amt + tax2Amt - tdsAmt - advance - discount);

      row.total += total;
      row.tax1 += tax1Amt;
      row.tax2 += tax2Amt;
      row.tds += tdsAmt;
      row.discount += discount;
      grp.set(key, row);
    }
    // Payments aggregation per client (resolve via invoice when needed)
    const inRangePay = payments.filter((p) => withinRange(p.date as any));
    for (const p of inRangePay) {
      const inv = p.invoiceId ? invById.get(String(p.invoiceId)) : undefined;
      const resolvedClientId = (p.clientId || inv?.clientId) ? String(p.clientId || inv?.clientId) : undefined;
      const resolvedClient = (p.client || inv?.client || "-");
      const key = resolvedClientId || resolvedClient;
      const row = grp.get(key) || { client: resolvedClient, clientId: resolvedClientId, count: 0, total: 0, tax1: 0, tax2: 0, tds: 0, paid: 0, discount: 0 };
      row.paid += Number(p.amount || 0);
      grp.set(key, row);
    }
    return Array.from(grp.values()).sort((a, b) => b.total - a.total);
  }, [invoices, payments, year, month, dateFrom, dateTo, rangeMode, query]);

  

  const invoiceDetails = useMemo(() => {
    const matches = (s: string) => (s || "").toLowerCase().includes(query.trim().toLowerCase());
    const payByInv = new Map<string, number>();
    const inRangePay = payments.filter((p) => withinRange(p?.date));
    for (const p of inRangePay) {
      const id = p.invoiceId ? String(p.invoiceId) : undefined;
      if (!id) continue;
      payByInv.set(id, (payByInv.get(id) || 0) + Number(p.amount || 0));
    }
    const inRangeInv = invoices.filter((i: any) => withinRange(i?.issueDate || i?.billDate || i?.billdate || i?.date || i?.createdAt || i?.dueDate));
    const flt = inRangeInv.filter((i: any) => !query || matches(i.client || "") || matches(i.number || ""));
    const rows = flt.map((i: any) => {
      const list: any[] = Array.isArray(i?.items) ? i.items : [];
      const subTotal = list.length
        ? list.reduce((s, it) => s + (Number(it.quantity ?? it.qty ?? 0) * Number(it.rate ?? 0)), 0)
        : Number(i.amount || 0);

      const tax1 = subTotal * (Number(i.tax1 || 0) / 100);
      const tax2 = subTotal * (Number(i.tax2 || 0) / 100);
      const tds = subTotal * (Number(i.tds || 0) / 100);
      const advance = Number(i.advanceAmount || 0);
      const discountVal = Number(i.discount || 0);
      const total = Math.max(0, subTotal + tax1 + tax2 - tds - advance - discountVal);
      const paid = payByInv.get(String(i._id)) || 0;
      const due = Math.max(0, total - paid);
      const issueRaw = i.issueDate || i.billDate || i.createdAt || i.dueDate;
      const dueRaw = i.dueDate;
      return {
        id: String(i._id),
        number: i.number || "-",
        client: i.client || "-",
        clientId: i.clientId ? String(i.clientId) : undefined,
        issueDate: issueRaw ? new Date(issueRaw).toLocaleDateString() : "-",
        dueDate: dueRaw ? new Date(dueRaw).toLocaleDateString() : "-",
        issueTs: issueRaw ? new Date(issueRaw).getTime() : 0,
        amount: subTotal,
        tax1,
        tax2,
        tds,
        discount: discountVal,
        total,
        paid,
        due,
        status: i.status || "-",
      };
    });
    return rows.sort((a,b)=> b.issueTs - a.issueTs);
  }, [invoices, payments, year, month, dateFrom, dateTo, rangeMode, query]);

  const detailsByClient = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const r of invoiceDetails) {
      const key = String(r.clientId || r.client);
      const arr = m.get(key) || [];
      arr.push(r);
      m.set(key, arr);
    }
    return m;
  }, [invoiceDetails]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const ordersAgg = useMemo(() => {
    const matches = (s: string) => (s || "").toLowerCase().includes(query.trim().toLowerCase());
    const grp = new Map<string, { client: string; clientId?: string; count: number; amount: number }>();
    const inYear = orders.filter(o => withinRange(o.orderDate as any));
    const flt = inYear.filter(o => !query || matches(o.client || ""));
    for (const o of flt) {
      const key = o.clientId || o.client || "-";
      const row = grp.get(key) || { client: o.client || "-", clientId: o.clientId, count: 0, amount: 0 };
      row.count += 1;
      row.amount += Number(o.amount || 0);
      grp.set(key, row);
    }
    return Array.from(grp.values()).sort((a,b)=>b.amount-a.amount);
  }, [orders, year, month, dateFrom, dateTo, rangeMode, query]);

  const contractsAgg = useMemo(() => {
    const matches = (s: string) => (s || "").toLowerCase().includes(query.trim().toLowerCase());
    const grp = new Map<string, { client: string; clientId?: string; count: number; amount: number; tax1: number; tax2: number }>();
    const inYear = contracts.filter(c => withinRange(c.contractDate as any));
    const flt = inYear.filter(c => !query || matches(c.client || ""));
    for (const c of flt) {
      const key = c.clientId || c.client || "-";
      const row = grp.get(key) || { client: c.client || "-", clientId: c.clientId, count: 0, amount: 0, tax1: 0, tax2: 0 };
      row.count += 1;
      row.amount += Number(c.amount || 0);
      // Contracts tax percentages accumulate as absolute values from amount base if needed by report
      const base = Number(c.amount || 0);
      row.tax1 += base * (Number(c.tax1 || 0) / 100);
      row.tax2 += base * (Number(c.tax2 || 0) / 100);
      grp.set(key, row);
    }
    return Array.from(grp.values()).sort((a,b)=>b.amount-a.amount);
  }, [contracts, year, month, dateFrom, dateTo, rangeMode, query]);

  const expensesAgg = useMemo(() => {
    const grp = new Map<string, { clientId?: string; amount: number; tax: number; tax2: number }>();
    const inYear = expenses.filter(e => withinRange(e.date as any));
    for (const e of inYear) {
      const key = e.clientId ? String(e.clientId) : "-";
      const row = grp.get(key) || { clientId: e.clientId ? String(e.clientId) : undefined, amount: 0, tax: 0, tax2: 0 };
      row.amount += Number(e.amount || 0);
      row.tax += Number(e.tax || 0);
      row.tax2 += Number(e.tax2 || 0);
      grp.set(key, row);
    }
    return Array.from(grp.values()).sort((a,b)=> b.amount - a.amount);
  }, [expenses, year, month, dateFrom, dateTo, rangeMode]);
 
  const kpis = useMemo(() => {
    const invCount = filteredAgg.reduce((s, r) => s + r.count, 0);
    const invoiced = filteredAgg.reduce((s, r) => s + r.total + r.tax1 + r.tax2, 0);
    const paid = filteredAgg.reduce((s, r) => s + r.paid, 0);
    const tds = filteredAgg.reduce((s, r) => s + r.tds, 0);
    const due = Math.max(0, invoiced - paid - tds);
    const ordersTotal = ordersAgg.reduce((s, r) => s + r.amount, 0);
    const contractsTotal = contractsAgg.reduce((s, r) => s + r.amount + r.tax1 + r.tax2, 0);
    const expensesTotal = expensesAgg.reduce((s, r) => s + r.amount + r.tax + r.tax2, 0);
    return { invCount, invoiced, paid, due, ordersTotal, contractsTotal, expensesTotal };
  }, [filteredAgg, ordersAgg, contractsAgg, expensesAgg]);

  const itemsAgg = useMemo(() => {
    type Row = { name: string; qty: number; amount: number };
    const byName = new Map<string, Row>();
    // From invoices
    const invInRange = invoices.filter((i: any) => withinRange(i?.issueDate || i?.billDate || i?.billdate || i?.date || i?.createdAt || i?.dueDate));
    for (const inv of invInRange) {
      const list: any[] = Array.isArray((inv as any).items) ? (inv as any).items : [];
      for (const it of list) {
        const name = String(it.name || it.title || "-");
        const qty = Number(it.quantity ?? it.qty ?? 0);
        const rate = Number(it.rate ?? 0);
        const amt = qty * rate;
        const row = byName.get(name) || { name, qty: 0, amount: 0 };
        row.qty += qty;
        row.amount += amt;
        byName.set(name, row);
      }
    }
    // From orders
    const ordInRange = orders.filter(o => withinRange(o.orderDate as any));
    for (const ord of ordInRange) {
      const list: any[] = Array.isArray((ord as any).items) ? (ord as any).items : [];
      for (const it of list) {
        const name = String(it.name || "-");
        const qty = Number(it.quantity ?? 0);
        const rate = Number(it.rate ?? 0);
        const amt = qty * rate;
        const row = byName.get(name) || { name, qty: 0, amount: 0 };
        row.qty += qty;
        row.amount += amt;
        byName.set(name, row);
      }
    }
    return Array.from(byName.values()).sort((a,b)=> b.amount - a.amount).slice(0, 20);
  }, [invoices, orders, year, month, dateFrom, dateTo, rangeMode]);

  const exportCSV = () => {
    const header = ["Client","Count","Invoice total","Discount","Tax A","Tax B","TDS","Payment received","Due"];
    const rows = filteredAgg.map(r => [r.client, r.count, r.total, r.discount, r.tax1, r.tax2, r.tds, r.paid, Math.max(0, r.total + r.tax1 + r.tax2 - r.paid - r.tds)]);
    const csv = [header, ...rows].map(row => row.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `invoices_summary_${year}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const printTable = () => {
    const w = window.open("", "_blank"); if (!w) return;
    const rowsHtml = filteredAgg.map((r) => `<tr>
      <td>${r.client}</td>
      <td>${r.count}</td>
      <td>${r.total.toLocaleString()}</td>
      <td>${r.discount.toLocaleString()}</td>
      <td>${r.tax1.toLocaleString()}</td>
      <td>${r.tax2.toLocaleString()}</td>
      <td>${r.tds.toLocaleString()}</td>
      <td>${r.paid.toLocaleString()}</td>
      <td>${Math.max(0, r.total + r.tax1 + r.tax2 - r.paid - r.tds).toLocaleString()}</td>
    </tr>`).join("");
    w.document.write(`<!doctype html><html><head><title>Invoices summary ${year}</title></head><body>
      <h3>Invoices summary (${year})</h3>
      <table border="1" cellspacing="0" cellpadding="6">
        <thead><tr><th>Client</th><th>Count</th><th>Invoice total</th><th>Discount</th><th>Tax A</th><th>Tax B</th><th>TDS</th><th>Payment received</th><th>Due</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </body></html>`);
    w.document.close(); w.focus(); w.print(); w.close();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-sm text-muted-foreground">Invoices summary</h1>
      </div>
      <ReportsNav />
      
      {show.kpis && (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-gradient-to-br from-white to-muted/40 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Total invoiced</div>
              <div className="mt-1 text-xl font-semibold">{money(kpis.invoiced)}</div>
              <div className="text-[11px] text-muted-foreground mt-1">Year {year}</div>
            </div>
            <div className="rounded-full bg-primary/10 p-2 text-primary"><TrendingUp className="h-5 w-5"/></div>
          </div>
        </div>
        <div className="rounded-xl border bg-gradient-to-br from-white to-muted/40 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Payment received</div>
              <div className="mt-1 text-xl font-semibold">{money(kpis.paid)}</div>
              <div className="text-[11px] text-muted-foreground mt-1">Across {kpis.invCount} invoices</div>
            </div>
            <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-600"><Wallet className="h-5 w-5"/></div>
          </div>
        </div>
        <div className="rounded-xl border bg-gradient-to-br from-white to-muted/40 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Outstanding due</div>
              <div className="mt-1 text-xl font-semibold">{money(kpis.due)}</div>
              <div className="text-[11px] text-muted-foreground mt-1">After TDS</div>
            </div>
            <div className="rounded-full bg-amber-500/10 p-2 text-amber-600"><CircleDollarSign className="h-5 w-5"/></div>
          </div>
        </div>
        <div className="rounded-xl border bg-gradient-to-br from-white to-muted/40 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Orders amount</div>
              <div className="mt-1 text-xl font-semibold">{money(kpis.ordersTotal)}</div>
              <div className="text-[11px] text-muted-foreground mt-1">Year {year}</div>
            </div>
            <div className="rounded-full bg-blue-500/10 p-2 text-blue-600"><Receipt className="h-5 w-5"/></div>
          </div>
        </div>
        <div className="rounded-xl border bg-gradient-to-br from-white to-muted/40 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Contracts amount</div>
              <div className="mt-1 text-xl font-semibold">{money(kpis.contractsTotal)}</div>
              <div className="text-[11px] text-muted-foreground mt-1">Incl. taxes</div>
            </div>
            <div className="rounded-full bg-indigo-500/10 p-2 text-indigo-600"><TrendingUp className="h-5 w-5"/></div>
          </div>
        </div>
        <div className="rounded-xl border bg-gradient-to-br from-white to-muted/40 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Expenses (by client)</div>
              <div className="mt-1 text-xl font-semibold">{money(kpis.expensesTotal)}</div>
              <div className="text-[11px] text-muted-foreground mt-1">Incl. taxes</div>
            </div>
            <div className="rounded-full bg-rose-500/10 p-2 text-rose-600"><TrendingUp className="h-5 w-5"/></div>
          </div>
        </div>
      </div>
      )}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-28"><SelectValue placeholder="Currency"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PKR">PKR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
              <div className="inline-flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={()=>setYear(y=>y-1)}><ChevronLeft className="w-4 h-4"/></Button>
                <span className="text-sm text-muted-foreground">{year}</span>
                <Button variant="outline" size="icon" onClick={()=>setYear(y=>y+1)}><ChevronRight className="w-4 h-4"/></Button>
                <Button variant="success" size="icon" onClick={load}><RefreshCw className="w-4 h-4"/></Button>
              </div>
              <Button variant={rangeMode==='yearly' ? 'secondary' : 'outline'} size="sm" onClick={()=>setRangeMode('yearly')}>Yearly</Button>
              <Button variant={rangeMode==='monthly' ? 'secondary' : 'outline'} size="sm" onClick={()=>setRangeMode('monthly')}>Monthly</Button>
              <Button variant={rangeMode==='custom' ? 'secondary' : 'outline'} size="sm" onClick={()=>setRangeMode('custom')}>Custom</Button>
              {rangeMode === 'monthly' && (
                <Select value={String(month)} onValueChange={(v)=>setMonth(Number(v))}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Month"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">January</SelectItem>
                    <SelectItem value="1">February</SelectItem>
                    <SelectItem value="2">March</SelectItem>
                    <SelectItem value="3">April</SelectItem>
                    <SelectItem value="4">May</SelectItem>
                    <SelectItem value="5">June</SelectItem>
                    <SelectItem value="6">July</SelectItem>
                    <SelectItem value="7">August</SelectItem>
                    <SelectItem value="8">September</SelectItem>
                    <SelectItem value="9">October</SelectItem>
                    <SelectItem value="10">November</SelectItem>
                    <SelectItem value="11">December</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {rangeMode === 'custom' && (
                <div className="inline-flex items-center gap-2">
                  <div className="w-40">
                    <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="From" />
                  </div>
                  <span className="text-sm text-muted-foreground">to</span>
                  <div className="w-40">
                    <DatePicker value={dateTo} onChange={setDateTo} placeholder="To" />
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1"><Filter className="w-4 h-4"/> Filter</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>Sections</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem checked={show.kpis} onCheckedChange={(v)=>setShow(s=>({...s, kpis: !!v}))}>KPI summary</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={show.invoices} onCheckedChange={(v)=>setShow(s=>({...s, invoices: !!v}))}>Invoices table</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={show.orders} onCheckedChange={(v)=>setShow(s=>({...s, orders: !!v}))}>Orders summary</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={show.contracts} onCheckedChange={(v)=>setShow(s=>({...s, contracts: !!v}))}>Contracts summary</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={show.expenses} onCheckedChange={(v)=>setShow(s=>({...s, expenses: !!v}))}>Expenses by client</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={show.items} onCheckedChange={(v)=>setShow(s=>({...s, items: !!v}))}>Top items</DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1"><FileDown className="w-4 h-4"/> Excel</Button>
              <Button variant="outline" size="sm" onClick={printTable} className="gap-1"><Printer className="w-4 h-4"/> Print</Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search" value={query} onChange={(e)=>setQuery(e.target.value)} className="pl-9 w-56" />
              </div>
            </div>
          </div>

          {show.invoices && (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Client</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>Invoice total</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>TAX</TableHead>
                <TableHead>Second TAX</TableHead>
                <TableHead>TDS</TableHead>
                <TableHead>Payment Received</TableHead>
                <TableHead>Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground"><div className="h-9 animate-pulse rounded bg-muted/50"/></TableCell></TableRow>
              ) : filteredAgg.length ? (
                filteredAgg.map((r) => {
                  const due = Math.max(0, r.total + r.tax1 + r.tax2 - r.paid - r.tds);
                  const display = r.clientId && clientNameById.get(String(r.clientId)) ? clientNameById.get(String(r.clientId))! : r.client;
                  return (
                    <TableRow key={`${r.clientId || r.client}`}>
                      <TableCell className="whitespace-nowrap">{r.clientId ? (<Link to={`/clients/${r.clientId}`}>{display}</Link>) : display}</TableCell>
                      <TableCell>{r.count}</TableCell>
                      <TableCell className="whitespace-nowrap">{money(r.total)}</TableCell>
                      <TableCell className="whitespace-nowrap">{money(r.discount)}</TableCell>
                      <TableCell className="whitespace-nowrap">{money(r.tax1)}</TableCell>
                      <TableCell className="whitespace-nowrap">{money(r.tax2)}</TableCell>
                      <TableCell className="whitespace-nowrap">{money(r.tds)}</TableCell>
                      <TableCell className="whitespace-nowrap">{money(r.paid)}</TableCell>
                      <TableCell className="whitespace-nowrap font-medium">{money(due)}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">No record found.</TableCell>
                </TableRow>
              )}
              {!loading && filteredAgg.length > 0 && (
                <TableRow className="bg-muted/30 font-medium">
                  <TableCell>Total</TableCell>
                  <TableCell>{filteredAgg.reduce((s,r)=>s+r.count,0)}</TableCell>
                  <TableCell className="whitespace-nowrap">{money(filteredAgg.reduce((s,r)=>s+r.total,0))}</TableCell>
                  <TableCell className="whitespace-nowrap">{money(filteredAgg.reduce((s,r)=>s+r.discount,0))}</TableCell>
                  <TableCell className="whitespace-nowrap">{money(filteredAgg.reduce((s,r)=>s+r.tax1,0))}</TableCell>
                  <TableCell className="whitespace-nowrap">{money(filteredAgg.reduce((s,r)=>s+r.tax2,0))}</TableCell>
                  <TableCell className="whitespace-nowrap">{money(filteredAgg.reduce((s,r)=>s+r.tds,0))}</TableCell>
                  <TableCell className="whitespace-nowrap">{money(filteredAgg.reduce((s,r)=>s+r.paid,0))}</TableCell>
                  <TableCell className="whitespace-nowrap">{money(Math.max(0, filteredAgg.reduce((s,r)=>s + (r.total + r.tax1 + r.tax2 - r.paid - r.tds),0)))}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>

      {show.invoiceDetails && (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-muted-foreground">Invoices detail</div>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>No.</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Issue date</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>TAX</TableHead>
                <TableHead>Second TAX</TableHead>
                <TableHead>TDS</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={14} className="text-center text-muted-foreground"><div className="h-9 animate-pulse rounded bg-muted/50"/></TableCell></TableRow>
              ) : invoiceDetails.length ? (
                <>
                  {invoiceDetails.map(r => {
                    const displayClient = r.clientId && clientNameById.get(String(r.clientId)) ? clientNameById.get(String(r.clientId))! : r.client;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap">{r.number}</TableCell>
                        <TableCell className="whitespace-nowrap">{r.clientId ? (<Link to={`/clients/${r.clientId}`}>{displayClient}</Link>) : displayClient}</TableCell>
                        <TableCell>{r.issueDate}</TableCell>
                        <TableCell>{r.dueDate}</TableCell>
                        <TableCell className="whitespace-nowrap">{money(r.amount)}</TableCell>
                        <TableCell className="whitespace-nowrap">{money(r.discount)}</TableCell>
                        <TableCell className="whitespace-nowrap">{money(r.tax1)}</TableCell>
                        <TableCell className="whitespace-nowrap">{money(r.tax2)}</TableCell>
                        <TableCell className="whitespace-nowrap">{money(r.tds)}</TableCell>
                        <TableCell className="whitespace-nowrap">{money(r.paid)}</TableCell>
                        <TableCell className="whitespace-nowrap">{money(r.total)}</TableCell>
                        <TableCell className="whitespace-nowrap font-medium">{money(r.due)}</TableCell>
                        <TableCell className="whitespace-nowrap">{r.status}</TableCell>
                        <TableCell>
                          <Link to={`/invoices/${r.id}`}>
                            <Button variant="outline" size="sm" className="gap-1"><Eye className="w-4 h-4"/> View</Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-muted/30 font-medium">
                    <TableCell colSpan={4}>Total</TableCell>
                    <TableCell className="whitespace-nowrap">{money(invoiceDetails.reduce((s,r)=>s+r.amount,0))}</TableCell>
                    <TableCell className="whitespace-nowrap">{money(invoiceDetails.reduce((s,r)=>s+r.discount,0))}</TableCell>
                    <TableCell className="whitespace-nowrap">{money(invoiceDetails.reduce((s,r)=>s+r.tax1,0))}</TableCell>
                    <TableCell className="whitespace-nowrap">{money(invoiceDetails.reduce((s,r)=>s+r.tax2,0))}</TableCell>
                    <TableCell className="whitespace-nowrap">{money(invoiceDetails.reduce((s,r)=>s+r.tds,0))}</TableCell>
                    <TableCell className="whitespace-nowrap">{money(invoiceDetails.reduce((s,r)=>s+r.paid,0))}</TableCell>
                    <TableCell className="whitespace-nowrap">{money(invoiceDetails.reduce((s,r)=>s+r.total,0))}</TableCell>
                    <TableCell className="whitespace-nowrap">{money(invoiceDetails.reduce((s,r)=>s+r.due,0))}</TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                </>
              ) : (
                <TableRow>
                  <TableCell colSpan={14} className="text-center text-muted-foreground">No record found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      )}

      {/* Orders summary (sales module) */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-muted-foreground">Orders summary</div>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Client</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordersAgg.length ? (
                ordersAgg.map((r) => {
                  const display = r.clientId && clientNameById.get(String(r.clientId)) ? clientNameById.get(String(r.clientId))! : r.client;
                  return (
                    <TableRow key={`${r.clientId || r.client}`}>
                      <TableCell className="whitespace-nowrap">{r.clientId ? (<Link to={`/clients/${r.clientId}`}>{display}</Link>) : display}</TableCell>
                      <TableCell>{r.count}</TableCell>
                      <TableCell className="whitespace-nowrap">{money(r.amount)}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">No record found.</TableCell>
                </TableRow>
              )}
              {ordersAgg.length > 0 && (
                <TableRow className="bg-muted/30 font-medium">
                  <TableCell>Total</TableCell>
                  <TableCell>{ordersAgg.reduce((s,r)=>s+r.count,0)}</TableCell>
                  <TableCell className="whitespace-nowrap">{money(ordersAgg.reduce((s,r)=>s+r.amount,0))}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Contracts summary (sales module) */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-muted-foreground">Contracts summary</div>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Client</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>TAX</TableHead>
                <TableHead>Second TAX</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contractsAgg.length ? (
                contractsAgg.map((r) => {
                  const display = r.clientId && clientNameById.get(String(r.clientId)) ? clientNameById.get(String(r.clientId))! : r.client;
                  return (
                    <TableRow key={`${r.clientId || r.client}`}>
                      <TableCell className="whitespace-nowrap">{r.clientId ? (<Link to={`/clients/${r.clientId}`}>{display}</Link>) : display}</TableCell>
                      <TableCell>{r.count}</TableCell>
                      <TableCell className="whitespace-nowrap">{money(r.amount)}</TableCell>
                      <TableCell className="whitespace-nowrap">{money(r.tax1)}</TableCell>
                      <TableCell className="whitespace-nowrap">{money(r.tax2)}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">No record found.</TableCell>
                </TableRow>
              )}
              {contractsAgg.length > 0 && (
                <TableRow className="bg-muted/30 font-medium">
                  <TableCell>Total</TableCell>
                  <TableCell>{contractsAgg.reduce((s,r)=>s+r.count,0)}</TableCell>
                  <TableCell className="whitespace-nowrap">{money(contractsAgg.reduce((s,r)=>s+r.amount,0))}</TableCell>
                  <TableCell className="whitespace-nowrap">{money(contractsAgg.reduce((s,r)=>s+r.tax1,0))}</TableCell>
                  <TableCell className="whitespace-nowrap">{money(contractsAgg.reduce((s,r)=>s+r.tax2,0))}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Expenses by client (sales module) */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-muted-foreground">Expenses by client</div>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Client</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>TAX</TableHead>
                <TableHead>Second TAX</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expensesAgg.length ? (
                expensesAgg.map((r) => {
                  const display = r.clientId && clientNameById.get(String(r.clientId)) ? clientNameById.get(String(r.clientId))! : "-";
                  return (
                    <TableRow key={`${r.clientId || '-'}`}>
                      <TableCell className="whitespace-nowrap">{r.clientId ? (<Link to={`/clients/${r.clientId}`}>{display}</Link>) : display}</TableCell>
                      <TableCell className="whitespace-nowrap">{money(r.amount)}</TableCell>
                      <TableCell className="whitespace-nowrap">{money(r.tax)}</TableCell>
                      <TableCell className="whitespace-nowrap">{money(r.tax2)}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">No record found.</TableCell>
                </TableRow>
              )}
              {expensesAgg.length > 0 && (
                <TableRow className="bg-muted/30 font-medium">
                  <TableCell>Total</TableCell>
                  <TableCell className="whitespace-nowrap">{money(expensesAgg.reduce((s,r)=>s+r.amount,0))}</TableCell>
                  <TableCell className="whitespace-nowrap">{money(expensesAgg.reduce((s,r)=>s+r.tax,0))}</TableCell>
                  <TableCell className="whitespace-nowrap">{money(expensesAgg.reduce((s,r)=>s+r.tax2,0))}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top items (invoices + orders) */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-muted-foreground">Top items (invoices + orders)</div>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Item</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsAgg.length ? (
                itemsAgg.map((r) => (
                  <TableRow key={r.name}>
                    <TableCell className="whitespace-nowrap">{r.name}</TableCell>
                    <TableCell>{r.qty}</TableCell>
                    <TableCell className="whitespace-nowrap">{money(r.amount)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">No record found.</TableCell>
                </TableRow>
              )}
              {itemsAgg.length > 0 && (
                <TableRow className="bg-muted/30 font-medium">
                  <TableCell>Total</TableCell>
                  <TableCell>{itemsAgg.reduce((s,r)=>s+r.qty,0)}</TableCell>
                  <TableCell className="whitespace-nowrap">{money(itemsAgg.reduce((s,r)=>s+r.amount,0))}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

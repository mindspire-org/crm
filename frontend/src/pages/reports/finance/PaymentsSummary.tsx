import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import ReportsNav from "../ReportsNav";
import { toast } from "@/components/ui/sonner";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";

type Payment = { _id: string; clientId?: string; client?: string; invoiceId?: string; amount?: number; date?: string; method?: string };
type Invoice = { _id: string; clientId?: string; client?: string };
type Client = { _id: string; name?: string; company?: string; person?: string };

export default function PaymentsSummary() {
  const [method, setMethod] = useState("-");
  const [currency, setCurrency] = useState("PKR");
  const [query, setQuery] = useState("");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  const load = async () => {
    try {
      setLoading(true);
      const [payRes, invRes, cliRes] = await Promise.all([
        fetch(`${API_BASE}/api/payments`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/invoices`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/clients`, { headers: getAuthHeaders() }),
      ]);
      const payData = payRes.ok ? await payRes.json() : [];
      const invData = invRes.ok ? await invRes.json() : [];
      const cliData = cliRes.ok ? await cliRes.json() : [];
      setPayments(Array.isArray(payData) ? payData : []);
      setInvoices(Array.isArray(invData) ? invData : []);
      setClients(Array.isArray(cliData) ? cliData : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const invById = useMemo(() => {
    const m = new Map<string, Invoice>();
    for (const i of invoices) if (i?._id) m.set(String(i._id), i);
    return m;
  }, [invoices]);

  const clientNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of clients) {
      const name = (c.name || c.company || c.person || "-").toString();
      m.set(String(c._id), name);
    }
    return m;
  }, [clients]);

  const filteredAgg = useMemo(() => {
    const y = Number(year);
    const matches = (s: string) => (s || "").toLowerCase().includes(query.trim().toLowerCase());
    const getYear = (dt?: string) => { if (!dt) return NaN; const d = new Date(dt); return d.getFullYear(); };
    const grp = new Map<string, { client: string; clientId?: string; count: number; amount: number }>();
    const inYear = payments.filter(p => !y || getYear(p.date as any) === y);
    const flt = inYear.filter(p => (method === "-" || (p.method || "-").toLowerCase() === method.toLowerCase()));
    for (const p of flt) {
      const inv = p.invoiceId ? invById.get(String(p.invoiceId)) : undefined;
      const resolvedClientId = (p.clientId || inv?.clientId) ? String(p.clientId || inv?.clientId) : undefined;
      const resolvedClient = (p.client || inv?.client || "-");
      if (query && !matches(resolvedClient)) continue;
      const key = resolvedClientId || resolvedClient;
      const row = grp.get(key) || { client: resolvedClient, clientId: resolvedClientId, count: 0, amount: 0 };
      row.count += 1;
      row.amount += Number(p.amount || 0);
      grp.set(key, row);
    }
    return Array.from(grp.values()).sort((a, b) => b.amount - a.amount);
  }, [payments, year, query, method]);

  const exportCSV = () => {
    const header = ["Client","Count","Amount"];
    const rows = filteredAgg.map(r => [r.client, r.count, r.amount]);
    const csv = [header, ...rows].map(row => row.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `payments_summary_${year}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const printTable = () => {
    const w = window.open("", "_blank"); if (!w) return;
    const rowsHtml = filteredAgg.map((r) => `<tr>
      <td>${r.client}</td>
      <td>${r.count}</td>
      <td>${r.amount.toLocaleString()}</td>
    </tr>`).join("");
    w.document.write(`<!doctype html><html><head><title>Payments summary ${year}</title></head><body>
      <h3>Payments summary (${year})</h3>
      <table border=\"1\" cellspacing=\"0\" cellpadding=\"6\">
        <thead><tr><th>Client</th><th>Count</th><th>Amount</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </body></html>`);
    w.document.close(); w.focus(); w.print(); w.close();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-sm text-muted-foreground">Payments summary</h1>
      </div>
      <ReportsNav />

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="w-40"><SelectValue placeholder="- Method -"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">- Method -</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
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
              <Button variant="outline" size="sm">Monthly</Button>
              <Button variant="outline" size="sm">Yearly</Button>
              <Button variant="outline" size="sm" disabled>Custom</Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportCSV}>Excel</Button>
              <Button variant="outline" size="sm" onClick={printTable}>Print</Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search" value={query} onChange={(e)=>setQuery(e.target.value)} className="pl-9 w-56" />
              </div>
            </div>
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
              {loading ? (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filteredAgg.length ? (
                filteredAgg.map((r) => {
                  const display = r.clientId && clientNameById.get(String(r.clientId)) ? clientNameById.get(String(r.clientId))! : r.client;
                  return (
                  <TableRow key={`${r.clientId || r.client}`}>
                    <TableCell className="whitespace-nowrap">{display}</TableCell>
                    <TableCell>{r.count}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.amount.toLocaleString()}</TableCell>
                  </TableRow>
                )})
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">No record found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

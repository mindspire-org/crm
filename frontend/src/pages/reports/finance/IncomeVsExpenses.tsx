import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import ReportsNav from "../ReportsNav";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";

export default function IncomeVsExpenses() {
  const [project, setProject] = useState("-");
  const [year, setYear] = useState(new Date().getFullYear());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const headers = getAuthHeaders();
        const [invRes, payRes, expRes] = await Promise.all([
          fetch(`${API_BASE}/api/invoices`, { headers }),
          fetch(`${API_BASE}/api/payments`, { headers }),
          fetch(`${API_BASE}/api/expenses`, { headers }),
        ]);
        const invData = invRes.ok ? await invRes.json() : [];
        const payData = payRes.ok ? await payRes.json() : [];
        const expData = expRes.ok ? await expRes.json() : [];
        setInvoices(Array.isArray(invData) ? invData : []);
        setPayments(Array.isArray(payData) ? payData : []);
        setExpenses(Array.isArray(expData) ? expData : []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const normalize = (s?: string) => (s || "").toLowerCase();
  const getYear = (d?: string) => { if (!d) return NaN; const x = new Date(d); return x.getFullYear(); };
  const monthName = (i: number) => new Date(year, i, 1).toLocaleString(undefined, { month: "short" });

  const monthly = useMemo(() => {
    const y = Number(year);
    const rows: { m: number; name: string; invoiced: number; received: number; expenses: number; net: number }[] = [];
    for (let m=0; m<12; m++) rows.push({ m, name: monthName(m), invoiced: 0, received: 0, expenses: 0, net: 0 });

    const invYear = (i:any) => i?.issueDate || i?.billDate || i?.createdAt || i?.dueDate;
    const invInYear = invoices.filter((i)=> !y || getYear(invYear(i)) === y);
    for (const i of invInYear) {
      const d = new Date(invYear(i)); const idx = d.getMonth();
      const base = Number(i.amount || 0);
      const tax1 = base * (Number(i.tax1 || 0) / 100);
      const tax2 = base * (Number(i.tax2 || 0) / 100);
      rows[idx].invoiced += base + tax1 + tax2;
    }
    const payInYear = payments.filter((p)=> !y || getYear(p?.date) === y);
    for (const p of payInYear) {
      const d = new Date(p.date); const idx = d.getMonth();
      rows[idx].received += Number(p.amount || 0);
    }
    const expInYear = expenses.filter((e)=> !y || getYear(e?.date) === y);
    for (const e of expInYear) {
      const d = new Date(e.date); const idx = d.getMonth();
      rows[idx].expenses += Number(e.amount || 0) + Number(e.tax || 0) + Number(e.tax2 || 0);
    }
    for (const r of rows) r.net = r.received - r.expenses;

    const q = normalize(query);
    return rows.filter(r => !q || normalize(r.name).includes(q));
  }, [invoices, payments, expenses, year, query]);

  const totals = useMemo(() => {
    const t = { invoiced: 0, received: 0, expenses: 0, net: 0 };
    for (const r of monthly) { t.invoiced += r.invoiced; t.received += r.received; t.expenses += r.expenses; t.net += r.net; }
    return t;
  }, [monthly]);

  const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "PKR" }).format(Number(n||0));

  const exportCSV = () => {
    const header = ["Month","Invoiced","Received","Expenses","Net"];
    const rows = monthly.map(r => [r.name, r.invoiced, r.received, r.expenses, r.net]);
    const csv = [header, ...rows].map(row => row.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `income_vs_expenses_${year}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const printTable = () => {
    const w = window.open("", "_blank"); if (!w) return;
    const rowsHtml = monthly.map(r => `<tr><td>${r.name}</td><td>${r.invoiced.toLocaleString()}</td><td>${r.received.toLocaleString()}</td><td>${r.expenses.toLocaleString()}</td><td>${r.net.toLocaleString()}</td></tr>`).join("");
    w.document.write(`<!doctype html><html><head><title>Income vs Expenses ${year}</title></head><body>
      <h3>Income vs Expenses (${year})</h3>
      <table border="1" cellspacing="0" cellpadding="6">
        <thead><tr><th>Month</th><th>Invoiced</th><th>Received</th><th>Expenses</th><th>Net</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </body></html>`);
    w.document.close(); w.focus(); w.print(); w.close();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-sm text-muted-foreground">Income vs Expenses</h1>
      </div>
      <ReportsNav />

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={project} onValueChange={setProject}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Project"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">Project</SelectItem>
                </SelectContent>
              </Select>
              <div className="inline-flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Summary</span>
                <Button variant="outline" size="icon" onClick={()=>setYear(y=>y-1)}><ChevronLeft className="w-4 h-4"/></Button>
                <span className="text-sm text-muted-foreground">{year}</span>
                <Button variant="outline" size="icon" onClick={()=>setYear(y=>y+1)}><ChevronRight className="w-4 h-4"/></Button>
                <Button variant="success" size="icon" onClick={()=>{ /* no-op refresh as data loads on mount */ }}><RefreshCw className="w-4 h-4"/></Button>
              </div>
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

          <div className="mb-3 rounded-lg border bg-muted/20 p-3 text-sm">
            <div className="flex gap-6">
              <div>Invoiced: <b>{money(totals.invoiced)}</b></div>
              <div>Received: <b>{money(totals.received)}</b></div>
              <div>Expenses: <b>{money(totals.expenses)}</b></div>
              <div>Net: <b>{money(totals.net)}</b></div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Month</TableHead>
                <TableHead>Invoiced</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Expenses</TableHead>
                <TableHead>Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground"><div className="h-9 animate-pulse rounded bg-muted/50"/></TableCell></TableRow>
              ) : monthly.length ? (
                <>
                  {monthly.map(r => (
                    <TableRow key={r.m}>
                      <TableCell>{r.name}</TableCell>
                      <TableCell className="whitespace-nowrap">{money(r.invoiced)}</TableCell>
                      <TableCell className="whitespace-nowrap">{money(r.received)}</TableCell>
                      <TableCell className="whitespace-nowrap">{money(r.expenses)}</TableCell>
                      <TableCell className="whitespace-nowrap font-medium">{money(r.net)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/30 font-medium">
                    <TableCell>Total</TableCell>
                    <TableCell className="whitespace-nowrap">{money(totals.invoiced)}</TableCell>
                    <TableCell className="whitespace-nowrap">{money(totals.received)}</TableCell>
                    <TableCell className="whitespace-nowrap">{money(totals.expenses)}</TableCell>
                    <TableCell className="whitespace-nowrap">{money(totals.net)}</TableCell>
                  </TableRow>
                </>
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">No record found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

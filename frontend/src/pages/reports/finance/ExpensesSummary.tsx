import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import ReportsNav from "../ReportsNav";
import { toast } from "@/components/ui/sonner";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";

type Expense = { _id: string; category?: string; amount?: number; tax?: number; tax2?: number; date?: string };

export default function ExpensesSummary() {
  const [query, setQuery] = useState("");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/expenses`, { headers: getAuthHeaders() });
      const data = res.ok ? await res.json() : [];
      setExpenses(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredAgg = useMemo(() => {
    const y = Number(year);
    const matches = (s: string) => (s || "").toLowerCase().includes(query.trim().toLowerCase());
    const getYear = (dt?: string) => { if (!dt) return NaN; const d = new Date(dt); return d.getFullYear(); };
    const grp = new Map<string, { category: string; count: number; amount: number; tax: number; tax2: number }>();
    const inYear = expenses.filter(e => !y || getYear(e.date as any) === y);
    const flt = inYear.filter(e => !query || matches(e.category || ""));
    for (const e of flt) {
      const key = e.category || "-";
      const row = grp.get(key) || { category: key, count: 0, amount: 0, tax: 0, tax2: 0 };
      row.count += 1;
      row.amount += Number(e.amount || 0);
      row.tax += Number(e.tax || 0);
      row.tax2 += Number(e.tax2 || 0);
      grp.set(key, row);
    }
    return Array.from(grp.values()).sort((a,b)=> b.amount - a.amount);
  }, [expenses, year, query]);

  const exportCSV = () => {
    const header = ["Category","Count","Amount","Tax A","Tax B","Total"];
    const rows = filteredAgg.map(r => [r.category, r.count, r.amount, r.tax, r.tax2, r.amount + r.tax + r.tax2]);
    const csv = [header, ...rows].map(row => row.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `expenses_summary_${year}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const printTable = () => {
    const w = window.open("", "_blank"); if (!w) return;
    const rowsHtml = filteredAgg.map((r) => `<tr>
      <td>${r.category}</td>
      <td>${r.count}</td>
      <td>${r.amount.toLocaleString()}</td>
      <td>${r.tax.toLocaleString()}</td>
      <td>${r.tax2.toLocaleString()}</td>
      <td>${(r.amount + r.tax + r.tax2).toLocaleString()}</td>
    </tr>`).join("");
    w.document.write(`<!doctype html><html><head><title>Expenses summary ${year}</title></head><body>
      <h3>Expenses summary (${year})</h3>
      <table border="1" cellspacing="0" cellpadding="6">
        <thead><tr><th>Category</th><th>Count</th><th>Amount</th><th>Tax A</th><th>Tax B</th><th>Total</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </body></html>`);
    w.document.close(); w.focus(); w.print(); w.close();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-sm text-muted-foreground">Expenses summary</h1>
      </div>
      <ReportsNav />

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={()=>setYear(y=>y-1)}><ChevronLeft className="w-4 h-4"/></Button>
                <span className="text-sm text-muted-foreground">{year}</span>
                <Button variant="outline" size="icon" onClick={()=>setYear(y=>y+1)}><ChevronRight className="w-4 h-4"/></Button>
                <Button variant="success" size="icon" onClick={load}><RefreshCw className="w-4 h-4"/></Button>
              </div>
              <Button variant="outline" size="sm">Yearly</Button>
              <Button variant="outline" size="sm" disabled>Monthly</Button>
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
                <TableHead>Category</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>TAX</TableHead>
                <TableHead>Second TAX</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filteredAgg.length ? (
                filteredAgg.map((r) => (
                  <TableRow key={r.category}>
                    <TableCell className="whitespace-nowrap">{r.category}</TableCell>
                    <TableCell>{r.count}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.amount.toLocaleString()}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.tax.toLocaleString()}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.tax2.toLocaleString()}</TableCell>
                    <TableCell className="whitespace-nowrap font-medium">{(r.amount + r.tax + r.tax2).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">No record found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

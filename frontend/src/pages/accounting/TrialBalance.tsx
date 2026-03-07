import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { 
  Scale, 
  Calculator, 
  Download, 
  FileText,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TrialBalance() {
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [basis, setBasis] = useState<"accrual" | "cash">("accrual");
  const [rows, setRows] = useState<any[]>([]);
  const [totals, setTotals] = useState<{debit:number;credit:number;balanced:boolean}>({debit:0,credit:0,balanced:true});
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    try {
      const sp = new URLSearchParams();
      if (from) sp.set("from", from);
      if (to) sp.set("to", to);
      if (basis) sp.set("basis", basis);
      const res = await fetch(`${API_BASE}/api/reports/trial-balance?${sp.toString()}` , { headers: { ...getAuthHeaders() } });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed");
      setRows(Array.isArray(json?.rows) ? json.rows : []);
      setTotals({ debit: Number(json?.totalDebit||0), credit: Number(json?.totalCredit||0), balanced: Boolean(json?.balanced) });
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  };

  const rowIndent = (level: number) => ({ paddingLeft: `${12 + Math.max(0, level) * 18}px` });

  return (
    <div className="p-4 space-y-4">
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-indigo-600/10 via-sky-500/5 to-emerald-500/10">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.25),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(14,165,233,0.20),transparent_35%),radial-gradient(circle_at_60%_90%,rgba(34,197,94,0.16),transparent_45%)]" />
        <div className="relative p-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Accounting</div>
            <div className="text-2xl font-semibold tracking-tight">Trial Balance</div>
            <div className="text-sm text-muted-foreground">Parent accounts roll up sub-accounts. Totals exclude rollups to avoid double counting.</div>
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <Select value={basis} onValueChange={(v: any) => setBasis(v)}>
              <SelectTrigger className="w-[170px] rounded-xl">
                <SelectValue placeholder="Basis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="accrual">Accrual Basis</SelectItem>
                <SelectItem value="cash">Cash Basis</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={load} disabled={busy} className="rounded-xl">
              {busy ? "Loading..." : "Refresh"}
            </Button>
            <Badge variant={busy ? "secondary" : totals.balanced ? "success" : "destructive"}>
              {totals.balanced ? <><CheckCircle className="w-3 h-3 mr-1" />Balanced</> : <><AlertCircle className="w-3 h-3 mr-1" />Not balanced</>}
            </Badge>
            <Badge variant="secondary">
              <TrendingUp className="w-3 h-3 mr-1" />
              Debit {totals.debit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Badge>
            <Badge variant="secondary">
              <TrendingDown className="w-3 h-3 mr-1" />
              Credit {totals.credit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Badge>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <div>
              <Label>From</Label>
              <DatePicker value={from} onChange={setFrom} placeholder="From" />
            </div>
            <div>
              <Label>To</Label>
              <DatePicker value={to} onChange={setTo} placeholder="To" />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={load} disabled={busy} className="w-full">
                <Scale className="w-4 h-4 mr-2" />
                Load
              </Button>
              <Button variant="outline" disabled={busy || rows.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto rounded-lg border">
            <table className="min-w-[860px] w-full text-sm">
              <thead className="bg-muted/30 sticky top-0 z-10">
                <tr className="text-left border-b">
                  <th className="py-3 px-3">Account</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3 text-right">Open Dr</th>
                  <th className="py-3 px-3 text-right">Open Cr</th>
                  <th className="py-3 px-3 text-right">Debit</th>
                  <th className="py-3 px-3 text-right">Credit</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r:any, i:number)=> (
                  <tr
                    key={i}
                    className={
                      "border-b border-border/50 hover:bg-muted/20 " +
                      (r.hasChildren ? "bg-muted/10" : "")
                    }
                  >
                    <td className="py-2 px-3" style={rowIndent(Number(r.level || 0))}>
                      <span className={r.hasChildren ? "font-semibold" : ""}>
                        {r.accountCode} · {r.accountName}
                      </span>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">{r.type}</td>
                    <td className="py-2 px-3 text-right">{Number(r.openingDebit||0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-2 px-3 text-right">{Number(r.openingCredit||0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-2 px-3 text-right">{Number(r.debit||0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-2 px-3 text-right">{Number(r.credit||0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
                {!busy && rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      No rows loaded yet. Choose a date range and click Load.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-muted/20">
                  <td colSpan={4} className="py-3 px-3 text-right font-medium">Totals</td>
                  <td className="py-3 px-3 text-right font-medium">{totals.debit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="py-3 px-3 text-right font-medium">{totals.credit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

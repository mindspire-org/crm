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
  BookOpen, 
  Search, 
  Download, 
  FileText,
  TrendingUp,
  TrendingDown,
  Calculator
} from "lucide-react";
import { toast } from "@/components/ui/sonner";

export default function GeneralLedger() {
  const [accountCode, setAccountCode] = useState("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [rows, setRows] = useState<any[]>([]);
  const [account, setAccount] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!accountCode.trim()) {
      toast.error("Account code is required");
      return;
    }
    setBusy(true);
    try {
      const sp = new URLSearchParams();
      if (from) sp.set("from", from);
      if (to) sp.set("to", to);
      sp.set("accountCode", accountCode.trim());
      const res = await fetch(`${API_BASE}/api/ledgers/general?${sp.toString()}`, {
        headers: { ...getAuthHeaders() },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load ledger");
      setAccount(json?.account || null);
      setRows(Array.isArray(json?.rows) ? json.rows : []);
      toast.success("Ledger loaded successfully");
    } catch (e: any) {
      toast.error(e?.message || "Failed to load ledger");
    } finally {
      setBusy(false);
    }
  };

  const totals = rows.reduce(
    (acc, r) => {
      acc.debit += Number(r.debit || 0);
      acc.credit += Number(r.credit || 0);
      return acc;
    },
    { debit: 0, credit: 0 }
  );

  return (
    <div className="p-4 space-y-4">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-indigo-600/10 via-sky-500/5 to-emerald-500/10">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.25),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(14,165,233,0.20),transparent_35%),radial-gradient(circle_at_60%_90%,rgba(34,197,94,0.16),transparent_45%)]" />
        <div className="relative p-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Accounting</div>
            <div className="text-2xl font-semibold tracking-tight">General Ledger</div>
            <div className="text-sm text-muted-foreground">Search entries for an account and view running balance.</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={busy ? "secondary" : "default"}>{busy ? "Loading…" : `${rows.length} entries`}</Badge>
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
              <Label>Account Code</Label>
              <Input value={accountCode} onChange={(e) => setAccountCode(e.target.value)} placeholder="e.g. 1000" />
            </div>
            <div>
              <Label>From</Label>
              <DatePicker value={from} onChange={setFrom} placeholder="From" />
            </div>
            <div>
              <Label>To</Label>
              <DatePicker value={to} onChange={setTo} placeholder="To" />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={load} disabled={!accountCode || busy} className="w-full">
                <Search className="w-4 h-4 mr-2" />
                Load ledger
              </Button>
              <Button variant="outline" disabled={busy || rows.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {account && (
            <div className="text-sm text-muted-foreground">{account.code} · {account.name}</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto rounded-lg border">
            <table className="min-w-[860px] w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="text-left border-b">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Ref</th>
                  <th className="py-3 px-3">Memo</th>
                  <th className="py-3 px-3 text-right">Debit</th>
                  <th className="py-3 px-3 text-right">Credit</th>
                  <th className="py-3 px-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="py-2 px-3 whitespace-nowrap">{String(r.date).slice(0,10)}</td>
                    <td className="py-2 px-3 whitespace-nowrap">{r.refNo || ""}</td>
                    <td className="py-2 px-3">{r.memo || ""}</td>
                    <td className="py-2 px-3 text-right">{Number(r.debit||0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-2 px-3 text-right">{Number(r.credit||0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-2 px-3 text-right font-medium">{Number(r.balance||0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
                {!busy && accountCode && rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      No entries found for this account and date range.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-muted/20">
                  <td colSpan={3} className="py-3 px-3 text-right font-medium">Totals</td>
                  <td className="py-3 px-3 text-right font-medium">{totals.debit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="py-3 px-3 text-right font-medium">{totals.credit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { toast } from "@/components/ui/sonner";

export default function VendorLedger() {
  const [vendorId, setVendorId] = useState("");
  const [vendors, setVendors] = useState<any[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!vendorId) {
      toast.error("Vendor ID is required");
      return;
    }
    setBusy(true);
    try {
      const sp = new URLSearchParams();
      if (from) sp.set("from", from);
      if (to) sp.set("to", to);
      sp.set("entityType", "vendor");
      sp.set("entityId", vendorId);
      const res = await fetch(`${API_BASE}/api/ledgers/entity?${sp.toString()}`, {
        headers: { ...getAuthHeaders() },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load ledger");
      setRows(Array.isArray(json?.rows) ? json.rows : []);
      toast.success("Vendor ledger loaded");
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/vendors`, {
          headers: { ...getAuthHeaders() },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load vendors");
        setVendors(Array.isArray(json) ? json : []);
      } catch (e: any) {
        toast.error(e?.message || "Failed to load vendors");
      }
    })();
  }, []);

  const exportCsv = () => {
    const header = ["Date", "Account", "Memo", "Debit", "Credit", "Balance"];
    const lines = rows.map((r: any) => [
      String(r.date).slice(0, 10),
      r.accountCode || "",
      (r.memo || "").replace(/\n|\r/g, " "),
      Number(r.debit || 0).toFixed(2),
      Number(r.credit || 0).toFixed(2),
      Number(r.balance || 0).toFixed(2),
    ]);
    const csv = [
      header,
      ...lines,
    ].map((cols) =>
      cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
    ).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vendor_ledger_${vendorId || "unknown"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPdf = () => {
    window.print();
  };

  const downloadStatementPdf = () => {
    if (!vendorId) {
      toast.error("Select a vendor first");
      return;
    }
    const sp = new URLSearchParams();
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    const url = `${API_BASE}/api/statements/vendor/${vendorId}?${sp.toString()}`;
    window.open(url, "_blank");
  };

  return (
    <div className="p-4 space-y-4">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-indigo-600/10 via-sky-500/5 to-emerald-500/10">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.25),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(14,165,233,0.20),transparent_35%),radial-gradient(circle_at_60%_90%,rgba(34,197,94,0.16),transparent_45%)]" />
        <div className="relative p-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Accounting</div>
            <div className="text-2xl font-semibold tracking-tight">Vendor Ledger</div>
            <div className="text-sm text-muted-foreground">Payables movements, statements, exports and printing.</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={busy ? "secondary" : "default"}>{busy ? "Loading…" : `${rows.length} rows`}</Badge>
            <Button variant="secondary" onClick={exportCsv} disabled={!rows.length}>
              Export CSV
            </Button>
            <Button variant="secondary" onClick={downloadStatementPdf} disabled={!rows.length}>
              Statement PDF
            </Button>
            <Button variant="secondary" onClick={printPdf} disabled={!rows.length}>
              Print
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <div className="lg:col-span-2">
              <Label>Vendor</Label>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor…" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v._id} value={v._id}>
                      {v.name}
                      {v.company ? ` - ${v.company}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>From</Label>
              <DatePicker value={from} onChange={setFrom} placeholder="From" />
            </div>
            <div>
              <Label>To</Label>
              <DatePicker value={to} onChange={setTo} placeholder="To" />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={load} disabled={!vendorId || busy}>
              Load ledger
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ledger entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto rounded-lg border">
            <table className="min-w-[860px] w-full text-sm print:w-full print:min-w-0">
              <thead className="bg-muted/30">
                <tr className="text-left border-b">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Account</th>
                  <th className="py-3 px-3">Memo</th>
                  <th className="py-3 px-3 text-right">Debit</th>
                  <th className="py-3 px-3 text-right">Credit</th>
                  <th className="py-3 px-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any, i: number) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="py-2 px-3 whitespace-nowrap">{String(r.date).slice(0, 10)}</td>
                    <td className="py-2 px-3 whitespace-nowrap">{r.accountCode}</td>
                    <td className="py-2 px-3">{r.memo || ""}</td>
                    <td className="py-2 px-3 text-right">{Number(r.debit || 0).toFixed(2)}</td>
                    <td className="py-2 px-3 text-right">{Number(r.credit || 0).toFixed(2)}</td>
                    <td className="py-2 px-3 text-right">{Number(r.balance || 0).toFixed(2)}</td>
                  </tr>
                ))}
                {!busy && vendorId && rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      No ledger entries found for the selected vendor and date range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

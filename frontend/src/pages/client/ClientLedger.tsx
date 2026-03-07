import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { toast } from "@/components/ui/sonner";

export default function ClientLedger() {
  const [clientId, setClientId] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const loadClient = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/client/me`, { headers: { ...getAuthHeaders() } });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load client");
      const id = json?.client?._id || json?.clientId || "";
      setClientId(id);
      if (!id) toast.error("No clientId linked to this user");
    } catch (e: any) {
      setMsg(e?.message || "Failed");
      toast.error(e?.message || "Failed to load profile");
    }
  };

  const load = async () => {
    if (!clientId) return;
    setBusy(true);
    setMsg("");
    try {
      const sp = new URLSearchParams();
      if (from) sp.set("from", from);
      if (to) sp.set("to", to);
      sp.set("entityType", "client");
      sp.set("entityId", clientId);
      const res = await fetch(`${API_BASE}/api/ledgers/entity?${sp.toString()}`, { headers: { ...getAuthHeaders() } });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed");
      setRows(Array.isArray(json?.rows) ? json.rows : []);
      toast.success("Ledger loaded");
    } catch (e: any) {
      setMsg(e?.message || "Failed");
      toast.error(e?.message || "Failed to load ledger");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { void loadClient(); }, []);

  const exportCsv = () => {
    const header = ["Date","Account","Memo","Debit","Credit","Balance"]; 
    const lines = rows.map((r:any)=> [
      String(r.date).slice(0,10),
      r.accountCode || "",
      (r.memo||"").replace(/\n|\r/g, " "),
      Number(r.debit||0).toFixed(2),
      Number(r.credit||0).toFixed(2),
      Number(r.balance||0).toFixed(2),
    ]);
    const csv = [header, ...lines].map((cols)=> cols.map((c)=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `client_ledger_${clientId || "me"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPdf = () => {
    window.print();
  };

  const downloadStatementPdf = () => {
    if (!clientId) {
      toast.error("No client ID");
      return;
    }
    const sp = new URLSearchParams();
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    const url = `${API_BASE}/api/statements/client/${clientId}?${sp.toString()}`;
    window.open(url, "_blank");
  };

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <Label>From</Label>
              <DatePicker value={from} onChange={setFrom} placeholder="From" />
            </div>
            <div>
              <Label>To</Label>
              <DatePicker value={to} onChange={setTo} placeholder="To" />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={load} disabled={!clientId || busy}>Load</Button>
              <Button variant="outline" disabled={busy || rows.length === 0} onClick={exportCsv}>Excel</Button>
              <Button variant="secondary" onClick={downloadStatementPdf} disabled={!rows.length}>Statement PDF</Button>
              <Button variant="secondary" onClick={printPdf} disabled={!rows.length}>Print</Button>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="min-w-[720px] w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-2">Date</th>
                  <th className="py-2 pr-2">Account</th>
                  <th className="py-2 pr-2">Memo</th>
                  <th className="py-2 pr-2 text-right">Debit</th>
                  <th className="py-2 pr-2 text-right">Credit</th>
                  <th className="py-2 pr-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r:any, i:number)=> (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-1 pr-2">{String(r.date).slice(0,10)}</td>
                    <td className="py-1 pr-2">{r.accountCode}</td>
                    <td className="py-1 pr-2">{r.memo || ""}</td>
                    <td className="py-1 pr-2 text-right">{Number(r.debit||0).toFixed(2)}</td>
                    <td className="py-1 pr-2 text-right">{Number(r.credit||0).toFixed(2)}</td>
                    <td className="py-1 pr-2 text-right">{Number(r.balance||0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {msg && <div className="text-sm text-destructive">{msg}</div>}
        </CardContent>
      </Card>
    </div>
  );
}

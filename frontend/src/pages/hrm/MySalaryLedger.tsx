import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { toast } from "@/components/ui/sonner";

export default function MySalaryLedger() {
  const [employeeId, setEmployeeId] = useState<string>("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const meRole = (() => {
    try {
      const raw = localStorage.getItem("auth_user") || sessionStorage.getItem("auth_user");
      if (!raw) return "";
      const u = JSON.parse(raw);
      return String(u?.role || "");
    } catch {
      return "";
    }
  })();

  const loadMyEmployeeId = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/attendance/members`, { headers: { ...getAuthHeaders() } });
      const json = await res.json().catch(() => []);
      if (!res.ok) throw new Error((json as any)?.error || "Failed to resolve employee");
      const first = Array.isArray(json) ? json[0] : null;
      const eid = first?.employeeId ? String(first.employeeId) : "";
      if (eid) {
        setEmployeeId(eid);
        return;
      }
      toast.error("No employee profile linked to this user");
    } catch (e: any) {
      toast.error(e?.message || "Failed to load profile");
    }
  };

  const loadEmployee = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/employees`, { headers: { ...getAuthHeaders() } });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load employee");
      const list = Array.isArray(json) ? json : [];
      setEmployees(list);
      const first = list[0] || null;
      const id = first?._id || "";
      if (!employeeId) setEmployeeId(id);
      if (!id) toast.error("No employee profile linked to this user");
    } catch (e: any) {
      setMsg(e?.message || "Failed");
      toast.error(e?.message || "Failed to load profile");
    }
  };

  const load = async () => {
    if (!employeeId) return;
    setBusy(true);
    setMsg("");
    try {
      const sp = new URLSearchParams();
      if (from) sp.set("from", from);
      if (to) sp.set("to", to);
      sp.set("entityType", "employee");
      sp.set("entityId", employeeId);
      const res = await fetch(`${API_BASE}/api/ledgers/entity?${sp.toString()}`, { headers: { ...getAuthHeaders() } });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed");
      setRows(Array.isArray(json?.rows) ? json.rows : []);
      toast.success("Salary ledger loaded");
    } catch (e: any) {
      setMsg(e?.message || "Failed");
      toast.error(e?.message || "Failed to load ledger");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { void loadEmployee(); }, []);

  useEffect(() => {
    if (meRole !== "staff") return;
    void loadMyEmployeeId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!employeeId) return;
    if (meRole !== "staff") return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const stats = useMemo(() => {
    const debit = (rows || []).reduce((a: number, r: any) => a + Number(r.debit || 0), 0);
    const credit = (rows || []).reduce((a: number, r: any) => a + Number(r.credit || 0), 0);
    const opening = rows?.length ? Number(rows?.[0]?.openingBalance ?? rows?.[0]?.balance ?? 0) : 0;
    const closing = rows?.length ? Number(rows?.[rows.length - 1]?.balance ?? 0) : 0;
    return { debit, credit, opening, closing, count: (rows || []).length };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const needle = (q || "").trim().toLowerCase();
    if (!needle) return rows;
    return (rows || []).filter((r: any) => {
      const s = `${r.accountCode || ""} ${r.memo || ""}`.toLowerCase();
      return s.includes(needle);
    });
  }, [q, rows]);

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
    a.download = `my_salary_ledger.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPdf = () => {
    window.print();
  };

  const downloadStatementPdf = () => {
    if (!employeeId) {
      toast.error("Select an employee first");
      return;
    }
    const sp = new URLSearchParams();
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    const url = `${API_BASE}/api/statements/employee/${employeeId}?${sp.toString()}`;
    window.open(url, "_blank");
  };

  return (
    <div className="p-4 space-y-4">
      <Card className="overflow-hidden">
        <div className="relative border-b bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950">
          <CardHeader className="relative">
            <CardTitle className="text-xl">My Salary Ledger</CardTitle>
            <div className="mt-1 text-sm text-muted-foreground">
              Track your salary transactions, export statements, and filter by date.
            </div>
          </CardHeader>
        </div>

        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-12">
            {meRole === "admin" && (
              <div className="lg:col-span-4">
                <Label>Employee</Label>
                <select
                  className="border rounded-md h-10 px-3 w-full bg-background"
                  value={employeeId}
                  onChange={(e)=>setEmployeeId(e.target.value)}
                >
                  <option value="">Select employee...</option>
                  {employees.map((e:any)=> (
                    <option key={e._id} value={e._id}>{e.name || e.email || e._id}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="lg:col-span-2">
              <Label>From</Label>
              <DatePicker value={from} onChange={setFrom} placeholder="From" />
            </div>
            <div className="lg:col-span-2">
              <Label>To</Label>
              <DatePicker value={to} onChange={setTo} placeholder="To" />
            </div>

            <div className="lg:col-span-4">
              <Label>Search</Label>
              <Input placeholder="Search memo or account..." value={q} onChange={(e)=>setQ(e.target.value)} />
            </div>

            <div className="lg:col-span-12 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={load} disabled={!employeeId || busy}>
                  {busy ? "Loading..." : "Load"}
                </Button>
                <Button variant="secondary" onClick={exportCsv} disabled={!rows.length}>Export CSV</Button>
                <Button variant="secondary" onClick={downloadStatementPdf} disabled={!rows.length}>Statement PDF</Button>
                <Button variant="secondary" onClick={printPdf} disabled={!rows.length}>Print</Button>
              </div>
              <div className="text-xs text-muted-foreground">
                Showing {filteredRows.length} of {rows.length} rows
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Opening</div>
              <div className="mt-1 text-2xl font-semibold">{Number(stats.opening || 0).toFixed(2)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Total debit</div>
              <div className="mt-1 text-2xl font-semibold">{Number(stats.debit || 0).toFixed(2)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Total credit</div>
              <div className="mt-1 text-2xl font-semibold">{Number(stats.credit || 0).toFixed(2)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Closing</div>
              <div className="mt-1 text-2xl font-semibold">{Number(stats.closing || 0).toFixed(2)}</div>
            </Card>
          </div>

          <div className="overflow-auto rounded-xl border">
            <table className="min-w-[820px] w-full text-sm">
              <thead>
                <tr className="text-left border-b bg-muted/40">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Account</th>
                  <th className="py-3 px-3">Memo</th>
                  <th className="py-3 px-3 text-right">Debit</th>
                  <th className="py-3 px-3 text-right">Credit</th>
                  <th className="py-3 px-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r:any, i:number)=> (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-3 whitespace-nowrap">{String(r.date).slice(0,10)}</td>
                    <td className="py-2 px-3 whitespace-nowrap">{r.accountCode}</td>
                    <td className="py-2 px-3">{r.memo || ""}</td>
                    <td className="py-2 px-3 text-right whitespace-nowrap">{Number(r.debit||0).toFixed(2)}</td>
                    <td className="py-2 px-3 text-right whitespace-nowrap">{Number(r.credit||0).toFixed(2)}</td>
                    <td className="py-2 px-3 text-right whitespace-nowrap">{Number(r.balance||0).toFixed(2)}</td>
                  </tr>
                ))}
                {!busy && !filteredRows.length && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      {rows.length ? "No results match your search." : "No ledger rows yet. Select a date range and click Load."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {msg && <div className="text-sm text-destructive">{msg}</div>}
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";

interface Period { _id?: string; name?: string; start: string; end: string; locked?: boolean; note?: string }

export default function AccountingPeriods() {
  const [items, setItems] = useState<Period[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState<Period>({ name: "", start: "", end: "", locked: false, note: "" });

  const load = async () => {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`${API_BASE}/api/accounting-periods`, { headers: { ...getAuthHeaders() } });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load");
      const mapped = (json || []).map((p: any) => ({ ...p, start: String(p.start).slice(0,10), end: String(p.end).slice(0,10) }));
      setItems(mapped);
    } catch (e: any) {
      setMsg(e?.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const create = async () => {
    setBusy(true);
    setMsg("");
    try {
      const payload = { ...form };
      const res = await fetch(`${API_BASE}/api/accounting-periods`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Create failed");
      setForm({ name: "", start: "", end: "", locked: false, note: "" });
      await load();
    } catch (e: any) {
      setMsg(e?.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  const toggleLock = async (p: Period) => {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`${API_BASE}/api/accounting-periods/${p._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ locked: !p.locked }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Update failed");
      await load();
    } catch (e: any) {
      setMsg(e?.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-indigo-600/10 via-sky-500/5 to-emerald-500/10">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.25),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(14,165,233,0.20),transparent_35%),radial-gradient(circle_at_60%_90%,rgba(34,197,94,0.16),transparent_45%)]" />
        <div className="relative p-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Accounting</div>
            <div className="text-2xl font-semibold tracking-tight">Accounting Periods</div>
            <div className="text-sm text-muted-foreground">Create and lock fiscal periods to prevent posting adjustments.</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={busy ? "secondary" : "default"}>{busy ? "Loading…" : `${items.length} periods`}</Badge>
            <Button variant="outline" onClick={load} disabled={busy}>Refresh</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Create period</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input value={form.name || ""} onChange={(e)=>setForm((s)=>({ ...s, name: e.target.value }))} placeholder="FY2026-2027" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                <div>
                  <Label>Start</Label>
                  <DatePicker value={form.start} onChange={(v)=>setForm((s)=>({ ...s, start: v }))} placeholder="Pick start date" />
                </div>
                <div>
                  <Label>End</Label>
                  <DatePicker value={form.end} onChange={(v)=>setForm((s)=>({ ...s, end: v }))} placeholder="Pick end date" />
                </div>
              </div>
            </div>
            <Button onClick={create} disabled={busy || !form.start || !form.end} className="w-full">Create</Button>
            {msg && <div className="text-sm text-muted-foreground">{msg}</div>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Periods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Separator />
            <div className="overflow-auto rounded-lg border">
              <table className="min-w-[860px] w-full text-sm">
                <thead className="bg-muted/30">
                  <tr className="text-left border-b">
                    <th className="py-3 px-3">Name</th>
                    <th className="py-3 px-3">Start</th>
                    <th className="py-3 px-3">End</th>
                    <th className="py-3 px-3">Locked</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p)=> (
                    <tr key={p._id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="py-2 px-3">{p.name || ""}</td>
                      <td className="py-2 px-3 whitespace-nowrap">{p.start}</td>
                      <td className="py-2 px-3 whitespace-nowrap">{p.end}</td>
                      <td className="py-2 px-3">{p.locked ? "Yes" : "No"}</td>
                      <td className="py-2 px-3 text-right">
                        <Button size="sm" variant={p.locked?"secondary":"default"} onClick={()=>toggleLock(p)} disabled={busy}>
                          {p.locked ? "Unlock" : "Lock"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!busy && items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">No periods found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { toast } from "@/components/ui/sonner";

export default function AccountingSettings() {
  const [settings, setSettings] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const parseSafe = async (res: Response) => {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return await res.json();
    const text = await res.text();
    throw new Error(text?.slice(0, 160) || "Unexpected response");
  };

  const load = async () => {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`${API_BASE}/api/accounting/settings`, { headers: { ...getAuthHeaders() } });
      const json = await parseSafe(res);
      if (!res.ok) throw new Error(json?.error || "Failed to load settings");
      setSettings(json);
    } catch (e: any) {
      setMsg(e?.message || "Failed");
      toast.error(e?.message || "Failed to load settings");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`${API_BASE}/api/accounting/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(settings || {}),
      });
      const json = await parseSafe(res);
      if (!res.ok) throw new Error(json?.error || "Failed to save settings");
      setSettings(json);
      setMsg("Saved");
      toast.success("Settings saved");
    } catch (e: any) {
      setMsg(e?.message || "Failed");
      toast.error(e?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const set = (k: string, v: any) => setSettings((s: any)=> ({ ...(s||{}), [k]: v }));

  return (
    <div className="p-4 space-y-4">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-indigo-600/10 via-sky-500/5 to-emerald-500/10">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.25),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(14,165,233,0.20),transparent_35%),radial-gradient(circle_at_60%_90%,rgba(34,197,94,0.16),transparent_45%)]" />
        <div className="relative p-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Accounting</div>
            <div className="text-2xl font-semibold tracking-tight">Settings</div>
            <div className="text-sm text-muted-foreground">Configure default accounts, currency, and fiscal year rules.</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={busy ? "secondary" : settings ? "default" : "secondary"}>{busy ? "Loading…" : settings ? "Loaded" : "Not loaded"}</Badge>
            <Button onClick={load} variant="outline" disabled={busy}>Reload</Button>
            <Button onClick={save} disabled={busy || !settings}>Save</Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <Label>Cash Account</Label>
              <Input value={settings?.cashAccount||""} onChange={(e)=>set("cashAccount", e.target.value)} placeholder="e.g. 1000" />
            </div>
            <div>
              <Label>Bank Account</Label>
              <Input value={settings?.bankAccount||""} onChange={(e)=>set("bankAccount", e.target.value)} placeholder="e.g. 1100" />
            </div>
            <div>
              <Label>Revenue Account</Label>
              <Input value={settings?.revenueAccount||""} onChange={(e)=>set("revenueAccount", e.target.value)} placeholder="e.g. 4000" />
            </div>
            <div>
              <Label>AR Parent</Label>
              <Input value={settings?.arParent||""} onChange={(e)=>set("arParent", e.target.value)} placeholder="e.g. 1200" />
            </div>
            <div>
              <Label>AP Parent</Label>
              <Input value={settings?.apParent||""} onChange={(e)=>set("apParent", e.target.value)} placeholder="e.g. 2100" />
            </div>
            <div>
              <Label>Salary Expense</Label>
              <Input value={settings?.salaryExpense||""} onChange={(e)=>set("salaryExpense", e.target.value)} placeholder="e.g. 5000" />
            </div>
            <div>
              <Label>Salary Payable Parent</Label>
              <Input value={settings?.salaryPayableParent||""} onChange={(e)=>set("salaryPayableParent", e.target.value)} placeholder="e.g. 2200" />
            </div>
            <div>
              <Label>Base Currency</Label>
              <Input value={settings?.baseCurrency||"PKR"} onChange={(e)=>set("baseCurrency", e.target.value)} placeholder="PKR" />
            </div>
            <div>
              <Label>Fiscal Start Month (1-12)</Label>
              <Input type="number" value={settings?.fiscalYearStartMonth||7} onChange={(e)=>set("fiscalYearStartMonth", Number(e.target.value))} />
            </div>
            <div>
              <Label>Fiscal Start Day (1-31)</Label>
              <Input type="number" value={settings?.fiscalYearStartDay||1} onChange={(e)=>set("fiscalYearStartDay", Number(e.target.value))} />
            </div>
          </div>

          <Separator />

          {msg && <div className="text-sm text-muted-foreground">{msg}</div>}
        </CardContent>
      </Card>
    </div>
  );
}

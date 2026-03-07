import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { toast } from "@/components/ui/sonner";
import { 
  Building2, 
  Plus, 
  Search, 
  Filter,
  Edit,
  Save,
  Trash2,
  Users,
  Mail,
  Phone,
  MapPin
} from "lucide-react";

export default function Vendors() {
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<{ name: string; company?: string; email?: string; phone?: string }>({ name: "", company: "" });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((v) => (v.name || "").toLowerCase().includes(s) || (v.company || "").toLowerCase().includes(s));
  }, [q, items]);

  const load = async () => {
    setBusy(true);
    try {
      const sp = new URLSearchParams();
      if (q.trim()) sp.set("q", q.trim());
      const res = await fetch(`${API_BASE}/api/vendors?${sp.toString()}`, { headers: { ...getAuthHeaders() } });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load vendors");
      setItems(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load vendors");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const create = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/vendors`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Create failed");
      setForm({ name: "", company: "" });
      toast.success("Vendor created");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Create failed");
    } finally {
      setBusy(false);
    }
  };

  const update = async (id: string, patch: any) => {
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/vendors/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Update failed");
      toast.success("Saved");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this vendor?")) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/vendors/${id}`, {
        method: "DELETE",
        headers: { ...getAuthHeaders() },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Delete failed");
      toast.success("Vendor deleted");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
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
            <div className="text-2xl font-semibold tracking-tight">Vendors</div>
            <div className="text-sm text-muted-foreground">Manage vendors for payables and statements.</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={busy ? "secondary" : "default"}>{busy ? "Loading…" : `${filtered.length} vendors`}</Badge>
            <Button variant="outline" onClick={load} disabled={busy}>
              <Search className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Add vendor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e)=>setForm((f)=>({ ...f, name: e.target.value }))} placeholder="Vendor name" />
              </div>
              <div>
                <Label>Company</Label>
                <Input value={form.company || ""} onChange={(e)=>setForm((f)=>({ ...f, company: e.target.value }))} placeholder="Company (optional)" />
              </div>
            </div>
            <Button onClick={create} disabled={busy || !form.name.trim()} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add vendor
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Directory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <Input className="sm:max-w-xs" placeholder="Search vendors..." value={q} onChange={(e)=>setQ(e.target.value)} />
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  <Building2 className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">Edit inline and Save per row.</div>
            </div>
            <Separator />
            <div className="overflow-auto rounded-lg border">
              <table className="min-w-[860px] w-full text-sm">
                <thead className="bg-muted/30">
                  <tr className="text-left border-b">
                    <th className="py-3 px-3">Name</th>
                    <th className="py-3 px-3">Company</th>
                    <th className="py-3 px-3">Email</th>
                    <th className="py-3 px-3">Phone</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((v)=> (
                    <tr key={v._id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="py-2 px-3">
                        <Input value={v.name} onChange={(e)=> setItems((arr)=> arr.map((x)=> x._id===v._id? { ...x, name: e.target.value }: x))} />
                      </td>
                      <td className="py-2 px-3">
                        <Input value={v.company||""} onChange={(e)=> setItems((arr)=> arr.map((x)=> x._id===v._id? { ...x, company: e.target.value }: x))} />
                      </td>
                      <td className="py-2 px-3">
                        <Input value={v.email||""} onChange={(e)=> setItems((arr)=> arr.map((x)=> x._id===v._id? { ...x, email: e.target.value }: x))} />
                      </td>
                      <td className="py-2 px-3">
                        <Input value={v.phone||""} onChange={(e)=> setItems((arr)=> arr.map((x)=> x._id===v._id? { ...x, phone: e.target.value }: x))} />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Button size="sm" variant="outline" onClick={()=> update(v._id, { name: v.name, company: v.company, email: v.email, phone: v.phone })}>
                            <Save className="w-3 h-3 mr-1" />
                            Save
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => remove(v._id)} disabled={busy}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!busy && filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">No vendors found.</td>
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

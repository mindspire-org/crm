import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";

export type Department = {
  _id?: string;
  name: string;
  description?: string;
  head?: string;
  isActive?: boolean;
  createdAt?: string;
};

export default function Departments() {
  const [items, setItems] = useState<Department[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [head, setHead] = useState("");
  const [isActive, setIsActive] = useState(true);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter((d) => d.name.toLowerCase().includes(q) || (d.description || "").toLowerCase().includes(q));
  }, [items, query]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setHead("");
    setIsActive(true);
    setEditingId(null);
  };

  const refresh = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/departments?active=`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {}
  };

  useEffect(() => {
    refresh();
  }, []);

  const onSave = async () => {
    try {
      const payload = { name, description, head, isActive };
      if (editingId) {
        const res = await fetch(`${API_BASE}/api/departments/${editingId}`, {
          method: "PUT",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          window.alert(data.error || "Failed to update department");
          return;
        }
        toast.success("Department updated");
      } else {
        const res = await fetch(`${API_BASE}/api/departments`, {
          method: "POST",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          window.alert(data.error || "Failed to create department");
          return;
        }
        toast.success("Department created");
      }
      setOpen(false);
      resetForm();
      await refresh();
      window.dispatchEvent(new Event("departmentsUpdated"));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      window.alert(`Request failed: ${msg}`);
    }
  };

  const startEdit = (d: Department) => {
    setEditingId(d._id || null);
    setName(d.name || "");
    setDescription(d.description || "");
    setHead(d.head || "");
    setIsActive(d.isActive !== false);
    setOpen(true);
  };

  const onDelete = async (d: Department) => {
    const ok = window.confirm(`Delete department "${d.name}"?`);
    if (!ok || !d._id) return;
    try {
      const res = await fetch(`${API_BASE}/api/departments/${d._id}`, { method: "DELETE", headers: getAuthHeaders() });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        window.alert(data.error || "Failed to delete department");
        return;
      }
      toast.success("Department deleted");
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      window.alert(`Request failed: ${msg}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm text-muted-foreground">HRM</h1>
          <h2 className="text-xl font-semibold mt-1">Departments</h2>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Search departments" value={query} onChange={(e)=>setQuery(e.target.value)} className="w-56" />
          <Dialog open={open} onOpenChange={(o)=>{ setOpen(o); if(!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button variant="gradient" size="sm">Add Department</Button>
            </DialogTrigger>
            <DialogContent className="bg-card">
              <DialogHeader>
                <DialogTitle>{editingId?"Edit Department":"Add Department"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input placeholder="e.g. Engineering" value={name} onChange={(e)=>setName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Textarea rows={3} placeholder="Short description" value={description} onChange={(e)=>setDescription(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Head of Department</Label>
                  <Input placeholder="e.g. John Doe" value={head} onChange={(e)=>setHead(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="active" checked={isActive} onCheckedChange={(v)=>setIsActive(Boolean(v))} />
                  <Label htmlFor="active">Active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={()=>{ setOpen(false); resetForm(); }}>Close</Button>
                <Button onClick={onSave} disabled={!name.trim()}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((d) => (
              <div key={d._id || d.name} className="border rounded-md p-3 bg-card">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{d.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{d.description}</div>
                    <div className="text-xs text-muted-foreground mt-1">Head: {d.head || "-"}</div>
                    <div className="text-xs mt-2">
                      <span className={`px-2 py-0.5 rounded ${d.isActive!==false?"bg-emerald-600/15 text-emerald-600":"bg-muted text-muted-foreground"}`}>
                        {d.isActive!==false?"Active":"Inactive"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={()=>startEdit(d)}>Edit</Button>
                    <Button variant="destructive" size="sm" onClick={()=>onDelete(d)}>Delete</Button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-sm text-muted-foreground">No departments found.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

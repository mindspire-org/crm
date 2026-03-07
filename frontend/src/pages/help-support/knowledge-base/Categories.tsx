import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, BookOpen, Edit2, Trash2 } from "lucide-react";

type HelpCategory = { _id?: string; name: string; description?: string; updatedAt?: string };

export default function KnowledgeBaseCategories() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<HelpCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<HelpCategory | null>(null);
  const [form, setForm] = useState<HelpCategory>({ name: "", description: "" });

  const list = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(a => a.name.toLowerCase().includes(q));
  }, [items, query]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/help/categories?scope=kb`).then(r=>r.json());
      setItems(Array.isArray(r)?r:[]);
    } finally { setLoading(false); }
  };

  useEffect(()=>{ fetchAll(); }, []);

  const startNew = () => { setEditing(null); setForm({ name: "", description: "" }); setOpen(true); };
  const startEdit = (it: HelpCategory) => { setEditing(it); setForm({ name: it.name, description: it.description||"" }); setOpen(true); };

  const save = async () => {
    const payload = { ...form, scope: "kb" } as any;
    const res = await fetch(`/api/help/categories${editing?`/${editing._id}`:""}`, {
      method: editing?"PUT":"POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return;
    setOpen(false); setEditing(null); setForm({ name: "", description: "" });
    await fetchAll();
  };

  const remove = async (id?: string) => {
    if (!id) return;
    const res = await fetch(`/api/help/categories/${id}`, { method: "DELETE" });
    if (res.ok) await fetchAll();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold flex items-center gap-2"><BookOpen className="w-5 h-5"/> Knowledge base - Categories</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search" value={query} onChange={(e)=>setQuery(e.target.value)} className="pl-9 w-64" />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2" onClick={startNew}><Plus className="w-4 h-4"/> Add category</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editing?"Edit category":"Add category"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  <Label className="md:text-right text-muted-foreground">Name</Label>
                  <Input placeholder="Name" className="md:col-span-4" value={form.name} onChange={(e)=>setForm(f=>({...f,name:e.target.value}))} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  <Label className="md:text-right text-muted-foreground">Description</Label>
                  <Input placeholder="Description" className="md:col-span-4" value={form.description} onChange={(e)=>setForm(f=>({...f,description:e.target.value}))} />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={()=>setOpen(false)}>Close</Button>
                <Button onClick={save}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Name</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={3}>Loading...</TableCell></TableRow>
              ) : list.length ? (
                list.map(r => (
                  <TableRow key={String(r._id)}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{r.updatedAt ? new Date(r.updatedAt).toLocaleString() : ""}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="icon" variant="outline" onClick={()=>startEdit(r)}><Edit2 className="w-4 h-4"/></Button>
                        <Button size="icon" variant="destructive" onClick={()=>remove(r._id)}><Trash2 className="w-4 h-4"/></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">No record found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

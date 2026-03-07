import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Trash2, Edit2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API_BASE } from "@/lib/api/base";

type HelpArticle = { _id?: string; title: string; content: string; categoryId?: string; tags?: string[]; updatedAt?: string };
type HelpCategory = { _id: string; name: string };

export default function HelpSupportArticles() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<HelpArticle[]>([]);
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<HelpArticle | null>(null);
  const [form, setForm] = useState<HelpArticle>({ title: "", content: "", categoryId: "" });
  const [error, setError] = useState("");

  const getJson = async (path: string) => {
    try {
      const res = await fetch(`${API_BASE}${path}`);
      const ct = res.headers.get("content-type") || "";
      if (res.ok && ct.includes("application/json")) return await res.json();
    } catch {}
    return [] as any[];
  };

  const sendJson = async (path: string, method: string, body?: any) => {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const ct = res.headers.get("content-type") || "";
      if (res.ok && (!ct || ct.includes("application/json"))) return res;
    } catch {}
    return new Response(null, { status: 500 });
  };

  const list = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(a => a.title.toLowerCase().includes(q) || (a.content||"").toLowerCase().includes(q));
  }, [items, query]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const a = await getJson(`/api/help/articles?scope=help`);
      const c = await getJson(`/api/help/categories?scope=help`);
      setItems(Array.isArray(a)?a:[]);
      setCategories(Array.isArray(c)?c:[]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const startNew = () => { setEditing(null); setForm({ title: "", content: "", categoryId: "" }); setOpen(true); };
  const startEdit = (it: HelpArticle) => { setEditing(it); setForm({ title: it.title, content: it.content||"", categoryId: it.categoryId }); setOpen(true); };

  const save = async () => {
    setError("");
    const payload = { ...form, scope: "help" } as any;
    if (!payload.title || !payload.title.trim()) { setError("Title is required"); return; }
    if (!payload.categoryId) delete payload.categoryId;
    const method = editing?"PUT":"POST";
    const res = await sendJson(`/api/help/articles${editing?`/${editing._id}`:""}`, method, payload);
    if (!res.ok) {
      try { const j = await res.json(); setError(j?.error || "Failed to save"); } catch { setError("Failed to save"); }
      return;
    }
    setOpen(false); setEditing(null); setForm({ title: "", content: "", categoryId: "" });
    await fetchAll();
  };

  const remove = async (id: string) => {
    if (!id) return;
    const res = await sendJson(`/api/help/articles/${id}`, "DELETE");
    if (res.ok) await fetchAll();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold">Help - Articles</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search" value={query} onChange={(e)=>setQuery(e.target.value)} className="pl-9 w-64" />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2" onClick={startNew}><Plus className="w-4 h-4"/> Add article</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>{editing?"Edit article":"Add article"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  <Label className="md:text-right text-muted-foreground">Title</Label>
                  <Input placeholder="Title" className="md:col-span-4" value={form.title} onChange={(e)=>setForm(f=>({...f,title:e.target.value}))} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  <Label className="md:text-right text-muted-foreground">Category</Label>
                  <div className="md:col-span-4">
                    <Select value={form.categoryId||""} onValueChange={(v)=>setForm(f=>({...f, categoryId: v||""}))}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent position="popper" className="z-[1000]">
                        {categories.length ? (
                          categories.map(c => <SelectItem key={String(c._id)} value={String(c._id)}>{c.name}</SelectItem>)
                        ) : (
                          <SelectItem value="__none__" disabled>No categories found</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
                  <Label className="md:text-right pt-2 text-muted-foreground">Content</Label>
                  <Textarea placeholder="Write the article..." className="md:col-span-4 min-h-[200px]" value={form.content} onChange={(e)=>setForm(f=>({...f,content:e.target.value}))} />
                </div>
                {error ? <div className="text-sm text-red-600">{error}</div> : null}
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
                <TableHead>Title</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={3}>Loading...</TableCell></TableRow>
              ) : list.length ? (
                list.map((r)=> (
                  <TableRow key={String(r._id)}>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{r.updatedAt ? new Date(r.updatedAt).toLocaleString() : ""}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="icon" variant="outline" onClick={()=>startEdit(r)}><Edit2 className="w-4 h-4"/></Button>
                        <Button size="icon" variant="destructive" onClick={()=>r._id && remove(r._id)}><Trash2 className="w-4 h-4"/></Button>
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

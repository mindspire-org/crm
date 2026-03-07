import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, Edit, X, Paperclip } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { API_BASE } from "@/lib/api/base";

interface Item {
  _id: string;
  title: string;
  description?: string;
  category?: string;
  unit?: string;
  rate?: number;
  showInClientPortal?: boolean;
  image?: string;
}

export default function Items() {
  const [items, setItems] = useState<Item[]>([]);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("-");
  const [openAdd, setOpenAdd] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [editing, setEditing] = useState<Item | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("general");
  const [unit, setUnit] = useState("");
  const [rate, setRate] = useState("");
  const [showInClientPortal, setShowInClientPortal] = useState(false);
  const [image, setImage] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const url = `${API_BASE}/api/items${query ? `?q=${encodeURIComponent(query)}` : ""}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      } catch {}
    })();
  }, [query]);

  const list = useMemo(()=> {
    const q = query.toLowerCase();
    return (items || []).filter(i => (i.title || "").toLowerCase().includes(q));
  }, [items, query]);

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setDesc("");
    setCategory("general");
    setUnit("");
    setRate("");
    setShowInClientPortal(false);
    setImage("");
    setOpenAdd(true);
  };
  const openEdit = (it: Item) => {
    setEditing(it);
    setTitle(it.title || "");
    setDesc(it.description || "");
    setCategory(it.category || "general");
    setUnit(it.unit || "");
    setRate(String(it.rate ?? 0));
    setShowInClientPortal(Boolean(it.showInClientPortal));
    setImage(it.image || "");
    setOpenAdd(true);
  };

  const chooseImage = () => {
    fileInputRef.current?.click();
  };

  const onFilePicked = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (result) setImage(result);
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    try {
      const payload:any = {
        title,
        description: desc,
        category,
        unit,
        rate: Number(rate || 0),
        showInClientPortal,
        image,
      };
      const method = editing ? "PUT" : "POST";
      const url = editing ? `${API_BASE}/api/items/${editing._id}` : `${API_BASE}/api/items`;
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        let msg = "Failed to save item";
        try {
          const err = await res.json();
          if (err?.error) msg = String(err.error);
        } catch {}
        toast({ title: "Save failed", description: msg, variant: "destructive" });
        return;
      }
      const updated = await res.json();
      setOpenAdd(false);
      setItems(prev => {
        if (editing) return prev.map(p => String(p._id) === String(updated._id) ? updated : p);
        return [updated, ...prev];
      });
      toast({ title: "Saved", description: "Item saved successfully" });
    } catch {}
  };

  const remove = async (it: Item) => {
    if (!confirm("Delete this item?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/items/${it._id}`, { method: "DELETE" });
      if (!res.ok) return;
      setItems(prev => prev.filter(p => String(p._id) !== String(it._id)));
    } catch {}
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-sm text-muted-foreground">Items</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">Import items</Button>
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild><Button variant="outline" size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-2"/>Add item</Button></DialogTrigger>
            <DialogContent className="bg-card">
              <DialogHeader><DialogTitle>{editing ? "Edit item" : "Add item"}</DialogTitle></DialogHeader>
              <div className="grid gap-3 sm:grid-cols-12">
                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Title</div>
                <div className="sm:col-span-9"><Input placeholder="Title" value={title} onChange={(e)=>setTitle(e.target.value)} /></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Description</div>
                <div className="sm:col-span-9"><Textarea placeholder="Description" className="min-h-[96px]" value={desc} onChange={(e)=>setDesc(e.target.value)} /></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Category</div>
                <div className="sm:col-span-9">
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="General item" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General item</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Unit type</div>
                <div className="sm:col-span-9"><Input placeholder="Unit type (Ex: hours, pc, etc.)" value={unit} onChange={(e)=>setUnit(e.target.value)} /></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Rate</div>
                <div className="sm:col-span-9"><Input placeholder="Rate" value={rate} onChange={(e)=>setRate(e.target.value)} /></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-1 text-sm text-muted-foreground">Show in client portal</div>
                <div className="sm:col-span-9 flex items-center gap-2"><Checkbox id="showClient" checked={showInClientPortal} onCheckedChange={(v)=>setShowInClientPortal(Boolean(v))} /><label htmlFor="showClient" className="text-sm"> </label></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Image</div>
                <div className="sm:col-span-9">
                  {image ? (
                    <div className="flex items-center gap-3">
                      <img src={image} alt="Item" className="h-16 w-16 rounded object-cover border" />
                      <Button variant="outline" size="sm" onClick={()=>setImage("")}>Remove</Button>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No image selected</div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <div className="w-full flex items-center justify-between">
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e)=>onFilePicked(e.target.files?.[0] || null)}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={chooseImage}><Paperclip className="w-4 h-4 mr-2"/>Upload Image</Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={()=>setOpenAdd(false)}>Close</Button>
                    <Button onClick={save}>Save</Button>
                  </div>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Select value={cat} onValueChange={setCat}>
                <SelectTrigger className="w-40"><SelectValue placeholder="- Category -"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">- Category -</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">Excel</Button>
              <Button variant="outline" size="sm">Print</Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search" value={query} onChange={(e)=>setQuery(e.target.value)} className="pl-9 w-56" />
              </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit type</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead className="w-14"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((i)=> (
                <TableRow key={String(i._id)}>
                  <TableCell className="text-primary underline cursor-pointer">{i.title}</TableCell>
                  <TableCell className="text-muted-foreground">{i.description || ""}</TableCell>
                  <TableCell>{i.category || "general"}</TableCell>
                  <TableCell>{i.unit || ""}</TableCell>
                  <TableCell>{i.rate ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={()=>openEdit(i)}><Edit className="w-4 h-4"/></Button>
                      <Button variant="ghost" size="icon-sm" onClick={()=>remove(i)}><X className="w-4 h-4"/></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

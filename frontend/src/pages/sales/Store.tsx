import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "@/lib/api/base";

interface Item {
  _id: string;
  title: string;
  description?: string;
  category?: string;
  unit?: string;
  rate?: number;
  image?: string;
}

export default function Store() {
  const [items, setItems] = useState<Item[]>([]);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("-");
  const [cart, setCart] = useState<string[]>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("store_cart") || "[]");
      if (!Array.isArray(raw)) return [];
      return raw.map((x) => String(x));
    } catch {
      return [];
    }
  });
  const [detail, setDetail] = useState<Item | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editRate, setEditRate] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        if (cat !== "-") params.set("category", cat);
        const url = `${API_BASE}/api/items${params.toString() ? `?${params.toString()}` : ""}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      } catch {}
    })();
  }, [query, cat]);

  const filtered = useMemo(
    () =>
      items.filter((i) => {
        const q = query.toLowerCase();
        if (q && !(i.title || "").toLowerCase().includes(q)) return false;
        if (cat !== "-" && String(i.category || "") !== String(cat)) return false;
        return true;
      }),
    [items, query, cat]
  );

  const inCart = (id: string) => cart.includes(id);
  const toggleCart = (id: string) =>
    setCart((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem("store_cart", JSON.stringify(next));
      } catch {}
      return next;
    });
  const openDetails = (it: Item) => { setDetail(it); };
  const openEdit = (it: Item) => {
    setDetail(it);
    setEditTitle(it.title);
    setEditDesc(it.description || "");
    setEditUnit(it.unit || "");
    setEditRate(String(it.rate ?? 0));
    setEditOpen(true);
  };
  const saveEdit = async () => {
    if (!detail) return;
    try {
      const payload: any = {
        title: editTitle,
        description: editDesc,
        unit: editUnit,
        rate: Number(editRate) || 0,
      };
      const res = await fetch(`${API_BASE}/api/items/${detail._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return;
      const updated = await res.json();
      setItems((prev) => prev.map((i) => (String(i._id) === String(updated._id) ? updated : i)));
      setDetail(updated);
    } catch {}
    setEditOpen(false);
  };
  const checkout = () => {
    try {
      const list = items.filter((i) => cart.includes(String(i._id)));
      const payload = list.map((i) => ({
        itemId: i._id,
        name: i.title,
        description: i.description || "",
        quantity: 1,
        unit: i.unit || "",
        rate: Number(i.rate || 0),
      }));
      localStorage.setItem("order_items", JSON.stringify(payload));
    } catch {}
    navigate("/sales/checkout");
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-sm text-muted-foreground">Store</h1>
        <Button variant="gradient" size="sm" onClick={checkout}>Checkout</Button>
      </div>

      <div className="flex items-center gap-2">
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-40"><SelectValue placeholder="- Category -"/></SelectTrigger>
          <SelectContent>
            <SelectItem value="-">- Category -</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="services">Services</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="Search" value={query} onChange={(e)=>setQuery(e.target.value)} className="w-60" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((i)=> (
          <Card key={String(i._id)} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="relative group">
                {i.image ? (
                  <img
                    src={i.image}
                    alt={i.title}
                    className="h-28 w-full object-cover bg-muted"
                  />
                ) : (
                  <div className="h-28 bg-muted flex items-center justify-center text-4xl text-muted-foreground">🛒</div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <Button variant="outline" onClick={()=>openDetails(i)}>View details</Button>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold">{i.title}</h3>
                <div className="text-destructive font-semibold mt-1">Rs.{Number(i.rate || 0).toLocaleString()}</div>
                <div className="text-sm text-muted-foreground mt-1">{i.description || '-'}</div>
                <div className="grid gap-2 mt-3">
                  <Button className="w-full" variant={inCart(String(i._id))?"secondary":"default"} onClick={()=>toggleCart(String(i._id))}>
                    {inCart(String(i._id))?"Added to cart":"Add to cart"}
                  </Button>
                  <Button className="w-full" variant="outline" onClick={()=>openDetails(i)}>View details</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Item details dialog */}
      <Dialog open={!!detail} onOpenChange={(v)=>{ if(!v) setDetail(null); }}>
        <DialogContent className="bg-card max-w-md" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Item details</DialogTitle></DialogHeader>
          {detail && (
            <div>
              {detail.image ? (
                <img src={detail.image} alt={detail.title} className="w-full h-40 object-cover rounded border" />
              ) : null}
              <div className="font-semibold">{detail.title}</div>
              <div className="inline-block bg-purple-600 text-white px-2 py-1 rounded mt-2">Rs.{Number(detail.rate || 0).toLocaleString()}</div>
              <div className="text-sm mt-4">{detail.description || '-'}</div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={()=> setDetail(null)}>Close</Button>
            <Button onClick={()=> { if(detail) openEdit(detail); }}>Edit item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit item dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card max-w-md" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Edit item</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="sm:col-span-4 sm:text-right sm:pt-2 text-sm text-muted-foreground">Title</div>
            <div className="sm:col-span-8"><Input value={editTitle} onChange={(e)=>setEditTitle(e.target.value)} /></div>

            <div className="sm:col-span-4 sm:text-right sm:pt-2 text-sm text-muted-foreground">Description</div>
            <div className="sm:col-span-8"><Textarea placeholder="Description" value={editDesc} onChange={(e)=>setEditDesc(e.target.value)} className="min-h-[72px]"/></div>

            <div className="sm:col-span-4 sm:text-right sm:pt-2 text-sm text-muted-foreground">Unit type</div>
            <div className="sm:col-span-8"><Input placeholder="Unit type (Ex: hours, pc, etc.)" value={editUnit} onChange={(e)=>setEditUnit(e.target.value)} /></div>

            <div className="sm:col-span-4 sm:text-right sm:pt-2 text-sm text-muted-foreground">Rate</div>
            <div className="sm:col-span-8"><Input type="number" value={editRate} onChange={(e)=>setEditRate(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setEditOpen(false)}>Close</Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

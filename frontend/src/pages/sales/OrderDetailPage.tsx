import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { Copy, Download, FileText, Mail, Plus, Printer, Trash2 } from "lucide-react";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const brand = {
  name: "HealthSpire",
  phone: "+92 312 7231875",
  email: "info@healthspire.org",
  website: "www.healthspire.org",
  address: "761/D2 Shah Jelani Rd Township Lahore",
  logo: "/HealthSpire%20logo.png",
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [openItem, setOpenItem] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [itemRate, setItemRate] = useState("0");
  const [itemDesc, setItemDesc] = useState("");
  const [itemUnit, setItemUnit] = useState("");

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [itemToDeleteIdx, setItemToDeleteIdx] = useState<number | null>(null);
  const [confirmCloneOpen, setConfirmCloneOpen] = useState(false);

  const brand = {
    name: "HealthSpire",
    phone: "+92 312 7231875",
    email: "info@healthspire.org",
    website: "www.healthspire.org",
    address: "761/D2 Shah Jelani Rd Township Lahore",
    logo: "/HealthSpire%20logo.png",
  };

  useEffect(() => {
    if (sp.get("print") === "1") {
      setTimeout(() => window.print(), 400);
    }
  }, [sp]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/orders/${id}`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          setOrder(data);
          setItems(Array.isArray(data.items) ? data.items : []);
        }
      } catch {}
    })();
  }, [id]);

  const subtotal = useMemo(() => (items || []).reduce((s: number, it: any) => s + (Number(it.quantity||0) * Number(it.rate||0)), 0), [items]);

  const saveItems = async (nextItems: any[]) => {
    if (!order?._id) return;
    const amount = nextItems.reduce((s, it) => s + (Number(it.quantity||0) * Number(it.rate||0)), 0);
    const r = await fetch(`${API_BASE}/api/orders/${order._id}`, {
      method: "PUT",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ items: nextItems, amount })
    });
    if (r.ok) {
      setItems(nextItems);
      setOrder({ ...(order||{}), items: nextItems, amount });
    }
  };

  const openAddItem = () => {
    setEditingItemIndex(null);
    setItemName(""); setItemDesc(""); setItemUnit(""); setItemQty("1"); setItemRate("0");
    setOpenItem(true);
  };
  const openEditItem = (idx: number) => {
    const it = items[idx];
    setEditingItemIndex(idx);
    setItemName(it?.name || "");
    setItemDesc(it?.description || "");
    setItemQty(String(it?.quantity ?? 1));
    setItemRate(String(it?.rate ?? 0));
    setItemUnit(it?.unit || "");
    setOpenItem(true);
  };
  const saveItem = async () => {
    const it = {
      name: itemName,
      description: itemDesc,
      quantity: Number(itemQty)||0,
      rate: Number(itemRate)||0,
      unit: itemUnit,
      total: (Number(itemQty)||0) * (Number(itemRate)||0),
    };
    const next = [...items];
    if (editingItemIndex == null) next.push(it); else next[editingItemIndex] = it;
    await saveItems(next);
    setOpenItem(false);
  };
  const deleteItem = async (idx: number) => {
    const next = items.filter((_: any, i: number) => i !== idx);
    await saveItems(next);
  };

  const handleCloneOrder = async () => {
    if (!order) return;
    const clone = { ...order };
    delete clone._id; delete clone.createdAt; delete clone.updatedAt; delete clone.__v; delete clone.number;
    try {
      const r = await fetch(`${API_BASE}/api/orders`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(clone)
      });
      if (r.ok) {
        const n = await r.json();
        toast.success("Order cloned");
        navigate(`/sales/orders/${n._id}`);
      }
    } catch {
      toast.error("Failed to clone order");
    }
  };

  const formatClient = (o: any) => {
    return o?.client || "-";
  };

  if (!order) return <div className="p-4">Loading…</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{order.number || `ORDER`}</h1>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" size="sm">Actions</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/sales/orders/${id}`)}><FileText className="w-4 h-4 mr-2"/>Preview</DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.open(`/sales/orders/${id}?print=1`, "_blank")!}><Download className="w-4 h-4 mr-2"/>Download PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.open(`/sales/orders/${id}?print=1`, "_blank")!}><Printer className="w-4 h-4 mr-2"/>Print</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setConfirmCloneOpen(true)}><Copy className="h-4 w-4 mr-2"/>Clone Order</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { const mail = `mailto:?subject=${encodeURIComponent(order.number || "Order")}&body=${encodeURIComponent(window.location.origin + "/sales/orders/" + id)}`; window.location.href = mail; }}><Mail className="w-4 h-4 mr-2"/>Email order to client</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList className="mb-3">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="invoices" disabled>Invoices</TabsTrigger>
          <TabsTrigger value="payments" disabled>Invoice payment list</TabsTrigger>
          <TabsTrigger value="tasks" disabled>Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <Card className="lg:col-span-8">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <img src={brand.logo} alt="HealthSpire" className="h-10 w-auto" />
                    <div className="text-sm">
                      <div className="font-semibold">{brand.name}</div>
                      <div className="text-muted-foreground">{brand.address}</div>
                      <div className="text-muted-foreground">Email: {brand.email}</div>
                      <div className="text-muted-foreground">Website: {brand.website}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-block bg-purple-600 text-white px-3 py-1 rounded text-sm font-semibold">{order.number || "ORDER"}</div>
                    <div className="text-xs text-muted-foreground mt-2">Order date: {order.orderDate ? new Date(order.orderDate).toISOString().slice(0,10) : "-"}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <div className="font-semibold mb-1">Order from</div>
                    <div className="text-muted-foreground">{formatClient(order)}</div>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-muted-foreground">No record found.</TableCell></TableRow>
                    ) : (
                      items.map((it, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <div className="font-medium">{it.name}</div>
                            <div className="text-xs text-muted-foreground">{it.description || "-"}</div>
                          </TableCell>
                          <TableCell>{it.quantity}</TableCell>
                          <TableCell>{it.rate}</TableCell>
                          <TableCell>Rs.{(Number(it.quantity||0) * Number(it.rate||0)).toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={()=>openEditItem(idx)}>Edit</Button>
                            <Button size="sm" variant="destructive" className="ml-2" onClick={() => { setItemToDeleteIdx(idx); setConfirmDeleteOpen(true); }}>Delete</Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Button size="sm" variant="outline" className="rounded-full bg-muted hover:bg-muted/80" onClick={openAddItem}><Plus className="w-4 h-4 mr-2"/>Add item</Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={3}></TableCell>
                      <TableCell className="font-medium">Sub Total</TableCell>
                      <TableCell>Rs.{subtotal.toLocaleString()}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="lg:col-span-4">
              <CardContent className="p-4 text-sm">
                <div className="mb-4"><div className="text-muted-foreground">Client</div><div className="font-medium">{formatClient(order)}</div></div>
                <div className="mb-4"><div className="text-muted-foreground">Status</div><div><Badge variant={order.status === "completed" ? "success" : order.status === "processing" ? "secondary" : "destructive"}>{order.status || "new"}</Badge></div></div>
                <div className="mb-4"><div className="text-muted-foreground">Reminders (Private)</div><Button size="sm" variant="ghost" className="px-2 py-1 mt-1 rounded bg-purple-50 text-purple-700 hover:bg-purple-100">+ Add reminder</Button></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Item Dialog */}
      <Dialog open={openItem} onOpenChange={setOpenItem}>
        <DialogContent className="bg-card max-w-md" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{editingItemIndex == null ? "Add item" : "Edit item"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-4 sm:text-right sm:pt-2 text-sm text-muted-foreground">Item</div>
            <div className="sm:col-span-8"><Input placeholder="Item name" value={itemName} onChange={(e)=>setItemName(e.target.value)} /></div>

            <div className="sm:col-span-4 sm:text-right sm:pt-2 text-sm text-muted-foreground">Description</div>
            <div className="sm:col-span-8"><Textarea placeholder="Description" value={itemDesc} onChange={(e)=>setItemDesc(e.target.value)} className="min-h-[72px]"/></div>

            <div className="sm:col-span-4 sm:text-right sm:pt-2 text-sm text-muted-foreground">Quantity</div>
            <div className="sm:col-span-8"><Input type="number" value={itemQty} onChange={(e)=>setItemQty(e.target.value)} /></div>

            <div className="sm:col-span-4 sm:text-right sm:pt-2 text-sm text-muted-foreground">Unit type</div>
            <div className="sm:col-span-8"><Input placeholder="Unit type (Ex: hours, pc, etc.)" value={itemUnit} onChange={(e)=>setItemUnit(e.target.value)} /></div>

            <div className="sm:col-span-4 sm:text-right sm:pt-2 text-sm text-muted-foreground">Rate</div>
            <div className="sm:col-span-8"><Input type="number" value={itemRate} onChange={(e)=>setItemRate(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setOpenItem(false)}>Close</Button>
            <Button onClick={saveItem}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        onConfirm={() => itemToDeleteIdx !== null && deleteItem(itemToDeleteIdx)}
        title="Delete Item"
        description="Are you sure you want to delete this item?"
        variant="destructive"
      />

      <ConfirmDialog
        open={confirmCloneOpen}
        onOpenChange={setConfirmCloneOpen}
        onConfirm={handleCloneOrder}
        title="Clone Order"
        description="Are you sure you want to clone this order?"
        confirmText="Clone"
      />
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";

interface OrderItem { itemId?: string; name: string; description?: string; quantity: number; unit?: string; rate: number; }

export default function Checkout() {
  const [items, setItems] = useState<OrderItem[]>(() => {
    try { return JSON.parse(localStorage.getItem("order_items") || "[]"); } catch { return []; }
  });
  const [clients, setClients] = useState<any[]>([]);
  const [clientId, setClientId] = useState<string>("");
  const [note, setNote] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/clients`, { headers: getAuthHeaders() });
        if (res.ok) setClients(await res.json());
      } catch {}
    })();
  }, []);

  const subTotal = useMemo(() => items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.rate || 0), 0), [items]);

  useEffect(() => {
    try {
      localStorage.setItem("order_items", JSON.stringify(items));
    } catch {}
  }, [items]);

  const updateItem = (idx: number, patch: Partial<OrderItem>) => {
    setItems(prev => prev.map((i, x) => x === idx ? { ...i, ...patch } : i));
  };
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, x) => x !== idx));
  const addItem = () => setItems(prev => [...prev, { name: "New item", description: "", quantity: 1, unit: "", rate: 0 }]);

  const placeOrder = async () => {
    try {
      const client = clients.find((c:any)=> String(c._id) === String(clientId));
      const payload = {
        clientId: clientId || undefined,
        client: client ? (client.company || client.person || "") : "",
        items: items.map(it => ({
          itemId: it.itemId,
          name: it.name,
          description: it.description,
          quantity: it.quantity,
          unit: it.unit,
          rate: it.rate,
          total: Number(it.quantity||0) * Number(it.rate||0),
        })),
        note,
        orderDate: new Date(),
      };
      const res = await fetch(`${API_BASE}/api/orders`, { method: "POST", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
      if (!res.ok) return;
      const created = await res.json();
      try { localStorage.removeItem("order_items"); localStorage.removeItem("store_cart"); } catch {}
      navigate(`/sales/orders/${created._id}`);
    } catch {}
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-sm text-muted-foreground">Process Order</h1>
        <Button onClick={placeOrder} disabled={!items.length || !clientId}>Place order</Button>
      </div>

      <Card>
        <CardContent className="p-4">
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
              {items.map((it, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <div className="font-medium">{it.name}</div>
                    <div className="text-xs text-muted-foreground">{it.description || "-"}</div>
                  </TableCell>
                  <TableCell className="w-32">
                    <Input type="number" value={it.quantity} onChange={(e)=>updateItem(idx, { quantity: Number(e.target.value)||0 })} />
                  </TableCell>
                  <TableCell className="w-40">
                    <Input type="number" value={it.rate} onChange={(e)=>updateItem(idx, { rate: Number(e.target.value)||0 })} />
                  </TableCell>
                  <TableCell className="font-medium">Rs.{(Number(it.quantity||0)*Number(it.rate||0)).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="destructive" size="sm" onClick={()=>removeItem(idx)}>Remove</Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={5}>
                  <Button variant="outline" size="sm" onClick={addItem}>Add item</Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={3}></TableCell>
                <TableCell className="font-semibold">Sub Total</TableCell>
                <TableCell className="font-semibold">Rs.{subTotal.toLocaleString()}</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <div className="grid gap-4 sm:grid-cols-2 mt-6">
            <div>
              <div className="text-sm font-semibold mb-1">Client</div>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c:any)=> (
                    <SelectItem key={String(c._id)} value={String(c._id)}>{c.company || c.person || "-"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-sm font-semibold mb-1">Note</div>
              <Textarea placeholder="Note" value={note} onChange={(e)=>setNote(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, RefreshCw, Search, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";

export default function Orders() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("-");
  const [pageSize, setPageSize] = useState("10");
  const [openAdd, setOpenAdd] = useState(false);
  const [orderDate, setOrderDate] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const url = `${API_BASE}/api/orders${query ? `?q=${encodeURIComponent(query)}` : ""}`;
        const res = await fetch(url, { headers: getAuthHeaders() });
        if (!res.ok) return;
        setOrders(await res.json());
      } catch {}
    })();
  }, [query]);

  return (
    <div className="space-y-3 sm:space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-sm text-muted-foreground">Orders</h1>
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full sm:w-auto"><Plus className="w-4 h-4 mr-2"/>Add order</Button>
          </DialogTrigger>
          <DialogContent className="bg-card">
            <DialogHeader><DialogTitle>Add order</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="space-y-1"><label className="text-sm">Client</label><Input placeholder="Client"/></div>
              <div className="space-y-1"><label className="text-sm">Amount</label><Input placeholder="0.00"/></div>
              <div className="space-y-1"><label className="text-sm">Order date</label><DatePicker value={orderDate} onChange={setOrderDate} placeholder="Pick date" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={()=>setOpenAdd(false)}>Close</Button>
              <Button onClick={()=>setOpenAdd(false)}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="icon" className="shrink-0"><Calendar className="w-4 h-4"/></Button>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-32 sm:w-40 shrink-0"><SelectValue placeholder="- Status -"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">- Status -</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" className="text-xs">Monthly</Button>
                <Button variant="outline" size="sm" className="text-xs">Yearly</Button>
                <Button variant="outline" size="sm" className="text-xs hidden sm:inline-flex">Custom</Button>
                <Button variant="outline" size="sm" className="text-xs hidden sm:inline-flex">Dynamic</Button>
                <Button variant="outline" size="sm" className="text-xs hidden md:inline-flex">December 2025</Button>
              </div>
              <Button variant="success" size="icon" className="shrink-0"><RefreshCw className="w-4 h-4"/></Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="hidden sm:inline-flex">Excel</Button>
              <Button variant="outline" size="sm" className="hidden sm:inline-flex">Print</Button>
              <div className="relative flex-1 sm:flex-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search" value={query} onChange={(e)=>setQuery(e.target.value)} className="pl-9 w-full sm:w-56" />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto -mx-4 px-4">
            <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Order</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Invoices</TableHead>
                <TableHead>Order date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 sm:py-12 text-muted-foreground text-sm">
                    No record found
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((o: any) => (
                  <TableRow key={String(o._id)} className="cursor-pointer" onClick={() => navigate(`/sales/orders/${o._id}`)}>
                    <TableCell className="text-primary underline" onClick={(e) => { e.stopPropagation(); navigate(`/sales/orders/${o._id}`); }}>{o.number || "ORDER"}</TableCell>
                    <TableCell>{o.client || "-"}</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>{o.orderDate ? new Date(o.orderDate).toISOString().slice(0, 10) : "-"}</TableCell>
                    <TableCell>Rs.{Number(o.amount || 0).toLocaleString()}</TableCell>
                    <TableCell>{o.status || "new"}</TableCell>
                    <TableCell className="text-right">✎</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>

          <div className="flex flex-row items-center justify-between gap-3 p-3 border-t mt-2">
            <div className="flex items-center gap-2 text-sm flex-1">
              <Select value={pageSize} onValueChange={setPageSize}>
                <SelectTrigger className="w-16 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs sm:text-sm whitespace-nowrap">0-0 / 0</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button variant="outline" size="sm" className="px-2 sm:px-3">‹</Button>
              <Button variant="outline" size="sm" className="px-2 sm:px-3">›</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Printer } from "lucide-react";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [inv, setInv] = useState<any | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/invoices/${id}`, { headers: getAuthHeaders() });
        if (r.ok) setInv(await r.json());
      } catch {}
    })();
  }, [id]);

  const idText = inv?.number ? `INVOICE #${inv.number}` : `Invoice`;
  const formatClient = (c: any) => {
    if (!c) return "-";
    if (typeof c === "string") return c;
    return c.name || c.company || c.person || "-";
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display">{idText}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(`/invoices/${id}/preview`)}>
            <Eye className="w-4 h-4 mr-2"/>Preview
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline"><MoreHorizontal className="w-4 h-4"/></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => window.print()}><Printer className="w-4 h-4 mr-2"/>Print</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/invoices/${id}/preview`)}><Eye className="w-4 h-4 mr-2"/>Preview</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-start gap-4">
            <img src="/HealthSpire%20logo.png" alt="HealthSpire" className="h-16"/>
            <div className="text-sm text-muted-foreground">HealthSpire</div>
            <div className="ml-auto">
              <Badge>{idText}</Badge>
              <div className="text-xs text-muted-foreground mt-1">
                Bill date: {inv?.issueDate ? new Date(inv.issueDate).toISOString().slice(0,10) : "-"}<br/>
                Due date: {inv?.dueDate ? new Date(inv.dueDate).toISOString().slice(0,10) : "-"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
            <div>
              <div className="text-muted-foreground">Bill From</div>
              <div>HealthSpire</div>
            </div>
            <div>
              <div className="text-muted-foreground">Bill To</div>
              <div>{formatClient(inv?.client)}</div>
            </div>
          </div>

          <Table className="mt-6">
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="w-32">Quantity</TableHead>
                <TableHead className="w-32">Rate</TableHead>
                <TableHead className="w-32 text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inv?.items?.length ? (
                inv.items.map((it:any, idx:number)=> (
                  <TableRow key={idx}>
                    <TableCell>{it.name || it.title || "-"}</TableCell>
                    <TableCell>{it.quantity ?? it.qty ?? "-"}</TableCell>
                    <TableCell>{it.rate ?? "-"}</TableCell>
                    <TableCell className="text-right">{it.total ?? "-"}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell>Invoice amount</TableCell>
                  <TableCell>1</TableCell>
                  <TableCell>{inv?.amount ?? "-"}</TableCell>
                  <TableCell className="text-right">{inv?.amount ?? "-"}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="mt-6 grid grid-cols-2">
            <div></div>
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between"><div>Sub Total</div><div>{inv?.amount ?? "-"}</div></div>
              <div className="flex items-center justify-between"><div>Discount</div><div>Rs.{(inv?.discount || 0).toLocaleString()}</div></div>
              <div className="flex items-center justify-between font-medium"><div>Balance Due</div><div>{inv?.amount ?? "-"}</div></div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm space-y-3">
            <div><span className="text-muted-foreground">Client:</span> {formatClient(inv?.client)}</div>
            <div><span className="text-muted-foreground">Status:</span> <Badge variant={inv?.status === 'Paid' ? 'success' : inv?.status === 'Partially paid' ? 'secondary' : 'outline'}>{inv?.status || 'Unpaid'}</Badge></div>
            <div><span className="text-muted-foreground">Last email sent:</span> Never</div>
            <Button className="w-full mt-2" variant="outline">Add payment</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

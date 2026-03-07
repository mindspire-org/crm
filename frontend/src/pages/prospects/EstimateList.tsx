import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";

type Row = {
  id: string;
  number: string;
  client: string;
  estimateDate: string;
  amount: number;
  status: "Draft"|"Sent"|"Accepted"|"Declined";
  approvalStatus?: "Pending"|"Approved"|"Rejected";
  createdBy?: any;
  advancedAmount: number;
};

export default function EstimateList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("-");
  const [openAdd, setOpenAdd] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  // add form state
  const [estimateDate, setEstimateDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [client, setClient] = useState("");
  const [clientOptions, setClientOptions] = useState<string[]>([]);
  const [tax, setTax] = useState<string>("-");
  const [tax2, setTax2] = useState<string>("-");
  const [note, setNote] = useState("");
  const [advancedAmount, setAdvancedAmount] = useState<string>("");

  const urlClientId = useMemo(() => {
    const sp = new URLSearchParams(location.search || "");
    return String(sp.get("clientId") || "").trim();
  }, [location.search]);

  const urlAdd = useMemo(() => {
    const sp = new URLSearchParams(location.search || "");
    const v = String(sp.get("add") || "").trim();
    return v === "1" || v.toLowerCase() === "true";
  }, [location.search]);

  useEffect(() => {
    (async () => {
      try {
        const sp = new URLSearchParams();
        if (query) sp.set("q", query);
        if (status && status !== "-") sp.set("status", status);
        if (urlClientId) sp.set("clientId", urlClientId);
        const url = `${API_BASE}/api/estimates${sp.toString() ? `?${sp.toString()}` : ""}`;
        const res = await fetch(url, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        const mapped: Row[] = (Array.isArray(data) ? data : []).map((d:any)=> ({
          id: String(d._id||""),
          number: d.number || "-",
          client: d.client || "-",
          estimateDate: d.estimateDate ? new Date(d.estimateDate).toISOString().slice(0,10) : "-",
          amount: Number(d.amount||0),
          status: (d.status as any) || "Draft",
          approvalStatus: (d.approvalStatus as any) || "Approved",
          createdBy: d.createdBy,
          advancedAmount: Number(d.advancedAmount||0),
        }));
        setRows(mapped);
      } catch {}
    })();
  }, [query, status, urlClientId]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/clients`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        const names: string[] = (Array.isArray(data) ? data : []).map((c:any)=> c.company || c.person).filter(Boolean);
        setClientOptions(names);
        if (!client && names.length) setClient(names[0]);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!urlClientId) return;
      try {
        const res = await fetch(`${API_BASE}/api/clients/${encodeURIComponent(urlClientId)}`, { headers: getAuthHeaders() });
        const row = await res.json().catch(() => null);
        if (!res.ok) return;
        const name = String(row?.company || row?.person || "").trim();
        if (name) setClient(name);
      } catch {}
    })();
  }, [urlClientId]);

  useEffect(() => {
    if (!urlAdd) return;
    setOpenAdd(true);
  }, [urlAdd]);

  const save = async () => {
    try {
      const payload: any = {
        client,
        estimateDate: estimateDate ? new Date(estimateDate) : undefined,
        validUntil: validUntil ? new Date(validUntil) : undefined,
        tax: tax === "-" ? 0 : Number(tax),
        tax2: tax2 === "-" ? 0 : Number(tax2),
        note: note || undefined,
        advancedAmount: advancedAmount ? Number(advancedAmount) : 0,
        items: [],
      };
      const res = await fetch(`${API_BASE}/api/estimates`, { method: "POST", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
      if (!res.ok) { const e = await res.json().catch(()=>null); toast.error(e?.error || "Failed to add estimate"); return; }
      const d = await res.json();
      const row: Row = { id: String(d._id||""), number: d.number || "-", client: d.client || client || "-", estimateDate: d.estimateDate ? new Date(d.estimateDate).toISOString().slice(0,10) : (estimateDate || "-"), amount: Number(d.amount||0), status: (d.status as any) || "Draft", approvalStatus: (d.approvalStatus as any) || "Approved", advancedAmount: Number(d.advancedAmount||0) };
      setRows((prev)=> [row, ...prev]);
      setOpenAdd(false);
      toast.success("Estimate created");
    } catch {}
  };

  const convertToProposal = async (est: Row) => {
    if (!confirm("This will create a new Proposal based on this Estimate. Continue?")) return;
    try {
      // Fetch the full estimate details to get items
      const resEst = await fetch(`${API_BASE}/api/estimates/${est.id}`, { headers: getAuthHeaders() });
      if (!resEst.ok) throw new Error("Failed to fetch estimate details");
      const fullEst = await resEst.json();

      const payload = {
        title: `Proposal for ${est.number}`,
        client: est.client,
        amount: est.amount,
        status: "draft",
        proposalDate: new Date().toISOString(),
        items: (fullEst.items || []).map((it: any) => ({
          name: it.name || it.title || "Item",
          qty: it.quantity || it.qty || 1,
          rate: it.rate || 0
        })),
        note: `Generated from Estimate #${est.number}`
      };
      const r = await fetch(`${API_BASE}/api/proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        const d = await r.json();
        toast.success("Proposal created successfully");
        navigate(`/prospects/proposals/${d._id}`);
      } else {
        throw new Error("Failed to create proposal");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to convert to proposal");
    }
  };

  const deleteEstimate = async (estimateId: string) => {
    if (!confirm("Delete this estimate?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/estimates/${estimateId}`, { method: "DELETE", headers: getAuthHeaders() });
      if (!res.ok) return toast.error("Failed to delete estimate");
      setRows((prev) => prev.filter((r) => r.id !== estimateId));
      toast.success("Estimate deleted");
    } catch {}
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-sm text-muted-foreground">Estimates</h1>
        <div className="flex items-center gap-2">
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-2"/>Add estimate</Button>
            </DialogTrigger>
            <DialogContent className="bg-card max-w-2xl">
              <DialogHeader><DialogTitle>Add estimate</DialogTitle></DialogHeader>
              <div className="grid gap-3 sm:grid-cols-12">
                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Estimate date</div>
                <div className="sm:col-span-9"><DatePicker value={estimateDate} onChange={setEstimateDate} placeholder="Pick estimate date" /></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Valid until</div>
                <div className="sm:col-span-9"><DatePicker value={validUntil} onChange={setValidUntil} placeholder="Pick valid until" /></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Client</div>
                <div className="sm:col-span-9">
                  <Select value={client} onValueChange={setClient}>
                    <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                    <SelectContent>
                      {clientOptions.length === 0 ? (
                        <SelectItem value="" disabled>-</SelectItem>
                      ) : (
                        clientOptions.map((n)=> (
                          <SelectItem key={n} value={n}>{n}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">TAX</div>
                <div className="sm:col-span-9">
                  <Select value={tax} onValueChange={setTax}>
                    <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-">-</SelectItem>
                      <SelectItem value="10">Tax (10%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Second TAX</div>
                <div className="sm:col-span-9">
                  <Select value={tax2} onValueChange={setTax2}>
                    <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-">-</SelectItem>
                      <SelectItem value="10">Tax (10%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Note</div>
                <div className="sm:col-span-9"><Textarea placeholder="Note" className="min-h-[96px]" value={note} onChange={(e)=>setNote(e.target.value)} /></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Advanced Amount</div>
                <div className="sm:col-span-9"><Input placeholder="Advanced Amount" value={advancedAmount} onChange={(e)=>setAdvancedAmount(e.target.value)} /></div>
              </div>
              <DialogFooter>
                <div className="w-full flex items-center justify-end gap-2">
                  <Button variant="outline" onClick={()=>setOpenAdd(false)}>Close</Button>
                  <Button onClick={save}>Save</Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-40"><SelectValue placeholder="- Status -" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">- Status -</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Sent">Sent</SelectItem>
                  <SelectItem value="Accepted">Accepted</SelectItem>
                  <SelectItem value="Declined">Declined</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">Monthly</Button>
              <Button variant="outline" size="sm">Yearly</Button>
              <Button variant="outline" size="sm">Custom</Button>
              <Button variant="outline" size="sm">Dynamic</Button>
              <div className="inline-flex items-center gap-2">
                <Button variant="outline" size="icon"><ChevronLeft className="w-4 h-4"/></Button>
                <span className="text-sm text-muted-foreground">December 2025</span>
                <Button variant="outline" size="icon"><ChevronRight className="w-4 h-4"/></Button>
                <Button variant="success" size="icon"><RefreshCw className="w-4 h-4"/></Button>
              </div>
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
                <TableHead>Estimate</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Estimate date</TableHead>
                <TableHead>Created by</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Advanced Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">No record found.</TableCell>
                </TableRow>
              ) : (
                <>
                  {rows.map((r)=> (
                    <TableRow key={r.id}>
                      <TableCell className="text-primary underline cursor-pointer" onClick={()=>navigate(`/prospects/estimates/${r.id}`)}>Estimate: {r.number}</TableCell>
                      <TableCell className="text-primary underline cursor-pointer">{r.client}</TableCell>
                      <TableCell>{r.estimateDate}</TableCell>
                      <TableCell>{String(r?.createdBy?.name || r?.createdBy?.email || "-")}</TableCell>
                      <TableCell>Rs.{r.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        {r.approvalStatus && r.approvalStatus !== "Approved" ? (
                          <Badge variant="outline">Pending approval</Badge>
                        ) : (
                          <Badge variant={r.status === "Accepted" ? "secondary" : "outline"}>{r.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{r.advancedAmount}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              convertToProposal(r);
                            }}
                          >
                            Convert to Proposal
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/prospects/estimates/${r.id}`);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteEstimate(r.id);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

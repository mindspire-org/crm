import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Combobox } from "@/components/ui/combobox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { Search, Plus, RefreshCw, ChevronLeft, ChevronRight, Trash2, MoreVertical, Pencil, Eye } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";

type Row = {
  id: string;
  title: string;
  number?: number;
  client: string;
  proposalDate: string;
  validUntil: string;
  amount: number;
  status: string;
  note: string;
};

const shortId = (id: string) => {
  const s = String(id || "");
  if (!s) return "-";
  return s.length <= 8 ? s : `${s.slice(0, 8)}…`;
};

export default function Proposals() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("-");
  const [openAdd, setOpenAdd] = useState(false);
  const [lastEmailSeen, setLastEmailSeen] = useState("");
  const [lastPreviewSeen, setLastPreviewSeen] = useState("");

  const [rows, setRows] = useState<Row[]>([]);
  const navigate = useNavigate();

  const [proposalDate, setProposalDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [client, setClient] = useState("");
  const [clientId, setClientId] = useState<string>("-");
  const [clients, setClients] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [tax1, setTax1] = useState("0");
  const [tax2, setTax2] = useState("0");
  const [note, setNote] = useState("");
  const [statusEdit, setStatusEdit] = useState("draft");
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(`${API_BASE}/api/proposals?${params.toString()}`, { headers: getAuthHeaders() });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to load proposals");
      const mapped: Row[] = (Array.isArray(data) ? data : []).map((d: any) => ({
        id: String(d._id || ""),
        title: d.title || "-",
        number: typeof d.number === "number" ? d.number : undefined,
        client: d.client || "-",
        proposalDate: d.proposalDate ? new Date(d.proposalDate).toISOString().slice(0, 10) : "-",
        validUntil: d.validUntil ? new Date(d.validUntil).toISOString().slice(0, 10) : "-",
        amount: Number(d.amount || 0),
        status: d.status || "draft",
        note: d.note || "",
      }));
      setRows(mapped);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load proposals");
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Load clients list when the Add/Edit dialog opens
  useEffect(() => {
    (async () => {
      if (!openAdd) return;
      try {
        const res = await fetch(`${API_BASE}/api/clients`, { headers: getAuthHeaders() });
        const data = await res.json().catch(() => []);
        setClients(Array.isArray(data) ? data : []);
      } catch { setClients([]); }
    })();
  }, [openAdd]);

  const clientDisplay = (c: any) => (c?.name || c?.company || c?.person || "-").toString();

  useEffect(() => {
    const t = window.setTimeout(() => {
      load();
    }, 250);
    return () => window.clearTimeout(t);
  }, [query]);

  const filteredRows = useMemo(() => {
    let out = rows;
    if (status && status !== "-") {
      out = out.filter((r) => String(r.status || "").toLowerCase() === String(status).toLowerCase());
    }
    const pick = new Map<string, Row>();
    for (const r of out) {
      const key = `${(r.client || "").trim().toLowerCase()}|${(r.title || "").trim().toLowerCase()}`;
      const ex = pick.get(key);
      if (!ex) { pick.set(key, r); continue; }
      const a = r.proposalDate && r.proposalDate !== "-" ? Date.parse(r.proposalDate) : 0;
      const b = ex.proposalDate && ex.proposalDate !== "-" ? Date.parse(ex.proposalDate) : 0;
      if (a >= b) pick.set(key, r);
    }
    return Array.from(pick.values());
  }, [rows, status]);

  const openEdit = (r: Row) => {
    setEditingId(r.id);
    setProposalDate(r.proposalDate && r.proposalDate !== "-" ? r.proposalDate : "");
    setValidUntil(r.validUntil && r.validUntil !== "-" ? r.validUntil : "");
    setClient(r.client || "");
    setClientId("-");
    setTitle(r.title || "");
    setAmount(r.amount ? String(r.amount) : "");
    setTax1("0");
    setTax2("0");
    setNote(r.note || "");
    setStatusEdit(r.status || "draft");
    setOpenAdd(true);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/proposals/${id}`, { method: "PUT", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ status: newStatus }) });
      if (res.ok) {
        setRows((p) => p.map((x) => (x.id === id ? { ...x, status: newStatus } : x)));
        toast.success("Status updated");
      }
    } catch {}
  };

  const exportCSV = () => {
    const header = ["Number","Title","Client","Proposal date","Valid until","Amount","Status"];
    const lines = filteredRows.map((r, i) => [i + 1, r.title, r.client, r.proposalDate, r.validUntil, r.amount, r.status]);
    const csv = [header, ...lines].map(row => row.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'proposals.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const printTable = () => {
    const w = window.open('', '_blank'); if (!w) return;
    const rowsHtml = filteredRows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.title}</td><td>${r.client}</td><td>${r.proposalDate}</td><td>${r.validUntil}</td><td>${r.amount}</td><td>${r.status}</td></tr>`).join('');
    w.document.write(`<!doctype html><html><head><title>Proposals</title></head><body><h3>Proposals</h3><table border=\"1\" cellspacing=\"0\" cellpadding=\"6\"><thead><tr><th>Number</th><th>Title</th><th>Client</th><th>Proposal date</th><th>Valid until</th><th>Amount</th><th>Status</th></tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`);
    w.document.close(); w.focus(); w.print(); w.close();
  };

  const openNew = () => {
    setProposalDate("");
    setValidUntil("");
    setClient("");
    setClientId("-");
    setTitle("");
    setAmount("");
    setTax1("0");
    setTax2("0");
    setNote("");
    setStatusEdit("draft");
    setEditingId(null);
    setOpenAdd(true);
  };

  const save = async () => {
    try {
      const payload: any = {
        client: client || "",
        clientId: clientId && clientId !== "-" ? clientId : undefined,
        title: title || "",
        proposalDate: proposalDate ? new Date(proposalDate).toISOString() : undefined,
        validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
        amount: amount ? Number(amount) : 0,
        tax1: Number(tax1 || 0),
        tax2: Number(tax2 || 0),
        note: note || "",
        status: statusEdit || "draft",
      };
      const url = editingId ? `${API_BASE}/api/proposals/${editingId}` : `${API_BASE}/api/proposals`;
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error || (editingId ? "Failed to update proposal" : "Failed to add proposal"));
      toast.success(editingId ? "Proposal updated" : "Proposal created");
      setOpenAdd(false);
      // Reset filters so the new/updated item is visible even if current filters would hide it
      setStatus("-");
      setQuery("");
      await load();
    } catch (e: any) {
      toast.error(e?.message || (editingId ? "Failed to update proposal" : "Failed to add proposal"));
    }
  };

  const deleteRow = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/proposals/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error || "Failed");
      toast.success("Proposal deleted");
      setRows((p) => p.filter((x) => x.id !== id));
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete proposal");
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-sm text-muted-foreground">Proposals</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>Excel</Button>
          <Button variant="outline" size="sm" onClick={printTable}>Print</Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search" value={query} onChange={(e)=>setQuery(e.target.value)} className="pl-9 w-56" />
          </div>
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild><Button variant="outline" size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-2"/>Add proposal</Button></DialogTrigger>
            <DialogContent className="bg-card max-w-2xl">
              <DialogHeader><DialogTitle>Add proposal</DialogTitle></DialogHeader>
              <div className="grid gap-3 sm:grid-cols-12">
                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Proposal date</div>
                <div className="sm:col-span-9"><DatePicker value={proposalDate} onChange={setProposalDate} placeholder="Pick proposal date" /></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Valid until</div>
                <div className="sm:col-span-9"><DatePicker value={validUntil} onChange={setValidUntil} placeholder="Pick valid until" /></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Client/Lead</div>
                <div className="sm:col-span-9">
                  <Combobox
                    options={clients.map((c: any) => ({ value: String(c._id), label: clientDisplay(c) }))}
                    value={clientId === "-" ? "" : clientId}
                    onValueChange={(v) => {
                      setClientId(v || "-");
                      const c = clients.find((x: any) => String(x._id) === String(v));
                      if (c) setClient(clientDisplay(c));
                      else setClient("");
                    }}
                    placeholder="Select client"
                  />
                </div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Title</div>
                <div className="sm:col-span-9"><Input placeholder="Title" value={title} onChange={(e)=>setTitle(e.target.value)} /></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Amount</div>
                <div className="sm:col-span-9"><Input type="number" placeholder="Amount" value={amount} onChange={(e)=>setAmount(e.target.value)} /></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">TAX</div>
                <div className="sm:col-span-9"><Input type="number" value={tax1} onChange={(e)=>setTax1(e.target.value)} /></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Second TAX</div>
                <div className="sm:col-span-9"><Input type="number" value={tax2} onChange={(e)=>setTax2(e.target.value)} /></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Status</div>
                <div className="sm:col-span-9">
                  <Select value={statusEdit} onValueChange={setStatusEdit}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="declined">Declined</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Note</div>
                <div className="sm:col-span-9"><Textarea placeholder="Note" className="min-h-[96px]" value={note} onChange={(e)=>setNote(e.target.value)} /></div>
              </div>
              <DialogFooter>
                <div className="w-full flex items-center justify-end gap-2">
                  <Button variant="outline" onClick={()=>setOpenAdd(false)}>Close</Button>
                  <Button onClick={save}>{editingId ? 'Update' : 'Save'}</Button>
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
              <Button variant="outline" size="icon">▦</Button>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-40"><SelectValue placeholder="- Status -" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">- Status -</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
              <div className="w-44">
                <DatePicker value={lastEmailSeen} onChange={setLastEmailSeen} placeholder="Last email seen" />
              </div>
              <div className="w-44">
                <DatePicker value={lastPreviewSeen} onChange={setLastPreviewSeen} placeholder="Last preview seen" />
              </div>
              <Button variant="outline" size="sm">Monthly</Button>
              <Button variant="outline" size="sm">Yearly</Button>
              <Button variant="outline" size="sm">Custom</Button>
              <Button variant="outline" size="sm">Dynamic</Button>
              <div className="inline-flex items-center gap-2">
                <Button variant="outline" size="icon"><ChevronLeft className="w-4 h-4"/></Button>
                <span className="text-sm text-muted-foreground">December 2025</span>
                <Button variant="outline" size="icon"><ChevronRight className="w-4 h-4"/></Button>
                <Button variant="success" size="icon" onClick={load}><RefreshCw className="w-4 h-4"/></Button>
              </div>
            </div>
            <div />
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Number</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Proposal date</TableHead>
                <TableHead>Valid until</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length ? (
                filteredRows.map((r, i) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap cursor-pointer text-primary" onClick={() => navigate(`/prospects/proposals/${r.id}`)}>{i + 1}</TableCell>
                    <TableCell className="whitespace-nowrap cursor-pointer text-primary" onClick={() => navigate(`/prospects/proposals/${r.id}`)}>{r.client}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.proposalDate}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.validUntil}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.amount.toLocaleString()}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Select value={r.status} onValueChange={(v)=>updateStatus(r.id, v)}>
                        <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="sent">Sent</SelectItem>
                          <SelectItem value="accepted">Accepted</SelectItem>
                          <SelectItem value="declined">Declined</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/prospects/proposals/${r.id}`)}><Eye className="w-4 h-4 mr-2"/>View</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(r)}><Pencil className="w-4 h-4 mr-2"/>Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => deleteRow(r.id)} className="text-destructive"><Trash2 className="w-4 h-4 mr-2"/>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">No record found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

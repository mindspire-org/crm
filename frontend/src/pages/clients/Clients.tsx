import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronUp, ChevronsUpDown, Download, Edit, HelpCircle, Plus, Search, Tags, Trash2, Upload, X } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { NavLink } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/sonner";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { canViewFinancialData, getCurrentUser } from "@/utils/roleAccess";
import { COUNTRIES } from "@/data/countries";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface ContactRow {
  id: string;
  name: string;
  client: string;
  title?: string;
  email?: string;
  phone?: string;
  skype?: string;
  avatar?: string;
}

function ManageLabelsDialog({ labels, onSave }: { labels: Array<{name:string;color:string}>; onSave: (labels: Array<{name:string;color:string}>)=>void }) {
  const [list, setList] = useState(labels || []);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#4F46E5");
  useEffect(()=>{ setList(labels||[]); }, [labels]);
  const colors = ["#22c55e","#2bbef0","#06b6d4","#3b82f6","#f59e0b","#f97316","#ef4444","#e11d48","#a855f7","#ec4899","#6b7280","#10b981","#60a5fa","#6366f1"];
  const add = () => {
    if (!name.trim()) return;
    setList((prev)=> [{ name: name.trim(), color }, ...prev]);
    setName("");
  };
  const remove = (n:string) => setList((prev)=> prev.filter(l=>l.name!==n));
  return (
    <DialogContent className="bg-card">
      <DialogHeader>
        <DialogTitle>Manage labels</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {colors.map((c)=> (
            <button key={c} type="button" onClick={()=>setColor(c)} className={`w-6 h-3 rounded ${color===c? 'ring-2 ring-offset-1 ring-primary':''}`} style={{ backgroundColor: c }} />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Label" value={name} onChange={(e)=>setName(e.target.value)} />
          <Button variant="outline" onClick={add}>Save</Button>
        </div>
        <div className="pt-2 border-t">
          <div className="flex flex-wrap gap-2">
            {list.map((l)=> (
              <span key={l.name} className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-full" style={{ backgroundColor: `${l.color}22`, color: l.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />{l.name}
                <button onClick={()=>remove(l.name)} className="opacity-60 hover:opacity-100">×</button>
              </span>
            ))}
          </div>
        </div>
      </div>
      <DialogFooter>
        <div className="w-full flex items-center justify-end gap-2">
          <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
          <Button onClick={()=>onSave(list)}>Save</Button>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}

function ImportClientsDialog({ onImported }: { onImported: (created:any[])=>void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
  };
  const onChoose = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };
  const prevent = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const downloadSample = () => {
    const csv = [
      "company,person,email,phone,labels",
      "HealthSpire,John Doe,john@example.com,0300-0000000,VIP;Priority",
      "Acme Inc.,Jane Roe,jane@example.com,0300-1111111,",
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "clients-sample.csv"; a.click();
    URL.revokeObjectURL(url);
  };
  const parseCsv = async (f: File): Promise<any[]> => {
    const text = await f.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const header = lines[0].split(",").map(s=>s.trim().toLowerCase());
    const out:any[] = [];
    for (let i=1;i<lines.length;i++) {
      const cols = lines[i].split(",").map(s=>s.trim());
      const row:any = {};
      header.forEach((h,idx)=> row[h] = cols[idx] || "");
      out.push(row);
    }
    return out;
  };
  const importNow = async () => {
    if (!file) return;
    try {
      setLoading(true);
      const rows = await parseCsv(file);
      const created:any[] = [];
      for (const r of rows) {
        const payload:any = {
          type: r.company ? "org" : "person",
          company: r.company || undefined,
          person: r.person || undefined,
          email: r.email || undefined,
          phone: r.phone || undefined,
          labels: (r.labels||"").split(/[,;]/).map((s:string)=>s.trim()).filter(Boolean),
        };
        const res = await fetch(`${API_BASE}/api/clients`, { method: "POST", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
        if (res.ok) { created.push(await res.json()); }
      }
      onImported(created);
    } finally { setLoading(false); }
  };
  return (
    <DialogContent className="bg-card">
      <DialogHeader>
        <DialogTitle>Import clients</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div
          className="border-2 border-dashed rounded-lg p-10 text-center text-sm text-muted-foreground"
          onDragOver={prevent}
          onDragEnter={prevent}
          onDrop={onDrop}
          onClick={()=>inputRef.current?.click()}
        >
          Drag-and-drop documents here
          <br/>
          (or click to browse...)
          <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={onChoose} />
        </div>
        {file && <div className="text-xs">Selected: <span className="font-medium">{file.name}</span></div>}
      </div>
      <DialogFooter>
        <div className="w-full flex items-center justify-between">
          <Button variant="outline" type="button" onClick={downloadSample}>Download sample file</Button>
          <div className="flex items-center gap-2">
            <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
            <Button onClick={importNow} disabled={!file || loading}>{loading ? 'Importing...' : 'Next'}</Button>
          </div>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}

export default function Clients() {
  const canViewPricing = useMemo(() => {
    const u = getCurrentUser();
    return u ? canViewFinancialData(u as any) : false;
  }, []);

  const [openAdd, setOpenAdd] = useState(false);
  const [openLabels, setOpenLabels] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [clientsData, setClientsData] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [projectCounts, setProjectCounts] = useState({ open: 0, inProgress: 0, completed: 0, hold: 0 });
  const [labels, setLabels] = useState<Array<{ name: string; color: string }>>([]);
  const totalClients = contacts.length;
  const totalContacts = contacts.length; // using same dataset for now

  // Load saved client labels once
  useEffect(() => {
    try {
      const raw = localStorage.getItem("client_labels");
      if (raw) setLabels(JSON.parse(raw));
    } catch {}
  }, []);

  const saveLabels = (list: Array<{ name: string; color: string }>) => {
    setLabels(list);
    try { localStorage.setItem("client_labels", JSON.stringify(list)); } catch {}
    try { window.dispatchEvent(new Event("client_labels_updated")); } catch {}
  };

  const handleImported = (created: any[]) => {
    if (!Array.isArray(created) || !created.length) return;
    setClientsData((prev)=> [...created, ...prev]);
    setContacts((prev)=> [
      ...created.map((d:any)=>({ id: String(d._id||""), name: d.company||d.person||"-", client: d.company||d.person||"-", title: "", email: d.email||"", phone: d.phone||"", skype: d.skype||"", avatar: d.avatar||"" })),
      ...prev
    ]);
  };

  // Debounce search to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(q);
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const sp = new URLSearchParams();
        if (debouncedQ) sp.set("q", debouncedQ);
        if (rangeFrom) sp.set("from", rangeFrom);
        if (rangeTo) sp.set("to", rangeTo);
        
        const url = `${API_BASE}/api/clients?${sp.toString()}`;
        const res = await fetch(url, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        setClientsData(Array.isArray(data) ? data : []);
        const mapped: ContactRow[] = (Array.isArray(data) ? data : []).map((d:any)=> ({
          id: String(d._id || ""),
          name: d.company || d.person || "-",
          client: d.company || d.person || "-",
          title: "",
          email: d.email || "",
          phone: d.phone || "",
          skype: d.skype || "",
          avatar: d.avatar || "",
        }));
        setContacts(mapped);
      } catch {}
      finally {
        setLoading(false);
      }
    })();
  }, [debouncedQ, rangeFrom, rangeTo]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/projects`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        const list = (Array.isArray(data) ? data : []);
        const open = list.filter((p:any)=> (p.status||"Open")==="Open").length;
        const inProgress = list.filter((p:any)=> (p.status||"")==="In Progress").length;
        const completed = list.filter((p:any)=> (p.status||"")==="Completed").length;
        const hold = list.filter((p:any)=> (p.status||"")==="Hold").length;
        setProjectCounts({ open, inProgress, completed, hold });
      } catch {}
    })();
  }, []);

  const rows = useMemo(() => {
    if (!q.trim()) return contacts;
    const s = q.toLowerCase();
    return contacts.filter((r) =>
      [r.name, r.client, r.title, r.email, r.phone].some((v) => (v || "").toLowerCase().includes(s))
    );
  }, [q, contacts]);

  const printClients = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    const html = `
      <html>
        <head>
          <title>Client List</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            h1 { text-align: center; color: #4f46e5; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 12px; border: 1px solid #e2e8f0; text-align: left; font-size: 12px; }
            th { background: #f8fafc; font-weight: bold; text-transform: uppercase; }
            tr:nth-child(even) { background: #f1f5f9; }
            .currency { text-align: right; font-family: monospace; }
          </style>
        </head>
        <body>
          <h1>Client List</h1>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Primary Contact</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Total Invoiced</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              ${clientsData.map((c, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${c.company || c.person || "-"}</td>
                  <td>${c.person || "-"}</td>
                  <td>${c.phone || "-"}</td>
                  <td>${c.email || "-"}</td>
                  <td class="currency">Rs.${Number(c.totalInvoiced || 0).toLocaleString()}</td>
                  <td class="currency">Rs.${(Number(c.totalInvoiced || 0) - Number(c.paymentReceived || 0)).toLocaleString()}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display">Clients</h1>
        <div className="flex items-center gap-2">
          <Dialog open={openLabels} onOpenChange={setOpenLabels}>
            <DialogTrigger asChild>
              <Button variant="outline"><Tags className="w-4 h-4 mr-2"/>Manage labels</Button>
            </DialogTrigger>
            <ManageLabelsDialog labels={labels} onSave={(l)=>{ saveLabels(l); setOpenLabels(false); }} />
          </Dialog>
          <Dialog open={openImport} onOpenChange={setOpenImport}>
            <DialogTrigger asChild>
              <Button variant="outline"><Upload className="w-4 h-4 mr-2"/>Import clients</Button>
            </DialogTrigger>
            <ImportClientsDialog onImported={(list)=>{ handleImported(list); setOpenImport(false); }} />
          </Dialog>
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <Button variant="gradient"><Plus className="w-4 h-4 mr-2"/>Add client</Button>
            </DialogTrigger>
            <AddClientDialog onAdd={async (c, opts)=>{
              try {
                const payload: any = {
                  type: c.company ? "org" : "person",
                  company: c.company || undefined,
                  person: c.person || undefined,
                  owner: c.owner || undefined,
                  address: c.address || undefined,
                  city: c.city || undefined,
                  state: c.state || undefined,
                  zip: c.zip || undefined,
                  country: c.country || undefined,
                  email: c.email || undefined,
                  phone: c.phone || undefined,
                  website: c.website || undefined,
                  vatNumber: c.vatNumber || undefined,
                  gstNumber: c.gstNumber || undefined,
                  clientGroups: c.clientGroups?.filter(Boolean) || [],
                  currency: c.currency || undefined,
                  currencySymbol: c.currencySymbol || undefined,
                  labels: c.labels?.filter(Boolean) || [],
                  disableOnlinePayment: Boolean(c.disableOnlinePayment),
                };
                const res = await fetch(`${API_BASE}/api/clients`, { method: "POST", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
                if (!res.ok) { const e = await res.json().catch(()=>null); toast.error(e?.error || "Failed to add client"); return; }
                const d = await res.json();
                const row: ContactRow = { id: String(d._id||""), name: d.company || d.person || "New Client", client: d.company || d.person || "-", email: d.email || c.email, phone: d.phone || c.phone };
                setContacts((prev)=> [row, ...prev]);
                if (opts?.close !== false) setOpenAdd(false);
                toast.success("Client added");
              } catch {}
            }} />
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="bg-muted/40">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total clients" value={String(totalClients)} iconBg="bg-indigo/10"/>
            <StatCard title="Total contacts" value={String(totalContacts)} iconBg="bg-success/10"/>
            <StatCard title="Contacts logged in today" value={String(0)} iconBg="bg-primary/10"/>
            <StatCard title="Contacts logged in last 7 days" value={String(0)} iconBg="bg-primary/10"/>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <MiniBar title="Clients has unpaid invoices" value={0} percent={0} color="warning"/>
            <MiniBar title="Clients has partially paid invoices" value={0} percent={0} color="indigo"/>
            <MiniBar title="Clients has overdue invoices" value={0} percent={0} color="destructive"/>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <PanelList title="Projects" items={["Clients has open projects","Clients has in progress projects","Clients has completed projects","Clients has hold projects"]} values={[projectCounts.open, projectCounts.inProgress, projectCounts.completed, projectCounts.hold]} />
            <PanelList title="Estimates" items={["Client has open estimates","Clients has accepted estimates","Clients has new estimate requests"]} values={[0,0,0]} />
          </div>
        </TabsContent>

        {/* Clients list */}
        <TabsContent value="clients">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <DatePicker 
                value={rangeFrom} 
                onChange={setRangeFrom} 
                placeholder="From Date"
                className="h-9 w-32 border-slate-200 bg-white shadow-sm"
              />
              <span className="text-slate-400">→</span>
              <DatePicker 
                value={rangeTo} 
                onChange={setRangeTo} 
                placeholder="To Date"
                className="h-9 w-32 border-slate-200 bg-white shadow-sm"
              />
              {(rangeFrom || rangeTo) && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  onClick={() => { setRangeFrom(""); setRangeTo(""); }}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
              <Button variant="outline" className="h-9" onClick={printClients}>
                <Download className="w-4 h-4 mr-2" />
                Print List
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9 w-64 h-9" placeholder="Search" value={q} onChange={(e)=>setQ(e.target.value)} />
              </div>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <div className="text-muted-foreground">Loading clients...</div>
              </div>
            </div>
          ) : (
            <ClientsMainTable
              clients={clientsData}
              onClientUpdated={(u:any)=> setClientsData((prev)=> prev.map((c:any)=> String(c._id)===String(u._id) ? u : c))}
              onClientDeleted={(id: string) => setClientsData((prev) => prev.filter((c: any) => String(c._id) !== String(id)))}
            />
          )}
        </TabsContent>

        {/* Contacts */}
        <TabsContent value="contacts">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Button variant="outline">- Quick filters -</Button>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9 w-64" placeholder="Search" value={q} onChange={(e)=>setQ(e.target.value)} />
              </div>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <div className="text-muted-foreground">Loading contacts...</div>
              </div>
            </div>
          ) : (
            <ContactsTable rows={rows} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ title, value, iconBg }: { title: string; value: string; iconBg: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center text-xl`}>📊</div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm text-muted-foreground">{title}</div>
        </div>
      </div>
    </Card>
  );
}

function MiniBar({ title, value, percent, color }: { title: string; value: number; percent: number; color: "warning"|"indigo"|"destructive" }) {
  const barColor = color === "warning" ? "bg-warning" : color === "indigo" ? "bg-indigo" : "bg-destructive";
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{title}</div>
          <div className="text-2xl font-semibold mt-1">{value}</div>
        </div>
        <div className="text-xs text-muted-foreground">{percent}% of total clients</div>
      </div>
      <div className="mt-3 h-2 rounded bg-muted/50">
        <div className={`h-2 rounded ${barColor}`} style={{ width: `${percent}%` }} />
      </div>
    </Card>
  );
}

function PanelList({ title, items, values }: { title: string; items: string[]; values: number[] }) {
  return (
    <Card className="p-4">
      <div className="text-sm font-medium mb-3">{title}</div>
      <div className="space-y-3">
        {items.map((label, i) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">📁</div>
              <span className="text-muted-foreground">{label}</span>
            </div>
            <Button variant="link" className="text-primary px-0">{values[i]}</Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ContactsTable({ rows }: { rows: ContactRow[] }) {
  return (
    <Card className="p-0 overflow-hidden rounded-xl border">
      <div className="overflow-x-auto">
        <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead>Name</TableHead>
            <TableHead>Client name</TableHead>
            <TableHead>Job Title</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Skype</TableHead>
            <TableHead className="w-6"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="whitespace-nowrap">
                <div className="flex items-center gap-2">
                  {r.avatar ? (
                    <img src={`${API_BASE}${r.avatar}`} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted" />
                  )}
                  <span>{r.name}</span>
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <NavLink to={`/clients/${r.id}`} className="text-primary underline">
                  {r.client}
                </NavLink>
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">{r.title || "-"}</TableCell>
              <TableCell className="whitespace-nowrap">{r.email || "-"}</TableCell>
              <TableCell className="whitespace-nowrap">{r.phone || "-"}</TableCell>
              <TableCell className="whitespace-nowrap">{r.skype || "-"}</TableCell>
              <TableCell className="text-right opacity-50">×</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </Card>
  );
}

function ClientsMainTable({ clients, onClientUpdated, onClientDeleted }: { clients: any[]; onClientUpdated?: (updated:any)=>void; onClientDeleted?: (id: string)=>void }) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({ key: 'createdAt', direction: 'desc' });

  const sortedClients = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return clients;

    return [...clients].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      // Handle specific fields
      if (sortConfig.key === 'name') {
        aVal = a.company || a.person || '';
        bVal = b.company || b.person || '';
      } else if (sortConfig.key === 'clientGroups' || sortConfig.key === 'labels') {
        aVal = (a[sortConfig.key] || []).join(', ');
        bVal = (b[sortConfig.key] || []).join(', ');
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [clients, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <ChevronsUpDown className="w-3 h-3 ml-1 opacity-30" />;
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="w-3 h-3 ml-1 text-primary" /> 
      : <ChevronDown className="w-3 h-3 ml-1 text-primary" />;
  };

  const canViewPricing = useMemo(() => {
    const u = getCurrentUser();
    return u ? canViewFinancialData(u as any) : false;
  }, []);

  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  // full editable state
  const [typeVal, setTypeVal] = useState<"org"|"person">("org");
  const [company, setCompany] = useState("");
  const [person, setPerson] = useState("");
  const [owner, setOwner] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [regionState, setRegionState] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [clientGroupsText, setClientGroupsText] = useState("");
  const [currency, setCurrency] = useState("");
  const [currencySymbol, setCurrencySymbol] = useState("");
  const [labelsText, setLabelsText] = useState("");
  const [disableOnlinePayment, setDisableOnlinePayment] = useState(false);

  const openEdit = (c:any) => {
    setEditing(c);
    setTypeVal((c.type === "person") ? "person" : "org");
    setCompany(String(c.company||""));
    setPerson(String(c.person||""));
    setOwner(String(c.owner||""));
    setAddress(String(c.address||""));
    setCity(String(c.city||""));
    setRegionState(String(c.state||""));
    setZip(String(c.zip||""));
    setCountry(String(c.country||""));
    setEmail(String(c.email||""));
    setPhone(String(c.phone||""));
    setWebsite(String(c.website||""));
    setVatNumber(String(c.vatNumber||""));
    setGstNumber(String(c.gstNumber||""));
    setClientGroupsText((c.clientGroups||[]).join(", "));
    setCurrency(String(c.currency||""));
    setCurrencySymbol(String(c.currencySymbol||""));
    setLabelsText((c.labels||[]).join(", "));
    setDisableOnlinePayment(Boolean(c.disableOnlinePayment));
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      setSaving(true);
      const payload:any = {
        type: typeVal,
        company: typeVal === "org" ? (company.trim() || "") : "",
        person: typeVal === "person" ? (person.trim() || "") : (person.trim() || ""),
        owner: owner.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: regionState.trim() || undefined,
        zip: zip.trim() || undefined,
        country: country.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        website: website.trim() || undefined,
        vatNumber: vatNumber.trim() || undefined,
        gstNumber: gstNumber.trim() || undefined,
        clientGroups: clientGroupsText.split(",").map(s=>s.trim()).filter(Boolean),
        currency: currency.trim() || undefined,
        currencySymbol: currencySymbol.trim() || undefined,
        labels: labelsText.split(",").map(s=>s.trim()).filter(Boolean),
        disableOnlinePayment,
      };
      const res = await fetch(`${API_BASE}/api/clients/${editing._id}`, { method: "PUT", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
      if (!res.ok) { const e = await res.json().catch(()=>null); toast.error(e?.error || "Failed to update client"); return; }
      const updated = await res.json();
      onClientUpdated?.(updated);
      toast.success("Client updated");
      setEditing(null);
    } catch {}
    finally { setSaving(false); }
  };

  const deleteClient = async (clientId: string) => {
    try {
      setDeletingId(clientId);
      const res = await fetch(`${API_BASE}/api/clients/${clientId}`, { method: "DELETE", headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to delete client");
      toast.success("Client deleted");
      onClientDeleted?.(clientId);
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete client");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card className="p-0 overflow-hidden rounded-xl border">
      <div className="overflow-x-auto">
        <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="w-12">ID</TableHead>
            <TableHead className="cursor-pointer hover:bg-muted/60 transition-colors" onClick={() => requestSort('name')}>
              <div className="flex items-center">Name {getSortIcon('name')}</div>
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-muted/60 transition-colors" onClick={() => requestSort('person')}>
              <div className="flex items-center">Primary contact {getSortIcon('person')}</div>
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-muted/60 transition-colors" onClick={() => requestSort('phone')}>
              <div className="flex items-center">Phone {getSortIcon('phone')}</div>
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-muted/60 transition-colors" onClick={() => requestSort('clientGroups')}>
              <div className="flex items-center">Client groups {getSortIcon('clientGroups')}</div>
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-muted/60 transition-colors" onClick={() => requestSort('labels')}>
              <div className="flex items-center">Labels {getSortIcon('labels')}</div>
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-muted/60 transition-colors" onClick={() => requestSort('projectsCount')}>
              <div className="flex items-center">Projects {getSortIcon('projectsCount')}</div>
            </TableHead>
            {canViewPricing && (
              <TableHead className="cursor-pointer hover:bg-muted/60 transition-colors" onClick={() => requestSort('totalInvoiced')}>
                <div className="flex items-center">Total invoiced {getSortIcon('totalInvoiced')}</div>
              </TableHead>
            )}
            {canViewPricing && (
              <TableHead className="cursor-pointer hover:bg-muted/60 transition-colors" onClick={() => requestSort('paymentReceived')}>
                <div className="flex items-center">Payment Received {getSortIcon('paymentReceived')}</div>
              </TableHead>
            )}
            {canViewPricing && (
              <TableHead className="cursor-pointer hover:bg-muted/60 transition-colors" onClick={() => requestSort('due')}>
                <div className="flex items-center">Due {getSortIcon('due')}</div>
              </TableHead>
            )}
            <TableHead className="w-24 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedClients.map((c: any, idx: number) => (
            <TableRow key={String(c._id || idx)}>
              <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
              <TableCell className="whitespace-nowrap">
                <div className="flex items-center gap-2">
                  {c.avatar ? (
                    <img src={`${API_BASE}${c.avatar}`} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted" />
                  )}
                  <NavLink to={`/clients/${c._id}`} className="text-primary underline">
                    {c.company || c.person || "-"}
                  </NavLink>
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap text-primary/80">
                {c.person ? (
                  <NavLink to={`/clients/${c._id}/primary-contact`} className="underline">
                    {c.person}
                  </NavLink>
                ) : "-"}
              </TableCell>
              <TableCell className="whitespace-nowrap">{c.phone || "-"}</TableCell>
              <TableCell className="whitespace-nowrap">{(c.clientGroups||[]).join(", ") || "-"}</TableCell>
              <TableCell className="whitespace-nowrap">{(c.labels||[]).join(", ") || "-"}</TableCell>
              <TableCell className="whitespace-nowrap">{c.projectsCount ?? 0}</TableCell>
              {canViewPricing && (
                <TableCell className="whitespace-nowrap">{c.totalInvoiced != null ? `Rs.${Number(c.totalInvoiced).toLocaleString()}` : "Rs.0"}</TableCell>
              )}
              {canViewPricing && (
                <TableCell className="whitespace-nowrap">{c.paymentReceived != null ? `Rs.${Number(c.paymentReceived).toLocaleString()}` : "Rs.0"}</TableCell>
              )}
              {canViewPricing && (
                <TableCell className="whitespace-nowrap">{c.due != null ? `Rs.${Number(c.due).toLocaleString()}` : "Rs.0"}</TableCell>
              )}
              <TableCell className="text-right">
                <div className="inline-flex items-center gap-3">
                  <Button variant="link" className="px-0 text-primary inline-flex items-center gap-1" onClick={()=>openEdit(c)}>
                    <Edit className="w-4 h-4"/> Edit
                  </Button>
                  <Button
                    variant="link"
                    className="px-0 text-destructive inline-flex items-center gap-1"
                    onClick={() => { setClientToDelete(String(c._id)); setConfirmDeleteOpen(true); }}
                    disabled={deletingId === String(c._id)}
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>

      {/* Edit dialog */}
      {editing && (
        <Dialog open={!!editing} onOpenChange={(v)=>{ if(!v) setEditing(null); }}>
          <DialogContent className="bg-card max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit client</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              {/* Type */}
              <div className="grid sm:grid-cols-12 gap-3">
                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Type</div>
                <div className="sm:col-span-9">
                  <RadioGroup value={typeVal} onValueChange={(v)=>setTypeVal(v as any)} className="flex items-center gap-6">
                    <div className="flex items-center gap-2"><RadioGroupItem id="edit-org" value="org" /><Label htmlFor="edit-org">Organization</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem id="edit-person" value="person" /><Label htmlFor="edit-person">Person</Label></div>
                  </RadioGroup>
                </div>
                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">{typeVal === 'org' ? 'Company name' : 'Name'}</div>
                <div className="sm:col-span-9">
                  {typeVal === 'org' ? (
                    <Input placeholder="Company name" value={company} onChange={(e)=>setCompany(e.target.value)} />
                  ) : (
                    <Input placeholder="Name" value={person} onChange={(e)=>setPerson(e.target.value)} />
                  )}
                </div>
                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Owner</div>
                <div className="sm:col-span-9"><Input placeholder="Owner" value={owner} onChange={(e)=>setOwner(e.target.value)} /></div>
                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Address</div>
                <div className="sm:col-span-9"><Textarea placeholder="Address" value={address} onChange={(e)=>setAddress(e.target.value)} /></div>
                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">City</div>
                <div className="sm:col-span-9"><Input placeholder="City" value={city} onChange={(e)=>setCity(e.target.value)} /></div>
                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">State</div>
                <div className="sm:col-span-9"><Input placeholder="State" value={regionState} onChange={(e)=>setRegionState(e.target.value)} /></div>
                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Zip</div>
                <div className="sm:col-span-9"><Input placeholder="Zip" value={zip} onChange={(e)=>setZip(e.target.value)} /></div>
                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Country</div>
                <div className="sm:col-span-9">
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Email</div>
                <div className="sm:col-span-9"><Input placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} /></div>
                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Phone</div>
                <div className="sm:col-span-9"><Input placeholder="Phone" value={phone} onChange={(e)=>setPhone(e.target.value)} /></div>
                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Website</div>
                <div className="sm:col-span-9"><Input placeholder="Website" value={website} onChange={(e)=>setWebsite(e.target.value)} /></div>
                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">VAT Number</div>
                <div className="sm:col-span-9"><Input placeholder="VAT Number" value={vatNumber} onChange={(e)=>setVatNumber(e.target.value)} /></div>
                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">GST Number</div>
                <div className="sm:col-span-9"><Input placeholder="GST Number" value={gstNumber} onChange={(e)=>setGstNumber(e.target.value)} /></div>
                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Client groups</div>
                <div className="sm:col-span-9"><Input placeholder="Client groups" value={clientGroupsText} onChange={(e)=>setClientGroupsText(e.target.value)} /></div>
                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Currency</div>
                <div className="sm:col-span-9"><Input placeholder="Keep it blank to use the default (PKR)" value={currency} onChange={(e)=>setCurrency(e.target.value)} /></div>
                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Currency Symbol</div>
                <div className="sm:col-span-9"><Input placeholder="Keep it blank to use the default (Rs.)" value={currencySymbol} onChange={(e)=>setCurrencySymbol(e.target.value)} /></div>
                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Labels</div>
                <div className="sm:col-span-9"><Input placeholder="Labels" value={labelsText} onChange={(e)=>setLabelsText(e.target.value)} /></div>
                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Disable online payment</div>
                <div className="sm:col-span-9"><Checkbox checked={disableOnlinePayment} onCheckedChange={(v)=>setDisableOnlinePayment(Boolean(v))} /></div>
              </div>
            </div>
            <DialogFooter>
              <div className="w-full flex items-center justify-end gap-2">
                <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
                <Button onClick={saveEdit} disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        onConfirm={() => clientToDelete && deleteClient(clientToDelete)}
        title="Delete Client"
        description="Are you sure you want to delete this client? This cannot be undone."
        variant="destructive"
      />
    </Card>
  );
}

function AddClientDialog({ onAdd }: { onAdd: (payload: { company?: string; person?: string; email?: string; phone?: string; owner?: string; address?: string; city?: string; state?: string; zip?: string; country?: string; website?: string; vatNumber?: string; gstNumber?: string; clientGroups?: string[]; currency?: string; currencySymbol?: string; labels?: string[]; disableOnlinePayment?: boolean }, opts?: { close?: boolean }) => void }) {
  const [type, setType] = useState<"org"|"person">("org");
  const [company, setCompany] = useState("");
  const [person, setPerson] = useState("");
  const [owner, setOwner] = useState("");
  const [employees, setEmployees] = useState<Array<{ id: string; name: string }>>([]);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [clientGroupsText, setClientGroupsText] = useState("");
  const [currency, setCurrency] = useState("");
  const [currencySymbol, setCurrencySymbol] = useState("");
  const [labels, setLabels] = useState<Array<{ name: string; color: string }>>([]);
  const [selectedLabel, setSelectedLabel] = useState<string>("__none__");
  const [disableOnlinePayment, setDisableOnlinePayment] = useState(false);

  // Owner is a free text company owner; no fetching of employees

  const loadLabels = () => {
    try {
      const raw = localStorage.getItem("client_labels");
      setLabels(raw ? (JSON.parse(raw) || []) : []);
    } catch {
      setLabels([]);
    }
  };

  useEffect(() => {
    loadLabels();

    const onLabelsUpdated = () => loadLabels();
    window.addEventListener("client_labels_updated", onLabelsUpdated);

    // Load employees for account manager dropdown
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/employees`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json().catch(() => []);
        const mapped = (Array.isArray(data) ? data : []).map((e: any) => ({
          id: String(e._id || e.id || ""),
          name: String(e.name || [e.firstName, e.lastName].filter(Boolean).join(" ") || "").trim(),
        })).filter((e: any) => e.id && e.name);
        setEmployees(mapped);
      } catch {
        setEmployees([]);
      }
    })();

    return () => {
      window.removeEventListener("client_labels_updated", onLabelsUpdated);
    };
  }, []);

  const buildPayload = () => ({
    company: type === "org" ? (company || undefined) : undefined,
    person: type === "person" ? (person || undefined) : undefined,
    owner: type === "org" ? (owner || undefined) : undefined,
    address: address || undefined,
    city: city || undefined,
    state: state || undefined,
    zip: zip || undefined,
    country: country || undefined,
    email: email || undefined,
    phone: phone || undefined,
    website: website || undefined,
    vatNumber: vatNumber || undefined,
    gstNumber: gstNumber || undefined,
    clientGroups: clientGroupsText.split(",").map(s=>s.trim()).filter(Boolean),
    currency: currency || undefined,
    currencySymbol: currencySymbol || undefined,
    labels: selectedLabel && selectedLabel !== "__none__" ? [selectedLabel] : [],
    disableOnlinePayment,
  });
  const save = (close = true) => {
    onAdd(buildPayload(), { close });
    (document.activeElement as HTMLElement | null)?.blur();
  };

  return (
    <DialogContent className="bg-card max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Add client</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4">
        <div className="grid sm:grid-cols-12 gap-3">
          <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Type</div>
          <div className="sm:col-span-9">
            <RadioGroup value={type} onValueChange={(v)=>setType(v as any)} className="flex items-center gap-6">
              <div className="flex items-center gap-2"><RadioGroupItem id="org" value="org" /><Label htmlFor="org">Organization</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem id="person" value="person" /><Label htmlFor="person">Person</Label></div>
            </RadioGroup>
          </div>

          <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">{type === "org" ? "Company name" : "Name"}</div>
          <div className="sm:col-span-9">
            {type === "org" ? (
              <Input placeholder="Company name" value={company} onChange={(e)=>setCompany(e.target.value)} />
            ) : (
              <Input placeholder="Name" value={person} onChange={(e)=>setPerson(e.target.value)} />
            )}
          </div>

          <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">
            <div className="inline-flex items-center gap-1">Owner
              <TooltipProvider><Tooltip><TooltipTrigger asChild><HelpCircle className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger><TooltipContent><div className="max-w-xs text-xs">The account manager responsible for this client</div></TooltipContent></Tooltip></TooltipProvider>
            </div>
          </div>
          <div className="sm:col-span-9">
            <Select value={owner} onValueChange={(v)=>setOwner(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.length ? (
                  employees.map((e) => (
                    <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>
                  ))
                ) : (
                  <SelectItem value="__none__" disabled>No employees found</SelectItem>
                )}
              </SelectContent>
            </Select>
            <div className="mt-2">
              <Input placeholder="Or type owner name" value={owner} onChange={(e)=>setOwner(e.target.value)} />
            </div>
          </div>

          <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Address</div>
          <div className="sm:col-span-9"><Textarea placeholder="Address" value={address} onChange={(e)=>setAddress(e.target.value)} /></div>

          <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">City</div>
          <div className="sm:col-span-9"><Input placeholder="City" value={city} onChange={(e)=>setCity(e.target.value)} /></div>

          <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">State</div>
          <div className="sm:col-span-9"><Input placeholder="State" value={state} onChange={(e)=>setState(e.target.value)} /></div>

          <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Zip</div>
          <div className="sm:col-span-9"><Input placeholder="Zip" value={zip} onChange={(e)=>setZip(e.target.value)} /></div>

          <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Country</div>
          <div className="sm:col-span-9">
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger>
                <SelectValue placeholder="Select a country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Phone</div>
          <div className="sm:col-span-9"><Input placeholder="Phone" value={phone} onChange={(e)=>setPhone(e.target.value)} /></div>

          <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Website</div>
          <div className="sm:col-span-9"><Input placeholder="Website" value={website} onChange={(e)=>setWebsite(e.target.value)} /></div>

          <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">VAT Number</div>
          <div className="sm:col-span-9"><Input placeholder="VAT Number" value={vatNumber} onChange={(e)=>setVatNumber(e.target.value)} /></div>

          <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">GST Number</div>
          <div className="sm:col-span-9"><Input placeholder="GST Number" value={gstNumber} onChange={(e)=>setGstNumber(e.target.value)} /></div>

          <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Client groups</div>
          <div className="sm:col-span-9"><Input placeholder="Client groups" value={clientGroupsText} onChange={(e)=>setClientGroupsText(e.target.value)} /></div>

          <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Currency</div>
          <div className="sm:col-span-9"><Input placeholder="Keep it blank to use the default (PKR)" value={currency} onChange={(e)=>setCurrency(e.target.value)} /></div>

          <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Currency Symbol</div>
          <div className="sm:col-span-9"><Input placeholder="Keep it blank to use the default (Rs.)" value={currencySymbol} onChange={(e)=>setCurrencySymbol(e.target.value)} /></div>

          <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Labels</div>
          <div className="sm:col-span-9">
            <Select value={selectedLabel} onValueChange={(v)=>setSelectedLabel(v)}>
              <SelectTrigger>
                <SelectValue placeholder="- Label -" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {labels.map((l) => (
                  <SelectItem key={l.name} value={l.name}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">
            <div className="inline-flex items-center gap-1">Disable online payment
              <TooltipProvider><Tooltip><TooltipTrigger asChild><HelpCircle className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger><TooltipContent><div className="max-w-xs text-xs">If enabled, clients cannot pay online for invoices</div></TooltipContent></Tooltip></TooltipProvider>
            </div>
          </div>
          <div className="sm:col-span-9"><Checkbox checked={disableOnlinePayment} onCheckedChange={(v)=>setDisableOnlinePayment(Boolean(v))} /></div>
        </div>
      </div>
      <DialogFooter>
        <div className="w-full flex items-center justify-end gap-2">
          <DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose>
          <Button type="button" variant="gradient" onClick={()=>save(false)}>Save & continue</Button>
          <Button type="button" onClick={()=>save(true)}>Save</Button>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}

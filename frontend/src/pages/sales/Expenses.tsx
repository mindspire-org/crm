import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Upload, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";

export default function Expenses() {
  const { toast } = useToast();
  const [tab, setTab] = useState("list");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("-");
  const [member, setMember] = useState("-");
  const [project, setProject] = useState("-");
  const [openAddExpense, setOpenAddExpense] = useState(false);
  const [openImport, setOpenImport] = useState(false);

  type Employee = { _id: string; name?: string; firstName?: string; lastName?: string };
  type Client = { _id: string; company?: string; person?: string };
  type Project = { _id: string; title?: string };

  type ExpenseRow = {
    _id: string;
    employeeId?: string;
    clientId?: string;
    projectId?: string;
    date?: string;
    category?: string;
    title?: string;
    description?: string;
    amount?: number;
    tax?: number;
    tax2?: number;
    createdAt?: string;
  };

  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  const [expenseForm, setExpenseForm] = useState({
    date: "",
    category: "",
    employeeId: "-",
    clientId: "-",
    projectId: "-",
    title: "",
    description: "",
    amount: "",
    tax: "",
    tax2: "",
  });

  type RecRow = {
    id: string;
    date: string;
    category: string;
    title: string;
    description: string;
    files?: number;
    amount: string;
    tax: string;
    tax2: string;
    total: string;
  };

  const recurringRows: RecRow[] = useMemo(
    () => [
      {
        id: "r1",
        date: "2025-03-10",
        category: "Office Expense",
        title: "Office Rent",
        description:
          "30k pkr\nRepeat every: 1 Month(s)\nCycles: 0/12\nNext recurring: 2025-04-10",
        amount: "Rs.110",
        tax: "Rs.0",
        tax2: "Rs.0",
        total: "Rs.110",
      },
      {
        id: "r2",
        date: "2025-03-14",
        category: "Subscriptions",
        title: "Envato",
        description:
          "envato subscription = 900 monthly from social media buzz\nRepeat every: 1 Month(s)\nCycles: 0/5\nNext recurring: 2025-04-14",
        amount: "Rs.4",
        tax: "Rs.0",
        tax2: "Rs.0",
        total: "Rs.4",
      },
    ],
    []
  );

  const employeeNameById = useMemo(() => {
    const m = new Map<string, string>();
    employees.forEach((e) => {
      const n = (e.name || `${e.firstName || ""} ${e.lastName || ""}`.trim() || "-").trim();
      if (e._id) m.set(e._id, n);
    });
    return m;
  }, [employees]);

  const projectNameById = useMemo(() => {
    const m = new Map<string, string>();
    projects.forEach((p) => {
      if (p._id) m.set(p._id, p.title || "-");
    });
    return m;
  }, [projects]);

  const clientNameById = useMemo(() => {
    const m = new Map<string, string>();
    clients.forEach((c) => {
      const n = (c.company || c.person || "-").trim();
      if (c._id) m.set(c._id, n);
    });
    return m;
  }, [clients]);

  const loadLookups = async () => {
    try {
      const headers = getAuthHeaders();
      const [empRes, clientRes, projRes] = await Promise.all([
        fetch(`${API_BASE}/api/employees`, { headers }),
        fetch(`${API_BASE}/api/clients`, { headers }),
        fetch(`${API_BASE}/api/projects`, { headers }),
      ]);
      const [empData, clientData, projData] = await Promise.all([
        empRes.ok ? empRes.json() : [],
        clientRes.ok ? clientRes.json() : [],
        projRes.ok ? projRes.json() : [],
      ]);
      setEmployees(Array.isArray(empData) ? empData : []);
      setClients(Array.isArray(clientData) ? clientData : []);
      setProjects(Array.isArray(projData) ? projData : []);
    } catch {
      toast({ title: "Error", description: "Failed to load employees/clients/projects", variant: "destructive" });
    }
  };

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (member !== "-") params.set("employeeId", member);
      if (project !== "-") params.set("projectId", project);
      const url = `${API_BASE}/api/expenses${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      setExpenses(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: "Error", description: "Failed to load expenses", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const saveExpense = async () => {
    try {
      if (!expenseForm.title.trim()) {
        toast({ title: "Missing title", description: "Please enter a title", variant: "destructive" });
        return;
      }
      const payload: any = {
        date: expenseForm.date ? new Date(expenseForm.date) : undefined,
        category: expenseForm.category || "",
        title: expenseForm.title.trim(),
        description: expenseForm.description || "",
        amount: expenseForm.amount ? Number(expenseForm.amount) : 0,
        tax: expenseForm.tax ? Number(expenseForm.tax) : 0,
        tax2: expenseForm.tax2 ? Number(expenseForm.tax2) : 0,
      };
      if (expenseForm.employeeId && expenseForm.employeeId !== "-") payload.employeeId = expenseForm.employeeId;
      if (expenseForm.clientId && expenseForm.clientId !== "-") payload.clientId = expenseForm.clientId;
      if (expenseForm.projectId && expenseForm.projectId !== "-") payload.projectId = expenseForm.projectId;

      const res = await fetch(`${API_BASE}/api/expenses`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Failed");
      }
      toast({ title: "Saved", description: "Expense added" });
      setOpenAddExpense(false);
      setExpenseForm({
        date: "",
        category: "",
        employeeId: "-",
        clientId: "-",
        projectId: "-",
        title: "",
        description: "",
        amount: "",
        tax: "",
        tax2: "",
      });
      await loadExpenses();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to save expense", variant: "destructive" });
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((x) => {
      const c = (x.category || "").trim();
      if (c) set.add(c);
    });
    const dynamic = Array.from(set).sort((a, b) => a.localeCompare(b));
    return ["Office Expense", "Subscriptions", ...dynamic.filter((x) => x !== "Office Expense" && x !== "Subscriptions")];
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    const q = query.trim().toLowerCase();
    return expenses
      .filter((x) => {
        if (category !== "-") {
          if ((x.category || "-") !== category) return false;
        }
        if (q) {
          const hay = `${x.title || ""} ${x.category || ""} ${x.description || ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .map((x) => {
        const amt = Number(x.amount || 0);
        const t1 = Number(x.tax || 0);
        const t2 = Number(x.tax2 || 0);
        const total = amt + t1 + t2;
        const dateStr = x.date ? new Date(x.date).toISOString().slice(0, 10) : (x.createdAt ? new Date(x.createdAt).toISOString().slice(0, 10) : "");
        return { ...x, _computed: { dateStr, total } } as any;
      });
  }, [expenses, category, query]);

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [query, member, project]);

  const openNewExpense = () => {
    setExpenseForm({
      date: "",
      category: "",
      employeeId: "-",
      clientId: "-",
      projectId: "-",
      title: "",
      description: "",
      amount: "",
      tax: "",
      tax2: "",
    });
    setOpenAddExpense(true);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-sm text-muted-foreground">Expenses</h1>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="bg-muted/40">
              <TabsTrigger value="list">List</TabsTrigger>
              <TabsTrigger value="recurring">Recurring</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={openImport} onOpenChange={setOpenImport}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" size="sm"><Upload className="w-4 h-4 mr-2"/>Import expense</Button>
            </DialogTrigger>
            <DialogContent className="bg-card">
              <DialogHeader><DialogTitle>Import expense</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <Input type="file" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={()=>setOpenImport(false)}>Close</Button>
                <Button type="button" onClick={()=>setOpenImport(false)}>Upload</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={openAddExpense} onOpenChange={setOpenAddExpense}>
            <Button type="button" variant="outline" size="sm" onClick={openNewExpense}><Plus className="w-4 h-4 mr-2"/>Add expense</Button>
            <DialogContent className="bg-card max-w-3xl" aria-describedby={undefined}>
              <DialogHeader><DialogTitle>Add expense</DialogTitle></DialogHeader>
              <div className="grid gap-3 sm:grid-cols-12">
                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Date</div>
                <div className="sm:col-span-9"><DatePicker value={expenseForm.date} onChange={(v)=>setExpenseForm((p)=>({ ...p, date: v }))} placeholder="Pick date" /></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Category</div>
                <div className="sm:col-span-9">
                  <Select value={expenseForm.category || "-"} onValueChange={(v)=>setExpenseForm((p)=>({ ...p, category: v === "-" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="- Category -"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-">- Category -</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Member</div>
                <div className="sm:col-span-9">
                  <Select value={expenseForm.employeeId} onValueChange={(v)=>setExpenseForm((p)=>({ ...p, employeeId: v }))}>
                    <SelectTrigger><SelectValue placeholder="- Member -"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-">- Member -</SelectItem>
                      {employees.map((e) => (
                        <SelectItem key={e._id} value={e._id}>{employeeNameById.get(e._id) || e.name || "-"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Client</div>
                <div className="sm:col-span-9">
                  <Select value={expenseForm.clientId} onValueChange={(v)=>setExpenseForm((p)=>({ ...p, clientId: v }))}>
                    <SelectTrigger><SelectValue placeholder="- Client -"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-">- Client -</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c._id} value={c._id}>{clientNameById.get(c._id) || c.company || c.person || "-"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Project</div>
                <div className="sm:col-span-9">
                  <Select value={expenseForm.projectId} onValueChange={(v)=>setExpenseForm((p)=>({ ...p, projectId: v }))}>
                    <SelectTrigger><SelectValue placeholder="- Project -"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-">- Project -</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p._id} value={p._id}>{projectNameById.get(p._id) || p.title || "-"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Title</div>
                <div className="sm:col-span-9"><Input placeholder="Title" value={expenseForm.title} onChange={(e)=>setExpenseForm((p)=>({ ...p, title: e.target.value }))} /></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Description</div>
                <div className="sm:col-span-9"><Textarea placeholder="Description" className="min-h-[96px]" value={expenseForm.description} onChange={(e)=>setExpenseForm((p)=>({ ...p, description: e.target.value }))} /></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Amount</div>
                <div className="sm:col-span-9"><Input placeholder="0.00" value={expenseForm.amount} onChange={(e)=>setExpenseForm((p)=>({ ...p, amount: e.target.value }))} /></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">TAX</div>
                <div className="sm:col-span-9"><Input placeholder="0.00" value={expenseForm.tax} onChange={(e)=>setExpenseForm((p)=>({ ...p, tax: e.target.value }))} /></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Second TAX</div>
                <div className="sm:col-span-9"><Input placeholder="0.00" value={expenseForm.tax2} onChange={(e)=>setExpenseForm((p)=>({ ...p, tax2: e.target.value }))} /></div>
              </div>
              <DialogFooter>
                <div className="w-full flex items-center justify-end gap-2">
                  <Button type="button" variant="outline" onClick={()=>setOpenAddExpense(false)}>Close</Button>
                  <Button type="button" onClick={saveExpense}>Save</Button>
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
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-40"><SelectValue placeholder="- Category -"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">- Category -</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={member} onValueChange={setMember}>
                <SelectTrigger className="w-40"><SelectValue placeholder="- Member -"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">- Member -</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e._id} value={e._id}>{employeeNameById.get(e._id) || e.name || "-"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={project} onValueChange={setProject}>
                <SelectTrigger className="w-40"><SelectValue placeholder="- Project -"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">- Project -</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p._id} value={p._id}>{projectNameById.get(p._id) || p.title || "-"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="inline-flex items-center gap-2">
                <Button variant="outline" size="icon"><ChevronLeft className="w-4 h-4"/></Button>
                <span className="text-sm text-muted-foreground">December 2025</span>
                <Button variant="outline" size="icon"><ChevronRight className="w-4 h-4"/></Button>
                <Button variant="success" size="icon"><RefreshCw className="w-4 h-4"/></Button>
              </div>
              <Button variant="outline" size="sm">Monthly</Button>
              <Button variant="outline" size="sm">Yearly</Button>
              <Button variant="outline" size="sm">Custom</Button>
              <Button variant="outline" size="sm">Dynamic</Button>
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

          {tab === "list" ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Files</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>TAX</TableHead>
                  <TableHead>Second TAX</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : filteredExpenses.length ? (
                  filteredExpenses.map((r: any) => (
                    <TableRow key={r._id}>
                      <TableCell className="text-primary underline cursor-pointer">{r._computed?.dateStr || "-"}</TableCell>
                      <TableCell>{r.category || "-"}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{r.title || "-"}</span>
                          <span className="text-xs text-muted-foreground">
                            {r.employeeId ? (employeeNameById.get(r.employeeId) || "-") : "-"}
                            {r.clientId ? ` • ${clientNameById.get(r.clientId) || "-"}` : ""}
                            {r.projectId ? ` • ${projectNameById.get(r.projectId) || "-"}` : ""}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.description || "-"}</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>{`Rs.${Number(r.amount || 0).toLocaleString()}`}</TableCell>
                      <TableCell>{`Rs.${Number(r.tax || 0).toLocaleString()}`}</TableCell>
                      <TableCell>{`Rs.${Number(r.tax2 || 0).toLocaleString()}`}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{`Rs.${Number(r._computed?.total || 0).toLocaleString()}`}</Badge>
                      </TableCell>
                      <TableCell className="text-right">⋮</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground">No record found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Files</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>TAX</TableHead>
                  <TableHead>Second TAX</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recurringRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-primary underline cursor-pointer">{r.date}</TableCell>
                    <TableCell>{r.category}</TableCell>
                    <TableCell>{r.title}</TableCell>
                    <TableCell className="whitespace-pre-line text-muted-foreground">{r.description}</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>{r.amount}</TableCell>
                    <TableCell>{r.tax}</TableCell>
                    <TableCell>{r.tax2}</TableCell>
                    <TableCell>{r.total}</TableCell>
                    <TableCell className="text-right">⋮</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="flex items-center justify-between p-3 border-t mt-2">
            <div className="flex items-center gap-2 text-sm">
              <Select defaultValue="10">
                <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span>0-0 / 0</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">‹</Button>
              <Button variant="outline" size="sm">›</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

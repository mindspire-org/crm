import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  Trash2, 
  Save, 
  RefreshCw, 
  Eye, 
  Calendar,
  Receipt,
  Zap,
  Activity,
  X,
  Search,
  ArrowRightLeft,
  Wallet,
  Building2,
  FileText,
  ChevronsUpDown,
  Check,
  ShieldCheck,
  Printer,
  Tags
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { cn } from "@/lib/utils";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useSettings } from "@/hooks/useSettings";

export default function Expenses() {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "draft" | "posted">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [openDelete, setOpenDelete] = useState(false);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");

  const [accountOpen, setAccountOpen] = useState(false);
  const [accountSearch, setAccountSearch] = useState("");
  const [vendorOpen, setVendorOpen] = useState(false);
  const [vendorSearch, setVendorSearch] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    amount: "",
    tax: "0",
    tax2: "0",
    date: new Date().toISOString().slice(0, 10),
    category: "General",
    accountId: "",
    vendorId: "",
    employeeId: "-",
    clientId: "-",
    projectId: "-",
    paymentMethod: "cash" as "cash" | "bank" | "payable",
    status: "draft" as "draft" | "posted"
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const sp = new URLSearchParams();
      if (rangeFrom) sp.set("from", rangeFrom);
      if (rangeTo) sp.set("to", rangeTo);
      const qs = sp.toString() ? "?" + sp.toString() : "";

      const [exRes, accRes, venRes, empRes, projRes, cliRes] = await Promise.all([
        fetch(`${API_BASE}/api/expenses${qs}`, { headers }),
        fetch(`${API_BASE}/api/accounts`, { headers }),
        fetch(`${API_BASE}/api/vendors`, { headers }),
        fetch(`${API_BASE}/api/employees`, { headers }),
        fetch(`${API_BASE}/api/projects`, { headers }),
        fetch(`${API_BASE}/api/clients`, { headers }),
      ]);

      if (exRes.ok) setExpenses(await exRes.json());
      if (accRes.ok) {
        const accs = await accRes.json();
        setAccounts(accs.filter((a: any) => a.type === "expense" || a.type === "asset" || a.type === "liability"));
      }
      if (venRes.ok) setVendors(await venRes.json());
      if (empRes.ok) setEmployees(await empRes.json());
      if (projRes.ok) setProjects(await projRes.json());
      if (cliRes.ok) setClients(await cliRes.json());
    } catch (error) {
      toast({ title: "Error", description: "Failed to sync registry", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (rangeFrom || rangeTo || tab || query || categoryFilter) {
      loadData();
    }
  }, [rangeFrom, rangeTo, tab, query, categoryFilter]);

  const filteredExpenses = useMemo(() => {
    let list = expenses;
    if (tab !== "all") {
      list = list.filter((e) => e.status === tab);
    }
    if (categoryFilter !== "all") {
      list = list.filter((e) => e.category === categoryFilter);
    }
    const s = query.toLowerCase();
    if (s) {
      list = list.filter((e) => 
        e.title?.toLowerCase().includes(s) || 
        e.description?.toLowerCase().includes(s) ||
        e.accountId?.name?.toLowerCase().includes(s) ||
        e.vendorId?.name?.toLowerCase().includes(s) ||
        e.employeeId?.name?.toLowerCase().includes(s)
      );
    }
    return list;
  }, [expenses, tab, query]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach(e => { if (e.category) set.add(e.category); });
    return Array.from(set).sort();
  }, [expenses]);

  const stats = useMemo(() => {
    const total = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const posted = expenses.filter(e => e.status === "posted").reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const draft = expenses.filter(e => e.status === "draft").reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    return { total, posted, draft };
  }, [expenses]);

  const postDraft = async (row: any) => {
    if (!row?._id) return;
    if (!row?.accountId?._id && !row?.accountId) {
      toast({ title: "Account Required", description: "Select an expense account before posting", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/expenses/${row._id}/post`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to post expense");
      toast({ title: "Posted", description: "Draft entry has been posted" });
      void loadData();
    } catch (e: any) {
      toast({ title: "Execution Error", description: String(e?.message || "Failed"), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const printExpenseSheet = () => {
    const win = window.open("", "_blank");
    if (!win) {
      toast({ title: "Popup Blocked", description: "Allow popups to print", variant: "destructive" });
      return;
    }

    const companyName = settings.general?.companyName || "Mind Spire ERP";
    const logoUrl = settings.general?.logoUrl 
      ? (settings.general.logoUrl.startsWith('http') ? settings.general.logoUrl : `${API_BASE}${settings.general.logoUrl}`)
      : null;

    const fromLabel = rangeFrom ? String(rangeFrom) : "--";
    const toLabel = rangeTo ? String(rangeTo) : "--";
    const total = filteredExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const rowsHtml = filteredExpenses
      .map((e) => {
        const dt = e?.date ? new Date(e.date).toISOString().slice(0, 10) : "";
        const acc = (e as any)?.accountId?.name || "";
        const entity = (e as any)?.vendorId?.name || (e as any)?.employeeId?.name || "GENERAL";
        const amt = Number(e?.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const status = String(e?.status || "").toUpperCase();
        const title = String(e?.title || "");
        const cat = String(e?.category || "General");
        return `
          <tr>
            <td>${dt}</td>
            <td>
              <div style="font-weight:700; color:#0f172a;">${title}</div>
              <div style="font-size:10px; color:#64748b; margin-top:2px;">${cat}</div>
            </td>
            <td>${acc}</td>
            <td>${entity}</td>
            <td class="num">${amt}</td>
            <td style="text-align:center">
              <span class="status-badge ${status.toLowerCase()}">${status}</span>
            </td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <html>
        <head>
          <title>Expense Sheet - ${companyName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #0f172a; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; }
            .brand-container { display: flex; align-items: center; gap: 15px; }
            .brand-logo { height: 50px; width: auto; object-fit: contain; }
            .brand-name { color: #10b981; font-weight: 800; font-size: 24px; letter-spacing: -0.025em; text-transform: uppercase; }
            .report-title { text-align: right; }
            .report-title h1 { margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 0.1em; color: #1e293b; }
            .meta { font-size: 11px; color: #64748b; margin-top: 4px; font-weight: 600; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f8fafc; text-align: left; padding: 12px 8px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 1px solid #e2e8f0; }
            td { padding: 12px 8px; font-size: 11px; border-bottom: 1px solid #f1f5f9; color: #334155; }
            .num { text-align: right; font-family: 'Courier New', monospace; font-weight: 700; font-size: 13px; }
            
            .status-badge { font-size: 8px; font-weight: 800; padding: 3px 8px; border-radius: 10px; text-transform: uppercase; border: 1px solid transparent; }
            .status-badge.posted { background: #ecfdf5; color: #059669; border-color: #d1fae5; }
            .status-badge.draft { background: #f1f5f9; color: #64748b; border-color: #e2e8f0; }

            .totals { margin-top: 30px; border-top: 2px solid #0f172a; }
            .totals-row { display: flex; justify-content: flex-end; padding: 15px 0; gap: 40px; }
            .total-item { text-align: right; }
            .total-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
            .total-val { font-size: 18px; font-weight: 800; color: #0f172a; }
            
            .footer { margin-top: 60px; font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px; text-transform: uppercase; letter-spacing: 0.1em; }
            @media print { body { padding: 0; } .header { border-bottom-color: #000; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand-container">
              ${logoUrl ? `<img src="${logoUrl}" class="brand-logo" alt="Logo" />` : ""}
              <div class="brand-name">${companyName}</div>
            </div>
            <div class="report-title">
              <h1>Expense Ledger Sheet</h1>
              <div class="meta">RANGE: ${fromLabel} → ${toLabel} | STATUS: ${String(tab).toUpperCase()}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 12%">Date</th>
                <th style="width: 30%">Narrative & Category</th>
                <th style="width: 20%">Account</th>
                <th style="width: 18%">Entity</th>
                <th style="width: 12%; text-align: right">Amount</th>
                <th style="width: 8%; text-align: center">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="totals-row">
              <div class="total-item">
                <div class="total-label">Total Entries</div>
                <div class="total-val">${filteredExpenses.length}</div>
              </div>
              <div class="total-item">
                <div class="total-label">Consolidated Outflow</div>
                <div class="total-val">PKR ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          </div>
          
          <div class="footer">
            Corporate Disbursement Audit • Mind Spire Financial Core 2.0 • Generated on ${new_date().toLocaleString()}
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  const handleSave = async (status: "draft" | "posted") => {
    if (!form.title || !form.amount || !form.accountId) {
      toast({ title: "Incomplete Protocol", description: "Title, Amount, and Account are required", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      const body = {
        ...form,
        amount: Number(form.amount || 0),
        tax: Number(form.tax || 0),
        tax2: Number(form.tax2 || 0),
        employeeId: form.employeeId === "-" ? undefined : form.employeeId,
        clientId: form.clientId === "-" ? undefined : form.clientId,
        projectId: form.projectId === "-" ? undefined : form.projectId,
        vendorId: form.vendorId === "none" || !form.vendorId ? undefined : form.vendorId,
        status,
      };
      
      const res = await fetch(`${API_BASE}/api/expenses`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast({ title: status === "posted" ? "Protocol Finalized" : "Draft Saved" });
        setShowAdd(false);
        resetForm();
        loadData();
      } else {
        const err = await res.json();
        throw new Error(err.error || "Registry rejected entry");
      }
    } catch (e: any) {
      toast({ title: "Execution Error", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleQuickAddVendor = async () => {
    if (!newVendorName.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/vendors`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ name: newVendorName.trim() }),
      });
      if (res.ok) {
        const created = await res.json();
        toast({ title: "Vendor Created" });
        setVendors(prev => [...prev, created]);
        setForm(prev => ({ ...prev, vendorId: created._id }));
        setShowAddVendor(false);
        setNewVendorName("");
      } else {
        const err = await res.json();
        throw new Error(err.error || "Failed to create vendor");
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`${API_BASE}/api/expenses/${deleteId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        toast({ title: "Entry Deleted" });
        setOpenDelete(false);
        setDeleteId(null);
        loadData();
      }
    } catch (e: any) {
      toast({ title: "Delete Failed", description: e.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      amount: "",
      tax: "0",
      tax2: "0",
      date: new Date().toISOString().slice(0, 10),
      category: "General",
      accountId: "",
      vendorId: "",
      employeeId: "-",
      clientId: "-",
      projectId: "-",
      paymentMethod: "cash",
      status: "draft"
    });
    setAccountOpen(false);
    setAccountSearch("");
    setVendorOpen(false);
    setVendorSearch("");
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 font-sans">
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-100/30 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-sky-100/30 blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-600 rounded-xl shadow-lg shadow-emerald-200">
                <ArrowRightLeft className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 uppercase">
                Expense <span className="text-emerald-600">Ledger</span>
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100 transition-colors py-1 px-3">
                <Activity className="w-3 h-3 mr-1.5" /> Financial Outflow
              </Badge>
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100 transition-colors py-1 px-3">
                <Building2 className="w-3 h-3 mr-1.5" /> Corporate Disbursement
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={printExpenseSheet}
              className="bg-white border-slate-200 hover:bg-slate-50 h-12 px-6 rounded-xl shadow-sm transition-all active:scale-95"
              disabled={filteredExpenses.length === 0}
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Sheet
            </Button>
            <Button
              size="lg"
              onClick={() => setShowAdd(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white h-12 px-8 rounded-xl shadow-lg shadow-slate-200 border-0 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            >
              <Plus className="w-5 h-5 mr-2" />
              Record Entry
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total Volume", value: stats.total, color: "text-slate-900", bg: "bg-white" },
            { label: "Finalized", value: stats.posted, color: "text-emerald-600", bg: "bg-emerald-50/50 border-emerald-100" },
            { label: "Pending Drafts", value: stats.draft, color: "text-amber-600", bg: "bg-amber-50/50 border-amber-100" },
          ].map((s, idx) => (
            <Card key={idx} className={cn("border-slate-200 shadow-sm rounded-2xl overflow-hidden", s.bg)}>
              <CardContent className="p-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{s.label}</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-bold text-slate-400">PKR</span>
                  <span className={cn("text-2xl font-bold tracking-tight", s.color)}>{s.value.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Action Entry Form */}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="relative z-20"
            >
              <Card className="border-0 shadow-2xl rounded-[2rem] overflow-hidden bg-white ring-1 ring-slate-200">
                <div className="bg-slate-900 p-8 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-emerald-500 rounded-xl">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white uppercase tracking-tight">Disbursement Entry</h2>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">New Outflow Protocol</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setShowAdd(false)} className="rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <CardContent className="p-8 sm:p-10 space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Effective Date</Label>
                      <DatePicker 
                        value={form.date} 
                        onChange={v => setForm({...form, date: v})} 
                        className="h-12 rounded-xl border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:ring-emerald-500 font-medium text-sm transition-all shadow-sm w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Expense Account</Label>
                      <Popover open={accountOpen} onOpenChange={setAccountOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full h-12 rounded-xl border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-emerald-500 font-medium text-sm text-slate-900 shadow-sm transition-all justify-between px-4"
                          >
                            <div className="flex items-center gap-2 truncate">
                              {form.accountId && accounts.find((a) => a._id === form.accountId) ? (
                                <>
                                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                    {accounts.find((a) => a._id === form.accountId)?.code}
                                  </span>
                                  <span className="truncate">{accounts.find((a) => a._id === form.accountId)?.name}</span>
                                </>
                              ) : (
                                <span className="text-slate-400 italic">Select Account</span>
                              )}
                            </div>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0 shadow-2xl border-slate-200 rounded-xl overflow-hidden" align="start">
                          <Command className="rounded-none">
                            <CommandInput placeholder="Search account..." className="h-11 border-none focus:ring-0" onValueChange={setAccountSearch} />
                            <CommandList className="max-h-[280px]">
                              <CommandEmpty>No account found.</CommandEmpty>
                              <CommandGroup heading="Expense Accounts">
                                {accounts
                                  .filter(a => a.type === "expense")
                                  .map((acc) => (
                                    <CommandItem
                                      key={acc._id}
                                      value={acc.code + " " + acc.name}
                                      onSelect={() => {
                                        setForm({...form, accountId: acc._id});
                                        setAccountOpen(false);
                                      }}
                                      className="py-2.5 px-4 cursor-pointer hover:bg-slate-50"
                                    >
                                      <div className="flex items-center w-full gap-2">
                                        <Check className={cn("h-4 w-4 text-emerald-600 shrink-0", form.accountId === acc._id ? "opacity-100" : "opacity-0")} />
                                        <span className="font-mono text-[10px] text-slate-400 min-w-[40px]">{acc.code}</span>
                                        <span className="font-medium truncate">{acc.name}</span>
                                      </div>
                                    </CommandItem>
                                  ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Vendor Entity</Label>
                      <Popover open={vendorOpen} onOpenChange={setVendorOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full h-12 rounded-xl border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-emerald-500 font-medium text-sm text-slate-900 shadow-sm transition-all justify-between px-4"
                          >
                            <div className="truncate">
                              {form.vendorId && vendors.find((v) => v._id === form.vendorId) ? (
                                vendors.find((v) => v._id === form.vendorId)?.name || vendors.find((v) => v._id === form.vendorId)?.company
                              ) : form.vendorId === "none" ? (
                                "General / No Vendor"
                              ) : (
                                <span className="text-slate-400 italic">Select Vendor</span>
                              )}
                            </div>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0 shadow-2xl border-slate-200 rounded-xl overflow-hidden" align="start">
                          <Command className="rounded-none">
                            <CommandInput placeholder="Search vendor..." className="h-11 border-none focus:ring-0" onValueChange={setVendorSearch} />
                            <CommandList className="max-h-[300px]">
                              <CommandEmpty>
                                <div className="p-4 text-center space-y-3">
                                  <p className="text-sm text-muted-foreground">No vendor found.</p>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-full gap-2 border-dashed"
                                    onClick={() => {
                                      setNewVendorName(vendorSearch);
                                      setShowAddVendor(true);
                                      setVendorOpen(false);
                                    }}
                                  >
                                    <Plus className="w-3 h-3" />
                                    Add \"" + vendorSearch + "\" as New Vendor
                                  </Button>
                                </div>
                              </CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  onSelect={() => {
                                    setForm({...form, vendorId: "none"});
                                    setVendorOpen(false);
                                  }}
                                  className="py-3 px-4 aria-selected:bg-emerald-50 cursor-pointer italic text-slate-400"
                                >
                                  <div className="flex items-center w-full gap-2">
                                    <Check className={cn("h-4 w-4 text-emerald-600 shrink-0", form.vendorId === "none" ? "opacity-100" : "opacity-0")} />
                                    <span>No Vendor (General)</span>
                                  </div>
                                </CommandItem>
                                <CommandItem
                                  onSelect={() => {
                                    setNewVendorName("");
                                    setShowAddVendor(true);
                                    setVendorOpen(false);
                                  }}
                                  className="py-3 px-4 aria-selected:bg-emerald-50 cursor-pointer text-emerald-600 font-bold"
                                >
                                  <div className="flex items-center w-full gap-2">
                                    <Plus className="h-4 w-4 shrink-0" />
                                    <span>Add New Vendor</span>
                                  </div>
                                </CommandItem>
                                {vendors.map((v) => {
                                  const label = v.name || v.company || "Unnamed";
                                  return (
                                    <CommandItem
                                      key={v._id}
                                      value={label}
                                      onSelect={() => {
                                        setForm({...form, vendorId: v._id});
                                        setVendorOpen(false);
                                      }}
                                      className="py-2.5 px-4 cursor-pointer"
                                    >
                                      <div className="flex items-center w-full gap-2">
                                        <Check className={cn("h-4 w-4 text-emerald-600 shrink-0", form.vendorId === v._id ? "opacity-100" : "opacity-0")} />
                                        <span className="font-medium truncate">{label}</span>
                                      </div>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="lg:col-span-3 space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Payment Method</Label>
                      <Select value={form.paymentMethod} onValueChange={(v: any) => setForm({...form, paymentMethod: v})}>
                        <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:ring-emerald-500 font-medium text-sm text-slate-900 shadow-sm transition-all hover:bg-white uppercase tracking-wider">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 rounded-xl shadow-2xl">
                          <SelectItem value="cash" className="text-xs font-bold uppercase tracking-widest py-3">Petty Cash</SelectItem>
                          <SelectItem value="bank" className="text-xs font-bold uppercase tracking-widest py-3">Bank Transfer</SelectItem>
                          <SelectItem value="payable" className="text-xs font-bold uppercase tracking-widest py-3">Accounts Payable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="lg:col-span-3 space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Expense Category</Label>
                      <Select value={form.category} onValueChange={(v: any) => setForm({...form, category: v})}>
                        <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:ring-emerald-500 font-medium text-sm text-slate-900 shadow-sm transition-all hover:bg-white uppercase tracking-wider">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 rounded-xl shadow-2xl">
                          <SelectItem value="General" className="text-xs font-bold uppercase tracking-widest py-3">General</SelectItem>
                          <SelectItem value="Rent" className="text-xs font-bold uppercase tracking-widest py-3">Rent</SelectItem>
                          <SelectItem value="Utilities" className="text-xs font-bold uppercase tracking-widest py-3">Utilities</SelectItem>
                          <SelectItem value="Salary" className="text-xs font-bold uppercase tracking-widest py-3">Salary</SelectItem>
                          <SelectItem value="Supplies" className="text-xs font-bold uppercase tracking-widest py-3">Supplies</SelectItem>
                          <SelectItem value="Marketing" className="text-xs font-bold uppercase tracking-widest py-3">Marketing</SelectItem>
                          <SelectItem value="Travel" className="text-xs font-bold uppercase tracking-widest py-3">Travel</SelectItem>
                          <SelectItem value="Taxes" className="text-xs font-bold uppercase tracking-widest py-3">Taxes</SelectItem>
                          <SelectItem value="Maintenance" className="text-xs font-bold uppercase tracking-widest py-3">Maintenance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-6 space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Narrative Title</Label>
                      <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Title of transaction..." className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-emerald-500 font-medium text-sm transition-all shadow-sm" />
                    </div>

                    <div className="lg:col-span-3 space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Principal Amount</Label>
                      <div className="relative group">
                        <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 group-focus-within:scale-110 transition-transform" />
                        <Input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="pl-11 h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-emerald-500 font-bold font-mono text-lg tabular-nums transition-all shadow-sm" placeholder="0.00" />
                      </div>
                    </div>

                    <div className="lg:col-span-3 space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Allocated TAX</Label>
                      <div className="relative">
                        <Input type="number" value={form.tax} onChange={e => setForm({...form, tax: e.target.value})} className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-emerald-500 font-medium font-mono text-sm tabular-nums transition-all shadow-sm" placeholder="0.00" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">PKR</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Operational Context</Label>
                    <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Contextual details of disbursement..." className="min-h-[140px] rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-emerald-500 font-medium text-sm transition-all shadow-sm p-6 resize-none" />
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-8 pt-6 border-t border-slate-100">
                    <div className="flex items-center gap-6 bg-slate-50 px-8 py-4 rounded-2xl border border-slate-200 shadow-inner w-full sm:w-auto">
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Final Disbursement</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-bold text-emerald-600/50 italic">PKR</span>
                          <span className="text-3xl font-bold tracking-tighter text-emerald-600 tabular-nums leading-none">
                            {((Number(form.amount) || 0) + (Number(form.tax) || 0) + (Number(form.tax2) || 0)).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-center gap-3 w-full sm:w-auto">
                      <Button variant="ghost" onClick={() => setShowAdd(false)} className="rounded-xl font-bold h-12 px-6 hover:bg-rose-50 text-slate-400 hover:text-rose-600 uppercase text-[10px] tracking-widest transition-all">ABORT</Button>
                      <Button 
                        onClick={() => handleSave("draft")} 
                        disabled={busy} 
                        className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 shadow-sm rounded-xl px-8 h-12 font-bold uppercase text-[10px] tracking-widest transition-all active:scale-95"
                      >
                        SAVE DRAFT
                      </Button>
                      <Button 
                        onClick={() => handleSave("posted")} 
                        disabled={busy} 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-100 rounded-xl px-10 h-12 font-bold uppercase text-[10px] tracking-widest border-0 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                      >
                        {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" />POST ENTRY</>}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Data List Section */}
        <div className="space-y-6 pt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                <Activity className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Disbursement Chronology</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Real-time Outflow Feed</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2 mr-2">
                <DatePicker 
                  value={rangeFrom} 
                  onChange={setRangeFrom} 
                  placeholder="From Date"
                  className="h-10 w-36 rounded-xl border-slate-200 bg-white shadow-sm transition-all focus:ring-emerald-500"
                />
                <span className="text-slate-400 font-bold"></span>
                <DatePicker 
                  value={rangeTo} 
                  onChange={setRangeTo} 
                  placeholder="To Date"
                  className="h-10 w-36 rounded-xl border-slate-200 bg-white shadow-sm transition-all focus:ring-emerald-500"
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
              </div>
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input 
                  placeholder="Filter registry..." 
                  value={query} 
                  onChange={(e) => setQuery(e.target.value)} 
                  className="pl-9 h-10 rounded-xl border-slate-200 bg-white shadow-sm transition-all focus:ring-emerald-500"
                />
              </div>
              <div className="flex p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className={cn(
                      "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                      categoryFilter !== "all" ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:text-slate-600"
                    )}>
                      <Tags className="w-3 h-3" />
                      {categoryFilter === "all" ? "Categories" : categoryFilter}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0 shadow-2xl border-slate-200 rounded-xl overflow-hidden" align="end">
                    <Command>
                      <CommandInput placeholder="Search categories..." className="h-9 border-none focus:ring-0" />
                      <CommandList className="max-h-[200px]">
                        <CommandEmpty>No category found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            onSelect={() => {
                              setCategoryFilter("all");
                            }}
                            className="py-2 px-4 cursor-pointer"
                          >
                            <div className="flex items-center w-full gap-2">
                              <Check className={cn("h-3.5 w-3.5 text-emerald-600", categoryFilter === "all" ? "opacity-100" : "opacity-0")} />
                              <span className="font-bold text-[10px] uppercase tracking-widest">All Categories</span>
                            </div>
                          </CommandItem>
                          {categories.map((cat) => (
                            <CommandItem
                              key={cat}
                              value={cat}
                              onSelect={() => {
                                setCategoryFilter(cat);
                              }}
                              className="py-2 px-4 cursor-pointer"
                            >
                              <div className="flex items-center w-full gap-2">
                                <Check className={cn("h-3.5 w-3.5 text-emerald-600", categoryFilter === cat ? "opacity-100" : "opacity-0")} />
                                <span className="font-bold text-[10px] uppercase tracking-widest">{cat}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
                {(["all", "draft", "posted"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                      tab === t ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Card className="border-slate-200 shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-y-0">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="py-5 px-8 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Date</th>
                    <th className="py-5 px-6 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Narrative</th>
                    <th className="py-5 px-6 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Account</th>
                    <th className="py-5 px-6 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Entity</th>
                    <th className="py-5 px-6 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Principal</th>
                    <th className="py-5 px-6 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                    <th className="py-5 px-8 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-32 text-center bg-white">
                        <div className="flex flex-col items-center gap-4 opacity-20 group">
                          <Receipt className="w-16 h-16 transition-transform group-hover:scale-110 duration-500" />
                          <p className="font-bold uppercase tracking-[0.4em] text-xs">Registry Void</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((e, i) => (
                      <tr key={e._id} className="group hover:bg-slate-50/80 transition-all duration-300">
                        <td className="py-6 px-8 text-sm font-bold text-slate-500 tabular-nums">
                          {new Date(e.date).toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" })}
                        </td>
                        <td className="py-6 px-6">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-700 uppercase tracking-tight text-sm line-clamp-1">{e.title}</span>
                            <span className="text-[10px] font-medium text-slate-400 line-clamp-1 mt-0.5">{e.description || "No description provided"}</span>
                          </div>
                        </td>
                        <td className="py-6 px-6">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="font-bold text-slate-600 uppercase text-[11px] truncate max-w-[140px]">{(e as any).accountId?.name || "UNLINKED"}</span>
                          </div>
                        </td>
                        <td className="py-6 px-6 text-center">
                          <Badge variant="outline" className="bg-white text-slate-500 border-slate-200 text-[9px] font-bold uppercase px-2 py-0.5 rounded-lg group-hover:bg-indigo-50 transition-colors">
                            {(e as any).vendorId?.name || (e as any).employeeId?.name || "GENERAL"}
                          </Badge>
                        </td>
                        <td className="py-6 px-6 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-bold text-lg tabular-nums tracking-tighter text-slate-900 group-hover:text-emerald-600 transition-colors">
                              {Number(e.amount).toLocaleString()}
                            </span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">PKR</span>
                          </div>
                        </td>
                        <td className="py-6 px-6 text-center">
                          <div className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-bold uppercase tracking-widest transition-all",
                            e.status === "posted" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-500 border-slate-200"
                          )}>
                            <div className={cn("w-1.5 h-1.5 rounded-full", e.status === "posted" ? "bg-emerald-500" : "bg-slate-400")} />
                            {e.status}
                          </div>
                        </td>
                        <td className="py-6 px-8 text-right">
                          <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                            {String(e.status) === "draft" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-sm border border-transparent hover:border-emerald-100"
                                onClick={() => postDraft(e)}
                                disabled={busy}
                              >
                                <ShieldCheck className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-xl hover:bg-white hover:text-emerald-600 hover:shadow-sm border border-transparent hover:border-slate-200"
                              onClick={() => navigate("/sales/expenses/" + e._id)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-xl hover:bg-rose-50 hover:text-rose-600 hover:shadow-sm border border-transparent hover:border-rose-100"
                              onClick={() => {
                                setDeleteId(e._id);
                                setOpenDelete(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl p-8">
          <DialogHeader className="space-y-3 pt-4">
            <div className="mx-auto w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center border border-rose-100 mb-2">
              <Trash2 className="w-6 h-6 text-rose-600" />
            </div>
            <DialogTitle className="text-center text-xl font-bold uppercase tracking-tight">Delete Disbursement?</DialogTitle>
            <div className="text-center text-sm text-slate-500 leading-relaxed">
              This action is permanent and will remove the entry from the registry. This cannot be undone.
            </div>
          </DialogHeader>
          <DialogFooter className="mt-8 flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={() => setOpenDelete(false)} className="w-full h-12 rounded-xl font-bold uppercase text-[10px] tracking-widest border-slate-200">CANCEL</Button>
            <Button onClick={handleDelete} className="w-full h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-rose-100 border-0">DELETE ENTRY</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddVendor} onOpenChange={setShowAddVendor}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl p-8 bg-white border-0 shadow-2xl">
          <DialogHeader className="space-y-3">
            <div className="mx-auto w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100 mb-2">
              <Building2 className="w-6 h-6 text-emerald-600" />
            </div>
            <DialogTitle className="text-center text-xl font-bold uppercase tracking-tight">Quick Add Vendor</DialogTitle>
            <div className="text-center text-sm text-slate-500 leading-relaxed italic uppercase tracking-widest text-[10px]">
              Provision new entity link for outflow registry
            </div>
          </DialogHeader>
          
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Entity Name</Label>
              <Input 
                value={newVendorName} 
                onChange={(e) => setNewVendorName(e.target.value)} 
                placeholder="Enter vendor or company name..."
                className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-emerald-500 font-medium text-sm transition-all"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowAddVendor(false)} 
              className="w-full h-12 rounded-xl font-bold uppercase text-[10px] tracking-widest border-slate-200"
            >
              CANCEL
            </Button>
            <Button 
              onClick={handleQuickAddVendor} 
              disabled={busy || !newVendorName.trim()}
              className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-slate-100 border-0 transition-all active:scale-95"
            >
              {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : "PROVISION ENTITY"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.2); }
      `}} />
    </div>
  );
}


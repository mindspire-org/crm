import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  Filter,
  ArrowRightLeft,
  Wallet,
  Building2,
  FileText,
  ChevronsUpDown,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { cn } from "@/lib/utils";

export default function Expenses() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);

  // Searchable dropdown states
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
      const [exRes, accRes, venRes, empRes, projRes, cliRes] = await Promise.all([
        fetch(`${API_BASE}/api/expenses`, { headers }),
        fetch(`${API_BASE}/api/accounts`, { headers }),
        fetch(`${API_BASE}/api/vendors`, { headers }),
        fetch(`${API_BASE}/api/employees`, { headers }),
        fetch(`${API_BASE}/api/projects`, { headers }),
        fetch(`${API_BASE}/api/clients`, { headers }),
      ]);

      if (exRes.ok) setExpenses(await exRes.ok ? await exRes.json() : []);
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
    void loadData();
  }, []);

  const handleSave = async (status: "draft" | "posted") => {
    if (!form.title || !form.amount || !form.accountId) {
      toast({ title: "Incomplete Protocol", description: "Title, Amount, and Account are required", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/expenses`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, status }),
      });

      if (res.ok) {
        toast({ title: status === "posted" ? "Protocol Finalized" : "Draft Saved" });
        setShowAdd(false);
        resetForm();
        void loadData();
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
    <div className="p-6 space-y-8 min-h-screen bg-slate-50 text-slate-900 font-sans">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-100/50 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-sky-100/50 blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative group overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-8 md:p-12 shadow-xl"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-transparent group-hover:opacity-100 transition-opacity duration-1000 opacity-50" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-emerald-100 rounded-[1.5rem] border border-emerald-200 shadow-sm">
                <ArrowRightLeft className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight uppercase leading-none">
                  Expense <span className="text-emerald-600">Ledger</span>
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-bold uppercase tracking-widest px-3 py-1">Financial Outflow Protocol</Badge>
                  <Badge className="bg-sky-100 text-sky-700 border-sky-200 text-[10px] font-bold uppercase tracking-widest px-3 py-1">Institutional Disbursement</Badge>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <Button 
              variant="outline" 
              onClick={loadData} 
              disabled={loading} 
              className="rounded-[1.5rem] bg-white border-slate-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 h-14 px-8 font-bold tracking-widest transition-all duration-300 text-xs"
            >
              <RefreshCw className={cn("w-4 h-4 mr-3", loading && "animate-spin text-emerald-600")} />
              SYNC REGISTRY
            </Button>
            {!showAdd && (
              <Button 
                onClick={() => setShowAdd(true)} 
                className="rounded-[1.5rem] bg-emerald-600 hover:bg-emerald-700 text-white h-14 px-10 font-bold tracking-widest shadow-lg border-0 transition-all duration-300 hover:scale-[1.02] active:scale-95 text-xs"
              >
                <Plus className="w-5 h-5 mr-3 stroke-[3px]" />
                RECORD DISBURSEMENT
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: "auto", scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            className="overflow-hidden"
          >
            <Card className="shadow-2xl bg-white rounded-[3rem] border border-slate-200 overflow-hidden relative">
              <div className="absolute top-6 right-6 z-10">
                <Button variant="ghost" size="icon" onClick={() => setShowAdd(false)} className="rounded-full bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600">
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 p-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-2xl border border-white/20">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white uppercase tracking-tight leading-none">Disbursement Entry</h2>
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">New Financial Outflow Protocol</p>
                  </div>
                </div>
                <Badge className="bg-white/20 text-white border-white/30 px-4 py-1.5 font-bold uppercase tracking-widest text-[10px]">Awaiting Finalization</Badge>
              </div>

              <CardContent className="p-10 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-600 ml-1">Effective Date</Label>
                    <div className="h-14 bg-slate-50 rounded-2xl border border-slate-200 flex items-center px-4 shadow-sm overflow-hidden transition-all hover:bg-white focus-within:bg-white focus-within:ring-1 focus-within:ring-emerald-500 text-slate-900">
                      <Calendar className="w-5 h-5 text-emerald-600 mr-3" />
                      <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="border-0 bg-transparent text-slate-900 focus-visible:ring-0 font-bold font-mono text-base tabular-nums p-0 h-full shadow-none" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-600 ml-1">Expense Account</Label>
                    <Popover open={accountOpen} onOpenChange={setAccountOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={accountOpen}
                          className="w-full h-14 rounded-2xl border-slate-200 bg-slate-50 hover:bg-white focus:ring-emerald-500 font-bold text-sm text-slate-900 shadow-sm transition-all uppercase tracking-tight justify-between"
                        >
                          {form.accountId && accounts.find((a) => a._id === form.accountId)
                            ? <><span className="opacity-40 mr-2 font-mono">{accounts.find((a) => a._id === form.accountId)?.code}</span>{accounts.find((a) => a._id === form.accountId)?.name}</>
                            : "Select Registry"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command value={accountSearch} onValueChange={setAccountSearch}>
                          <CommandInput placeholder="Search account..." className="h-12" />
                          <CommandList>
                            <CommandGroup>
                              <CommandItem
                                value=""
                                onSelect={() => {
                                  setForm({...form, accountId: ""});
                                  setAccountSearch("");
                                  setAccountOpen(false);
                                }}
                              >
                                <Check className={`mr-2 h-4 w-4 ${form.accountId === "" ? "opacity-100" : "opacity-0"}`} />
                                Select Registry
                              </CommandItem>
                              {accounts
                                .filter(a => a.type === "expense")
                                .filter((a) => {
                                  const q = String(accountSearch || "").trim().toLowerCase();
                                  if (!q) return true;
                                  return a.name?.toLowerCase().includes(q) || a.code?.toLowerCase().includes(q);
                                })
                                .map((acc) => {
                                  const selected = form.accountId === acc._id;
                                  return (
                                    <CommandItem
                                      key={acc._id}
                                      value={`${acc.code} ${acc.name}`}
                                      onSelect={() => {
                                        setForm({...form, accountId: acc._id});
                                        setAccountSearch("");
                                        setAccountOpen(false);
                                      }}
                                    >
                                      <Check className={`mr-2 h-4 w-4 ${selected ? "opacity-100" : "opacity-0"}`} />
                                      <span className="opacity-40 mr-2 font-mono">{acc.code}</span>
                                      {acc.name}
                                    </CommandItem>
                                  );
                                })}
                            </CommandGroup>
                            {accounts.filter(a => a.type === "expense").filter((a) => {
                              const q = String(accountSearch || "").trim().toLowerCase();
                              if (!q) return false;
                              return a.name?.toLowerCase().includes(q) || a.code?.toLowerCase().includes(q);
                            }).length === 0 && String(accountSearch || "").trim() ? (
                              <CommandEmpty>No account found.</CommandEmpty>
                            ) : null}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-600 ml-1">Vendor Entity</Label>
                    <Popover open={vendorOpen} onOpenChange={setVendorOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={vendorOpen}
                          className="w-full h-14 rounded-2xl border-slate-200 bg-slate-50 hover:bg-white focus:ring-emerald-500 font-bold text-sm text-slate-900 shadow-sm transition-all uppercase tracking-tight justify-between"
                        >
                          {form.vendorId && vendors.find((v) => v._id === form.vendorId)
                            ? vendors.find((v) => v._id === form.vendorId)?.name || vendors.find((v) => v._id === form.vendorId)?.company
                            : "Select Vendor"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command value={vendorSearch} onValueChange={setVendorSearch}>
                          <CommandInput placeholder="Search vendor..." className="h-12" />
                          <CommandList>
                            <CommandGroup>
                              <CommandItem
                                value="none"
                                onSelect={() => {
                                  setForm({...form, vendorId: "none"});
                                  setVendorSearch("");
                                  setVendorOpen(false);
                                }}
                              >
                                <Check className={`mr-2 h-4 w-4 ${form.vendorId === "none" ? "opacity-100" : "opacity-0"}`} />
                                No Vendor
                              </CommandItem>
                              {vendors
                                .filter((v) => {
                                  const q = String(vendorSearch || "").trim().toLowerCase();
                                  if (!q) return true;
                                  const label = (v.name || v.company || "").toLowerCase();
                                  return label.includes(q);
                                })
                                .map((v) => {
                                  const selected = form.vendorId === v._id;
                                  const label = v.name || v.company || "Unnamed";
                                  return (
                                    <CommandItem
                                      key={v._id}
                                      value={label}
                                      onSelect={() => {
                                        setForm({...form, vendorId: v._id});
                                        setVendorSearch("");
                                        setVendorOpen(false);
                                      }}
                                    >
                                      <Check className={`mr-2 h-4 w-4 ${selected ? "opacity-100" : "opacity-0"}`} />
                                      {label}
                                    </CommandItem>
                                  );
                                })}
                            </CommandGroup>
                            {vendors.filter((v) => {
                              const q = String(vendorSearch || "").trim().toLowerCase();
                              if (!q) return false;
                              const label = (v.name || v.company || "").toLowerCase();
                              return label.includes(q);
                            }).length === 0 && String(vendorSearch || "").trim() ? (
                              <CommandEmpty>No vendor found.</CommandEmpty>
                            ) : null}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-600 ml-1">Payment Method</Label>
                    <Select value={form.paymentMethod} onValueChange={(v: any) => setForm({...form, paymentMethod: v})}>
                      <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-slate-50 focus:ring-emerald-500 font-bold text-sm text-slate-900 shadow-sm transition-all hover:bg-white uppercase tracking-tight">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 rounded-2xl text-slate-900 shadow-xl">
                        <SelectItem value="cash" className="font-bold uppercase text-[10px] tracking-widest">Petty Cash</SelectItem>
                        <SelectItem value="bank" className="font-bold uppercase text-[10px] tracking-widest">Bank Transfer</SelectItem>
                        <SelectItem value="payable" className="font-bold uppercase text-[10px] tracking-widest">Accounts Payable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2 space-y-3">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-600 ml-1">Disbursement Title</Label>
                    <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Title of transaction..." className="h-14 rounded-2xl border-slate-200 bg-slate-50 focus-visible:ring-emerald-500 font-bold text-slate-900 shadow-sm transition-all hover:bg-white" />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-600 ml-1">Principal Amount</Label>
                    <div className="h-14 bg-slate-50 rounded-2xl border border-slate-200 flex items-center px-4 shadow-sm overflow-hidden transition-all hover:bg-white focus-within:bg-white focus-within:ring-1 focus-within:ring-emerald-500 text-slate-900">
                      <Wallet className="w-5 h-5 text-emerald-600 mr-3" />
                      <Input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="border-0 bg-transparent text-slate-900 focus-visible:ring-0 font-bold font-mono text-xl tabular-nums p-0 h-full shadow-none" placeholder="0.00" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-600 ml-1">Allocated TAX</Label>
                    <Input type="number" value={form.tax} onChange={e => setForm({...form, tax: e.target.value})} className="h-14 rounded-2xl border-slate-200 bg-slate-50 focus-visible:ring-emerald-500 font-bold font-mono text-slate-900 shadow-sm transition-all hover:bg-white" placeholder="0.00" />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-600 ml-1">Operational Narrative</Label>
                  <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Contextual details of disbursement..." className="min-h-[120px] rounded-3xl border-slate-200 bg-slate-50 focus-visible:ring-emerald-500 font-bold text-slate-900 shadow-sm transition-all hover:bg-white p-6" />
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center gap-10 pt-6">
                  <div className="flex gap-10 items-center bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200 shadow-inner">
                    <div className="space-y-1 text-center min-w-[200px]">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em]">Total Disbursement</p>
                      <p className="text-5xl font-bold tabular-nums tracking-tighter leading-none text-emerald-600">
                        PKR {((Number(form.amount) || 0) + (Number(form.tax) || 0) + (Number(form.tax2) || 0)).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button variant="ghost" onClick={() => setShowAdd(false)} className="rounded-2xl font-bold tracking-[0.2em] h-16 px-10 hover:bg-slate-50 transition-all text-slate-400 hover:text-slate-900 uppercase text-[10px]">ABORT PROTOCOL</Button>
                    <Button 
                      onClick={() => handleSave("draft")} 
                      disabled={busy} 
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 shadow-md rounded-2xl px-12 h-16 font-bold tracking-[0.2em] border-0 transition-all hover:scale-[1.02] active:scale-95 uppercase text-[10px]"
                    >
                      SAVE AS DRAFT
                    </Button>
                    <Button 
                      onClick={() => handleSave("posted")} 
                      disabled={busy} 
                      className="bg-emerald-600 hover:bg-emerald-700 shadow-lg rounded-2xl px-12 h-16 font-bold tracking-[0.2em] border-0 transition-all hover:scale-[1.02] active:scale-95 text-white uppercase text-[10px]"
                    >
                      {busy ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><Save className="w-6 h-6 mr-3" />POST TO REGISTRY</>}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 mt-12 relative text-slate-900">
        <div className="flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-emerald-100 border border-emerald-200 shadow-sm">
              <Activity className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold uppercase tracking-tight leading-none">Disbursement Chronology</h3>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mt-2">Real-time Outflow Registry Feed</p>
            </div>
          </div>
          <Badge variant="outline" className="border-slate-200 bg-white text-emerald-600 font-bold px-6 py-2 rounded-2xl uppercase tracking-[0.2em] text-[10px] shadow-sm">
            Total Operational Depth: {expenses.length} Entries
          </Badge>
        </div>

        <Card className="shadow-xl rounded-[3.5rem] overflow-hidden bg-white border border-slate-200 p-1 text-slate-900">
          <div className="overflow-x-auto p-4">
            <table className="w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-slate-400">
                  <th className="py-6 px-8 text-left text-[10px] font-bold uppercase tracking-[0.3em]">Chronology</th>
                  <th className="py-6 px-6 text-left text-[10px] font-bold uppercase tracking-[0.3em]">Operational Narrative</th>
                  <th className="py-6 px-6 text-left text-[10px] font-bold uppercase tracking-[0.3em]">Registry Account</th>
                  <th className="py-6 px-6 text-left text-[10px] font-bold uppercase tracking-[0.3em]">Entity Link</th>
                  <th className="py-6 px-6 text-right text-[10px] font-bold uppercase tracking-[0.3em]">Principal Value</th>
                  <th className="py-6 px-6 text-center text-[10px] font-bold uppercase tracking-[0.3em]">Status</th>
                  <th className="py-6 px-8 text-[10px] font-bold uppercase tracking-[0.3em] text-right">Control</th>
                </tr>
              </thead>
              <tbody className="divide-y-0">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-40 border-0">
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-6 opacity-20">
                        <Receipt className="w-24 h-24 stroke-[1px]" />
                        <p className="font-bold uppercase tracking-[0.5em] text-sm">Registry Void</p>
                      </motion.div>
                    </td>
                  </tr>
                ) : (
                  expenses.map((e, i) => (
                    <motion.tr 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      key={e._id} 
                      className="group transition-all duration-300 rounded-[2rem] overflow-hidden hover:bg-slate-50 bg-slate-50/50 border border-slate-100"
                    >
                      <TableCell className="py-7 px-8 font-bold text-slate-500 tabular-nums text-sm border-0">{new Date(e.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })}</TableCell>
                      <TableCell className="py-7 px-6 border-0">
                         <div className="flex flex-col">
                           <span className="font-bold text-slate-700 uppercase tracking-tight text-base">{e.title || "SYSTEM_NULL_TITLE"}</span>
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 truncate max-w-[200px]">{e.description || "N/A"}</span>
                         </div>
                      </TableCell>
                      <TableCell className="py-7 px-6 border-0">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-emerald-600" />
                          <span className="font-bold text-slate-600 uppercase text-xs">{(e as any).accountId?.name || "UNLINKED"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-7 px-6 border-0">
                        <Badge variant="outline" className="bg-white text-slate-500 border-slate-200 font-bold uppercase text-[9px] px-3 py-1.5 tracking-[0.1em] rounded-xl group-hover:bg-indigo-50 transition-all shadow-sm">
                          {(e as any).vendorId?.name || (e as any).employeeId?.name || "GENERAL"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-7 px-6 text-right border-0">
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-2xl tabular-nums tracking-tighter text-slate-900 leading-none group-hover:text-emerald-600 transition-colors">
                            {Number(e.amount).toLocaleString()}
                          </span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">PKR</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-7 px-6 text-center border-0">
                        <div className={cn(
                          "inline-flex items-center gap-2.5 px-5 py-2 rounded-full border text-[9px] font-bold uppercase tracking-[0.2em] transition-all",
                          e.status === 'posted' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'
                        )}>
                          <div className={cn("w-2 h-2 rounded-full", e.status === 'posted' ? 'bg-emerald-500' : 'bg-slate-400')} />
                          {e.status}
                        </div>
                      </TableCell>
                      <TableCell className="py-7 px-8 text-right border-0">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                          {e.voucherId && (
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white border border-slate-200 hover:bg-emerald-50 text-emerald-600 shadow-sm" title="View Voucher">
                              <FileText className="w-5 h-5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white border border-slate-200 hover:bg-emerald-50 text-emerald-600 shadow-sm">
                            <Eye className="w-5 h-5" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

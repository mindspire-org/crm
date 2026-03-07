import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
  Filter
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { motion, AnimatePresence } from "framer-motion";

type VoucherType = "sales_invoice" | "customer_payment" | "vendor_bill" | "expense" | "vendor_payment" | "journal";

interface Line {
  accountCode: string;
  debit: number;
  credit: number;
  description: string;
  entityType?: "client" | "vendor" | "employee";
  entityId?: string;
}

export default function Vouchers() {
  const [loading, setLoading] = useState(false);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  
  const [showAdd, setShowAdd] = useState(false);
  const [type, setType] = useState<VoucherType>("journal");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState("");
  const [refNo, setRefNo] = useState("");
  const [entityType, setEntityType] = useState<"client" | "vendor" | "employee">("client");
  const [entityId, setEntityId] = useState<string>("");
  const [lines, setLines] = useState<Line[]>([
    { accountCode: "", debit: 0, credit: 0, description: "" },
    { accountCode: "", debit: 0, credit: 0, description: "" },
  ]);

  const totalDebit = lines.reduce((sum, l) => sum + Number(l.debit || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + Number(l.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const [vRes, aRes, cRes, venRes] = await Promise.all([
        fetch(`${API_BASE}/api/vouchers`, { headers }),
        fetch(`${API_BASE}/api/accounts`, { headers }),
        fetch(`${API_BASE}/api/clients`, { headers }),
        fetch(`${API_BASE}/api/vendors`, { headers }),
      ]);
      
      if (vRes.ok) setVouchers(await vRes.json());
      if (aRes.ok) setAccounts(await aRes.json());
      if (cRes.ok) setClients(await cRes.json());
      if (venRes.ok) setVendors(await venRes.json());
    } finally {
      setLoading(false);
    }
  };

  const addLine = () => {
    setLines([...lines, { accountCode: "", debit: 0, credit: 0, description: "" }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const updateLine = (index: number, patch: Partial<Line>) => {
    setLines(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const handlePost = async () => {
    if (!isBalanced) {
      toast.error("Voucher must be balanced (Debits = Credits)");
      return;
    }
    if (lines.some(l => !l.accountCode)) {
      toast.error("Please select accounts for all lines");
      return;
    }

    setLoading(true);
    try {
      const headers = { ...getAuthHeaders(), "Content-Type": "application/json" };
      const processedLines = lines.map(l => {
        const acc = accounts.find(a => a.code === l.accountCode);
        return {
          ...l,
          accountId: acc?._id,
        };
      });

      const res = await fetch(`${API_BASE}/api/vouchers`, {
        method: "POST",
        headers,
        body: JSON.stringify({ 
          type, 
          date, 
          memo, 
          refNo, 
          lines: processedLines,
          clientId: entityType === "client" ? entityId : undefined,
          vendorId: entityType === "vendor" ? entityId : undefined,
          employeeId: entityType === "employee" ? entityId : undefined,
        }),
      });

      if (res.ok) {
        toast.success("Voucher posted to terminal");
        setShowAdd(false);
        resetForm();
        void loadData();
      } else {
        const err = await res.json();
        throw new Error(err.error || "Registry rejected voucher");
      }
    } catch (e: any) {
      toast.error(e.message || "An error occurred during posting");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDate(new Date().toISOString().slice(0, 10));
    setMemo("");
    setRefNo("");
    setLines([
      { accountCode: "", debit: 0, credit: 0, description: "" },
      { accountCode: "", debit: 0, credit: 0, description: "" },
    ]);
  };

  const typeLabels: Record<VoucherType, string> = {
    sales_invoice: "Sales Invoice",
    customer_payment: "Customer Payment",
    vendor_bill: "Vendor Bill",
    expense: "Expense",
    vendor_payment: "Vendor Payment",
    journal: "Journal Entry",
  };

  return (
    <div className="p-6 space-y-8 min-h-screen bg-slate-50 text-slate-900 font-sans">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-100 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-100 blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative group overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-8 md:p-12 shadow-xl"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-transparent group-hover:opacity-100 transition-opacity duration-1000 opacity-50" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-indigo-100 rounded-[1.5rem] border border-indigo-200 shadow-sm">
                <Receipt className="w-8 h-8 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight uppercase leading-none">
                  Voucher <span className="text-indigo-600">Terminal</span>
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px] font-bold uppercase tracking-widest px-3 py-1">Double-Entry Source Protocol</Badge>
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-bold uppercase tracking-widest px-3 py-1">Institutional Audit Trail</Badge>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <Button 
              variant="outline" 
              onClick={loadData} 
              disabled={loading} 
              className="rounded-[1.5rem] bg-white border-slate-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 h-14 px-8 font-bold tracking-widest transition-all duration-300 text-xs"
            >
              <RefreshCw className={cn("w-4 h-4 mr-3", loading && "animate-spin text-indigo-600")} />
              SYNC TERMINAL
            </Button>
            {!showAdd && (
              <Button 
                onClick={() => setShowAdd(true)} 
                className="rounded-[1.5rem] bg-indigo-600 hover:bg-indigo-700 text-white h-14 px-10 font-bold tracking-widest shadow-lg border-0 transition-all duration-300 hover:scale-[1.02] active:scale-95 text-xs"
              >
                <Plus className="w-5 h-5 mr-3 stroke-[3px]" />
                NEW VOUCHER
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
              
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-2xl border border-white/20">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white uppercase tracking-tight leading-none">Drafting Source Protocol</h2>
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">{typeLabels[type]}</p>
                  </div>
                </div>
                <Badge className="bg-white/20 text-white border-white/30 px-4 py-1.5 font-bold uppercase tracking-widest text-[10px]">Awaiting Finalization</Badge>
              </div>

              <CardContent className="p-10 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-600 ml-1">Voucher Taxonomy</Label>
                    <Select value={type} onValueChange={(v: VoucherType) => {
                      setType(v);
                      if (v === "sales_invoice" || v === "customer_payment") setEntityType("client");
                      else if (v === "vendor_bill" || v === "vendor_payment") setEntityType("vendor");
                    }}>
                      <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-slate-50 focus:ring-indigo-500 font-bold uppercase text-[10px] tracking-widest text-slate-900 shadow-sm transition-all hover:bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 rounded-2xl text-slate-900 shadow-xl">
                        {Object.entries(typeLabels).map(([val, label]) => (
                          <SelectItem key={val} value={val} className="py-3 uppercase font-bold text-[10px] tracking-widest hover:bg-indigo-50 transition-colors">{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {type !== "journal" && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
                      <Label className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-600 ml-1">{entityType.toUpperCase()} PROTOCOL</Label>
                      <Select value={entityId} onValueChange={setEntityId}>
                        <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-slate-50 focus:ring-indigo-500 font-bold text-sm text-slate-900 shadow-sm transition-all hover:bg-white">
                          <SelectValue placeholder={`Link ${entityType}`} />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 rounded-2xl text-slate-900 shadow-xl">
                          {entityType === "client" ? (
                            clients.map(c => <SelectItem key={c._id} value={c._id} className="font-bold">{c.company || c.person}</SelectItem>)
                          ) : entityType === "vendor" ? (
                            vendors.map(v => <SelectItem key={v._id} value={v._id} className="font-bold">{v.name || v.company}</SelectItem>)
                          ) : null}
                        </SelectContent>
                      </Select>
                    </motion.div>
                  )}

                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-600 ml-1">Effective Date</Label>
                    <div className="h-14 bg-slate-50 rounded-2xl border border-slate-200 flex items-center px-4 shadow-sm overflow-hidden transition-all hover:bg-white focus-within:bg-white focus-within:ring-1 focus-within:ring-indigo-500 text-slate-900">
                      <Calendar className="w-5 h-5 text-indigo-600 mr-3" />
                      <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="border-0 bg-transparent text-slate-900 focus-visible:ring-0 font-bold font-mono text-base tabular-nums p-0 h-full shadow-none" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-600 ml-1">Reference ID</Label>
                    <Input value={refNo} onChange={e => setRefNo(e.target.value)} placeholder="PROTOCOL_REF" className="h-14 rounded-2xl border-slate-200 bg-slate-50 focus-visible:ring-indigo-500 font-bold font-mono tracking-widest text-slate-900 shadow-sm transition-all hover:bg-white" />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-600 ml-1">Operational Memo</Label>
                    <Input value={memo} onChange={e => setMemo(e.target.value)} placeholder="Context narrative..." className="h-14 rounded-2xl border-slate-200 bg-slate-50 focus-visible:ring-indigo-500 font-bold text-slate-900 shadow-sm transition-all hover:bg-white" />
                  </div>
                </div>

                <div className="rounded-[2.5rem] border border-slate-200 bg-slate-50 shadow-inner overflow-hidden p-1 text-slate-900">
                  <Table className="border-separate border-spacing-y-2">
                    <TableHeader>
                      <TableRow className="border-0 hover:bg-transparent">
                        <TableHead className="py-6 px-8 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 border-0">Ledger Registry</TableHead>
                        <TableHead className="py-6 px-6 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 border-0">Narrative</TableHead>
                        <TableHead className="py-6 px-6 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 text-right border-0">Debit</TableHead>
                        <TableHead className="py-6 px-6 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 text-right border-0">Credit</TableHead>
                        <TableHead className="py-6 px-8 w-[80px] border-0"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((line, idx) => (
                        <TableRow key={idx} className="group transition-all duration-300 rounded-2xl overflow-hidden hover:bg-indigo-50 bg-white border border-slate-100 shadow-sm">
                          <TableCell className="py-6 px-8 border-0">
                            <Select value={line.accountCode} onValueChange={v => updateLine(idx, { accountCode: v })}>
                              <SelectTrigger className="border-0 shadow-none focus:ring-0 bg-transparent h-auto p-0 font-bold text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-tight text-lg leading-none">
                                <SelectValue placeholder="SELECT REGISTRY" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-slate-200 rounded-2xl text-slate-900 shadow-xl max-h-[400px]">
                                {accounts.map(acc => (
                                  <SelectItem key={acc.code} value={acc.code} className="py-3 uppercase font-bold text-[10px] tracking-widest border-b border-slate-50 last:border-0 hover:bg-indigo-50">
                                    <span className="opacity-40 mr-2 font-mono">{acc.code}</span>
                                    {acc.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="py-6 px-6 border-0">
                            <Input value={line.description} onChange={e => updateLine(idx, { description: e.target.value })} placeholder="Registry note..." className="border-0 shadow-none focus-visible:ring-0 bg-transparent p-0 font-bold text-slate-500 group-hover:text-slate-900 transition-colors h-auto" />
                          </TableCell>
                          <TableCell className="py-6 px-6 border-0">
                            <Input type="number" value={line.debit || ""} onChange={e => updateLine(idx, { debit: Number(e.target.value), credit: 0 })} className="text-right border-0 shadow-none focus-visible:ring-0 bg-transparent p-0 font-bold text-2xl tabular-nums tracking-tighter text-indigo-600 placeholder:opacity-10 h-auto" placeholder="0.00" />
                          </TableCell>
                          <TableCell className="py-6 px-6 border-0">
                            <Input type="number" value={line.credit || ""} onChange={e => updateLine(idx, { credit: Number(e.target.value), debit: 0 })} className="text-right border-0 shadow-none focus-visible:ring-0 bg-transparent p-0 font-bold text-2xl tabular-nums tracking-tighter text-rose-600 placeholder:opacity-10 h-auto" placeholder="0.00" />
                          </TableCell>
                          <TableCell className="py-6 px-8 text-right border-0">
                            <Button variant="ghost" size="icon" onClick={() => removeLine(idx)} disabled={lines.length <= 2} className="text-slate-200 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                              <Trash2 className="w-5 h-5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
                  <Button variant="outline" onClick={addLine} className="rounded-2xl border-slate-200 text-slate-700 bg-white hover:bg-indigo-50 hover:border-indigo-200 px-10 h-16 font-bold tracking-[0.2em] transition-all uppercase shadow-sm active:scale-95 text-[10px]">
                    <Plus className="w-6 h-6 mr-3 stroke-[3px] text-indigo-600" />
                    EXTEND PROTOCOL
                  </Button>
                  
                  <motion.div layout className="flex gap-10 items-center bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200 shadow-inner">
                    <div className="space-y-1 pr-10 border-r border-slate-200 text-center">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em]">Total Inflow</p>
                      <p className="text-4xl font-bold tabular-nums tracking-tighter leading-none">{totalDebit.toLocaleString()}</p>
                    </div>
                    <div className="space-y-1 pr-10 border-r border-slate-200 text-center">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em]">Total Outflow</p>
                      <p className="text-4xl font-bold tabular-nums tracking-tighter leading-none">{totalCredit.toLocaleString()}</p>
                    </div>
                    <div className="space-y-1 text-center min-w-[160px]">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em]">Integrity Delta</p>
                      <p className={cn("text-4xl font-bold tabular-nums tracking-tighter leading-none transition-all duration-500", isBalanced ? "text-emerald-600" : "text-rose-600 animate-pulse")}>
                        {Math.abs(totalDebit - totalCredit).toLocaleString()}
                      </p>
                    </div>
                  </motion.div>
                </div>

                <div className="flex justify-end gap-6 pt-10 border-t border-slate-100 mt-4 text-slate-900">
                  <Button variant="ghost" onClick={() => setShowAdd(false)} className="rounded-2xl font-bold tracking-[0.2em] h-16 px-10 hover:bg-slate-50 transition-all text-slate-400 hover:text-slate-900 uppercase text-[10px]">ABORT TRANSACTION</Button>
                  <Button 
                    onClick={handlePost} 
                    disabled={!isBalanced || loading} 
                    className="bg-indigo-600 hover:bg-indigo-700 shadow-lg rounded-2xl px-12 h-16 font-bold tracking-[0.2em] border-0 disabled:opacity-30 transition-all hover:scale-[1.02] active:scale-95 text-white uppercase text-[10px]"
                  >
                    {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><Save className="w-6 h-6 mr-3" />FINALIZE PROTOCOL</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 mt-12 relative text-slate-900">
        <div className="flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-indigo-100 border border-indigo-200 shadow-sm">
              <Activity className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold uppercase tracking-tight leading-none">Voucher Chronology</h3>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mt-2">Real-time Double-Entry Registry Feed</p>
            </div>
          </div>
          <Badge variant="outline" className="border-slate-200 bg-white text-indigo-600 font-bold px-6 py-2 rounded-2xl uppercase tracking-[0.2em] text-[10px] shadow-sm">
            Total Operational Depth: {vouchers.length} Entries
          </Badge>
        </div>

        <Card className="shadow-xl rounded-[3.5rem] overflow-hidden bg-white border border-slate-200 p-1 text-slate-900">
          <div className="overflow-x-auto p-4">
            <table className="w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-slate-400">
                  <th className="py-6 px-8 text-left text-[10px] font-bold uppercase tracking-[0.3em]">Registry ID</th>
                  <th className="py-6 px-6 text-left text-[10px] font-bold uppercase tracking-[0.3em]">Taxonomy</th>
                  <th className="py-6 px-6 text-left text-[10px] font-bold uppercase tracking-[0.3em]">Chronology</th>
                  <th className="py-6 px-6 text-left text-[10px] font-bold uppercase tracking-[0.3em]">Operational Narrative</th>
                  <th className="py-6 px-6 text-left text-[10px] font-bold uppercase tracking-[0.3em]">Reference</th>
                  <th className="py-6 px-6 text-right text-[10px] font-bold uppercase tracking-[0.3em]">Yield Value</th>
                  <th className="py-6 px-6 text-center text-[10px] font-bold uppercase tracking-[0.3em]">Status</th>
                  <th className="py-6 px-8 text-[10px] font-bold uppercase tracking-[0.3em] text-right">Control</th>
                </tr>
              </thead>
              <tbody className="divide-y-0">
                {vouchers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-40 border-0">
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-6 opacity-20">
                        <Receipt className="w-24 h-24 stroke-[1px]" />
                        <p className="font-bold uppercase tracking-[0.5em] text-sm">Terminal Registry Void</p>
                      </motion.div>
                    </td>
                  </tr>
                ) : (
                  vouchers.map((v, i) => (
                    <motion.tr 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      key={v._id} 
                      className="group transition-all duration-300 rounded-[2rem] overflow-hidden hover:bg-slate-50 bg-slate-50/50 border border-slate-100"
                    >
                      <TableCell className="py-7 px-8 font-bold font-mono text-indigo-600 tracking-[0.1em] text-xs uppercase leading-none border-0">{v.voucherNo}</TableCell>
                      <TableCell className="py-7 px-6 border-0">
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100 font-bold uppercase text-[9px] px-3 py-1.5 tracking-[0.2em] rounded-xl group-hover:bg-indigo-100 transition-all shadow-sm">
                          {v.type.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-7 px-6 font-bold text-slate-500 tabular-nums text-sm border-0">{new Date(v.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })}</TableCell>
                      <TableCell className="py-7 px-6 max-w-[280px] truncate font-bold text-slate-700 uppercase tracking-tight text-base border-0">{v.memo || "SYSTEM_NULL_NARRATIVE"}</TableCell>
                      <TableCell className="py-7 px-6 font-bold font-mono text-[10px] text-slate-400 uppercase group-hover:text-slate-600 transition-colors tracking-widest border-0">{v.refNo || "VOID_REF"}</TableCell>
                      <TableCell className="py-7 px-6 text-right border-0">
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-2xl tabular-nums tracking-tighter text-slate-900 leading-none group-hover:text-indigo-600 transition-colors">
                            {v.journalEntryId?.lines?.reduce((s: number, l: any) => s + (l.debit || 0), 0).toLocaleString()}
                          </span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">CURRENCY_PKR</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-7 px-6 text-center border-0">
                        <div className={cn(
                          "inline-flex items-center gap-2.5 px-5 py-2 rounded-full border text-[9px] font-bold uppercase tracking-[0.2em] transition-all",
                          v.status === 'posted' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'
                        )}>
                          <div className={cn("w-2 h-2 rounded-full", v.status === 'posted' ? 'bg-emerald-500' : 'bg-slate-400')} />
                          {v.status}
                        </div>
                      </TableCell>
                      <TableCell className="py-7 px-8 text-right opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0 border-0">
                        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-[1.25rem] bg-white border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 text-indigo-600 transition-all active:scale-90 shadow-sm group/btn">
                          <Eye className="w-6 h-6 group-hover/btn:scale-110 transition-transform" />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.3); }
        .custom-scrollbar::-webkit-scrollbar-corner { background: transparent; }
      `}} />
    </div>
  );
}

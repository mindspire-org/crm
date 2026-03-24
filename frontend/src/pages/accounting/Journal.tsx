import { useState, useEffect, useMemo } from "react";
import { useSettings } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { 
  Plus, 
  Trash2, 
  Save, 
  RefreshCw, 
  Search,
  Check,
  Zap,
  Activity,
  ArrowRightLeft,
  X,
  History,
  FileText,
  ShieldCheck,
  ChevronsUpDown,
  Calculator,
  Printer,
  AlertCircle
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Journal() {
  const { settings } = useSettings();
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [memo, setMemo] = useState("");
  const [refNo, setRefNo] = useState("");
  const [currency, setCurrency] = useState("PKR");
  const [amount, setAmount] = useState("");
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [busy, setBusy] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  const [pendingPost, setPendingPost] = useState<any>(null);

  const loadAccounts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/accounts`, { headers: getAuthHeaders() });
      const json = await res.json();
      if (res.ok) setAccounts(Array.isArray(json) ? json : []);
    } catch {}
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const post = async (force = false) => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    if (!title.trim()) {
      toast.error("Transaction title is required");
      return;
    }
    if (!fromAccount || !toAccount) {
      toast.error("Both Credit and Debit accounts are required");
      return;
    }

    // Balance check logic (only for credit account)
    if (!force) {
      try {
        const res = await fetch(`${API_BASE}/api/accounts/balances?accountCode=${fromAccount}`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const json = await res.json();
          const balance = Number(json?.rows?.[0]?.current || 0);
          if (balance < amt) {
            setPendingPost({ date, title, category, memo, refNo, currency, amount, fromAccount, toAccount });
            setShowLimitWarning(true);
            return;
          }
        }
      } catch (e) {
        console.error("Balance check failed", e);
      }
    }

    setBusy(true);
    try {
      const payload = {
        date,
        memo: memo.trim() || title.trim(),
        refNo: refNo.trim() || title.trim(),
        currency,
        category,
        title: title.trim(),
        lines: [
          { accountCode: toAccount, debit: amt, credit: 0, description: memo.trim() || title.trim() },
          { accountCode: fromAccount, debit: 0, credit: amt, description: memo.trim() || title.trim() }
        ]
      };
      const res = await fetch(`${API_BASE}/api/journals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Post failed");
      
      setAmount("");
      setTitle("");
      setMemo("");
      setRefNo("");
      setFromAccount("");
      setToAccount("");
      setShowLimitWarning(false);
      setPendingPost(null);
      toast.success("Transaction posted successfully");
    } catch (e: any) {
      toast.error(e?.message || "Failed to post transaction");
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = () => {
    const win = window.open("", "_blank");
    if (!win) return;

    const fromAccName = accounts.find(a => a.code === fromAccount)?.name || fromAccount;
    const toAccName = accounts.find(a => a.code === toAccount)?.name || toAccount;

    const companyName = settings.general?.companyName || "Mind Spire ERP";
    const logoUrl = settings.general?.logoUrl 
      ? (settings.general.logoUrl.startsWith('http') ? settings.general.logoUrl : `${API_BASE}${settings.general.logoUrl}`)
      : null;

    const html = `
      <html>
        <head>
          <title>Journal Voucher - ${companyName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #0f172a; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; }
            .brand-container { display: flex; align-items: center; gap: 15px; }
            .brand-logo { height: 50px; width: auto; object-contain: contain; }
            .brand-name { color: #4f46e5; font-weight: 800; font-size: 24px; letter-spacing: -0.025em; text-transform: uppercase; }
            .report-title { text-align: right; }
            .report-title h1 { margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 0.1em; color: #1e293b; }
            .meta { font-size: 11px; color: #64748b; margin-top: 4px; font-weight: 600; }
            
            .info-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
            .info-box { background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; }
            .info-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
            .info-value { font-size: 14px; font-weight: 700; color: #0f172a; }

            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f8fafc; text-align: left; padding: 12px 8px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 1px solid #e2e8f0; }
            td { padding: 16px 8px; font-size: 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
            .num { text-align: right; font-family: 'Courier New', monospace; font-weight: 700; font-size: 14px; }
            
            .totals { margin-top: 30px; border-top: 2px solid #0f172a; }
            .totals-row { display: flex; justify-content: flex-end; padding: 15px 0; gap: 40px; }
            .total-item { text-align: right; }
            .total-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
            .total-val { font-size: 20px; font-weight: 800; color: #0f172a; }
            
            .footer { margin-top: 80px; display: flex; justify-content: space-between; border-top: 1px solid #f1f5f9; padding-top: 40px; }
            .sig-box { width: 200px; text-align: center; border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }
            
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
              <h1>Journal Voucher</h1>
              <div class="meta">DATE: ${date} | REF: ${refNo || "SYS-GEN"}</div>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-box">
              <div class="info-label">Transaction Title</div>
              <div class="info-value">${title || "Direct Journal Entry"}</div>
              <div style="margin-top: 12px;" class="info-label">Category</div>
              <div class="info-value">${category}</div>
            </div>
            <div class="info-box">
              <div class="info-label">Operational Memo</div>
              <div class="info-value">${memo || "Direct account movement protocol verified."}</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 50%">Account Registry</th>
                <th style="width: 25%; text-align: right">Debit (${currency})</th>
                <th style="width: 25%; text-align: right">Credit (${currency})</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div style="font-weight: 700; color: #4f46e5;">${toAccount}</div>
                  <div style="font-size: 11px; color: #64748b;">${toAccName}</div>
                </td>
                <td class="num">${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td class="num">-</td>
              </tr>
              <tr>
                <td>
                  <div style="font-weight: 700; color: #4f46e5;">${fromAccount}</div>
                  <div style="font-size: 11px; color: #64748b;">${fromAccName}</div>
                </td>
                <td class="num">-</td>
                <td class="num">${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="totals">
            <div class="totals-row">
              <div class="total-item">
                <div class="total-label">Voucher Amount</div>
                <div class="total-val">${currency} ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <div class="sig-box">Prepared By</div>
            <div class="sig-box">Verified By</div>
            <div class="sig-box">Authorized Signature</div>
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="p-6 space-y-8 min-h-screen bg-slate-50 text-slate-900">
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-100 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-100 blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative group overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-xl"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-transparent group-hover:opacity-100 transition-opacity duration-1000 opacity-50" />
        <div className="relative p-8 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-100 rounded-[1.5rem] border border-indigo-200 shadow-sm">
              <Activity className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight uppercase leading-none">
                Quick <span className="text-indigo-600">Transaction</span>
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px] font-bold uppercase tracking-widest px-3 py-1">Direct Entry Protocol</Badge>
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-bold uppercase tracking-widest px-3 py-1">Journal Verified</Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="outline" onClick={handlePrint} className="rounded-xl h-12 px-6 border-slate-200 hover:bg-slate-50 transition-all font-bold text-xs tracking-widest">
              <Printer className="w-4 h-4 mr-2" />
              PRINT / SAVE PDF
            </Button>
          </div>
        </div>
      </motion.div>

      <Card className="shadow-2xl bg-white rounded-[3rem] border border-slate-200 overflow-hidden relative">
        <div className="bg-slate-900 p-8 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-indigo-500 rounded-xl">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white uppercase tracking-tight">Drafting Protocol</h2>
              <p className="text-indigo-400 text-[9px] font-bold uppercase tracking-[0.3em] mt-1">Manual Journal Entry</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-white/5 text-white/40 border-white/10 px-3 py-1 font-bold uppercase tracking-widest text-[9px]">Awaiting Finalization</Badge>
        </div>

        <CardContent className="p-8 sm:p-10 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
            <div className="md:col-span-3 space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Effective Date</Label>
              <DatePicker value={date} onChange={setDate} className="h-12 rounded-xl border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:ring-indigo-500 font-bold font-mono text-sm shadow-sm w-full" />
            </div>
            <div className="md:col-span-5 space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Transaction Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Monthly Rent Payment" className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-indigo-500 font-bold text-sm shadow-sm" />
            </div>
            <div className="md:col-span-4 space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:ring-indigo-500 font-bold uppercase text-[10px] tracking-widest text-slate-900 shadow-sm transition-all hover:bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 rounded-xl shadow-2xl">
                  <SelectItem value="General" className="text-[10px] font-bold uppercase tracking-widest py-3">General</SelectItem>
                  <SelectItem value="Operating" className="text-[10px] font-bold uppercase tracking-widest py-3">Operating</SelectItem>
                  <SelectItem value="Non-Operating" className="text-[10px] font-bold uppercase tracking-widest py-3">Non-Operating</SelectItem>
                  <SelectItem value="Financial" className="text-[10px] font-bold uppercase tracking-widest py-3">Financial</SelectItem>
                  <SelectItem value="Tax" className="text-[10px] font-bold uppercase tracking-widest py-3">Tax</SelectItem>
                  <SelectItem value="Payroll" className="text-[10px] font-bold uppercase tracking-widest py-3">Payroll</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
            <div className="md:col-span-6 space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">From Account (Credit)</Label>
              <Popover open={fromOpen} onOpenChange={setFromOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-12 w-full rounded-xl border-slate-200 bg-slate-50/50 font-bold text-sm text-slate-900 shadow-sm transition-all justify-between px-4 uppercase tracking-tight">
                    <span className="truncate">{fromAccount ? accounts.find(a => a.code === fromAccount)?.name || fromAccount : "Select account"}</span>
                    <ChevronsUpDown className="w-4 h-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[350px] p-0 shadow-2xl border-slate-200 rounded-2xl overflow-hidden" align="start">
                  <Command>
                    <CommandInput placeholder="Search account..." className="h-11 border-none focus:ring-0" />
                    <CommandList className="max-h-[300px]">
                      <CommandEmpty>No account found.</CommandEmpty>
                      <CommandGroup>
                        {accounts.map(acc => (
                          <CommandItem key={acc.code} value={`${acc.code} ${acc.name}`} onSelect={() => { setFromAccount(acc.code); setFromOpen(false); }} className="py-3 px-4 cursor-pointer hover:bg-indigo-50">
                            <div className="flex items-center w-full gap-2">
                              <Check className={cn("h-4 w-4 text-indigo-600", fromAccount === acc.code ? "opacity-100" : "opacity-0")} />
                              <span className="font-mono text-xs opacity-40 min-w-[40px]">{acc.code}</span>
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
            <div className="md:col-span-6 space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">To Account (Debit)</Label>
              <Popover open={toOpen} onOpenChange={setToOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-12 w-full rounded-xl border-slate-200 bg-slate-50/50 font-bold text-sm text-slate-900 shadow-sm transition-all justify-between px-4 uppercase tracking-tight">
                    <span className="truncate">{toAccount ? accounts.find(a => a.code === toAccount)?.name || toAccount : "Select account"}</span>
                    <ChevronsUpDown className="w-4 h-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[350px] p-0 shadow-2xl border-slate-200 rounded-2xl overflow-hidden" align="start">
                  <Command>
                    <CommandInput placeholder="Search account..." className="h-11 border-none focus:ring-0" />
                    <CommandList className="max-h-[300px]">
                      <CommandEmpty>No account found.</CommandEmpty>
                      <CommandGroup>
                        {accounts.map(acc => (
                          <CommandItem key={acc.code} value={`${acc.code} ${acc.name}`} onSelect={() => { setToAccount(acc.code); setToOpen(false); }} className="py-3 px-4 cursor-pointer hover:bg-indigo-50">
                            <div className="flex items-center w-full gap-2">
                              <Check className={cn("h-4 w-4 text-indigo-600", toAccount === acc.code ? "opacity-100" : "opacity-0")} />
                              <span className="font-mono text-xs opacity-40 min-w-[40px]">{acc.code}</span>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
            <div className="md:col-span-3 space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Amount</Label>
              <div className="relative">
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="h-12 pl-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-indigo-500 font-bold font-mono text-lg tabular-nums shadow-sm" />
                <Calculator className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-600" />
              </div>
            </div>
            <div className="md:col-span-6 space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Operational Memo</Label>
              <Input value={memo} onChange={e => setMemo(e.target.value)} placeholder="Narrative details..." className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-indigo-500 font-medium text-sm shadow-sm" />
            </div>
            <div className="md:col-span-3 space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Ref ID</Label>
              <Input value={refNo} onChange={e => setRefNo(e.target.value)} placeholder="REF_CODE" className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-indigo-500 font-bold font-mono tracking-widest text-slate-900 shadow-sm transition-all" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-8 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-6 bg-slate-50 px-8 py-4 rounded-2xl border border-slate-200 shadow-inner w-full sm:w-auto">
              <div className="space-y-0.5">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Transaction Magnitude</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold text-indigo-600/50 italic">{currency}</span>
                  <span className="text-3xl font-black tracking-tighter text-indigo-600 tabular-nums leading-none">
                    {(Number(amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end w-full sm:w-auto">
              <Button 
                onClick={() => post(false)} 
                disabled={busy || !amount || !fromAccount || !toAccount || !title} 
                className="bg-indigo-600 hover:bg-indigo-700 shadow-lg rounded-xl px-12 h-14 font-bold uppercase text-[10px] tracking-widest border-0 transition-all hover:scale-[1.02] active:scale-95 text-white"
              >
                {busy ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                POST TRANSACTION
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showLimitWarning} onOpenChange={setShowLimitWarning}>
        <DialogContent className="sm:max-w-[450px] rounded-[2rem] p-8 border-0 shadow-2xl overflow-hidden bg-white">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-50/50 via-white to-transparent pointer-events-none" />
          <div className="relative space-y-6">
            <DialogHeader className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center border border-rose-100 shadow-sm">
                <AlertCircle className="w-8 h-8 text-rose-600 animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <DialogTitle className="text-2xl font-bold uppercase tracking-tight text-slate-900">Insufficient Balance</DialogTitle>
                <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Registry Equilibrium Constraint Warning
                </DialogDescription>
              </div>
            </DialogHeader>

            <div className="bg-slate-50/80 rounded-2xl p-6 border border-slate-100 space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-400 uppercase tracking-widest">Transaction Value</span>
                <span className="font-mono font-bold text-rose-600 tabular-nums text-lg">
                  {Number(amount).toLocaleString()} PKR
                </span>
              </div>
              <Separator className="bg-slate-200/50" />
              <div className="text-center">
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  The selected credit account has insufficient liquidity to cover this transaction protocol.
                </p>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
              <Button 
                variant="outline" 
                onClick={() => setShowLimitWarning(false)} 
                className="w-full h-12 rounded-xl font-bold uppercase text-[10px] tracking-widest border-slate-200 hover:bg-slate-50 transition-all"
              >
                ABORT PROTOCOL
              </Button>
              <Button 
                onClick={() => post(true)} 
                disabled={busy}
                className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95"
              >
                {busy ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                FORCE OVERRIDE
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

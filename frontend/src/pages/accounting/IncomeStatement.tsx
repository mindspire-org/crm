import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Calendar, 
  PieChart, 
  ArrowRightLeft,
  ShieldCheck,
  Calculator
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function IncomeStatement() {
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [basis, setBasis] = useState<"accrual" | "cash">("accrual");
  const [data, setData] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    try {
      const sp = new URLSearchParams();
      if (from) sp.set("from", from);
      if (to) sp.set("to", to);
      sp.set("basis", basis);
      const res = await fetch(`${API_BASE}/api/reports/income-statement?${sp.toString()}`, { headers: { ...getAuthHeaders() } });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Protocol link failure");
      setData(json);
      toast.success("Income Statement Synchronized");
    } catch (e: any) {
      toast.error(e?.message || "Operational link failure");
    } finally {
      setBusy(false);
    }
  };

  const income = Array.isArray(data?.income) ? data.income : [];
  const expense = Array.isArray(data?.expense) ? data.expense : [];
  const net = Number(data?.netIncome || 0);

  const formatMoney = (n: any) => {
    const v = Number(n || 0);
    return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 min-h-screen bg-slate-50/50 text-slate-900">
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-100/50 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-100/50 blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative group overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-8 md:p-12 shadow-xl"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-white to-transparent opacity-50" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-indigo-600 rounded-[1.5rem] shadow-lg shadow-indigo-200">
                <PieChart className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 uppercase">
                  Yield <span className="text-indigo-600">Statement</span>
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100 transition-colors py-1 px-3 text-[10px] font-bold uppercase tracking-widest">Income & Burn Analysis</Badge>
                  <Badge className={cn(
                    "text-[10px] font-bold uppercase tracking-widest px-3 py-1 border-0",
                    net >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                  )}>
                    {net >= 0 ? "PROFITABLE PROTOCOL" : "DIVERGENT YIELD"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center bg-slate-50 rounded-2xl border border-slate-200 p-1.5 shadow-sm">
              <div className="flex items-center px-3 border-r border-slate-200">
                <Calendar className="w-4 h-4 text-slate-400 mr-2" />
                <DatePicker 
                  value={from} 
                  onChange={setFrom} 
                  placeholder="From"
                  className="border-0 bg-transparent text-slate-900 focus:ring-0 w-32 h-9 text-sm font-semibold p-0"
                />
              </div>
              <div className="flex items-center px-3">
                <ArrowRightLeft className="w-4 h-4 text-slate-400 mr-2" />
                <DatePicker 
                  value={to} 
                  onChange={setTo} 
                  placeholder="To"
                  className="border-0 bg-transparent text-slate-900 focus:ring-0 w-32 h-9 text-sm font-semibold p-0"
                />
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-1.5 shadow-sm h-[52px] flex items-center">
              <Select value={basis} onValueChange={(v: any) => setBasis(v)}>
                <SelectTrigger className="border-0 bg-transparent focus:ring-0 h-full w-36 font-bold text-xs tracking-widest uppercase text-indigo-600 shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 rounded-2xl shadow-xl">
                  <SelectItem value="accrual" className="uppercase font-bold text-[10px] tracking-widest py-3">Accrual Basis</SelectItem>
                  <SelectItem value="cash" className="uppercase font-bold text-[10px] tracking-widest py-3">Cash Basis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={load} 
              disabled={busy} 
              size="lg"
              className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white h-[52px] px-8 font-bold tracking-widest shadow-lg shadow-indigo-100 border-0 transition-all active:scale-95"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", busy && "animate-spin")} />
              CALCULATE
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative rounded-[2.5rem] border border-slate-200 bg-white p-1 shadow-xl overflow-hidden"
        >
          <div className="p-8 pb-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold uppercase tracking-tight text-slate-900">Yield Streams</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Recognized Revenue</p>
            </div>
          </div>

          <div className="px-8 pb-8 space-y-4">
            <div className="space-y-3 mt-6">
              {income.length === 0 ? (
                <div className="py-16 text-center text-slate-300 font-bold uppercase tracking-widest text-xs italic bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">No Revenue Postings</div>
              ) : (
                income.map((r: any, i: number) => (
                  <div key={i} className="flex justify-between items-center py-4 px-6 rounded-2xl bg-slate-50/50 border border-slate-100 group hover:bg-white hover:shadow-md hover:border-emerald-100 transition-all duration-300">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold font-mono text-slate-400 tracking-widest group-hover:text-emerald-600 transition-colors uppercase">{r.accountCode}</span>
                      <span className="font-bold text-sm text-slate-700">{r.accountName}</span>
                    </div>
                    <span className="font-bold text-lg tabular-nums tracking-tighter text-slate-900">
                      {formatMoney(Number(r.credit || 0) - Number(r.debit || 0))}
                    </span>
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-8 p-8 bg-emerald-600 rounded-[2rem] flex items-center justify-between shadow-lg shadow-emerald-100">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-white/80" />
                <span className="font-bold uppercase tracking-widest text-white text-sm">Gross Inflow</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-bold text-white/60">PKR</span>
                <span className="text-3xl font-bold tabular-nums tracking-tighter text-white leading-none">
                  {formatMoney(data?.totalRevenue)}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative rounded-[2.5rem] border border-slate-200 bg-white p-1 shadow-xl overflow-hidden"
        >
          <div className="p-8 pb-4 flex items-center gap-4">
            <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100 shadow-sm">
              <TrendingDown className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold uppercase tracking-tight text-slate-900">Operational Burn</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Operating Expenses</p>
            </div>
          </div>

          <div className="px-8 pb-8 space-y-4">
            <div className="space-y-3 mt-6">
              {expense.length === 0 ? (
                <div className="py-16 text-center text-slate-300 font-bold uppercase tracking-widest text-xs italic bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">No Expense Postings</div>
              ) : (
                expense.map((r: any, i: number) => (
                  <div key={i} className="flex justify-between items-center py-4 px-6 rounded-2xl bg-slate-50/50 border border-slate-100 group hover:bg-white hover:shadow-md hover:border-rose-100 transition-all duration-300">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold font-mono text-slate-400 tracking-widest group-hover:text-rose-600 transition-colors uppercase">{r.accountCode}</span>
                      <span className="font-bold text-sm text-slate-700">{r.accountName}</span>
                    </div>
                    <span className="font-bold text-lg tabular-nums tracking-tighter text-slate-900">
                      {formatMoney(Number(r.debit || 0) - Number(r.credit || 0))}
                    </span>
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-8 p-8 bg-rose-600 rounded-[2rem] flex items-center justify-between shadow-lg shadow-rose-100">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-white/80" />
                <span className="font-bold uppercase tracking-widest text-white text-sm">Gross Burn</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-bold text-white/60">PKR</span>
                <span className="text-3xl font-bold tabular-nums tracking-tighter text-white leading-none">
                  {formatMoney(data?.totalExpense)}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-10 shadow-2xl"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-white to-transparent opacity-50" />
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className={cn(
              "p-5 rounded-2xl shadow-lg transition-all duration-500",
              net >= 0 ? "bg-emerald-600 shadow-emerald-100 text-white" : "bg-rose-600 shadow-rose-100 text-white"
            )}>
              <Calculator className="w-8 h-8" />
            </div>
            <div className="space-y-1 text-center md:text-left">
              <h2 className="text-2xl font-bold uppercase tracking-tight text-slate-900">Net Corporate <span className="text-indigo-600">Yield</span></h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total bottom-line performance index</p>
            </div>
          </div>
          
          <div className={cn(
            "text-6xl md:text-7xl font-bold tabular-nums tracking-tighter leading-none transition-all duration-500",
            net >= 0 ? "text-emerald-600" : "text-rose-600"
          )}>
            <span className="text-xl font-bold text-slate-300 mr-2 uppercase italic">PKR</span>
            {formatMoney(net)}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

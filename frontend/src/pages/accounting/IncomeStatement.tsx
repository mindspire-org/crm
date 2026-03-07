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
    <div className="p-6 space-y-8 min-h-screen bg-[#020617] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/5 blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative group overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 backdrop-blur-3xl p-8 md:p-12 shadow-2xl"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-emerald-500/5 to-transparent opacity-50" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-indigo-500/20 rounded-[1.5rem] border border-indigo-500/30 shadow-[0_0_30px_-5px_rgba(99,102,241,0.4)]">
                <PieChart className="w-8 h-8 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-none">
                  Yield <span className="text-indigo-400">Statement</span>
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px] font-black uppercase tracking-widest px-3 py-1">Income & Burn Analysis</Badge>
                  <Badge className={cn(
                    "text-[10px] font-black uppercase tracking-widest px-3 py-1 border-0",
                    net >= 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                  )}>
                    {net >= 0 ? "PROFITABLE PROTOCOL" : "DIVERGENT YIELD"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[1.5rem] p-1 shadow-inner h-14 text-white">
                    <div className="flex items-center px-4 border-r border-white/10">
                      <Calendar className="w-4 h-4 text-slate-500 mr-2" />
                      <Input
                        type="date"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        className="border-0 bg-transparent text-white focus-visible:ring-0 w-36 h-full font-black font-mono text-sm shadow-none"
                      />
                    </div>
                    <div className="flex items-center px-4">
                      <ArrowRightLeft className="w-4 h-4 text-slate-500 mr-2" />
                      <Input
                        type="date"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        className="border-0 bg-transparent text-white focus-visible:ring-0 w-36 h-full font-black font-mono text-sm shadow-none"
                      />
                    </div>
                  </div>
            
            <div className="bg-white/5 rounded-[1.5rem] border border-white/10 p-1 h-14">
              <Select value={basis} onValueChange={(v: any) => setBasis(v)}>
                <SelectTrigger className="border-0 bg-transparent focus:ring-0 h-full w-36 font-black text-[10px] tracking-widest uppercase text-indigo-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0a0a] border-white/10 rounded-2xl text-white">
                  <SelectItem value="accrual" className="uppercase font-black text-[10px] tracking-widest py-3">Accrual Basis</SelectItem>
                  <SelectItem value="cash" className="uppercase font-black text-[10px] tracking-widest py-3">Cash Basis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={load} 
              disabled={busy} 
              className="rounded-[1.5rem] bg-indigo-600 hover:bg-indigo-500 text-white h-14 px-10 font-black tracking-widest shadow-[0_20px_50px_-10px_rgba(79,70,229,0.5)] border-0 transition-all duration-300"
            >
              <RefreshCw className={cn("w-5 h-5 mr-3", busy && "animate-spin text-indigo-400")} />
              CALCULATE
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative rounded-[3rem] border border-white/5 bg-black/20 backdrop-blur-3xl p-1 shadow-2xl hover:border-emerald-500/20 transition-all duration-500"
        >
          <div className="p-8 pb-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 shadow-lg">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase italic tracking-tighter text-emerald-400">Yield Streams</h3>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Total Recognized Revenue</p>
            </div>
          </div>

          <div className="px-8 pb-8 space-y-4">
            <div className="space-y-2 mt-6">
              {income.length === 0 ? (
                <div className="py-12 text-center text-white/10 font-bold uppercase tracking-widest text-xs italic">No Revenue Postings</div>
              ) : (
                income.map((r: any, i: number) => (
                  <div key={i} className="flex justify-between items-center py-4 px-6 rounded-2xl bg-white/[0.02] border border-white/5 group hover:bg-white/[0.05] transition-all">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black font-mono text-white/30 tracking-widest group-hover:text-emerald-400 transition-colors uppercase">{r.accountCode}</span>
                      <span className="font-bold text-sm text-slate-300">{r.accountName}</span>
                    </div>
                    <span className="font-black text-lg tabular-nums tracking-tighter text-white">
                      {formatMoney(Number(r.credit || 0) - Number(r.debit || 0))}
                    </span>
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-8 p-8 bg-emerald-500/10 rounded-[2rem] border border-emerald-500/20 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span className="font-black uppercase italic tracking-tighter text-emerald-400">Gross Inflow</span>
              </div>
              <span className="text-3xl font-black tabular-nums tracking-tighter text-emerald-400 leading-none italic">
                {formatMoney(data?.totalRevenue)}
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative rounded-[3rem] border border-white/5 bg-black/20 backdrop-blur-3xl p-1 shadow-2xl hover:border-rose-500/20 transition-all duration-500"
        >
          <div className="p-8 pb-4 flex items-center gap-4">
            <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20 shadow-lg">
              <TrendingDown className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase italic tracking-tighter text-rose-400">Operational Burn</h3>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Total Operating Expenses</p>
            </div>
          </div>

          <div className="px-8 pb-8 space-y-4">
            <div className="space-y-2 mt-6">
              {expense.length === 0 ? (
                <div className="py-12 text-center text-white/10 font-bold uppercase tracking-widest text-xs italic">No Expense Postings</div>
              ) : (
                expense.map((r: any, i: number) => (
                  <div key={i} className="flex justify-between items-center py-4 px-6 rounded-2xl bg-white/[0.02] border border-white/5 group hover:bg-white/[0.05] transition-all">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black font-mono text-white/30 tracking-widest group-hover:text-rose-400 transition-colors uppercase">{r.accountCode}</span>
                      <span className="font-bold text-sm text-slate-300">{r.accountName}</span>
                    </div>
                    <span className="font-black text-lg tabular-nums tracking-tighter text-white">
                      {formatMoney(Number(r.debit || 0) - Number(r.credit || 0))}
                    </span>
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-8 p-8 bg-rose-500/10 rounded-[2rem] border border-rose-500/20 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-rose-400" />
                <span className="font-black uppercase italic tracking-tighter text-rose-400">Gross Burn</span>
              </div>
              <span className="text-3xl font-black tabular-nums tracking-tighter text-rose-400 leading-none italic">
                {formatMoney(data?.totalExpense)}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-gradient-to-br from-indigo-600/20 to-purple-600/10 p-12 shadow-[0_30px_100px_-15px_rgba(99,102,241,0.3)]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className={cn(
              "p-6 rounded-[2rem] border shadow-2xl",
              net >= 0 ? "bg-emerald-500/20 border-emerald-500/30" : "bg-rose-500/20 border-rose-500/30"
            )}>
              <Calculator className={cn("w-10 h-10", net >= 0 ? "text-emerald-400" : "text-rose-400")} />
            </div>
            <div className="space-y-1 text-center md:text-left">
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">Net Institutional <span className="text-indigo-400">Yield</span></h2>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-white/30">Total bottom-line performance index</p>
            </div>
          </div>
          
          <div className={cn(
            "text-6xl md:text-8xl font-black tabular-nums tracking-[calc(-0.05em)] leading-none italic",
            net >= 0 ? "text-emerald-400 drop-shadow-[0_0_30px_rgba(52,211,153,0.4)]" : "text-rose-400 drop-shadow-[0_0_30px_rgba(244,63,94,0.4)]"
          )}>
            {formatMoney(net)}
          </div>
        </div>
      </motion.div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.3); }
      `}} />
    </div>
  );
}

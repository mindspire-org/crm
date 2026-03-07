import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { 
  Landmark, 
  Download, 
  FileText,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Calendar,
  Target,
  ArrowUpRight,
  ShieldCheck,
  Scale
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export default function BalanceSheet() {
  const [asOf, setAsOf] = useState<string>(new Date().toISOString().slice(0,10));
  const [basis, setBasis] = useState<"accrual" | "cash">("accrual");
  const [data, setData] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    try {
      const sp = new URLSearchParams();
      if (asOf) sp.set("asOf", asOf);
      if (basis) sp.set("basis", basis);
      const res = await fetch(`${API_BASE}/api/reports/balance-sheet?${sp.toString()}`, { headers: { ...getAuthHeaders() } });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Protocol link failure");
      setData(json);
      toast.success("Balance Sheet Synchronized");
    } catch (e: any) {
      toast.error(e?.message || "Operational link failure");
    } finally {
      setBusy(false);
    }
  };

  const formatMoney = (n: any) => {
    const v = Number(n || 0);
    return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const rowIndent = (level: number) => ({ paddingLeft: `${level * 24}px` });

  const renderSection = (title: string, rows: any[] = [], compute: (r:any)=>number, icon: any, color: string) => {
    const Icon = icon;
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-[3rem] border border-white/5 bg-black/20 backdrop-blur-3xl p-1 shadow-2xl transition-all duration-500 hover:border-white/10"
      >
        <div className="p-8 pb-4 flex items-center gap-4">
          <div className={cn("p-3 rounded-2xl border shadow-lg", color)}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">{title}</h3>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">{rows.length} Active Registries</p>
          </div>
        </div>

        <div className="px-8 pb-8 space-y-2 mt-6">
          {rows.length === 0 ? (
            <div className="py-12 text-center text-white/10 font-bold uppercase tracking-widest text-xs italic">No {title} Data</div>
          ) : (
            rows.map((r:any, i:number)=> (
              <div key={i} className={cn(
                "flex justify-between items-center py-4 px-6 rounded-2xl transition-all border border-transparent",
                r.hasChildren ? "bg-white/5 border-white/10 mb-2" : "bg-white/[0.02] hover:bg-white/[0.05]"
              )}>
                <div className="flex flex-col" style={rowIndent(Number(r.level || 0))}>
                  <span className={cn(
                    "text-[10px] font-black font-mono tracking-widest uppercase",
                    r.hasChildren ? "text-indigo-400" : "text-white/30"
                  )}>{r.accountCode}</span>
                  <span className={cn(
                    "font-black tracking-tight",
                    r.hasChildren ? "text-base uppercase text-white" : "text-sm text-slate-300"
                  )}>{r.accountName}</span>
                </div>
                <span className={cn(
                  "font-black text-lg tabular-nums tracking-tighter",
                  compute(r) < 0 ? "text-rose-400" : "text-white"
                )}>
                  {compute(r).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            ))
          )}
        </div>
      </motion.div>
    );
  };

  const totals = data?.totals || { assets:0, liabilities:0, equity:0 };

  return (
    <div className="p-6 space-y-8 min-h-screen bg-[#020617] text-white">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[120px]" />
      </div>

      {/* Premium Institutional Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative group overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 backdrop-blur-3xl p-8 md:p-12 shadow-2xl"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-blue-500/5 to-transparent opacity-50" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-indigo-500/20 rounded-[1.5rem] border border-indigo-500/30 shadow-[0_0_30px_-5px_rgba(99,102,241,0.4)]">
                <Landmark className="w-8 h-8 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-none">
                  Institutional <span className="text-indigo-400">Position</span>
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px] font-black uppercase tracking-widest px-3 py-1">Registry Balance Sheet</Badge>
                  {data && (
                    <Badge className={cn(
                      "text-[10px] font-black uppercase tracking-widest px-3 py-1 border-0",
                      data.balanced ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
                    )}>
                      {data.balanced ? "PROTOCOL_BALANCED" : "INTEGRITY_ALERT"}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[1.5rem] p-1 shadow-inner h-14">
              <Calendar className="w-5 h-5 text-indigo-400 ml-4 mr-2" />
              <Input
                type="date"
                value={asOf}
                onChange={(e) => setAsOf(e.target.value)}
                className="border-0 bg-transparent text-white focus-visible:ring-0 w-40 h-full font-black font-mono text-base shadow-none"
              />
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

      {!data ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-40 border-2 border-dashed border-white/5 rounded-[3rem] opacity-20">
          <Scale className="w-20 h-20 mb-4 stroke-[1px]" />
          <p className="font-black uppercase tracking-[0.4em] text-sm italic text-center">Awaiting Institutional Calibration<br/>Select As-Of Date and Execute Protocol</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-8">
            {renderSection("Registry Assets", data?.assets, (r)=> Number(r.debit||0) - Number(r.credit||0), TrendingUp, "bg-emerald-500/10 border-emerald-500/20 text-emerald-400")}
            
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 bg-emerald-500/10 rounded-[2.5rem] border border-emerald-500/20 flex items-center justify-between shadow-[0_20px_50px_rgba(16,185,129,0.1)]">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                <span className="text-xl font-black uppercase italic tracking-tighter text-emerald-400 leading-none">Net Operational Assets</span>
              </div>
              <span className="text-4xl font-black tabular-nums tracking-tighter text-emerald-400 leading-none italic drop-shadow-[0_0_15px_rgba(52,211,153,0.4)]">
                {formatMoney(totals.assets)}
              </span>
            </motion.div>
          </div>

          <div className="space-y-8">
            {renderSection("Operational Liabilities", data?.liabilities, (r)=> Number(r.credit||0) - Number(r.debit||0), TrendingDown, "bg-rose-500/10 border-rose-500/20 text-rose-400")}
            {renderSection("Registry Equity", data?.equity, (r)=> Number(r.credit||0) - Number(r.debit||0), Target, "bg-blue-500/10 border-blue-500/20 text-blue-400")}
            
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-10 bg-gradient-to-br from-indigo-600/20 to-purple-600/10 rounded-[3rem] border border-white/10 shadow-2xl space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Bottom Line Performance</span>
                  <span className="text-lg font-black uppercase italic tracking-tighter text-indigo-400">Yield Carryforward</span>
                </div>
                <span className="text-2xl font-black tabular-nums tracking-tighter text-white italic">
                  {formatMoney(data.retainedEarnings)}
                </span>
              </div>
              <Separator className="bg-white/5" />
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-6 h-6 text-indigo-400" />
                  <span className="text-xl font-black uppercase italic tracking-tighter text-white leading-none">Total L+E Registry</span>
                </div>
                <span className="text-4xl font-black tabular-nums tracking-tighter text-white leading-none italic drop-shadow-[0_0_15px_rgba(99,102,241,0.4)]">
                  {formatMoney(totals.liabilities + totals.equity)}
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.3); }
      `}} />
    </div>
  );
}

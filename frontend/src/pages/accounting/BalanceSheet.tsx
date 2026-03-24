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
        className="relative rounded-[3rem] border border-slate-200 bg-white p-1 shadow-xl transition-all duration-500 hover:border-indigo-200"
      >
        <div className="p-8 pb-4 flex items-center gap-4">
          <div className={cn("p-3 rounded-2xl shadow-sm border", color)}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold uppercase tracking-tight text-slate-900">{title}</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{rows.length} Active Registries</p>
          </div>
        </div>

        <div className="px-8 pb-8 space-y-2 mt-6">
          {rows.length === 0 ? (
            <div className="py-12 text-center text-slate-300 font-bold uppercase tracking-widest text-xs italic bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">No {title} Data</div>
          ) : (
            rows.map((r:any, i:number)=> (
              <div key={i} className={cn(
                "flex justify-between items-center py-4 px-6 rounded-2xl transition-all border border-transparent",
                r.hasChildren ? "bg-slate-50 border-slate-100 mb-2 shadow-sm" : "bg-white hover:bg-slate-50 hover:shadow-md hover:border-slate-100"
              )}>
                <div className="flex flex-col" style={rowIndent(Number(r.level || 0))}>
                  <span className={cn(
                    "text-[10px] font-bold font-mono tracking-widest uppercase",
                    r.hasChildren ? "text-indigo-600" : "text-slate-400"
                  )}>{r.accountCode}</span>
                  <span className={cn(
                    "font-bold tracking-tight transition-colors",
                    r.hasChildren ? "text-base uppercase text-slate-900" : "text-sm text-slate-600 group-hover:text-slate-900"
                  )}>{r.accountName}</span>
                </div>
                <span className={cn(
                  "font-bold text-lg tabular-nums tracking-tighter",
                  compute(r) < 0 ? "text-rose-600" : "text-slate-900"
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
    <div className="p-6 space-y-8 min-h-screen bg-slate-50/50 text-slate-900">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-100/50 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-100/50 blur-[120px]" />
      </div>

      {/* Premium Corporate Header */}
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
                <Landmark className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 uppercase">
                  Corporate <span className="text-indigo-600">Position</span>
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100 transition-colors py-1 px-3 text-[10px] font-bold uppercase tracking-widest">Registry Balance Sheet</Badge>
                  {data && (
                    <Badge className={cn(
                      "text-[10px] font-bold uppercase tracking-widest px-3 py-1 border-0",
                      data.balanced ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700 shadow-lg shadow-rose-100"
                    )}>
                      {data.balanced ? "PROTOCOL_BALANCED" : "INTEGRITY_ALERT"}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center bg-slate-50 rounded-2xl border border-slate-200 p-1.5 shadow-sm">
              <Calendar className="w-5 h-5 text-indigo-600 ml-4 mr-2" />
              <DatePicker 
                value={asOf} 
                onChange={setAsOf} 
                className="border-0 bg-transparent text-slate-900 focus:ring-0 w-40 h-9 font-bold font-mono text-base p-0"
              />
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
              <RefreshCw className={cn("w-5 h-5 mr-3", busy && "animate-spin")} />
              CALCULATE
            </Button>
          </div>
        </div>
      </motion.div>

      {!data ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-40 border-2 border-dashed border-slate-200 rounded-[3rem] bg-white shadow-sm opacity-60">
          <Scale className="w-20 h-20 mb-4 stroke-[1px] text-slate-300" />
          <p className="font-bold uppercase tracking-[0.4em] text-sm text-slate-400 text-center">Awaiting Institutional Calibration<br/>Select As-Of Date and Execute Protocol</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-8">
            {renderSection("Registry Assets", data?.assets, (r)=> Number(r.debit||0) - Number(r.credit||0), TrendingUp, "bg-emerald-50 border-emerald-100 text-emerald-600")}
            
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 bg-emerald-600 rounded-[2.5rem] flex items-center justify-between shadow-lg shadow-emerald-100">
              <div className="flex items-center gap-3 text-white">
                <ShieldCheck className="w-6 h-6" />
                <span className="text-xl font-bold uppercase tracking-tight leading-none">Net Operational Assets</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-bold text-white/60 uppercase">PKR</span>
                <span className="text-4xl font-bold tabular-nums tracking-tighter text-white leading-none">
                  {formatMoney(totals.assets)}
                </span>
              </div>
            </motion.div>
          </div>

          <div className="space-y-8">
            {renderSection("Operational Liabilities", data?.liabilities, (r)=> Number(r.credit||0) - Number(r.debit||0), TrendingDown, "bg-rose-50 border-rose-100 text-rose-600")}
            {renderSection("Registry Equity", data?.equity, (r)=> Number(r.credit||0) - Number(r.debit||0), Target, "bg-blue-50 border-blue-100 text-blue-600")}
            
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-10 bg-white rounded-[3rem] border border-slate-200 shadow-2xl space-y-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-white to-transparent opacity-50" />
              <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Bottom Line Performance</span>
                    <span className="text-lg font-bold uppercase tracking-tight text-indigo-600">Yield Carryforward</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-bold text-slate-300">PKR</span>
                    <span className="text-2xl font-bold tabular-nums tracking-tighter text-slate-900">
                      {formatMoney(data.retainedEarnings)}
                    </span>
                  </div>
                </div>
                <Separator className="bg-slate-100" />
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-xl">
                      <ShieldCheck className="w-6 h-6 text-indigo-600" />
                    </div>
                    <span className="text-xl font-bold uppercase tracking-tight text-slate-900 leading-none">Total L+E Registry</span>
                  </div>
                  <div className="flex items-baseline gap-2 text-indigo-600">
                    <span className="text-sm font-bold opacity-50 uppercase">PKR</span>
                    <span className="text-4xl font-bold tabular-nums tracking-tighter leading-none">
                      {formatMoney(totals.liabilities + totals.equity)}
                    </span>
                  </div>
                </div>
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

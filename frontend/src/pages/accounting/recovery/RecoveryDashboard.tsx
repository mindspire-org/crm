import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, CalendarDays, Shield, TrendingUp } from "lucide-react";
import { toMoney } from "./format";

export type RecoveryDashboardKpis = {
  totalInvoiced: number;
  totalReceived: number;
  totalOutstanding: number;
  overdueOutstanding: number;
  dueIn7: number;
  dueIn30: number;
  collectionRate: number;
  invoiceCount: number;
  followUpsDueToday: number;
};

export function RecoveryDashboard(props: {
  kpis: RecoveryDashboardKpis;
  onQuickFilter?: (mode: "all" | "overdue" | "due7" | "due30") => void;
}) {
  const { kpis, onQuickFilter } = props;

  const statCard =
    "relative overflow-hidden border-0 shadow-2xl hover:scale-[1.03] transition-all duration-500 text-white rounded-[2.5rem] group pointer-events-auto";

  return (
    <>
      <div className="flex flex-wrap gap-4">
        <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 backdrop-blur-md px-4 py-1.5 text-xs font-black uppercase tracking-widest shadow-xl">
          <Shield className="w-4 h-4 mr-2" /> Finance Access
        </Badge>
        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 backdrop-blur-md px-4 py-1.5 text-xs font-black uppercase tracking-widest shadow-xl">
          Recovery Ops
        </Badge>
        {kpis.followUpsDueToday > 0 ? (
          <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 backdrop-blur-md px-4 py-1.5 text-xs font-black uppercase tracking-widest shadow-xl">
            <CalendarDays className="w-4 h-4 mr-2" /> {kpis.followUpsDueToday} Follow-ups due today
          </Badge>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
        <Card className={cn(statCard, "bg-gradient-to-br from-[#059669] to-[#064e3b]")}
          onClick={() => onQuickFilter?.("all")}
        >
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-white/20 rounded-full blur-3xl group-hover:bg-white/30 transition-colors" />
          <CardHeader className="relative pb-2">
            <CardTitle className="text-[10px] font-black text-white/70 flex items-center gap-2 uppercase tracking-[0.2em]">
              <ArrowUpRight className="w-3 h-3 text-emerald-300" /> Collection Yield
            </CardTitle>
          </CardHeader>
          <CardContent className="relative space-y-1">
            <div className="text-4xl font-black tabular-nums tracking-tighter leading-none">{toMoney(kpis.totalReceived)}</div>
            <div className="flex items-center gap-2 pt-2">
              <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ width: `${kpis.collectionRate}%` }} />
              </div>
              <span className="text-[10px] font-black text-white">{kpis.collectionRate.toFixed(0)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(statCard, "bg-gradient-to-br from-[#4f46e5] to-[#312e81]")}
          onClick={() => onQuickFilter?.("all")}
        >
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-white/20 rounded-full blur-3xl group-hover:bg-white/30 transition-colors" />
          <CardHeader className="relative pb-2">
            <CardTitle className="text-[10px] font-black text-white/70 flex items-center gap-2 uppercase tracking-[0.2em]">
              <TrendingUp className="w-3 h-3 text-indigo-300" /> Pipeline Value
            </CardTitle>
          </CardHeader>
          <CardContent className="relative space-y-1">
            <div className="text-4xl font-black tabular-nums tracking-tighter leading-none">{toMoney(kpis.totalInvoiced)}</div>
            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest pt-2">{kpis.invoiceCount} Active Invoices</p>
          </CardContent>
        </Card>

        <Card className={cn(statCard, "bg-gradient-to-br from-[#d97706] to-[#78350f]")}
          onClick={() => onQuickFilter?.("due7")}
        >
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-white/20 rounded-full blur-3xl group-hover:bg-white/30 transition-colors" />
          <CardHeader className="relative pb-2">
            <CardTitle className="text-[10px] font-black text-white/70 flex items-center gap-2 uppercase tracking-[0.2em]">
              <ArrowDownRight className="w-3 h-3 text-amber-300" /> Working Capital
            </CardTitle>
          </CardHeader>
          <CardContent className="relative space-y-1">
            <div className="text-4xl font-black tabular-nums tracking-tighter leading-none">{toMoney(kpis.totalOutstanding)}</div>
            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest pt-2">Expiring 7D: {toMoney(kpis.dueIn7)}</p>
          </CardContent>
        </Card>

        <Card className={cn(statCard, "bg-gradient-to-br from-[#e11d48] to-[#881337]")}
          onClick={() => onQuickFilter?.("overdue")}
        >
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-white/20 rounded-full blur-3xl group-hover:bg-white/30 transition-colors" />
          <CardHeader className="relative pb-2">
            <CardTitle className="text-[10px] font-black text-white/70 flex items-center gap-2 uppercase tracking-[0.2em]">
              <ArrowDownRight className="w-3 h-3 text-rose-300" /> Liquidity Risk
            </CardTitle>
          </CardHeader>
          <CardContent className="relative space-y-1">
            <div className="text-4xl font-black tabular-nums tracking-tighter leading-none">{toMoney(kpis.overdueOutstanding)}</div>
            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest pt-2">Overdue exposure</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

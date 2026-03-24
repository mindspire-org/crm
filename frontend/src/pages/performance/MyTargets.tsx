import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";
import { Target, TrendingUp, Users, DollarSign, Wallet, Percent, ArrowDownCircle, Trophy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function MyTargets() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPerformance = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/targets/my-performance`, {
          headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error("Failed to load performance data");
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    };
    loadPerformance();
  }, []);

  if (loading) return <div className="p-8 text-center">Accessing Performance Matrix...</div>;
  if (!data) return <div className="p-8 text-center text-muted-foreground">No performance data found for this period.</div>;

  const { target, actual } = data;
  const leadProgress = target.leads ? (actual.leads / target.leads) * 100 : 0;
  const salesProgress = target.sales ? (actual.sales / target.sales) * 100 : 0;
  
  const estimatedCommission = actual.sales * ((target.commissionRate || 0) / 100);
  const netEarnings = estimatedCommission + (target.bonus || 0) - (target.deductions || 0);

  return (
    <div className="p-4 sm:p-10 space-y-10 bg-[#fbfcfd] min-h-screen">
      {/* Dynamic Header Section */}
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] overflow-hidden group">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/[0.03] blur-[100px] rounded-full -mr-48 -mt-48 transition-colors duration-700 group-hover:bg-indigo-500/[0.05]" />
        
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-slate-900 leading-none">
            PERFORMANCE <span className="text-indigo-600">MATRIX</span>
          </h1>
          <div className="flex items-center gap-3 mt-4">
            <div className="h-[2px] w-8 bg-indigo-600" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
              PERIOD: {actual.month}/{actual.year} • LIVE STATS
            </p>
          </div>
        </div>
        
        <div className="relative z-10">
          <Badge className="bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-[0.2em] px-6 py-2.5 rounded-2xl border-0 shadow-[0_10px_20px_rgba(15,23,42,0.15)] text-[11px]">
            STATUS: {target.status?.toUpperCase() || "ACTIVE"}
          </Badge>
        </div>
      </div>

      {/* High-Impact Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <Card className="border border-slate-100 shadow-[0_20px_50px_rgba(79,70,229,0.08)] rounded-[2.5rem] overflow-hidden bg-white group hover:translate-y-[-4px] transition-all duration-500">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-10">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm transform transition-transform group-hover:scale-110 duration-500">
                <Users className="w-7 h-7" />
              </div>
              <div className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                Live
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Total Leads</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-slate-900 tracking-tighter">{actual.leads}</span>
                <span className="text-sm text-slate-300 font-bold uppercase">/ {target.leads || 0}</span>
              </div>
            </div>
            <div className="mt-8 space-y-4">
              <Progress value={leadProgress} className="h-2 bg-slate-50" />
              <div className="flex items-center justify-between">
                <div className="w-1 h-1 rounded-full bg-indigo-600 animate-pulse" />
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{Math.round(leadProgress)}% ACHIEVED</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-100 shadow-[0_20px_50px_rgba(16,185,129,0.08)] rounded-[2.5rem] overflow-hidden bg-white group hover:translate-y-[-4px] transition-all duration-500">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-10">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm transform transition-transform group-hover:scale-110 duration-500">
                <DollarSign className="w-7 h-7" />
              </div>
              <Trophy className="w-5 h-5 text-amber-500" />
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Sales Value</p>
              <div className="text-4xl font-black text-slate-900 tracking-tighter">Rs.{actual.sales.toLocaleString()}</div>
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.15em]">TARGET: Rs.{target.sales?.toLocaleString() || 0}</p>
            </div>
            <div className="mt-8 space-y-4">
              <Progress value={salesProgress} className="h-2 bg-slate-50" />
              <div className="flex items-center justify-between">
                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{Math.round(salesProgress)}% ACHIEVED</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-[0_25px_60px_rgba(15,23,42,0.25)] rounded-[2.5rem] overflow-hidden bg-slate-900 text-white group hover:translate-y-[-4px] transition-all duration-500 relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full -mr-16 -mt-16" />
          <CardContent className="p-8 relative z-10">
            <div className="flex items-center justify-between mb-10">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-amber-400 shadow-inner">
                <Wallet className="w-7 h-7" />
              </div>
              <div className="text-[10px] font-black text-white/30 tracking-[0.2em] uppercase">% Yield</div>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-white/40">Net Earnings</p>
              <div className="text-4xl font-black text-white tracking-tighter underline decoration-indigo-500 decoration-[6px] underline-offset-[8px]">
                Rs.{netEarnings.toLocaleString()}
              </div>
              <p className="text-[9px] font-bold text-amber-400/60 uppercase tracking-[0.2em] pt-4">Inc. Bonuses & Deductions</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-100 shadow-[0_20px_50px_rgba(244,63,94,0.08)] rounded-[2.5rem] overflow-hidden bg-white group hover:translate-y-[-4px] transition-all duration-500">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-10">
              <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 shadow-sm transform transition-transform group-hover:scale-110 duration-500">
                <ArrowDownCircle className="w-7 h-7" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Deductions</p>
              <div className="text-4xl font-black text-slate-900 tracking-tighter">Rs.{target.deductions?.toLocaleString() || 0}</div>
              <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mt-2">Impact on period net</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <Card className="lg:col-span-7 border border-slate-100 shadow-[0_15px_40px_rgba(0,0,0,0.03)] rounded-[3rem] bg-white overflow-hidden">
          <CardHeader className="p-10 pb-6 border-b border-slate-50">
            <div className="flex items-center gap-4">
              <div className="w-2 h-8 bg-indigo-600 rounded-full" />
              <CardTitle className="text-2xl font-black uppercase tracking-tighter text-slate-900">
                EARNINGS <span className="text-indigo-600">BREAKDOWN</span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-10 space-y-8">
            <div className="grid gap-6">
              {[
                { icon: Percent, label: "Base Commission", sub: `Rate: ${target.commissionRate || 0}%`, value: estimatedCommission, color: "text-indigo-600", bg: "bg-indigo-50" },
                { icon: Trophy, label: "Performance Bonus", sub: "Target Achievement reward", value: target.bonus || 0, color: "text-emerald-600", bg: "bg-emerald-50", prefix: "+ " },
                { icon: ArrowDownCircle, label: "Policy Deductions", sub: "Penalties or deductions", value: target.deductions || 0, color: "text-rose-600", bg: "bg-rose-50", prefix: "- " }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-6 rounded-[2rem] bg-slate-50/50 border border-slate-100 hover:bg-white hover:shadow-xl hover:border-transparent transition-all duration-500 group">
                  <div className="flex items-center gap-6">
                    <div className={cn("w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm transition-transform group-hover:scale-110", item.color)}>
                      <item.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-900">{item.label}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{item.sub}</p>
                    </div>
                  </div>
                  <div className={cn("text-xl font-black tabular-nums tracking-tighter", item.color)}>
                    {item.prefix}Rs.{item.value.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-5 border-0 shadow-[0_30px_60px_rgba(79,70,229,0.25)] rounded-[3rem] bg-indigo-600 text-white overflow-hidden relative group">
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full -mr-32 -mt-32 transition-transform duration-1000 group-hover:scale-110" />
          
          <CardHeader className="p-10 pb-6 relative z-10">
            <CardTitle className="text-2xl font-black uppercase tracking-tighter">
              MANAGER'S <span className="text-indigo-200">PERSPECTIVE</span>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-10 pt-0 space-y-10 relative z-10">
            <div className="p-8 rounded-[2.5rem] bg-white/10 backdrop-blur-md border border-white/20 text-base leading-relaxed text-indigo-50 font-medium shadow-inner">
              "{target.note || "Keep pushing! The goal is within reach. Focus on high-value leads this week to maximize your commission."}"
            </div>
            
            <div className="pt-8 border-t border-white/10 flex items-center gap-6">
              <div className="w-16 h-16 rounded-[1.5rem] bg-white/20 flex items-center justify-center font-black uppercase text-2xl shadow-lg border border-white/10">M</div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-white">Management Node</p>
                <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mt-1">Performance Oversight</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

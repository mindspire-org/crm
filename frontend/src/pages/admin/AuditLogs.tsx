import { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  Activity, 
  Globe, 
  Calendar,
  RefreshCw,
  Clock,
  ShieldAlert,
  Zap,
  Lock,
  Settings as SettingsIcon,
  Database
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useSettings } from "@/hooks/useSettings";

type AuditLog = {
  _id: string;
  userId?: {
    _id: string;
    username: string;
    email: string;
    name?: string;
  };
  username?: string;
  action: string;
  module: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  status: "success" | "failure";
  createdAt: string;
};

export default function AuditLogs() {
  const { settings } = useSettings();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [module, setModule] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [limit, setLimit] = useState("50");
  const [skip, setSkip] = useState(0);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (module !== "all") sp.set("module", module);
      if (from) sp.set("from", from);
      if (to) sp.set("to", to);
      sp.set("limit", limit);
      sp.set("skip", skip.toString());

      const res = await fetch(`${API_BASE}/api/audit-logs?${sp.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      }
    } catch (e) {
      console.error("Failed to load audit logs", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [module, limit, skip, from, to]);

  const getStatusBadge = (status: string) => {
    if (status === "success") {
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold px-2 py-0">SUCCESS</Badge>;
    }
    return <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] font-bold px-2 py-0">FAILURE</Badge>;
  };

  const getModuleIcon = (mod: string) => {
    switch (mod) {
      case "AUTH": return <Lock className="w-3.5 h-3.5" />;
      case "SETTINGS": return <SettingsIcon className="w-3.5 h-3.5" />;
      case "ACCOUNTING": return <Database className="w-3.5 h-3.5" />;
      default: return <Zap className="w-3.5 h-3.5" />;
    }
  };

  const isCritical = (log: AuditLog) => {
    const criticalActions = ["LOGIN_FAIL", "UPDATE_SETTINGS", "DELETE", "FORCE_OVERRIDE", "RESTORE_BACKUP", "UPDATE_LOGO"];
    return criticalActions.includes(log.action) || log.status === "failure";
  };

  return (
    <div className="p-6 space-y-8 min-h-screen bg-[#fafbfc]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase italic">Security <span className="text-indigo-600">Audit</span></h1>
          </div>
          <p className="text-sm text-slate-500 font-medium ml-1 tracking-tight">System forensic intelligence and activity monitoring.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-white border border-slate-200 px-5 h-12 rounded-2xl flex items-center gap-3 shadow-sm border-b-2 border-b-indigo-500/20">
            <Activity className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Registry Magnitude</span>
            <span className="text-lg font-bold text-slate-900 tabular-nums">{total.toLocaleString()}</span>
          </div>
          <Button onClick={loadLogs} className="bg-slate-900 hover:bg-indigo-600 text-white h-12 px-6 rounded-2xl font-black text-[10px] tracking-[0.2em] shadow-xl transition-all active:scale-95 group">
            <RefreshCw className={cn("w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500", loading && "animate-spin")} /> REFRESH FEED
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-2xl shadow-indigo-100/50 rounded-[2.5rem] overflow-hidden bg-white">
        <div className="p-6 bg-slate-50/50 border-b border-slate-100">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <Select value={module} onValueChange={setModule}>
                <SelectTrigger className="h-11 bg-white border-slate-200 rounded-2xl focus:ring-indigo-500 text-[10px] font-black uppercase tracking-[0.1em] text-slate-600 shadow-sm transition-all hover:border-indigo-200">
                  <SelectValue placeholder="System Module" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-0 shadow-2xl">
                  <SelectItem value="all">ALL_SYSTEM_MODULES</SelectItem>
                  <SelectItem value="AUTH">AUTHENTICATION_CORE</SelectItem>
                  <SelectItem value="ACCOUNTING">FINANCIAL_REGISTRY</SelectItem>
                  <SelectItem value="SETTINGS">SYSTEM_CONFIGURATION</SelectItem>
                  <SelectItem value="CRM">OPERATIONAL_DATA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl p-1 shadow-sm h-11 px-3">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <DatePicker value={from} onChange={setFrom} className="border-0 focus:ring-0 text-[10px] font-black w-28 bg-transparent uppercase" />
              <div className="w-px h-4 bg-slate-200" />
              <DatePicker value={to} onChange={setTo} className="border-0 focus:ring-0 text-[10px] font-black w-28 bg-transparent uppercase" />
            </div>

            <Select value={limit} onValueChange={setLimit}>
              <SelectTrigger className="h-11 w-32 bg-white border-slate-200 rounded-2xl focus:ring-indigo-500 text-[10px] font-black text-slate-600 shadow-sm uppercase tracking-widest">
                <SelectValue placeholder="Magnitude" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-0 shadow-2xl">
                <SelectItem value="50">LAST_50</SelectItem>
                <SelectItem value="100">LAST_100</SelectItem>
                <SelectItem value="500">LAST_500</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900 text-white/40">
                  <th className="py-5 px-8 text-left font-black uppercase tracking-[0.2em] text-[9px] border-r border-white/5">Temporal Trace</th>
                  <th className="py-5 px-6 text-left font-black uppercase tracking-[0.2em] text-[9px] border-r border-white/5">User Authority</th>
                  <th className="py-5 px-6 text-left font-black uppercase tracking-[0.2em] text-[9px] border-r border-white/5">Event Signature</th>
                  <th className="py-5 px-6 text-left font-black uppercase tracking-[0.2em] text-[9px] border-r border-white/5">Network IP</th>
                  <th className="py-5 px-6 text-left font-black uppercase tracking-[0.2em] text-[9px] border-r border-white/5">Status</th>
                  <th className="py-5 px-8 text-right font-black uppercase tracking-[0.2em] text-[9px]">Log Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.map((log) => {
                  const critical = isCritical(log);
                  return (
                    <tr key={log._id} className={cn(
                      "group transition-all duration-300",
                      critical ? "bg-rose-50/40 hover:bg-rose-50/70" : "hover:bg-slate-50/80"
                    )}>
                      <td className="py-5 px-8 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            critical ? "bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]" : "bg-indigo-50 shadow-[0_0_8px_rgba(99,102,241,0.4)]"
                          )} />
                          <div className="space-y-0.5">
                            <div className={cn("font-black tabular-nums tracking-tight", critical ? "text-rose-900" : "text-slate-900")}>
                              {format(new Date(log.createdAt), "HH:mm:ss")}
                            </div>
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                              {format(new Date(log.createdAt), "MMM dd, yyyy")}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center font-black text-[10px] shadow-lg transition-transform group-hover:scale-110",
                            critical ? "bg-rose-600 text-white" : "bg-slate-900 text-white"
                          )}>
                            {(log.userId?.username || log.username || "?")[0].toUpperCase()}
                          </div>
                          <div>
                            <div className={cn("font-black text-xs tracking-tight uppercase", critical ? "text-rose-900" : "text-slate-900")}>
                              {log.userId?.username || log.username || "SYSTEM_DAEMON"}
                            </div>
                            <div className="text-[9px] font-bold text-slate-400 truncate max-w-[100px] uppercase tracking-tighter">
                              {log.userId?.email || "internal_execution"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-xl transition-all group-hover:rotate-12",
                            critical ? "bg-rose-100 text-rose-600" : "bg-indigo-50 text-indigo-600"
                          )}>
                            {getModuleIcon(log.module)}
                          </div>
                          <div className="space-y-0.5">
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] leading-none">{log.module}</div>
                            <div className={cn(
                              "font-mono text-[10px] font-black uppercase tracking-tight",
                              critical ? "text-rose-600 underline decoration-rose-200 underline-offset-4" : "text-slate-700"
                            )}>{log.action}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-2">
                          <Globe className={cn("w-3.5 h-3.5", critical ? "text-rose-300" : "text-slate-300")} />
                          <span className="font-mono text-xs font-black tracking-tighter text-slate-600">
                            {log.ipAddress || "::1"}
                          </span>
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        {getStatusBadge(log.status)}
                      </td>
                      <td className="py-5 px-8 text-right">
                        <div className={cn(
                          "text-[11px] font-bold italic line-clamp-1 max-w-[250px] ml-auto transition-colors",
                          critical ? "text-rose-700 font-black" : "text-slate-500"
                        )}>{log.details || "AUTHENTICATED_EXECUTION_SEQUENCE"}</div>
                      </td>
                    </tr>
                  );
                })}
                {!loading && logs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-32 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-20">
                        <ShieldAlert className="w-16 h-16 text-slate-900" />
                        <p className="font-black uppercase tracking-[0.2em] text-[10px]">Registry Empty</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

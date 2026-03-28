import { Fragment, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription
} from "@/components/ui/sheet";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { 
  Plus, 
  Search, 
  ChevronRight,
  ChevronDown,
  RefreshCw,
  FolderPlus,
  Edit2,
  Settings2,
  Filter,
  ArrowRightLeft,
  Calendar,
  AlertCircle,
  Wallet,
  CreditCard,
  Target,
  TrendingUp,
  ArrowUpRight,
  Zap,
  ShieldCheck,
  Trash2
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export type Account = {
  _id?: string;
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  parentCode?: string | null;
  openingDebit?: number;
  openingCredit?: number;
  isActive?: boolean;
};

type CoaBalanceRow = {
  _id?: string;
  code: string;
  name: string;
  type: Account["type"];
  parentCode?: string | null;
  level?: number;
  hasChildren?: boolean;
  opening?: number;
  current?: number;
  openingDebit?: number;
  openingCredit?: number;
};

export default function Accounts() {
  const [items, setItems] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [asOf, setAsOf] = useState<string>(new Date().toISOString().slice(0, 10));
  const [balances, setBalances] = useState<CoaBalanceRow[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loadError, setLoadError] = useState<string>("");

  const [form, setForm] = useState<Account>({
    code: "",
    name: "",
    type: "asset",
    parentCode: "",
    openingDebit: 0,
    openingCredit: 0,
    isActive: true,
  });

  const filteredRows = useMemo(() => {
    const query = q.trim().toLowerCase();
    const type = String(typeFilter || "all");

    let base = balances;
    if (type !== "all") base = base.filter((r) => r.type === type);
    
    if (query) {
      const byCode = new Map(balances.map((r) => [r.code, r]));
      const matched = balances.filter((r) => 
        String(r.code).toLowerCase().includes(query) || 
        String(r.name).toLowerCase().includes(query)
      );
      
      const keep = new Set<string>();
      for (const m of matched) {
        keep.add(m.code);
        let cur = byCode.get(m.code);
        while (cur?.parentCode) {
          keep.add(cur.parentCode);
          cur = byCode.get(cur.parentCode);
        }
      }
      base = balances.filter((r) => keep.has(r.code) && (type === "all" ? true : r.type === type));
    }

    const hidden = new Set<string>();
    if (!query) {
      for (const r of base) {
        let p = r.parentCode || null;
        while (p) {
          if (collapsed[p]) {
            hidden.add(r.code);
            break;
          }
          const pr = balances.find((x) => x.code === p);
          p = pr?.parentCode || null;
        }
      }
    }

    return base.filter((r) => !hidden.has(r.code));
  }, [balances, q, typeFilter, collapsed]);

  const grouped = useMemo(() => {
    const g: Record<string, CoaBalanceRow[]> = { asset: [], liability: [], equity: [], revenue: [], expense: [] };
    for (const r of filteredRows) {
      if (g[r.type]) g[r.type].push(r);
    }
    return g;
  }, [filteredRows]);

  const load = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const headers = { ...getAuthHeaders() };
      const [accRes, balRes] = await Promise.all([
        fetch(`${API_BASE}/api/accounts`, { headers }),
        fetch(`${API_BASE}/api/accounts/balances?asOf=${encodeURIComponent(asOf)}`, { headers }),
      ]);
      
      if (!accRes.ok || !balRes.ok) {
        const err = await (accRes.ok ? balRes.json() : accRes.json());
        throw new Error(err?.error || "Connection failure");
      }

      const accJson = await accRes.json();
      const balJson = await balRes.json();
      
      setItems(Array.isArray(accJson) ? accJson : []);
      setBalances(Array.isArray(balJson?.rows) ? balJson.rows : []);
    } catch (e: any) {
      setLoadError(e?.message || "Operational link failure");
      toast.error(e?.message || "Sync failure");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleOpenCreate = (parentCode?: string, type?: Account["type"]) => {
    setIsEditing(false);
    setForm({
      code: "",
      name: "",
      type: type || "asset",
      parentCode: parentCode || "",
      openingDebit: 0,
      openingCredit: 0,
      isActive: true,
    });
    setIsSheetOpen(true);
  };

  const handleOpenEdit = (row: CoaBalanceRow) => {
    setIsEditing(true);
    setForm({
      _id: row._id,
      code: row.code,
      name: row.name,
      type: row.type,
      parentCode: row.parentCode || "",
      openingDebit: row.openingDebit || 0,
      openingCredit: row.openingCredit || 0,
      isActive: true,
    });
    setIsSheetOpen(true);
  };

  const save = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Code and Name are required");
      return;
    }
    
    setLoading(true);
    try {
      const payload = { ...form, parentCode: form.parentCode || null };
      const url = isEditing ? `${API_BASE}/api/accounts/${form._id}` : `${API_BASE}/api/accounts`;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Protocol error");
      
      toast.success(isEditing ? "Registry updated" : "Account registered");
      setIsSheetOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Transaction failure");
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (n: any) => {
    const v = Number(n || 0);
    return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const TYPES = ["asset", "liability", "equity", "revenue", "expense"] as const;

  const sectionStyles: Record<string, { bg: string, text: string, icon: any, border: string, glow: string }> = {
    asset: { bg: "bg-emerald-50", text: "text-emerald-600", icon: Wallet, border: "border-emerald-200", glow: "shadow-emerald-500/10" },
    liability: { bg: "bg-rose-50", text: "text-rose-600", icon: CreditCard, border: "border-rose-200", glow: "shadow-rose-500/10" },
    equity: { bg: "bg-blue-50", text: "text-blue-600", icon: Target, border: "border-blue-200", glow: "shadow-blue-500/10" },
    revenue: { bg: "bg-indigo-50", text: "text-indigo-600", icon: TrendingUp, border: "border-indigo-200", glow: "shadow-indigo-500/10" },
    expense: { bg: "bg-orange-50", text: "text-orange-600", icon: ArrowUpRight, border: "border-orange-200", glow: "shadow-orange-500/10" },
  };

  return (
    <div className="p-6 space-y-8 min-h-screen bg-slate-50 text-slate-900">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-100 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-100 blur-[120px]" />
      </div>

      {/* Corporate Command Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative group overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-xl"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-transparent group-hover:opacity-100 transition-opacity duration-1000 opacity-50" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-indigo-100 rounded-[1.5rem] border border-indigo-200 shadow-sm">
                <Settings2 className="w-8 h-8 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight uppercase leading-none">
                  Registry <span className="text-indigo-600">Architecture</span>
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px] font-bold uppercase tracking-widest px-3 py-1">Corporate Control</Badge>
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-bold uppercase tracking-widest px-3 py-1">Real-time Terminal</Badge>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-[1.5rem] p-1 shadow-inner h-14">
              <Calendar className="w-5 h-5 text-indigo-600 ml-4 mr-2" />
              <Input
                type="date"
                value={asOf}
                onChange={(e) => setAsOf(e.target.value)}
                className="border-0 bg-transparent text-slate-900 focus-visible:ring-0 w-40 h-full font-bold font-mono text-lg tabular-nums"
              />
            </div>
            <Button 
              variant="outline" 
              onClick={load} 
              disabled={loading} 
              className="rounded-[1.5rem] bg-white border-slate-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 h-14 px-8 font-bold tracking-widest transition-all duration-300"
            >
              <RefreshCw className={cn("w-4 h-4 mr-3", loading && "animate-spin text-indigo-600")} />
              SYNC
            </Button>
            <Button 
              onClick={() => handleOpenCreate()} 
              className="rounded-[1.5rem] bg-indigo-600 hover:bg-indigo-700 text-white h-14 px-10 font-bold tracking-widest shadow-lg border-0 transition-all duration-300 hover:scale-[1.02] active:scale-95"
            >
              <Plus className="w-5 h-5 mr-3 stroke-[3px]" />
              ADD REGISTRY
            </Button>
          </div>
        </div>
      </motion.div>

      {loadError && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-4 p-6 rounded-[2rem] bg-rose-50 border border-rose-200 text-rose-600 shadow-lg"
        >
          <div className="p-3 bg-rose-100 rounded-xl">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">System Error</p>
            <p className="font-bold">{loadError}</p>
          </div>
          <Button variant="ghost" onClick={load} className="rounded-xl hover:bg-rose-100 text-rose-600 font-bold tracking-widest px-6 h-12 border border-rose-200">RETRY SYNC</Button>
        </motion.div>
      )}

      {/* Global Filter Bar */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col md:flex-row items-center gap-6"
      >
        <div className="relative group flex-1 w-full">
          <div className="absolute inset-0 bg-indigo-100 blur-xl group-focus-within:bg-indigo-200 transition-colors rounded-3xl pointer-events-none" />
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors z-10" />
          <Input
            placeholder="Universal Protocol Search (Code, Name, Meta)..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-16 h-16 bg-white border-slate-200 rounded-[1.5rem] focus-visible:ring-indigo-500/50 text-lg font-bold placeholder:text-slate-400 shadow-sm transition-all relative z-10"
          />
        </div>
        <div className="flex items-center gap-3 p-1.5 bg-white rounded-[1.5rem] border border-slate-200 shadow-sm h-16 w-full md:w-fit">
          <div className="flex items-center gap-2 pl-4 pr-2 border-r border-slate-200">
            <Filter className="w-5 h-5 text-slate-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Taxonomy</span>
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="border-0 bg-transparent focus:ring-0 h-full w-40 font-bold text-xs uppercase tracking-[0.2em] text-indigo-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200 rounded-2xl shadow-lg">
              <SelectItem value="all" className="font-bold text-[10px] tracking-widest text-slate-600 hover:text-slate-900 transition-colors">ALL PROTOCOLS</SelectItem>
              {TYPES.map(t => (
                <SelectItem key={t} value={t} className="uppercase font-bold text-[10px] tracking-widest">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Section Grid */}
      <div className="grid grid-cols-1 gap-8">
        {(
          [
            { key: "asset", label: "Operational Assets", color: "text-emerald-600" },
            { key: "liability", label: "Debt & Obligations", color: "text-rose-600" },
            { key: "equity", label: "Capital & Equity", color: "text-blue-600" },
            { key: "revenue", label: "Yield & Revenue", color: "text-indigo-600" },
            { key: "expense", label: "Operating Burn", color: "text-orange-600" },
          ] as const
        ).map((sec, secIdx) => {
          const rows = grouped[sec.key] || [];
          const style = sectionStyles[sec.key];
          const SectionIcon = style.icon;

          return (
            <motion.div
              key={sec.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: secIdx * 0.1 }}
              className={cn(
                "relative rounded-[3rem] border border-slate-200 bg-white shadow-lg transition-all duration-500 hover:border-slate-300 hover:shadow-xl",
                style.glow
              )}
            >
              <div className="p-8 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn("p-3 rounded-2xl border shadow-sm transition-transform hover:scale-110", style.border, style.bg)}>
                    <SectionIcon className={cn("w-6 h-6", style.text)} />
                  </div>
                  <div>
                    <h3 className={cn("text-xl font-bold uppercase tracking-tight", style.text)}>{sec.label}</h3>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{rows.length} Active Records</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleOpenCreate(undefined, sec.key as any)}
                  className="rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-[10px] tracking-widest uppercase py-0 h-10 px-4"
                >
                  <Plus className="w-3.5 h-3.5 mr-2" /> Quick Add
                </Button>
              </div>

              <div className="overflow-x-auto p-2">
                <table className="w-full border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-slate-400">
                      <th className="py-2 px-6 text-left text-[9px] font-bold uppercase tracking-[0.2em]">Code</th>
                      <th className="py-2 px-6 text-left text-[9px] font-bold uppercase tracking-[0.2em]">Corporate Title</th>
                      <th className="py-2 px-6 text-right text-[9px] font-bold uppercase tracking-[0.2em]">Opening Registry</th>
                      <th className="py-2 px-6 text-right text-[9px] font-bold uppercase tracking-[0.2em]">Current Volume</th>
                      <th className="py-2 px-6 text-right text-[9px] font-bold uppercase tracking-[0.2em]">Control</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Operational Gap: No Data in Registry</td>
                      </tr>
                    ) : (
                      rows.map((r, rIdx) => {
                        const level = Number(r.level || 0);
                        const hasChildren = Boolean(r.hasChildren);
                        const isCollapsed = Boolean(collapsed[r.code]);

                        return (
                          <motion.tr 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: (secIdx * 0.1) + (rIdx * 0.02) }}
                            key={r.code} 
                            className={cn(
                              "group transition-all duration-300 rounded-2xl overflow-hidden",
                              hasChildren ? "bg-slate-50 hover:bg-slate-100" : "hover:bg-indigo-50"
                            )}
                          >
                            <td className="py-5 px-6 font-bold font-mono text-[11px] tracking-widest text-slate-400 group-hover:text-indigo-600 transition-colors">
                              {r.code}
                            </td>
                            <td className="py-5 px-6">
                              <div className="flex items-center gap-4" style={{ paddingLeft: `${level * 32}px` }}>
                                {hasChildren ? (
                                  <button
                                    onClick={() => setCollapsed(p => ({ ...p, [r.code]: !p[r.code] }))}
                                    className="p-2 rounded-xl bg-slate-100 hover:bg-indigo-100 border border-slate-200 transition-all active:scale-90"
                                  >
                                    {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-indigo-600" />}
                                  </button>
                                ) : (
                                  <div className="w-10 flex justify-center opacity-20"><div className="w-1 h-1 rounded-full bg-slate-900" /></div>
                                )}
                                <span className={cn(
                                  "font-bold tracking-tight transition-all duration-300 group-hover:translate-x-1",
                                  hasChildren ? "text-lg uppercase text-slate-900 leading-none" : "text-sm text-slate-600 font-semibold"
                                )}>
                                  {r.name}
                                </span>
                              </div>
                            </td>
                            <td className="py-5 px-6 text-right tabular-nums font-bold font-mono text-xs tracking-tighter text-slate-400 group-hover:text-slate-600">
                              {formatMoney(r.opening)}
                            </td>
                            <td className="py-5 px-6 text-right">
                              <div className={cn(
                                "inline-flex flex-col items-end px-4 py-2 rounded-2xl border transition-all duration-500",
                                Number(r.current || 0) < 0 
                                  ? "bg-rose-50 border-rose-200" 
                                  : "bg-indigo-50 border-indigo-200"
                              )}>
                                <span className={cn(
                                  "font-bold text-lg tabular-nums tracking-tighter leading-none",
                                  Number(r.current || 0) < 0 ? "text-rose-600" : "text-indigo-600"
                                )}>
                                  {formatMoney(r.current)}
                                </span>
                                <span className="text-[8px] font-bold uppercase tracking-[0.2em] opacity-50 mt-1">Operational Value</span>
                              </div>
                            </td>
                            <td className="py-5 px-8 text-right opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-10 w-10 rounded-xl text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-all active:scale-95"
                                  onClick={() => handleOpenCreate(r.code, r.type)}
                                  title="Add Sub-Account"
                                >
                                  <Plus className="w-5 h-5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-10 w-10 rounded-xl text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-all active:scale-95"
                                  onClick={() => handleOpenEdit(r)}
                                  title="Adjust Protocol"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-10 w-10 rounded-xl text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all active:scale-95"
                                  onClick={async () => {
                                    if (confirm(`Archive account ${r.code}?`)) {
                                      try {
                                        const res = await fetch(`${API_BASE}/api/accounts/${r._id}`, {
                                          method: 'DELETE',
                                          headers: getAuthHeaders()
                                        });
                                        if (res.ok) {
                                          toast.success("Account archived");
                                          load();
                                        } else {
                                          const err = await res.json();
                                          toast.error(err.error || "Archive failed");
                                        }
                                      } catch (e) {
                                        toast.error("Network error");
                                      }
                                    }
                                  }}
                                  title="Archive Account"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Terminal Configuration Drawer */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl border-l border-slate-200 bg-white p-0 overflow-hidden shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-transparent pointer-events-none" />
          <div className="h-full relative flex flex-col">
            <div className="p-12 space-y-10 flex-1 overflow-y-auto custom-scrollbar">
              <SheetHeader className="space-y-4">
                <div className="p-4 bg-indigo-100 rounded-2xl border border-indigo-200 w-fit">
                  <Zap className="w-8 h-8 text-indigo-600 fill-indigo-600" />
                </div>
                <div>
                  <SheetTitle className="text-5xl font-bold uppercase tracking-tight leading-none text-slate-900">
                    {isEditing ? 'Protocol' : 'New'} <span className="text-indigo-600">Registry</span>
                  </SheetTitle>
                  <SheetDescription className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-4 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" /> Operational Parameter Definition Mode
                  </SheetDescription>
                </div>
              </SheetHeader>

              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-600 ml-1">Registry Code</Label>
                    <Input
                      value={form.code}
                      onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))}
                      disabled={isEditing}
                      placeholder="e.g. 1000"
                      className="h-14 rounded-2xl border-slate-200 bg-slate-50 focus-visible:ring-indigo-500 font-bold font-mono text-xl tracking-widest tabular-nums transition-all focus:bg-white shadow-sm text-slate-900"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-600 ml-1">Legal Title</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="Account Title"
                      className="h-14 rounded-2xl border-slate-200 bg-slate-50 focus-visible:ring-indigo-500 font-bold text-lg tracking-tight transition-all focus:bg-white shadow-sm text-slate-900"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-600 ml-1">Taxonomy Type</Label>
                    <Select
                      value={form.type}
                      onValueChange={(v) => setForm(p => ({ ...p, type: v as Account["type"] }))}
                    >
                      <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-slate-50 focus:ring-indigo-500 font-bold uppercase text-[11px] tracking-[0.2em] shadow-sm transition-all focus:bg-white text-slate-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 rounded-2xl shadow-lg">
                        {TYPES.map(t => (
                          <SelectItem key={t} value={t} className="uppercase font-bold text-[10px] tracking-widest py-3 text-slate-900">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3 md:col-span-2">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-600 ml-1">Hierarchy Link</Label>
                    <SearchableSelect
                      options={[
                        { value: "", label: "ROOT_NODE" },
                        ...items.map(i => ({ value: i.code, label: `${i.code} - ${i.name}` }))
                      ]}
                      value={form.parentCode || ""}
                      onValueChange={(v) => {
                        setForm(p => ({ ...p, parentCode: v }));
                        if (!isEditing && v) {
                          const children = items.filter(i => i.parentCode === v);
                          const lastChild = children.sort((a, b) => String(a.code).localeCompare(String(b.code))).pop();
                          let nextCode = `${v}-01`;
                          if (lastChild) {
                            const parts = lastChild.code.split("-");
                            if (parts.length > 1) {
                              const lastNum = parseInt(parts.pop() || "0", 10);
                              nextCode = `${v}-${String(lastNum + 1).padStart(2, "0")}`;
                            } else {
                              nextCode = `${v}-01`;
                            }
                          }
                          setForm(p => ({ ...p, code: nextCode }));
                        }
                      }}
                      placeholder="Select Parent Account"
                      threshold={10}
                    />
                  </div>
                </div>

                <motion.div 
                  whileHover={{ scale: 1.01 }}
                  className="p-8 bg-indigo-50 rounded-[2.5rem] border border-indigo-100 shadow-lg space-y-8"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-xl">
                      <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-indigo-600">Balance Calibration</span>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 ml-1">Opening Debit</Label>
                      <Input
                        value={String(form.openingDebit ?? 0)}
                        onChange={(e) => setForm(p => ({ ...p, openingDebit: Number(e.target.value || 0) }))}
                        className="h-14 rounded-2xl border-0 bg-white shadow-inner font-bold font-mono text-xl tabular-nums tracking-tighter text-indigo-600"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 ml-1">Opening Credit</Label>
                      <Input
                        value={String(form.openingCredit ?? 0)}
                        onChange={(e) => setForm(p => ({ ...p, openingCredit: Number(e.target.value || 0) }))}
                        className="h-14 rounded-2xl border-0 bg-white shadow-inner font-bold font-mono text-xl tabular-nums tracking-tighter text-rose-600"
                      />
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            <div className="p-12 bg-slate-50 border-t border-slate-200 flex items-center gap-6 mt-auto">
              <Button 
                variant="outline" 
                onClick={() => setIsSheetOpen(false)} 
                className="flex-1 h-16 rounded-2xl font-bold text-xs tracking-[0.3em] border-2 border-slate-200 hover:bg-slate-100 transition-all uppercase text-slate-700"
              >
                ABORT
              </Button>
              <Button 
                onClick={save} 
                disabled={loading} 
                className="flex-[2] h-16 rounded-2xl font-bold text-xs tracking-[0.3em] bg-indigo-600 hover:bg-indigo-700 shadow-lg border-0 transition-all uppercase text-white"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : (isEditing ? 'COMMIT UPDATES' : 'FINALIZE PROTOCOL')}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.3); }
      `}} />
    </div>
  );
}

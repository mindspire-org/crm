import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from "recharts";
import {
  BookOpen,
  Scale,
  Landmark,
  Wallet,
  ArrowUpRight,
  Layers,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart as PieChartIcon,
  Activity,
  Zap,
  BarChart3,
  Calendar,
  Search,
  RefreshCw,
  Eye,
  Shield,
} from "lucide-react";

type TrialBalanceRow = {
  accountCode: string;
  accountName: string;
  type: string;
  debit: number;
  credit: number;
};

type TrialBalanceResponse = {
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
};

type IncomeStatementResponse = {
  totalRevenue: number;
  totalExpense: number;
  netIncome: number;
};

type BalanceSheetResponse = {
  totals: {
    assets: number;
    liabilities: number;
    equity: number;
    retainedEarnings?: number;
  };
  balanced?: boolean;
};

type JournalEntry = {
  _id?: string;
  date?: string;
  memo?: string;
  refNo?: string;
  currency?: string;
  postedBy?: string;
  lines?: Array<{ accountCode?: string; debit?: number; credit?: number }>;
};

type Account = {
  _id?: string;
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  isActive?: boolean;
};

type EntityType = "vendor" | "client" | "employee";
type EntityHit = {
  entityType: EntityType;
  entityId: string;
  label: string;
  meta?: string;
};

type EntityLedgerRow = {
  date?: string;
  refNo?: string;
  memo?: string;
  accountCode?: string;
  debit?: number;
  credit?: number;
  balance?: number;
};

const toDateStr = (d: Date) => d.toISOString().slice(0, 10);

const formatMoney = (n: number) => {
  const v = Number(n || 0);
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/** Institutional Finance Terminal Dashboard */
export default function AccountingDashboard() {
  const [loading, setLoading] = useState(true);
  const [trial, setTrial] = useState<TrialBalanceResponse | null>(null);
  const [income, setIncome] = useState<IncomeStatementResponse | null>(null);
  const [balance, setBalance] = useState<BalanceSheetResponse | null>(null);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const refreshInFlight = useRef(false);

  const [entityQuery, setEntityQuery] = useState("");
  const [entityBusy, setEntityBusy] = useState(false);
  const [entityHits, setEntityHits] = useState<EntityHit[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<EntityHit | null>(null);
  const [entityFrom, setEntityFrom] = useState<string>("");
  const [entityTo, setEntityTo] = useState<string>("");
  const [entityLedgerBusy, setEntityLedgerBusy] = useState(false);
  const [entityLedgerRows, setEntityLedgerRows] = useState<EntityLedgerRow[]>([]);
  const [entityLedgerError, setEntityLedgerError] = useState<string>("");

  const today = useMemo(() => new Date(), []);
  const from30 = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }, []);

  const searchEntities = async (qRaw: string) => {
    const q = String(qRaw || "").trim();
    setEntityHits([]);
    setSelectedEntity(null);
    setEntityLedgerRows([]);
    setEntityLedgerError("");
    if (!q) return;

    setEntityBusy(true);
    try {
      const sp = new URLSearchParams();
      sp.set("q", q);
      const headers = { ...getAuthHeaders() };

      const [vRes, cRes, eRes] = await Promise.all([
        fetch(`${API_BASE}/api/vendors?${sp.toString()}`, { headers }),
        fetch(`${API_BASE}/api/clients?${sp.toString()}`, { headers }),
        fetch(`${API_BASE}/api/employees?${sp.toString()}`, { headers }),
      ]);

      const vJson = await vRes.json().catch(() => []);
      const cJson = await cRes.json().catch(() => []);
      const eJson = await eRes.json().catch(() => []);

      const vendorsHits: EntityHit[] = (Array.isArray(vJson) ? vJson : []).slice(0, 20).map((v: any) => ({
        entityType: "vendor",
        entityId: String(v._id),
        label: String(v.name || v.company || "Vendor"),
        meta: String(v.company || v.email || ""),
      }));

      const clientsHits: EntityHit[] = (Array.isArray(cJson) ? cJson : []).slice(0, 20).map((c: any) => ({
        entityType: "client",
        entityId: String(c._id),
        label: String(c.company || c.person || c.email || "Client"),
        meta: String(c.email || c.phone || ""),
      }));

      const employeesHits: EntityHit[] = (Array.isArray(eJson) ? eJson : []).slice(0, 20).map((e: any) => ({
        entityType: "employee",
        entityId: String(e._id),
        label: String(e.name || e.email || "Employee"),
        meta: String(e.email || e.department || ""),
      }));

      const merged = [...vendorsHits, ...clientsHits, ...employeesHits].slice(0, 30);
      setEntityHits(merged);
    } finally {
      setEntityBusy(false);
    }
  };

  const loadEntityLedger = async (ent: EntityHit) => {
    setSelectedEntity(ent);
    setEntityLedgerRows([]);
    setEntityLedgerError("");
    setEntityLedgerBusy(true);
    try {
      const sp = new URLSearchParams();
      sp.set("entityType", ent.entityType);
      sp.set("entityId", ent.entityId);
      if (entityFrom) sp.set("from", entityFrom);
      if (entityTo) sp.set("to", entityTo);
      const res = await fetch(`${API_BASE}/api/ledgers/entity?${sp.toString()}`, { headers: { ...getAuthHeaders() } });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load entity ledger");
      setEntityLedgerRows(Array.isArray(json?.rows) ? json.rows : []);
    } catch (e: any) {
      setEntityLedgerError(String(e?.message || "Failed"));
    } finally {
      setEntityLedgerBusy(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const from = toDateStr(from30);
      const to = toDateStr(today);
      const asOf = to;

      const [trialRes, incomeRes, balRes, journalsRes, accountsRes] = await Promise.all([
        fetch(`${API_BASE}/api/reports/trial-balance?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
          headers: { ...getAuthHeaders() },
        }),
        fetch(`${API_BASE}/api/reports/income-statement?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
          headers: { ...getAuthHeaders() },
        }),
        fetch(`${API_BASE}/api/reports/balance-sheet?asOf=${encodeURIComponent(asOf)}`, {
          headers: { ...getAuthHeaders() },
        }),
        fetch(`${API_BASE}/api/journals?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
          headers: { ...getAuthHeaders() },
        }),
        fetch(`${API_BASE}/api/accounts`, {
          headers: { ...getAuthHeaders() },
        }),
      ]);

      const trialJson = (await trialRes.json().catch(() => null)) as TrialBalanceResponse | null;
      if (trialRes.ok) setTrial(trialJson);

      const incomeJson = (await incomeRes.json().catch(() => null)) as IncomeStatementResponse | null;
      if (incomeRes.ok) setIncome(incomeJson);

      const balJson = (await balRes.json().catch(() => null)) as BalanceSheetResponse | null;
      if (balRes.ok) setBalance(balJson);

      const journalsJson = (await journalsRes.json().catch(() => null)) as any;
      if (journalsRes.ok) setJournals(Array.isArray(journalsJson) ? journalsJson : []);

      const accountsJson = (await accountsRes.json().catch(() => null)) as any;
      if (accountsRes.ok) setAccounts(Array.isArray(accountsJson) ? accountsJson : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const refresh = () => {
      if (document.hidden) return;
      if (refreshInFlight.current) return;
      refreshInFlight.current = true;
      Promise.resolve(load()).finally(() => {
        refreshInFlight.current = false;
      });
    };

    const onVis = () => {
      if (!document.hidden) refresh();
    };

    refresh();
    const t = window.setInterval(refresh, 20000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.clearInterval(t);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kpis = useMemo(() => {
    const totalRevenue = Number(income?.totalRevenue || 0);
    const totalExpense = Number(income?.totalExpense || 0);
    const netIncome = Number(income?.netIncome || 0);

    const assets = Number(balance?.totals?.assets || 0);
    const liabilities = Number(balance?.totals?.liabilities || 0);
    const equity = Number(balance?.totals?.equity || 0);
    const retained = Number(balance?.totals?.retainedEarnings || 0);

    const balanced = Boolean(trial?.balanced);
    const voucherCount = journals.length;

    return { totalRevenue, totalExpense, netIncome, assets, liabilities, equity, retained, balanced, voucherCount };
  }, [income, balance, trial, journals.length]);

  const accountTypeData = useMemo(() => {
    const types = ["asset", "liability", "equity", "revenue", "expense"] as const;
    const mapped = types.map((t) => ({
      name: t,
      value: accounts.filter((a) => a.type === t).length,
    }));
    return mapped;
  }, [accounts]);

  const topAccounts = useMemo(() => {
    const rows = Array.isArray(trial?.rows) ? trial!.rows : [];
    const scored = rows
      .map((r) => {
        const movement = Math.abs(Number(r.debit || 0) - Number(r.credit || 0));
        return { ...r, movement };
      })
      .sort((a, b) => b.movement - a.movement)
      .slice(0, 8)
      .map((r) => ({
        name: `${r.accountCode} ${r.accountName}`,
        movement: Number(r.movement || 0),
      }));
    return scored;
  }, [trial]);

  const recentJournals = useMemo(() => {
    return [...journals]
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
      .slice(0, 6);
  }, [journals]);

  const sectionCard = "border-0 shadow-xl bg-card/40 backdrop-blur-xl hover:shadow-[0_20px_80px_-20px_rgba(0,0,0,0.15)] transition-all duration-500 rounded-[2.5rem] border border-white/10 dark:border-white/5 overflow-hidden group";
  const statCard = "relative overflow-hidden border-0 shadow-2xl hover:scale-[1.03] transition-all duration-500 text-white rounded-[2.5rem] group pointer-events-auto";

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 space-y-8 pb-12 text-slate-900 dark:text-white">
      {/* Premium Header */}
      <div className="relative overflow-hidden bg-[#0a0a0a] px-6 py-16 sm:px-12 lg:px-20">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 via-purple-600/20 to-pink-600/30" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
        
        <div className="relative max-w-[1600px] mx-auto">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="group rounded-3xl bg-white/10 p-5 backdrop-blur-2xl border border-white/20 shadow-2xl transition-transform hover:scale-110 duration-500">
                  <BarChart3 className="h-12 w-12 text-white group-hover:rotate-12 transition-transform" />
                </div>
                <div>
                  <h1 className="text-5xl font-black tracking-tight text-white sm:text-7xl uppercase italic">
                    Finance <span className="text-indigo-400">Terminal</span>
                  </h1>
                  <p className="mt-3 text-xl text-white/60 font-medium max-w-xl leading-relaxed">
                    Institutional ledger control, multi-basis reporting, and entity accounting architecture.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 backdrop-blur-md px-4 py-1.5 text-xs font-black uppercase tracking-widest shadow-xl">
                  <Shield className="w-4 h-4 mr-2" /> Financial Controller
                </Badge>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 backdrop-blur-md px-4 py-1.5 text-xs font-black uppercase tracking-widest shadow-xl">
                  Real-time Ledger
                </Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 lg:mb-2">
              <Button
                onClick={load}
                variant="outline"
                size="lg"
                disabled={loading}
                className="bg-white/5 text-white border-white/10 hover:bg-white/10 backdrop-blur-md border-2 px-8 h-14 font-black tracking-wide rounded-2xl"
              >
                <RefreshCw className={cn("w-5 h-5 mr-3", loading && "animate-spin")} />
                REFRESH
              </Button>
              <Button asChild size="lg" className="bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_20px_50px_rgba(79,70,229,0.4)] px-10 h-14 font-black tracking-wide rounded-2xl border-0">
                <Link to="/accounting/vouchers">VOUCHER TERMINAL</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 sm:px-12 lg:px-20 -mt-12 relative z-10 space-y-12">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
          <Card className={cn(statCard, "bg-gradient-to-br from-[#059669] to-[#064e3b]")}>
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-white/20 rounded-full blur-3xl group-hover:bg-white/30 transition-colors" />
            <CardHeader className="relative pb-2">
              <CardTitle className="text-[10px] font-black text-white/70 flex items-center gap-2 uppercase tracking-[0.2em]">
                <DollarSign className="w-3 h-3 text-emerald-300" /> Net Income (30D)
              </CardTitle>
            </CardHeader>
            <CardContent className="relative space-y-1">
              <div className="text-4xl font-black tabular-nums tracking-tighter leading-none">{formatMoney(kpis.netIncome)}</div>
              <p className="text-[10px] font-black text-white/50 uppercase tracking-widest pt-2">Revenue: {formatMoney(kpis.totalRevenue)}</p>
            </CardContent>
          </Card>

          <Card className={cn(statCard, "bg-gradient-to-br from-[#4f46e5] to-[#312e81]")}>
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-white/20 rounded-full blur-3xl group-hover:bg-white/30 transition-colors" />
            <CardHeader className="relative pb-2">
              <CardTitle className="text-[10px] font-black text-white/70 flex items-center gap-2 uppercase tracking-[0.2em]">
                <Landmark className="w-3 h-3 text-indigo-300" /> Capital Assets
              </CardTitle>
            </CardHeader>
            <CardContent className="relative space-y-1">
              <div className="text-4xl font-black tabular-nums tracking-tighter leading-none">{formatMoney(kpis.assets)}</div>
              <p className="text-[10px] font-black text-white/50 uppercase tracking-widest pt-2">Equity: {formatMoney(kpis.equity)}</p>
            </CardContent>
          </Card>

          <Card className={cn(statCard, "bg-gradient-to-br from-[#d97706] to-[#78350f]")}>
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-white/20 rounded-full blur-3xl group-hover:bg-white/30 transition-colors" />
            <CardHeader className="relative pb-2">
              <CardTitle className="text-[10px] font-black text-white/70 flex items-center gap-2 uppercase tracking-[0.2em]">
                <Scale className="w-3 h-3 text-amber-300" /> Integrity Status
              </CardTitle>
            </CardHeader>
            <CardContent className="relative space-y-1">
              <div className="text-4xl font-black tabular-nums tracking-tighter leading-none uppercase">{kpis.balanced ? "BALANCED" : "DIVERGENT"}</div>
              <p className="text-[10px] font-black text-white/50 uppercase tracking-widest pt-2">DR/CR Verification Flow</p>
            </CardContent>
          </Card>

          <Card className={cn(statCard, "bg-gradient-to-br from-[#7c3aed] to-[#4c1d95]")}>
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-white/20 rounded-full blur-3xl group-hover:bg-white/30 transition-colors" />
            <CardHeader className="relative pb-2">
              <CardTitle className="text-[10px] font-black text-white/70 flex items-center gap-2 uppercase tracking-[0.2em]">
                <BookOpen className="w-3 h-3 text-purple-300" /> Active Vouchers
              </CardTitle>
            </CardHeader>
            <CardContent className="relative space-y-1">
              <div className="text-4xl font-black tabular-nums tracking-tighter leading-none">{String(kpis.voucherCount)}</div>
              <p className="text-[10px] font-black text-white/50 uppercase tracking-widest pt-2">Posted in last 30 days</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <Card className={cn(sectionCard, "lg:col-span-8")}>
            <CardHeader className="pb-4 pt-8 px-8 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2 text-indigo-600 italic">
                <Search className="w-5 h-5" /> Entity Ledger Lookup
              </CardTitle>
              <Badge className="bg-indigo-100 text-indigo-800 font-bold px-3 py-1 rounded-full text-[10px] uppercase">Universal Search</Badge>
            </CardHeader>
            <CardContent className="px-8 pb-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border-2 border-slate-100 dark:border-white/10">
                <div className="md:col-span-6">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Search Entity</Label>
                  <Input
                    value={entityQuery}
                    onChange={(e) => setEntityQuery(e.target.value)}
                    placeholder="Type name, email, company..."
                    className="h-12 rounded-xl border-2 bg-white dark:bg-slate-900 focus:ring-indigo-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">From</Label>
                  <DatePicker value={entityFrom} onChange={setEntityFrom} />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">To</Label>
                  <DatePicker value={entityTo} onChange={setEntityTo} />
                </div>
                <div className="md:col-span-2">
                  <Button
                    onClick={() => searchEntities(entityQuery)}
                    disabled={!entityQuery.trim() || entityBusy}
                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-200 transition-all"
                  >
                    <Search className="w-4 h-4 mr-2" /> SEARCH
                  </Button>
                </div>
              </div>

              <div className="overflow-hidden rounded-[2rem] border-2 border-slate-100 dark:border-white/10">
                <div className="max-h-[420px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b-2">
                      <tr className="text-left">
                        <th className="py-4 px-6 font-black uppercase tracking-widest text-[10px] text-slate-400">Taxonomy</th>
                        <th className="py-4 px-6 font-black uppercase tracking-widest text-[10px] text-slate-400">Legal Name</th>
                        <th className="py-4 px-6 font-black uppercase tracking-widest text-[10px] text-slate-400">Metadata</th>
                        <th className="py-4 px-6 text-right font-black uppercase tracking-widest text-[10px] text-slate-400">Protocol</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white/50 dark:bg-transparent">
                      {entityHits.map((h) => (
                        <tr key={`${h.entityType}:${h.entityId}`} className="group border-b last:border-0 hover:bg-indigo-500/[0.02] transition-colors">
                          <td className="py-4 px-6">
                            <Badge variant="outline" className="font-black uppercase text-[9px] px-2 py-0.5 tracking-widest bg-indigo-500/5 text-indigo-600 border-indigo-500/20">{h.entityType}</Badge>
                          </td>
                          <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">{h.label}</td>
                          <td className="py-4 px-6 text-muted-foreground font-medium">{h.meta || "--"}</td>
                          <td className="py-4 px-6 text-right">
                            <Button size="sm" onClick={() => loadEntityLedger(h)} disabled={entityLedgerBusy} variant="ghost" className="rounded-xl font-bold text-indigo-600 hover:bg-indigo-50">
                              <Eye className="w-4 h-4 mr-2" /> VIEW LEDGER
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {!entityBusy && entityQuery.trim() && entityHits.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-20 text-center italic text-muted-foreground font-medium uppercase tracking-widest text-xs opacity-50">No matches found in operational registry.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={cn(sectionCard, "lg:col-span-4 lg:sticky lg:top-6")}>
            <CardHeader className="pb-4 pt-8 px-8 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2 text-emerald-600 italic">
                <Eye className="w-5 h-5" /> Ledger Preview
              </CardTitle>
              <Badge className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full text-[10px] uppercase tracking-widest animate-pulse border-emerald-200">Live</Badge>
            </CardHeader>
            <CardContent className="px-8 pb-8 space-y-6">
              {selectedEntity ? (
                <>
                  <div className="p-6 bg-slate-900 text-white rounded-3xl shadow-xl shadow-indigo-950/20">
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-1">{selectedEntity.entityType}</div>
                    <div className="text-xl font-black tracking-tight leading-tight uppercase">{selectedEntity.label}</div>
                    <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Total Activity</span>
                      <Badge className="bg-emerald-500 text-white font-black border-0">{entityLedgerRows.length} ENTRIES</Badge>
                    </div>
                  </div>
                  {entityLedgerError && (
                    <div className="text-sm font-bold text-rose-600 p-4 bg-rose-50 rounded-2xl border-2 border-rose-100 italic">{entityLedgerError}</div>
                  )}
                  <div className="text-[10px] font-black text-indigo-600/60 p-4 bg-indigo-50/50 rounded-2xl border-2 border-indigo-100 italic leading-relaxed uppercase tracking-wide">
                    💡 Registry is filtered by date selection. Use the main lookup panel to refresh the chronological sequence.
                  </div>
                </>
              ) : (
                <div className="text-center py-20 opacity-20">
                  <div className="flex flex-col items-center gap-4">
                    <Search className="w-16 h-16 text-slate-900 dark:text-white" />
                    <p className="font-black uppercase tracking-[0.2em] text-xs">Awaiting Input</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {selectedEntity && (
          <Card className={cn(sectionCard, "order-5")}>
            <CardHeader className="pb-4 pt-8 px-8">
              <CardTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2 text-purple-600 italic">
                <Layers className="w-5 h-5" /> Transaction Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/50 dark:bg-white/5 border-b-2">
                    <tr className="text-left">
                      <th className="py-4 px-8 font-black uppercase tracking-widest text-[10px] text-slate-400">Date</th>
                      <th className="py-4 px-6 font-black uppercase tracking-widest text-[10px] text-slate-400">Reference</th>
                      <th className="py-4 px-6 font-black uppercase tracking-widest text-[10px] text-slate-400">Account</th>
                      <th className="py-4 px-6 font-black uppercase tracking-widest text-[10px] text-slate-400">Narrative</th>
                      <th className="py-4 px-6 text-right font-black uppercase tracking-widest text-[10px] text-slate-400">Debit</th>
                      <th className="py-4 px-6 text-right font-black uppercase tracking-widest text-[10px] text-slate-400">Credit</th>
                      <th className="py-4 px-8 text-right font-black uppercase tracking-widest text-[10px] text-slate-400">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entityLedgerRows.map((r, idx) => (
                      <tr key={idx} className="group border-b last:border-0 hover:bg-indigo-500/[0.02] transition-colors">
                        <td className="py-5 px-8 whitespace-nowrap font-bold text-slate-500 tabular-nums">{String(r.date || "").slice(0, 10)}</td>
                        <td className="py-5 px-6 font-black font-mono text-[10px] tracking-widest text-indigo-600 opacity-60 uppercase">{String(r.refNo || "JV-AUTO")}</td>
                        <td className="py-5 px-6 font-black font-mono text-[10px] opacity-40 uppercase">{String(r.accountCode || "") || "SYSTEM"}</td>
                        <td className="py-5 px-6 max-w-[240px] truncate font-medium text-slate-900 dark:text-slate-100 uppercase italic">{String(r.memo || "")}</td>
                        <td className="py-5 px-6 text-right font-black text-slate-900 dark:text-slate-100 tabular-nums tracking-tighter">{Number(r.debit || 0).toFixed(2)}</td>
                        <td className="py-5 px-6 text-right font-black text-slate-900 dark:text-slate-100 tabular-nums tracking-tighter">{Number(r.credit || 0).toFixed(2)}</td>
                        <td className="py-5 px-8 text-right font-black text-lg tabular-nums tracking-tighter text-indigo-600 dark:text-indigo-400 italic">{Number(r.balance || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className={sectionCard}>
            <CardHeader className="pb-4 pt-8 px-8 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2 text-indigo-600 italic">
                <Activity className="w-5 h-5 text-indigo-600" /> Portfolio Movements
              </CardTitle>
              <Badge className="bg-indigo-50 text-indigo-600 font-bold px-3 py-1 rounded-full text-[10px] uppercase border-indigo-100 shadow-sm">Relative Magnitude</Badge>
            </CardHeader>
            <CardContent className="px-8 pb-8 h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topAccounts} margin={{ left: 0, right: 0, top: 20 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                      <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                  <XAxis dataKey="name" hide />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700 }} />
                  <Tooltip 
                    cursor={{fill: 'rgba(99, 102, 241, 0.05)'}}
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', background: '#0f172a', color: '#fff'}}
                  />
                  <Bar dataKey="movement" fill="url(#barGrad)" radius={[12, 12, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className={sectionCard}>
            <CardHeader className="pb-4 pt-8 px-8 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2 text-emerald-600 italic">
                <PieChartIcon className="w-5 h-5 text-emerald-600" /> Structure of Registry
              </CardTitle>
              <Badge className="bg-emerald-50 text-emerald-600 font-bold px-3 py-1 rounded-full text-[10px] uppercase border-emerald-100 shadow-sm">Asset Distribution</Badge>
            </CardHeader>
            <CardContent className="px-8 pb-8 h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={accountTypeData} margin={{ left: 0, right: 0, top: 20 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700 }} />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', background: '#0f172a', color: '#fff'}}
                  />
                  <Area type="monotone" dataKey="value" stroke="#10b981" fill="url(#areaGrad)" strokeWidth={4} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card className={sectionCard}>
          <CardHeader className="pb-4 pt-8 px-8 border-b bg-slate-50/50">
            <CardTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2 text-purple-600 italic">
              <Calendar className="w-5 h-5" /> Chronology of Vouchers
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/50 dark:bg-white/5 border-b-2">
                  <tr className="text-left">
                    <th className="py-4 px-8 font-black uppercase tracking-widest text-[10px] text-slate-400">Sequence</th>
                    <th className="py-4 px-6 font-black uppercase tracking-widest text-[10px] text-slate-400">Date</th>
                    <th className="py-4 px-6 font-black uppercase tracking-widest text-[10px] text-slate-400">Registry Memo</th>
                    <th className="py-4 px-6 font-black uppercase tracking-widest text-[10px] text-slate-400">Authority</th>
                    <th className="py-4 px-8 text-right font-black uppercase tracking-widest text-[10px] text-slate-400">Magnitude</th>
                  </tr>
                </thead>
                <tbody>
                  {recentJournals.map((j) => (
                    <tr key={j._id} className="group border-b last:border-0 hover:bg-indigo-500/[0.02] transition-colors">
                      <td className="py-5 px-8 font-black font-mono text-[10px] tracking-widest text-indigo-600 uppercase">{j.refNo || "JV-MANUAL"}</td>
                      <td className="py-5 px-6 font-bold text-slate-500 tabular-nums tracking-tighter leading-none">{String(j.date || "").slice(0, 10)}</td>
                      <td className="py-5 px-6 max-w-[300px] truncate font-medium text-slate-900 dark:text-slate-100 italic uppercase">{j.memo || "No narrative"}</td>
                      <td className="py-5 px-6 font-black text-[10px] uppercase text-slate-400 tracking-tighter">{j.postedBy || "System"}</td>
                      <td className="py-5 px-8 text-right font-black text-lg tabular-nums tracking-tighter text-slate-950 dark:text-white italic">
                        {j.lines?.reduce((s, l) => s + (l.debit || 0), 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {recentJournals.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-24 text-center opacity-30">
                        <div className="flex flex-col items-center gap-4">
                          <BookOpen className="w-16 h-16" />
                          <p className="font-black uppercase tracking-[0.2em] text-xs">Registry Empty (30D)</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.2)] bg-slate-900 text-white rounded-[3rem] overflow-hidden p-12 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-transparent" />
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="space-y-4 max-w-xl text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-500/30">
                <Zap className="w-3 h-3" /> Command Center
              </div>
              <h2 className="text-4xl font-black tracking-tighter leading-none uppercase italic">Execute Financial Operations</h2>
              <p className="text-white/50 text-lg font-medium tracking-tight">Streamlined access to core institutional modules for rapid auditing and document generation.</p>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
              {[
                { label: "Post Voucher", href: "/accounting/vouchers", icon: BookOpen, color: "bg-indigo-600" },
                { label: "Analyze GL", href: "/accounting/ledger", icon: Activity, color: "bg-emerald-600" },
                { label: "Manage COA", href: "/accounting/accounts", icon: Layers, color: "bg-purple-600" },
                { label: "Suppliers", href: "/accounting/vendors", icon: Wallet, color: "bg-rose-600" },
              ].map((act) => (
                <Link 
                  key={act.label} 
                  to={act.href}
                  className="group flex flex-col items-center justify-center gap-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[2rem] p-8 transition-all duration-500 hover:scale-105 active:scale-95 min-w-[180px] shadow-2xl"
                >
                  <div className={cn("p-4 rounded-2xl shadow-2xl transition-transform group-hover:rotate-12 group-hover:scale-110", act.color)}>
                    <act.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-black text-[10px] uppercase tracking-widest text-white/70 group-hover:text-white transition-colors">{act.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

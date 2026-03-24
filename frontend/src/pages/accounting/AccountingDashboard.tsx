import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useSettings } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { DatePicker } from "@/components/ui/date-picker";
import { Separator } from "@/components/ui/separator";
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
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar,
  Layers,
  Wallet,
  Building2,
  Users,
  Briefcase,
  Star,
  Clock,
  Shield,
  DollarSign,
  PieChart as PieChartIcon,
  BookOpen,
  ArrowUpRight,
  Landmark,
  Scale,
  Eye
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

/** Tech Company Finance Terminal Dashboard */
export default function AccountingDashboard() {
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [trial, setTrial] = useState<TrialBalanceResponse | null>(null);
  const [income, setIncome] = useState<IncomeStatementResponse | null>(null);
  const [balance, setBalance] = useState<BalanceSheetResponse | null>(null);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [reportType, setCategoryFilter] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [reportData, setReportData] = useState<any>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);

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

  const loadReport = async (type: "daily" | "weekly" | "monthly") => {
    setCategoryFilter(type);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports/accounting-summary?type=${type}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setReportData(await res.json());
      }
    } catch (e) {
      toast.error("Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  const printSummaryReport = () => {
    if (!reportData) return;
    const win = window.open("", "_blank");
    if (!win) return;

    const companyName = settings.general?.companyName || "Mind Spire ERP";
    const logoUrl = settings.general?.logoUrl 
      ? (settings.general.logoUrl.startsWith('http') ? settings.general.logoUrl : `${API_BASE}${settings.general.logoUrl}`)
      : null;

    const html = `
      <html>
        <head>
          <title>Accounting Report - ${companyName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #0f172a; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; }
            .brand-container { display: flex; align-items: center; gap: 15px; }
            .brand-logo { height: 50px; width: auto; object-fit: contain; }
            .brand-name { color: #4f46e5; font-weight: 800; font-size: 24px; letter-spacing: -0.025em; text-transform: uppercase; }
            .report-title { text-align: right; }
            .report-title h1 { margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 0.1em; color: #1e293b; }
            .meta { font-size: 11px; color: #64748b; margin-top: 4px; font-weight: 600; }
            
            .stats-grid { display: grid; grid-template-cols: repeat(4, 1fr); gap: 20px; margin-bottom: 40px; }
            .stat-box { background: #f8fafc; padding: 20px; border-radius: 16px; border: 1px solid #e2e8f0; }
            .stat-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
            .stat-value { font-size: 24px; font-weight: 800; color: #0f172a; }

            .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #4f46e5; margin: 40px 0 20px 0; display: flex; align-items: center; gap: 10px; }
            .section-title::after { content: ""; flex: 1; height: 1px; background: #e2e8f0; }

            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; padding: 12px 8px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 1px solid #e2e8f0; }
            td { padding: 12px 8px; font-size: 11px; border-bottom: 1px solid #f1f5f9; color: #334155; }
            .num { text-align: right; font-weight: 700; font-family: 'Courier New', monospace; }
            
            .footer { margin-top: 60px; font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px; text-transform: uppercase; letter-spacing: 0.1em; }
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
              <h1>Accounting Summary</h1>
              <div class="meta">TYPE: ${reportType.toUpperCase()} | GENERATED: ${new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-label">Total Projects</div>
              <div class="stat-value">${reportData.projects?.count || 0}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">New Clients</div>
              <div class="stat-value">${reportData.clients?.count || 0}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Subscriptions</div>
              <div class="stat-value">${reportData.subscriptions?.count || 0}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Total Expenses</div>
              <div class="stat-value">PKR ${Number(reportData.expenses?.total || 0).toLocaleString()}</div>
            </div>
          </div>

          <div class="section-title">Expense Breakdown</div>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th style="text-align: right">Entry Count</th>
                <th style="text-align: right">Total Magnitude</th>
              </tr>
            </thead>
            <tbody>
              ${(reportData.expenses?.breakdown || []).map((b: any) => `
                <tr>
                  <td>${b._id || 'General'}</td>
                  <td class="num">${b.count}</td>
                  <td class="num">PKR ${Number(b.total).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="section-title">New Projects</div>
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Client</th>
                <th style="text-align: right">Value</th>
              </tr>
            </thead>
            <tbody>
              ${(reportData.projects?.recent || []).map((p: any) => `
                <tr>
                  <td>${p.title}</td>
                  <td>${p.client || '--'}</td>
                  <td class="num">PKR ${Number(p.price || 0).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            Corporate Accounting Intelligence • Mind Spire Financial Core 2.0 • Generated on ${new Date().toLocaleString()}
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();
  };

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

  const sectionCard = "border border-slate-200 shadow-sm bg-white rounded-[2.5rem] overflow-hidden group transition-all duration-500 hover:shadow-xl hover:shadow-indigo-500/5";
  const statCard = "relative overflow-hidden border border-white/10 shadow-2xl hover:scale-[1.03] transition-all duration-500 text-white rounded-[2.5rem] group pointer-events-auto";

  return (
    <div className="min-h-screen bg-slate-50/50 space-y-8 pb-12 text-slate-900">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-100/30 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-100/30 blur-[120px]" />
      </div>

      {/* Premium Header */}
      <div className="relative overflow-hidden bg-slate-900 px-6 py-16 sm:px-12 lg:px-20 rounded-b-[4rem] shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-purple-600/10 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(120,119,198,0.2),transparent)]" />
        
        <div className="relative max-w-[1600px] mx-auto">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="group rounded-3xl bg-white/10 p-5 backdrop-blur-2xl border border-white/20 shadow-2xl transition-all hover:scale-110 hover:bg-white/20 duration-500">
                  <BarChart3 className="h-12 w-12 text-white" />
                </div>
                <div>
                  <h1 className="text-5xl font-bold tracking-tight text-white sm:text-7xl uppercase italic">
                    Finance <span className="text-indigo-400">Terminal</span>
                  </h1>
                  <p className="mt-3 text-xl text-slate-400 font-medium max-w-xl leading-relaxed">
                    Tech company ledger control, multi-basis reporting, and corporate accounting architecture.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 backdrop-blur-md px-4 py-1.5 text-xs font-bold uppercase tracking-widest">
                  <Shield className="w-4 h-4 mr-2" /> Financial Controller
                </Badge>
                <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 backdrop-blur-md px-4 py-1.5 text-xs font-bold uppercase tracking-widest">
                  Real-time Ledger
                </Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 lg:mb-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="lg" className="bg-white/5 text-white border-white/10 hover:bg-white/10 backdrop-blur-md border-2 px-8 h-14 font-bold tracking-wide rounded-2xl transition-all active:scale-95">
                    <Printer className="w-5 h-5 mr-3" />
                    PRINT SUMMARY
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-6 rounded-[2rem] border-0 shadow-2xl bg-white space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">Report Protocol</h3>
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-relaxed">Select temporal magnitude for institutional accounting summary.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <Button variant="ghost" onClick={() => loadReport("daily")} className="justify-start gap-3 rounded-xl h-12 hover:bg-indigo-50 font-bold text-[10px] tracking-widest uppercase text-slate-600 hover:text-indigo-600">
                      <Clock className="w-4 h-4" /> Daily Ledger Feed
                    </Button>
                    <Button variant="ghost" onClick={() => loadReport("weekly")} className="justify-start gap-3 rounded-xl h-12 hover:bg-indigo-50 font-bold text-[10px] tracking-widest uppercase text-slate-600 hover:text-indigo-600">
                      <Calendar className="w-4 h-4" /> Weekly Performance Audit
                    </Button>
                    <Button variant="ghost" onClick={() => loadReport("monthly")} className="justify-start gap-3 rounded-xl h-12 hover:bg-indigo-50 font-bold text-[10px] tracking-widest uppercase text-slate-600 hover:text-indigo-600">
                      <History className="w-4 h-4" /> Monthly Institutional Summary
                    </Button>
                  </div>
                  {reportData && (
                    <Button onClick={printSummaryReport} className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase text-[10px] tracking-widest shadow-xl">
                      <Printer className="w-4 h-4 mr-2" /> EXECUTE PRINT
                    </Button>
                  )}
                </PopoverContent>
              </Popover>
              <Button
                onClick={load}
                variant="outline"
                size="lg"
                disabled={loading}
                className="bg-white/5 text-white border-white/10 hover:bg-white/10 backdrop-blur-md border-2 px-8 h-14 font-bold tracking-wide rounded-2xl transition-all active:scale-95"
              >
                <RefreshCw className={cn("w-5 h-5 mr-3", loading && "animate-spin")} />
                REFRESH
              </Button>
              <Button asChild size="lg" className="bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/40 px-10 h-14 font-bold wide rounded-2xl border-0 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95">
                <Link to="/accounting/vouchers">VOUCHER TERMINAL</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 sm:px-12 lg:px-20 -mt-12 relative z-10 space-y-12">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
          {[
            { label: "Net Income (30D)", value: kpis.netIncome, sub: `Revenue: ${formatMoney(kpis.totalRevenue)}`, icon: DollarSign, grad: "from-emerald-600 to-emerald-800" },
            { label: "Capital Assets", value: kpis.assets, sub: `Equity: ${formatMoney(kpis.equity)}`, icon: Landmark, grad: "from-indigo-600 to-indigo-800" },
            { label: "Integrity Status", value: kpis.balanced ? "BALANCED" : "DIVERGENT", sub: "DR/CR Verification", icon: Scale, grad: "from-amber-600 to-amber-800" },
            { label: "Active Vouchers", value: String(kpis.voucherCount), sub: "Posted in last 30 days", icon: BookOpen, grad: "from-purple-600 to-purple-800" },
          ].map((kpi, idx) => (
            <Card key={idx} className={cn("relative overflow-hidden border-0 shadow-2xl transition-all duration-500 text-white rounded-[2.5rem] group hover:scale-[1.03] bg-gradient-to-br", kpi.grad)}>
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-colors" />
              <CardHeader className="relative pb-2">
                <CardTitle className="text-[10px] font-bold text-white/70 flex items-center gap-2 uppercase tracking-[0.2em]">
                  <kpi.icon className="w-3 h-3 opacity-70" /> {kpi.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="relative space-y-1">
                <div className="text-4xl font-bold tabular-nums tracking-tighter leading-none">
                  {typeof kpi.value === 'number' ? formatMoney(kpi.value) : kpi.value}
                </div>
                <p className="text-[10px] font-medium text-white/50 uppercase tracking-widest pt-2">{kpi.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <Card className={cn(sectionCard, "lg:col-span-8")}>
            <CardHeader className="pb-4 pt-8 px-8 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-bold uppercase tracking-tight flex items-center gap-2 text-indigo-600">
                <Search className="w-5 h-5" /> Entity Ledger Lookup
              </CardTitle>
              <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 font-bold px-3 py-1 rounded-full text-[10px] uppercase border-indigo-100">Universal Search</Badge>
            </CardHeader>
            <CardContent className="px-8 pb-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50 p-6 rounded-3xl border border-slate-200">
                <div className="md:col-span-6">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Search Entity</Label>
                  <Input
                    value={entityQuery}
                    onChange={(e) => setEntityQuery(e.target.value)}
                    placeholder="Type name, email, company..."
                    className="h-12 rounded-xl border-slate-200 bg-white focus:ring-indigo-500 font-medium"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">From</Label>
                  <DatePicker value={entityFrom} onChange={setEntityFrom} className="h-12 rounded-xl w-full border-slate-200" />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">To</Label>
                  <DatePicker value={entityTo} onChange={setEntityTo} className="h-12 rounded-xl w-full border-slate-200" />
                </div>
                <div className="md:col-span-2">
                  <Button
                    onClick={() => searchEntities(entityQuery)}
                    disabled={!entityQuery.trim() || entityBusy}
                    className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 border-0"
                  >
                    {entityBusy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4 mr-2" /> SEARCH</>}
                  </Button>
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                <div className="max-h-[420px] overflow-auto custom-scrollbar">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50 border-b">
                      <tr className="text-left">
                        <th className="py-4 px-6 font-bold uppercase tracking-widest text-[10px] text-slate-400">Taxonomy</th>
                        <th className="py-4 px-6 font-bold uppercase tracking-widest text-[10px] text-slate-400">Legal Name</th>
                        <th className="py-4 px-6 font-bold uppercase tracking-widest text-[10px] text-slate-400">Metadata</th>
                        <th className="py-4 px-6 text-right font-bold uppercase tracking-widest text-[10px] text-slate-400">Protocol</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {entityHits.map((h) => (
                        <tr key={`${h.entityType}:${h.entityId}`} className="group hover:bg-indigo-50/30 transition-colors">
                          <td className="py-4 px-6">
                            <Badge variant="outline" className="font-bold uppercase text-[9px] px-2 py-0.5 tracking-widest bg-indigo-50 text-indigo-600 border-indigo-100">{h.entityType}</Badge>
                          </td>
                          <td className="py-4 px-6 font-semibold text-slate-900">{h.label}</td>
                          <td className="py-4 px-6 text-slate-500 text-xs">{h.meta || "--"}</td>
                          <td className="py-4 px-6 text-right">
                            <Button size="sm" onClick={() => loadEntityLedger(h)} disabled={entityLedgerBusy} variant="ghost" className="rounded-xl font-bold text-indigo-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-indigo-100 transition-all">
                              <Eye className="w-4 h-4 mr-2" /> VIEW LEDGER
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {!entityBusy && entityQuery.trim() && entityHits.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-20 text-center italic text-slate-400 font-medium uppercase tracking-widest text-[10px]">No matches found in operational registry.</td>
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
              <CardTitle className="text-xl font-bold uppercase tracking-tight flex items-center gap-2 text-emerald-600">
                <Eye className="w-5 h-5" /> Ledger Preview
              </CardTitle>
              <Badge className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full text-[10px] uppercase tracking-widest animate-pulse border-emerald-200">Live</Badge>
            </CardHeader>
            <CardContent className="px-8 pb-8 space-y-6">
              {selectedEntity ? (
                <div className="space-y-6">
                  <div className="p-6 bg-slate-900 text-white rounded-[2rem] shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Shield className="w-12 h-12" />
                    </div>
                    <div className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-1">{selectedEntity.entityType}</div>
                    <div className="text-xl font-bold tracking-tight leading-tight uppercase truncate">{selectedEntity.label}</div>
                    <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Total Activity</span>
                      <Badge className="bg-emerald-500 text-white font-bold border-0 px-2 py-0.5 rounded-lg text-[10px]">{entityLedgerRows.length} ENTRIES</Badge>
                    </div>
                  </div>
                  {entityLedgerError && (
                    <div className="text-xs font-bold text-rose-600 p-4 bg-rose-50 rounded-2xl border border-rose-100 italic">{entityLedgerError}</div>
                  )}
                  <div className="text-[10px] font-bold text-indigo-600/60 p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 italic leading-relaxed uppercase tracking-wider">
                    💡 Registry is filtered by date selection. Use the main lookup panel to refresh the chronological sequence.
                  </div>
                </div>
              ) : (
                <div className="text-center py-24 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                  <div className="flex flex-col items-center gap-4 opacity-20">
                    <Search className="w-16 h-16 text-slate-900" />
                    <p className="font-bold uppercase tracking-widest text-[10px]">Awaiting Entity Selection</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {selectedEntity && (
          <Card className={cn(sectionCard)}>
            <CardHeader className="pb-4 pt-8 px-8">
              <CardTitle className="text-xl font-bold uppercase tracking-tight flex items-center gap-2 text-purple-600">
                <Layers className="w-5 h-5" /> Transaction Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr className="text-left">
                      <th className="py-4 px-8 font-bold uppercase tracking-widest text-[10px] text-slate-400">Date</th>
                      <th className="py-4 px-6 font-bold uppercase tracking-widest text-[10px] text-slate-400">Reference</th>
                      <th className="py-4 px-6 font-bold uppercase tracking-widest text-[10px] text-slate-400">Account</th>
                      <th className="py-4 px-6 font-bold uppercase tracking-widest text-[10px] text-slate-400">Narrative</th>
                      <th className="py-4 px-6 text-right font-bold uppercase tracking-widest text-[10px] text-slate-400">Debit</th>
                      <th className="py-4 px-6 text-right font-bold uppercase tracking-widest text-[10px] text-slate-400">Credit</th>
                      <th className="py-4 px-8 text-right font-bold uppercase tracking-widest text-[10px] text-slate-400">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {entityLedgerRows.map((r, idx) => (
                      <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-5 px-8 whitespace-nowrap font-bold text-slate-500 tabular-nums">{String(r.date || "").slice(0, 10)}</td>
                        <td className="py-5 px-6">
                          <span className="font-bold font-mono text-[10px] tracking-widest text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{String(r.refNo || "JV-AUTO")}</span>
                        </td>
                        <td className="py-5 px-6 font-bold font-mono text-[10px] text-slate-400 uppercase tracking-tight">{String(r.accountCode || "") || "SYSTEM"}</td>
                        <td className="py-5 px-6 max-w-[300px] truncate font-semibold text-slate-700 uppercase text-xs">{String(r.memo || "")}</td>
                        <td className="py-5 px-6 text-right font-bold text-slate-900 tabular-nums tracking-tighter">{formatMoney(Number(r.debit || 0))}</td>
                        <td className="py-5 px-6 text-right font-bold text-slate-900 tabular-nums tracking-tighter">{formatMoney(Number(r.credit || 0))}</td>
                        <td className="py-5 px-8 text-right font-bold text-lg tabular-nums tracking-tighter text-indigo-600 italic">{formatMoney(Number(r.balance || 0))}</td>
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
              <CardTitle className="text-xl font-bold uppercase tracking-tight flex items-center gap-2 text-indigo-600">
                <Activity className="w-5 h-5 text-indigo-600" /> Portfolio Movements
              </CardTitle>
              <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 font-bold px-3 py-1 rounded-full text-[10px] uppercase border-indigo-100 shadow-sm">Relative Magnitude</Badge>
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
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} />
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
              <CardTitle className="text-xl font-bold uppercase tracking-tight flex items-center gap-2 text-emerald-600">
                <PieChartIcon className="w-5 h-5 text-emerald-600" /> Structure of Registry
              </CardTitle>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 font-bold px-3 py-1 rounded-full text-[10px] uppercase border-emerald-100 shadow-sm">Asset Distribution</Badge>
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
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} />
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
          <CardHeader className="pb-4 pt-8 px-8 border-b border-slate-50 bg-slate-50/30">
            <CardTitle className="text-xl font-bold uppercase tracking-tight flex items-center gap-2 text-purple-600">
              <Calendar className="w-5 h-5" /> Chronology of Vouchers
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/50 border-b">
                  <tr className="text-left">
                    <th className="py-4 px-8 font-bold uppercase tracking-widest text-[10px] text-slate-400">Sequence</th>
                    <th className="py-4 px-6 font-bold uppercase tracking-widest text-[10px] text-slate-400">Date</th>
                    <th className="py-4 px-6 font-bold uppercase tracking-widest text-[10px] text-slate-400">Registry Memo</th>
                    <th className="py-4 px-6 font-bold uppercase tracking-widest text-[10px] text-slate-400">Authority</th>
                    <th className="py-4 px-8 text-right font-bold uppercase tracking-widest text-[10px] text-slate-400">Magnitude</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentJournals.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center opacity-30 italic font-medium uppercase tracking-widest text-[10px]">No recent registry sequences</td>
                    </tr>
                  ) : (
                    recentJournals.map((v, i) => (
                      <tr key={v._id || i} className="group border-b last:border-0 hover:bg-indigo-500/[0.02] transition-colors">
                        <td className="py-5 px-8 whitespace-nowrap">
                          <span className="font-black font-mono text-[10px] tracking-widest text-indigo-600 opacity-60 uppercase">{v.refNo || "SYSTEM_AUTO"}</span>
                        </td>
                        <td className="py-5 px-6 font-bold text-slate-500 tabular-nums">{String(v.date || "").slice(0, 10)}</td>
                        <td className="py-5 px-6 max-w-[280px] truncate font-bold text-slate-700 uppercase tracking-tight text-sm leading-none">{v.memo || "N/A"}</td>
                        <td className="py-5 px-6 text-center">
                          <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-widest text-slate-400 border-slate-200">{v.postedBy || "SYSTEM"}</Badge>
                        </td>
                        <td className="py-5 px-8 text-right font-black text-slate-900 dark:text-slate-100 tabular-nums tracking-tighter">
                          {formatMoney(v.lines?.reduce((s, l) => s + (l.debit || 0), 0) || 0)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Global Action Terminal */}
        <Card className="relative overflow-hidden rounded-[3rem] border-0 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.2)] bg-slate-900 group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-purple-600/10 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.15),transparent)]" />
          
          <CardContent className="p-12 relative flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="space-y-4 text-center md:text-left">
              <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 px-4 py-1 font-bold uppercase tracking-[0.2em] text-[10px]">
                <Zap className="w-3 h-3 mr-2 text-indigo-400" /> Command Center
              </Badge>
              <h2 className="text-4xl font-bold text-white tracking-tight leading-none">Execute Financial <span className="text-indigo-400">Operations</span></h2>
              <p className="text-slate-400 text-lg font-medium max-w-xl">
                Streamlined access to core institutional modules for rapid auditing and document generation.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Post Vouchers", icon: BookOpen, href: "/accounting/vouchers", color: "bg-indigo-600 shadow-indigo-500/20" },
                { label: "Analyze GL", icon: Activity, href: "/accounting/ledger", color: "bg-emerald-600 shadow-emerald-500/20" },
                { label: "Manage COA", icon: Layers, href: "/accounting/accounts", color: "bg-purple-600 shadow-purple-500/20" },
                { label: "Suppliers", icon: Wallet, href: "/accounting/vendors", color: "bg-rose-600 shadow-rose-500/20" },
              ].map((act, i) => (
                <Link 
                  key={i} 
                  to={act.href}
                  className="group/btn flex flex-col items-center justify-center gap-3 p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 hover:scale-105 transition-all duration-300 active:scale-95 w-40 h-40 shadow-2xl"
                >
                  <div className={cn("p-3 rounded-2xl shadow-lg transition-transform group-hover/btn:rotate-12 duration-500", act.color)}>
                    <act.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300 group-hover/btn:text-white transition-colors">{act.label}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.2); }
      `}} />
    </div>
  );
}

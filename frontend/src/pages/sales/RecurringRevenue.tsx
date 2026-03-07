import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, CalendarDays, AlertTriangle, TrendingUp, Wallet, CircleDollarSign, BadgeCheck, PauseCircle } from "lucide-react";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";
import { useSettings } from "@/hooks/useSettings";

type SubscriptionDoc = {
  _id: string;
  subscriptionNo?: number;
  clientId?: string;
  client?: string;
  title?: string;
  type?: string;
  currency?: string;
  firstBillingDate?: string;
  nextBillingDate?: string;
  repeatEveryCount?: number;
  repeatEveryUnit?: string;
  cycles?: number;
  status?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  amount?: number;
  tax1?: number;
  tax2?: number;
  note?: string;
  labels?: string[];
  createdAt?: string;
  updatedAt?: string;
};

function toIsoDate(input?: string) {
  if (!input) return "";
  try {
    return new Date(input).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function normalizeToMonthly(amount: number, everyCount: number, unit: string) {
  const c = Math.max(1, Number(everyCount) || 1);
  const u = String(unit || "month").toLowerCase();

  // Approximate normalization to monthly revenue
  if (u === "day" || u === "days") return (amount * 30) / c;
  if (u === "week" || u === "weeks") return (amount * 4.345) / c;
  if (u === "month" || u === "months") return amount / c;
  if (u === "year" || u === "years") return amount / 12 / c;

  // Fallback: treat as monthly
  return amount / c;
}

export default function RecurringRevenue() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "cancelled" | "paused">("all");
  const [currencyFilter, setCurrencyFilter] = useState<string>("all");
  const [renewalWindowDays, setRenewalWindowDays] = useState("30");

  const { settings } = useSettings();

  const reload = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());

      const res = await fetch(`${API_BASE}/api/subscriptions?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load subscriptions");
      setSubscriptions(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const monthKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const currencyMeta = useMemo(() => {
    const base = String(settings?.localization?.baseCurrency || settings?.localization?.currency || "PKR").trim() || "PKR";
    const display = String(settings?.localization?.currency || base).trim() || base;
    const list = Array.isArray(settings?.localization?.currencies) ? settings!.localization!.currencies! : [];
    const map = new Map<string, { code: string; symbol?: string; rate: number }>();
    for (const c of list) {
      const code = String(c?.code || "").trim();
      if (!code) continue;
      map.set(code, { code, symbol: c?.symbol, rate: Number(c?.rate || 0) || 0 });
    }
    if (!map.has(base)) map.set(base, { code: base, symbol: base, rate: 1 });
    if (!map.has(display)) map.set(display, { code: display, symbol: display, rate: display === base ? 1 : 0 });
    return { base, display, map };
  }, [settings]);

  const money = useMemo(() => {
    const locale = String(settings?.localization?.locale || "en-US");
    const symbol = currencyMeta.map.get(currencyMeta.display)?.symbol || currencyMeta.display;
    const displayRate = Number(currencyMeta.map.get(currencyMeta.display)?.rate || 0) || (currencyMeta.display === currencyMeta.base ? 1 : 0);

    const toBase = (amount: number, fromCurrency: string) => {
      const from = String(fromCurrency || currencyMeta.base).trim() || currencyMeta.base;
      const fromRate = Number(currencyMeta.map.get(from)?.rate || 0) || (from === currencyMeta.base ? 1 : 0);
      if (!fromRate) return 0;
      return amount * fromRate;
    };

    const baseToDisplay = (baseAmount: number) => {
      if (currencyMeta.display === currencyMeta.base) return baseAmount;
      if (!displayRate) return 0;
      return baseAmount / displayRate;
    };

    const format = (baseAmount: number) => {
      const n = Number(baseToDisplay(baseAmount) || 0);
      return `${symbol} ${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(n)}`;
    };

    return { toBase, baseToDisplay, format, symbol };
  }, [currencyMeta, settings]);

  const metrics = useMemo(() => {
    const normalizedWindow = Math.max(1, Number(renewalWindowDays) || 30);
    const today = new Date(todayIso);
    const inDays = (iso: string) => {
      const d = new Date(iso);
      return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    };

    const statusNorm = (s: SubscriptionDoc) => String(s.status || "active").toLowerCase();
    const allRows = subscriptions
      .filter((s) => {
        const q = query.trim().toLowerCase();
        if (q) {
          const blob = `${s.title || ""} ${s.client || ""} ${s.subscriptionNo || ""}`.toLowerCase();
          if (!blob.includes(q)) return false;
        }

        const st = statusNorm(s);
        if (statusFilter !== "all") {
          if (statusFilter === "paused") {
            if (st !== "paused" && st !== "hold") return false;
          } else if (st !== statusFilter) return false;
        }

        const cur = String(s.currency || currencyMeta.base).trim() || currencyMeta.base;
        if (currencyFilter !== "all" && cur !== currencyFilter) return false;
        return true;
      })
      .slice();

    const active = allRows.filter((s) => statusNorm(s) === "active");
    const cancelled = allRows.filter((s) => statusNorm(s) === "cancelled");
    const paused = allRows.filter((s) => {
      const st = statusNorm(s);
      return st === "paused" || st === "hold";
    });

    const currencyTotalsMonthlyRaw = new Map<string, number>();
    const currencyTotalsMonthlyBase = new Map<string, number>();
    let mrrBase = 0;

    for (const s of active) {
      const amount = Number(s.amount || 0) || 0;
      const monthlyRaw = normalizeToMonthly(amount, Number(s.repeatEveryCount || 1) || 1, String(s.repeatEveryUnit || "month"));
      const cur = String(s.currency || currencyMeta.base).trim() || currencyMeta.base;
      currencyTotalsMonthlyRaw.set(cur, (currencyTotalsMonthlyRaw.get(cur) || 0) + monthlyRaw);

      const monthlyBase = money.toBase(monthlyRaw, cur);
      mrrBase += monthlyBase;
      currencyTotalsMonthlyBase.set(cur, (currencyTotalsMonthlyBase.get(cur) || 0) + monthlyBase);
    }

    const dueSoonList: Array<SubscriptionDoc & { _daysToBill: number }> = [];
    const overdueList: Array<SubscriptionDoc & { _daysToBill: number }> = [];

    for (const s of active) {
      const next = toIsoDate(s.nextBillingDate);
      if (!next) continue;
      const diff = inDays(next);
      if (diff < 0) overdueList.push({ ...s, _daysToBill: diff });
      else if (diff <= normalizedWindow) dueSoonList.push({ ...s, _daysToBill: diff });
    }

    const churnedThisMonth = cancelled.filter((s) => toIsoDate(s.cancelledAt).startsWith(monthKey)).length;

    const byCurrency = Array.from(
      new Set([
        ...Array.from(currencyTotalsMonthlyRaw.keys()),
        ...Array.from(currencyTotalsMonthlyBase.keys()),
      ])
    )
      .map((currency) => ({
        currency,
        monthlyRaw: currencyTotalsMonthlyRaw.get(currency) || 0,
        monthlyBase: currencyTotalsMonthlyBase.get(currency) || 0,
      }))
      .sort((a, b) => b.monthlyBase - a.monthlyBase);

    const sortByNext = (a: SubscriptionDoc & { _daysToBill?: number }, b: SubscriptionDoc & { _daysToBill?: number }) => {
      const aa = toIsoDate(a.nextBillingDate) || "9999-12-31";
      const bb = toIsoDate(b.nextBillingDate) || "9999-12-31";
      return aa.localeCompare(bb);
    };

    const nextBills = active
      .filter((s) => !!toIsoDate(s.nextBillingDate))
      .slice()
      .sort(sortByNext)
      .slice(0, 1);

    return {
      mrrBase,
      arrBase: mrrBase * 12,
      activeCount: active.length,
      cancelledCount: cancelled.length,
      pausedCount: paused.length,
      dueSoonCount: dueSoonList.length,
      overdueCount: overdueList.length,
      churnedThisMonth,
      byCurrency,
      dueSoonRows: dueSoonList.sort(sortByNext).slice(0, 10),
      overdueRows: overdueList.sort(sortByNext).slice(0, 10),
      nextBillingIso: nextBills[0] ? toIsoDate(nextBills[0].nextBillingDate) : "",
    };
  }, [currencyFilter, currencyMeta.base, money, monthKey, query, renewalWindowDays, statusFilter, subscriptions, todayIso]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-5 py-5 text-white sm:px-8 sm:py-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 -bottom-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs text-white/70">Sales / Recurring</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Recurring Revenue Dashboard</h1>
            <div className="mt-2 text-sm text-white/70">
              Totals are calculated in <span className="font-medium text-white">{currencyMeta.base}</span> and displayed in{" "}
              <span className="font-medium text-white">{currencyMeta.display}</span> using your saved exchange rates.
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder="Search subscription, client, or #..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="sm:w-72 bg-white/10 text-white placeholder:text-white/50 border-white/15 focus-visible:ring-white/20"
            />
            <Button variant="secondary" onClick={reload} disabled={loading} className="bg-white/10 text-white hover:bg-white/15">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/15 bg-white/10 p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-white/70">MRR (normalized)</div>
              <CircleDollarSign className="h-4 w-4 text-white/60" />
            </div>
            <div className="mt-2 text-2xl font-semibold">{money.format(metrics.mrrBase)}</div>
            <div className="mt-1 text-xs text-white/60">Active: {metrics.activeCount} subscriptions</div>
          </div>

          <div className="rounded-xl border border-white/15 bg-white/10 p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-white/70">ARR (annualized)</div>
              <TrendingUp className="h-4 w-4 text-white/60" />
            </div>
            <div className="mt-2 text-2xl font-semibold">{money.format(metrics.arrBase)}</div>
            <div className="mt-1 text-xs text-white/60">Based on current MRR</div>
          </div>

          <div className="rounded-xl border border-white/15 bg-white/10 p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-white/70">Renewals window</div>
              <CalendarDays className="h-4 w-4 text-white/60" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <div className="text-2xl font-semibold">{metrics.dueSoonCount}</div>
              <div className="text-xs text-white/60">in next {Math.max(1, Number(renewalWindowDays) || 30)}d</div>
            </div>
            <div className="mt-1 text-xs text-white/60">Next billing: {metrics.nextBillingIso || "-"}</div>
          </div>

          <div className="rounded-xl border border-white/15 bg-white/10 p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-white/70">Overdue</div>
              <AlertTriangle className="h-4 w-4 text-white/60" />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="text-2xl font-semibold">{metrics.overdueCount}</div>
              {metrics.overdueCount > 0 ? <Badge variant="destructive">Needs follow-up</Badge> : <Badge variant="secondary">OK</Badge>}
            </div>
            <div className="mt-1 text-xs text-white/60">Paused: {metrics.pausedCount} | Cancelled: {metrics.cancelledCount}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Controls</CardTitle>
              <div className="mt-1 text-xs text-muted-foreground">Tight filters help avoid client amount mistakes.</div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused / Hold</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Currency" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All currencies</SelectItem>
                  {Array.from(currencyMeta.map.keys())
                    .sort((a, b) => a.localeCompare(b))
                    .map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <Select value={renewalWindowDays} onValueChange={setRenewalWindowDays}>
                <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Renewals window" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Next 7 days</SelectItem>
                  <SelectItem value="14">Next 14 days</SelectItem>
                  <SelectItem value="30">Next 30 days</SelectItem>
                  <SelectItem value="60">Next 60 days</SelectItem>
                  <SelectItem value="90">Next 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">Churned this month</div>
                  <Badge variant="secondary">{monthKey}</Badge>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="text-2xl font-semibold">{metrics.churnedThisMonth}</div>
                  {metrics.churnedThisMonth === 0 ? <Badge variant="secondary"><BadgeCheck className="mr-1 h-3 w-3" />Stable</Badge> : null}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Cancelled subscriptions in current month</div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">Display currency</div>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-2 text-2xl font-semibold">{currencyMeta.display}</div>
                <div className="mt-1 text-xs text-muted-foreground">Symbol: {money.symbol}</div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">Paused / Hold</div>
                  <PauseCircle className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-2 text-2xl font-semibold">{metrics.pausedCount}</div>
                <div className="mt-1 text-xs text-muted-foreground">Not included in MRR</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">MRR by Currency</CardTitle>
            <div className="mt-1 text-xs text-muted-foreground">Converted into {currencyMeta.display} for totals.</div>
          </CardHeader>
          <CardContent>
            {metrics.byCurrency.length === 0 ? (
              <div className="text-sm text-muted-foreground">No active subscriptions</div>
            ) : (
              <div className="space-y-2">
                {metrics.byCurrency.slice(0, 8).map((x) => (
                  <div key={x.currency} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{x.currency}</span>
                    <span className="font-medium">{money.format(x.monthlyBase)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Upcoming Renewals</CardTitle>
            <div className="text-xs text-muted-foreground">Today: {todayIso}</div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-28">ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="w-40">Next Billing</TableHead>
                    <TableHead className="w-28 text-right">In</TableHead>
                    <TableHead className="w-40 text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.dueSoonRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        {loading ? "Loading..." : `No renewals in the next ${Math.max(1, Number(renewalWindowDays) || 30)} days`}
                      </TableCell>
                    </TableRow>
                  ) : (
                    metrics.dueSoonRows.map((s: any) => {
                      const cur = String(s.currency || currencyMeta.base).trim() || currencyMeta.base;
                      const raw = Number(s.amount || 0) || 0;
                      const base = money.toBase(raw, cur);
                      return (
                        <TableRow key={s._id}>
                          <TableCell className="font-medium">{s.subscriptionNo ? `#${s.subscriptionNo}` : "-"}</TableCell>
                          <TableCell>{s.title || "-"}</TableCell>
                          <TableCell className="text-muted-foreground">{s.client || "-"}</TableCell>
                          <TableCell className="text-muted-foreground">{toIsoDate(s.nextBillingDate) || "-"}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">{typeof s._daysToBill === "number" ? `${s._daysToBill}d` : "-"}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="font-medium">{money.format(base)}</div>
                            <div className="text-xs text-muted-foreground">{cur} {new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(raw)}</div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Overdue Subscriptions</CardTitle>
            <Badge variant={metrics.overdueCount > 0 ? "destructive" : "secondary"}>
              {metrics.overdueCount > 0 ? "Action needed" : "None"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-28">ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="w-40">Next Billing</TableHead>
                    <TableHead className="w-28 text-right">In</TableHead>
                    <TableHead className="w-40 text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.overdueRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        {loading ? "Loading..." : "No overdue subscriptions"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    metrics.overdueRows.map((s: any) => {
                      const cur = String(s.currency || currencyMeta.base).trim() || currencyMeta.base;
                      const raw = Number(s.amount || 0) || 0;
                      const base = money.toBase(raw, cur);
                      return (
                        <TableRow key={s._id}>
                          <TableCell className="font-medium">{s.subscriptionNo ? `#${s.subscriptionNo}` : "-"}</TableCell>
                          <TableCell>{s.title || "-"}</TableCell>
                          <TableCell className="text-muted-foreground">{s.client || "-"}</TableCell>
                          <TableCell className="text-muted-foreground">{toIsoDate(s.nextBillingDate) || "-"}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="destructive">{typeof s._daysToBill === "number" ? `${s._daysToBill}d` : "-"}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="font-medium">{money.format(base)}</div>
                            <div className="text-xs text-muted-foreground">{cur} {new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(raw)}</div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

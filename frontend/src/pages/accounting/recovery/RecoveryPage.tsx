import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { BarChart3, RefreshCw } from "lucide-react";
import type { RecoveryCaseRow, UserPick } from "./types";
import { fetchRecoveryCases, fetchUsers } from "./api";
import { RecoveryDashboard, type RecoveryDashboardKpis } from "./RecoveryDashboard";
import { RecoveryFilters, type RecoveryFilterState } from "./RecoveryFilters";
import { RecoveryRegisterTable } from "./RecoveryRegisterTable";
import { RecoveryCaseDrawer } from "./RecoveryCaseDrawer";

export default function RecoveryPage() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<RecoveryCaseRow[]>([]);
  const [owners, setOwners] = useState<UserPick[]>([]);

  const [filters, setFilters] = useState<RecoveryFilterState>({
    q: "",
    status: "all",
    ownerUserId: "",
    overdueOnly: false,
    nextFollowUpFrom: "",
    nextFollowUpTo: "",
  });

  const [openCase, setOpenCase] = useState(false);
  const [openInvoiceId, setOpenInvoiceId] = useState("");

  const loadOwners = async () => {
    try {
      const u = await fetchUsers();
      setOwners(u);
    } catch (e: any) {
      toast.error(String(e?.message || "Failed to load users"));
    }
  };

  const load = async (overrides?: Partial<RecoveryFilterState>) => {
    try {
      setLoading(true);
      const f = { ...filters, ...(overrides || {}) };
      const data = await fetchRecoveryCases({
        q: f.q,
        status: f.status,
        ownerUserId: f.ownerUserId,
        overdueOnly: f.overdueOnly,
        nextFollowUpFrom: f.nextFollowUpFrom,
        nextFollowUpTo: f.nextFollowUpTo,
        limit: 300,
      });
      setRows(data);
    } catch (e: any) {
      toast.error(String(e?.message || "Failed to load"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOwners();
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ownerById = useMemo(() => new Map(owners.map((o) => [String(o._id), o])), [owners]);
  const ownerOptions = useMemo(
    () => owners.map((o) => ({ id: String(o._id), label: String(o.name || o.email || o._id) })),
    [owners]
  );

  const kpis = useMemo((): RecoveryDashboardKpis => {
    const totalInvoiced = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
    const totalReceived = rows.reduce((s, r) => s + Number(r.received || 0), 0);
    const totalOutstanding = rows.reduce((s, r) => s + Number(r.outstanding || 0), 0);
    const overdueOutstanding = rows.filter((r) => r.overdue).reduce((s, r) => s + Number(r.outstanding || 0), 0);

    const now = new Date();
    const inDays = (d?: string | null) => {
      if (!d) return null;
      const dt = new Date(d);
      if (Number.isNaN(dt.getTime())) return null;
      return Math.floor((dt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    };

    const dueIn7 = rows
      .filter((r) => !r.overdue)
      .filter((r) => {
        const dd = inDays(r.dueDate);
        return dd != null && dd >= 0 && dd <= 7;
      })
      .reduce((s, r) => s + Number(r.outstanding || 0), 0);

    const dueIn30 = rows
      .filter((r) => !r.overdue)
      .filter((r) => {
        const dd = inDays(r.dueDate);
        return dd != null && dd >= 0 && dd <= 30;
      })
      .reduce((s, r) => s + Number(r.outstanding || 0), 0);

    const collectionRate = totalInvoiced > 0 ? (totalReceived / totalInvoiced) * 100 : 0;

    const todayKey = now.toISOString().slice(0, 10);
    const followUpsDueToday = rows.filter((r) => String(r.recovery?.nextFollowUpAt || "").slice(0, 10) === todayKey).length;

    return {
      totalInvoiced,
      totalReceived,
      totalOutstanding,
      overdueOutstanding,
      dueIn7,
      dueIn30,
      collectionRate,
      invoiceCount: rows.length,
      followUpsDueToday,
    };
  }, [rows]);

  const openRow = (invoiceId: string) => {
    setOpenInvoiceId(invoiceId);
    setOpenCase(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
      <div className="relative overflow-hidden bg-[#0a0a0a] px-6 py-16 sm:px-12 lg:px-20">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 via-purple-600/20 to-pink-600/30" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />

        <div className="relative max-w-[1600px] mx-auto">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="group rounded-3xl bg-white/10 p-5 backdrop-blur-2xl border border-white/20 shadow-[0_0_50px_-12px_rgba(255,255,255,0.2)] transition-transform hover:scale-110 duration-500">
                  <BarChart3 className="h-12 w-12 text-white group-hover:rotate-12 transition-transform" />
                </div>
                <div>
                  <h1 className="text-5xl font-black tracking-tight text-white sm:text-7xl">
                    Recovery <span className="text-indigo-400">Ops</span>
                  </h1>
                  <p className="mt-3 text-xl text-white/60 font-medium max-w-xl leading-relaxed">
                    Payment recovery management for invoices and milestone-based projects.
                  </p>
                </div>
              </div>

              <RecoveryDashboard
                kpis={kpis}
                onQuickFilter={(mode) => {
                  if (mode === "overdue") {
                    const next = { ...filters, status: "Overdue", overdueOnly: true };
                    setFilters(next);
                    void load(next);
                    return;
                  }
                  if (mode === "due7") {
                    const next = { ...filters, overdueOnly: false, status: "all" };
                    setFilters(next);
                    void load(next);
                    return;
                  }
                  if (mode === "due30") {
                    const next = { ...filters, overdueOnly: false, status: "all" };
                    setFilters(next);
                    void load(next);
                    return;
                  }
                  const next = { ...filters, overdueOnly: false, status: "all" };
                  setFilters(next);
                  void load(next);
                }}
              />
            </div>

            <div className="flex flex-wrap gap-4 lg:mb-2">
              <Button
                onClick={() => load()}
                variant="outline"
                size="lg"
                disabled={loading}
                className="bg-white/5 text-white border-white/10 hover:bg-white/10 backdrop-blur-md border-2 px-8 h-14 font-black tracking-wide rounded-2xl"
              >
                <RefreshCw className={cn("w-5 h-5 mr-3", loading && "animate-spin")} />
                REFRESH
              </Button>
              <Button asChild size="lg" className="bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_20px_50px_rgba(79,70,229,0.4)] px-10 h-14 font-black tracking-wide rounded-2xl border-0">
                <Link to="/invoices">VIEW INVOICES</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-8 sm:px-12 lg:px-16 space-y-8">
        <RecoveryFilters
          value={filters}
          ownerOptions={ownerOptions}
          loading={loading}
          onChange={setFilters}
          onApply={() => load()}
          onClear={() => {
            const next: RecoveryFilterState = { q: "", status: "all", ownerUserId: "", overdueOnly: false, nextFollowUpFrom: "", nextFollowUpTo: "" };
            setFilters(next);
            void load(next);
          }}
        />

        <RecoveryRegisterTable rows={rows} loading={loading} onOpen={openRow} ownerById={ownerById} />

        <RecoveryCaseDrawer
          open={openCase}
          invoiceId={openInvoiceId}
          onOpenChange={(o) => setOpenCase(o)}
          owners={owners}
          onChanged={() => load()}
        />
      </div>
    </div>
  );
}

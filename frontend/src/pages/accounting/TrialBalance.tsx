import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useSettings } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { 
  Scale, 
  RefreshCw, 
  Printer,
  Search,
  CheckCircle,
  AlertCircle,
  Activity,
  Zap,
  FileText,
  Building2,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

export default function TrialBalance() {
  const { settings } = useSettings();
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [basis, setBasis] = useState<"accrual" | "cash">("accrual");
  const [rows, setRows] = useState<any[]>([]);
  const [totals, setTotals] = useState<{debit:number;credit:number;balanced:boolean}>({debit:0,credit:0,balanced:true});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    load();
  }, [from, to, basis]);

  const load = async () => {
    setBusy(true);
    try {
      const sp = new URLSearchParams();
      if (from) sp.set("from", from);
      if (to) sp.set("to", to);
      if (basis) sp.set("basis", basis);
      const res = await fetch(`${API_BASE}/api/reports/trial-balance?${sp.toString()}` , { headers: { ...getAuthHeaders() } });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed");
      setRows(Array.isArray(json?.rows) ? json.rows : []);
      setTotals({ debit: Number(json?.totalDebit||0), credit: Number(json?.totalCredit||0), balanced: Boolean(json?.balanced) });
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  };

  const rowIndent = (level: number) => ({ paddingLeft: `${12 + Math.max(0, level) * 24}px` });

  const printReport = () => {
    const win = window.open("", "_blank");
    if (!win) return;

    const fromLabel = from || "--";
    const toLabel = to || "--";

    const companyName = settings.general?.companyName || "Mind Spire ERP";
    const logoUrl = settings.general?.logoUrl 
      ? (settings.general.logoUrl.startsWith('http') ? settings.general.logoUrl : `${API_BASE}${settings.general.logoUrl}`)
      : null;

    const rowsHtml = rows.map(r => `
      <tr class="${r.hasChildren ? 'parent-row' : ''}">
        <td style="padding-left: ${12 + (Number(r.level || 0) * 20)}px">
          <span class="code">${r.accountCode}</span>
          <span class="name">${r.accountName}</span>
        </td>
        <td>${String(r.type || "").toUpperCase()}</td>
        <td class="num">${Number(r.openingDebit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        <td class="num">${Number(r.openingCredit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        <td class="num">${Number(r.debit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        <td class="num">${Number(r.credit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join("");

    const html = `
      <html>
        <head>
          <title>Trial Balance - ${companyName}</title>
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
            
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f8fafc; text-align: left; padding: 12px 8px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 1px solid #e2e8f0; }
            td { padding: 10px 8px; font-size: 11px; border-bottom: 1px solid #f1f5f9; color: #334155; }
            .num { text-align: right; font-family: 'Courier New', monospace; font-weight: 600; }
            .parent-row { background: #f8fafc; font-weight: 700; }
            .parent-row td { color: #0f172a; border-bottom: 1px solid #e2e8f0; }
            .code { color: #6366f1; font-weight: 700; margin-right: 8px; }
            
            .totals { margin-top: 30px; border-top: 2px solid #0f172a; }
            .totals-row { display: flex; justify-content: flex-end; padding: 15px 0; gap: 40px; }
            .total-item { text-align: right; }
            .total-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
            .total-val { font-size: 18px; font-weight: 800; color: #0f172a; }
            
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
              <h1>Trial Balance</h1>
              <div class="meta">PERIOD: ${fromLabel} TO ${toLabel} | BASIS: ${basis.toUpperCase()}</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 40%">Account Registry</th>
                <th style="width: 10%">Taxonomy</th>
                <th style="width: 12.5%; text-align: right">Open (Dr)</th>
                <th style="width: 12.5%; text-align: right">Open (Cr)</th>
                <th style="width: 12.5%; text-align: right">Debit</th>
                <th style="width: 12.5%; text-align: right">Credit</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="totals-row">
              <div class="total-item">
                <div class="total-label">Total Debit Accumulation</div>
                <div class="total-val">PKR ${totals.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
              <div class="total-item">
                <div class="total-label">Total Credit Accumulation</div>
                <div class="total-val">PKR ${totals.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          </div>
          
          <div class="footer">
            Corporate Audit Registry • Mind Spire Financial Core 2.0 • Generated on ${new Date().toLocaleString()}
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="p-6 space-y-8 min-h-screen bg-slate-50 text-slate-900">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-100 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-100 blur-[120px]" />
      </div>

      {/* Corporate Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative group overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-xl"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-transparent group-hover:opacity-100 transition-opacity duration-1000 opacity-50" />
        <div className="relative p-8 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-100 rounded-[1.5rem] border border-indigo-200 shadow-sm">
              <Scale className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight uppercase leading-none">
                Trial <span className="text-indigo-600">Balance</span>
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px] font-bold uppercase tracking-widest px-3 py-1">Registry Equilibrium</Badge>
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-bold uppercase tracking-widest px-3 py-1">Corporate Audit Trail</Badge>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <Button 
              variant="outline" 
              onClick={printReport}
              disabled={rows.length === 0}
              className="rounded-[1.5rem] bg-white border-slate-200 text-slate-700 hover:bg-slate-50 h-14 px-8 font-bold tracking-widest transition-all duration-300 text-xs"
            >
              <Printer className="w-4 h-4 mr-3" />
              PRINT REPORT
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Control Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="shadow-2xl bg-white rounded-[3rem] border border-slate-200 overflow-hidden relative">
          <div className="bg-slate-900 p-8 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-indigo-500 rounded-xl">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white uppercase tracking-tight">Parameters</h2>
                <p className="text-indigo-400 text-[9px] font-bold uppercase tracking-[0.3em] mt-1">Operational Calibration</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={cn(
                "h-10 px-4 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all",
                totals.balanced ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
              )}>
                {totals.balanced ? <><CheckCircle className="w-3.5 h-3.5 mr-2" />System Balanced</> : <><AlertCircle className="w-3.5 h-3.5 mr-2" />Equilibrium Void</>}
              </Badge>
            </div>
          </div>

          <CardContent className="p-8 sm:p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 items-end">
              <div className="lg:col-span-3 space-y-3">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Accounting Basis</Label>
                <Select value={basis} onValueChange={(v: any) => setBasis(v)}>
                  <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-slate-50/50 focus:ring-indigo-500 font-bold uppercase text-[10px] tracking-widest text-slate-900 shadow-sm transition-all hover:bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 rounded-2xl shadow-xl">
                    <SelectItem value="accrual" className="py-3 uppercase font-bold text-[10px] tracking-widest">Accrual Protocol</SelectItem>
                    <SelectItem value="cash" className="py-3 uppercase font-bold text-[10px] tracking-widest">Cash Protocol</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="lg:col-span-3 space-y-3">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Effective From</Label>
                <DatePicker 
                  value={from} 
                  onChange={setFrom} 
                  className="h-14 rounded-2xl border-slate-200 bg-slate-50/50 hover:bg-white font-bold font-mono text-sm shadow-sm w-full"
                />
              </div>
              
              <div className="lg:col-span-3 space-y-3">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Effective To</Label>
                <DatePicker 
                  value={to} 
                  onChange={setTo} 
                  className="h-14 rounded-2xl border-slate-200 bg-slate-50/50 hover:bg-white font-bold font-mono text-sm shadow-sm w-full"
                />
              </div>

              <div className="lg:col-span-3">
                <div className="flex gap-4 items-center bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-inner h-14">
                  <div className="flex-1 text-center">
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Total Inflow (Dr)</p>
                    <p className="text-sm font-bold tabular-nums text-indigo-600">{totals.debit.toLocaleString()}</p>
                  </div>
                  <Separator orientation="vertical" className="h-8" />
                  <div className="flex-1 text-center">
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Total Outflow (Cr)</p>
                    <p className="text-sm font-bold tabular-nums text-rose-600">{totals.credit.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Results Table */}
      <AnimatePresence mode="wait">
        {rows.length > 0 ? (
          <motion.div
            key="results"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <Card className="shadow-2xl bg-white rounded-[3.5rem] border border-slate-200 overflow-hidden relative p-2">
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-y-2">
                  <thead>
                    <tr>
                      <th className="py-6 px-8 text-left text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Account Registry</th>
                      <th className="py-6 px-6 text-left text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Taxonomy</th>
                      <th className="py-6 px-6 text-right text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Open (Dr)</th>
                      <th className="py-6 px-6 text-right text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Open (Cr)</th>
                      <th className="py-6 px-6 text-right text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Debit</th>
                      <th className="py-6 px-8 text-right text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className={cn(
                        "group transition-all duration-300 rounded-[2rem] overflow-hidden",
                        r.hasChildren ? "bg-slate-50/80 hover:bg-slate-100" : "hover:bg-indigo-50/30"
                      )}>
                        <td className="py-6 px-8 border-0" style={rowIndent(Number(r.level || 0))}>
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              r.hasChildren ? "bg-indigo-500" : "bg-slate-300"
                            )} />
                            <span className={cn(
                              "tracking-tight",
                              r.hasChildren ? "font-black text-slate-900 uppercase text-sm" : "font-bold text-slate-600 text-xs"
                            )}>
                              <span className="text-indigo-600/50 mr-2 font-mono">{r.accountCode}</span>
                              {r.accountName}
                            </span>
                          </div>
                        </td>
                        <td className="py-6 px-6 border-0">
                          <Badge variant="outline" className="bg-white text-[9px] font-bold uppercase tracking-widest text-slate-400 border-slate-200">
                            {r.type}
                          </Badge>
                        </td>
                        <td className="py-6 px-6 text-right font-mono text-xs font-bold text-slate-400 border-0">
                          {Number(r.openingDebit || 0) > 0 ? Number(r.openingDebit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}
                        </td>
                        <td className="py-6 px-6 text-right font-mono text-xs font-bold text-slate-400 border-0">
                          {Number(r.openingCredit || 0) > 0 ? Number(r.openingCredit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}
                        </td>
                        <td className="py-6 px-6 text-right border-0">
                          {Number(r.debit || 0) > 0 ? (
                            <span className="font-bold text-lg tabular-nums tracking-tighter text-indigo-600">
                              {Number(r.debit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          ) : <span className="opacity-10 text-slate-300 font-mono">-</span>}
                        </td>
                        <td className="py-6 px-8 text-right border-0">
                          {Number(r.credit || 0) > 0 ? (
                            <span className="font-bold text-lg tabular-nums tracking-tighter text-rose-600">
                              {Number(r.credit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          ) : <span className="opacity-10 text-slate-300 font-mono">-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} className="py-10 px-8 text-right font-bold uppercase tracking-[0.4em] text-slate-400 text-xs">Registry Accumulation</td>
                      <td className="py-10 px-6 text-right font-bold text-2xl tabular-nums tracking-tighter text-indigo-600">
                        {totals.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-10 px-8 text-right font-bold text-2xl tabular-nums tracking-tighter text-rose-600">
                        {totals.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-40 space-y-8 opacity-20"
          >
            <div className="p-10 rounded-[3rem] bg-slate-200 border-4 border-dashed border-slate-300">
              <FileText className="w-32 h-32 text-slate-400" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-2xl font-bold uppercase tracking-[0.5em] text-slate-900">Registry Void</p>
              <p className="font-bold text-sm uppercase tracking-widest text-slate-400">Sync with ledger to generate trial balance</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

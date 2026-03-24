import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useSettings } from "@/hooks/useSettings";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  ChevronsUpDown, 
  Check, 
  X,
  Search, 
  Download, 
  Printer,
  RefreshCw,
  Activity,
  ArrowRightLeft,
  Calendar,
  Wallet,
  Zap,
  FileText,
  Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { toast } from "@/components/ui/sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function VendorLedger() {
  const { settings } = useSettings();
  const [vendorId, setVendorId] = useState("");
  const [vendors, setVendors] = useState<any[]>([]);
  const [from, setFrom] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [to, setTo] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  });
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [vendorOpen, setVendorOpen] = useState(false);

  const totals = useMemo(() => {
    return rows.reduce((acc, r) => {
      acc.debit += Number(r.debit || 0);
      acc.credit += Number(r.credit || 0);
      return acc;
    }, { debit: 0, credit: 0 });
  }, [rows]);

  const load = async () => {
    if (!vendorId) {
      toast.error("Vendor ID is required");
      return;
    }
    setBusy(true);
    try {
      const sp = new URLSearchParams();
      if (from) sp.set("from", from);
      if (to) sp.set("to", to);
      sp.set("entityType", "vendor");
      sp.set("entityId", vendorId);
      const res = await fetch(`${API_BASE}/api/ledgers/entity?${sp.toString()}`, {
        headers: { ...getAuthHeaders() },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load ledger");
      setRows(Array.isArray(json?.rows) ? json.rows : []);
      toast.success("Vendor ledger loaded");
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (vendorId) {
      load();
    }
  }, [vendorId, from, to]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/vendors`, {
          headers: { ...getAuthHeaders() },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load vendors");
        setVendors(Array.isArray(json) ? json : []);
      } catch (e: any) {
        toast.error(e?.message || "Failed to load vendors");
      }
    })();
  }, []);

  const exportCsv = () => {
    const header = ["Date", "Account", "Memo", "Debit", "Credit", "Balance"];
    const lines = rows.map((r: any) => [
      String(r.date).slice(0, 10),
      r.accountCode || "",
      (r.memo || "").replace(/\n|\r/g, " "),
      Number(r.debit || 0).toFixed(2),
      Number(r.credit || 0).toFixed(2),
      Number(r.balance || 0).toFixed(2),
    ]);
    const csv = [
      header,
      ...lines,
    ].map((cols) =>
      cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
    ).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vendor_ledger_${vendorId || "unknown"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPdf = () => {
    const win = window.open("", "_blank");
    if (!win) return;

    const companyName = settings.general?.companyName || "Mind Spire ERP";
    const logoUrl = settings.general?.logoUrl 
      ? (settings.general.logoUrl.startsWith('http') ? settings.general.logoUrl : `${API_BASE}${settings.general.logoUrl}`)
      : null;

    const fromLabel = from || "--";
    const toLabel = to || "--";
    const vendorName = vendors.find(v => v._id === vendorId)?.name || vendors.find(v => v._id === vendorId)?.company || "Unknown Vendor";

    const rowsHtml = rows.map(r => `
      <tr>
        <td>${String(r.date).slice(0, 10)}</td>
        <td style="font-family: monospace; font-size: 10px;">${r.accountCode || ""}</td>
        <td>${r.memo || ""}</td>
        <td class="num">${Number(r.debit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        <td class="num">${Number(r.credit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        <td class="num" style="font-weight: 700;">${Number(r.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join("");

    const html = `
      <html>
        <head>
          <title>Vendor Ledger - ${companyName}</title>
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
            
            .info-box { background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 30px; }
            .info-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
            .info-value { font-size: 16px; font-weight: 800; color: #0f172a; }

            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f8fafc; text-align: left; padding: 12px 8px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 1px solid #e2e8f0; }
            td { padding: 12px 8px; font-size: 11px; border-bottom: 1px solid #f1f5f9; color: #334155; }
            .num { text-align: right; font-family: 'Courier New', monospace; font-weight: 600; }
            
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
              <h1>Vendor Ledger</h1>
              <div class="meta">RANGE: ${fromLabel} → ${toLabel}</div>
            </div>
          </div>

          <div class="info-box">
            <div class="info-label">Vendor Entity</div>
            <div class="info-value">${vendorName}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 12%">Date</th>
                <th style="width: 15%">Account</th>
                <th style="width: 33%">Operational Memo</th>
                <th style="width: 13%; text-align: right">Inflow (Dr)</th>
                <th style="width: 13%; text-align: right">Outflow (Cr)</th>
                <th style="width: 14%; text-align: right">Balance</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="totals-row">
              <div class="total-item">
                <div class="total-label">Closing Accumulation</div>
                <div class="total-val">PKR ${Number(rows[rows.length - 1]?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          </div>
          
          <div class="footer">
            Corporate Payable Audit • Mind Spire Financial Core 2.0 • Generated on ${new Date().toLocaleString()}
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  const downloadStatementPdf = () => {
    if (!vendorId) {
      toast.error("Select a vendor first");
      return;
    }
    const sp = new URLSearchParams();
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    const url = `${API_BASE}/api/statements/vendor/${vendorId}?${sp.toString()}`;
    window.open(url, "_blank");
  };

  return (
    <div className="p-6 space-y-8 min-h-screen bg-slate-50 text-slate-900 font-sans">
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
              <Building2 className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight uppercase leading-none">
                Vendor <span className="text-indigo-600">Ledger</span>
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px] font-bold uppercase tracking-widest px-3 py-1">Payable Registry</Badge>
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-bold uppercase tracking-widest px-3 py-1">Corporate Audit Feed</Badge>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <Button 
              variant="outline" 
              onClick={printPdf}
              disabled={rows.length === 0}
              className="rounded-[1.5rem] bg-white border-slate-200 text-slate-700 hover:bg-slate-50 h-14 px-8 font-bold tracking-widest transition-all duration-300 text-xs"
            >
              <Printer className="w-4 h-4 mr-3" />
              PRINT REPORT
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Filters Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="shadow-2xl bg-white rounded-[3rem] border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 p-8 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-indigo-500 rounded-xl">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white uppercase tracking-tight">Parameters</h2>
                <p className="text-indigo-400 text-[9px] font-bold uppercase tracking-[0.3em] mt-1">Entity Selection Protocol</p>
              </div>
            </div>
            {vendorId && (
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                  {vendors.find(v => v._id === vendorId)?.name || vendors.find(v => v._id === vendorId)?.company}
                </span>
              </div>
            )}
          </div>

          <CardContent className="p-8 sm:p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 items-end">
              <div className="lg:col-span-4 space-y-3">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Select Vendor</Label>
                <Popover open={vendorOpen} onOpenChange={setVendorOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-14 w-full rounded-2xl border-slate-200 bg-slate-50/50 hover:bg-white font-bold text-sm text-slate-900 shadow-sm transition-all justify-between px-6"
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        <span className="uppercase tracking-tight truncate">
                          {vendorId ? (vendors.find(v => v._id === vendorId)?.name || vendors.find(v => v._id === vendorId)?.company) : "Select Vendor..."}
                        </span>
                      </div>
                      <ChevronsUpDown className="w-4 h-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0 shadow-2xl border-slate-200 rounded-2xl overflow-hidden" align="start">
                    <Command>
                      <CommandInput placeholder="Search entity..." className="h-12 border-none focus:ring-0" />
                      <CommandList className="max-h-[300px]">
                        <CommandEmpty>No entity found.</CommandEmpty>
                        <CommandGroup>
                          {vendors.map(v => {
                            const label = v.name || v.company || "Unnamed";
                            return (
                              <CommandItem
                                key={v._id}
                                value={label}
                                onSelect={() => {
                                  setVendorId(v._id);
                                  setVendorOpen(false);
                                }}
                                className="py-3 px-4 cursor-pointer hover:bg-indigo-50"
                              >
                                <div className="flex items-center w-full gap-3">
                                  <Check className={cn("h-4 w-4 text-indigo-600", vendorId === v._id ? "opacity-100" : "opacity-0")} />
                                  <span className="font-bold text-slate-700 uppercase tracking-tight truncate">{label}</span>
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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

              <div className="lg:col-span-2">
                <Button 
                  variant="outline" 
                  onClick={() => { setVendorId(""); setFrom(""); setTo(""); setRows([]); }}
                  className="h-14 w-full rounded-2xl border-slate-200 bg-white text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 font-bold uppercase tracking-widest text-[10px] transition-all"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  RESET
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Ledger Entries Card */}
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
                      <th className="py-6 px-8 text-left text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Date</th>
                      <th className="py-6 px-6 text-left text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Registry</th>
                      <th className="py-6 px-6 text-left text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Operational Narrative</th>
                      <th className="py-6 px-6 text-right text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Inflow (Dr)</th>
                      <th className="py-6 px-6 text-right text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Outflow (Cr)</th>
                      <th className="py-6 px-10 text-right text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Balance Registry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="group transition-all duration-300 rounded-[2rem] overflow-hidden hover:bg-slate-50 bg-slate-50/30">
                        <td className="py-7 px-8 font-bold text-slate-500 tabular-nums text-sm border-0">
                          {new Date(r.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })}
                        </td>
                        <td className="py-7 px-6 font-mono text-xs font-bold text-indigo-600 tracking-wider border-0 uppercase">
                          {r.accountCode || "SYSTEM"}
                        </td>
                        <td className="py-7 px-6 max-w-[400px] border-0">
                          <p className="font-bold text-slate-700 uppercase tracking-tight text-sm truncate">{r.memo || "NO_NARRATIVE"}</p>
                        </td>
                        <td className="py-7 px-6 text-right border-0">
                          {r.debit > 0 ? (
                            <span className="font-bold text-xl tabular-nums tracking-tighter text-indigo-600">
                              {Number(r.debit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          ) : <span className="opacity-10 text-slate-300 font-mono">-</span>}
                        </td>
                        <td className="py-7 px-6 text-right border-0">
                          {r.credit > 0 ? (
                            <span className="font-bold text-xl tabular-nums tracking-tighter text-rose-600">
                              {Number(r.credit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          ) : <span className="opacity-10 text-slate-300 font-mono">-</span>}
                        </td>
                        <td className="py-7 px-10 text-right border-0">
                          <div className="flex flex-col items-end px-4 py-2 rounded-2xl bg-white border border-slate-100 shadow-sm">
                            <span className={cn(
                              "font-bold text-2xl tabular-nums tracking-tighter leading-none",
                              r.balance < 0 ? "text-rose-600" : "text-slate-900"
                            )}>
                              {Number(r.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1.5">PKR VALUE</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="py-10 px-8 text-right font-bold uppercase tracking-[0.4em] text-slate-400 text-xs">Closing Accumulation</td>
                      <td className="py-10 px-6 text-right font-bold text-2xl tabular-nums tracking-tighter text-indigo-600">
                        {totals.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-10 px-6 text-right font-bold text-2xl tabular-nums tracking-tighter text-rose-600">
                        {totals.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-10 px-10 text-right">
                        <Badge className="h-12 px-6 rounded-2xl bg-slate-900 text-white font-bold text-2xl tracking-tighter tabular-nums border-0 shadow-xl">
                          {Number(rows[rows.length - 1]?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </Badge>
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
              <p className="font-bold text-sm uppercase tracking-widest text-slate-400">Select parameters to generate data feed</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

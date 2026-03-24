import { useSettings } from "@/hooks/useSettings";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Printer, 
  Trash2, 
  Calendar, 
  Receipt, 
  Wallet, 
  Building2, 
  User, 
  FileText,
  Activity,
  ShieldCheck,
  RefreshCw,
  Clock,
  History
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function ExpenseDetail() {
  const { settings } = useSettings();
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [expense, setExpense] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const loadExpense = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/expenses/${id}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setExpense(await res.json());
      } else {
        toast({ title: "Error", description: "Failed to load expense details", variant: "destructive" });
        navigate("/sales/expenses");
      }
    } catch (error) {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpense();
  }, [id]);

  const handlePost = async () => {
    if (!expense || expense.status === "posted") return;
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/expenses/${id}/post`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        toast({ title: "Success", description: "Expense has been posted to ledger" });
        loadExpense();
      } else {
        const err = await res.json();
        throw new Error(err.error || "Failed to post");
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = () => {
    const win = window.open("", "_blank");
    if (!win || !expense) return;

    const companyName = settings.general?.companyName || "Mind Spire ERP";
    const logoUrl = settings.general?.logoUrl 
      ? (settings.general.logoUrl.startsWith('http') ? settings.general.logoUrl : `${API_BASE}${settings.general.logoUrl}`)
      : null;

    const html = `
      <html>
        <head>
          <title>Expense Voucher - ${companyName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #0f172a; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; }
            .brand-container { display: flex; align-items: center; gap: 15px; }
            .brand-logo { height: 50px; width: auto; object-fit: contain; }
            .brand-name { color: #10b981; font-weight: 800; font-size: 24px; letter-spacing: -0.025em; text-transform: uppercase; }
            .report-title { text-align: right; }
            .report-title h1 { margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 0.1em; color: #1e293b; }
            .meta { font-size: 11px; color: #64748b; margin-top: 4px; font-weight: 600; }
            
            .info-grid { display: grid; grid-template-cols: 1fr 1fr 1fr; gap: 20px; margin-bottom: 40px; }
            .info-box { background: #f8fafc; padding: 20px; border-radius: 16px; border: 1px solid #e2e8f0; }
            .info-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
            .info-value { font-size: 14px; font-weight: 700; color: #0f172a; }

            .narrative-box { background: #f8fafc; padding: 24px; border-radius: 20px; border: 1px solid #e2e8f0; margin-bottom: 40px; }
            .narrative-title { font-size: 18px; font-weight: 800; text-transform: uppercase; color: #0f172a; margin-bottom: 8px; }
            .narrative-desc { font-size: 13px; color: #64748b; font-style: italic; }

            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f8fafc; text-align: left; padding: 12px 8px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 1px solid #e2e8f0; }
            td { padding: 16px 8px; font-size: 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
            .num { text-align: right; font-family: 'Courier New', monospace; font-weight: 700; font-size: 14px; }
            
            .totals { margin-top: 30px; border-top: 2px solid #10b981; }
            .totals-row { display: flex; justify-content: flex-end; padding: 15px 0; gap: 40px; }
            .total-item { text-align: right; }
            .total-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
            .total-val { font-size: 24px; font-weight: 800; color: #059669; }
            
            .footer { margin-top: 80px; display: flex; justify-content: space-between; border-top: 1px solid #f1f5f9; padding-top: 40px; }
            .sig-box { width: 200px; text-align: center; border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }
            
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
              <h1>Expense Voucher</h1>
              <div class="meta">VCH: ${expense.voucherId?.voucherNo || "DRAFT"} | STATUS: ${expense.status.toUpperCase()}</div>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-box">
              <div class="info-label">Effective Date</div>
              <div class="info-value">${new Date(expense.date).toLocaleDateString()}</div>
            </div>
            <div class="info-box">
              <div class="info-label">Payment Route</div>
              <div class="info-value">${expense.paymentMethod.toUpperCase()}</div>
            </div>
            <div class="info-box">
              <div class="info-label">Category</div>
              <div class="info-value">${expense.category || "General"}</div>
            </div>
          </div>

          <div class="narrative-box">
            <div class="narrative-title">${expense.title}</div>
            <div class="narrative-desc">${expense.description || "No operational context provided."}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 50%">Registry Distribution</th>
                <th style="width: 25%">Entity Association</th>
                <th style="width: 25%; text-align: right">Amount (PKR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div style="font-weight: 700; color: #10b981;">${expense.accountId?.code || "UNLINKED"}</div>
                  <div style="font-size: 11px; color: #64748b;">${expense.accountId?.name || "Pending Account Mapping"}</div>
                </td>
                <td style="font-weight: 600;">
                  ${expense.vendorId?.name || expense.employeeId?.name || "General Disbursement"}
                </td>
                <td class="num">${Number(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              ${(Number(expense.tax) > 0 || Number(expense.tax2) > 0) ? `
              <tr>
                <td>Allocated Tax Registry</td>
                <td>--</td>
                <td class="num">${(Number(expense.tax) + Number(expense.tax2)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>` : ""}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="totals-row">
              <div class="total-item">
                <div class="total-label">Final Disbursement Magnitude</div>
                <div class="total-val">PKR ${(Number(expense.amount) + Number(expense.tax) + Number(expense.tax2)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <div class="sig-box">Prepared By</div>
            <div class="sig-box">Verified By</div>
            <div class="sig-box">Authorized Signature</div>
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!expense) return null;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 font-sans print:bg-white print:pb-0">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Header Controls */}
        <div className="flex items-center justify-between print:hidden">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/sales/expenses")}
            className="rounded-xl hover:bg-white border border-transparent hover:border-slate-200 transition-all"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Ledger
          </Button>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handlePrint} className="rounded-xl bg-white shadow-sm border-slate-200">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            {expense.status === "draft" && (
              <Button onClick={handlePost} disabled={busy} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-100 border-0">
                {busy ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                Post to Ledger
              </Button>
            )}
          </div>
        </div>

        {/* Main Document */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-0 shadow-2xl rounded-[2.5rem] overflow-hidden bg-white ring-1 ring-slate-200 print:shadow-none print:ring-0">
            <div className="bg-slate-900 p-10 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/20">
                  <Receipt className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white uppercase tracking-tight">Expense Voucher</h1>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] mt-1.5">Disbursement Protocol Details</p>
                </div>
              </div>
              <div className="text-right">
                <Badge className={cn(
                  "px-4 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all",
                  expense.status === "posted" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                )}>
                  {expense.status}
                </Badge>
              </div>
            </div>

            <CardContent className="p-10 space-y-12">
              {/* Primary Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Calendar className="w-3 h-3" /> Effective Date
                  </p>
                  <p className="text-lg font-bold text-slate-900 tabular-nums">
                    {new Date(expense.date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Activity className="w-3 h-3" /> Registry Category
                  </p>
                  <p className="text-lg font-bold text-slate-900 uppercase tracking-tight">
                    {expense.category || "General"}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Wallet className="w-3 h-3" /> Payment Route
                  </p>
                  <p className="text-lg font-bold text-emerald-600 uppercase tracking-tight">
                    {expense.paymentMethod === 'cash' ? 'Petty Cash' : expense.paymentMethod === 'bank' ? 'Bank Transfer' : 'Accounts Payable'}
                  </p>
                </div>
              </div>

              <Separator className="bg-slate-100" />

              {/* Narrative Section */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Transaction Title</p>
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight leading-none uppercase">{expense.title}</h2>
                </div>
                {expense.description && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Operational Context</p>
                    <p className="text-slate-600 leading-relaxed font-medium bg-slate-50/50 p-6 rounded-2xl border border-slate-100 italic">
                      "{expense.description}"
                    </p>
                  </div>
                )}
              </div>

              {/* Entity Links */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-slate-50/80 rounded-3xl p-8 border border-slate-100 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-xl">
                      <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-600">Accounting Link</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold uppercase text-slate-400">Linked Account</p>
                    <p className="text-xl font-bold text-slate-900 uppercase">
                      {expense.accountId?.name || "Unlinked Registry"}
                    </p>
                    <p className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 w-fit px-2 py-0.5 rounded border border-indigo-100">
                      {expense.accountId?.code || "NO_CODE"}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50/80 rounded-3xl p-8 border border-slate-100 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-xl">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">Entity Association</span>
                  </div>
                  <div className="space-y-4">
                    {expense.vendorId && (
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-bold uppercase text-slate-400">Vendor</p>
                        <p className="text-lg font-bold text-slate-900 uppercase">{expense.vendorId.name}</p>
                      </div>
                    )}
                    {expense.employeeId && (
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-bold uppercase text-slate-400">Employee</p>
                        <p className="text-lg font-bold text-slate-900 uppercase">{expense.employeeId.name}</p>
                      </div>
                    )}
                    {!expense.vendorId && !expense.employeeId && (
                      <div className="flex items-center gap-2 text-slate-400 italic py-2">
                        <p className="text-sm font-bold uppercase tracking-widest opacity-50">General Disbursement</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[150%] bg-white/5 skew-x-[30deg] pointer-events-none" />
                <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex gap-10">
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400">Principal</p>
                      <p className="text-2xl font-bold tabular-nums tracking-tighter">{Number(expense.amount).toLocaleString()}</p>
                    </div>
                    {(Number(expense.tax) > 0 || Number(expense.tax2) > 0) && (
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400">Allocated TAX</p>
                        <p className="text-2xl font-bold tabular-nums tracking-tighter">{(Number(expense.tax) + Number(expense.tax2)).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-emerald-400 mb-2">Final Protocol Value</p>
                    <div className="flex items-baseline gap-3">
                      <span className="text-xl font-bold text-emerald-500/50 italic tabular-nums">PKR</span>
                      <span className="text-6xl font-black tracking-tighter text-emerald-400 leading-none">
                        {(Number(expense.amount) + Number(expense.tax) + Number(expense.tax2)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Audit Footer */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-[10px] font-bold uppercase tracking-widest text-slate-400 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3" /> Created {new Date(expense.createdAt).toLocaleDateString()}
                </div>
                {expense.voucherId && (
                  <div className="flex items-center gap-2 text-indigo-500">
                    <FileText className="w-3 h-3" /> VCH: {expense.voucherId.voucherNo}
                  </div>
                )}
                <div className="col-span-2 text-right opacity-50 print:hidden">
                  MIND SPIRE ERP • ACCOUNTING CORE 2.0
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

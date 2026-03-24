import { useEffect, useMemo, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Search, Download, Upload, MessageSquare, Printer, CheckCircle, CreditCard, MoreVertical, X } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { getAuthHeaders } from "@/lib/api/auth";
import { openWhatsappChat } from "@/lib/whatsapp";

const API_BASE = (import.meta as any)?.env?.VITE_API_BASE || "http://localhost:5050";

interface Row {
  id: string;
  employeeId?: string;
  employee: string;
  basic: number;
  allowances: number;
  deductions: number;
  net: number;
  status: "draft" | "processed" | "paid";
  period: string; // YYYY-MM
}

export default function Payroll() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [query, setQuery] = useState("");
  const [openRun, setOpenRun] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [tab, setTab] = useState<"current" | "history">("current");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const [empMap, setEmpMap] = useState<Record<string, { avatar?: string; initials: string }>>({});

  const toAbsoluteAvatar = (v?: string) => {
    if (!v) return "";
    const s = String(v);
    if (!s) return "";
    if (s.startsWith("http://") || s.startsWith("https://")) return s;
    return `${API_BASE}${s.startsWith("/") ? "" : "/"}${s}`;
  };

  const initialsFrom = (name?: string) => {
    const s = String(name || "").trim();
    if (!s) return "U";
    return s
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();
  };

  const money = useMemo(() => {
    try {
      return new Intl.NumberFormat("en-PK", {
        style: "currency",
        currency: "PKR",
        maximumFractionDigits: 0,
      });
    } catch {
      return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
    }
  }, []);

  // Get current user role to determine UI permissions
  const getCurrentUserRole = () => {
    try {
      const userStr = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
      if (!userStr) return 'admin'; // Default to admin for safety
      const user = JSON.parse(userStr);
      return user.role || 'admin';
    } catch {
      return 'admin'; // Default to admin for safety
    }
  };

  const currentUserRole = getCurrentUserRole();

  useEffect(() => {
    (async () => {
      try {
        const effectivePeriod = tab === "history" ? "all" : period;
        const sp = new URLSearchParams();
        sp.set("period", effectivePeriod);
        if (query) sp.set("q", query);
        if (rangeFrom) sp.set("from", rangeFrom);
        if (rangeTo) sp.set("to", rangeTo);
        
        const url = `${API_BASE}/api/payroll?${sp.toString()}`;
        const res = await fetch(url, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          const mapped: Row[] = (Array.isArray(data) ? data : []).map((d: any) => ({
            id: String(d._id || ""),
            employeeId: d.employeeId ? String(d.employeeId) : undefined,
            employee: d.employee || "-",
            basic: Number(d.basic || 0),
            allowances: Number(d.allowances || 0),
            deductions: Number(d.deductions || 0),
            net: Number(d.net || 0),
            status: (d.status as any) || "draft",
            period: d.period || period,
          }));
          setRows(mapped);
        }
      } catch {}
    })();
  }, [period, query, tab, rangeFrom, rangeTo]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/employees`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json().catch(() => []);
        const map: Record<string, { avatar?: string; initials: string }> = {};
        for (const e of Array.isArray(data) ? data : []) {
          const id = String(e._id || "");
          if (!id) continue;
          const name = e.name || `${e.firstName || ""} ${e.lastName || ""}`.trim();
          map[id] = { avatar: e.avatar || "", initials: (e.initials || initialsFrom(name)).toUpperCase() };
        }
        setEmpMap(map);
      } catch {}
    })();
  }, []);

  const runPayroll = async (calculated = false) => {
    try {
      const endpoint = calculated ? "/api/payroll/run-calculated" : "/api/payroll/run";
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ period }),
      });
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        const mapped: Row[] = items.map((d: any) => ({
          id: String(d._id || ""),
          employeeId: d.employeeId ? String(d.employeeId) : undefined,
          employee: d.employee || "-",
          basic: Number(d.basic || 0),
          allowances: Number(d.allowances || 0),
          deductions: Number(d.deductions || 0),
          net: Number(d.net || 0),
          status: (d.status as any) || "draft",
          period: d.period || period,
        }));
        setRows(mapped);
        toast.success(`Payroll processed for ${period}`);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to run payroll");
    }
  };

  const downloadTemplate = () => {
    window.open(`${API_BASE}/api/payroll/attendance-template`, "_blank");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/api/payroll/import-attendance`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token")}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Imported: ${data.results.created} created, ${data.results.updated} updated`);
        setOpenImport(false);
      } else {
        throw new Error(data.error || "Import failed");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const sendOnWhatsapp = (r: Row) => {
    const msg = `Hello ${r.employee}, your payroll for ${r.period} is ready.\nBasic: ${money.format(r.basic)}\nAllowances: ${money.format(r.allowances)}\nDeductions: ${money.format(r.deductions)}\nNet Pay: ${money.format(r.net)}\nStatus: ${r.status.toUpperCase()}`;
    // We don't have a specific phone field in the Row interface, so we'll need to fetch it or rely on the helper
    // For now, we'll try to find the employee in our map if it has phone, or just open the chat
    // Actually, openWhatsapp needs a phone number. 
    toast.info("Opening WhatsApp...");
    // Ideally we should have phone in the Row or empMap
    openWhatsappChat("", msg); // User will have to pick the contact if phone is empty
  };

  const printPayroll = (r: Row) => {
    const win = window.open("", "_blank");
    if (!win) return;
    
    // Employee details for the payslip header/info
    const emp = empMap[r.employeeId || ""] || {};
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payslip - ${r.employee} - ${r.period}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            
            * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
            body { 
              font-family: 'Inter', sans-serif; 
              margin: 0; 
              padding: 0; 
              background-color: #ffffff;
              color: #1e293b;
            }
            .a4-container {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              padding: 20mm;
              position: relative;
              overflow: hidden;
            }
            
            /* Decorative Elements */
            .bg-accent {
              position: absolute;
              top: 0;
              right: 0;
              width: 40%;
              height: 150px;
              background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
              clip-path: polygon(0 0, 100% 0, 100% 100%, 30% 100%);
              z-index: 0;
              opacity: 0.1;
            }

            .header {
              display: flex;
              justify-content: space-between;
              align-items: start;
              margin-bottom: 40px;
              position: relative;
              z-index: 1;
            }
            .brand-logo {
              width: 180px;
              height: auto;
              margin-bottom: 10px;
            }
            .payslip-title {
              text-align: right;
            }
            .payslip-title h1 {
              font-size: 42px;
              font-weight: 800;
              margin: 0;
              color: #7c3aed;
              letter-spacing: -0.02em;
            }
            .period-badge {
              display: inline-block;
              background: #f1f5f9;
              padding: 6px 12px;
              border-radius: 8px;
              font-weight: 600;
              font-size: 14px;
              color: #475569;
              margin-top: 8px;
            }

            .info-grid {
              display: grid;
              grid-template-columns: 1.5fr 1fr;
              gap: 40px;
              margin-bottom: 40px;
              background: #fafafa;
              padding: 30px;
              border-radius: 24px;
              border: 1px solid #f1f5f9;
            }
            .info-section h3 {
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: #94a3b8;
              margin: 0 0 12px 0;
            }
            .info-value {
              font-size: 18px;
              font-weight: 700;
              color: #0f172a;
            }
            .info-sub {
              font-size: 14px;
              color: #64748b;
              margin-top: 4px;
            }

            .salary-table {
              width: 100%;
              border-collapse: separate;
              border-spacing: 0;
              margin-bottom: 40px;
            }
            .salary-table th {
              text-align: left;
              padding: 16px 20px;
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: #64748b;
              border-bottom: 2px solid #f1f5f9;
            }
            .salary-table td {
              padding: 20px;
              font-size: 15px;
              border-bottom: 1px solid #f1f5f9;
            }
            .salary-table tr:last-child td {
              border-bottom: none;
            }
            .amount-col {
              text-align: right;
              font-family: 'Courier New', Courier, monospace;
              font-weight: 600;
            }
            .deduction {
              color: #ef4444;
            }

            .footer-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              align-items: end;
            }
            
            .net-pay-card {
              background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
              color: white;
              padding: 30px;
              border-radius: 24px;
              text-align: right;
              box-shadow: 0 10px 25px -5px rgba(124, 58, 237, 0.3);
            }
            .net-pay-label {
              font-size: 14px;
              font-weight: 500;
              opacity: 0.9;
              margin-bottom: 8px;
            }
            .net-pay-amount {
              font-size: 36px;
              font-weight: 800;
              letter-spacing: -0.02em;
            }

            .signature-box {
              border-top: 1px solid #e2e8f0;
              padding-top: 12px;
              width: 200px;
              margin-top: 60px;
              font-size: 13px;
              color: #64748b;
              font-weight: 500;
            }

            .company-contact {
              margin-top: auto;
              padding-top: 40px;
              font-size: 12px;
              color: #94a3b8;
              display: flex;
              justify-content: center;
              gap: 20px;
            }

            @media print {
              body { background: white; }
              .a4-container { padding: 15mm; margin: 0; width: 100%; height: auto; }
              .net-pay-card { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="a4-container">
            <div class="bg-accent"></div>
            
            <div class="header">
              <div class="brand">
                <img src="/HealthSpire%20logo.png" class="brand-logo" alt="HealthSpire">
                <div style="font-size: 12px; color: #64748b; font-weight: 500;">
                  764D2 Shah Jelani Rd Township Lahore<br>
                  info@healthspire.org | +92 312 7231875
                </div>
              </div>
              <div class="payslip-title">
                <h1>PAYSLIP</h1>
                <div class="period-badge">For the period of ${r.period}</div>
              </div>
            </div>

            <div class="info-grid">
              <div class="info-section">
                <h3>Employee Information</h3>
                <div class="info-value">${r.employee}</div>
                <div class="info-sub">Employee ID: ${r.employeeId ? r.employeeId.toString().slice(-6).toUpperCase() : 'N/A'}</div>
              </div>
              <div class="info-section" style="text-align: right;">
                <h3>Payment Details</h3>
                <div class="info-value" style="color: #7c3aed;">${r.status.toUpperCase()}</div>
                <div class="info-sub">Date: ${new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              </div>
            </div>

            <table class="salary-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th class="amount-col">Amount (PKR)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="font-weight: 600; color: #334155;">Basic Salary</td>
                  <td class="amount-col">${Number(r.basic).toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Allowances</td>
                  <td class="amount-col">+ ${Number(r.allowances).toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Deductions</td>
                  <td class="amount-col deduction">- ${Number(r.deductions).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            <div class="footer-grid">
              <div class="signature-section">
                <div class="signature-box">Employer Signature</div>
                <div class="signature-box">Employee Signature</div>
              </div>
              <div class="net-pay-card">
                <div class="net-pay-label">Net Payable Amount</div>
                <div class="net-pay-amount">${money.format(r.net).replace('PKR', '').trim()} <span style="font-size: 16px; font-weight: 600;">PKR</span></div>
              </div>
            </div>

            <div class="company-contact">
              <span>www.healthspire.org</span>
              <span>•</span>
              <span>info@healthspire.org</span>
              <span>•</span>
              <span>+92 312 7231875</span>
            </div>
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                // window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
  };

  const processPayroll = async (r: Row) => {
    try {
      const res = await fetch(`${API_BASE}/api/payroll/${r.id}/process`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        toast.success("Payroll processed and ledger updated");
        const updated = await res.json();
        setRows(rows.map(x => x.id === r.id ? { ...x, status: updated.status } : x));
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to process");
      }
    } catch (e) {
      toast.error("Connection error");
    }
  };

  const payPayroll = async (r: Row) => {
    try {
      const res = await fetch(`${API_BASE}/api/payroll/${r.id}/pay`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        toast.success("Payroll marked as paid and journal posted");
        const updated = await res.json();
        setRows(rows.map(x => x.id === r.id ? { ...x, status: updated.status } : x));
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to mark as paid");
      }
    } catch (e) {
      toast.error("Connection error");
    }
  };

  const list = useMemo(() => {
    const s = query.toLowerCase();
    if (tab === "history") return rows.filter((r) => r.employee.toLowerCase().includes(s));
    return rows.filter((r) => r.employee.toLowerCase().includes(s) && r.period === period);
  }, [rows, query, period, tab]);

  const statusBadge = (st: Row["status"]) => (
    st === "paid" ? <Badge variant="success">Paid</Badge> : st === "processed" ? <Badge variant="secondary">Processed</Badge> : <Badge>Draft</Badge>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-sm text-muted-foreground">Payroll</h1>
        <div className="flex items-center gap-2">
          {currentUserRole === 'admin' && (
            <>
              <Dialog open={openImport} onOpenChange={setOpenImport}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Import Attendance
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Import Attendance Machine Sheet</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="text-sm text-muted-foreground">
                      Upload your attendance machine export (Excel/XLSX). 
                      Make sure it follows our standard format.
                    </div>
                    <Button variant="link" className="p-0 h-auto" onClick={downloadTemplate}>
                      Download Sample Template
                    </Button>
                    <Input 
                      type="file" 
                      accept=".xlsx,.xls,.csv" 
                      ref={fileInputRef}
                      onChange={handleImport}
                      disabled={importing}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpenImport(false)}>Cancel</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={openRun} onOpenChange={setOpenRun}>
                <DialogTrigger asChild>
                  <Button variant="gradient" size="sm">Run payroll</Button>
                </DialogTrigger>
                <DialogContent className="bg-card">
                  <DialogHeader>
                    <DialogTitle>Run payroll</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-3">
                    <div className="space-y-1">
                      <Label>Period</Label>
                      <Input placeholder="YYYY-MM" value={period} onChange={(e)=>setPeriod(e.target.value)} />
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      Choose how to calculate payroll for this period.
                    </div>
                  </div>
                  <DialogFooter className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" className="w-full sm:w-auto" onClick={() => runPayroll(false)}>Standard (Salary only)</Button>
                    <Button className="w-full sm:w-auto" onClick={async ()=>{ await runPayroll(true); setOpenRun(false); }}>Calculate from Attendance</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2"/>Export</Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search" value={query} onChange={(e)=>setQuery(e.target.value)} className="pl-9 w-56" />
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3 gap-4">
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="bg-muted/40 flex flex-wrap lg:grid lg:grid-cols-2 w-full h-auto min-h-10 gap-1">
                <TabsTrigger value="current">Current period</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
            </Tabs>
          <div className="flex items-center gap-2">
            {(tab === "history" || (rangeFrom || rangeTo)) && (
              <div className="flex items-center gap-2 mr-2">
                <DatePicker 
                  value={rangeFrom} 
                  onChange={setRangeFrom} 
                  placeholder="From Date"
                  className="h-9 w-32"
                />
                <span className="text-slate-400">→</span>
                <DatePicker 
                  value={rangeTo} 
                  onChange={setRangeTo} 
                  placeholder="To Date"
                  className="h-9 w-32"
                />
                {(rangeFrom || rangeTo) && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setRangeFrom(""); setRangeTo(""); }}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Period</Label>
              <Input className="w-32" placeholder="YYYY-MM" value={period} onChange={(e)=>setPeriod(e.target.value)} disabled={tab === "history"} />
            </div>
          </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Employee</TableHead>
                {tab === "history" && <TableHead>Period</TableHead>}
                <TableHead>Basic</TableHead>
                <TableHead>Allowances</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net pay</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={toAbsoluteAvatar(empMap[r.employeeId || ""]?.avatar)} alt={r.employee} />
                        <AvatarFallback className="text-[10px] font-semibold">{(empMap[r.employeeId || ""]?.initials || initialsFrom(r.employee)).slice(0,2)}</AvatarFallback>
                      </Avatar>
                      {r.employeeId ? (
                        <button
                          type="button"
                          className="capitalize text-left hover:underline"
                          onClick={() => navigate(`/hrm/employees/${r.employeeId}`, { state: { dbId: r.employeeId } })}
                        >
                          {r.employee}
                        </button>
                      ) : (
                        <span className="capitalize">{r.employee}</span>
                      )}
                    </div>
                  </TableCell>
                  {tab === "history" && <TableCell>{r.period}</TableCell>}
                  <TableCell>{money.format(r.basic)}</TableCell>
                  <TableCell>{money.format(r.allowances)}</TableCell>
                  <TableCell>{money.format(r.deductions)}</TableCell>
                  <TableCell className="font-semibold">{money.format(r.net)}</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => sendOnWhatsapp(r)}
                        title="Send via WhatsApp"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => printPayroll(r)}>
                            <Printer className="w-4 h-4 mr-2" /> Print Payslip
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => sendOnWhatsapp(r)}>
                            <MessageSquare className="w-4 h-4 mr-2 text-green-600" /> WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {r.status === "draft" && (
                            <DropdownMenuItem onClick={() => processPayroll(r)}>
                              <CheckCircle className="w-4 h-4 mr-2 text-blue-600" /> Process (Accrue)
                            </DropdownMenuItem>
                          )}
                          {r.status === "processed" && (
                            <DropdownMenuItem onClick={() => payPayroll(r)}>
                              <CreditCard className="w-4 h-4 mr-2 text-emerald-600" /> Mark as Paid
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

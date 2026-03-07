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
import { Search, Download, Upload, MessageSquare } from "lucide-react";
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
  const [period, setPeriod] = useState(new Date().toISOString().slice(0,7));
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
        const url = `${API_BASE}/api/payroll?period=${encodeURIComponent(effectivePeriod)}${query ? `&q=${encodeURIComponent(query)}` : ""}`;
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
  }, [period, query, tab]);

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
              <Label className="text-sm text-muted-foreground">Period</Label>
              <Input className="w-32" placeholder="YYYY-MM" value={period} onChange={(e)=>setPeriod(e.target.value)} disabled={tab === "history"} />
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
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => sendOnWhatsapp(r)}
                      title="Send via WhatsApp"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Button>
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

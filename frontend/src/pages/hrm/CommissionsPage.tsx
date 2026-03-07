import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  DollarSign, 
  CheckCircle, 
  Clock, 
  Download, 
  Filter, 
  RefreshCw, 
  User, 
  Search, 
  TrendingUp, 
  AlertCircle,
  XCircle,
  ArrowRight
} from "lucide-react";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Commission {
  _id: string;
  leadId: string;
  leadName: string;
  employeeId: string;
  employeeName: string;
  clientId: string;
  orderId: string;
  invoiceId: string;
  saleAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: "pending" | "approved" | "paid" | "cancelled";
  approvedAt: string;
  paidAt: string;
  period: string;
  notes: string;
  createdAt: string;
}

export default function CommissionsPage() {
  const navigate = useNavigate();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCommissions, setSelectedCommissions] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("-");
  const [searchQuery, setSearchQuery] = useState("");

  const loadCommissions = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      const params = new URLSearchParams();
      if (statusFilter !== "-") params.append("status", statusFilter);
      
      const res = await fetch(`${API_BASE}/api/commissions?${params.toString()}`, { headers });
      if (!res.ok) throw new Error("Failed to load commissions");
      
      const data = await res.json();
      setCommissions(data.commissions || []);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load commissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommissions();
  }, [statusFilter]);

  const handleStatusChange = async (commissionId: string, newStatus: string) => {
    try {
      const headers = getAuthHeaders({ "Content-Type": "application/json" });
      const res = await fetch(`${API_BASE}/api/commissions/${commissionId}/status`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!res.ok) throw new Error("Failed to update status");
      
      toast.success(`Commission marked as ${newStatus}`);
      loadCommissions();
    } catch (error: any) {
      toast.error(error?.message || "Failed to update status");
    }
  };

  const handleBulkPay = async () => {
    if (!selectedCommissions.length) {
      toast.error("No commissions selected");
      return;
    }
    
    try {
      const headers = getAuthHeaders({ "Content-Type": "application/json" });
      const res = await fetch(`${API_BASE}/api/commissions/bulk-pay`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ids: selectedCommissions }),
      });
      
      if (!res.ok) throw new Error("Failed to process payments");
      
      const data = await res.json();
      toast.success(data.message || `${data.modifiedCount} commissions marked as paid`);
      setSelectedCommissions([]);
      loadCommissions();
    } catch (error: any) {
      toast.error(error?.message || "Failed to process payments");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedCommissions(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const payableIds = filteredCommissions
      .filter(c => c.status === "approved")
      .map(c => c._id);
    
    if (selectedCommissions.length === payableIds.length && payableIds.length > 0) {
      setSelectedCommissions([]);
    } else {
      setSelectedCommissions(payableIds);
    }
  };

  const filteredCommissions = useMemo(() => {
    return commissions.filter(c => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.leadName?.toLowerCase().includes(q) ||
        c.employeeName?.toLowerCase().includes(q) ||
        c.period?.toLowerCase().includes(q)
      );
    });
  }, [commissions, searchQuery]);

  const summary = useMemo(() => {
    return {
      totalAmount: commissions.reduce((sum, c) => sum + (c.commissionAmount || 0), 0),
      pendingAmount: commissions.filter(c => c.status === "pending").reduce((sum, c) => sum + (c.commissionAmount || 0), 0),
      approvedAmount: commissions.filter(c => c.status === "approved").reduce((sum, c) => sum + (c.commissionAmount || 0), 0),
      paidAmount: commissions.filter(c => c.status === "paid").reduce((sum, c) => sum + (c.commissionAmount || 0), 0),
      totalCount: commissions.length,
      pendingCount: commissions.filter(c => c.status === "pending").length,
      approvedCount: commissions.filter(c => c.status === "approved").length,
      paidCount: commissions.filter(c => c.status === "paid").length,
    };
  }, [commissions]);

  const formatCurrency = (amount: number) => {
    return `Rs.${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-[1600px] mx-auto pb-12 px-4 sm:px-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 p-10 text-white shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-purple-600/10 to-transparent" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 font-black uppercase tracking-widest text-[10px] px-3 py-1">HRM Intelligence</Badge>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">Commission Command</h1>
            <p className="text-slate-400 font-medium max-w-xl">Centralized management for lead conversion rewards and sales team incentives.</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={loadCommissions} variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 rounded-2xl h-12 px-6">
              <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} /> Refresh Data
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 rounded-2xl h-12 px-6">
              <Download className="w-4 h-4 mr-2" /> Export Report
            </Button>
          </div>
        </div>

        {/* Summary Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-12 relative">
          {[
            { label: "Total Generated", value: formatCurrency(summary.totalAmount), count: summary.totalCount, icon: TrendingUp, color: "text-blue-400", bg: "bg-blue-500/10" },
            { label: "Pending Approval", value: formatCurrency(summary.pendingAmount), count: summary.pendingCount, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
            { label: "Approved Balance", value: formatCurrency(summary.approvedAmount), count: summary.approvedCount, icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Disbursed / Paid", value: formatCurrency(summary.paidAmount), count: summary.paidCount, icon: DollarSign, color: "text-indigo-400", bg: "bg-indigo-500/10" },
          ].map((stat, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10 group hover:scale-[1.02] transition-all duration-500">
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-3 rounded-2xl", stat.bg)}>
                  <stat.icon className={cn("w-5 h-5", stat.color)} />
                </div>
                <Badge className="bg-white/5 text-white/60 border-white/10 font-bold">{stat.count}</Badge>
              </div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">{stat.label}</div>
              <div className="text-2xl font-black tabular-nums tracking-tighter">{stat.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Control Bar */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-md rounded-[2rem] overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
              <div className="relative flex-1 min-w-[280px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search lead, employee or period..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 pl-11 rounded-2xl border-slate-200 bg-white shadow-sm focus:ring-indigo-500"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 h-12 rounded-2xl border-slate-200 bg-white shadow-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="-">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" onClick={() => { setStatusFilter("-"); setSearchQuery(""); }} className="h-12 px-6 font-bold text-slate-500 hover:text-indigo-600">
                Clear Filters
              </Button>
            </div>

            {selectedCommissions.length > 0 && (
              <div className="flex items-center gap-4 bg-indigo-50 px-6 py-2 rounded-2xl border border-indigo-100 animate-in slide-in-from-right duration-500">
                <span className="text-sm font-black text-indigo-600 uppercase tracking-tight">{selectedCommissions.length} Selected</span>
                <Button size="sm" onClick={handleBulkPay} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 px-6 shadow-lg shadow-indigo-200">
                  <DollarSign className="w-4 h-4 mr-2" /> Mark as Paid
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedCommissions([])} className="text-indigo-400 hover:text-indigo-600">
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-xl rounded-[2.5rem] overflow-hidden border-t border-white/50">
        <CardHeader className="px-10 pt-10 pb-4 border-b border-slate-50 flex flex-row justify-between items-center">
          <div>
            <CardTitle className="text-xl font-black uppercase tracking-tighter text-slate-900">Commission Ledger</CardTitle>
            <CardDescription className="font-medium">Detailed log of conversion rewards</CardDescription>
          </div>
          <Badge className="bg-slate-100 text-slate-600 border-0 font-black px-4 py-1 rounded-full">{filteredCommissions.length} Total Records</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-16 px-10 py-6">
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={selectedCommissions.length > 0 && selectedCommissions.length === filteredCommissions.filter(c => c.status === "approved").length}
                        onChange={toggleSelectAll}
                        className="w-5 h-5 rounded-lg border-2 border-slate-200 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                      />
                    </div>
                  </TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] py-6 px-6 text-slate-400">Lead & Conversion</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] py-6 px-6 text-slate-400">Account Owner</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] py-6 px-6 text-slate-400 text-right">Sale Value</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] py-6 px-6 text-slate-400 text-right">Yield (Rate)</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] py-6 px-6 text-slate-400 text-right">Reward Amount</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] py-6 px-6 text-slate-400">Lifecycle</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] py-6 px-6 text-slate-400">Period</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[10px] py-6 px-10 text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-24 text-slate-400 italic font-medium">
                      <div className="flex flex-col items-center gap-3">
                        <RefreshCw className="w-10 h-10 animate-spin text-slate-200" />
                        <span className="uppercase tracking-[0.2em] text-[10px] font-black">Syncing ledger...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredCommissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-24 text-slate-400 italic font-medium">
                      <div className="flex flex-col items-center gap-3 opacity-30">
                        <AlertCircle className="w-12 h-12" />
                        <p className="font-black uppercase tracking-[0.2em] text-xs">Ledger Empty</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCommissions.map((c) => (
                    <TableRow key={c._id} className="group hover:bg-indigo-500/[0.03] transition-all duration-300 border-b border-slate-50 last:border-0">
                      <TableCell className="px-10 py-6">
                        <div className="flex items-center justify-center">
                          {c.status === "approved" ? (
                            <input
                              type="checkbox"
                              checked={selectedCommissions.includes(c._id)}
                              onChange={() => toggleSelect(c._id)}
                              className="w-5 h-5 rounded-lg border-2 border-slate-200 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-lg border-2 border-slate-100 bg-slate-50/50 cursor-not-allowed opacity-50" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-6">
                        <div className="space-y-1">
                          <div className="font-black text-slate-900 uppercase tracking-tight text-sm">{c.leadName}</div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <Clock className="w-3 h-3" />
                            {new Date(c.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200">
                            {c.employeeName.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="font-black text-slate-900 uppercase tracking-tight text-sm">{c.employeeName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-6 text-right font-bold text-slate-600 tabular-nums text-sm">{formatCurrency(c.saleAmount)}</TableCell>
                      <TableCell className="px-6 py-6 text-right">
                        <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 font-black text-[10px] uppercase">{ (c.commissionRate * 100).toFixed(0) }%</Badge>
                      </TableCell>
                      <TableCell className="px-6 py-6 text-right font-black text-indigo-600 tabular-nums text-lg tracking-tighter">{formatCurrency(c.commissionAmount)}</TableCell>
                      <TableCell className="px-6 py-6">
                        <Badge 
                          className={cn(
                            "font-black text-[10px] px-3 py-1 uppercase tracking-widest border-0",
                            c.status === "paid" ? "bg-indigo-500 text-white shadow-lg shadow-indigo-200" :
                            c.status === "approved" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200" :
                            c.status === "pending" ? "bg-amber-500 text-white shadow-lg shadow-amber-200" : 
                            "bg-rose-500 text-white shadow-lg shadow-rose-200"
                          )}
                        >
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-6 font-black text-slate-400 uppercase text-[10px] tracking-[0.15em]">{c.period || "N/A"}</TableCell>
                      <TableCell className="px-10 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Select 
                            value={c.status} 
                            onValueChange={(v) => handleStatusChange(c._id, v)}
                            disabled={c.status === "paid" || loading}
                          >
                            <SelectTrigger className={cn(
                              "w-32 h-10 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest transition-all",
                              c.status === "paid" ? "bg-slate-50 border-slate-100 text-slate-400" : "bg-white border-slate-200 hover:border-indigo-300"
                            )}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="pending" className="font-bold uppercase text-[10px] tracking-widest">Pending</SelectItem>
                              <SelectItem value="approved" className="font-bold uppercase text-[10px] tracking-widest">Approved</SelectItem>
                              <SelectItem value="paid" className="font-bold uppercase text-[10px] tracking-widest text-indigo-600">Disburse (Paid)</SelectItem>
                              <SelectItem value="cancelled" className="font-bold uppercase text-[10px] tracking-widest text-rose-600">Cancel</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-100" onClick={() => navigate(`/crm/leads/${c.leadId}`)}>
                            <ArrowRight className="w-4 h-4 text-slate-400" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

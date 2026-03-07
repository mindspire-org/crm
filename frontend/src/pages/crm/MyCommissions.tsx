import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Wallet, Coins, TrendingUp, Users, CheckCircle, Clock, Calendar, BadgePercent } from "lucide-react";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

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

interface CommissionSummary {
  totalEarned: number;
  totalPaid: number;
  totalPending: number;
  pendingCount: number;
  approvedCount: number;
  paidCount: number;
}

interface LeadWithCommission {
  _id: string;
  name: string;
  company?: string;
  status?: string;
  expectedPrice?: string;
  approvalStatus?: string;
  approvedAt?: string;
  commissionAmount?: number;
  commissionStatus?: string;
}

export default function MyCommissions() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [summary, setSummary] = useState<CommissionSummary>({
    totalEarned: 0,
    totalPaid: 0,
    totalPending: 0,
    pendingCount: 0,
    approvedCount: 0,
    paidCount: 0,
  });
  const [myLeads, setMyLeads] = useState<LeadWithCommission[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();

      // Fetch commissions
      const commRes = await fetch(`${API_BASE}/api/commissions/my-commissions`, { headers });
      if (!commRes.ok) throw new Error("Failed to load commissions");
      const commData = await commRes.json();
      setCommissions(commData.commissions || []);
      setSummary(commData.summary || {
        totalEarned: 0, totalPaid: 0, totalPending: 0,
        pendingCount: 0, approvedCount: 0, paidCount: 0,
      });

      // Fetch my leads
      const leadsRes = await fetch(`${API_BASE}/api/leads`, { headers });
      if (leadsRes.ok) {
        const leadsData = await leadsRes.json();
        // Map leads with their commissions
        const leadsWithComm = (Array.isArray(leadsData) ? leadsData : []).map((lead: any) => {
          const commission = (commData.commissions || []).find((c: Commission) => 
            c.leadId === lead._id || c.leadId === String(lead._id)
          );
          return {
            ...lead,
            commissionAmount: commission?.commissionAmount,
            commissionStatus: commission?.status,
          };
        });
        setMyLeads(leadsWithComm);
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "-";
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "-";
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      paid: { variant: "success", className: "bg-green-100 text-green-800" },
      approved: { variant: "default", className: "bg-blue-100 text-blue-800" },
      pending: { variant: "secondary", className: "bg-yellow-100 text-yellow-800" },
      cancelled: { variant: "outline", className: "bg-gray-100 text-gray-600" },
    };
    const config = variants[status] || variants.pending;
    const label = status === "cancelled" ? "No Commission" : status.charAt(0).toUpperCase() + status.slice(1);
    return (
      <Badge className={config.className}>
        {label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/crm/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">My Commissions</h1>
            <p className="text-sm text-muted-foreground">
              Track your 5% commission earnings from converted leads
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Total Earned</p>
                <p className="text-2xl font-bold text-green-900 mt-1">
                  {loading ? "..." : formatCurrency(summary.totalEarned)}
                </p>
              </div>
              <div className="bg-green-200 p-3 rounded-full">
                <Wallet className="w-6 h-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Paid</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {loading ? "..." : formatCurrency(summary.totalPaid)}
                </p>
              </div>
              <div className="bg-blue-200 p-3 rounded-full">
                <CheckCircle className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 font-medium">Pending</p>
                <p className="text-2xl font-bold text-yellow-900 mt-1">
                  {loading ? "..." : formatCurrency(summary.totalPending)}
                </p>
              </div>
              <div className="bg-yellow-200 p-3 rounded-full">
                <Clock className="w-6 h-6 text-yellow-700" />
              </div>
            </div>
            <p className="text-xs text-yellow-600 mt-2">
              {summary.pendingCount} commission{summary.pendingCount !== 1 ? "s" : ""} awaiting
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Conversion Rate</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">5%</p>
              </div>
              <div className="bg-purple-200 p-3 rounded-full">
                <BadgePercent className="w-6 h-6 text-purple-700" />
              </div>
            </div>
            <p className="text-xs text-purple-600 mt-2">
              Fixed commission rate per sale
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Commission History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5" />
              Commission History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : commissions.length === 0 ? (
              <div className="text-center py-8">
                <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No commissions yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Convert leads to sales to earn 5% commission
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {commissions.map((commission) => (
                  <div
                    key={commission._id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{commission.leadName}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {formatDate(commission.createdAt)}
                        <span className="mx-1">•</span>
                        <span>Sale: {formatCurrency(commission.saleAmount)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-green-600">
                        +{formatCurrency(commission.commissionAmount)}
                      </p>
                      {getStatusBadge(commission.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Leads with Commissions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              My Leads & Commissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : myLeads.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No leads yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myLeads.map((lead) => (
                    <TableRow key={lead._id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{lead.name}</p>
                          {lead.company && (
                            <p className="text-sm text-muted-foreground">{lead.company}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.commissionAmount ? (
                          getStatusBadge(lead.commissionStatus || "pending")
                        ) : lead.approvalStatus === "approved" || lead.clientId ? (
                          <Badge variant="outline" className="bg-gray-100">Approved - No Commission</Badge>
                        ) : lead.status === "Won" ? (
                          <Badge variant="outline" className="text-yellow-600">Awaiting Admin Approval</Badge>
                        ) : (
                          <Badge variant="secondary">{lead.status || "New"}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {lead.commissionAmount ? (
                          <span className="font-semibold text-green-600">
                            {formatCurrency(lead.commissionAmount)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Info Section */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <strong>How it works:</strong> When a lead you created is approved and converted to a sale,
            you earn a 5% commission on the sale amount. Commissions are calculated automatically
            and approved by admin. You can track all your earnings here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

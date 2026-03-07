import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import {
  DollarSign,
  ShoppingCart,
  FileText,
  CreditCard,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Eye,
  Download,
  Calendar,
  Users,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";
import { canViewFinancialData, getCurrentUser } from "@/utils/roleAccess";

type OrderDoc = {
  _id: string;
  orderNo?: number;
  clientId?: string;
  client?: string;
  total?: number;
  currency?: string;
  status?: string;
  createdAt?: string;
};

type InvoiceDoc = {
  _id: string;
  invoiceNo?: number;
  clientId?: string;
  client?: string;
  total?: number;
  currency?: string;
  status?: string;
  dueDate?: string;
  createdAt?: string;
};

type PaymentDoc = {
  _id: string;
  amount?: number;
  currency?: string;
  method?: string;
  status?: string;
  createdAt?: string;
};

type SubscriptionDoc = {
  _id: string;
  subscriptionNo?: number;
  clientId?: string;
  client?: string;
  title?: string;
  amount?: number;
  currency?: string;
  status?: string;
  nextBillingDate?: string;
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

  if (u === "day" || u === "days") return (amount * 30) / c;
  if (u === "week" || u === "weeks") return (amount * 4.345) / c;
  if (u === "month" || u === "months") return amount / c;
  if (u === "year" || u === "years") return amount / 12 / c;

  return amount / c;
}

export default function SalesDashboard() {
  const [orders, setOrders] = useState<OrderDoc[]>([]);
  const [invoices, setInvoices] = useState<InvoiceDoc[]>([]);
  const [payments, setPayments] = useState<PaymentDoc[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionDoc[]>([]);
  const [loading, setLoading] = useState(false);

  // Permission checks
  const currentUser = getCurrentUser();
  const canViewFinanceData = canViewFinancialData(currentUser);

  const reloadAll = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();

      // Load orders
      const ordersRes = await fetch(`${API_BASE}/api/orders`, { headers });
      const ordersJson = await ordersRes.json().catch(() => null);
      if (ordersRes.ok) setOrders(Array.isArray(ordersJson) ? ordersJson : []);

      // Load invoices
      const invoicesRes = await fetch(`${API_BASE}/api/invoices`, { headers });
      const invoicesJson = await invoicesRes.json().catch(() => null);
      if (invoicesRes.ok) setInvoices(Array.isArray(invoicesJson) ? invoicesJson : []);

      // Load payments
      const paymentsRes = await fetch(`${API_BASE}/api/payments`, { headers });
      const paymentsJson = await paymentsRes.json().catch(() => null);
      if (paymentsRes.ok) setPayments(Array.isArray(paymentsJson) ? paymentsJson : []);

      // Load subscriptions
      const subsRes = await fetch(`${API_BASE}/api/subscriptions`, { headers });
      const subsJson = await subsRes.json().catch(() => null);
      if (subsRes.ok) setSubscriptions(Array.isArray(subsJson) ? subsJson : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load sales data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const metrics = useMemo(() => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    // Orders metrics
    const totalOrders = orders.length;
    const completedOrders = orders.filter((o) => String(o.status || "").toLowerCase() === "completed").length;
    const pendingOrders = orders.filter((o) => String(o.status || "").toLowerCase() === "pending").length;
    const ordersThisMonth = orders.filter((o) => toIsoDate(o.createdAt).startsWith(thisMonth)).length;

    // Revenue from orders
    const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const revenueThisMonth = orders
      .filter((o) => toIsoDate(o.createdAt).startsWith(thisMonth))
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    // Invoices metrics
    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter((i) => String(i.status || "").toLowerCase() === "paid").length;
    const unpaidInvoices = invoices.filter((i) => String(i.status || "").toLowerCase() === "unpaid").length;
    const overdueInvoices = invoices.filter((i) => {
      const due = toIsoDate(i.dueDate);
      return due && due < todayIso && String(i.status || "").toLowerCase() !== "paid";
    }).length;

    // Payments metrics
    const totalPayments = payments.length;
    const paymentsThisMonth = payments.filter((p) => toIsoDate(p.createdAt).startsWith(thisMonth)).length;
    const paymentVolume = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // Subscriptions metrics
    const activeSubscriptions = subscriptions.filter((s) => String(s.status || "active").toLowerCase() === "active").length;
    const mrr = subscriptions
      .filter((s) => String(s.status || "active").toLowerCase() === "active")
      .reduce((sum, s) => {
        const monthly = normalizeToMonthly(
          Number(s.amount || 0),
          Number(s.repeatEveryCount || 1) || 1,
          String(s.repeatEveryUnit || "month")
        );
        return sum + monthly;
      }, 0);

    const arr = mrr * 12;

    // Invoice status data for chart
    const invoiceStatusData = [
      { name: "Paid", value: paidInvoices, color: "#10b981" },
      { name: "Unpaid", value: unpaidInvoices, color: "#f59e0b" },
      { name: "Overdue", value: overdueInvoices, color: "#ef4444" },
    ];

    // Revenue trend (last 6 months)
    const revenueTrend = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().slice(0, 7);
      const monthName = date.toLocaleDateString("en", { month: "short" });

      const monthOrders = orders.filter((o) => toIsoDate(o.createdAt).startsWith(monthKey));
      const monthRevenue = monthOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

      revenueTrend.push({
        month: monthName,
        revenue: monthRevenue,
        orders: monthOrders.length,
      });
    }

    // Recent orders
    const recentOrders = orders
      .sort((a, b) => new Date(b.createdAt || "").getTime() - new Date(a.createdAt || "").getTime())
      .slice(0, 5);

    return {
      totalOrders,
      completedOrders,
      pendingOrders,
      ordersThisMonth,
      totalRevenue,
      revenueThisMonth,
      totalInvoices,
      paidInvoices,
      unpaidInvoices,
      overdueInvoices,
      totalPayments,
      paymentsThisMonth,
      paymentVolume,
      activeSubscriptions,
      mrr,
      arr,
      invoiceStatusData,
      revenueTrend,
      recentOrders,
    };
  }, [orders, invoices, payments, subscriptions]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm text-muted-foreground">Sales</div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales Dashboard</h1>
        </div>
        <Button variant="outline" onClick={reloadAll} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {canViewFinanceData && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">${metrics.totalRevenue.toFixed(2)}</div>
              <div className="mt-1 flex items-center text-xs text-muted-foreground">
                <TrendingUp className="mr-1 h-3 w-3" />
                ${metrics.revenueThisMonth.toFixed(2)} this month
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{metrics.totalOrders}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {metrics.completedOrders} completed, {metrics.pendingOrders} pending
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{metrics.totalInvoices}</div>
            <div className="mt-1 flex items-center text-xs text-muted-foreground">
              {metrics.overdueInvoices > 0 ? (
                <>
                  <AlertTriangle className="mr-1 h-3 w-3 text-red-500" />
                  {metrics.overdueInvoices} overdue
                </>
              ) : (
                "All up to date"
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{canViewFinanceData ? `$${metrics.mrr.toFixed(2)}` : "••••"}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {metrics.activeSubscriptions} active subscriptions
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Trend */}
        {canViewFinanceData && (
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Revenue Trend</CardTitle>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={metrics.revenueTrend} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="#60A5FA" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 10" stroke="rgba(148,163,184,0.35)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" name="Revenue" dataKey="revenue" stroke="#3B82F6" strokeWidth={2.5} fill="url(#revFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Invoice Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invoice Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={metrics.invoiceStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  dataKey="value"
                  stroke="rgba(255,255,255,0.8)"
                  strokeWidth={2}
                >
                  {metrics.invoiceStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-1 gap-2 mt-4">
              {metrics.invoiceStatusData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {canViewFinanceData && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">ARR</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">${metrics.arr.toFixed(2)}</div>
              <div className="mt-1 text-xs text-muted-foreground">Annualized from MRR</div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{metrics.totalPayments}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {metrics.paymentsThisMonth} this month
            </div>
          </CardContent>
        </Card>

        {canViewFinanceData && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Payment Volume</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">${metrics.paymentVolume.toFixed(2)}</div>
              <div className="mt-1 text-xs text-muted-foreground">Total processed</div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{metrics.activeSubscriptions}</div>
            <div className="mt-1 text-xs text-muted-foreground">Recurring customers</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Orders</CardTitle>
          <Button variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-2" />
            View All
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-28">Order ID</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="w-32">Total</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-40">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.recentOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      {loading ? "Loading..." : "No recent orders"}
                    </TableCell>
                  </TableRow>
                ) : (
                  metrics.recentOrders.map((order) => (
                    <TableRow key={order._id}>
                      <TableCell className="font-medium">
                        {order.orderNo ? `#${order.orderNo}` : "-"}
                      </TableCell>
                      <TableCell>{order.client || "-"}</TableCell>
                      <TableCell>
                        {typeof order.total === "number" ? `${order.currency || ""} ${order.total}` : "0"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={String(order.status || "").toLowerCase() === "completed" ? "default" : "secondary"}>
                          {order.status || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {toIsoDate(order.createdAt) || "-"}
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

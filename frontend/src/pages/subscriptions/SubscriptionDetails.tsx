import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2, Calendar, DollarSign, Tag, FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";

interface SubscriptionDoc {
  _id: string;
  subscriptionNo?: number;
  clientId?: string;
  client?: string;
  title?: string;
  type?: string;
  status?: string;
  currency?: string;
  firstBillingDate?: string;
  nextBillingDate?: string;
  repeatEveryCount?: number;
  repeatEveryUnit?: string;
  cycles?: number;
  amount?: number;
  tax1?: number;
  tax2?: number;
  note?: string;
  labels?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export default function SubscriptionDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<SubscriptionDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSubscription = async () => {
      if (!id) return;
      try {
        const res = await fetch(`${API_BASE}/api/subscriptions/${id}`, { headers: getAuthHeaders() });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || "Failed to load subscription");
        setSubscription(json);
      } catch (e: any) {
        toast.error(e?.message || "Failed to load subscription");
      } finally {
        setLoading(false);
      }
    };

    loadSubscription();
  }, [id]);

  const deleteSubscription = async () => {
    if (!subscription?._id) return;
    if (!confirm("Are you sure you want to delete this subscription?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/subscriptions/${subscription._id}`, { method: "DELETE", headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to delete subscription");
      toast.success("Subscription deleted");
      navigate("/subscriptions");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete subscription");
    }
  };

  const cancelOrReactivate = async () => {
    if (!subscription?._id) return;

    try {
      const isCancelled = (subscription.status || "").toLowerCase() === "cancelled";
      const endpoint = isCancelled ? "reactivate" : "cancel";
      const res = await fetch(`${API_BASE}/api/subscriptions/${subscription._id}/${endpoint}`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(isCancelled ? {} : { cancelledBy: "" }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to update status");
      toast.success(isCancelled ? "Subscription reactivated" : "Subscription cancelled");
      // Reload the subscription data
      const updatedRes = await fetch(`${API_BASE}/api/subscriptions/${subscription._id}`, { headers: getAuthHeaders() });
      const updatedJson = await updatedRes.json().catch(() => null);
      if (updatedRes.ok) setSubscription(updatedJson);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update status");
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="p-6">
        <div className="text-center text-muted-foreground">
          <p>Subscription not found</p>
          <Button variant="outline" className="mt-2" onClick={() => navigate("/subscriptions")}>
            Back to Subscriptions
          </Button>
        </div>
      </div>
    );
  }

  const isCancelled = (subscription.status || "").toLowerCase() === "cancelled";
  const totalAmount = (subscription.amount || 0) + (subscription.tax1 || 0) + (subscription.tax2 || 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate("/subscriptions")}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Subscription Details</h1>
          {subscription.subscriptionNo && (
            <Badge variant="secondary">#{subscription.subscriptionNo}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(`/subscriptions?edit=${subscription._id}`)}>
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
          <Button variant={isCancelled ? "default" : "destructive"} onClick={cancelOrReactivate}>
            <RefreshCw className="w-4 h-4 mr-1" />
            {isCancelled ? "Reactivate" : "Cancel"}
          </Button>
          <Button variant="destructive" onClick={deleteSubscription}>
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Subscription Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Title</label>
                  <p className="font-semibold">{subscription.title || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <p>{subscription.type || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Client</label>
                  <p>{subscription.client || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <Badge variant={isCancelled ? "secondary" : "default"}>
                    {isCancelled ? "Cancelled" : "Active"}
                  </Badge>
                </div>
              </div>
              {subscription.note && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Note</label>
                  <p className="mt-1">{subscription.note}</p>
                </div>
              )}
              {subscription.labels && subscription.labels.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Labels</label>
                  <div className="flex gap-2 mt-1">
                    {subscription.labels.map((label, index) => (
                      <Badge key={index} variant="outline">
                        <Tag className="w-3 h-3 mr-1" />
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Billing Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Billing Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">First Billing Date</label>
                  <p>{subscription.firstBillingDate ? new Date(subscription.firstBillingDate).toLocaleDateString() : "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Next Billing Date</label>
                  <p>{subscription.nextBillingDate ? new Date(subscription.nextBillingDate).toLocaleDateString() : "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Repeat Every</label>
                  <p>{`${subscription.repeatEveryCount ?? 1} ${subscription.repeatEveryUnit || "month"}`}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Cycles</label>
                  <p>{subscription.cycles ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Financial Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Financial Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Currency</label>
                <p className="font-semibold">{subscription.currency || "USD"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Amount</label>
                <p className="font-semibold">{subscription.amount?.toFixed(2) || "0.00"}</p>
              </div>
              {subscription.tax1 && subscription.tax1 > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tax 1</label>
                  <p>{subscription.tax1.toFixed(2)}</p>
                </div>
              )}
              {subscription.tax2 && subscription.tax2 > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tax 2</label>
                  <p>{subscription.tax2.toFixed(2)}</p>
                </div>
              )}
              <div className="pt-2 border-t">
                <label className="text-sm font-medium text-muted-foreground">Total Amount</label>
                <p className="text-lg font-bold">{totalAmount.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created</label>
                <p>{subscription.createdAt ? new Date(subscription.createdAt).toLocaleDateString() : "-"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                <p>{subscription.updatedAt ? new Date(subscription.updatedAt).toLocaleDateString() : "-"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

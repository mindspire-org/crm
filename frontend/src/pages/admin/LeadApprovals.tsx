import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getAuthHeaders } from '@/lib/api/auth';
import { API_BASE } from '@/lib/api/base';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Building2, 
  Wallet,
  Coins,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';

interface Lead {
  _id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  expectedPrice: string;
  systemNeeded: string;
  status: string;
  approvalStatus: string;
  approvalRequestedAt: string;
  approvalRequestedBy: string;
  ownerId?: string;
  createdAt: string;
}

export default function LeadApprovals() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const loadPendingApprovals = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/leads/pending-approvals`, { headers });
      if (!res.ok) {
        if (res.status === 403) {
          toast.error("Access denied. Admin only.");
          return;
        }
        throw new Error("Failed to load pending approvals");
      }
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load pending approvals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingApprovals();
  }, []);

  const handleApprove = async (leadId: string) => {
    try {
      setApprovingId(leadId);
      const headers = getAuthHeaders({ "Content-Type": "application/json" });
      const res = await fetch(`${API_BASE}/api/leads/${leadId}/approve`, {
        method: "POST",
        headers,
      });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to approve" }));
        throw new Error(error.error || "Failed to approve lead");
      }
      
      const result = await res.json();
      toast.success(result.message || "Lead approved and converted to sale successfully");
      
      // Remove approved lead from list
      setLeads(prev => prev.filter(l => l._id !== leadId));
    } catch (error: any) {
      toast.error(error?.message || "Failed to approve lead");
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (leadId: string) => {
    try {
      setRejectingId(leadId);
      const headers = getAuthHeaders({ "Content-Type": "application/json" });
      const res = await fetch(`${API_BASE}/api/leads/${leadId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          approvalStatus: "rejected",
          status: "Discussion" // Reset to previous status
        }),
      });
      
      if (!res.ok) {
        throw new Error("Failed to reject lead");
      }
      
      toast.success("Lead rejected and sent back for review");
      
      // Remove rejected lead from list
      setLeads(prev => prev.filter(l => l._id !== leadId));
    } catch (error: any) {
      toast.error(error?.message || "Failed to reject lead");
    } finally {
      setRejectingId(null);
    }
  };

  const formatCurrency = (value: string | number | undefined) => {
    if (value === undefined || value === null || value === "") return "Rs 0";
    const num = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.]/g, ""));
    return isNaN(num) || num === 0 ? "Rs 0" : `Rs ${num.toLocaleString("en-PK")}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lead Approvals</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve leads marked as "Won" to convert them to sales
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={loadPendingApprovals}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
                <p className="text-2xl font-bold">{leads.length}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    leads
                      .reduce((sum, l) => sum + Number(l.expectedPrice?.replace(/[^0-9.]/g, "") || 0), 0)
                      .toString()
                  )}
                </p>
              </div>
              <div className="bg-green-200 p-3 rounded-full">
                <Wallet className="w-6 h-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Deal Size</p>
                <p className="text-2xl font-bold">
                  {leads.length > 0 
                    ? formatCurrency(
                        (leads.reduce((sum, l) => sum + Number(l.expectedPrice?.replace(/[^0-9.]/g, "") || 0), 0) / leads.length).toString()
                      )
                    : "Rs 0"
                  }
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals List */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-muted-foreground mt-4">Loading pending approvals...</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-semibold">All Caught Up!</h3>
              <p className="text-muted-foreground mt-2">
                No leads are currently pending approval.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {leads.map((lead) => (
                <div
                  key={lead._id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{lead.name}</h3>
                        <Badge variant="outline" className="text-yellow-600 bg-yellow-50">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending Approval
                        </Badge>
                      </div>
                      
                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          <span>{lead.company || "No Company"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>{lead.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Coins className="w-4 h-4" />
                          <span className="font-medium text-foreground">
                            Expected: {formatCurrency(lead.expectedPrice)}
                          </span>
                        </div>
                        {lead.systemNeeded && (
                          <div className="text-xs">
                            System: {lead.systemNeeded}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 text-xs text-muted-foreground">
                        Requested: {formatDate(lead.approvalRequestedAt)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedLead(lead);
                          setShowDetails(true);
                        }}
                      >
                        View Details
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleApprove(lead._id)}
                        disabled={approvingId === lead._id || rejectingId === lead._id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {approvingId === lead._id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-1" />
                        )}
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(lead._id)}
                        disabled={approvingId === lead._id || rejectingId === lead._id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {rejectingId === lead._id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4 mr-1" />
                        )}
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lead Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
            <DialogDescription>
              Review lead information before approving
            </DialogDescription>
          </DialogHeader>
          
          {selectedLead && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="font-medium">{selectedLead.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Company</label>
                  <p>{selectedLead.company || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p>{selectedLead.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <p>{selectedLead.phone || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Expected Price</label>
                  <p className="font-medium text-green-600">
                    {formatCurrency(selectedLead.expectedPrice)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">System Needed</label>
                  <p>{selectedLead.systemNeeded || "N/A"}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="text-sm font-medium text-muted-foreground">Approval Requested</label>
                <p>{formatDate(selectedLead.approvalRequestedAt)}</p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Close
            </Button>
            {selectedLead && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDetails(false);
                    handleReject(selectedLead._id);
                  }}
                  disabled={approvingId === selectedLead._id || rejectingId === selectedLead._id}
                  className="text-red-600"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    setShowDetails(false);
                    handleApprove(selectedLead._id);
                  }}
                  disabled={approvingId === selectedLead._id || rejectingId === selectedLead._id}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approve & Convert to Sale
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

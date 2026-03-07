import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Briefcase, Calendar, DollarSign, Clock } from "lucide-react";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";

type ProjectRequest = {
  _id: string;
  title: string;
  description: string;
  budget?: string;
  deadline?: string;
  status: "pending" | "approved" | "rejected" | "in_progress";
  createdAt: string;
  updatedAt: string;
};

export default function ProjectRequests() {
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", budget: "", deadline: "" });

  const loadRequests = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/client/project-requests`, { headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load requests");
      setRequests(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load requests");
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Title and description are required");
      return;
    }
    setSubmitting(true);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/client/project-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json())?.error || "Failed to submit request");
      toast.success("Project request submitted successfully!");
      setOpen(false);
      setForm({ title: "", description: "", budget: "", deadline: "" });
      loadRequests();
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    in_progress: "bg-blue-100 text-blue-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Project Requests</h1>
          <p className="text-sm text-muted-foreground">Submit and track your project requests.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New Project Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Enter project title"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe your project requirements"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="budget">Budget (optional)</Label>
                <Input
                  id="budget"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                  placeholder="e.g., $5,000"
                />
              </div>
              <div>
                <Label htmlFor="deadline">Deadline (optional)</Label>
                <DatePicker value={form.deadline} onChange={(v) => setForm({ ...form, deadline: v })} placeholder="Pick deadline" />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
                  {submitting ? "Submitting..." : "Submit Request"}
                </Button>
                <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {requests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Briefcase className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No project requests yet</p>
              <Button onClick={() => setOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Request
              </Button>
            </CardContent>
          </Card>
        ) : (
          requests.map((req) => (
            <Card key={req._id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{req.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Requested on {new Date(req.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge className={statusColors[req.status]}>
                  {req.status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">{req.description}</p>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {req.budget && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      {req.budget}
                    </div>
                  )}
                  {req.deadline && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(req.deadline).toLocaleDateString()}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Updated {new Date(req.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

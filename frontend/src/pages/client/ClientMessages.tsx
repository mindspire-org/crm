import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MessageSquare, ArrowRight, RefreshCw } from "lucide-react";
import { getAuthHeaders } from "@/lib/api/auth";
import { createProjectConversation } from "@/lib/api/messaging";
import { API_BASE } from "@/lib/api/base";

type ProjectDoc = {
  _id: string;
  title?: string;
  status?: string;
};

export default function ClientMessages() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectDoc[]>([]);
  const [projectId, setProjectId] = useState("");

  const loadProjects = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/client/projects`, { headers });
      const json = await res.json().catch(() => []);
      if (!res.ok) throw new Error(json?.error || "Failed to load projects");
      const arr = Array.isArray(json) ? json : [];
      setProjects(arr);
      if (!projectId && arr.length > 0) setProjectId(String(arr[0]._id));
    } catch (e: any) {
      toast.error(e?.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const openChat = async () => {
    if (!projectId) return toast.error("Select a project");
    try {
      const convo = await createProjectConversation(projectId);
      navigate(`/messages?conversationId=${encodeURIComponent(convo._id)}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to open chat");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Messages</h1>
          <p className="text-sm text-muted-foreground">Message your team per project.</p>
        </div>
        <Button variant="outline" onClick={loadProjects} disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Choose a Project</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.title || "Project"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end">
            <Button onClick={openChat} disabled={!projectId}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Open Chat
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

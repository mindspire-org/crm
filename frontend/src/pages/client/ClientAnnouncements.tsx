import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";

type AnnouncementDoc = {
  _id: string;
  title?: string;
  message?: string;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  isActive?: boolean;
  createdByName?: string;
};

const toIsoDate = (d?: any) => {
  try {
    if (!d) return "";
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return "";
  }
};

export default function ClientAnnouncements() {
  const [loading, setLoading] = useState(false);
  const [announcements, setAnnouncements] = useState<AnnouncementDoc[]>([]);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/client/announcements`, { headers });
      const json = await res.json().catch(() => []);
      if (!res.ok) throw new Error(json?.error || "Failed to load announcements");
      setAnnouncements(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Announcements</h1>
          <p className="text-sm text-muted-foreground">Updates from your team about your projects and account.</p>
        </div>
        <Button variant="outline" onClick={loadAnnouncements} disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {loading ? "Loading..." : "No announcements available"}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <Card key={a._id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{a.title || "Announcement"}</CardTitle>
                  <div className="text-xs text-muted-foreground">
                    {a.createdByName ? `${a.createdByName} • ` : ""}
                    {toIsoDate(a.createdAt || a.startDate)}
                  </div>
                </div>
                <Badge variant={a.isActive === false ? "secondary" : "default"}>{a.isActive === false ? "Inactive" : "Active"}</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-sm whitespace-pre-wrap">{a.message || ""}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

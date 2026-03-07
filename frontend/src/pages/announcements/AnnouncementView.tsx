import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE } from "@/lib/api/base";


const getAuthHeaders = () => {
  const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return { headers, token };
};

type Announcement = {
  _id: string;
  title: string;
  message?: string;
  createdByName?: string;
  createdAt?: string;
  startDate?: string;
  endDate?: string;
};

const toYmd = (v?: string) => {
  if (!v) return "";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
};

export default function AnnouncementView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const { headers, token } = getAuthHeaders();
        if (!token) {
          setError("Please login again.");
          navigate("/auth", { replace: true });
          return;
        }

        const res = await fetch(`${API_BASE}/api/announcements/${id}`, { headers });
        const json = await res.json().catch(() => null);
        if (res.status === 401) {
          setError("Session expired. Please login again.");
          navigate("/auth", { replace: true });
          return;
        }
        if (!res.ok) throw new Error(json?.error || `Failed to load announcement (HTTP ${res.status})`);
        setItem(json);
      } catch (e: any) {
        setError(String(e?.message || "Failed to load announcement"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-end">
        <Button variant="link" onClick={() => navigate("/announcements")}>← Announcements</Button>
      </div>

      <Card>
        <CardContent className="p-8">
          {loading && <div className="text-sm text-muted-foreground">Loading...</div>}
          {error && <div className="text-sm text-destructive">{error}</div>}

          {item && (
            <div className="space-y-3">
              <div className="text-3xl font-medium">{item.title}</div>
              <div className="text-sm text-muted-foreground">
                {toYmd(item.startDate || item.createdAt)}{item.createdByName ? `, ${item.createdByName}` : ""}
              </div>
              <div className="pt-2 text-sm leading-6 whitespace-pre-wrap">
                {item.message ? (
                  <div dangerouslySetInnerHTML={{ __html: item.message }} />
                ) : (
                  <span className="text-muted-foreground">No content</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuthHeaders } from "@/lib/api/auth";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "@/lib/api/base";

type TaskDoc = {
  _id: string;
  title?: string;
  status?: string;
  priority?: string;
  activity?: Array<{ _id?: string; type?: string; message?: string; authorName?: string; createdAt?: string }>;
};

type ActivityRow = {
  id: string;
  taskId: string;
  taskNo?: number;
  taskTitle: string;
  type?: string;
  message: string;
  authorName: string;
  createdAt?: string;
};

export default function TeamActivity() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState("");
  const [author, setAuthor] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (query.trim()) qs.set("q", query.trim());
      if (author.trim()) qs.set("author", author.trim());
      qs.set("limit", "200");

      const r = await fetch(`${API_BASE}/api/tasks/activity?${qs.toString()}`, { headers: getAuthHeaders() });
      if (r.ok) {
        const d = await r.json();
        const mapped: ActivityRow[] = (Array.isArray(d) ? d : []).map((x: any) => ({
          id: String(x.activityId || `${x.taskId}_${x.createdAt || x.message || Math.random()}`),
          taskId: String(x.taskId || ""),
          taskNo: typeof x.taskNo === "number" ? x.taskNo : undefined,
          taskTitle: String(x.taskTitle || "Task"),
          type: String(x.type || ""),
          message: String(x.message || ""),
          authorName: String(x.authorName || ""),
          createdAt: x.createdAt ? String(x.createdAt) : undefined,
        }));
        setItems(mapped);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg">Team Activity</CardTitle>
            <Button type="button" variant="outline" onClick={() => load()} disabled={loading}>Refresh</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <Input placeholder="Search tasks or messages" value={query} onChange={(e) => setQuery(e.target.value)} />
            <Input placeholder="Filter by author" value={author} onChange={(e) => setAuthor(e.target.value)} />
            <Button type="button" variant="outline" onClick={() => load()} disabled={loading}>Apply</Button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Loading activity…</div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No activity found</div>
          ) : (
            <div className="divide-y">
              {items.slice(0, 200).map((r) => (
                <div key={r.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm">
                      <span className="font-medium">{r.authorName || "Member"}</span>
                      <span className="text-muted-foreground"> on </span>
                      <button
                        type="button"
                        className="text-primary underline"
                        onClick={() => navigate(`/tasks/${r.taskId}`)}
                      >
                        {r.taskNo ? `#${r.taskNo} ` : ""}{r.taskTitle}
                      </button>
                    </div>
                    {r.message ? <div className="text-sm text-muted-foreground mt-0.5">{r.message}</div> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="whitespace-nowrap text-xs">
                      {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

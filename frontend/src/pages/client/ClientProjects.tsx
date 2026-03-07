import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { RefreshCw, FolderKanban } from "lucide-react";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";

type ProjectDoc = {
  _id: string;
  title?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  progress?: number;
  price?: number;
  labels?: string;
};

const toIsoDate = (d?: any) => {
  try {
    if (!d) return "";
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return "";
  }
};

export default function ClientProjects() {
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<ProjectDoc[]>([]);

  const load = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/client/projects`, { headers });
      const json = await res.json().catch(() => []);
      if (!res.ok) throw new Error(json?.error || "Failed to load projects");
      setProjects(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => {
      const title = String(p?.title || "").toLowerCase();
      const status = String(p?.status || "").toLowerCase();
      return title.includes(q) || status.includes(q);
    });
  }, [projects, query]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">View your projects and current status.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects..."
            className="w-[220px]"
          />
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="w-5 h-5" />
            Project List
          </CardTitle>
          <Badge variant="secondary">{filtered.length} total</Badge>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Label</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    {loading ? "Loading..." : "No projects found"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => {
                  const status = String(p?.status || "").trim();
                  const progress = typeof p?.progress === "number" ? Math.max(0, Math.min(100, Number(p.progress))) : undefined;
                  const firstLabel = String(p?.labels || "")
                    .split(",")
                    .map((x) => x.trim())
                    .filter(Boolean)[0];
                  return (
                    <TableRow key={p._id}>
                      <TableCell className="font-medium">{p.title || "Project"}</TableCell>
                      <TableCell>
                        <Badge variant={String(status).toLowerCase() === "completed" ? "default" : "secondary"}>
                          {status || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {progress == null ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <span>{progress}%</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {firstLabel ? <Badge className={(() => {
                          const l = String(firstLabel || "").trim().toLowerCase();
                          if (l === "low priority") return "bg-gray-100 text-gray-800 border-gray-200";
                          if (l === "normal") return "bg-blue-100 text-blue-800 border-blue-200";
                          if (l === "urgent") return "bg-orange-100 text-orange-800 border-orange-200";
                          if (l === "critical") return "bg-red-100 text-red-800 border-red-200";
                          return "bg-gray-100 text-gray-800 border-gray-200";
                        })()}>{firstLabel}</Badge> : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-right">${Number(p?.price || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{toIsoDate(p.updatedAt || p.createdAt)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

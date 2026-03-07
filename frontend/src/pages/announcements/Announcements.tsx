import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Edit, X, Plus } from "lucide-react";
import { API_BASE } from "@/lib/api/base";


const getAuthHeaders = () => {
  const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return { headers, token };
};

interface Announcement {
  _id: string;
  title: string;
  createdByName?: string;
  startDate?: string; // ISO
  endDate?: string; // ISO
  createdAt?: string;
}

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

const initialsFrom = (name?: string) => {
  const s = String(name || "").trim();
  if (!s) return "U";
  const parts = s.split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
};

export default function Announcements() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Announcement[]>([]);
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState("10");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentUserRole = () => {
    try {
      const raw = localStorage.getItem("auth_user") || sessionStorage.getItem("auth_user");
      if (!raw) return "admin";
      const u = JSON.parse(raw);
      return u?.role || "admin";
    } catch {
      return "admin";
    }
  };
  const role = getCurrentUserRole();

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);
      const { headers, token } = getAuthHeaders();
      if (!token) {
        setError("Please login again.");
        navigate("/auth", { replace: true });
        return;
      }

      const res = await fetch(`${API_BASE}/api/announcements`, { headers });
      const json = await res.json().catch(() => null);
      if (res.status === 401) {
        setError("Session expired. Please login again.");
        navigate("/auth", { replace: true });
        return;
      }
      if (!res.ok) throw new Error(json?.error || `Failed to fetch announcements (HTTP ${res.status})`);
      setItems(Array.isArray(json) ? json : []);
    } catch (e: any) {
      const msg = String(e?.message || "Failed to fetch announcements");
      if (msg.toLowerCase().includes("failed to fetch")) {
        setError(`Failed to fetch announcements. Backend reachable at ${API_BASE}? (Check server is running on port 5000 and CORS allows ${window.location.origin})`);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const list = useMemo(() => {
    const s = query.toLowerCase();
    return items.filter((i) => i.title.toLowerCase().includes(s) || String(i.createdByName || "").toLowerCase().includes(s));
  }, [items, query]);

  const remove = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const { headers, token } = getAuthHeaders();
      if (!token) {
        setError("Please login again.");
        navigate("/auth", { replace: true });
        return;
      }

      const res = await fetch(`${API_BASE}/api/announcements/${id}`, {
        method: "DELETE",
        headers,
      });
      const json = await res.json().catch(() => null);
      if (res.status === 401) {
        setError("Session expired. Please login again.");
        navigate("/auth", { replace: true });
        return;
      }
      if (!res.ok) throw new Error(json?.error || `Failed to delete announcement (HTTP ${res.status})`);
      setItems((prev) => prev.filter((i) => i._id !== id));
    } catch (e: any) {
      setError(String(e?.message || "Failed to delete announcement"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">Announcements</h1>
        {role === "admin" && (
          <Button size="sm" variant="outline" onClick={() => navigate("/announcements/new")}>
            <Plus className="w-4 h-4 mr-2" />
            Add announcement
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4">

            <div className="flex items-center justify-between gap-3 pb-3 border-b">
              <div />
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => window.print()}>Print</Button>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search" value={query} onChange={(e)=>setQuery(e.target.value)} className="pl-9 w-56" />
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-3 text-sm text-destructive">{error}</div>
            )}
            
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Title</TableHead>
                  <TableHead>Created by</TableHead>
                  <TableHead>Start date</TableHead>
                  <TableHead>End date</TableHead>
                  <TableHead className="w-14"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((a) => (
                  <TableRow key={a._id}>
                    <TableCell>
                      <button
                        type="button"
                        className="text-primary hover:underline text-left"
                        onClick={() => navigate(`/announcements/${a._id}`)}
                      >
                        {a.title}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="bg-gradient-to-br from-primary to-indigo text-white text-[10px]">{initialsFrom(a.createdByName)}</AvatarFallback>
                        </Avatar>
                        <span>{a.createdByName || ""}</span>
                      </div>
                    </TableCell>
                    <TableCell>{toYmd(a.startDate)}</TableCell>
                    <TableCell>{toYmd(a.endDate)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-sm"><Edit className="w-4 h-4"/></Button>
                        <Button variant="ghost" size="icon-sm" disabled={loading} onClick={()=>remove(a._id)}><X className="w-4 h-4"/></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between p-3 border-t">
              <div className="flex items-center gap-2 text-sm">
                <Select value={pageSize} onValueChange={setPageSize}>
                  <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span>1-{Math.min(parseInt(pageSize), list.length)} / {list.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">‹</Button>
                <Button variant="outline" size="sm">›</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

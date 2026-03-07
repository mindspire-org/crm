import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { RefreshCw, FileText } from "lucide-react";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";

type ProposalDoc = {
  _id: string;
  number?: number;
  title?: string;
  status?: string;
  amount?: number;
  proposalDate?: string;
  validUntil?: string;
  createdAt?: string;
  updatedAt?: string;
};

const toIsoDate = (d?: any) => {
  try {
    if (!d) return "";
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return "";
  }
};

export default function ClientProposals() {
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<ProposalDoc[]>([]);

  const load = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/client/proposals`, { headers });
      const json = await res.json().catch(() => []);
      if (!res.ok) throw new Error(json?.error || "Failed to load proposals");
      setRows(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load proposals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const num = String(r?.number ?? "").toLowerCase();
      const title = String(r?.title || "").toLowerCase();
      const status = String(r?.status || "").toLowerCase();
      return num.includes(q) || title.includes(q) || status.includes(q);
    });
  }, [rows, query]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Proposals</h1>
          <p className="text-sm text-muted-foreground">View proposals shared with you.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search proposals..." className="w-[220px]" />
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Proposal List
          </CardTitle>
          <Badge variant="secondary">{filtered.length} total</Badge>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proposal #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Date</TableHead>
                <TableHead className="text-right">Valid Until</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    {loading ? "Loading..." : "No proposals found"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r._id}>
                    <TableCell className="font-medium">{r.number != null ? `PR-${String(r.number).padStart(4, "0")}` : "-"}</TableCell>
                    <TableCell>{r.title || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={String(r?.status || "").toLowerCase() === "accepted" ? "default" : "secondary"}>
                        {r.status || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">${Number(r.amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{toIsoDate(r.proposalDate || r.createdAt)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{toIsoDate(r.validUntil)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

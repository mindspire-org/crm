import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import ReportsNav from "../ReportsNav";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";

export default function LeadsConversions() {
  const [owner, setOwner] = useState("-");
  const [source, setSource] = useState("-");
  const [mode, setMode] = useState("Conversion date wise");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [cursor, setCursor] = useState(new Date());

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/leads`, { headers: getAuthHeaders() });
        const data = res.ok ? await res.json() : [];
        setLeads(Array.isArray(data) ? data : []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const normalize = (s?: string) => (s || "").toLowerCase();
  const ymLabel = useMemo(() => cursor.toLocaleString(undefined, { month: "long", year: "numeric" }), [cursor]);
  const inMonth = (d?: string) => {
    if (!d) return false;
    const x = new Date(d);
    return x.getFullYear() === cursor.getFullYear() && x.getMonth() === cursor.getMonth();
  };
  const filtered = useMemo(() => {
    const q = normalize(query);
    return leads.filter((l) => {
      const okMonth = inMonth(l?.createdAt);
      const okOwner = owner === "-" || normalize(l?.ownerId) === normalize(owner);
      const okSource = source === "-" || normalize(l?.source) === normalize(source);
      const text = `${l?.name || ""} ${l?.company || ""} ${l?.email || ""} ${l?.phone || ""} ${l?.status || ""}`;
      const okQ = !q || normalize(text).includes(q);
      return okMonth && okOwner && okSource && okQ;
    });
  }, [leads, owner, source, query, cursor]);
  const agg = useMemo(() => {
    const isWon = (s?: string) => normalize(s).includes("won");
    const isLost = (s?: string) => normalize(s).includes("lost");
    const isConverted = (s?: string) => normalize(s).includes("convert") || normalize(s).includes("client");
    const total = filtered.length;
    const won = filtered.filter((l) => isWon(l?.status)).length;
    const lost = filtered.filter((l) => isLost(l?.status)).length;
    const converted = filtered.filter((l) => isConverted(l?.status)).length;
    return { total, won, lost, converted };
  }, [filtered]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-sm text-muted-foreground">Leads</h1>
      </div>
      <ReportsNav />

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={owner} onValueChange={setOwner}>
                <SelectTrigger className="w-40"><SelectValue placeholder="- Owner -"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">- Owner -</SelectItem>
                </SelectContent>
              </Select>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="w-40"><SelectValue placeholder="- Source -"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">- Source -</SelectItem>
                </SelectContent>
              </Select>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Conversion date wise"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Conversion date wise">Conversion date wise</SelectItem>
                </SelectContent>
              </Select>
              <div className="inline-flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={()=>setCursor(new Date(cursor.getFullYear(), cursor.getMonth()-1, 1))}><ChevronLeft className="w-4 h-4"/></Button>
                <span className="text-sm text-muted-foreground">{ymLabel}</span>
                <Button variant="outline" size="icon" onClick={()=>setCursor(new Date(cursor.getFullYear(), cursor.getMonth()+1, 1))}><ChevronRight className="w-4 h-4"/></Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search" value={query} onChange={(e)=>setQuery(e.target.value)} className="pl-9 w-56" />
              </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Lead</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground"><div className="h-9 animate-pulse rounded bg-muted/50"/></TableCell></TableRow>
              ) : filtered.length ? (
                <>
                  {filtered.map((l) => (
                    <TableRow key={String(l._id)}>
                      <TableCell className="whitespace-nowrap">{l?.name || '-'}</TableCell>
                      <TableCell className="whitespace-nowrap">{l?.company || '-'}</TableCell>
                      <TableCell className="whitespace-nowrap">{l?.status || '-'}</TableCell>
                      <TableCell className="whitespace-nowrap">{l?.source || '-'}</TableCell>
                      <TableCell className="whitespace-nowrap">{l?.createdAt ? new Date(l.createdAt).toLocaleDateString() : '-'}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/30 font-medium">
                    <TableCell colSpan={5}>
                      Total: {agg.total} • Converted: {agg.converted} • Won: {agg.won} • Lost: {agg.lost}
                    </TableCell>
                  </TableRow>
                </>
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">No record found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

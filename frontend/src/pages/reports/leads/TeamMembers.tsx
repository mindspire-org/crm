import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import ReportsNav from "../ReportsNav";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";

export default function LeadsTeamMembers() {
  const [source, setSource] = useState("-");
  const [label, setLabel] = useState("-");
  const [owner, setOwner] = useState("-");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);

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
  const isNew = (s?: string) => normalize(s) === "new";
  const isQualified = (s?: string) => normalize(s).includes("qualif");
  const isDiscussion = (s?: string) => normalize(s).includes("discuss");
  const isNegotiation = (s?: string) => normalize(s).includes("negoti");
  const isWon = (s?: string) => normalize(s).includes("won");
  const isLost = (s?: string) => normalize(s).includes("lost");
  const isConverted = (s?: string) => normalize(s).includes("convert") || normalize(s).includes("client");

  const ownerOptions = useMemo(() => {
    const s = new Set<string>(["-"]);
    for (const l of leads) if (l?.ownerId) s.add(String(l.ownerId));
    return Array.from(s.values());
  }, [leads]);

  const sourceOptions = useMemo(() => {
    const s = new Set<string>(["-"]);
    for (const l of leads) if (l?.source) s.add(String(l.source));
    return Array.from(s.values());
  }, [leads]);

  const labelOptions = useMemo(() => {
    const s = new Set<string>(["-"]);
    for (const l of leads) {
      const arr: any[] = Array.isArray(l?.labels) ? l.labels : [];
      for (const x of arr) if (x) s.add(String(x));
    }
    return Array.from(s.values());
  }, [leads]);

  const rows = useMemo(() => {
    const q = normalize(query);
    const m = new Map<string, { owner: string; newC: number; qualified: number; discussion: number; negotiation: number; won: number; lost: number; converted: number }>();
    const filtered = leads.filter((l) => {
      const okOwner = owner === "-" || normalize(l?.ownerId) === normalize(owner);
      const okSource = source === "-" || normalize(l?.source) === normalize(source);
      const okLabel = label === "-" || (Array.isArray(l?.labels) && l.labels.some((x:any)=> normalize(x) === normalize(label)));
      const text = `${l?.name || ""} ${l?.company || ""} ${l?.email || ""} ${l?.phone || ""} ${l?.status || ""}`;
      const okQ = !q || normalize(text).includes(q);
      return okOwner && okSource && okLabel && okQ;
    });
    for (const l of filtered) {
      const key = String(l?.ownerId || "-");
      const row = m.get(key) || { owner: key, newC: 0, qualified: 0, discussion: 0, negotiation: 0, won: 0, lost: 0, converted: 0 };
      const s = l?.status as string | undefined;
      if (isNew(s)) row.newC += 1;
      if (isQualified(s)) row.qualified += 1;
      if (isDiscussion(s)) row.discussion += 1;
      if (isNegotiation(s)) row.negotiation += 1;
      if (isWon(s)) row.won += 1;
      if (isLost(s)) row.lost += 1;
      if (isConverted(s)) row.converted += 1;
      m.set(key, row);
    }
    return Array.from(m.values()).sort((a,b)=> (b.qualified + b.discussion + b.negotiation + b.won + b.lost + b.newC) - (a.qualified + a.discussion + a.negotiation + a.won + a.lost + a.newC));
  }, [leads, owner, source, label, query]);

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
              <Button variant="outline" size="icon">▦</Button>
              <Select value={owner} onValueChange={setOwner}>
                <SelectTrigger className="w-40"><SelectValue placeholder="- Owner -"/></SelectTrigger>
                <SelectContent>
                  {ownerOptions.map(opt => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="w-40"><SelectValue placeholder="- Source -"/></SelectTrigger>
                <SelectContent>
                  {sourceOptions.map(opt => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={label} onValueChange={setLabel}>
                <SelectTrigger className="w-40"><SelectValue placeholder="- Label -"/></SelectTrigger>
                <SelectContent>
                  {labelOptions.map(opt => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}
                </SelectContent>
              </Select>
              <Button variant="outline">Created date</Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">Excel</Button>
              <Button variant="outline" size="sm">Print</Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search" value={query} onChange={(e)=>setQuery(e.target.value)} className="pl-9 w-56" />
              </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Owner</TableHead>
                <TableHead>New</TableHead>
                <TableHead>Qualified</TableHead>
                <TableHead>Discussion</TableHead>
                <TableHead>Negotiation</TableHead>
                <TableHead>Won</TableHead>
                <TableHead>Lost</TableHead>
                <TableHead>Converted to client</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground"><div className="h-9 animate-pulse rounded bg-muted/50"/></TableCell></TableRow>
              ) : rows.length ? (
                <>
                  {rows.map(r => (
                    <TableRow key={r.owner}>
                      <TableCell className="whitespace-nowrap">{r.owner}</TableCell>
                      <TableCell>{r.newC}</TableCell>
                      <TableCell>{r.qualified}</TableCell>
                      <TableCell>{r.discussion}</TableCell>
                      <TableCell>{r.negotiation}</TableCell>
                      <TableCell>{r.won}</TableCell>
                      <TableCell>{r.lost}</TableCell>
                      <TableCell>{r.converted}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/30 font-medium">
                    <TableCell>Total</TableCell>
                    <TableCell>{rows.reduce((s,r)=>s+r.newC,0)}</TableCell>
                    <TableCell>{rows.reduce((s,r)=>s+r.qualified,0)}</TableCell>
                    <TableCell>{rows.reduce((s,r)=>s+r.discussion,0)}</TableCell>
                    <TableCell>{rows.reduce((s,r)=>s+r.negotiation,0)}</TableCell>
                    <TableCell>{rows.reduce((s,r)=>s+r.won,0)}</TableCell>
                    <TableCell>{rows.reduce((s,r)=>s+r.lost,0)}</TableCell>
                    <TableCell>{rows.reduce((s,r)=>s+r.converted,0)}</TableCell>
                  </TableRow>
                </>
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">No record found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

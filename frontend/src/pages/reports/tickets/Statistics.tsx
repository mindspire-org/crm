import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import ReportsNav from "../ReportsNav";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { API_BASE } from "@/lib/api/base";

export default function TicketsStatistics() {
  const [type, setType] = useState("-");
  const [assigned, setAssigned] = useState("-");
  const [label, setLabel] = useState("-");
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/tickets`);
        const data = res.ok ? await res.json() : [];
        setTickets(Array.isArray(data) ? data : []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const normalize = (s?: string) => (s || "").toLowerCase();
  const ymLabel = useMemo(() => cursor.toLocaleString(undefined, { month: "long", year: "numeric" }), [cursor]);
  const inMonth = (d?: string) => {
    if (!d) return false; const x = new Date(d); return x.getFullYear() === cursor.getFullYear() && x.getMonth() === cursor.getMonth();
  };
  const typeOptions = useMemo(() => {
    const s = new Set<string>(["-"]); for (const t of tickets) if (t?.type) s.add(String(t.type)); return Array.from(s.values());
  }, [tickets]);
  const assignedOptions = useMemo(() => {
    const s = new Set<string>(["-"]); for (const t of tickets) if (t?.assignedTo) s.add(String(t.assignedTo)); return Array.from(s.values());
  }, [tickets]);
  const labelOptions = useMemo(() => {
    const s = new Set<string>(["-"]); for (const t of tickets) { const arr: any[] = Array.isArray(t?.labels) ? t.labels : []; for (const x of arr) if (x) s.add(String(x)); } return Array.from(s.values());
  }, [tickets]);

  const rows = useMemo(() => {
    const q = normalize(query);
    const filtered = tickets.filter((t) => {
      const okMonth = inMonth(t?.createdAt);
      const okType = type === "-" || normalize(t?.type) === normalize(type);
      const okAssigned = assigned === "-" || normalize(t?.assignedTo) === normalize(assigned);
      const okLabel = label === "-" || (Array.isArray(t?.labels) && t.labels.some((x:any)=> normalize(x) === normalize(label)));
      const text = `${t?.title || ""} ${t?.client || ""} ${t?.type || ""} ${(Array.isArray(t?.labels) ? t.labels.join(" ") : "")}`;
      const okQ = !q || normalize(text).includes(q);
      return okMonth && okType && okAssigned && okLabel && okQ;
    });
    const total = filtered.length;
    const byType = new Map<string, number>();
    for (const t of filtered) { const k = String(t?.type || "-"); byType.set(k, (byType.get(k)||0)+1); }
    return { filtered, total, byType };
  }, [tickets, query, type, assigned, label, cursor]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-sm text-muted-foreground">Tickets</h1>
      </div>
      <ReportsNav />

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-40"><SelectValue placeholder="- Ticket type -"/></SelectTrigger>
              <SelectContent>
                {typeOptions.map(opt => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={assigned} onValueChange={setAssigned}>
              <SelectTrigger className="w-40"><SelectValue placeholder="- Assigned to -"/></SelectTrigger>
              <SelectContent>
                {assignedOptions.map(opt => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={label} onValueChange={setLabel}>
              <SelectTrigger className="w-40"><SelectValue placeholder="- Label -"/></SelectTrigger>
              <SelectContent>
                {labelOptions.map(opt => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}
              </SelectContent>
            </Select>
            <div className="inline-flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={()=>setCursor(new Date(cursor.getFullYear(), cursor.getMonth()-1, 1))}><ChevronLeft className="w-4 h-4"/></Button>
              <span className="text-sm text-muted-foreground">{ymLabel}</span>
              <Button variant="outline" size="icon" onClick={()=>setCursor(new Date(cursor.getFullYear(), cursor.getMonth()+1, 1))}><ChevronRight className="w-4 h-4"/></Button>
            </div>
            <Input placeholder="Search" className="w-56" value={query} onChange={(e)=>setQuery(e.target.value)} />
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/20 p-3 text-sm">
              Total tickets: <b>{rows.total}</b> • By type: {Array.from(rows.byType.entries()).map(([k,v])=>`${k}: ${v}`).join(" | ") || '-'}
            </div>
            <div className="rounded-lg border bg-muted/10 p-3 text-sm">
              {loading ? (
                <div className="h-9 animate-pulse rounded bg-muted/40" />
              ) : rows.filtered.length ? (
                <ul className="text-sm list-disc pl-5">
                  {rows.filtered.slice(0,20).map(t => (
                    <li key={String(t._id)} className="truncate">#{t.ticketNo || '-'} • {t.title || '-'} • {t.type || '-'} • {t.client || '-'} • {t.createdAt ? new Date(t.createdAt).toLocaleString() : '-'}</li>
                  ))}
                </ul>
              ) : (
                <div className="text-muted-foreground">No record found.</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

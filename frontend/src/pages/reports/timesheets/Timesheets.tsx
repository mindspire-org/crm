import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import ReportsNav from "../ReportsNav";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";

export default function TimesheetsReport() {
  const [member, setMember] = useState("-");
  const [project, setProject] = useState("-");
  const [client, setClient] = useState("-");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("details");
  const [dateFrom, setDateFrom] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10));
  const [dateTo, setDateTo] = useState<string>(new Date().toISOString().slice(0,10));
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);


  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [tRes, pRes] = await Promise.all([
          fetch(`${API_BASE}/api/tasks`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/api/projects`, { headers: getAuthHeaders() }),
        ]);
        const tData = tRes.ok ? await tRes.json() : [];
        const pData = pRes.ok ? await pRes.json() : [];
        setTasks(Array.isArray(tData) ? tData : []);
        setProjects(Array.isArray(pData) ? pData : []);
      } catch {
        setTasks([]);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const projectById = useMemo(() => {
    const m = new Map<string, any>();
    for (const p of projects) if (p?._id) m.set(String(p._id), p);
    return m;
  }, [projects]);

  const memberOptions = useMemo(() => {
    const s = new Set<string>(["-"]);
    for (const t of tasks) {
      const arr: any[] = Array.isArray(t?.assignees) ? t.assignees : [];
      for (const a of arr) if (a?.name) s.add(String(a.name));
    }
    return Array.from(s.values());
  }, [tasks]);

  const projectOptions = useMemo(() => {
    const s = new Set<string>(["-"]);
    for (const t of tasks) if (t?.projectTitle) s.add(String(t.projectTitle));
    return Array.from(s.values());
  }, [tasks]);

  const clientOptions = useMemo(() => {
    const s = new Set<string>(["-"]);
    for (const p of projects) if (p?.client) s.add(String(p.client));
    return Array.from(s.values());
  }, [projects]);

  const normalize = (s?: string) => (s || "").toLowerCase();

  const filteredRows = useMemo(() => {
    const q = normalize(query);
    const from = dateFrom ? new Date(dateFrom) : undefined;
    const to = dateTo ? new Date(dateTo) : undefined;
    return tasks
      .filter((t) => {
        const createdAt = t?.createdAt ? new Date(t.createdAt) : undefined;
        if (from && createdAt && createdAt < from) return false;
        if (to && createdAt && createdAt > to) return false;
        const assignees: any[] = Array.isArray(t?.assignees) ? t.assignees : [];
        const hasMember = member === "-" || assignees.some((a) => normalize(a?.name) === normalize(member));
        const hasProject = project === "-" || normalize(t?.projectTitle) === normalize(project);
        const proj = t?.projectId ? projectById.get(String(t.projectId)) : undefined;
        const hasClient = client === "-" || normalize(proj?.client) === normalize(client);
        const text = `${t?.title || ""} ${t?.description || ""} ${t?.projectTitle || ""} ${assignees.map(a=>a?.name).join(" ")}`;
        const matches = !q || normalize(text).includes(q);
        return hasMember && hasProject && hasClient && matches;
      })
      .map((t) => {
        const assignees: any[] = Array.isArray(t?.assignees) ? t.assignees : [];
        const proj = t?.projectId ? projectById.get(String(t.projectId)) : undefined;
        const start = t?.createdAt ? new Date(t.createdAt) : undefined;
        const end = t?.deadline ? new Date(t.deadline) : undefined;
        const totalHours = start && end ? Math.max(0, (end.getTime() - start.getTime()) / (1000*60*60)) : 0;
        return {
          id: String(t?._id || Math.random()),
          member: assignees.map((a)=>a?.name).filter(Boolean).join(", ") || "-",
          project: t?.projectTitle || "-",
          client: proj?.client || "-",
          task: t?.title || "-",
          start: start ? start.toLocaleString() : "-",
          end: end ? end.toLocaleString() : "-",
          total: totalHours.toFixed(2),
        };
      });
  }, [tasks, projects, member, project, client, query, dateFrom, dateTo, projectById]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-sm text-muted-foreground">Timesheets</h1>
      </div>
      <ReportsNav />

      <Card>
        <CardContent className="p-4">
          <Tabs value={tab} onValueChange={setTab}>
            <div className="flex items-center justify-between mb-3">
              <TabsList className="bg-muted/40">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="chart">Chart</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">Excel</Button>
                <Button variant="outline" size="sm">Print</Button>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search" value={query} onChange={(e)=>setQuery(e.target.value)} className="pl-9 w-56" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap mb-3">
              <Button variant="outline" size="icon">▦</Button>
              <Select value={member} onValueChange={setMember}>
                <SelectTrigger className="w-40"><SelectValue placeholder="- Member -"/></SelectTrigger>
                <SelectContent>
                  {memberOptions.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={project} onValueChange={setProject}>
                <SelectTrigger className="w-40"><SelectValue placeholder="- Project -"/></SelectTrigger>
                <SelectContent>
                  {projectOptions.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={client} onValueChange={setClient}>
                <SelectTrigger className="w-40"><SelectValue placeholder="- Client -"/></SelectTrigger>
                <SelectContent>
                  {clientOptions.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="w-44">
                <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="From" />
              </div>
              <span className="text-sm text-muted-foreground">Date</span>
              <div className="w-44">
                <DatePicker value={dateTo} onChange={setDateTo} placeholder="To" />
              </div>
            </div>

            <TabsContent value="details">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Member</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Start time</TableHead>
                    <TableHead>End time</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground"><div className="h-9 animate-pulse rounded bg-muted/50"/></TableCell></TableRow>
                  ) : filteredRows.length ? (
                    <>
                      {filteredRows.map(r => (
                        <TableRow key={r.id}>
                          <TableCell>{r.member}</TableCell>
                          <TableCell>{r.project}</TableCell>
                          <TableCell>{r.client}</TableCell>
                          <TableCell>{r.task}</TableCell>
                          <TableCell>{r.start}</TableCell>
                          <TableCell>{r.end}</TableCell>
                          <TableCell>{r.total} h</TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/30 font-medium">
                        <TableCell colSpan={6}>Total</TableCell>
                        <TableCell>{filteredRows.reduce((s,r)=>s+Number(r.total||0),0).toFixed(2)} h</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">No record found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="summary">
              <div className="h-48 rounded-lg border bg-muted/20 flex items-center justify-center text-sm text-muted-foreground">
                Total hours: {filteredRows.reduce((s,r)=>s+Number(r.total||0),0).toFixed(2)}
              </div>
            </TabsContent>
            <TabsContent value="chart">
              <div className="h-64 rounded-lg border bg-muted/20 flex items-center justify-center text-sm text-muted-foreground">Chart placeholder</div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

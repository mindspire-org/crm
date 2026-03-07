import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import ReportsNav from "../ReportsNav";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";

export default function ProjectsTeamMembers() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("team");
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/projects`, { headers: getAuthHeaders() });
        const data = res.ok ? await res.json() : [];
        setProjects(Array.isArray(data) ? data : []);
      } catch {
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Helpers
  const norm = (s?: string) => (s || "").toLowerCase();
  const isCompleted = (s?: string) => norm(s).includes("complete");
  const isHold = (s?: string) => norm(s).includes("hold");
  const isInProgress = (s?: string) => norm(s).includes("progress");

  // Aggregation: by team member
  const teamAgg = useMemo(() => {
    const map = new Map<string, { name: string; open: number; inProgress: number; completed: number; hold: number; openTasks: number; completedTasks: number; totalTime: number; totalHours: number }>();
    for (const p of projects) {
      const status = p?.status as string | undefined;
      const arr: string[] = Array.isArray(p?.members) ? p.members : [];
      const inc = (row: any) => {
        if (isCompleted(status)) row.completed += 1;
        else if (isHold(status)) row.hold += 1;
        else if (isInProgress(status)) row.inProgress += 1;
        else row.open += 1;
      };
      if (!arr.length) continue;
      for (const m of arr) {
        const name = String(m || "-");
        const row = map.get(name) || { name, open: 0, inProgress: 0, completed: 0, hold: 0, openTasks: 0, completedTasks: 0, totalTime: 0, totalHours: 0 };
        inc(row);
        map.set(name, row);
      }
    }
    const q = norm(query);
    return Array.from(map.values())
      .filter((r) => !q || norm(r.name).includes(q))
      .sort((a, b) => (b.open + b.inProgress + b.completed + b.hold) - (a.open + a.inProgress + a.completed + a.hold));
  }, [projects, query]);

  // Aggregation: by client
  const clientsAgg = useMemo(() => {
    const map = new Map<string, { client: string; open: number; inProgress: number; completed: number; hold: number; openTasks: number; completedTasks: number; totalTime: number; totalHours: number }>();
    for (const p of projects) {
      const status = p?.status as string | undefined;
      const key = String(p?.client || "-");
      const row = map.get(key) || { client: key, open: 0, inProgress: 0, completed: 0, hold: 0, openTasks: 0, completedTasks: 0, totalTime: 0, totalHours: 0 };
      if (isCompleted(status)) row.completed += 1;
      else if (isHold(status)) row.hold += 1;
      else if (isInProgress(status)) row.inProgress += 1;
      else row.open += 1;
      map.set(key, row);
    }
    const q = norm(query);
    return Array.from(map.values())
      .filter((r) => !q || norm(r.client).includes(q))
      .sort((a, b) => (b.open + b.inProgress + b.completed + b.hold) - (a.open + a.inProgress + a.completed + a.hold));
  }, [projects, query]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-sm text-muted-foreground">Projects</h1>
      </div>
      <ReportsNav />

      <Card>
        <CardContent className="p-4">
          <Tabs value={tab} onValueChange={setTab}>
            <div className="flex items-center justify-between mb-3">
              <TabsList className="bg-muted/40">
                <TabsTrigger value="team">Team members summary</TabsTrigger>
                <TabsTrigger value="clients">Clients summary</TabsTrigger>
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

            <div className="flex items-center gap-2 mb-3">
              <Button variant="outline" size="icon">▦</Button>
              <Button variant="outline">Project start date</Button>
            </div>

            <TabsContent value="team">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Team member</TableHead>
                    <TableHead>Open Projects</TableHead>
                    <TableHead>In Progress Projects</TableHead>
                    <TableHead>Completed Projects</TableHead>
                    <TableHead>Hold Projects</TableHead>
                    <TableHead>Open Tasks</TableHead>
                    <TableHead>Completed Tasks</TableHead>
                    <TableHead>Total time logged</TableHead>
                    <TableHead>Total time logged (Hours)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground"><div className="h-9 animate-pulse rounded bg-muted/50"/></TableCell></TableRow>
                  ) : teamAgg.length ? (
                    <>
                      {teamAgg.map(r => (
                        <TableRow key={r.name}>
                          <TableCell className="whitespace-nowrap">{r.name}</TableCell>
                          <TableCell>{r.open}</TableCell>
                          <TableCell>{r.inProgress}</TableCell>
                          <TableCell>{r.completed}</TableCell>
                          <TableCell>{r.hold}</TableCell>
                          <TableCell>{r.openTasks}</TableCell>
                          <TableCell>{r.completedTasks}</TableCell>
                          <TableCell>{r.totalTime}</TableCell>
                          <TableCell>{r.totalHours}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/30 font-medium">
                        <TableCell>Total</TableCell>
                        <TableCell>{teamAgg.reduce((s,r)=>s+r.open,0)}</TableCell>
                        <TableCell>{teamAgg.reduce((s,r)=>s+r.inProgress,0)}</TableCell>
                        <TableCell>{teamAgg.reduce((s,r)=>s+r.completed,0)}</TableCell>
                        <TableCell>{teamAgg.reduce((s,r)=>s+r.hold,0)}</TableCell>
                        <TableCell>{teamAgg.reduce((s,r)=>s+r.openTasks,0)}</TableCell>
                        <TableCell>{teamAgg.reduce((s,r)=>s+r.completedTasks,0)}</TableCell>
                        <TableCell>{teamAgg.reduce((s,r)=>s+r.totalTime,0)}</TableCell>
                        <TableCell>{teamAgg.reduce((s,r)=>s+r.totalHours,0)}</TableCell>
                      </TableRow>
                    </>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">No record found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="clients">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Client</TableHead>
                    <TableHead>Open Projects</TableHead>
                    <TableHead>In Progress Projects</TableHead>
                    <TableHead>Completed Projects</TableHead>
                    <TableHead>Hold Projects</TableHead>
                    <TableHead>Open Tasks</TableHead>
                    <TableHead>Completed Tasks</TableHead>
                    <TableHead>Total time logged</TableHead>
                    <TableHead>Total time logged (Hours)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground"><div className="h-9 animate-pulse rounded bg-muted/50"/></TableCell></TableRow>
                  ) : clientsAgg.length ? (
                    <>
                      {clientsAgg.map(r => (
                        <TableRow key={r.client}>
                          <TableCell className="whitespace-nowrap">{r.client}</TableCell>
                          <TableCell>{r.open}</TableCell>
                          <TableCell>{r.inProgress}</TableCell>
                          <TableCell>{r.completed}</TableCell>
                          <TableCell>{r.hold}</TableCell>
                          <TableCell>{r.openTasks}</TableCell>
                          <TableCell>{r.completedTasks}</TableCell>
                          <TableCell>{r.totalTime}</TableCell>
                          <TableCell>{r.totalHours}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/30 font-medium">
                        <TableCell>Total</TableCell>
                        <TableCell>{clientsAgg.reduce((s,r)=>s+r.open,0)}</TableCell>
                        <TableCell>{clientsAgg.reduce((s,r)=>s+r.inProgress,0)}</TableCell>
                        <TableCell>{clientsAgg.reduce((s,r)=>s+r.completed,0)}</TableCell>
                        <TableCell>{clientsAgg.reduce((s,r)=>s+r.hold,0)}</TableCell>
                        <TableCell>{clientsAgg.reduce((s,r)=>s+r.openTasks,0)}</TableCell>
                        <TableCell>{clientsAgg.reduce((s,r)=>s+r.completedTasks,0)}</TableCell>
                        <TableCell>{clientsAgg.reduce((s,r)=>s+r.totalTime,0)}</TableCell>
                        <TableCell>{clientsAgg.reduce((s,r)=>s+r.totalHours,0)}</TableCell>
                      </TableRow>
                    </>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">No record found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

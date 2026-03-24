import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, RefreshCw, Plus, Calendar, BarChart3, Clock, Users, Target, LayoutGrid, TrendingUp, Activity, Sparkles } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";

interface TaskBar {
  id: string;
  title: string;
  start: string; // yyyy-mm-dd
  end: string;   // yyyy-mm-dd
  projectId?: string;
}
export default function Timeline() {
  const navigate = useNavigate();
  const [groupBy, setGroupBy] = useState("none");
  const [project, setProject] = useState("-");
  const [assignee, setAssignee] = useState("-");
  const [milestone, setMilestone] = useState("-");
  const [bars, setBars] = useState<TaskBar[]>([]);
  const [projects, setProjects] = useState<{ _id: string; title: string; labels?: string }[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  type ViewMode = 'days' | 'weeks' | 'months';
  const [viewMode, setViewMode] = useState<ViewMode>('days');
  const [startDate, setStartDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const period = useMemo(() => {
    const s = new Date(startDate);
    if (viewMode === 'days') {
      const end = new Date(s.getFullYear(), s.getMonth() + 1, 0);
      const days = Array.from({ length: end.getDate() }, (_, i) => new Date(s.getFullYear(), s.getMonth(), i + 1));
      return { unit: 'day' as const, columns: days, end };
    }
    if (viewMode === 'weeks') {
      const days: Date[] = [];
      const end = new Date(s);
      end.setDate(end.getDate() + 7 * 8 - 1); // 8 weeks
      for (let d = new Date(s); d <= end; d.setDate(d.getDate() + 7)) days.push(new Date(d));
      return { unit: 'week' as const, columns: days, end };
    }
    // months
    const days: Date[] = [];
    const end = new Date(s.getFullYear(), s.getMonth() + 12, 0);
    for (let i = 0; i < 12; i++) days.push(new Date(s.getFullYear(), s.getMonth() + i, 1));
    return { unit: 'month' as const, columns: days, end };
  }, [startDate, viewMode]);

  const colWidth = viewMode === 'days' ? 28 : viewMode === 'weeks' ? 84 : 120;
  const labelColWidth = 220;

  const refreshProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/projects`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json().catch(() => []);
      const arr: any[] = Array.isArray(data) ? data : [];
      const firstLabelOf = (d: any) => {
        const raw = typeof d?.labels === "string" ? d.labels : Array.isArray(d?.labels) ? d.labels.join(", ") : "";
        const first = String(raw || "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)[0];
        return first;
      };
      const mapped: TaskBar[] = arr
        .filter((d: any) => d.start && d.deadline)
        .map((d: any) => ({
          id: String(d._id || ""),
          title: (() => {
            const label = firstLabelOf(d);
            const base = d.title || "-";
            return label ? `${base} • ${label}` : base;
          })(),
          start: new Date(d.start).toISOString().slice(0, 10),
          end: new Date(d.deadline).toISOString().slice(0, 10),
          projectId: String(d._id || ""),
        }));
      setBars(mapped);
      setProjects(arr.map((p: any) => ({ _id: String(p._id), title: p.title || "-", labels: typeof p?.labels === "string" ? p.labels : Array.isArray(p?.labels) ? p.labels.join(", ") : "" })));
    } catch {
    }
  };

  useEffect(() => {
    (async () => {
      await refreshProjects();
    })();
  }, []);

  // Load tasks; refetch when project filter changes
  useEffect(() => {
    (async () => {
      try {
        const url = project !== '-' ? `${API_BASE}/api/tasks?projectId=${encodeURIComponent(project)}` : `${API_BASE}/api/tasks`;
        const res = await fetch(url, { headers: getAuthHeaders() });
        const data = await res.json().catch(()=>[]);
        setTasks(Array.isArray(data) ? data : []);
      } catch { setTasks([]); }
    })();
  }, [project]);

  const movePrev = () => {
    const s = new Date(startDate);
    if (viewMode === 'days') setStartDate(new Date(s.getFullYear(), s.getMonth() - 1, 1));
    else if (viewMode === 'weeks') setStartDate(new Date(s.getFullYear(), s.getMonth(), s.getDate() - 7 * 8));
    else setStartDate(new Date(s.getFullYear(), s.getMonth() - 12, 1));
  };
  const moveNext = () => {
    const s = new Date(startDate);
    if (viewMode === 'days') setStartDate(new Date(s.getFullYear(), s.getMonth() + 1, 1));
    else if (viewMode === 'weeks') setStartDate(new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7 * 8));
    else setStartDate(new Date(s.getFullYear(), s.getMonth() + 12, 1));
  };
  const jumpToday = () => setStartDate(new Date(new Date().getFullYear(), new Date().getMonth(), viewMode==='weeks'?1:1));

  // Derived filter options from tasks
  const assignees = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks) {
      if (Array.isArray(t.assignees)) for (const a of t.assignees) if (a?.name) set.add(String(a.name));
      if (t.assignedTo) set.add(String(t.assignedTo));
    }
    return Array.from(set).sort((a,b)=>a.localeCompare(b));
  }, [tasks]);

  const milestones = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks) {
      const m = t.milestone || t.milestoneName || t.milestoneTitle;
      if (m) set.add(String(m));
    }
    return Array.from(set).sort((a,b)=>a.localeCompare(b));
  }, [tasks]);

  // Build rows to render based on grouping and filters
  const rows: TaskBar[] = useMemo(() => {
    const within = (d: Date) => d >= new Date(startDate.getFullYear(), startDate.getMonth(), 1) && d <= period.end;
    const parseDate = (v: any) => v ? new Date(v) : undefined;

    if (groupBy === 'assignee' || groupBy === 'milestone') {
      type Key = string; const map = new Map<Key, { title: string; projectId?: string; start?: Date; end?: Date }>();
      const taskList = tasks.filter(t => {
        if (project !== '-' && String(t.projectId) !== String(project)) return false;
        if (assignee !== '-' && assignee && !(
          (Array.isArray(t.assignees) && t.assignees.some((a:any)=>String(a?.name)===assignee)) || String(t.assignedTo||'')===assignee
        )) return false;
        if (milestone !== '-' && milestone && !(
          String(t.milestone || t.milestoneName || t.milestoneTitle || '') === milestone
        )) return false;
        return true;
      });
      for (const t of taskList) {
        const s = parseDate(t.startDate || t.start || t.createdAt) || parseDate(t.deadline) || new Date();
        const e = parseDate(t.deadline || t.endDate || t.end) || s;
        const projTitle = String(t.projectTitle || projects.find(p=>String(p._id)===String(t.projectId))?.title || 'Project');
        if (groupBy === 'assignee') {
          const names: string[] = Array.isArray(t.assignees) ? t.assignees.map((a:any)=>String(a?.name)).filter(Boolean) : [String(t.assignedTo||'-')];
          for (const n of names.filter(Boolean)) {
            const key = `${String(t.projectId)}|${projTitle} — ${n}`;
            const row = map.get(key) || { title: `${projTitle} — ${n}`, projectId: String(t.projectId || '') };
            row.start = !row.start || s < row.start ? s : row.start;
            row.end = !row.end || e > row.end ? e : row.end;
            map.set(key, row);
          }
        } else {
          const m = String(t.milestone || t.milestoneName || t.milestoneTitle || '-');
          const key = `${String(t.projectId)}|${projTitle} — ${m}`;
          const row = map.get(key) || { title: `${projTitle} — ${m}`, projectId: String(t.projectId || '') };
          row.start = !row.start || s < row.start ? s : row.start;
          row.end = !row.end || e > row.end ? e : row.end;
          map.set(key, row);
        }
      }
      return Array.from(map.entries()).map(([key, r]) => ({ id: key, title: r.title, start: (r.start||new Date()).toISOString().slice(0,10), end: (r.end||new Date()).toISOString().slice(0,10), projectId: r.projectId }));
    }

    // groupBy none (project-level bars). Filter projects by assignee/milestone if set.
    const eligibleProjects = new Set<string>();
    if (assignee !== '-' || (milestone !== '-' && milestone)) {
      for (const t of tasks) {
        const passAssignee = assignee==='-' || !assignee || (Array.isArray(t.assignees) ? t.assignees.some((a:any)=>String(a?.name)===assignee) : String(t.assignedTo||'')===assignee);
        const passMilestone = milestone==='-' || !milestone || String(t.milestone || t.milestoneName || t.milestoneTitle || '')===milestone;
        if (passAssignee && passMilestone && t.projectId) eligibleProjects.add(String(t.projectId));
      }
    }
    return bars.filter(b => (project==='-' || b.id===project) && (
      assignee==='-' && (milestone==='-' || !milestone) ? true : eligibleProjects.has(b.id)
    )).map(b => ({ ...b, projectId: b.projectId || b.id }));
  }, [groupBy, project, assignee, milestone, bars, tasks, projects, startDate, period.end]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-800 dark:via-indigo-800 dark:to-purple-800">
        <div className="absolute inset-0 opacity-30" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`, animation: 'pulse 3s ease-in-out infinite'}} />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <BackButton to="/projects" variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10" />
                <div className="flex items-center gap-2 text-white/80">
                  <Link to="/projects" className="hover:text-white transition-colors">
                    Projects
                  </Link>
                  <span>/</span>
                  <span className="text-white font-medium">Timeline View</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
                  <LayoutGrid className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                    Project Timeline
                  </h1>
                  <p className="mt-2 text-lg text-white/80">
                    Visualize project schedules and track progress over time
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                  <BarChart3 className="w-3 h-3 mr-1" />
                  Gantt Chart
                </Badge>
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                  <Clock className="w-3 h-3 mr-1" />
                  {rows.length} Projects
                </Badge>
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                  <Activity className="w-3 h-3 mr-1" />
                  {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} View
                </Badge>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild variant="secondary" size="lg" className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm">
                <Link to="/projects">
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back to Projects
                </Link>
              </Button>
              <div className="inline-flex rounded-md border bg-white/10 p-0.5 backdrop-blur-sm">
                <Button variant={viewMode==='days'?'secondary':'ghost'} size="lg" onClick={()=>setViewMode('days')} className="text-white hover:bg-white/20">
                  Days
                </Button>
                <Button variant={viewMode==='weeks'?'secondary':'ghost'} size="lg" onClick={()=>setViewMode('weeks')} className="text-white hover:bg-white/20">
                  Weeks
                </Button>
                <Button variant={viewMode==='months'?'secondary':'ghost'} size="lg" onClick={()=>setViewMode('months')} className="text-white hover:bg-white/20">
                  Months
                </Button>
              </div>
              <Button size="lg" className="bg-white text-blue-600 hover:bg-white/90" onClick={() => navigate("/projects")}
              >
                <Plus className="w-4 h-4 mr-2"/>
                New Project
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">

      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm dark:bg-slate-800/80">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Timeline Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon" onClick={movePrev}><ChevronLeft className="w-4 h-4"/></Button>
            <Button variant="outline" size="icon" onClick={moveNext}><ChevronRight className="w-4 h-4"/></Button>
            <Button variant="outline" size="sm" onClick={jumpToday}>Today</Button>
            <Button variant="outline" size="icon" onClick={() => { void refreshProjects(); }}><RefreshCw className="w-4 h-4"/></Button>
            <Select value={groupBy} onValueChange={setGroupBy}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Group by"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="assignee">Assignee</SelectItem>
                <SelectItem value="milestone">Milestone</SelectItem>
              </SelectContent>
            </Select>
            <Select value={project} onValueChange={setProject}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="- Project -"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="-">- Project -</SelectItem>
                {projects.map(p => {
                  const first = String(p.labels || "")
                    .split(",")
                    .map((x) => x.trim())
                    .filter(Boolean)[0];
                  const text = first ? `${p.title} • ${first}` : p.title;
                  return (<SelectItem key={p._id} value={p._id}>{text}</SelectItem>);
                })}
              </SelectContent>
            </Select>
            <SearchableSelect
              value={assignee}
              onValueChange={setAssignee}
              options={assignees.map(a => ({ value: a, label: a }))}
              placeholder="- Assigned to -"
              className="w-full sm:w-48"
            />
            <SearchableSelect
              value={milestone}
              onValueChange={setMilestone}
              options={milestones.map(m => ({ value: m, label: m }))}
              placeholder="- Milestone -"
              className="w-full sm:w-48"
            />
            <div className="ml-auto text-sm text-muted-foreground">{startDate.toLocaleString(undefined,{ month: 'long', year: 'numeric' })}</div>
          </div>
        </CardContent>
      </Card>

        {/* Timeline Grid */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm dark:bg-slate-800/80">
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <div className="relative" style={{ minWidth: `${labelColWidth + period.columns.length * colWidth}px` }}>
                {/* Header */}
                <div className="sticky top-0 z-10 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700">
                  <div className="grid" style={{ gridTemplateColumns: `${labelColWidth}px repeat(${period.columns.length}, ${colWidth}px)` }}>
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 text-sm text-white font-medium">{viewMode==='days' ? startDate.toLocaleString(undefined,{ month: 'long', year:'numeric' }) : 'Timeline'}</div>
                    {period.columns.map((d, idx) => (
                      <div key={idx} className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600 p-2 text-xs text-muted-foreground text-center border-l border-blue-200 dark:border-slate-600">
                        {viewMode==='days' && String(d.getDate()).padStart(2,'0')}
                        {viewMode==='weeks' && `W${getWeekNumber(d)}`}
                        {viewMode==='months' && d.toLocaleString(undefined,{ month: 'short' })}
                      </div>
                    ))}
                  </div>
                </div>

            {/* Today marker */}
                {(() => {
                  const today = new Date();
                  const idx = getIndexForDate(today, startDate, viewMode, period.columns);
                  if (idx < 0 || idx >= period.columns.length) return null;
                  const left = labelColWidth + idx * colWidth + (viewMode==='days'?Math.floor(colWidth/2):Math.floor(colWidth/2));
                  return <div style={{ left }} className="absolute top-0 bottom-0 w-px bg-destructive/60" />;
                })()}

                {/* Bars */}
                {rows
                  .map((b, row) => {
                    const sDate = new Date(b.start);
                    const eDate = new Date(b.end);
                    const { startIdx, span } = getSpan(sDate, eDate, startDate, period.end, viewMode, period.columns);
                    if (span <= 0) return (
                      <div key={b.id} className="grid border-t border-blue-100 dark:border-slate-600" style={{ gridTemplateColumns: `${labelColWidth}px repeat(${period.columns.length}, ${colWidth}px)` }}>
                        <div className="p-3 text-sm text-muted-foreground flex items-center cursor-pointer hover:underline hover:text-blue-600 transition-colors" onClick={()=>{ if (b.projectId) navigate(`/projects/overview/${b.projectId}`); }}>{b.title}</div>
                      </div>
                    );
                    const color = `hsl(${(row*47)%360} 85% 62%)`;
                    return (
                      <div key={b.id} className="grid border-t border-blue-100 dark:border-slate-600" style={{ gridTemplateColumns: `${labelColWidth}px repeat(${period.columns.length}, ${colWidth}px)` }}>
                        <div className="p-3 text-sm text-muted-foreground flex items-center cursor-pointer hover:underline hover:text-blue-600 transition-colors" onClick={()=>{ if (b.projectId) navigate(`/projects/overview/${b.projectId}`); }}>{b.title}</div>
                        {/* empty cells before bar */}
                        {Array.from({ length: startIdx }).map((_, i) => (
                          <div key={`e-${row}-${i}`} className="h-12 border-l/50 border-blue-100 dark:border-slate-600" />
                        ))}
                        <div
                          className="h-12 my-2 rounded-lg text-white flex items-center justify-center text-xs font-medium shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl cursor-pointer border border-white/20"
                          style={{ gridColumn: `span ${span}`, background: `linear-gradient(135deg, ${color}, ${color}dd)` }}
                          title={`${b.title} • ${b.start} → ${b.end}`}
                          onClick={()=>{ if (b.projectId) navigate(`/projects/overview/${b.projectId}`); }}
                        >
                          {b.title}
                        </div>
                        {Array.from({ length: period.columns.length - startIdx - span }).map((_, i) => (
                          <div key={`t-${row}-${i}`} className="h-12 border-l/50 border-blue-100 dark:border-slate-600" />
                        ))}
                      </div>
                    );
                  })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getWeekNumber(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
  return Math.ceil((((date as any) - (yearStart as any)) / 86400000 + 1)/7);
}

function getIndexForDate(target: Date, start: Date, mode: 'days'|'weeks'|'months', cols: Date[]) {
  const t = new Date(target);
  if (mode==='days') {
    const idx = Math.floor((t.getTime() - new Date(start.getFullYear(), start.getMonth(), 1).getTime())/86400000);
    return idx;
  }
  if (mode==='weeks') {
    for (let i=0;i<cols.length;i++) { if (t >= cols[i] && t < addDays(cols[i],7)) return i; }
    return -1;
  }
  for (let i=0;i<cols.length;i++) { if (t.getFullYear()===cols[i].getFullYear() && t.getMonth()===cols[i].getMonth()) return i; }
  return -1;
}

function getSpan(start: Date, end: Date, viewStart: Date, viewEnd: Date, mode: 'days'|'weeks'|'months', cols: Date[]) {
  const s = new Date(start);
  const e = new Date(end);
  if (mode==='days') {
    const vs = new Date(viewStart.getFullYear(), viewStart.getMonth(), 1);
    const ve = new Date(viewStart.getFullYear(), viewStart.getMonth() + 1, 0);
    const clampedStart = s < vs ? vs : s;
    const clampedEnd = e > ve ? ve : e;
    const startIdx = Math.max(0, Math.floor((clampedStart.getTime() - vs.getTime())/86400000));
    const span = Math.max(0, Math.floor((clampedEnd.getTime() - vs.getTime())/86400000) - startIdx + 1);
    return { startIdx, span };
  }
  if (mode==='weeks') {
    const vs = new Date(viewStart);
    const ve = new Date(viewEnd);
    let startIdx = -1; for (let i=0;i<cols.length;i++){ if (e >= cols[i]) startIdx = i; }
    startIdx = Math.max(0, getIndexForDate(s, vs, 'weeks', cols));
    const endIdx = Math.max(startIdx, getIndexForDate(e, vs, 'weeks', cols));
    if (endIdx < 0) return { startIdx: 0, span: 0 };
    const span = Math.max(1, endIdx - startIdx + 1);
    return { startIdx, span };
  }
  // months
  const vs = new Date(viewStart.getFullYear(), viewStart.getMonth(), 1);
  const ve = new Date(viewEnd.getFullYear(), viewEnd.getMonth(), 1);
  let startIdx = getIndexForDate(s, vs, 'months', cols); if (startIdx < 0) startIdx = 0;
  let endIdx = getIndexForDate(e, vs, 'months', cols); if (endIdx < startIdx) endIdx = startIdx;
  const span = Math.max(1, endIdx - startIdx + 1);
  return { startIdx, span };
}

function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate()+n); return x; }

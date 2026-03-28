import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, RefreshCw, Plus, Calendar, BarChart3, Clock, Users, Target, LayoutGrid, TrendingUp, Activity, Sparkles, Filter, ShieldCheck, Zap, Paperclip } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";
import { cn } from "@/lib/utils";

interface TaskBar {
  id: string;
  title: string;
  start: string; // yyyy-mm-dd
  end: string;   // yyyy-mm-dd
  projectId?: string;
  status?: string;
  progress?: number;
  label?: string;
}

interface RowData {
  title: string;
  projectId?: string;
  start?: Date;
  end?: Date;
  status?: string;
  progress?: number;
  label?: string;
}
export default function Timeline() {
  const navigate = useNavigate();
  const [groupBy, setGroupBy] = useState("none");
  const [project, setProject] = useState("-");
  const [assignee, setAssignee] = useState("-");
  const [milestone, setMilestone] = useState("-");
  const [bars, setBars] = useState<TaskBar[]>([]);
  const [projects, setProjects] = useState<{ _id: string; title: string; labels?: string; status?: string; progress?: number }[]>([]);
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

  const colWidth = viewMode === 'days' ? 40 : viewMode === 'weeks' ? 100 : 140;
  const labelColWidth = 350;

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
          title: d.title || "-",
          start: new Date(d.start).toISOString().slice(0, 10),
          end: new Date(d.deadline).toISOString().slice(0, 10),
          projectId: String(d._id || ""),
          status: d.status,
          progress: d.progress,
          label: firstLabelOf(d)
        }));
      setBars(mapped);
      setProjects(arr.map((p: any) => ({ 
        _id: String(p._id), 
        title: p.title || "-", 
        labels: typeof p?.labels === "string" ? p.labels : Array.isArray(p?.labels) ? p.labels.join(", ") : "",
        status: p.status,
        progress: p.progress
      })));
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
    const parseDate = (v: any) => v ? new Date(v) : undefined;

    if (groupBy === 'assignee' || groupBy === 'milestone') {
      type Key = string; 
      const map = new Map<Key, RowData>();
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
            const row = map.get(key) || { 
              title: `${projTitle} — ${n}`, 
              projectId: String(t.projectId || ''), 
              status: t.status, 
              progress: t.progress, 
              label: n,
              start: s,
              end: e
            };
            if (row.start && s < row.start) row.start = s;
            if (row.end && e > row.end) row.end = e;
            map.set(key, row);
          }
        } else {
          const m = String(t.milestone || t.milestoneName || t.milestoneTitle || '-');
          const key = `${String(t.projectId)}|${projTitle} — ${m}`;
          const row = map.get(key) || { 
            title: `${projTitle} — ${m}`, 
            projectId: String(t.projectId || ''), 
            status: t.status, 
            progress: t.progress, 
            label: m,
            start: s,
            end: e
          };
          if (row.start && s < row.start) row.start = s;
          if (row.end && e > row.end) row.end = e;
          map.set(key, row);
        }
      }
      return Array.from(map.entries()).map(([key, r]) => ({ 
        id: key, 
        title: r.title, 
        start: (r.start||new Date()).toISOString().slice(0,10), 
        end: (r.end||new Date()).toISOString().slice(0,10), 
        projectId: r.projectId,
        status: r.status,
        progress: r.progress,
        label: r.label
      }));
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
    <div className="min-h-screen bg-slate-50/30 dark:bg-slate-950 pb-12">
      {/* Redesigned Compact Header */}
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60 sticky top-0 z-30">
        <div className="mx-auto w-full max-w-[1600px] px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <BackButton />
              <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-500/20">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  Project Timeline
                  <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 border-none">Standard</Badge>
                </h1>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  {startDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })} • {viewMode.toUpperCase()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setViewMode('days')} 
                className={cn(
                  "rounded-lg text-[11px] font-bold px-4 h-8 transition-all", 
                  viewMode === 'days' ? "bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400" : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                Days
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setViewMode('weeks')} 
                className={cn(
                  "rounded-lg text-[11px] font-bold px-4 h-8 transition-all", 
                  viewMode === 'weeks' ? "bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400" : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                Weeks
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setViewMode('months')} 
                className={cn(
                  "rounded-lg text-[11px] font-bold px-4 h-8 transition-all", 
                  viewMode === 'months' ? "bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400" : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                Months
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1600px] px-6 py-6 space-y-4">
        {/* Modern Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white/50 dark:bg-slate-900/50 p-3 rounded-[20px] border border-slate-200/60 dark:border-slate-800/60 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-slate-500" onClick={movePrev}><ChevronLeft className="w-4 h-4"/></Button>
              <Button variant="ghost" size="sm" className="px-3 text-[11px] font-bold h-8 text-slate-600 dark:text-slate-300" onClick={jumpToday}>Today</Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-slate-500" onClick={moveNext}><ChevronRight className="w-4 h-4"/></Button>
            </div>
            
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

            <div className="flex items-center gap-2">
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger className="w-[130px] h-9 text-[11px] font-bold rounded-lg border-slate-200/60 bg-white dark:bg-slate-800 dark:border-slate-700/60"><SelectValue placeholder="Group by"/></SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 dark:border-slate-700">
                  <SelectItem value="none" className="text-[11px] font-medium">No Grouping</SelectItem>
                  <SelectItem value="assignee" className="text-[11px] font-medium">By Assignee</SelectItem>
                  <SelectItem value="milestone" className="text-[11px] font-medium">By Milestone</SelectItem>
                </SelectContent>
              </Select>

              <Select value={project} onValueChange={setProject}>
                <SelectTrigger className="w-[160px] h-9 text-[11px] font-bold rounded-lg border-slate-200/60 bg-white dark:bg-slate-800 dark:border-slate-700/60"><SelectValue placeholder="Select Project"/></SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 dark:border-slate-700">
                  <SelectItem value="-" className="text-[11px] font-medium">All Projects</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p._id} value={p._id} className="text-[11px] font-medium">{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <SearchableSelect
                value={assignee}
                onValueChange={setAssignee}
                options={assignees.map(a => ({ value: a, label: a }))}
                placeholder="Assignee"
                className="w-[140px] h-9 rounded-lg border-slate-200/60 bg-white dark:bg-slate-800 dark:border-slate-700/60"
              />

              <SearchableSelect
                value={milestone}
                onValueChange={setMilestone}
                options={milestones.map(m => ({ value: m, label: m }))}
                placeholder="Milestone"
                className="w-[140px] h-9 rounded-lg border-slate-200/60 bg-white dark:bg-slate-800 dark:border-slate-700/60"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 text-slate-500 hover:text-indigo-600" 
              onClick={() => { void refreshProjects(); }}
            >
              <RefreshCw className="w-3.5 h-3.5"/>
            </Button>
            <Button onClick={() => navigate("/projects")} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[11px] h-9 px-4 shadow-lg shadow-indigo-500/20 transition-all active:scale-95">
              <Plus className="w-3.5 h-3.5 mr-2" /> Create Project
            </Button>
          </div>
        </div>

        {/* Professional Timeline Grid */}
        <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200/60 dark:border-slate-800/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="w-full overflow-x-auto no-scrollbar scroll-smooth">
            <div className="relative" style={{ minWidth: `${labelColWidth + period.columns.length * colWidth}px` }}>
              {/* Sticky Timeline Header */}
              <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800">
                <div className="grid" style={{ gridTemplateColumns: `${labelColWidth}px repeat(${period.columns.length}, ${colWidth}px)` }}>
                  <div className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-r border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/30">
                    <Activity className="w-3.5 h-3.5 text-indigo-500" />
                    Resource / Project
                  </div>
                  {period.columns.map((d, idx) => {
                    const isToday = d.toDateString() === new Date().toDateString();
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <div key={idx} className={cn(
                        "py-3 text-center border-l border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center gap-0.5 transition-colors",
                        isToday ? "bg-indigo-50/30 dark:bg-indigo-900/10" : "",
                        isWeekend && viewMode === 'days' ? "bg-slate-50/50 dark:bg-slate-800/20" : ""
                      )}>
                        <span className={cn("text-[9px] font-bold uppercase tracking-tight", isToday ? "text-indigo-600" : "text-slate-400")}>
                          {viewMode==='days' && d.toLocaleDateString([], { weekday: 'short' })}
                          {viewMode==='weeks' && 'Week'}
                          {viewMode==='months' && d.getFullYear()}
                        </span>
                        <span className={cn(
                          "text-[11px] font-bold px-2 py-0.5 rounded-md transition-all",
                          isToday ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : "text-slate-600 dark:text-slate-400"
                        )}>
                          {viewMode==='days' && d.getDate()}
                          {viewMode==='weeks' && getWeekNumber(d)}
                          {viewMode==='months' && d.toLocaleString(undefined,{ month: 'short' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Today Vertical Line */}
              {(() => {
                const today = new Date();
                const idx = getIndexForDate(today, startDate, viewMode, period.columns);
                if (idx < 0 || idx >= period.columns.length) return null;
                const left = labelColWidth + idx * colWidth + (colWidth / 2);
                return (
                  <div 
                    style={{ left: `${left}px` }} 
                    className="absolute top-0 bottom-0 w-[2px] bg-indigo-500/30 z-[5] pointer-events-none"
                  >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-indigo-500" />
                  </div>
                );
              })()}

              {/* Data Rows */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.length === 0 ? (
                  <div className="py-24 text-center">
                    <div className="inline-flex p-4 rounded-full bg-slate-50 dark:bg-slate-800 mb-4">
                      <Calendar className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No active timelines found</p>
                  </div>
                ) : (
                  rows.map((b) => {
                    const sDate = new Date(b.start);
                    const eDate = new Date(b.end);
                    const { startIdx, span } = getSpan(sDate, eDate, startDate, period.end, viewMode, period.columns);
                    
                    return (
                      <div key={b.id} className="grid group/row hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all duration-200" style={{ gridTemplateColumns: `${labelColWidth}px repeat(${period.columns.length}, ${colWidth}px)` }}>
                        {/* Row Label */}
                        <div className="p-4 border-r border-slate-100 dark:border-slate-800 flex items-center gap-3 overflow-hidden bg-white dark:bg-slate-900 group-hover/row:bg-slate-50/80 dark:group-hover/row:bg-slate-800/50 transition-colors">
                          <div className={cn(
                            "w-1.5 h-8 rounded-full flex-shrink-0",
                            b.status === 'Completed' || b.status === 'done' ? "bg-emerald-500" :
                            b.status === 'Hold' ? "bg-amber-500" : "bg-indigo-500"
                          )} />
                          <div className="flex flex-col min-w-0">
                            <button
                              type="button"
                              className="text-[13px] font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left truncate tracking-tight leading-tight"
                              onClick={()=>{ if (b.projectId) navigate(`/projects/overview/${b.projectId}`); }}
                            >
                              {b.title}
                            </button>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50">
                                {b.status || 'Active'}
                              </span>
                              {b.label && (
                                <span className="text-[9px] font-bold text-indigo-500 flex items-center gap-1">
                                  <Users className="w-2.5 h-2.5" /> {b.label}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Timeline Track */}
                        <div className="relative h-16 flex items-center" style={{ gridColumn: `2 / span ${period.columns.length}` }}>
                          {/* Vertical Grid Lines */}
                          <div className="absolute inset-0 flex pointer-events-none">
                            {period.columns.map((_, i) => (
                              <div key={i} className="flex-1 border-r border-slate-100/50 dark:border-slate-800/30 h-full last:border-r-0" />
                            ))}
                          </div>

                          {/* Task Bar */}
                          {span > 0 && (
                            <div
                              className={cn(
                                "absolute h-8 rounded-lg shadow-sm flex items-center px-3 group/bar cursor-pointer transition-all duration-300 hover:shadow-lg hover:brightness-110",
                                b.status === 'Completed' || b.status === 'done' ? "bg-emerald-500 text-white" :
                                b.status === 'Hold' ? "bg-amber-500 text-white" : "bg-indigo-600 text-white"
                              )}
                              style={{ 
                                left: `${startIdx * colWidth + 4}px`, 
                                width: `${span * colWidth - 8}px`,
                                minWidth: '32px'
                              }}
                              onClick={()=>{ if (b.projectId) navigate(`/projects/overview/${b.projectId}`); }}
                            >
                              <div className="flex items-center justify-between w-full overflow-hidden">
                                <span className="text-[10px] font-bold uppercase tracking-wide truncate">
                                  {b.progress ? `${Math.round(b.progress)}%` : b.title}
                                </span>
                                <Sparkles className="w-3 h-3 opacity-0 group-hover/bar:opacity-100 transition-opacity flex-shrink-0 ml-2" />
                              </div>
                              
                              {/* Enhanced Tooltip */}
                              <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-800 text-white p-3 rounded-xl opacity-0 group-hover/bar:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-xl z-40 border border-slate-700/50 scale-95 group-hover/bar:scale-100">
                                <p className="text-[11px] font-bold mb-1">{b.title}</p>
                                <div className="flex items-center gap-2 text-[9px] font-medium text-slate-400">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(b.start).toLocaleDateString()} — {new Date(b.end).toLocaleDateString()}
                                </div>
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 dark:bg-slate-800 rotate-45 border-r border-b border-slate-700/50" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
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

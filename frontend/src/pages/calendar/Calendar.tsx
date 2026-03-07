import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";

type EventCategory = "team" | "work" | "external" | "projects" | "apps" | "design";

interface CalendarEvent {
  title: string;
  date: string; // YYYY-MM-DD
  category: EventCategory;
  id?: string;
  start?: string;
  end?: string;
  type?: string;
}

const categoryMeta: Record<EventCategory, { name: string; dot: string; chip: string }> = {
  team: { name: "Team Events", dot: "bg-lime-500", chip: "bg-primary/10 text-primary" },
  work: { name: "Work", dot: "bg-amber-400", chip: "bg-amber-100 text-amber-800" },
  external: { name: "External", dot: "bg-rose-400", chip: "bg-rose-100 text-rose-800" },
  projects: { name: "Projects", dot: "bg-orange-400", chip: "bg-orange-100 text-orange-800" },
  apps: { name: "Applications", dot: "bg-rose-300", chip: "bg-rose-100 text-rose-800" },
  design: { name: "Design", dot: "bg-sky-400", chip: "bg-sky-100 text-sky-800" },
};

const sampleEvents: CalendarEvent[] = [
  { title: "Team Events", date: "2025-12-03", category: "team" },
  { title: "Meeting with", date: "2025-12-09", category: "design" },
  { title: "Meeting with", date: "2025-12-11", category: "work" },
  { title: "Design System", date: "2025-12-12", category: "apps" },
  { title: "UI/UX Team", date: "2025-12-15", category: "team" },
];

export default function CalendarPage() {
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [current, setCurrent] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>(sampleEvents);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [editingId, setEditingId] = useState<string | "">("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftStart, setDraftStart] = useState("");
  const [draftEnd, setDraftEnd] = useState("");
  const [draftType, setDraftType] = useState("meeting");

  const monthMatrix = useMemo(() => buildMonthMatrix(current), [current]);

  const monthName = current.toLocaleString(undefined, { month: "long" }).toUpperCase();
  const year = current.getFullYear();

  const todayISO = useMemo(() => toISO(new Date()), []);
  const selectedISO = useMemo(() => (selectedDate ? toISO(selectedDate) : ""), [selectedDate]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      if (!map.has(ev.date)) map.set(ev.date, []);
      map.get(ev.date)!.push(ev);
    }
    return map;
  }, [events]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const withStart = events
      .map((ev) => {
        const start = ev.start ? new Date(ev.start) : new Date(`${ev.date}T00:00:00`);
        return { ev, start };
      })
      .filter(({ start }) => Number.isFinite(start.getTime()))
      .filter(({ start }) => start.getTime() >= startOfToday.getTime())
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 3);

    console.log("upcomingEvents debug:", {
      now,
      startOfToday,
      events,
      withStart,
    });

    return withStart.map(({ ev, start }) => ({
      key: ev.id || `${ev.title}_${ev.date}_${String(ev.start || "")}`,
      title: ev.title,
      date: formatUpcomingDate(start),
      color: categoryMeta[ev.category]?.dot || "bg-primary",
    }));
  }, [events]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/events`, { headers: getAuthHeaders() });
        if (!r.ok) return;
        const raw = await r.json();
        const list = Array.isArray(raw) ? raw : [];
        const toISO = (d?: string) => {
          if (!d) return "";
          try {
            const x = new Date(d);
            if (!Number.isFinite(x.getTime())) return "";
            const y = x.getFullYear();
            const m = String(x.getMonth() + 1).padStart(2, "0");
            const day = String(x.getDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
          } catch { return ""; }
        };
        const mapped: CalendarEvent[] = list
          .map((e: any) => ({
            id: String(e._id || ""),
            title: String(e.title || "Event"),
            date: toISO(String(e.start || e.end || "")),
            start: e.start,
            end: e.end,
            type: String(e.type || "meeting"),
            category: ((): EventCategory => {
              const t = String(e.type || "").toLowerCase();
              if (t === "meeting") return "team";
              if (t === "design") return "design";
              if (t === "work") return "work";
              if (t === "project") return "projects";
              return "team";
            })(),
          }))
          .filter((ev: CalendarEvent) => Boolean(ev.date));
        setEvents(mapped);
      } catch {
        // keep sample events on error
      }
    })();
  }, []);

  const meRole = (() => {
    try {
      const raw = localStorage.getItem("auth_user") || sessionStorage.getItem("auth_user");
      if (!raw) return "admin";
      const j = JSON.parse(raw);
      return j?.role || "admin";
    } catch { return "admin"; }
  })();

  const loadEvents = async () => {
    try {
      const r = await fetch(`${API_BASE}/api/events`, { headers: getAuthHeaders() });
      if (!r.ok) return;
      const raw = await r.json();
      console.log("Loaded raw events:", raw);
      const list = Array.isArray(raw) ? raw : [];
      const toISO = (d?: string) => {
        if (!d) return "";
        try {
          const x = new Date(d);
          if (!Number.isFinite(x.getTime())) return "";
          const y = x.getFullYear();
          const m = String(x.getMonth() + 1).padStart(2, "0");
          const day = String(x.getDate()).padStart(2, "0");
          return `${y}-${m}-${day}`;
        } catch { return ""; }
      };
      const mapped: CalendarEvent[] = list
        .map((e: any) => ({
          id: String(e._id || ""),
          title: String(e.title || "Event"),
          date: toISO(String(e.start || e.end || "")),
          start: e.start,
          end: e.end,
          type: String(e.type || "meeting"),
          category: ((): EventCategory => {
            const t = String(e.type || "").toLowerCase();
            if (t === "meeting") return "team";
            if (t === "design") return "design";
            if (t === "work") return "work";
            if (t === "project") return "projects";
            return "team";
          })(),
        }))
        .filter((ev: CalendarEvent) => Boolean(ev.date));
      console.log("Mapped events for UI:", mapped);
      setEvents(mapped);
    } catch (e) {
      console.error("loadEvents error:", e);
    }
  };

  const openCreateForDate = (d: Date) => {
    if (meRole !== "admin") return;
    const pad = (n: number) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    setEditingId("");
    setDraftTitle("");
    setDraftType("meeting");
    setDraftStart(`${yyyy}-${mm}-${dd}T09:00`);
    setDraftEnd(`${yyyy}-${mm}-${dd}T10:00`);
    setOpenEdit(true);
  };

  const saveEvent = async () => {
    const title = draftTitle.trim();
    if (!title || !draftStart) { setOpenEdit(false); return; }
    try {
      const body: any = { title, start: draftStart, end: draftEnd || undefined, type: draftType };
      console.log("Saving event payload:", body);
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `${API_BASE}/api/events/${editingId}` : `${API_BASE}/api/events`;
      const r = await fetch(url, { method, headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(body) });
      if (r.ok) {
        await loadEvents();
      } else {
        console.error("Save failed:", r.status, await r.text());
      }
    } catch (e) {
      console.error("Save error:", e);
    }
    setOpenEdit(false);
  };

  const deleteEvent = async () => {
    if (!editingId) { setOpenEdit(false); return; }
    try { await fetch(`${API_BASE}/api/events/${editingId}`, { method: "DELETE", headers: getAuthHeaders() }); await loadEvents(); } catch {}
    setOpenEdit(false);
  };

  const gotoToday = () => setCurrent(new Date());
  const prev = () => setCurrent((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const next = () => setCurrent((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left panel */}
        <Card className="lg:col-span-3">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Event</h2>
              <span className="text-destructive">●</span>
            </div>
            <p className="text-xs text-muted-foreground">Drag and drop your event or click in the calendar</p>
            <div className="space-y-2">
              {Object.entries(categoryMeta).map(([key, meta]) => (
                <div key={key} className="flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1.5">
                  <span className={cn("h-3 w-3 rounded-full", meta.dot)} />
                  <span className="text-sm">{meta.name}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-2">Upcoming Event</h3>
              <div className="space-y-3">
                {upcomingEvents.length ? (
                  upcomingEvents.map((u) => (
                    <Upcoming key={u.key} title={u.title} date={u.date} color={u.color} />
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground">No upcoming events</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right panel */}
        <Card className="lg:col-span-9">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={gotoToday}>today</Button>
                <div className="inline-flex items-center">
                  <Button variant="outline" size="icon" onClick={prev}><ChevronLeft className="w-4 h-4" /></Button>
                  <Button variant="outline" size="icon" onClick={next}><ChevronRight className="w-4 h-4" /></Button>
                </div>
                <span className="font-semibold text-sm ml-2">{monthName} {year}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant={view === "month" ? "default" : "outline"} size="sm" onClick={() => setView("month")}>month</Button>
                <Button variant={view === "week" ? "default" : "outline"} size="sm" onClick={() => setView("week")}>week</Button>
                <Button variant={view === "day" ? "default" : "outline"} size="sm" onClick={() => setView("day")}>day</Button>
              </div>
              {meRole === "admin" && (
                <Button variant="default" size="sm" onClick={() => openCreateForDate(new Date())}>New event</Button>
              )}
            </div>

            {/* Month view */}
            {view === "month" && (
              <div className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-7 bg-muted/40 text-xs font-medium">
                  {"Sun Mon Tue Wed Thu Fri Sat".split(" ").map((d) => (
                    <div key={d} className="px-2 py-2">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 divide-x divide-y">
                  {monthMatrix.map((week, wi) => (
                    <div key={wi} className="contents">
                      {week.map((cell, ci) => {
                        const dateStr = toISO(cell.date);
                        const inMonth = cell.inMonth;
                        const events = eventsByDate.get(dateStr) || [];
                        const isToday = dateStr === todayISO;
                        const isSelected = selectedISO && dateStr === selectedISO;
                        return (
                          <div
                            key={ci}
                            className={cn(
                              "h-28 p-1.5 transition-colors",
                              !inMonth && "bg-muted/20",
                              isSelected && "bg-primary/5"
                            )}
                            onClick={() => setSelectedDate(cell.date)}
                            onDoubleClick={() => openCreateForDate(cell.date)}
                          > 
                            <button
                              type="button"
                              className={cn(
                                "text-[11px] mb-1 inline-flex h-6 w-6 items-center justify-center rounded-md",
                                isSelected ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
                                isToday && !isSelected ? "border border-primary/40 text-primary" : ""
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDate(cell.date);
                              }}
                              aria-label={`Select ${dateStr}`}
                            >
                              {cell.date.getDate()}
                            </button>
                            <div className="space-y-1">
                              {events.map((ev, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  title={ev.title}
                                  className={cn("w-full text-left truncate text-xs px-2 py-1 rounded-md", categoryMeta[ev.category].chip)}
                                  onClick={() => {
                                    if (meRole !== "admin") return;
                                    setEditingId(ev.id || "");
                                    setDraftTitle(ev.title);
                                    const startIso = ev.start ? toDateTimeLocalValue(ev.start) : `${ev.date}T09:00`;
                                    const endIso = ev.end ? toDateTimeLocalValue(ev.end) : `${ev.date}T10:00`;
                                    setDraftStart(startIso);
                                    setDraftEnd(endIso);
                                    setDraftType(ev.type || "meeting");
                                    setOpenEdit(true);
                                  }}
                                >
                                  {ev.title}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {view !== "month" && (
              <div className="h-[520px] rounded-lg border bg-muted/10 flex items-center justify-center text-sm text-muted-foreground">
                {view.charAt(0).toUpperCase() + view.slice(1)} view coming soon
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Event Modal (admin only) */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit event" : "Add event"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs mb-1">Title</div>
                <Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} placeholder="Event title" />
              </div>
              <div>
                <div className="text-xs mb-1">Type</div>
                <Input value={draftType} onChange={(e) => setDraftType(e.target.value)} placeholder="meeting / work / project / design" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs mb-1">Start</div>
                <DateTimePicker value={draftStart} onChange={setDraftStart} placeholder="Pick start" />
              </div>
              <div>
                <div className="text-xs mb-1">End</div>
                <DateTimePicker value={draftEnd} onChange={setDraftEnd} placeholder="Pick end" />
              </div>
            </div>
          </div>
          <DialogFooter>
            {editingId ? (
              <Button variant="destructive" onClick={deleteEvent}>Delete</Button>
            ) : null}
            <Button onClick={saveEvent}>{editingId ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Upcoming({ title, date, color }: { title: string; date: string; color: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className={cn("mt-1 h-4 w-1 rounded-full", color)} />
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{date}</div>
      </div>
    </div>
  );
}

function toDateTimeLocalValue(input: string | Date) {
  const d = input instanceof Date ? input : new Date(input);
  if (!Number.isFinite(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function formatUpcomingDate(d: Date) {
  try {
    const s = d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
    return String(s).replace(",", "");
  } catch {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${day}-${m}-${y}`;
  }
}

function buildMonthMatrix(ref: Date) {
  const first = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay()); // go back to Sunday
  const weeks: { date: Date; inMonth: boolean }[][] = [];
  let cursor = start;
  for (let w = 0; w < 6; w++) {
    const week: { date: Date; inMonth: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(cursor);
      week.push({ date: dt, inMonth: dt.getMonth() === ref.getMonth() });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

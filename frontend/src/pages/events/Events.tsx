import { useEffect, useMemo, useRef, useState } from "react";
import { addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, format, parseISO } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, Tag, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO yyyy-MM-dd (start date)
  label: string; // label name
  type: string; // Meeting/Task/etc
  description?: string;
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  endDate?: string; // ISO yyyy-MM-dd
  location?: string;
  client?: string;
  share?: "me" | "all" | "specific";
  repeat?: boolean;
  colorClass?: string; // tailwind bg-* class
}

interface LabelDef {
  name: string;
  color: "primary" | "indigo" | "success" | "warning" | "destructive";
}

interface ClientRow {
  _id: string;
  company?: string;
  person?: string;
  firstName?: string;
  lastName?: string;
}

const initialLabels: LabelDef[] = [
  { name: "General", color: "primary" },
  { name: "Meeting", color: "indigo" },
  { name: "Task", color: "success" },
  { name: "Deadline", color: "warning" },
  { name: "Out of Office", color: "destructive" },
];

const labelClasses: Record<LabelDef["color"], { dot: string; pill: string; text: string }> = {
  primary: { dot: "bg-primary", pill: "bg-primary/15", text: "text-primary" },
  indigo: { dot: "bg-indigo", pill: "bg-indigo/15", text: "text-indigo" },
  success: { dot: "bg-success", pill: "bg-success/15", text: "text-success" },
  warning: { dot: "bg-warning", pill: "bg-warning/15", text: "text-warning" },
  destructive: { dot: "bg-destructive", pill: "bg-destructive/15", text: "text-destructive" },
};

const sampleEvents: CalendarEvent[] = [
  { id: "1", title: "Quarterly Planning", date: format(new Date(), "yyyy-MM-") + "10", label: "Meeting", type: "Meeting" },
  { id: "2", title: "Design Review", date: format(new Date(), "yyyy-MM-") + "15", label: "Task", type: "Task" },
  { id: "3", title: "Release Deadline", date: format(new Date(), "yyyy-MM-") + "18", label: "Deadline", type: "Milestone" },
  { id: "4", title: "Team Offsite", date: format(new Date(), "yyyy-MM-") + "22", label: "Out of Office", type: "OutOfOffice" },
];

export default function Events() {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [labels, setLabels] = useState<LabelDef[]>(initialLabels);
  const [events, setEvents] = useState<CalendarEvent[]>(sampleEvents);
  const [labelFilter, setLabelFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const [clients, setClients] = useState<ClientRow[]>([]);

  const monthLabel = format(currentMonth, "MMMM yyyy");

  const daysMatrix = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    const rows: Date[][] = [];
    let day = start;
    while (day <= end) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(day);
        day = addDays(day, 1);
      }
      rows.push(week);
    }
    return rows;
  }, [currentMonth]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => (labelFilter === "all" || e.label === labelFilter) && (typeFilter === "all" || e.type === typeFilter));
  }, [events, labelFilter, typeFilter]);

  const getLabelColor = (name: string) => {
    const l = labels.find((x) => x.name === name) || labels[0];
    return labelClasses[l.color];
  };

  // Add Event dialog state
  const [openAdd, setOpenAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [newEndDate, setNewEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [newLabel, setNewLabel] = useState(labels[0].name);
  const [newType, setNewType] = useState("Meeting");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [clientId, setClientId] = useState("-");
  const [share, setShare] = useState<"me" | "all" | "specific">("all");
  const [repeat, setRepeat] = useState(false);
  const [colorClass, setColorClass] = useState<string>("");
  const uploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/clients`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        setClients(Array.isArray(data) ? data : []);
      } catch {
        // ignore
      }
    })();
  }, []);

  const clientNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of clients) {
      const name =
        c.company?.trim() ||
        c.person?.trim() ||
        `${c.firstName || ""} ${c.lastName || ""}`.trim() ||
        "-";
      if (c._id) m.set(c._id, name);
    }
    return m;
  }, [clients]);

  const addEvent = () => {
    if (!newTitle.trim()) return;
    const selectedClientName = clientId !== "-" ? (clientNameById.get(clientId) || "-") : "-";
    setEvents((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        title: newTitle.trim(),
        date: newDate,
        endDate: newEndDate,
        startTime,
        endTime,
        description,
        location,
        client: selectedClientName,
        share,
        repeat,
        colorClass: colorClass || undefined,
        label: newLabel,
        type: newType,
      },
    ]);
    setOpenAdd(false);
    setNewTitle("");
  };

  // Manage labels dialog state
  const [openLabels, setOpenLabels] = useState(false);
  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState<LabelDef["color"]>("primary");

  const addLabel = () => {
    if (!labelName.trim()) return;
    setLabels((prev) => [...prev, { name: labelName.trim(), color: labelColor }]);
    setLabelName("");
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display">Event calendar</h1>
        <div className="flex items-center gap-2">
          <Select value={labelFilter} onValueChange={setLabelFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Event label" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">- Event label -</SelectItem>
              {labels.map((l) => (
                <SelectItem key={l.name} value={l.name}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Event type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Event type</SelectItem>
              <SelectItem value="Meeting">Meeting</SelectItem>
              <SelectItem value="Task">Task</SelectItem>
              <SelectItem value="Milestone">Milestone</SelectItem>
              <SelectItem value="OutOfOffice">Out of office</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={openLabels} onOpenChange={setOpenLabels}>
            <DialogTrigger asChild>
              <Button variant="outline"><Tag className="w-4 h-4 mr-1"/>Manage labels</Button>
            </DialogTrigger>
            <DialogContent className="bg-card">
              <DialogHeader>
                <DialogTitle>Manage labels</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {labels.map((l) => {
                    const c = labelClasses[l.color];
                    return (
                      <span key={l.name} className={cn("inline-flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-md", c.pill, c.text)}>
                        <span className={cn("w-2 h-2 rounded-full", c.dot)} />
                        {l.name}
                      </span>
                    );
                  })}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div className="space-y-1">
                    <Label htmlFor="label-name">Label name</Label>
                    <Input id="label-name" value={labelName} onChange={(e)=>setLabelName(e.target.value)} placeholder="e.g. Demo" />
                  </div>
                  <div className="space-y-1">
                    <Label>Color</Label>
                    <Select value={labelColor} onValueChange={(v)=>setLabelColor(v as LabelDef["color"]) }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(labelClasses).map((c)=> (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={addLabel} variant="gradient">Add label</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <Button variant="gradient"><Plus className="w-4 h-4 mr-1"/>Add event</Button>
            </DialogTrigger>
            <DialogContent className="bg-card">
              <DialogHeader>
                <DialogTitle>Add event</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="space-y-1">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" value={newTitle} onChange={(e)=>setNewTitle(e.target.value)} placeholder="Title" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="desc">Description</Label>
                  <Textarea id="desc" value={description} onChange={(e)=>setDescription(e.target.value)} placeholder="Description" className="min-h-[90px]" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Start date</Label>
                      <DatePicker value={newDate} onChange={setNewDate} placeholder="Pick start date" />
                    </div>
                    <div className="space-y-1">
                      <Label>Start time</Label>
                      <Input type="time" value={startTime} onChange={(e)=>setStartTime(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>End date</Label>
                      <DatePicker value={newEndDate} onChange={setNewEndDate} placeholder="Pick end date" />
                    </div>
                    <div className="space-y-1">
                      <Label>End time</Label>
                      <Input type="time" value={endTime} onChange={(e)=>setEndTime(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Location</Label>
                    <Input value={location} onChange={(e)=>setLocation(e.target.value)} placeholder="Location" />
                  </div>
                  <div className="space-y-1">
                    <Label>Labels</Label>
                    <Select value={newLabel} onValueChange={setNewLabel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Labels" />
                      </SelectTrigger>
                      <SelectContent>
                        {labels.map((l)=> (
                          <SelectItem key={l.name} value={l.name}>{l.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Client</Label>
                    <Select value={clientId} onValueChange={setClientId}>
                      <SelectTrigger>
                        <SelectValue placeholder="-" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-">-</SelectItem>
                        {clients.map((c) => {
                          const name =
                            c.company?.trim() ||
                            c.person?.trim() ||
                            `${c.firstName || ""} ${c.lastName || ""}`.trim() ||
                            "-";
                          return (
                            <SelectItem key={c._id} value={c._id}>
                              {name}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Type</Label>
                    <Select value={newType} onValueChange={setNewType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Meeting">Meeting</SelectItem>
                        <SelectItem value="Task">Task</SelectItem>
                        <SelectItem value="Milestone">Milestone</SelectItem>
                        <SelectItem value="OutOfOffice">Out of office</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Share with</Label>
                  <div className="flex flex-wrap gap-5 text-sm">
                    <label className="flex items-center gap-2"><Checkbox checked={share==="me"} onCheckedChange={()=>setShare("me")} /> Only me</label>
                    <label className="flex items-center gap-2"><Checkbox checked={share==="all"} onCheckedChange={()=>setShare("all")} /> All team members</label>
                    <label className="flex items-center gap-2"><Checkbox checked={share==="specific"} onCheckedChange={()=>setShare("specific")} /> Specific members and teams</label>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={repeat} onCheckedChange={(v)=>setRepeat(Boolean(v))} /> Repeat</label>
                  <div className="flex items-center gap-2">
                    {colorSwatches.map((c)=> (
                      <button key={c} type="button" aria-label={c} onClick={()=>setColorClass(c)} className={cn("w-5 h-5 rounded-sm border", c, colorClass===c && "ring-2 ring-offset-2 ring-primary")} />
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <div className="flex-1">
                  <input ref={uploadRef} type="file" className="hidden" />
                  <Button type="button" variant="outline" onClick={()=>uploadRef.current?.click()}>
                    <Paperclip className="w-4 h-4 mr-2"/> Upload File
                  </Button>
                </div>
                <Button type="button" variant="outline" onClick={()=>setOpenAdd(false)}>Close</Button>
                <Button onClick={addEvent}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="w-4 h-4"/></Button>
            <Button variant="outline" onClick={() => setCurrentMonth(new Date())}>today</Button>
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="w-4 h-4"/></Button>
          </div>
          <div className="text-lg font-medium">{monthLabel}</div>
          <div className="hidden md:flex items-center gap-2">
            <Button variant="outline" size="sm">month</Button>
            <Button variant="ghost" size="sm">week</Button>
            <Button variant="ghost" size="sm">day</Button>
            <Button variant="ghost" size="sm">list</Button>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
            <div key={d} className="bg-muted/30 p-2 text-xs font-medium text-muted-foreground">{d}</div>
          ))}
          {daysMatrix.flat().map((day, idx) => {
            const dayISO = format(day, 'yyyy-MM-dd');
            const dayEvents = filteredEvents.filter((e)=> isSameDay(parseISO(e.date), day));
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());
            return (
              <div
                key={dayISO+idx}
                className={cn("min-h-[120px] p-2 bg-card relative border cursor-default", !isCurrentMonth && "bg-muted/20 text-muted-foreground")} 
                onDoubleClick={() => { setOpenAdd(true); setNewDate(format(day, 'yyyy-MM-dd')); setNewEndDate(format(day, 'yyyy-MM-dd')); }}
              > 
                <div className={cn("absolute inset-0", isToday && "bg-warning/10")}/>
                <div className="relative z-10">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="opacity-70">{format(day, 'd')}</span>
                    {!isCurrentMonth && <span className="sr-only">out</span>}
                  </div>
                  <div className="mt-2 space-y-1">
                    {dayEvents.slice(0,3).map((e)=> {
                      if (e.colorClass) {
                        return (
                          <div key={e.id} className={cn("flex items-center gap-2 rounded-md px-2 py-1 text-xs text-white", e.colorClass)}>
                            <span className="w-2 h-2 rounded-full bg-white/90" />
                            <span className="truncate">{e.title}</span>
                          </div>
                        );
                      }
                      const c = getLabelColor(e.label);
                      return (
                        <div key={e.id} className={cn("flex items-center gap-2 rounded-md px-2 py-1 text-xs", c.pill, c.text)}>
                          <span className={cn("w-2 h-2 rounded-full", c.dot)} />
                          <span className="truncate">{e.title}</span>
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <Badge variant="secondary" className="text-[10px]">+{dayEvents.length - 3} more</Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4">
          {labels.map((l)=> {
            const c = labelClasses[l.color];
            return (
              <div key={l.name} className="flex items-center gap-2 text-xs">
                <span className={cn("w-2 h-2 rounded-full", c.dot)} />
                <span className="text-muted-foreground">{l.name}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// Fixed palette for Tailwind JIT to include these classes
const colorSwatches = [
  "bg-emerald-500",
  "bg-teal-500",
  "bg-sky-400",
  "bg-slate-300",
  "bg-amber-400",
  "bg-orange-500",
  "bg-rose-500",
  "bg-fuchsia-600",
  "bg-pink-500",
  "bg-slate-700",
  "bg-violet-400",
  "bg-blue-500",
];

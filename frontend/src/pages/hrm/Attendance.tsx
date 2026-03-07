import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { getCurrentUser } from "@/utils/roleAccess";

interface Member {
  id: string; // employee ObjectId
  name: string;
  initials: string;
  avatar?: string;
  clockedIn: boolean;
  startTime?: string; // HH:MM:SS
}

const initialMembers: Member[] = [];

export default function Attendance() {
  const navigate = useNavigate();
  const isAdmin = getCurrentUser()?.role === "admin";
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [query, setQuery] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [manualIn, setManualIn] = useState("");
  const [manualOut, setManualOut] = useState("");

  const [records, setRecords] = useState<any[]>([]);
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [activeTab, setActiveTab] = useState<
    "daily" | "custom" | "summary" | "summary-details" | "members" | "clock"
  >("clock");
  const [loading, setLoading] = useState(false);

  const toAbsoluteAvatar = (v?: string) => {
    const base = API_BASE;
    if (!v) return "";
    const s = String(v);
    if (!s) return "";
    if (s.startsWith("http://") || s.startsWith("https://")) return s;
    return `${base}${s.startsWith("/") ? "" : "/"}${s}`;
  };

  const refresh = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/attendance/members`, { headers: getAuthHeaders() });
      if (res.status === 401) { window.location.assign('/auth'); return; }
      if (!res.ok) return;
      const data = await res.json();
      const mapped: Member[] = (Array.isArray(data) ? data : []).map((d: any) => ({
        id: d.employeeId,
        name: d.name,
        initials: d.initials,
        avatar: d.avatar || "",
        clockedIn: !!d.clockedIn,
        startTime: d.startTime,
      }));
      setMembers(mapped);
    } catch {}
  };

  const loadRecords = async (params: { from?: string; to?: string; employeeId?: string } = {}) => {
    try {
      setLoading(true);
      const sp = new URLSearchParams();
      if (params.from) sp.set("from", params.from);
      if (params.to) sp.set("to", params.to);
      if (params.employeeId) sp.set("employeeId", params.employeeId);
      const qs = sp.toString();
      const res = await fetch(`${API_BASE}/api/attendance/records${qs ? `?${qs}` : ""}`, { headers: getAuthHeaders() });
      if (res.status === 401) { window.location.assign('/auth'); return; }
      if (!res.ok) {
        setRecords([]);
        return;
      }
      const data = await res.json().catch(() => []);
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // default custom range: current month
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setRangeFrom(from.toISOString().slice(0, 10));
    setRangeTo(to.toISOString().slice(0, 10));
  }, []);

  useEffect(() => {
    if (activeTab === "daily") {
      const today = new Date().toISOString().slice(0, 10);
      loadRecords({ from: today, to: today });
    }
    if (activeTab === "custom" || activeTab === "summary" || activeTab === "summary-details") {
      if (rangeFrom || rangeTo) loadRecords({ from: rangeFrom || undefined, to: rangeTo || undefined });
    }
  }, [activeTab]);

  const list = useMemo(() => {
    const s = query.toLowerCase();
    return members.filter((m) => m.name.toLowerCase().includes(s));
  }, [members, query]);

  const clockedInList = useMemo(() => list.filter((m) => m.clockedIn), [list]);

  const recordsWithMember = useMemo(() => {
    const map = new Map(members.map((m) => [String(m.id), m]));
    return (records || []).map((r: any) => ({
      ...r,
      _member: map.get(String(r.employeeId)) as Member | undefined,
    }));
  }, [records, members]);

  const calcHours = (clockIn?: string, clockOut?: string) => {
    if (!clockIn || !clockOut) return 0;
    const a = new Date(clockIn).getTime();
    const b = new Date(clockOut).getTime();
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
    return (b - a) / 36e5;
  };

  const summaryRows = useMemo(() => {
    const agg = new Map<string, { member?: Member; totalHours: number; days: number }>();
    for (const r of recordsWithMember) {
      const empId = String(r.employeeId || "");
      if (!empId) continue;
      const v = agg.get(empId) || { member: r._member, totalHours: 0, days: 0 };
      const hours = calcHours(r.clockIn, r.clockOut);
      if (hours > 0) {
        v.totalHours += hours;
      }
      v.days += 1;
      v.member = v.member || r._member;
      agg.set(empId, v);
    }
    return Array.from(agg.entries()).map(([employeeId, v]) => ({ employeeId, ...v }));
  }, [recordsWithMember]);

  const nowTime = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const toggleClock = async (id: string, clockedIn: boolean, name: string) => {
    try {
      if (!isAdmin) return;
      if (clockedIn) {
        await fetch(`${API_BASE}/api/attendance/clock-out`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({ employeeId: id, name }),
        });
      } else {
        await fetch(`${API_BASE}/api/attendance/clock-in`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({ employeeId: id, name }),
        });
      }
    } catch {}
    await refresh();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-sm text-muted-foreground">Time cards</h1>
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <Dialog open={openAdd} onOpenChange={setOpenAdd}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">Add time manually</Button>
              </DialogTrigger>
              <DialogContent className="bg-card" aria-describedby={undefined}>
                <DialogHeader>
                  <DialogTitle>Add time manually</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3">
                  <div className="space-y-1">
                    <Label>Member</Label>
                    <Input placeholder="Name" value={manualName} onChange={(e)=>setManualName(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label>Date</Label>
                      <DatePicker value={manualDate} onChange={setManualDate} placeholder="Pick date" />
                    </div>
                    <div className="space-y-1">
                      <Label>Clock in</Label>
                      <Input type="time" value={manualIn} onChange={(e)=>setManualIn(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Clock out</Label>
                      <Input type="time" value={manualOut} onChange={(e)=>setManualOut(e.target.value)} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenAdd(false)}>Close</Button>
                  <Button onClick={async () => {
                    try {
                      await fetch(`${API_BASE}/api/attendance/manual`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                        body: JSON.stringify({
                          name: manualName,
                          date: manualDate,
                          clockIn: manualIn ? `${manualDate}T${manualIn}:00` : undefined,
                          clockOut: manualOut ? `${manualDate}T${manualOut}:00` : undefined,
                        })
                      });
                    } catch {}
                    setOpenAdd(false);
                    setManualName(""); setManualDate(""); setManualIn(""); setManualOut("");
                    await refresh();
                  }}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9 w-56" />
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="bg-muted/40 flex flex-wrap lg:grid lg:grid-cols-6 w-full h-auto min-h-10 gap-1">
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="custom">Custom</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="summary-details">Summary details</TabsTrigger>
                <TabsTrigger value="members">Members Clocked In</TabsTrigger>
                <TabsTrigger value="clock">Clock in-out</TabsTrigger>
              </TabsList>

              <TabsContent value="clock" className="mt-4">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="w-[50%]">Team members</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Clock in-out</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {list.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="w-8 h-8">
                                  <AvatarImage src={toAbsoluteAvatar(m.avatar)} alt={m.name} />
                                  <AvatarFallback className="bg-muted text-foreground/70 text-xs font-semibold">{m.initials}</AvatarFallback>
                                </Avatar>
                                <button
                                  type="button"
                                  className="capitalize text-left hover:underline"
                                  onClick={() => navigate(`/hrm/employees/${m.id}`, { state: { dbId: m.id } })}
                                >
                                  {m.name}
                                </button>
                              </div>
                            </TableCell>
                            <TableCell>
                              {m.clockedIn ? (
                                <span className="text-sm text-muted-foreground">Clock started at : {m.startTime}</span>
                              ) : (
                                <span className="text-sm text-muted-foreground">Not clocked in yet</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {isAdmin ? (
                                m.clockedIn ? (
                                  <Button variant="outline" size="sm" onClick={() => toggleClock(m.id, true, m.name)}>Clock Out</Button>
                                ) : (
                                  <Button variant="outline" size="sm" onClick={() => toggleClock(m.id, false, m.name)}>Clock In</Button>
                                )
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="members" className="mt-4">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="w-[50%]">Members</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clockedInList.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="w-8 h-8">
                                  <AvatarImage src={toAbsoluteAvatar(m.avatar)} alt={m.name} />
                                  <AvatarFallback className="bg-muted text-foreground/70 text-xs font-semibold">{m.initials}</AvatarFallback>
                                </Avatar>
                                <button
                                  type="button"
                                  className="capitalize text-left hover:underline"
                                  onClick={() => navigate(`/hrm/employees/${m.id}`, { state: { dbId: m.id } })}
                                >
                                  {m.name}
                                </button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">Clock started at : {m.startTime}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              {isAdmin ? (
                                <Button variant="outline" size="sm" onClick={() => toggleClock(m.id, true, m.name)}>Clock Out</Button>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="daily" className="mt-4">
                <Card>
                  <CardContent className="p-0">
                    {loading && <div className="p-4 text-sm text-muted-foreground">Loading...</div>}
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead>Employee</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Clock in</TableHead>
                          <TableHead>Clock out</TableHead>
                          <TableHead className="text-right">Hours</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recordsWithMember.map((r: any) => {
                          const m = r._member as Member | undefined;
                          const hours = calcHours(r.clockIn, r.clockOut);
                          const date = r.date ? new Date(r.date).toISOString().slice(0, 10) : "";
                          return (
                            <TableRow key={r._id || `${r.employeeId}-${r.date}`}
                            >
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-8 h-8">
                                    <AvatarImage src={toAbsoluteAvatar(m?.avatar)} alt={m?.name || r.name} />
                                    <AvatarFallback className="bg-muted text-foreground/70 text-xs font-semibold">{(m?.initials || "U").slice(0,2)}</AvatarFallback>
                                  </Avatar>
                                  <button
                                    type="button"
                                    className="capitalize text-left hover:underline"
                                    onClick={() => r.employeeId && navigate(`/hrm/employees/${r.employeeId}`, { state: { dbId: r.employeeId } })}
                                  >
                                    {m?.name || r.name || ""}
                                  </button>
                                </div>
                              </TableCell>
                              <TableCell>{date}</TableCell>
                              <TableCell>{r.clockIn ? new Date(r.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</TableCell>
                              <TableCell>{r.clockOut ? new Date(r.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</TableCell>
                              <TableCell className="text-right">{hours ? hours.toFixed(2) : "0.00"}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="custom" className="mt-4">
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="space-y-1">
                        <Label>From</Label>
                        <DatePicker value={rangeFrom} onChange={setRangeFrom} placeholder="From" />
                      </div>
                      <div className="space-y-1">
                        <Label>To</Label>
                        <DatePicker value={rangeTo} onChange={setRangeTo} placeholder="To" />
                      </div>
                      <Button variant="outline" onClick={() => loadRecords({ from: rangeFrom || undefined, to: rangeTo || undefined })} disabled={loading}>
                        Apply
                      </Button>
                    </div>

                    <div className="border rounded-md overflow-hidden">
                      {loading && <div className="p-3 text-sm text-muted-foreground">Loading...</div>}
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead>Employee</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Clock in</TableHead>
                            <TableHead>Clock out</TableHead>
                            <TableHead className="text-right">Hours</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recordsWithMember.map((r: any) => {
                            const m = r._member as Member | undefined;
                            const hours = calcHours(r.clockIn, r.clockOut);
                            const date = r.date ? new Date(r.date).toISOString().slice(0, 10) : "";
                            return (
                              <TableRow key={r._id || `${r.employeeId}-${r.date}`}
                              >
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar className="w-8 h-8">
                                      <AvatarImage src={toAbsoluteAvatar(m?.avatar)} alt={m?.name || r.name} />
                                      <AvatarFallback className="bg-muted text-foreground/70 text-xs font-semibold">{(m?.initials || "U").slice(0,2)}</AvatarFallback>
                                    </Avatar>
                                    <button
                                      type="button"
                                      className="capitalize text-left hover:underline"
                                      onClick={() => r.employeeId && navigate(`/hrm/employees/${r.employeeId}`, { state: { dbId: r.employeeId } })}
                                    >
                                      {m?.name || r.name || ""}
                                    </button>
                                  </div>
                                </TableCell>
                                <TableCell>{date}</TableCell>
                                <TableCell>{r.clockIn ? new Date(r.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</TableCell>
                                <TableCell>{r.clockOut ? new Date(r.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</TableCell>
                                <TableCell className="text-right">{hours ? hours.toFixed(2) : "0.00"}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="summary" className="mt-4">
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="space-y-1">
                        <Label>From</Label>
                        <DatePicker value={rangeFrom} onChange={setRangeFrom} placeholder="From" />
                      </div>
                      <div className="space-y-1">
                        <Label>To</Label>
                        <DatePicker value={rangeTo} onChange={setRangeTo} placeholder="To" />
                      </div>
                      <Button variant="outline" onClick={() => loadRecords({ from: rangeFrom || undefined, to: rangeTo || undefined })} disabled={loading}>
                        Refresh
                      </Button>
                    </div>

                    <div className="border rounded-md overflow-hidden">
                      {loading && <div className="p-3 text-sm text-muted-foreground">Loading...</div>}
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead>Employee</TableHead>
                            <TableHead className="text-right">Days</TableHead>
                            <TableHead className="text-right">Total hours</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {summaryRows.map((r) => (
                            <TableRow key={r.employeeId}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-8 h-8">
                                    <AvatarImage src={toAbsoluteAvatar(r.member?.avatar)} alt={r.member?.name || ""} />
                                    <AvatarFallback className="bg-muted text-foreground/70 text-xs font-semibold">{(r.member?.initials || "U").slice(0,2)}</AvatarFallback>
                                  </Avatar>
                                  <button
                                    type="button"
                                    className="capitalize text-left hover:underline"
                                    onClick={() => navigate(`/hrm/employees/${r.employeeId}`, { state: { dbId: r.employeeId } })}
                                  >
                                    {r.member?.name || ""}
                                  </button>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{r.days}</TableCell>
                              <TableCell className="text-right">{r.totalHours.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="summary-details" className="mt-4">
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="space-y-1">
                        <Label>From</Label>
                        <DatePicker value={rangeFrom} onChange={setRangeFrom} placeholder="From" />
                      </div>
                      <div className="space-y-1">
                        <Label>To</Label>
                        <DatePicker value={rangeTo} onChange={setRangeTo} placeholder="To" />
                      </div>
                      <Button variant="outline" onClick={() => loadRecords({ from: rangeFrom || undefined, to: rangeTo || undefined })} disabled={loading}>
                        Refresh
                      </Button>
                    </div>

                    <div className="border rounded-md overflow-hidden">
                      {loading && <div className="p-3 text-sm text-muted-foreground">Loading...</div>}
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead>Employee</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Hours</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recordsWithMember.map((r: any) => {
                            const m = r._member as Member | undefined;
                            const hours = calcHours(r.clockIn, r.clockOut);
                            const date = r.date ? new Date(r.date).toISOString().slice(0, 10) : "";
                            return (
                              <TableRow key={r._id || `${r.employeeId}-${r.date}`}
                              >
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar className="w-8 h-8">
                                      <AvatarImage src={toAbsoluteAvatar(m?.avatar)} alt={m?.name || r.name} />
                                      <AvatarFallback className="bg-muted text-foreground/70 text-xs font-semibold">{(m?.initials || "U").slice(0,2)}</AvatarFallback>
                                    </Avatar>
                                    <button
                                      type="button"
                                      className="capitalize text-left hover:underline"
                                      onClick={() => r.employeeId && navigate(`/hrm/employees/${r.employeeId}`, { state: { dbId: r.employeeId } })}
                                    >
                                      {m?.name || r.name || ""}
                                    </button>
                                  </div>
                                </TableCell>
                                <TableCell>{date}</TableCell>
                                <TableCell className="text-right">{hours ? hours.toFixed(2) : "0.00"}</TableCell>
                                <TableCell className="max-w-[420px] truncate">{r.notes || ""}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



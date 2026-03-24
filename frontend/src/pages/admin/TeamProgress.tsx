import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Trophy, Award, Star, TrendingUp, Calendar, CheckCircle2, Briefcase, IndianRupee, Users, ArrowUpRight, Search, Filter } from "lucide-react";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, isToday } from "date-fns";
import { cn } from "@/lib/utils";

type Metric = {
  completed: number;
  total: number;
  daysPresent?: number;
  totalDays?: number;
  amount?: number;
  count?: number;
  commissions?: number;
};

type Scores = {
  attendance: number;
  tasks: number;
  projects: number;
  sales: number;
  overall: number;
};

type TeamMemberProgress = {
  employeeId: string;
  name: string;
  role: string;
  avatar?: string;
  metrics: {
    attendance: Metric;
    tasks: Metric;
    projects: Metric;
    sales: Metric;
  };
  scores: Scores;
};

export default function TeamProgress() {
  const [data, setData] = useState<TeamMemberProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("month");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      let from, to;
      const now = new Date();

      if (timeRange === "day") {
        from = now.toISOString();
        to = now.toISOString();
      } else if (timeRange === "week") {
        from = startOfWeek(now).toISOString();
        to = endOfWeek(now).toISOString();
      } else if (timeRange === "year") {
        from = startOfYear(now).toISOString();
        to = endOfYear(now).toISOString();
      } else {
        // month
        from = startOfMonth(now).toISOString();
        to = endOfMonth(now).toISOString();
      }

      const res = await fetch(`${API_BASE}/api/reports/team-progress?from=${from}&to=${to}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch team progress");
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      toast.error(e.message || "Failed to load team progress data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const filteredData = data.filter(member => 
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const topPerformers = [...data].sort((a, b) => b.scores.overall - a.scores.overall).slice(0, 3);

  const getAwardTitle = (index: number) => {
    if (index === 0) return `Employee of the ${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)}`;
    if (index === 1) return "Outstanding Performer";
    return "Rising Star";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
        <div className="flex flex-col gap-4 sm:gap-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Team Progress</h1>
              <p className="text-sm text-muted-foreground">Performance overview and ranking for the selected time range.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-full sm:w-[200px] rounded-xl">
                  <SelectValue placeholder="Select Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Today</SelectItem>
                  <SelectItem value="week">This week</SelectItem>
                  <SelectItem value="month">This month</SelectItem>
                  <SelectItem value="year">This year</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={fetchData} variant="outline" className="rounded-xl">
                Sync
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4">
            <Card className="rounded-2xl border bg-gradient-to-br from-indigo-600 via-indigo-600 to-slate-900 text-white shadow-xl overflow-hidden">
              <CardContent className="p-5 sm:p-7">
                {topPerformers[0] ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar className="h-14 w-14 sm:h-16 sm:w-16 ring-4 ring-white/15">
                          <AvatarImage src={topPerformers[0].avatar} />
                          <AvatarFallback className="bg-white/10 text-white font-semibold">
                            {topPerformers[0].name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -top-2 -right-2 rounded-xl bg-white/10 backdrop-blur px-2 py-1 border border-white/15 shadow">
                          <div className="flex items-center gap-1">
                            <Trophy className="h-4 w-4" />
                            <span className="text-[10px] font-semibold tracking-wide">#1</span>
                          </div>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm opacity-80">Top performer</div>
                        <div className="text-xl sm:text-2xl font-semibold leading-tight truncate">{topPerformers[0].name}</div>
                        <div className="text-xs opacity-80 truncate">{topPerformers[0].role}</div>
                      </div>
                    </div>

                    <div className="flex-1 grid grid-cols-2 gap-3 sm:gap-4">
                      <div className="rounded-xl bg-white/10 border border-white/15 p-3">
                        <div className="text-[11px] opacity-80">Net score</div>
                        <div className="text-2xl font-semibold tabular-nums">{topPerformers[0].scores.overall}%</div>
                        <Progress value={topPerformers[0].scores.overall} className="h-1.5 bg-white/15" />
                      </div>
                      <div className="rounded-xl bg-white/10 border border-white/15 p-3">
                        <div className="text-[11px] opacity-80">Sales</div>
                        <div className="text-2xl font-semibold tabular-nums">
                          Rs.{(topPerformers[0].metrics.sales.amount || 0).toLocaleString()}
                        </div>
                        <div className="text-[11px] opacity-80">{topPerformers[0].metrics.sales.count || 0} deals</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-sm opacity-80">No data yet for this range.</div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              {(topPerformers.slice(1) || []).map((member, index) => (
                <Card key={member.employeeId} className="rounded-2xl border shadow-sm">
                  <CardContent className="p-5 flex items-center gap-4">
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback className="font-semibold">{member.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{member.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{member.role}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Score</div>
                          <div className="font-semibold tabular-nums">{member.scores.overall}%</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <Progress value={member.scores.overall} className="h-1.5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <Card className="rounded-2xl border shadow-sm overflow-hidden">
          <CardHeader className="p-5 sm:p-6 border-b bg-muted/30">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-base sm:text-lg">Authority metrics</CardTitle>
                <CardDescription>Compare attendance, tasks, projects, and sales.</CardDescription>
              </div>
              <div className="relative w-full md:w-[320px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search team…"
                  className="pl-9 rounded-xl"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead className="py-4 px-5 text-left">Member</TableHead>
                    <TableHead className="py-4 px-4 text-center">Attendance</TableHead>
                    <TableHead className="py-4 px-4 text-center">Tasks</TableHead>
                    <TableHead className="py-4 px-4 text-center">Projects</TableHead>
                    <TableHead className="py-4 px-4 text-center">Sales</TableHead>
                    <TableHead className="py-4 px-5 text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-16 text-center text-sm text-muted-foreground">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Users className="w-10 h-10 opacity-40" />
                          <div className="text-sm">No results</div>
                          <div className="text-xs">Try a different search or time range.</div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((member) => {
                      const isTop = topPerformers[0]?.employeeId === member.employeeId;
                      return (
                        <TableRow key={member.employeeId} className={cn("hover:bg-muted/30", isTop && "bg-indigo-50/70 hover:bg-indigo-50/70")}> 
                          <TableCell className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={member.avatar} />
                                <AvatarFallback className="font-semibold">{member.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium truncate">{member.name}</span>
                                  {isTop ? (
                                    <Badge className="bg-indigo-600 text-white border-0">#1</Badge>
                                  ) : null}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">{member.role}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-4 text-center">
                            <div className="space-y-1.5 min-w-[120px] mx-auto">
                              <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
                                <span>{member.metrics.attendance.daysPresent}/{member.metrics.attendance.totalDays}</span>
                                <span>{member.scores.attendance}%</span>
                              </div>
                              <Progress value={member.scores.attendance} className="h-1.5" />
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-4 text-center">
                            <div className="space-y-1.5 min-w-[120px] mx-auto">
                              <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
                                <span>{member.metrics.tasks.completed}/{member.metrics.tasks.total}</span>
                                <span>{member.scores.tasks}%</span>
                              </div>
                              <Progress value={member.scores.tasks} className="h-1.5" />
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-4 text-center">
                            <div className="space-y-1.5 min-w-[120px] mx-auto">
                              <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
                                <span>{member.metrics.projects.completed}/{member.metrics.projects.total}</span>
                                <span>{member.scores.projects}%</span>
                              </div>
                              <Progress value={member.scores.projects} className="h-1.5" />
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-4 text-center">
                            <div className="text-sm font-medium tabular-nums">Rs.{(member.metrics.sales.amount || 0).toLocaleString()}</div>
                            <div className="text-[11px] text-muted-foreground tabular-nums">{member.metrics.sales.count || 0} deals</div>
                          </TableCell>
                          <TableCell className="py-4 px-5 text-right">
                            <div className="inline-flex items-center gap-2 justify-end">
                              <span className="font-semibold tabular-nums">{member.scores.overall}%</span>
                              <TrendingUp className="w-4 h-4 text-emerald-500" />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

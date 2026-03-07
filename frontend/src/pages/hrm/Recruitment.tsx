import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";

interface Job {
  id: string;
  title: string;
  department: string;
  openings: number;
  status: "open" | "closed";
  posted: string; // YYYY-MM-DD
}

interface Candidate {
  id: string;
  name: string;
  role: string;
  stage: "Applied" | "Screening" | "Interview" | "Offer" | "Hired";
  applied: string; // date
}

interface InterviewRow {
  id: string;
  candidateId?: string;
  jobId?: string;
  candidateName: string;
  jobTitle: string;
  when: string; // ISO string local
  mode: "onsite" | "remote" | "phone";
  location: string;
  interviewer: string;
  status: "scheduled" | "completed" | "canceled";
  notes?: string;
}

const jobsSeed: Job[] = [];
const candidatesSeed: Candidate[] = [];

export default function Recruitment() {
  const [tab, setTab] = useState("jobs");
  const [jobs, setJobs] = useState<Job[]>(jobsSeed);
  const [candidates, setCandidates] = useState<Candidate[]>(candidatesSeed);
  const [query, setQuery] = useState("");
  const [openJob, setOpenJob] = useState(false);
  const [openCandidate, setOpenCandidate] = useState(false);
  const [openInterview, setOpenInterview] = useState(false);

  // job form
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [openings, setOpenings] = useState(1);

  // candidate form
  const [name, setName] = useState("");
  const [role, setRole] = useState("");

  // interview form
  const [ivCandidateId, setIvCandidateId] = useState<string>("none");
  const [ivJobId, setIvJobId] = useState<string>("none");
  const [ivWhen, setIvWhen] = useState(""); // yyyy-MM-ddTHH:mm
  const [ivMode, setIvMode] = useState<"onsite" | "remote" | "phone">("onsite");
  const [ivLocation, setIvLocation] = useState("");
  const [ivInterviewer, setIvInterviewer] = useState("");
  const [ivNotes, setIvNotes] = useState("");

  const [interviews, setInterviews] = useState<InterviewRow[]>([]);

  const jobList = useMemo(() => {
    const s = query.toLowerCase();
    return jobs.filter((j) => j.title.toLowerCase().includes(s) || j.department.toLowerCase().includes(s));
  }, [jobs, query]);

  const candidateList = useMemo(() => {
    const s = query.toLowerCase();
    return candidates.filter((c) => c.name.toLowerCase().includes(s) || c.role.toLowerCase().includes(s));
  }, [candidates, query]);

  useEffect(() => {
    (async () => {
      try {
        const url = `${API_BASE}/api/jobs${query ? `?q=${encodeURIComponent(query)}` : ""}`;
        const res = await fetch(url, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          const mapped: Job[] = (Array.isArray(data) ? data : []).map((d: any) => ({
            id: String(d._id || ""),
            title: d.title || "-",
            department: d.department || "-",
            openings: Number(d.openings || 0),
            status: (d.status as any) || "open",
            posted: d.posted ? new Date(d.posted).toISOString().slice(0,10) : "",
          }));
          setJobs(mapped);
        }
      } catch {}
    })();
  }, [query]);

  useEffect(() => {
    (async () => {
      try {
        const url = `${API_BASE}/api/interviews${query ? `?q=${encodeURIComponent(query)}` : ""}`;
        const res = await fetch(url, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          const mapped: InterviewRow[] = (Array.isArray(data) ? data : []).map((d: any) => ({
            id: String(d._id || ""),
            candidateId: d.candidateId ? String(d.candidateId) : undefined,
            jobId: d.jobId ? String(d.jobId) : undefined,
            candidateName: d.candidateName || "-",
            jobTitle: d.jobTitle || "-",
            when: d.when ? new Date(d.when).toISOString() : "",
            mode: (d.mode as any) || "onsite",
            location: d.location || "",
            interviewer: d.interviewer || "",
            status: (d.status as any) || "scheduled",
            notes: d.notes || "",
          }));
          setInterviews(mapped);
        }
      } catch {}
    })();
  }, [query]);

  useEffect(() => {
    (async () => {
      try {
        const url = `${API_BASE}/api/candidates${query ? `?q=${encodeURIComponent(query)}` : ""}`;
        const res = await fetch(url, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          const mapped: Candidate[] = (Array.isArray(data) ? data : []).map((d: any) => ({
            id: String(d._id || ""),
            name: d.name || "-",
            role: d.role || "-",
            stage: (d.stage as any) || "Applied",
            applied: d.applied ? new Date(d.applied).toISOString().slice(0,10) : "",
          }));
          setCandidates(mapped);
        }
      } catch {}
    })();
  }, [query]);

  const addJob = async () => {
    if (!title.trim()) return;
    try {
      const payload = { title: title.trim(), department: department || "-", openings, status: "open" } as any;
      const res = await fetch(`${API_BASE}/api/jobs`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const d = await res.json();
        const row: Job = {
          id: String(d._id || ""),
          title: d.title || payload.title,
          department: d.department || payload.department,
          openings: Number(d.openings ?? payload.openings),
          status: (d.status as any) || "open",
          posted: d.posted ? new Date(d.posted).toISOString().slice(0,10) : new Date().toISOString().slice(0,10),
        };
        setJobs((prev) => [row, ...prev]);
        setOpenJob(false); setTitle(""); setDepartment(""); setOpenings(1);
        toast.success("Job posted");
      }
    } catch {}
  };

  const addCandidate = async () => {
    if (!name.trim() || !role.trim()) return;
    try {
      const payload = { name: name.trim(), role: role.trim(), stage: "Applied" } as any;
      const res = await fetch(`${API_BASE}/api/candidates`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const d = await res.json();
        const row: Candidate = {
          id: String(d._id || ""),
          name: d.name || payload.name,
          role: d.role || payload.role,
          stage: (d.stage as any) || "Applied",
          applied: d.applied ? new Date(d.applied).toISOString().slice(0,10) : new Date().toISOString().slice(0,10),
        };
        setCandidates((prev) => [row, ...prev]);
        setOpenCandidate(false); setName(""); setRole("");
        toast.success("Candidate added");
      }
    } catch {}
  };

  const scheduleInterview = async () => {
    if (!ivWhen || ivCandidateId === "none" || ivJobId === "none") return;
    try {
      const cand = candidates.find((c) => c.id === ivCandidateId);
      const job = jobs.find((j) => j.id === ivJobId);
      const payload: any = {
        candidateId: ivCandidateId,
        jobId: ivJobId,
        candidateName: cand?.name || "-",
        jobTitle: job?.title || "-",
        when: new Date(ivWhen),
        mode: ivMode,
        location: ivLocation,
        interviewer: ivInterviewer,
        status: "scheduled",
        notes: ivNotes,
      };
      const res = await fetch(`${API_BASE}/api/interviews`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const d = await res.json();
        const row: InterviewRow = {
          id: String(d._id || ""),
          candidateId: String(d.candidateId || ""),
          jobId: String(d.jobId || ""),
          candidateName: d.candidateName || payload.candidateName,
          jobTitle: d.jobTitle || payload.jobTitle,
          when: d.when ? new Date(d.when).toISOString() : ivWhen,
          mode: (d.mode as any) || payload.mode,
          location: d.location || payload.location,
          interviewer: d.interviewer || payload.interviewer,
          status: (d.status as any) || "scheduled",
          notes: d.notes || payload.notes,
        };
        setInterviews((prev) => [row, ...prev]);
        setOpenInterview(false);
        setIvCandidateId("none"); setIvJobId("none"); setIvWhen(""); setIvMode("onsite"); setIvLocation(""); setIvInterviewer(""); setIvNotes("");
        toast.success("Interview scheduled");
      }
    } catch {}
  };

  const deleteInterview = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/interviews/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      setInterviews((prev) => prev.filter((x) => x.id !== id));
      toast.success("Interview removed");
    } catch {}
  };

  const markCompleted = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/interviews/${id}`, { method: "PUT", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ status: "completed" }) });
      if (res.ok) {
        const d = await res.json();
        setInterviews((prev) => prev.map((x) => (x.id === id ? { ...x, status: (d.status as any) || "completed" } : x)));
        toast.success("Interview marked completed");
      }
    } catch {}
  };

  const stageBadge = (s: Candidate["stage"]) => {
    switch (s) {
      case "Applied": return <Badge>Applied</Badge>;
      case "Screening": return <Badge variant="secondary">Screening</Badge>;
      case "Interview": return <Badge variant="warning">Interview</Badge>;
      case "Offer": return <Badge variant="success">Offer</Badge>;
      case "Hired": return <Badge variant="success">Hired</Badge>;
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-sm text-muted-foreground">Recruitment</h1>
        <div className="flex items-center gap-2">
          <Dialog open={openJob} onOpenChange={setOpenJob}>
            <DialogTrigger asChild><Button size="sm" variant="outline">Post job</Button></DialogTrigger>
            <DialogContent className="bg-card">
              <DialogHeader><DialogTitle>Post job</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div className="space-y-1"><Label>Title</Label><Input placeholder="Job title" value={title} onChange={(e)=>setTitle(e.target.value)} /></div>
                <div className="space-y-1"><Label>Department</Label><Input placeholder="Department" value={department} onChange={(e)=>setDepartment(e.target.value)} /></div>
                <div className="space-y-1"><Label>Openings</Label><Input type="number" min={1} value={openings} onChange={(e)=>setOpenings(parseInt(e.target.value || '1'))} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={()=>setOpenJob(false)}>Close</Button>
                <Button onClick={addJob}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={openCandidate} onOpenChange={setOpenCandidate}>
            <DialogTrigger asChild><Button size="sm" variant="outline">Add candidate</Button></DialogTrigger>
            <DialogContent className="bg-card">
              <DialogHeader><DialogTitle>Add candidate</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div className="space-y-1"><Label>Name</Label><Input placeholder="Candidate name" value={name} onChange={(e)=>setName(e.target.value)} /></div>
                <div className="space-y-1"><Label>Role</Label><Input placeholder="Role" value={role} onChange={(e)=>setRole(e.target.value)} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={()=>setOpenCandidate(false)}>Close</Button>
                <Button onClick={addCandidate}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search" value={query} onChange={(e)=>setQuery(e.target.value)} className="pl-9 w-56" />
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="bg-muted/40 flex flex-wrap gap-1">
              <TabsTrigger value="jobs">Jobs</TabsTrigger>
              <TabsTrigger value="candidates">Candidates</TabsTrigger>
              <TabsTrigger value="interviews">Interviews</TabsTrigger>
            </TabsList>

            <TabsContent value="jobs" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Title</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Openings</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Posted</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobList.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell className="text-primary underline cursor-pointer">{j.title}</TableCell>
                      <TableCell>{j.department}</TableCell>
                      <TableCell>{j.openings}</TableCell>
                      <TableCell>{j.status === 'open' ? <Badge variant="success">Open</Badge> : <Badge variant="secondary">Closed</Badge>}</TableCell>
                      <TableCell>{j.posted}</TableCell>
                      <TableCell className="text-right">⋮</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="candidates" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidateList.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.name}</TableCell>
                      <TableCell>{c.role}</TableCell>
                      <TableCell>{stageBadge(c.stage)}</TableCell>
                      <TableCell>{c.applied}</TableCell>
                      <TableCell className="text-right">⋮</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="interviews" className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <Dialog open={openInterview} onOpenChange={setOpenInterview}>
                  <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-2"/>Schedule interview</Button></DialogTrigger>
                  <DialogContent className="bg-card max-w-2xl">
                    <DialogHeader><DialogTitle>Schedule interview</DialogTitle></DialogHeader>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label>Candidate</Label>
                        <Select value={ivCandidateId} onValueChange={setIvCandidateId}>
                          <SelectTrigger><SelectValue placeholder="Select candidate"/></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Select candidate</SelectItem>
                            {candidates.map((c)=> (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Job</Label>
                        <Select value={ivJobId} onValueChange={setIvJobId}>
                          <SelectTrigger><SelectValue placeholder="Select job"/></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Select job</SelectItem>
                            {jobs.map((j)=> (
                              <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Date & time</Label>
                        <DateTimePicker value={ivWhen} onChange={setIvWhen} placeholder="Pick date & time" />
                      </div>
                      <div>
                        <Label>Mode</Label>
                        <Select value={ivMode} onValueChange={(v)=>setIvMode(v as any)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="onsite">On site</SelectItem>
                            <SelectItem value="remote">Remote</SelectItem>
                            <SelectItem value="phone">Phone</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Location</Label>
                        <Input value={ivLocation} onChange={(e)=>setIvLocation(e.target.value)} />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Interviewer</Label>
                        <Input value={ivInterviewer} onChange={(e)=>setIvInterviewer(e.target.value)} />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Notes</Label>
                        <Textarea value={ivNotes} onChange={(e)=>setIvNotes(e.target.value)} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={()=>setOpenInterview(false)}>Close</Button>
                      <Button onClick={scheduleInterview}>Save</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Candidate</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Interviewer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interviews.map((iv)=> (
                    <TableRow key={iv.id}>
                      <TableCell>{iv.candidateName}</TableCell>
                      <TableCell>{iv.jobTitle}</TableCell>
                      <TableCell>{iv.when ? new Date(iv.when).toLocaleString() : '-'}</TableCell>
                      <TableCell className="capitalize">{iv.mode}</TableCell>
                      <TableCell>{iv.location || '-'}</TableCell>
                      <TableCell>{iv.interviewer || '-'}</TableCell>
                      <TableCell className="capitalize">{iv.status}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={()=>markCompleted(iv.id)}>Complete</Button>
                        <Button size="sm" variant="outline" onClick={()=>deleteInterview(iv.id)}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

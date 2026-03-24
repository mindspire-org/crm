import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSettings } from "@/hooks/useSettings";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Plus,
  MoreHorizontal,
  Calendar,
  Users,
  Briefcase,
  MapPin,
  DollarSign,
  Layout,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Clock,
  ChevronRight,
  Link as LinkIcon,
  MessageCircle,
  Mail,
  Tag,
  Eye,
  Phone,
  Trophy,
  FileText,
  Globe,
  User,
  Download,
  Printer,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/sonner";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

interface Job {
  id: string;
  title: string;
  department: string;
  openings: number;
  status: "open" | "closed";
  posted: string;
  location?: string;
  salary?: string;
  type?: string;
  description?: string;
  requirements?: string[];
  benefits?: string[];
}

interface Candidate {
  id: string;
  name: string;
  role: string;
  stage: "Applied" | "Screening" | "Interview" | "Offer" | "Hired";
  applied: string;
  email?: string;
  phone?: string;
  portfolioUrl?: string;
  labels?: string[];
  photoUrl?: string;
  resumeUrl?: string;
  experience?: string;
  category?: string;
  notes?: string;
  city?: string;
  company?: string;
  contactMethod?: string;
}

interface InterviewRow {
  id: string;
  candidateId?: string;
  jobId?: string;
  candidateName: string;
  jobTitle: string;
  when: string;
  mode: "onsite" | "remote" | "phone";
  location: string;
  interviewer: string;
  status: "scheduled" | "completed" | "canceled";
  notes?: string;
}

export default function Recruitment() {
  const navigate = useNavigate();
  const locationState = useLocation();
  const { settings } = useSettings();
  const [tab, setTab] = useState("jobs");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [query, setQuery] = useState("");
  const [openJob, setOpenJob] = useState(false);
  const [openCandidate, setOpenCandidate] = useState(false);
  const [openInterview, setOpenInterview] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [openJobDetail, setOpenJobDetail] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [openCandidateDetail, setOpenCandidateDetail] = useState(false);
  const [isEditingJob, setIsEditingJob] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const cleanDomain = (settings?.general?.domain || "")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  const getPublicJobUrl = (jobId: string) => {
    if (cleanDomain) return `https://${cleanDomain}/public/jobs/${jobId}/enroll`;
    return `${window.location.origin}/public/jobs/${jobId}/enroll`;
  };

  const [downloading, setDownloading] = useState(false);

  const handlePrintProfile = () => {
    window.print();
  };

  const handleDownloadProfile = async () => {
    if (!profileRef.current || !selectedCandidate) return;
    try {
      setDownloading(true);
      const canvas = await html2canvas(profileRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`candidate-${selectedCandidate.name.replace(/\s+/g, "-").toLowerCase()}.pdf`);
      toast.success("Profile downloaded as PDF");
    } catch (e) {
      toast.error("Failed to download profile");
    } finally {
      setDownloading(false);
    }
  };

  // job form
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [openings, setOpenings] = useState(1);
  const [location, setLocation] = useState("Lahore, Pakistan");
  const [salary, setSalary] = useState("");
  const [jobType, setJobType] = useState("Full-time");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [benefits, setBenefits] = useState("");

  // candidate form
  const [name, setName] = useState("");
  const [role, setRole] = useState("");

  // interview form
  const [ivCandidateId, setIvCandidateId] = useState<string>("none");
  const [ivJobId, setIvJobId] = useState<string>("none");
  const [ivWhen, setIvWhen] = useState("");
  const [ivMode, setIvMode] = useState<"onsite" | "remote" | "phone">("onsite");
  const [ivLocation, setIvLocation] = useState("");
  const [ivInterviewer, setIvInterviewer] = useState("");
  const [ivNotes, setIvNotes] = useState("");
  const [interviews, setInterviews] = useState<InterviewRow[]>([]);

  const loadJobs = async () => {
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
          posted: d.posted ? new Date(d.posted).toISOString().slice(0, 10) : "",
          location: d.location || "Remote",
          salary: d.salary || "",
          type: d.type || "Full-time",
          description: d.description || "",
          requirements: d.requirements || [],
          benefits: d.benefits || [],
        }));
        setJobs(mapped);
      }
    } catch {}
  };

  useEffect(() => { loadJobs(); }, [query]);

  useEffect(() => {
    if (locationState.state?.editJobId && jobs.length > 0) {
      const jobToEdit = jobs.find(j => j.id === locationState.state.editJobId);
      if (jobToEdit) {
        openEditJob(jobToEdit);
        // Clear the state so it doesn't re-open on every refresh
        window.history.replaceState({}, document.title);
      }
    }
  }, [locationState.state, jobs]);

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
            applied: d.applied ? new Date(d.applied).toISOString().slice(0, 10) : "",
            email: d.email || "",
            phone: d.phone || "",
            portfolioUrl: d.portfolioUrl || "",
            labels: Array.isArray(d.labels) ? d.labels : [],
            photoUrl: d.photoUrl || "",
            resumeUrl: d.resumeUrl || "",
            experience: d.experience || "",
            category: d.category || "",
            notes: d.notes || "",
            city: d.city || "",
          }));
          setCandidates(mapped);
        }
      } catch {}
    })();
  }, [query]);

  const addJob = async () => {
    if (!title.trim()) return;
    try {
      const payload = {
        title: title.trim(),
        department: department || "-",
        openings,
        status: "open",
        location,
        salary,
        type: jobType,
        description,
        requirements: requirements.split("\n").filter((r) => r.trim()),
        benefits: benefits.split("\n").filter((b) => b.trim()),
      };
      const res = await fetch(`${API_BASE}/api/jobs`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const newJob = await res.json();
        toast.success("Job posted successfully!");
        setOpenJob(false);
        setTitle(""); setDepartment(""); setOpenings(1); setLocation("Lahore, Pakistan");
        setSalary(""); setJobType("Full-time"); setDescription(""); setRequirements(""); setBenefits("");
        loadJobs();
        // Ask if they want to generate a poster
        if (newJob._id) {
          setTimeout(() => {
            navigate(`/hrm/jobs/${newJob._id}/poster`);
          }, 500);
        }
      }
    } catch {
      toast.error("Failed to post job");
    }
  };

  const addJobWithPoster = async () => {
    if (!title.trim()) return;
    try {
      const payload = {
        title: title.trim(),
        department: department || "-",
        openings,
        status: "open",
        location,
        salary,
        type: jobType,
        description,
        requirements: requirements.split("\n").filter((r) => r.trim()),
        benefits: benefits.split("\n").filter((b) => b.trim()),
      };
      const res = await fetch(`${API_BASE}/api/jobs`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const newJob = await res.json();
        toast.success("Job posted! Opening poster...");
        setOpenJob(false);
        setTitle(""); setDepartment(""); setOpenings(1); setLocation("Lahore, Pakistan");
        setSalary(""); setJobType("Full-time"); setDescription(""); setRequirements(""); setBenefits("");
        loadJobs();
        if (newJob._id) navigate(`/hrm/jobs/${newJob._id}/poster`);
      }
    } catch {
      toast.error("Failed to post job");
    }
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
          applied: d.applied ? new Date(d.applied).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          email: d.email || payload.email || "",
          phone: d.phone || payload.phone || "",
          portfolioUrl: d.portfolioUrl || payload.portfolioUrl || "",
          labels: Array.isArray(d.labels) ? d.labels : [],
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
        setIvCandidateId("none"); setIvJobId("none"); setIvWhen(""); setIvMode("onsite");
        setIvLocation(""); setIvInterviewer(""); setIvNotes("");
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
      const res = await fetch(`${API_BASE}/api/interviews/${id}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status: "completed" }),
      });
      if (res.ok) {
        const d = await res.json();
        setInterviews((prev) =>
          prev.map((x) => (x.id === id ? { ...x, status: (d.status as any) || "completed" } : x))
        );
        toast.success("Interview marked completed");
      }
    } catch {}
  };

  const updateCandidate = async (id: string, updates: Partial<Candidate>) => {
    try {
      const res = await fetch(`${API_BASE}/api/candidates/${id}`, {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated, id: String(updated._id) } : c)));
        toast.success("Candidate updated");
      }
    } catch (e) {
      toast.error("Update failed");
    }
  };

  const closeJob = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${id}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status: "closed" }),
      });
      if (res.ok) {
        toast.success("Job position closed");
        loadJobs();
      }
    } catch {
      toast.error("Failed to close job");
    }
  };

  const deleteJob = async (id: string) => {
    if (!confirm("Are you sure you want to delete this job?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        toast.success("Job deleted successfully");
        loadJobs();
      }
    } catch {
      toast.error("Failed to delete job");
    }
  };

  const toggleJobStatus = async (job: Job) => {
    const newStatus = job.status === "open" ? "closed" : "open";
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${job.id}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(`Job ${newStatus === "open" ? "published" : "unpublished"}`);
        loadJobs();
      }
    } catch {
      toast.error("Failed to update job status");
    }
  };

  const openEditJob = (job: Job) => {
    setEditingJobId(job.id);
    setIsEditingJob(true);
    setTitle(job.title);
    setDepartment(job.department);
    setOpenings(job.openings);
    setLocation(job.location || "");
    setSalary(job.salary || "");
    setJobType(job.type || "Full-time");
    setDescription(job.description || "");
    setRequirements(job.requirements?.join("\n") || "");
    setBenefits(job.benefits?.join("\n") || "");
    setOpenJob(true);
  };

  const updateJob = async () => {
    if (!editingJobId) return;
    try {
      const payload = {
        title: title.trim(),
        department: department || "-",
        openings,
        location,
        salary,
        type: jobType,
        description,
        requirements: requirements.split("\n").filter((r) => r.trim()),
        benefits: benefits.split("\n").filter((b) => b.trim()),
      };
      const res = await fetch(`${API_BASE}/api/jobs/${editingJobId}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success("Job updated successfully!");
        setOpenJob(false);
        setEditingJobId(null);
        setIsEditingJob(false);
        setTitle(""); setDepartment(""); setOpenings(1); setLocation("Lahore, Pakistan");
        setSalary(""); setJobType("Full-time"); setDescription(""); setRequirements(""); setBenefits("");
        loadJobs();
      }
    } catch {
      toast.error("Failed to update job");
    }
  };

  const markAsHired = async (cand: Candidate) => {
    try {
      await updateCandidate(cand.id, { stage: "Hired" });
      toast.success(`${cand.name} marked as Hired!`);
    } catch {
      toast.error("Failed to update candidate status");
    }
  };

  const copyApplicationLink = (id: string) => {
    const url = getPublicJobUrl(id);
    navigator.clipboard.writeText(url);
    toast.success("Application link copied!");
  };

  const openJobDetails = (job: Job) => {
    setSelectedJob(job);
    setOpenJobDetail(true);
  };

  const openCandidateDetails = (cand: Candidate) => {
    setSelectedCandidate(cand);
    setOpenCandidateDetail(true);
  };

  const shareWhatsApp = (phone?: string, name?: string) => {
    if (!phone) { toast.error("No phone number recorded."); return; }
    const text = `Hi ${name || 'there'},\n\nWe are reaching out from the Recruitment Team...`;
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const sendEmail = (email?: string) => {
    if (!email) { toast.error("No email recorded."); return; }
    window.open(`mailto:${email}`, "_blank");
  };

  const stageBadge = (s: Candidate["stage"]) => {
    const map: Record<string, { cls: string; label: string }> = {
      Applied: { cls: "bg-slate-100 text-slate-600", label: "Applied" },
      Screening: { cls: "bg-blue-50 text-blue-600", label: "Screening" },
      Interview: { cls: "bg-amber-50 text-amber-600", label: "Interview" },
      Offer: { cls: "bg-purple-50 text-purple-600", label: "Offer" },
      Hired: { cls: "bg-emerald-50 text-emerald-600", label: "Hired" },
    };
    const { cls, label } = map[s] || map.Applied;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${cls}`}>
        {label}
      </span>
    );
  };

  const jobList = useMemo(() => {
    const s = query.toLowerCase();
    return jobs.filter((j) => j.title.toLowerCase().includes(s) || j.department.toLowerCase().includes(s));
  }, [jobs, query]);

  const candidateList = useMemo(() => {
    const s = query.toLowerCase();
    return candidates.filter((c) => c.name.toLowerCase().includes(s) || c.role.toLowerCase().includes(s));
  }, [candidates, query]);

  const openJobs = jobs.filter((j) => j.status === "open").length;
  const totalOpenings = jobs.reduce((s, j) => s + j.openings, 0);
  const scheduledIvs = interviews.filter((i) => i.status === "scheduled").length;
  const hiredCount = candidates.filter((c) => c.stage === "Hired").length;

  // Reusable form field styles
  const inputCls =
    "h-12 rounded-xl bg-slate-50 border border-slate-100 focus:ring-2 ring-indigo-400 font-semibold px-4 text-sm placeholder:text-slate-300 transition-all";
  const labelCls = "text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block";

  return (
    <div className="p-6 sm:p-10 bg-slate-50/50 min-h-screen font-sans selection:bg-indigo-100">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-profile-area, .print-profile-area * { visibility: visible !important; }
          .print-profile-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20mm !important;
            background: white !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>
      {/* Candidate Profile Detail Dialog */}
      <Dialog open={openCandidateDetail} onOpenChange={setOpenCandidateDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border-0 shadow-2xl p-0">
          {selectedCandidate && (
            <div className="p-0 space-y-0 print-profile-area" ref={profileRef}>
              {/* Header with Photo */}
              <div className="relative h-48 bg-slate-900">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(79,70,229,0.2),transparent_50%)]" />
                <div className="absolute bottom-0 left-0 w-full p-8 flex items-end gap-6 translate-y-12">
                  <div className="w-32 h-32 rounded-3xl border-4 border-white bg-white shadow-xl overflow-hidden flex-shrink-0">
                    {selectedCandidate.photoUrl ? (
                      <img src={selectedCandidate.photoUrl} alt={selectedCandidate.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                        <Users className="w-12 h-12 text-slate-300" />
                      </div>
                    )}
                  </div>
                  <div className="mb-4">
                    <h2 className="text-3xl font-black tracking-tighter text-white drop-shadow-md">
                      {selectedCandidate.name}
                    </h2>
                    <p className="text-indigo-300 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                      <Briefcase className="w-3 h-3" /> {selectedCandidate.role}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-10 pt-20 grid md:grid-cols-[1fr_300px] gap-12">
                <div className="space-y-10">
                  {/* Basic Info Grid */}
                  <div className="grid grid-cols-2 gap-6">
                    {[
                      { label: "Email", value: selectedCandidate.email, icon: <Mail className="w-4 h-4" /> },
                      { label: "Phone", value: selectedCandidate.phone, icon: <Phone className="w-4 h-4" /> },
                      { label: "Location", value: selectedCandidate.city || "Not specified", icon: <MapPin className="w-4 h-4" /> },
                      { label: "Experience", value: selectedCandidate.experience || "Not specified", icon: <Trophy className="w-4 h-4" /> },
                    ].map((item, i) => (
                      <div key={i} className="space-y-1">
                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                          {item.icon} {item.label}
                        </div>
                        <div className="text-sm font-bold text-slate-700">{item.value || "—"}</div>
                      </div>
                    ))}
                  </div>

                  {/* Job Category */}
                  {selectedCandidate.category && (
                    <section>
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" /> Interested Category
                      </h3>
                      <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 px-4 py-2 rounded-xl text-xs font-bold">
                        {selectedCandidate.category}
                      </Badge>
                    </section>
                  )}

                  {/* Experience/Notes */}
                  {selectedCandidate.notes && (
                    <section>
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" /> Additional Notes
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed font-medium bg-slate-50 p-6 rounded-2xl border border-slate-100 italic">
                        "{selectedCandidate.notes}"
                      </p>
                    </section>
                  )}
                </div>

                <div className="space-y-8">
                  {/* Status & Stage */}
                  <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Pipeline Stage</h3>
                    <div className="space-y-3">
                      {stageBadge(selectedCandidate.stage)}
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        Applied on {new Date(selectedCandidate.applied).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Resume Section */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600" /> Documents
                    </h3>
                    {selectedCandidate.resumeUrl ? (
                      <Button 
                        asChild
                        className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100"
                      >
                        <a href={selectedCandidate.resumeUrl} target="_blank" rel="noopener noreferrer">
                          View Resume / CV
                        </a>
                      </Button>
                    ) : (
                      <div className="p-6 rounded-2xl border-2 border-dashed border-slate-100 text-center">
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No resume attached</p>
                      </div>
                    )}
                    {selectedCandidate.portfolioUrl && (
                      <Button 
                        variant="outline"
                        asChild
                        className="w-full h-14 rounded-2xl border-slate-200 font-bold uppercase text-[10px] tracking-widest"
                      >
                        <a href={selectedCandidate.portfolioUrl} target="_blank" rel="noopener noreferrer">
                          <Globe className="w-4 h-4 mr-2" /> Portfolio / LinkedIn
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter className="p-8 border-t border-slate-50 flex items-center justify-between bg-slate-50/30 no-print">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => shareWhatsApp(selectedCandidate.phone, selectedCandidate.name)}
                    className="rounded-xl border-emerald-100 bg-emerald-50/50 text-emerald-600 font-bold uppercase text-[10px] tracking-widest h-11 px-6 hover:bg-emerald-50"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => sendEmail(selectedCandidate.email)}
                    className="rounded-xl border-indigo-100 bg-indigo-50/50 text-indigo-600 font-bold uppercase text-[10px] tracking-widest h-11 px-6 hover:bg-indigo-50"
                  >
                    <Mail className="w-4 h-4 mr-2" /> Email
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handlePrintProfile}
                    className="rounded-xl border-slate-200 bg-white text-slate-600 font-bold uppercase text-[10px] tracking-widest h-11 px-6 hover:bg-slate-50"
                  >
                    <Printer className="w-4 h-4 mr-2" /> Print
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDownloadProfile}
                    disabled={downloading}
                    className="rounded-xl border-slate-200 bg-white text-slate-600 font-bold uppercase text-[10px] tracking-widest h-11 px-6 hover:bg-slate-50"
                  >
                    {downloading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                    Download
                  </Button>
                </div>
                <Button
                  onClick={() => setOpenCandidateDetail(false)}
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest h-11 px-8"
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ───── Hero header ───── */}
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 md:p-10 bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
        {/* Background accent */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-indigo-500/[0.04] rounded-full blur-3xl" />
          <div className="absolute -bottom-10 right-1/3 w-48 h-48 bg-violet-500/[0.03] rounded-full blur-2xl" />
        </div>

        {/* Left — branding */}
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl flex-shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-900 leading-none">
              Recruitment <span className="text-indigo-600">Portal</span>
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 mt-1.5">
              Talent Acquisition Hub
            </p>
          </div>
        </div>

        {/* Right — actions */}
        <div className="relative z-10 flex flex-wrap gap-3">
          <Dialog open={openCandidate} onOpenChange={setOpenCandidate}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-11 px-6 rounded-xl font-bold uppercase text-[11px] tracking-widest border-slate-200 hover:bg-slate-50">
                <Users className="w-4 h-4 mr-2" /> Add Candidate
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-3xl border-0 shadow-2xl">
              <div className="p-8 space-y-6">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black tracking-tighter">Add <span className="text-indigo-600">Candidate</span></DialogTitle>
                  <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Manually add a new candidate to your pipeline.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div><label className={labelCls}>Full Name</label><Input placeholder="e.g. Ali Hassan" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></div>
                  <div><label className={labelCls}>Applied Role</label><Input placeholder="e.g. UI Designer" value={role} onChange={(e) => setRole(e.target.value)} className={inputCls} /></div>
                </div>
                <DialogFooter className="pt-2">
                  <Button variant="ghost" onClick={() => setOpenCandidate(false)} className="font-bold text-[11px] uppercase tracking-widest">Cancel</Button>
                  <Button onClick={addCandidate} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase text-[11px] tracking-widest h-11 px-8 rounded-xl">Add</Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={openInterview} onOpenChange={setOpenInterview}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-11 px-6 rounded-xl font-bold uppercase text-[11px] tracking-widest border-slate-200 hover:bg-slate-50">
                <Calendar className="w-4 h-4 mr-2" /> Schedule Interview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg rounded-3xl border-0 shadow-2xl">
              <div className="p-8 space-y-6">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black tracking-tighter">Schedule <span className="text-indigo-600">Interview</span></DialogTitle>
                  <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Plan and schedule an interview with a candidate.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>Candidate</label>
                    <Select value={ivCandidateId} onValueChange={setIvCandidateId}>
                      <SelectTrigger className={`${inputCls} w-full`}><SelectValue placeholder="Select candidate" /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="none">Select candidate</SelectItem>
                        {candidates.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className={labelCls}>Job Position</label>
                    <Select value={ivJobId} onValueChange={setIvJobId}>
                      <SelectTrigger className={`${inputCls} w-full`}><SelectValue placeholder="Select job" /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="none">Select job</SelectItem>
                        {jobs.map((j) => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className={labelCls}>Date & Time</label>
                    <DateTimePicker value={ivWhen || undefined} onChange={(v) => setIvWhen(v)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Mode</label>
                      <Select value={ivMode} onValueChange={(v) => setIvMode(v as any)}>
                        <SelectTrigger className={`${inputCls} w-full`}><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="onsite">On-site</SelectItem>
                          <SelectItem value="remote">Remote</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><label className={labelCls}>Interviewer</label><Input placeholder="Name" value={ivInterviewer} onChange={(e) => setIvInterviewer(e.target.value)} className={inputCls} /></div>
                  </div>
                  <div><label className={labelCls}>Notes</label><Textarea placeholder="Optional notes..." value={ivNotes} onChange={(e) => setIvNotes(e.target.value)} className="rounded-xl bg-slate-50 border border-slate-100 focus:ring-2 ring-indigo-400 font-semibold p-4 text-sm min-h-[80px]" /></div>
                </div>
                <DialogFooter className="pt-2">
                  <Button variant="ghost" onClick={() => setOpenInterview(false)} className="font-bold text-[11px] uppercase tracking-widest">Cancel</Button>
                  <Button onClick={scheduleInterview} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase text-[11px] tracking-widest h-11 px-8 rounded-xl">Schedule</Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>

          {/* Post New Job */}
          <Dialog open={openJob} onOpenChange={(val) => {
            setOpenJob(val);
            if (!val) {
              setIsEditingJob(false);
              setEditingJobId(null);
              setTitle(""); setDepartment(""); setOpenings(1); setLocation("Lahore, Pakistan");
              setSalary(""); setJobType("Full-time"); setDescription(""); setRequirements(""); setBenefits("");
            }
          }}>
            <DialogTrigger asChild>
              <Button className="h-11 px-7 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase text-[11px] tracking-widest shadow-lg shadow-slate-200 transition-all hover:scale-[1.02]">
                <Plus className="w-4 h-4 mr-2" /> Post New Job
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border-0 shadow-2xl p-0">
              <div className="p-10 space-y-8">
                <DialogHeader>
                  <DialogTitle className="text-3xl font-black tracking-tighter">
                    {isEditingJob ? "Edit" : "Create"} <span className="text-indigo-600">Opportunity</span>
                  </DialogTitle>
                  <DialogDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">
                    {isEditingJob ? "Update the details for this job opening" : "Fill in the details for your new job opening"}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-8 md:grid-cols-2">
                  {/* Left column */}
                  <div className="space-y-5">
                    <div><label className={labelCls}>Job Title</label><Input placeholder="e.g. Senior Product Designer" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} /></div>
                    <div><label className={labelCls}>Department</label><Input placeholder="e.g. Design & Creative" value={department} onChange={(e) => setDepartment(e.target.value)} className={inputCls} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Job Type</label>
                        <Select value={jobType} onValueChange={setJobType}>
                          <SelectTrigger className={`${inputCls} w-full`}><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="Full-time">Full-time</SelectItem>
                            <SelectItem value="Part-time">Part-time</SelectItem>
                            <SelectItem value="Contract">Contract</SelectItem>
                            <SelectItem value="Internship">Internship</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><label className={labelCls}>Openings</label><Input type="number" min={1} value={openings} onChange={(e) => setOpenings(parseInt(e.target.value || "1"))} className={inputCls} /></div>
                    </div>
                    <div><label className={labelCls}>Location</label><Input placeholder="e.g. Lahore, Pakistan" value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} /></div>
                    <div><label className={labelCls}>Salary Range</label><Input placeholder="e.g. 150k–200k PKR" value={salary} onChange={(e) => setSalary(e.target.value)} className={inputCls} /></div>
                  </div>

                  {/* Right column */}
                  <div className="space-y-5">
                    <div><label className={labelCls}>Description</label><Textarea placeholder="Describe the role and responsibilities..." value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[130px] rounded-xl bg-slate-50 border border-slate-100 focus:ring-2 ring-indigo-400 font-semibold p-4 text-sm" /></div>
                    <div><label className={labelCls}>Requirements (one per line)</label><Textarea placeholder="Enter key requirements..." value={requirements} onChange={(e) => setRequirements(e.target.value)} className="min-h-[100px] rounded-xl bg-slate-50 border border-slate-100 focus:ring-2 ring-indigo-400 font-semibold p-4 text-sm" /></div>
                    <div><label className={labelCls}>Benefits (one per line)</label><Textarea placeholder="Enter company benefits..." value={benefits} onChange={(e) => setBenefits(e.target.value)} className="min-h-[100px] rounded-xl bg-slate-50 border border-slate-100 focus:ring-2 ring-indigo-400 font-semibold p-4 text-sm" /></div>
                  </div>
                </div>

                {/* Footer — options */}
                <div className="pt-6 border-t border-slate-50 flex flex-col sm:flex-row items-center justify-end gap-3">
                  <Button variant="ghost" onClick={() => setOpenJob(false)} className="font-bold text-[11px] uppercase tracking-widest h-11 px-6">
                    Cancel
                  </Button>
                  {isEditingJob ? (
                    <Button onClick={updateJob} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase text-[11px] tracking-widest h-11 px-8 rounded-xl shadow-lg shadow-indigo-200">
                      Update Job
                    </Button>
                  ) : (
                    <>
                      <Button onClick={addJob} variant="outline" className="border-slate-200 font-bold uppercase text-[11px] tracking-widest h-11 px-8 rounded-xl">
                        Publish Only
                      </Button>
                      <Button
                        onClick={addJobWithPoster}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase text-[11px] tracking-widest h-11 px-8 rounded-xl shadow-lg shadow-indigo-200 flex items-center gap-2"
                      >
                        <Layout className="w-4 h-4" />
                        Publish &amp; Create Poster
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ───── Stats bar ───── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: "Open Positions", value: openJobs, icon: <Briefcase className="w-5 h-5" />, color: "bg-indigo-50 text-indigo-600" },
          { label: "Total Openings", value: totalOpenings, icon: <TrendingUp className="w-5 h-5" />, color: "bg-violet-50 text-violet-600" },
          { label: "Interviews", value: scheduledIvs, icon: <Calendar className="w-5 h-5" />, color: "bg-blue-50 text-blue-600" },
          { label: "Candidates", value: candidates.length, icon: <Users className="w-5 h-5" />, color: "bg-amber-50 text-amber-600" },
          { label: "Hired", value: hiredCount, icon: <CheckCircle2 className="w-5 h-5" />, color: "bg-emerald-50 text-emerald-600" },
        ].map((s) => (
          <Card key={s.label} className="border border-slate-100 bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>
              {s.icon}
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 leading-none">{s.value}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{s.label}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* ───── Main tabs ───── */}
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <TabsList className="bg-white border border-slate-100 p-1.5 rounded-2xl shadow-sm">
            {["jobs", "candidates", "interviews"].map((t) => (
              <TabsTrigger
                key={t}
                value={t}
                className="px-6 py-2.5 rounded-xl data-[state=active]:bg-slate-900 data-[state=active]:text-white font-bold uppercase tracking-[0.12em] text-[10px] transition-all"
              >
                {t}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <Input
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-11 h-11 bg-white border border-slate-100 rounded-xl shadow-sm font-semibold text-sm placeholder:text-slate-300 focus:ring-2 ring-indigo-400"
            />
          </div>
        </div>

        {/* ── JOBS tab ── */}
        <TabsContent value="jobs">
          {jobList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                <Briefcase className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No jobs posted yet</p>
              <p className="text-xs text-slate-300 mt-1">Click "Post New Job" to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {jobList.map((j) => (
                <Card
                  key={j.id}
                  className="border border-slate-100 bg-white rounded-2xl shadow-sm overflow-hidden group hover:-translate-y-1 hover:shadow-md transition-all duration-300"
                >
                  <div className="p-7">
                    {/* Top row */}
                    <div className="flex items-center justify-between mb-5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${j.status === "open" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${j.status === "open" ? "bg-emerald-500" : "bg-slate-400"}`} />
                        {j.status}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-xl w-8 h-8 hover:bg-slate-50">
                            <MoreHorizontal className="w-5 h-5 text-slate-300" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-2xl p-2 border-0 shadow-2xl min-w-[180px]">
                          <DropdownMenuItem
                            onClick={() => copyApplicationLink(j.id)}
                            className="rounded-xl font-bold uppercase text-[10px] tracking-widest p-3 text-emerald-600 cursor-pointer bg-emerald-50/60 mb-1 flex items-center gap-2"
                          >
                            <LinkIcon className="w-4 h-4" /> Copy App Link
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => navigate(`/hrm/jobs/${j.id}/poster`)}
                            className="rounded-xl font-bold uppercase text-[10px] tracking-widest p-3 text-indigo-600 cursor-pointer bg-indigo-50/60 mb-1 flex items-center gap-2"
                          >
                            <Layout className="w-4 h-4" /> Generate Poster
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openJobDetails(j)}
                            className="rounded-xl font-bold uppercase text-[10px] tracking-widest p-3 cursor-pointer"
                          >
                            <Eye className="w-4 h-4 mr-2" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openEditJob(j)}
                            className="rounded-xl font-bold uppercase text-[10px] tracking-widest p-3 cursor-pointer"
                          >
                            <Tag className="w-4 h-4 mr-2" /> Edit Job
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => toggleJobStatus(j)}
                            className={`rounded-xl font-bold uppercase text-[10px] tracking-widest p-3 cursor-pointer ${j.status === "open" ? "text-amber-600" : "text-emerald-600"}`}
                          >
                            {j.status === "open" ? <Sparkles className="w-4 h-4 mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                            {j.status === "open" ? "Unpublish Post" : "Publish Post"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteJob(j.id)}
                            className="rounded-xl font-bold uppercase text-[10px] tracking-widest p-3 text-rose-500 cursor-pointer hover:bg-rose-50"
                          >
                            Delete Job
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-black text-slate-900 tracking-tight mb-1 group-hover:text-indigo-600 transition-colors leading-tight">
                      {j.title}
                    </h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-5">
                      {j.department}
                    </p>

                    {/* Meta chips */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-full px-3 py-1.5">
                        <MapPin className="w-3 h-3 text-indigo-400" />
                        <span className="text-[10px] font-bold text-slate-600 truncate max-w-[100px]">{j.location || "Remote"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-full px-3 py-1.5">
                        <Briefcase className="w-3 h-3 text-indigo-400" />
                        <span className="text-[10px] font-bold text-slate-600">{j.type}</span>
                      </div>
                      {j.salary && (
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-full px-3 py-1.5">
                          <DollarSign className="w-3 h-3 text-indigo-400" />
                          <span className="text-[10px] font-bold text-slate-600 truncate max-w-[80px]">{j.salary}</span>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-5 border-t border-slate-50">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
                          <Users className="w-4 h-4 text-indigo-500" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">{j.openings} Opening{j.openings !== 1 ? "s" : ""}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-300 tabular-nums">{j.posted}</span>
                    </div>
                  </div>

                  {/* Hover — quick poster button */}
                  <div className="px-7 pb-5 hidden group-hover:flex">
                    <Button
                      onClick={() => navigate(`/hrm/jobs/${j.id}/poster`)}
                      variant="outline"
                      className="w-full h-10 rounded-xl border-indigo-100 text-indigo-600 font-bold uppercase text-[10px] tracking-widest hover:bg-indigo-50 flex items-center gap-2"
                    >
                      <Layout className="w-3.5 h-3.5" /> Generate Poster
                      <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── CANDIDATES tab ── */}
        <TabsContent value="candidates">
          <Card className="border border-slate-100 bg-white rounded-2xl shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/60 hover:bg-slate-50/60 border-b border-slate-100">
                  <TableHead className="font-black uppercase tracking-widest text-[9px] py-5 px-8 text-slate-400">Name</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[9px] py-5 px-8 text-slate-400">Position</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[9px] py-5 px-8 text-slate-400">Stage</TableHead>
                  <TableHead className="font-black uppercase tracking-widest text-[9px] py-5 px-8 text-slate-400">Applied</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidateList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16 text-sm font-bold text-slate-300 uppercase tracking-widest">
                      No candidates found
                    </TableCell>
                  </TableRow>
                ) : (
                  candidateList.map((c) => (
                    <TableRow key={c.id} className="hover:bg-slate-50/40 border-b border-slate-50 last:border-0 transition-colors">
                      <TableCell className="py-5 px-8 font-bold text-slate-900">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            {c.name}
                            {c.labels && c.labels.map((label, idx) => (
                              <Badge key={idx} variant="secondary" className="bg-indigo-50 text-indigo-600 border-indigo-100 text-[9px] px-2 py-0 h-4">
                                {label}
                              </Badge>
                            ))}
                          </div>
                          {(c.email || c.phone) && (
                            <div className="text-[10px] text-slate-400 font-medium normal-case tracking-normal">
                              {c.email} {c.phone && `• ${c.phone}`}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-5 px-8 text-[11px] font-bold text-slate-500 uppercase tracking-wider">{c.role}</TableCell>
                      <TableCell className="py-5 px-8">{stageBadge(c.stage)}</TableCell>
                      <TableCell className="py-5 px-8 text-[11px] font-bold text-slate-400 tabular-nums">{c.applied}</TableCell>
                      <TableCell className="py-5 px-8 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full hover:bg-slate-50">
                              <MoreHorizontal className="w-5 h-5 text-slate-300" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-2xl p-2 border-0 shadow-2xl min-w-[180px]">
                            <DropdownMenuItem onClick={() => shareWhatsApp(c.phone, c.name)} className="rounded-xl font-bold uppercase text-[10px] tracking-widest p-3 text-emerald-600 cursor-pointer bg-emerald-50/50 mb-1 flex items-center gap-2">
                              <MessageCircle className="w-4 h-4" /> WhatsApp
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => sendEmail(c.email)} className="rounded-xl font-bold uppercase text-[10px] tracking-widest p-3 text-blue-600 cursor-pointer bg-blue-50/50 mb-1 flex items-center gap-2">
                              <Mail className="w-4 h-4" /> Email candidate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setIvCandidateId(c.id);
                              const matchingJob = jobs.find(j => j.title.toLowerCase() === c.role.toLowerCase());
                              if (matchingJob) setIvJobId(matchingJob.id);
                              setOpenInterview(true);
                            }} className="rounded-xl font-bold uppercase text-[10px] tracking-widest p-3 cursor-pointer flex items-center gap-2 text-indigo-600">
                              <Calendar className="w-4 h-4" /> Schedule Interview
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                const newLabel = prompt("Enter label:");
                                if (newLabel) {
                                  updateCandidate(c.id, { labels: [...(c.labels || []), newLabel] });
                                }
                              }} 
                              className="rounded-xl font-bold uppercase text-[10px] tracking-widest p-3 cursor-pointer flex items-center gap-2"
                            >
                              <Tag className="w-4 h-4" /> Add Label
                            </DropdownMenuItem>
                            {c.stage !== "Hired" && (
                              <DropdownMenuItem
                                onClick={() => markAsHired(c)}
                                className="rounded-xl font-bold uppercase text-[10px] tracking-widest p-3 cursor-pointer flex items-center gap-2 text-emerald-600 bg-emerald-50/50 mb-1"
                              >
                                <CheckCircle2 className="w-4 h-4" /> Mark as Hired
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                            onClick={() => openCandidateDetails(c)}
                            className="rounded-xl font-bold uppercase text-[10px] tracking-widest p-3 cursor-pointer"
                          >
                            <User className="w-4 h-4 mr-2" /> View Profile
                          </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── INTERVIEWS tab ── */}
        <TabsContent value="interviews">
          {interviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No interviews scheduled</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {interviews.map((iv) => (
                <Card key={iv.id} className="border border-slate-100 bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-6">
                    {/* Status indicator */}
                    <div className="flex items-center justify-between mb-5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        iv.status === "scheduled" ? "bg-blue-50 text-blue-600"
                        : iv.status === "completed" ? "bg-emerald-50 text-emerald-600"
                        : "bg-rose-50 text-rose-500"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${iv.status === "scheduled" ? "bg-blue-500" : iv.status === "completed" ? "bg-emerald-500" : "bg-rose-400"}`} />
                        {iv.status}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {iv.mode}
                      </span>
                    </div>

                    {/* Candidate info */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black text-base flex-shrink-0">
                        {iv.candidateName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-sm tracking-tight">{iv.candidateName}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{iv.jobTitle}</p>
                      </div>
                    </div>

                    <div className="space-y-3 mb-5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">When</span>
                        <span className="text-[11px] font-bold text-slate-700">
                          {iv.when ? new Date(iv.when).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "-"}
                        </span>
                      </div>
                      {iv.interviewer && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Interviewer</span>
                          <span className="text-[11px] font-bold text-indigo-600">{iv.interviewer}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-50">
                      <Button size="sm" variant="outline" onClick={() => markCompleted(iv.id)} className="rounded-xl font-bold uppercase text-[10px] tracking-widest h-10 border-slate-100 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Complete
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteInterview(iv.id)} className="rounded-xl font-bold uppercase text-[10px] tracking-widest h-10 text-rose-400 hover:text-rose-600 hover:bg-rose-50">
                        Cancel
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

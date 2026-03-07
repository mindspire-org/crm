import { useLocation, useParams, Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, Send, Camera, Upload, ChevronLeft, ChevronRight, Briefcase, Calendar, Clock, FileText, FolderKanban, DollarSign, User, Settings, Globe, Clock3, CalendarDays, FileClock, StickyNote, Wallet, TrendingUp, Activity, CheckCircle, Timer, MapPin, BadgeCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { getAuthHeaders } from "@/lib/api/auth";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { API_BASE } from "@/lib/api/base";

export default function EmployeeProfile() {
  const { id } = useParams();
  const location = useLocation() as any;
  const [emp, setEmp] = useState(
    (location.state?.employee as
    | {
        id: number;
        name: string;
        email: string;
        phone: string;
        department: string;
        role: string;
        location: string;
        status: "active" | "on-leave" | "remote";
        joinDate: string;
        initials: string;
      }
    | undefined) || undefined
  );

  const isObjectId = (s?: string) => !!s && /^[a-fA-F0-9]{24}$/.test(s);
  const routeDbId = isObjectId(id) ? id : undefined;
  const stateDbId = isObjectId(location.state?.dbId) ? (location.state?.dbId as string) : undefined;
  const empDbId = isObjectId((location.state?.employee as any)?.dbId) ? ((location.state?.employee as any)?.dbId as string) : undefined;
  const dbId = stateDbId || routeDbId || empDbId;

  const name = emp?.name || `Employee #${id}`;
  const initials = emp?.initials || name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  // Job info state
  const [jobTitle, setJobTitle] = useState(emp?.role || "");
  const [salary, setSalary] = useState("");
  const [salaryTerm, setSalaryTerm] = useState("");
  const [dateHire, setDateHire] = useState("");
  const [departmentVal, setDepartmentVal] = useState(emp?.department || "HR");
  const [statusVal, setStatusVal] = useState<"active" | "on-leave" | "remote">((emp?.status as any) || "active");
  const [locationVal, setLocationVal] = useState(emp?.location || "");
  const [deptOptions, setDeptOptions] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [records, setRecords] = useState<any[]>([]);
  const [monthFilter, setMonthFilter] = useState<string>("");
  const [leaves, setLeaves] = useState<any[]>([]);
  const [expenseItems, setExpenseItems] = useState<any[]>([]);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseForm, setExpenseForm] = useState({ date: "", category: "", title: "", description: "", amount: "", tax: "", tax2: "" });
  const [fileItems, setFileItems] = useState<any[]>([]);
  const [fileOpen, setFileOpen] = useState(false);
  const [fileSearch, setFileSearch] = useState("");
  const fileUploadRef = useRef<HTMLInputElement>(null);
  const [noteItems, setNoteItems] = useState<any[]>([]);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteSearch, setNoteSearch] = useState("");
  const [noteForm, setNoteForm] = useState({ title: "", text: "" });
  const [projectItems, setProjectItems] = useState<any[]>([]);
  const [projectOpen, setProjectOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>("all");
  const [projectForm, setProjectForm] = useState({ title: "", client: "", price: "", start: "", deadline: "", status: "Open" });

  // General Info state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mailingAddress, setMailingAddress] = useState("");
  const [alternativeAddress, setAlternativeAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [sick, setSick] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");

  // Social Links state
  const [socialLinks, setSocialLinks] = useState({
    facebook: "",
    twitter: "",
    linkedin: "",
    whatsapp: "",
    drigg: "",
    youtube: "",
    pinterest: "",
    instagram: "",
    github: "",
    tumblr: "",
    vino: "",
  });

  // Account Settings state
  const [accountEmail, setAccountEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reenterPassword, setReenterPassword] = useState("");
  const [accountRole, setAccountRole] = useState("");
  const [disableLogin, setDisableLogin] = useState(false);
  const [markAsInactive, setMarkAsInactive] = useState(false);

  // Avatar upload
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pickPhoto = () => fileRef.current?.click();
  const onPick: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    const url = URL.createObjectURL(f);
    setPhotoUrl(url);
    uploadAvatar(f);
  };

  // Upload avatar to backend
  const uploadAvatar = async (file: File) => {
    try {
      if (!dbId) return;
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await fetch(`${API_BASE}/api/employees/${dbId}/avatar`, {
        method: "POST",
        headers: { Authorization: getAuthHeaders().Authorization },
        body: formData,
      });
      if (res.ok) {
        const d = await res.json().catch(() => null);
        const url = d?.avatar ? (String(d.avatar).startsWith("http") ? d.avatar : `${API_BASE}${d.avatar}`) : undefined;
        if (url) setPhotoUrl(url);
        window.dispatchEvent(new Event("employeeUpdated"));
        toast.success("Profile photo updated");
      }
    } catch {}
  };

  const deleteProject = async (id: string) => {
    try {
      if (!dbId) return;
      await fetch(`${API_BASE}/api/projects/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      const q = projectSearch ? `&q=${encodeURIComponent(projectSearch)}` : "";
      const r2 = await fetch(`${API_BASE}/api/projects?employeeId=${dbId}${q}`, { headers: getAuthHeaders() });
      if (r2.ok) {
        const d2 = await r2.json();
        setProjectItems(Array.isArray(d2) ? d2 : []);
      }
      toast.success("Project removed");
    } catch {}
  };

  const onFileUploadPick: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    try {
      if (!dbId) return;
      const f = e.target.files?.[0];
      if (!f) return;
      const fd = new FormData();
      fd.append("file", f);
      fd.append("name", f.name);
      fd.append("employeeId", dbId);
      const res = await fetch(`${API_BASE}/api/files`, { method: "POST", headers: getAuthHeaders(), body: fd });
      if (res.ok) {
        toast.success("File uploaded");
        const q = fileSearch ? `&q=${encodeURIComponent(fileSearch)}` : "";
        const r2 = await fetch(`${API_BASE}/api/files?employeeId=${dbId}${q}`, { headers: getAuthHeaders() });
        if (r2.ok) {
          const d2 = await r2.json();
          setFileItems(Array.isArray(d2) ? d2 : []);
        }
      } else {
        toast.error("Failed to upload file");
      }
    } catch {
      toast.error("Failed to upload file");
    } finally {
      if (fileUploadRef.current) fileUploadRef.current.value = "";
    }
  };

  const deleteFile = async (fileId: string) => {
    try {
      if (!dbId) return;
      const res = await fetch(`${API_BASE}/api/files/${fileId}`, { method: "DELETE", headers: getAuthHeaders() });
      if (res.ok) {
        toast.success("File deleted");
        const q = fileSearch ? `&q=${encodeURIComponent(fileSearch)}` : "";
        const r2 = await fetch(`${API_BASE}/api/files?employeeId=${dbId}${q}`, { headers: getAuthHeaders() });
        if (r2.ok) {
          const d2 = await r2.json();
          setFileItems(Array.isArray(d2) ? d2 : []);
        }
      } else {
        toast.error("Failed to delete file");
      }
    } catch {
      toast.error("Failed to delete file");
    }
  };

  // Auto-save function
  const autoSave = async (updates: any) => {
    try {
      if (!dbId) return;
      const res = await fetch(`${API_BASE}/api/employees/${dbId}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to save changes");
      }
      window.dispatchEvent(new Event("employeeUpdated"));
    } catch (err: any) {
      toast.error(err?.message || "Failed to save changes");
      throw err;
    }
  };

  const saveGeneral = async () => {
    await autoSave({
      firstName,
      lastName,
      mailingAddress,
      alternativeAddress,
      phone,
      alternativePhone: altPhone,
      gender,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      sick,
    });
    toast.success("General info saved");
  };

  const saveSocial = async () => {
    await autoSave({ socialLinks });
    toast.success("Social links saved");
  };

  const saveJobInfo = async () => {
    await autoSave({
      role: jobTitle,
      department: departmentVal,
      salary: salary ? Number(salary) : undefined,
      salaryTerm: salaryTerm || undefined,
      joinDate: dateHire ? new Date(dateHire) : undefined,
      status: statusVal,
      location: locationVal,
    });
    toast.success("Job info saved");
  };

  const saveAccount = async () => {
    await autoSave({
      email: accountEmail,
      role: accountRole,
      disableLogin,
      markAsInactive,
      password: password || undefined,
      reenterPassword: reenterPassword || undefined,
    });
    toast.success("Account settings saved");
  };

  const saveNote = async () => {
    try {
      if (!dbId) return;
      const res = await fetch(`${API_BASE}/api/notes`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ employeeId: dbId, title: noteForm.title, text: noteForm.text }),
      });
      if (res.ok) {
        setNoteOpen(false);
        setNoteForm({ title: "", text: "" });
        toast.success("Note saved");
        const q = noteSearch ? `&q=${encodeURIComponent(noteSearch)}` : "";
        const r2 = await fetch(`${API_BASE}/api/notes?employeeId=${dbId}${q}`, { headers: getAuthHeaders() });
        if (r2.ok) {
          const d2 = await r2.json();
          setNoteItems(Array.isArray(d2) ? d2 : []);
        }
      }
    } catch {}
  };

  const deleteNote = async (id: string) => {
    try {
      if (!dbId) return;
      await fetch(`${API_BASE}/api/notes/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      const q = noteSearch ? `&q=${encodeURIComponent(noteSearch)}` : "";
      const r2 = await fetch(`${API_BASE}/api/notes?employeeId=${dbId}${q}`, { headers: getAuthHeaders() });
      if (r2.ok) {
        const d2 = await r2.json();
        setNoteItems(Array.isArray(d2) ? d2 : []);
      }
      toast.success("Note removed");
    } catch {}
  };

  const saveProject = async () => {
    try {
      if (!dbId) return;
      const payload = {
        employeeId: dbId,
        title: projectForm.title,
        client: projectForm.client,
        price: projectForm.price ? Number(projectForm.price) : 0,
        start: projectForm.start ? new Date(projectForm.start) : undefined,
        deadline: projectForm.deadline ? new Date(projectForm.deadline) : undefined,
        status: projectForm.status,
      };
      const res = await fetch(`${API_BASE}/api/projects`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setProjectOpen(false);
        setProjectForm({ title: "", client: "", price: "", start: "", deadline: "", status: "Open" });
        toast.success("Project saved");
        const q = projectSearch ? `&q=${encodeURIComponent(projectSearch)}` : "";
        const r2 = await fetch(`${API_BASE}/api/projects?employeeId=${dbId}${q}`, { headers: getAuthHeaders() });
        if (r2.ok) {
          const d2 = await r2.json();
          setProjectItems(Array.isArray(d2) ? d2 : []);
        }
      }
    } catch {}
  };

  // Fetch employee from API if dbId present and no state, or refresh state mapping
  const loadEmployee = async () => {
    try {
      if (dbId) {
        const res = await fetch(`${API_BASE}/api/employees/${dbId}`, { headers: getAuthHeaders() });
        if (res.ok) {
          const d = await res.json();
          const name: string = d.name || `${d.firstName || ""} ${d.lastName || ""}`.trim() || `Employee`;
          const joinDate = d.joinDate ? new Date(d.joinDate).toLocaleString(undefined, { month: "short", year: "numeric" }) : "";
          const mapped = {
            id: 0,
            name,
            email: d.email || "",
            phone: d.phone || "",
            department: d.department || "HR",
            role: d.role || "Team member",
            location: d.location || "",
            status: (d.status as any) || "active",
            joinDate: joinDate || "",
            initials: (d.initials || name.split(" ").map((w: string) => w[0]).join("").slice(0, 2)).toUpperCase(),
          } as any;
          setEmp(mapped);
          setJobTitle(mapped.role || "");
          setSalary(d.salary ? String(d.salary) : "");
          setSalaryTerm(d.salaryTerm || "");
          setDateHire(d.joinDate ? new Date(d.joinDate).toISOString().slice(0,10) : "");
          setDepartmentVal(d.department || "HR");
          setStatusVal((d.status as any) || "active");
          setLocationVal(d.location || "");
          
          // Load General Info
          setFirstName(d.firstName || "");
          setLastName(d.lastName || "");
          setMailingAddress(d.mailingAddress || "");
          setAlternativeAddress(d.alternativeAddress || "");
          setPhone(d.phone || "");
          setAltPhone(d.alternativePhone || "");
          setDateOfBirth(d.dateOfBirth ? new Date(d.dateOfBirth).toISOString().slice(0,10) : "");
          setSick(d.sick || "");
          setGender(d.gender || "male");
          
          // Load Social Links
          if (d.socialLinks) {
            setSocialLinks(d.socialLinks);
          }
          
          // Load Account Settings
          setAccountEmail(d.email || "");
          setAccountRole(d.role || "");
          setDisableLogin(d.disableLogin || false);
          setMarkAsInactive(d.markAsInactive || false);
          
          // Load avatar
          if (d.avatar) {
            const avatarUrl = String(d.avatar).startsWith("http") ? d.avatar : `${API_BASE}${d.avatar}`;
            // Add cache-busting using updatedAt timestamp
            const url = d.updatedAt ? `${avatarUrl}?t=${new Date(d.updatedAt).getTime()}` : avatarUrl;
            setPhotoUrl(url);
          }
        }
      } else if (emp) {
        setJobTitle(emp.role || "");
        // Load avatar from location state if available
        if (emp.image) {
          setPhotoUrl(emp.image);
        }
      }
    } catch {}
  };

  useEffect(() => {
    loadEmployee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbId]);

  // Listen for employee updates from other pages (e.g., user profile settings)
  useEffect(() => {
    const handleEmployeeUpdated = () => {
      loadEmployee();
    };
    window.addEventListener("employeeUpdated", handleEmployeeUpdated);
    return () => {
      window.removeEventListener("employeeUpdated", handleEmployeeUpdated);
    };
  }, [dbId]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/departments?active=1`, { cache: "no-store", headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          const names = (Array.isArray(data) ? data : []).map((d: any) => String(d.name)).filter(Boolean);
          if (names.length) setDeptOptions(names);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (!dbId) return;
        const params = new URLSearchParams();
        params.set("employeeId", dbId);
        if (fromDate) params.set("from", fromDate);
        if (toDate) params.set("to", toDate);
        const res = await fetch(`${API_BASE}/api/attendance/records?${params.toString()}`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          setRecords(Array.isArray(data) ? data : []);
        }
      } catch {}
    })();
  }, [dbId, fromDate, toDate]);

  useEffect(() => {
    (async () => {
      try {
        const n = emp?.name || `${firstName} ${lastName}`.trim();
        if (!n) return;
        const res = await fetch(`${API_BASE}/api/leaves?q=${encodeURIComponent(n)}`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          setLeaves(Array.isArray(data) ? data.filter((l:any)=> (l.name||"").toLowerCase().includes(n.toLowerCase())) : []);
        }
      } catch {}
    })();
  }, [emp, firstName, lastName]);

  useEffect(() => {
    (async () => {
      try {
        if (!dbId) { setFileItems([]); return; }
        const q = fileSearch ? `&q=${encodeURIComponent(fileSearch)}` : "";
        const res = await fetch(`${API_BASE}/api/files?employeeId=${dbId}${q}`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          setFileItems(Array.isArray(data) ? data : []);
        }
      } catch {}
    })();
  }, [dbId, fileSearch]);

  useEffect(() => {
    (async () => {
      try {
        if (!dbId) { setNoteItems([]); return; }
        const q = noteSearch ? `&q=${encodeURIComponent(noteSearch)}` : "";
        const res = await fetch(`${API_BASE}/api/notes?employeeId=${dbId}${q}`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          setNoteItems(Array.isArray(data) ? data : []);
        }
      } catch {}
    })();
  }, [dbId, noteSearch]);

  useEffect(() => {
    (async () => {
      try {
        if (!dbId) { setProjectItems([]); return; }
        const q = projectSearch ? `&q=${encodeURIComponent(projectSearch)}` : "";
        const res = await fetch(`${API_BASE}/api/projects?employeeId=${dbId}${q}`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          setProjectItems(Array.isArray(data) ? data : []);
        }
      } catch {}
    })();
  }, [dbId, projectSearch]);

  useEffect(() => {
    (async () => {
      try {
        if (!dbId) { setExpenseItems([]); return; }
        const q = expenseSearch ? `&q=${encodeURIComponent(expenseSearch)}` : "";
        const res = await fetch(`${API_BASE}/api/expenses?employeeId=${dbId}${q}`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          setExpenseItems(Array.isArray(data) ? data : []);
        }
      } catch {}
    })();
  }, [dbId, expenseSearch]);

  const saveExpense = async () => {
    try {
      if (!dbId) return;
      const payload = {
        employeeId: dbId,
        date: expenseForm.date ? new Date(expenseForm.date) : undefined,
        category: expenseForm.category,
        title: expenseForm.title,
        description: expenseForm.description,
        amount: expenseForm.amount ? Number(expenseForm.amount) : 0,
        tax: expenseForm.tax ? Number(expenseForm.tax) : 0,
        tax2: expenseForm.tax2 ? Number(expenseForm.tax2) : 0,
      };

      const res = await fetch(`${API_BASE}/api/expenses`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setExpenseOpen(false);
        setExpenseForm({ date: "", category: "", title: "", description: "", amount: "", tax: "", tax2: "" });
        toast.success("Expense added");
        const q = expenseSearch ? `&q=${encodeURIComponent(expenseSearch)}` : "";
        const r2 = await fetch(`${API_BASE}/api/expenses?employeeId=${dbId}${q}`, { headers: getAuthHeaders() });
        if (r2.ok) {
          const d2 = await r2.json();
          setExpenseItems(Array.isArray(d2) ? d2 : []);
        }
      }
    } catch {}
  };

  const deleteExpense = async (id: string) => {
    try {
      if (!dbId) return;
      await fetch(`${API_BASE}/api/expenses/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      const q = expenseSearch ? `&q=${encodeURIComponent(expenseSearch)}` : "";
      const r2 = await fetch(`${API_BASE}/api/expenses?employeeId=${dbId}${q}`, { headers: getAuthHeaders() });
      if (r2.ok) {
        const d2 = await r2.json();
        setExpenseItems(Array.isArray(d2) ? d2 : []);
      }
      toast.success("Expense removed");
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-800 dark:via-teal-800 dark:to-cyan-800">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.15'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
        <div className="relative px-6 py-10 sm:px-12 lg:px-16">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            {/* Profile Section */}
            <div className="flex items-center gap-5">
              <div className="relative">
                <Avatar className="w-24 h-24 ring-4 ring-white/30 ring-offset-4 ring-offset-transparent shadow-2xl">
                  {photoUrl && <AvatarImage 
                    className="object-cover object-center" 
                    src={photoUrl} 
                    alt={name}
                    onError={(e) => {
                      console.error("Avatar failed to load:", photoUrl);
                      e.currentTarget.style.display = 'none';
                    }}
                  />}
                  <AvatarFallback className="bg-white/20 text-white text-2xl font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <button 
                  onClick={pickPhoto}
                  className="absolute -bottom-1 -right-1 p-2 bg-white text-emerald-600 rounded-full shadow-lg hover:bg-emerald-50 transition-colors"
                  title="Change photo"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">{name}</h1>
                <div className="mt-2 flex items-center gap-3">
                  <BadgeCheck className="w-4 h-4 text-emerald-200" />
                  <span className="text-emerald-100 font-medium">{emp?.department || "Sales & Marketing"}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-semibold",
                    statusVal === "active" && "bg-emerald-500/30 text-emerald-100",
                    statusVal === "on-leave" && "bg-amber-500/30 text-amber-100",
                    statusVal === "remote" && "bg-blue-500/30 text-blue-100"
                  )}>
                    {statusVal === "active" ? "Active" : statusVal === "on-leave" ? "On Leave" : "Remote"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                  <a href={`mailto:${accountEmail || emp?.email}`} className="inline-flex items-center gap-1.5 text-emerald-100 hover:text-white transition-colors">
                    <Mail className="w-4 h-4" />
                    {accountEmail || emp?.email || "email@domain.com"}
                  </a>
                  <a href={`tel:${phone || emp?.phone}`} className="inline-flex items-center gap-1.5 text-emerald-100 hover:text-white transition-colors">
                    <Phone className="w-4 h-4" />
                    {phone || emp?.phone || "+1 (000) 000-0000"}
                  </a>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 lg:gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 text-emerald-100 text-sm mb-1">
                  <FolderKanban className="w-4 h-4" />
                  Open Projects
                </div>
                <div className="text-2xl font-bold text-white">{projectItems.filter((p:any) => p.status === "Open").length}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 text-emerald-100 text-sm mb-1">
                  <CheckCircle className="w-4 h-4" />
                  Completed
                </div>
                <div className="text-2xl font-bold text-white">{projectItems.filter((p:any) => p.status === "Completed").length}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 text-emerald-100 text-sm mb-1">
                  <Clock className="w-4 h-4" />
                  Hours Worked
                </div>
                <div className="text-2xl font-bold text-white">
                  {records.reduce((acc: number, r: any) => {
                    const cin = r.clockIn ? new Date(r.clockIn) : undefined;
                    const cout = r.clockOut ? new Date(r.clockOut) : undefined;
                    return acc + (cin && cout ? ((cout.getTime() - cin.getTime())/3600000) : 0);
                  }, 0).toFixed(1)}
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 text-emerald-100 text-sm mb-1">
                  <Timer className="w-4 h-4" />
                  Project Hours
                </div>
                <div className="text-2xl font-bold text-white">
                  {projectItems.length * 40}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8 sm:px-12 lg:px-16">
        <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardContent className="p-0">
            <Tabs defaultValue="job" className="w-full">
              <div className="border-b bg-muted/30 px-6 pt-4">
                <TabsList className="w-full justify-start h-auto p-0 bg-transparent gap-1 flex-wrap">
                  <TabsTrigger value="timeline" className="gap-2 rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 px-4 py-3">
                    <Clock3 className="w-4 h-4" />
                    <span className="hidden sm:inline">Timeline</span>
                  </TabsTrigger>
                  <TabsTrigger value="general" className="gap-2 rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 px-4 py-3">
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">General Info</span>
                  </TabsTrigger>
                  <TabsTrigger value="social" className="gap-2 rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 px-4 py-3">
                    <Globe className="w-4 h-4" />
                    <span className="hidden sm:inline">Social Links</span>
                  </TabsTrigger>
                  <TabsTrigger value="job" className="gap-2 rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 px-4 py-3">
                    <Briefcase className="w-4 h-4" />
                    <span className="hidden sm:inline">Job Info</span>
                  </TabsTrigger>
                  <TabsTrigger value="account" className="gap-2 rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 px-4 py-3">
                    <Settings className="w-4 h-4" />
                    <span className="hidden sm:inline">Account</span>
                  </TabsTrigger>
                  <TabsTrigger value="files" className="gap-2 rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 px-4 py-3">
                    <FileText className="w-4 h-4" />
                    <span className="hidden sm:inline">Files</span>
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="gap-2 rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 px-4 py-3">
                    <StickyNote className="w-4 h-4" />
                    <span className="hidden sm:inline">Notes</span>
                  </TabsTrigger>
                  <TabsTrigger value="projects" className="gap-2 rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 px-4 py-3">
                    <FolderKanban className="w-4 h-4" />
                    <span className="hidden sm:inline">Projects</span>
                  </TabsTrigger>
                  <TabsTrigger value="timesheets" className="gap-2 rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 px-4 py-3">
                    <FileClock className="w-4 h-4" />
                    <span className="hidden sm:inline">Timesheets</span>
                  </TabsTrigger>
                  <TabsTrigger value="timecards" className="gap-2 rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 px-4 py-3">
                    <CalendarDays className="w-4 h-4" />
                    <span className="hidden sm:inline">Time cards</span>
                  </TabsTrigger>
                  <TabsTrigger value="leave" className="gap-2 rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 px-4 py-3">
                    <Calendar className="w-4 h-4" />
                    <span className="hidden sm:inline">Leave</span>
                  </TabsTrigger>
                  <TabsTrigger value="expenses" className="gap-2 rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 px-4 py-3">
                    <Wallet className="w-4 h-4" />
                    <span className="hidden sm:inline">Expenses</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="general" className="mt-0 p-6">
                <div className="max-w-4xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                      <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">General Information</h3>
                      <p className="text-sm text-muted-foreground">Manage employee personal details and contact information</p>
                    </div>
                  </div>
                  <div className="grid gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">First Name</Label>
                        <Input value={firstName} onChange={(e)=>{setFirstName(e.target.value); autoSave({firstName: e.target.value});}} className="bg-muted/30" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Last Name</Label>
                        <Input value={lastName} onChange={(e)=>{setLastName(e.target.value); autoSave({lastName: e.target.value});}} className="bg-muted/30" />
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Mailing Address</Label>
                        <Input value={mailingAddress} onChange={(e)=>{setMailingAddress(e.target.value); autoSave({mailingAddress: e.target.value});}} className="bg-muted/30" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Alternative Address</Label>
                        <Input value={alternativeAddress} onChange={(e)=>{setAlternativeAddress(e.target.value); autoSave({alternativeAddress: e.target.value});}} className="bg-muted/30" />
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Phone</Label>
                        <Input value={phone} onChange={(e)=>{setPhone(e.target.value); autoSave({phone: e.target.value});}} className="bg-muted/30" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Alternative Phone</Label>
                        <Input value={altPhone} onChange={(e)=>{setAltPhone(e.target.value); autoSave({alternativePhone: e.target.value});}} className="bg-muted/30" />
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Gender</Label>
                        <RadioGroup value={gender} onValueChange={(v)=>{setGender(v as any); autoSave({gender: v});}} className="flex gap-4 mt-2">
                          <div className="flex items-center gap-2 bg-muted/30 px-3 py-2 rounded-lg"><RadioGroupItem value="male" id="g-m"/><Label htmlFor="g-m" className="cursor-pointer">Male</Label></div>
                          <div className="flex items-center gap-2 bg-muted/30 px-3 py-2 rounded-lg"><RadioGroupItem value="female" id="g-f"/><Label htmlFor="g-f" className="cursor-pointer">Female</Label></div>
                          <div className="flex items-center gap-2 bg-muted/30 px-3 py-2 rounded-lg"><RadioGroupItem value="other" id="g-o"/><Label htmlFor="g-o" className="cursor-pointer">Other</Label></div>
                        </RadioGroup>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Date of Birth</Label>
                        <DatePicker value={dateOfBirth} onChange={(v)=>{setDateOfBirth(v); autoSave({dateOfBirth: v ? new Date(v) : undefined});}} placeholder="Select date" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Sick Leave Balance</Label>
                      <Input value={sick} onChange={(e)=>{setSick(e.target.value); autoSave({sick: e.target.value});}} className="bg-muted/30 max-w-xs" />
                    </div>
                  </div>
                  <div className="mt-8 flex justify-end">
                    <Button onClick={saveGeneral} className="bg-emerald-600 hover:bg-emerald-700 text-white">Save Changes</Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="social" className="mt-0 p-6">
                <div className="max-w-4xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Social Links</h3>
                      <p className="text-sm text-muted-foreground">Manage employee social media and online presence</p>
                    </div>
                  </div>
                  <div className="grid gap-4">
                    {Object.entries(socialLinks).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-4 p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors">
                        <Label className="capitalize w-32 font-medium text-muted-foreground">{key}</Label>
                        <Input 
                          value={value} 
                          onChange={(e)=>{setSocialLinks({...socialLinks, [key]: e.target.value}); autoSave({socialLinks: {...socialLinks, [key]: e.target.value}});}} 
                          placeholder={`Enter ${key} URL`}
                          className="flex-1 bg-white dark:bg-slate-800"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-8 flex justify-end">
                    <Button onClick={saveSocial} className="bg-emerald-600 hover:bg-emerald-700 text-white">Save Changes</Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="job" className="mt-0 p-6">
                <div className="max-w-4xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Briefcase className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Job Information</h3>
                      <p className="text-sm text-muted-foreground">Manage employment details and work information</p>
                    </div>
                  </div>
                  <div className="grid gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Job Title</Label>
                        <Input placeholder="e.g. Sales Manager" value={jobTitle} onChange={(e)=>{setJobTitle(e.target.value); autoSave({role: e.target.value});}} className="bg-muted/30" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Department</Label>
                        <Select value={departmentVal} onValueChange={(v)=>{setDepartmentVal(v); autoSave({department: v});}}>
                          <SelectTrigger className="w-full bg-muted/30"><SelectValue placeholder="Select department" /></SelectTrigger>
                          <SelectContent>
                            {(deptOptions.length ? deptOptions : ["HR", "Sales", "Marketing", "Engineering", "Finance"]).map((d)=> (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Salary</Label>
                        <Input placeholder="Amount" value={salary} onChange={(e)=>{setSalary(e.target.value); autoSave({salary: e.target.value ? Number(e.target.value) : undefined});}} className="bg-muted/30" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Salary Term</Label>
                        <Input placeholder="e.g. Monthly" value={salaryTerm} onChange={(e)=>{setSalaryTerm(e.target.value); autoSave({salaryTerm: e.target.value || undefined});}} className="bg-muted/30" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Date of Hire</Label>
                        <DatePicker value={dateHire} onChange={(v)=>{setDateHire(v); autoSave({joinDate: v ? new Date(v) : undefined});}} placeholder="Select date" />
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Employment Status</Label>
                        <Select value={statusVal} onValueChange={(v)=>{setStatusVal(v as any); autoSave({status: v});}}>
                          <SelectTrigger className="w-full bg-muted/30"><SelectValue placeholder="Select status" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                Active
                              </div>
                            </SelectItem>
                            <SelectItem value="on-leave">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-amber-500" />
                                On Leave
                              </div>
                            </SelectItem>
                            <SelectItem value="remote">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                Remote
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Work Location</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input placeholder="e.g. New York, NY" value={locationVal} onChange={(e)=>{setLocationVal(e.target.value); autoSave({location: e.target.value});}} className="bg-muted/30 pl-9" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-8 flex justify-end">
                    <Button onClick={saveJobInfo} className="bg-emerald-600 hover:bg-emerald-700 text-white">Save Changes</Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="account" className="mt-0 p-6">
                <div className="max-w-4xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <Settings className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Account Settings</h3>
                      <p className="text-sm text-muted-foreground">Manage login credentials and account status</p>
                    </div>
                  </div>
                  <div className="grid gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input value={accountEmail} onChange={(e)=>{setAccountEmail(e.target.value); autoSave({email: e.target.value});}} className="bg-muted/30 pl-9" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Role</Label>
                        <Input value={accountRole} onChange={(e)=>{setAccountRole(e.target.value); autoSave({role: e.target.value});}} className="bg-muted/30" />
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Password</Label>
                        <Input type="password" placeholder="Enter new password" value={password} onChange={(e)=>{setPassword(e.target.value); autoSave({password: e.target.value});}} className="bg-muted/30" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Confirm Password</Label>
                        <Input type="password" placeholder="Re-enter password" value={reenterPassword} onChange={(e)=>setReenterPassword(e.target.value)} className="bg-muted/30" />
                      </div>
                    </div>
                    <Separator />
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Account Status Options
                      </h4>
                      <div className="flex flex-wrap gap-6">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" id="disable" checked={disableLogin} onChange={(e)=>{setDisableLogin(e.target.checked); autoSave({disableLogin: e.target.checked});}} className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500" />
                          <span className="text-sm text-amber-700 dark:text-amber-300">Disable login access</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" id="inactive" checked={markAsInactive} onChange={(e)=>{setMarkAsInactive(e.target.checked); autoSave({markAsInactive: e.target.checked});}} className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500" />
                          <span className="text-sm text-amber-700 dark:text-amber-300">Mark as inactive</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="mt-8 flex justify-end">
                    <Button onClick={saveAccount} className="bg-emerald-600 hover:bg-emerald-700 text-white">Save Changes</Button>
                  </div>
                </div>
              </TabsContent>

              {/* Timesheets */}
              <TabsContent value="timesheets" className="mt-0 p-6">
                <div className="max-w-5xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <FileClock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Timesheets</h3>
                      <p className="text-sm text-muted-foreground">View and manage employee attendance records</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">From Date</Label>
                      <DatePicker value={fromDate} onChange={setFromDate} placeholder="Select start date" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">To Date</Label>
                      <DatePicker value={toDate} onChange={setToDate} placeholder="Select end date" />
                    </div>
                  </div>
                  <div className="border rounded-xl overflow-hidden bg-white dark:bg-slate-800">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="font-semibold">Date</TableHead>
                          <TableHead className="font-semibold">Clock In</TableHead>
                          <TableHead className="font-semibold">Clock Out</TableHead>
                          <TableHead className="text-right font-semibold">Duration (h)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {records.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                              <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                              <p>No attendance records found</p>
                            </TableCell>
                          </TableRow>
                        )}
                        {records.map((r: any) => {
                          const d = r.date ? new Date(r.date) : undefined;
                          const cin = r.clockIn ? new Date(r.clockIn) : undefined;
                          const cout = r.clockOut ? new Date(r.clockOut) : undefined;
                          const dur = cin && cout ? ((cout.getTime() - cin.getTime())/3600000) : 0;
                          return (
                            <TableRow key={r._id} className="hover:bg-muted/30">
                              <TableCell className="font-medium">{d ? d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : "-"}</TableCell>
                              <TableCell className="text-emerald-600">{cin ? cin.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</TableCell>
                              <TableCell className="text-amber-600">{cout ? cout.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</TableCell>
                              <TableCell className="text-right font-semibold">{dur ? dur.toFixed(2) : '-'}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              {/* Time cards */}
              <TabsContent value="timecards" className="mt-0 p-6">
                <div className="max-w-5xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                      <CalendarDays className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Time Cards</h3>
                      <p className="text-sm text-muted-foreground">Monthly attendance overview</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 mb-6 p-4 bg-muted/30 rounded-lg items-end">
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Select Month</Label>
                      <Input type="month" value={monthFilter} onChange={(e)=>{
                        const m = e.target.value; setMonthFilter(m);
                        if (m) {
                          const [yy, mm] = m.split('-').map(Number);
                          const first = new Date(yy, mm-1, 1).toISOString().slice(0,10);
                          const last = new Date(yy, mm, 0).toISOString().slice(0,10);
                          setFromDate(first); setToDate(last);
                        }
                      }} className="w-48" />
                    </div>
                  </div>
                  <div className="border rounded-xl overflow-hidden bg-white dark:bg-slate-800">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="font-semibold">Day</TableHead>
                          <TableHead className="font-semibold">Clock In</TableHead>
                          <TableHead className="font-semibold">Clock Out</TableHead>
                          <TableHead className="text-right font-semibold">Hours</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {records.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                              <p>No records found for selected month</p>
                            </TableCell>
                          </TableRow>
                        )}
                        {records.map((r: any) => {
                          const d = r.date ? new Date(r.date) : undefined;
                          const cin = r.clockIn ? new Date(r.clockIn) : undefined;
                          const cout = r.clockOut ? new Date(r.clockOut) : undefined;
                          const dur = cin && cout ? ((cout.getTime() - cin.getTime())/3600000) : 0;
                          return (
                            <TableRow key={r._id} className="hover:bg-muted/30">
                              <TableCell className="font-medium">{d ? d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) : '-'}</TableCell>
                              <TableCell className="text-emerald-600">{cin ? cin.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</TableCell>
                              <TableCell className="text-amber-600">{cout ? cout.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</TableCell>
                              <TableCell className="text-right font-semibold">{dur ? dur.toFixed(2) : '-'}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              {/* Leave */}
              <TabsContent value="leave" className="mt-0 p-6">
                <div className="max-w-5xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                      <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Leave Records</h3>
                      <p className="text-sm text-muted-foreground">View employee leave history and status</p>
                    </div>
                  </div>
                  <div className="border rounded-xl overflow-hidden bg-white dark:bg-slate-800">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="font-semibold">Leave Type</TableHead>
                          <TableHead className="font-semibold">From Date</TableHead>
                          <TableHead className="font-semibold">To Date</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leaves.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                              <p>No leave records found</p>
                            </TableCell>
                          </TableRow>
                        )}
                        {leaves.map((l: any) => (
                          <TableRow key={l._id} className="hover:bg-muted/30">
                            <TableCell className="capitalize font-medium">{l.type || '-'}</TableCell>
                            <TableCell>{l.from ? new Date(l.from).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</TableCell>
                            <TableCell>{l.to ? new Date(l.to).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</TableCell>
                            <TableCell>
                              <span className={cn(
                                "px-2 py-1 rounded-full text-xs font-semibold",
                                l.status === 'approved' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30",
                                l.status === 'pending' && "bg-amber-100 text-amber-700 dark:bg-amber-900/30",
                                l.status === 'rejected' && "bg-red-100 text-red-700 dark:bg-red-900/30",
                                !l.status && "bg-slate-100 text-slate-700 dark:bg-slate-800"
                              )}>
                                {l.status || 'Unknown'}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              {/* Timeline */}
              <TabsContent value="timeline" className="mt-0 p-6">
                <div className="max-w-4xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <Clock3 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Activity Timeline</h3>
                      <p className="text-sm text-muted-foreground">Track employee activities and changes</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Clock3 className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-lg">No timeline records found</p>
                    <p className="text-sm">Employee activities will appear here</p>
                  </div>
                </div>
              </TabsContent>

              {/* Files */}
              <TabsContent value="files" className="mt-0 p-6">
                <div className="max-w-5xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Employee Files</h3>
                      <p className="text-sm text-muted-foreground">Manage documents and attachments</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-6 p-4 bg-muted/30 rounded-lg gap-4">
                    <Input placeholder="Search files..." className="max-w-sm bg-white dark:bg-slate-800" value={fileSearch} onChange={(e)=>setFileSearch(e.target.value)} />
                    <div>
                      <input ref={fileUploadRef} type="file" className="hidden" onChange={onFileUploadPick} />
                      <Button onClick={()=>fileUploadRef.current?.click()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Upload className="w-4 h-4 mr-2" /> Upload File
                      </Button>
                    </div>
                  </div>
                  <div className="border rounded-xl overflow-hidden bg-white dark:bg-slate-800">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="font-semibold">File Name</TableHead>
                          <TableHead className="font-semibold">Size</TableHead>
                          <TableHead className="font-semibold">Uploaded</TableHead>
                          <TableHead className="text-right font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fileItems.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                              <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                              <p>No files uploaded yet</p>
                            </TableCell>
                          </TableRow>
                        )}
                        {fileItems.map((f:any)=> (
                          <TableRow key={f._id} className="hover:bg-muted/30">
                            <TableCell className="font-medium">
                              {f.path ? (
                                <a className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-2" href={`${API_BASE}${f.path}`} target="_blank" rel="noreferrer">
                                  <FileText className="w-4 h-4" />
                                  {f.name || "file"}
                                </a>
                              ) : (
                                <span className="flex items-center gap-2">
                                  <FileText className="w-4 h-4" />
                                  {f.name || "file"}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{f.size ? `${(f.size/1024).toFixed(1)} KB` : "-"}</TableCell>
                            <TableCell className="text-muted-foreground">{f.createdAt ? new Date(f.createdAt).toLocaleString() : "-"}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" onClick={()=>deleteFile(f._id)} className="text-red-600 hover:bg-red-50 hover:text-red-700">Delete</Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              {/* Notes */}
              <TabsContent value="notes" className="mt-0 p-6">
                <div className="max-w-5xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                      <StickyNote className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Employee Notes</h3>
                      <p className="text-sm text-muted-foreground">Keep track of important notes and observations</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-6 p-4 bg-muted/30 rounded-lg gap-4">
                    <Input placeholder="Search notes..." className="max-w-sm bg-white dark:bg-slate-800" value={noteSearch} onChange={(e)=>setNoteSearch(e.target.value)} />
                    <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                          <StickyNote className="w-4 h-4 mr-2" /> Add Note
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader><DialogTitle>Add New Note</DialogTitle></DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Title</Label>
                            <Input value={noteForm.title} onChange={(e)=>setNoteForm({...noteForm, title: e.target.value})} placeholder="Enter note title" className="bg-muted/30" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Description</Label>
                            <Input value={noteForm.text} onChange={(e)=>setNoteForm({...noteForm, text: e.target.value})} placeholder="Enter note details" className="bg-muted/30" />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={()=>setNoteOpen(false)}>Cancel</Button>
                          <Button onClick={saveNote} className="bg-emerald-600 hover:bg-emerald-700 text-white">Save Note</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="border rounded-xl overflow-hidden bg-white dark:bg-slate-800">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="font-semibold">Title</TableHead>
                          <TableHead className="font-semibold">Created</TableHead>
                          <TableHead className="font-semibold">Description</TableHead>
                          <TableHead className="text-right font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {noteItems.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                              <StickyNote className="w-8 h-8 mx-auto mb-2 opacity-40" />
                              <p>No notes added yet</p>
                            </TableCell>
                          </TableRow>
                        )}
                        {noteItems.map((n:any)=> (
                          <TableRow key={n._id} className="hover:bg-muted/30">
                            <TableCell className="font-medium">{n.title || "-"}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{n.createdAt ? new Date(n.createdAt).toLocaleString() : "-"}</TableCell>
                            <TableCell className="truncate max-w-[360px] text-muted-foreground">{n.text || "-"}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" onClick={()=>deleteNote(n._id)} className="text-red-600 hover:bg-red-50 hover:text-red-700">Delete</Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              {/* Projects */}
              <TabsContent value="projects" className="mt-0 p-6">
                <div className="max-w-5xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <FolderKanban className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Employee Projects</h3>
                      <p className="text-sm text-muted-foreground">Manage projects assigned to this employee</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-6 p-4 bg-muted/30 rounded-lg gap-4">
                    <Input placeholder="Search projects..." className="max-w-sm bg-white dark:bg-slate-800" value={projectSearch} onChange={(e)=>setProjectSearch(e.target.value)} />
                    <div className="flex items-center gap-2">
                      <Select value={projectStatusFilter} onValueChange={setProjectStatusFilter}>
                        <SelectTrigger className="w-40 bg-white dark:bg-slate-800"><SelectValue placeholder="Filter by Status"/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="Open">Open</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      <Dialog open={projectOpen} onOpenChange={setProjectOpen}>
                        <DialogTrigger asChild>
                          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            <FolderKanban className="w-4 h-4 mr-2" /> Add Project
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader><DialogTitle>Add New Project</DialogTitle></DialogHeader>
                          <div className="grid gap-4 py-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Project Title</Label>
                              <Input value={projectForm.title} onChange={(e)=>setProjectForm({...projectForm, title: e.target.value})} placeholder="Enter project title" className="bg-muted/30" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Client</Label>
                              <Input value={projectForm.client} onChange={(e)=>setProjectForm({...projectForm, client: e.target.value})} placeholder="Client name" className="bg-muted/30" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Price</Label>
                              <Input value={projectForm.price} onChange={(e)=>setProjectForm({...projectForm, price: e.target.value})} placeholder="Project value" className="bg-muted/30" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Status</Label>
                              <Select value={projectForm.status} onValueChange={(v)=>setProjectForm({...projectForm, status: v})}>
                                <SelectTrigger className="bg-muted/30"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Open">Open</SelectItem>
                                  <SelectItem value="In Progress">In Progress</SelectItem>
                                  <SelectItem value="Completed">Completed</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Start Date</Label>
                              <DatePicker value={projectForm.start} onChange={(v)=>setProjectForm({ ...projectForm, start: v })} placeholder="Select start date" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Deadline</Label>
                              <DatePicker value={projectForm.deadline} onChange={(v)=>setProjectForm({ ...projectForm, deadline: v })} placeholder="Select deadline" />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={()=>setProjectOpen(false)}>Cancel</Button>
                            <Button onClick={saveProject} className="bg-emerald-600 hover:bg-emerald-700 text-white">Save Project</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  <div className="border rounded-xl overflow-hidden bg-white dark:bg-slate-800">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="w-12 font-semibold">#</TableHead>
                          <TableHead className="font-semibold">Title</TableHead>
                          <TableHead className="font-semibold">Client</TableHead>
                          <TableHead className="font-semibold">Start Date</TableHead>
                          <TableHead className="font-semibold">Deadline</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="text-right font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {projectItems.filter((p:any)=> projectStatusFilter === 'all' || p.status === projectStatusFilter).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              <FolderKanban className="w-8 h-8 mx-auto mb-2 opacity-40" />
                              <p>No projects found</p>
                            </TableCell>
                          </TableRow>
                        )}
                        {projectItems.filter((p:any)=> projectStatusFilter === 'all' || p.status === projectStatusFilter).map((p:any, idx: number)=> (
                          <TableRow key={p._id} className="hover:bg-muted/30">
                            <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell className="font-medium">{p.title || "-"}</TableCell>
                            <TableCell className="text-muted-foreground">{p.client || "-"}</TableCell>
                            <TableCell className="text-muted-foreground">{p.start ? new Date(p.start).toLocaleDateString() : "-"}</TableCell>
                            <TableCell className="text-muted-foreground">{p.deadline ? new Date(p.deadline).toLocaleDateString() : "-"}</TableCell>
                            <TableCell>
                              <span className={cn(
                                "px-2 py-1 rounded-full text-xs font-semibold",
                                p.status === 'Open' && "bg-blue-100 text-blue-700 dark:bg-blue-900/30",
                                p.status === 'In Progress' && "bg-amber-100 text-amber-700 dark:bg-amber-900/30",
                                p.status === 'Completed' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30",
                                !p.status && "bg-slate-100 text-slate-700 dark:bg-slate-800"
                              )}>
                                {p.status || 'Unknown'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" onClick={()=>deleteProject(p._id)} className="text-red-600 hover:bg-red-50 hover:text-red-700">Delete</Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              {/* Expenses */}
              <TabsContent value="expenses" className="mt-0 p-6">
                <div className="max-w-5xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
                      <Wallet className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Employee Expenses</h3>
                      <p className="text-sm text-muted-foreground">Track and manage expense claims</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-6 p-4 bg-muted/30 rounded-lg gap-4">
                    <Input placeholder="Search expenses..." className="max-w-sm bg-white dark:bg-slate-800" value={expenseSearch} onChange={(e)=>setExpenseSearch(e.target.value)} />
                    <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                          <DollarSign className="w-4 h-4 mr-2" /> Add Expense
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader><DialogTitle>Add New Expense</DialogTitle></DialogHeader>
                        <div className="grid gap-4 py-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Date</Label>
                            <DatePicker value={expenseForm.date} onChange={(v)=>setExpenseForm({ ...expenseForm, date: v })} placeholder="Select date" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Category</Label>
                            <Input value={expenseForm.category} onChange={(e)=>setExpenseForm({...expenseForm, category: e.target.value})} placeholder="e.g. Travel, Meals" className="bg-muted/30" />
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Title</Label>
                            <Input value={expenseForm.title} onChange={(e)=>setExpenseForm({...expenseForm, title: e.target.value})} placeholder="Expense title" className="bg-muted/30" />
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Description</Label>
                            <Input value={expenseForm.description} onChange={(e)=>setExpenseForm({...expenseForm, description: e.target.value})} placeholder="Additional details" className="bg-muted/30" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Amount</Label>
                            <Input value={expenseForm.amount} onChange={(e)=>setExpenseForm({...expenseForm, amount: e.target.value})} placeholder="0.00" className="bg-muted/30" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Tax</Label>
                            <Input value={expenseForm.tax} onChange={(e)=>setExpenseForm({...expenseForm, tax: e.target.value})} placeholder="0.00" className="bg-muted/30" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Additional Tax</Label>
                            <Input value={expenseForm.tax2} onChange={(e)=>setExpenseForm({...expenseForm, tax2: e.target.value})} placeholder="0.00" className="bg-muted/30" />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={()=>setExpenseOpen(false)}>Cancel</Button>
                          <Button onClick={saveExpense} className="bg-emerald-600 hover:bg-emerald-700 text-white">Save Expense</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="border rounded-xl overflow-hidden bg-white dark:bg-slate-800">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="font-semibold">Date</TableHead>
                          <TableHead className="font-semibold">Category</TableHead>
                          <TableHead className="font-semibold">Title</TableHead>
                          <TableHead className="font-semibold text-right">Amount</TableHead>
                          <TableHead className="text-right font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenseItems.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              <Wallet className="w-8 h-8 mx-auto mb-2 opacity-40" />
                              <p>No expenses recorded</p>
                            </TableCell>
                          </TableRow>
                        )}
                        {expenseItems.map((eItem:any)=> (
                          <TableRow key={eItem._id} className="hover:bg-muted/30">
                            <TableCell className="text-muted-foreground">{eItem.date ? new Date(eItem.date).toLocaleDateString() : "-"}</TableCell>
                            <TableCell>
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {eItem.category || "Uncategorized"}
                              </span>
                            </TableCell>
                            <TableCell className="font-medium truncate max-w-[360px]">{eItem.title || "-"}</TableCell>
                            <TableCell className="text-right font-semibold text-emerald-600">
                              {typeof eItem.total === 'number' ? `PKR ${eItem.total.toLocaleString()}` : (typeof eItem.amount === 'number' ? `PKR ${eItem.amount.toLocaleString()}` : '-') }
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" onClick={()=>deleteExpense(eItem._id)} className="text-red-600 hover:bg-red-50 hover:text-red-700">Delete</Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

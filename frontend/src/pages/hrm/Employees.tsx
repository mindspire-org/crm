import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/components/ui/sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Filter,
  Download,
  Mail,
  Phone,
  MapPin,
  LayoutGrid,
  List,
  MoreHorizontal,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Employee = {
  id: number;
  dbId?: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  location: string;
  status: "active" | "on-leave" | "remote" | "inactive";
  joinDate: string;
  initials: string;
  image?: string;
};

const employees: Employee[] = [];

const statusConfig = {
  active: { label: "Active", variant: "success" as const },
  "on-leave": { label: "On Leave", variant: "warning" as const },
  remote: { label: "Remote", variant: "default" as const },
  inactive: { label: "Inactive", variant: "destructive" as const },
};

const departmentColors: Record<string, string> = {
  Sales: "from-chart-1 to-chart-2",
  Engineering: "from-chart-2 to-chart-3",
  Marketing: "from-chart-3 to-chart-4",
  HR: "from-chart-4 to-chart-5",
  Finance: "from-chart-5 to-chart-1",
};

const DEFAULT_DEPARTMENTS = [
  "HR",
  "Sales",
  "Marketing",
  "Finance",
  "Development",
  "Engineering",
  "Operations",
  "Support",
];

const BASE_ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
  { value: "team_member", label: "Team Member" },
  { value: "developer", label: "Developer" },
  { value: "project_manager", label: "Project Manager" },
  { value: "marketer", label: "Marketer" },
  { value: "marketing_manager", label: "Marketing Manager" },
  { value: "sales", label: "Sales Person" },
  { value: "sales_manager", label: "Sales Manager" },
  { value: "finance", label: "Finance" },
  { value: "finance_manager", label: "Finance Manager" },
];

export default function Employees() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Employee[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState<"active" | "inactive">("active");
  const [openAdd, setOpenAdd] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isEdit, setIsEdit] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingDbId, setEditingDbId] = useState<string | undefined>(undefined);
  const [openImport, setOpenImport] = useState(false);
  const [openInvite, setOpenInvite] = useState(false);
  const [inviteList, setInviteList] = useState("");
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [phoneVal, setPhoneVal] = useState("");
  const [gender, setGender] = useState("male");
  const [jobTitle, setJobTitle] = useState("");
  const [departmentVal, setDepartmentVal] = useState("HR");
  const [salary, setSalary] = useState("");
  const [salaryTerm, setSalaryTerm] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [emailVal, setEmailVal] = useState("");
  const [statusVal, setStatusVal] = useState<"active" | "on-leave" | "remote" | "inactive">("active");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("staff");
  const [sendLogin, setSendLogin] = useState(true);
  // Departments options loaded from backend
  const [deptOptions, setDeptOptions] = useState<string[]>([]);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  const mergedDeptOptions = useMemo(() => {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const d of DEFAULT_DEPARTMENTS) {
      const v = String(d || "").trim();
      if (!v) continue;
      const key = v.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(v);
    }
    for (const d of deptOptions) {
      const v = String(d || "").trim();
      if (!v) continue;
      const key = v.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(v);
    }
    return out;
  }, [deptOptions]);

  const roleOptions = useMemo(() => {
    if (role && !BASE_ROLE_OPTIONS.some((o) => o.value === role)) {
      return [...BASE_ROLE_OPTIONS, { value: role, label: role }];
    }
    return BASE_ROLE_OPTIONS;
  }, [role]);

  const getCurrentUserRole = () => {
    try {
      const userStr = localStorage.getItem("auth_user") || sessionStorage.getItem("auth_user");
      if (!userStr) return "admin";
      const user = JSON.parse(userStr);
      return String(user.role || "admin").toLowerCase();
    } catch {
      return "admin";
    }
  };

  const currentUserRole = getCurrentUserRole();

  const handleUnauthorized = () => {
    try {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      sessionStorage.removeItem("auth_token");
      sessionStorage.removeItem("auth_user");
    } catch {
      // ignore
    }
    window.location.assign("/auth");
  };

  const filteredEmployees = useMemo(() => {
    const s = searchQuery.toLowerCase();
    const bySearch = items.filter(
      (emp) =>
        emp.name.toLowerCase().includes(s) ||
        emp.department.toLowerCase().includes(s) ||
        emp.role.toLowerCase().includes(s)
    );
    if (statusTab === "active") return bySearch.filter((e) => e.status !== "inactive");
    return bySearch.filter((e) => e.status === "inactive");
  }, [items, searchQuery, statusTab]);

  const nextStep = () => setStep((p) => (p < 3 ? ((p + 1) as 1 | 2 | 3) : p));
  const prevStep = () => setStep((p) => (p > 1 ? ((p - 1) as 1 | 2 | 3) : p));
  const genPass = () => setPassword(Math.random().toString(36).slice(2, 10) + "A1!");
  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setAddress("");
    setPhoneVal("");
    setGender("male");
    setJobTitle("");
    setDepartmentVal(mergedDeptOptions[0] || "HR");
    setSalary("");
    setSalaryTerm("");
    setHireDate("");
    setEmailVal("");
    setStatusVal("active");
    setPassword("");
    setRole("staff");
    setSendLogin(true);
    setStep(1);
  };

  const parseCsv = (text: string) => {
    const lines = text.trim().split(/\r?\n/);
    if (!lines.length) return [] as any[];
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const idx = (k: string) => headers.indexOf(k);
    const out: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      if (!cols.length) continue;
      const name = (cols[idx("name")] || "").trim();
      const firstName = name.split(" ")[0] || "";
      const lastName = name.split(" ").slice(1).join(" ") || "";
      out.push({
        name,
        firstName,
        lastName,
        email: (cols[idx("email")] || "").trim(),
        phone: (cols[idx("phone")] || "").trim(),
        department: (cols[idx("department")] || "HR").trim(),
        role: (cols[idx("role")] || "staff").trim(),
        location: (cols[idx("location")] || "").trim(),
        status: (cols[idx("status")] || "active").trim(),
        joinDate: cols[idx("joindate")] ? new Date(cols[idx("joindate")]) : undefined,
      });
    }
    return out;
  };

  const onImportFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const parsed = parseCsv(text);
      setImportPreview(parsed);
    };
    reader.readAsText(f);
  };

  const saveImport = async () => {
    try {
      if (!importPreview.length) {
        setOpenImport(false);
        return;
      }
      await fetch(`${API_BASE}/api/employees/bulk`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ items: importPreview }),
      });
      setOpenImport(false);
      setImportPreview([]);
      await refreshFromAPI();
      toast.success("Team members imported");
    } catch {}
  };

  const saveInvite = async () => {
    try {
      const emails = inviteList
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
      await fetch(`${API_BASE}/api/employees/invite`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ emails }),
      });
      setOpenInvite(false);
      setInviteList("");
      toast.success("Invitations sent");
    } catch {}
  };

  const exportCSV = () => {
    const rows = [
      ["name","email","phone","department","role","location","status","joinDate"],
      ...filteredEmployees.map((e)=>[
        e.name,
        e.email,
        e.phone,
        e.department,
        e.role,
        e.location,
        e.status,
        e.joinDate,
      ]),
    ];
    const csv = rows
      .map((r)=>r.map((c)=>`"${String(c).replace(/\"/g,'""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employees.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const printList = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const rows = filteredEmployees
      .map((e)=>`<tr><td>${e.name}</td><td>${e.email}</td><td>${e.phone}</td><td>${e.department}</td><td>${e.role}</td></tr>`)
      .join("");
    w.document.write(`<!doctype html><html><head><title>Employees</title><style>table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px;text-align:left}</style></head><body><h3>Employees</h3><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Department</th><th>Role</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  // API base (local dev)

  const refreshDepartments = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/departments?active=1`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const names = (Array.isArray(data) ? data : []).map((d: any) => String(d.name)).filter(Boolean);
        if (names.length) setDeptOptions(names);
      }
    } catch {}
  };

  const refreshFromAPI = async () => {
    try {
      console.log('[HRM] Refreshing employees from API...');
      // Add cache-busting timestamp to prevent browser/proxy caching
      const timestamp = Date.now();
      const res = await fetch(`${API_BASE}/api/employees?_t=${timestamp}`, { cache: "no-store", headers: getAuthHeaders() });
      console.log('[HRM] API response status:', res.status);
      if (!res.ok) {
        console.error('[HRM] API request failed:', res.statusText);
        return;
      }
      const data = await res.json();
      console.log('[HRM] Received', data.length, 'employees');
      const mapped: Employee[] = (Array.isArray(data) ? data : []).map((d: any, i: number) => {
        const name: string = d.name || `${d.firstName || ""} ${d.lastName || ""}`.trim() || "Member";
        const initials = (d.initials || name.split(" ").map((w: string) => w[0]).join("").slice(0,2)).toUpperCase();
        const joinDate = d.joinDate ? new Date(d.joinDate).toLocaleString(undefined, { month: "short", year: "numeric" }) : "";
        return {
          id: i + 1,
          dbId: d._id,
          name,
          email: d.email || "",
          phone: d.phone || "",
          department: d.department || "HR",
          role: d.role || "staff",
          location: d.location || "",
          status: (d.status as any) || "active",
          joinDate: joinDate || "",
          initials,
          image: d.avatar ? (String(d.avatar).startsWith("http") ? d.avatar : `${API_BASE}${d.avatar}`) : undefined,
        } as Employee;
      });
      console.log('[HRM] Mapped', mapped.length, 'employees to state');
      setItems(mapped);
    } catch (err) {
      console.error('[HRM] Error refreshing employees:', err);
    }
  };

  useEffect(() => {
    // load department options
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/departments?active=1`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const names = (Array.isArray(data) ? data : []).map((d: any) => String(d.name)).filter(Boolean);
          if (names.length) setDeptOptions(names);
        }
      } catch {}
    })();
    
    // Try loading from backend; fallback to mock if API not available
    (async () => {
      try {
        const timestamp = Date.now();
        const res = await fetch(`${API_BASE}/api/employees?_t=${timestamp}`, { cache: "no-store", headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data) && data.length) {
          const mapped: Employee[] = data.map((d: any, i: number) => {
            const name: string = d.name || `${d.firstName || ""} ${d.lastName || ""}`.trim() || "Member";
            const initials = (d.initials || name.split(" ").map((w: string) => w[0]).join("").slice(0,2)).toUpperCase();
            const joinDate = d.joinDate ? new Date(d.joinDate).toLocaleString(undefined, { month: "short", year: "numeric" }) : "";
            return {
              id: i + 1,
              dbId: d._id,
              name,
              email: d.email || "",
              phone: d.phone || "",
              department: d.department || "HR",
              role: d.role || "staff",
              location: d.location || "",
              status: (d.status as any) || "active",
              joinDate: joinDate || "",
              initials,
              image: d.avatar ? (String(d.avatar).startsWith("http") ? d.avatar : `${API_BASE}${d.avatar}`) : undefined,
            } as Employee;
          });
          setItems(mapped);
        }
      } catch {}
    })();

    // Listen for departments updated event
    const handleDepartmentsUpdated = () => {
      refreshDepartments();
    };
    const handleEmployeeUpdated = () => {
      console.log('[HRM] employeeUpdated event received, refreshing...');
      refreshFromAPI();
    };
    window.addEventListener("departmentsUpdated", handleDepartmentsUpdated);
    window.addEventListener("employeeUpdated", handleEmployeeUpdated);
    return () => {
      window.removeEventListener("departmentsUpdated", handleDepartmentsUpdated);
      window.removeEventListener("employeeUpdated", handleEmployeeUpdated);
    };
  }, []);

  useEffect(() => {
    if (!isEdit && mergedDeptOptions.length && (!departmentVal || !mergedDeptOptions.includes(departmentVal))) {
      setDepartmentVal(mergedDeptOptions[0]);
    }
  }, [mergedDeptOptions]);

  const saveMember = async () => {
    const name = `${firstName} ${lastName}`.trim() || "New Member";
    const initials = name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    if (isEdit && editingIndex !== null) {
      // local update
      setItems((prev) => prev.map((it, idx) => idx === editingIndex ? { ...it, name, email: emailVal||"", phone: phoneVal||"", role, department: departmentVal, location: address||"", status: statusVal, initials } : it));
      // backend update
      if (editingDbId) {
        try {
          const payload: any = {
            firstName,
            lastName,
            name,
            email: emailVal,
            phone: phoneVal,
            department: departmentVal,
            role,
            location: address,
            status: statusVal,
            joinDate: hireDate ? new Date(hireDate) : undefined,
            initials,
          };
          if (password && password !== "********") {
            payload.password = password;
          }
          const res = await fetch(`${API_BASE}/api/employees/${editingDbId}`, {
            method: "PUT",
            headers: getAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(payload),
          });
          if (res.status === 401) {
            handleUnauthorized();
            throw new Error("Session expired. Please log in again.");
          }
          if (!res.ok) {
            const json = await res.json().catch(() => null);
            throw new Error(json?.error || "Failed to update member");
          }
          // Update succeeded - now refresh from API
          // Small delay to ensure database consistency
          await new Promise(resolve => setTimeout(resolve, 300));
          await refreshFromAPI();
          // Notify other pages (like EmployeeProfile) to refresh
          window.dispatchEvent(new Event("employeeUpdated"));
          toast.success("Member updated");
        } catch (err: any) {
          // Revert optimistic update on error
          await refreshFromAPI();
          toast.error(err?.message || "Failed to update member");
          throw err; // Re-throw to stop further execution
        }
      } else {
        // No dbId - just refresh and show success
        await refreshFromAPI();
        window.dispatchEvent(new Event("employeeUpdated"));
        toast.success("Member updated");
      }
    } else {
      // local prepend
      setItems((prev) => [
        {
          id: Math.floor(Math.random() * 100000),
          name,
          email: emailVal || "",
          phone: phoneVal || "",
          department: departmentVal,
          role: role,
          location: address || "",
          status: statusVal,
          joinDate: hireDate || "Today",
          initials,
        },
        ...prev,
      ]);
      // backend create
      try {
        const payload: any = {
          firstName,
          lastName,
          name,
          email: emailVal,
          phone: phoneVal,
          department: departmentVal,
          role,
          location: address,
          status: statusVal,
          joinDate: hireDate ? new Date(hireDate) : undefined,
          initials,
        };
        if (password && password !== "********") {
          payload.password = password;
        }
        const res = await fetch(`${API_BASE}/api/employees`, {
          method: "POST",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(payload),
        });
        if (res.status === 401) {
          handleUnauthorized();
          throw new Error("Session expired. Please log in again.");
        }
        if (!res.ok) {
          const json = await res.json().catch(() => null);
          throw new Error(json?.error || "Failed to create member");
        }
        // Success - refresh and close
        await refreshFromAPI();
        // Notify other pages to refresh
        window.dispatchEvent(new Event("employeeUpdated"));
        toast.success("Member created");
      } catch (err: any) {
        // Revert optimistic update on error
        await refreshFromAPI();
        toast.error(err?.message || "Failed to create member");
        throw err; // Re-throw to stop further execution (keep dialog open)
      }
    }
    setOpenAdd(false);
    resetForm();
    setIsEdit(false);
    setEditingIndex(null);
    setEditingDbId(undefined);
  };

  const startEdit = async (emp: Employee, index: number) => {
    // Fetch full employee data including password
    let fullEmployeeData: any = emp;
    if (emp.dbId) {
      try {
        const timestamp = Date.now();
        const res = await fetch(`${API_BASE}/api/employees/${emp.dbId}?_t=${timestamp}`, { headers: getAuthHeaders() });
        if (res.ok) {
          fullEmployeeData = await res.json();
        }
      } catch {}
    }
    
    const [fn, ln] = fullEmployeeData.name?.split(" ") || emp.name.split(" ");
    setFirstName(fn || "");
    setLastName(ln || "");
    setAddress(fullEmployeeData.location || emp.location || "");
    setPhoneVal(fullEmployeeData.phone || emp.phone || "");
    setGender(fullEmployeeData.gender || "male");
    setJobTitle(fullEmployeeData.role || emp.role || "");
    setDepartmentVal(fullEmployeeData.department || emp.department || "HR");
    setSalary(fullEmployeeData.salary ? String(fullEmployeeData.salary) : "");
    setSalaryTerm(fullEmployeeData.salaryTerm || "");
    setHireDate(fullEmployeeData.joinDate ? new Date(fullEmployeeData.joinDate).toISOString().slice(0,10) : "");
    setEmailVal(fullEmployeeData.email || emp.email || "");
    setStatusVal(fullEmployeeData.status || emp.status || "active");
    setPassword(fullEmployeeData.password || "");
    setRole(fullEmployeeData.role || emp.role || "staff");
    setSendLogin(false);
    setIsEdit(true);
    setEditingIndex(index);
    setEditingDbId(emp.dbId);
    setStep(1);
    setOpenAdd(true);
  };

  const deleteEmployee = async (emp: Employee) => {
    setItems((prev) => prev.filter((it) => it.id !== emp.id));
    if (emp.dbId) {
      try {
        await fetch(`${API_BASE}/api/employees/${emp.dbId}`, { method: "DELETE", headers: getAuthHeaders() });
      } catch {}
      await refreshFromAPI();
    }
    toast.success("Member deleted");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-sm text-muted-foreground">Team members</h1>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-md overflow-hidden">
              <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon-sm" onClick={()=>setViewMode("list")}>
                <List className="w-4 h-4"/>
              </Button>
              <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon-sm" onClick={()=>setViewMode("grid")}>
                <LayoutGrid className="w-4 h-4"/>
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant={statusTab === "active" ? "secondary" : "outline"} size="sm" onClick={()=>setStatusTab("active")}>Active members</Button>
              <Button variant={statusTab === "inactive" ? "secondary" : "outline"} size="sm" onClick={()=>setStatusTab("inactive")}>Inactive members</Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentUserRole === "admin" && (
              <>
                <Dialog open={openImport} onOpenChange={setOpenImport}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">Import team members</Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card">
                    <DialogHeader>
                      <DialogTitle>Import team members</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3">
                      <div className="space-y-1">
                        <Label>Upload CSV</Label>
                        <Input ref={importFileRef} type="file" accept=".csv" onChange={onImportFileChange} />
                        <p className="text-xs text-muted-foreground">Headers: name,email,phone,department,role,location,status,joinDate</p>
                      </div>
                      {importPreview.length > 0 && (
                        <div className="text-xs text-muted-foreground">Parsed {importPreview.length} rows</div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={()=>setOpenImport(false)}>Close</Button>
                      <Button onClick={saveImport}>Import</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Dialog open={openInvite} onOpenChange={setOpenInvite}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">Send invitation</Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card">
                    <DialogHeader>
                      <DialogTitle>Send invitation</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3">
                      <div className="space-y-1">
                        <Label>Emails (comma or newline separated)</Label>
                        <Textarea rows={6} placeholder="a@company.com, b@company.com" value={inviteList} onChange={(e)=>setInviteList(e.target.value)} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={()=>setOpenInvite(false)}>Close</Button>
                      <Button onClick={saveInvite}>Send</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Dialog open={openAdd} onOpenChange={(o)=>{setOpenAdd(o); if(!o) resetForm();}}>
                  <DialogTrigger asChild>
                    <Button variant="gradient" size="sm"><Plus className="w-4 h-4 mr-2"/>Add member</Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card">
                    <DialogHeader>
                      <DialogTitle>Add member</DialogTitle>
                    </DialogHeader>
                {/* Stepper */}
                <div className="mb-4">
                  <div className="flex items-center gap-6 text-sm">
                    <button className={cn("pb-2", step===1?"text-foreground":"text-muted-foreground")} onClick={()=>setStep(1)}>General Info</button>
                    <button className={cn("pb-2", step===2?"text-foreground":"text-muted-foreground")} onClick={()=>setStep(2)}>Job Info</button>
                    <button className={cn("pb-2", step===3?"text-foreground":"text-muted-foreground")} onClick={()=>setStep(3)}>Account settings</button>
                  </div>
                  <div className="h-1 w-full bg-muted rounded">
                    <div className={cn("h-1 bg-success rounded transition-all", step===1&&"w-1/3", step===2&&"w-2/3", step===3&&"w-full")}></div>
                  </div>
                </div>

                {step===1 && (
                  <div className="grid gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1"><Label>First name</Label><Input placeholder="First name" value={firstName} onChange={(e)=>setFirstName(e.target.value)} /></div>
                      <div className="space-y-1"><Label>Last name</Label><Input placeholder="Last name" value={lastName} onChange={(e)=>setLastName(e.target.value)} /></div>
                    </div>
                    <div className="space-y-1"><Label>Mailing address</Label><Textarea placeholder="Mailing address" value={address} onChange={(e)=>setAddress(e.target.value)} /></div>
                    <div className="space-y-1"><Label>Phone</Label><Input type="tel" placeholder="+1 (000) 000-0000" value={phoneVal} onChange={(e)=>setPhoneVal(e.target.value)} /></div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <RadioGroup value={gender} onValueChange={setGender} className="flex gap-6">
                        <div className="flex items-center gap-2"><RadioGroupItem value="male" id="g-m"/><Label htmlFor="g-m">Male</Label></div>
                        <div className="flex items-center gap-2"><RadioGroupItem value="female" id="g-f"/><Label htmlFor="g-f">Female</Label></div>
                        <div className="flex items-center gap-2"><RadioGroupItem value="other" id="g-o"/><Label htmlFor="g-o">Other</Label></div>
                      </RadioGroup>
                    </div>
                  </div>
                )}

                {step===2 && (
                  <div className="grid gap-3">
                    <div className="space-y-1"><Label>Job Title</Label><Input placeholder="Job Title" value={jobTitle} onChange={(e)=>setJobTitle(e.target.value)} /></div>
                    <div className="space-y-1">
                      <Label>Department</Label>
                      <Select value={departmentVal} onValueChange={setDepartmentVal}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {mergedDeptOptions.map((d)=> (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1"><Label>Salary</Label><Input placeholder="Salary" value={salary} onChange={(e)=>setSalary(e.target.value)} /></div>
                      <div className="space-y-1"><Label>Salary term</Label><Input placeholder="Salary term" value={salaryTerm} onChange={(e)=>setSalaryTerm(e.target.value)} /></div>
                      <div className="space-y-1"><Label>Date of hire</Label><DatePicker value={hireDate} onChange={setHireDate} placeholder="Pick date" /></div>
                    </div>
                    <div className="space-y-1">
                      <Label>Status</Label>
                      <Select value={statusVal} onValueChange={(v: any)=>setStatusVal(v)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusConfig).map(([val, cfg]) => (
                            <SelectItem key={val} value={val}>{cfg.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {step===3 && (
                  <div className="grid gap-3">
                    <div className="space-y-1"><Label>Email</Label><Input type="email" placeholder="Email" value={emailVal} onChange={(e)=>setEmailVal(e.target.value)} /></div>
                    <div className="space-y-1">
                      <Label>Password</Label>
                      <div className="flex items-center gap-2">
                        <Input type={showPassword?"text":"password"} value={password} onChange={(e)=>setPassword(e.target.value)} placeholder={isEdit?"Leave blank to keep existing":"Enter password"} />
                        <Button type="button" variant="outline" size="sm" onClick={genPass}>Generate</Button>
                        <Button type="button" variant="ghost" size="icon" onClick={()=>setShowPassword(v=>!v)}>
                          {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Role</Label>
                      <Select value={role} onValueChange={setRole}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roleOptions.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Checkbox id="send-login" checked={sendLogin} onCheckedChange={(v)=>setSendLogin(Boolean(v))} />
                      <Label htmlFor="send-login">Email login details to this user</Label>
                    </div>
                  </div>
                )}

                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={()=>{setOpenAdd(false); resetForm();}}>Close</Button>
                  {step>1 && <Button variant="secondary" onClick={prevStep}>Previous</Button>}
                  {step<3 && <Button variant="gradient" onClick={nextStep}>Next</Button>}
                  {step===3 && <Button onClick={saveMember}>Save</Button>}
                </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-bold mt-1">{items.length}</p>
              </div>
              <Badge variant="success">+8</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inactive members</p>
                <p className="text-2xl font-bold mt-1">{items.filter(i=>i.status==="inactive").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Remote</p>
                <p className="text-2xl font-bold mt-1">{items.filter(i=>i.status==="remote").length}</p>
              </div>
              <Badge variant="secondary">{items.length?((items.filter(i=>i.status==="remote").length/items.length)*100).toFixed(1):"0.0"}%</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Departments</p>
                <p className="text-2xl font-bold mt-1">{Array.from(new Set(items.map(i=>i.department))).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar: search + actions (Excel/Print/Search) */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={exportCSV}>Excel</Button>
            <Button variant="outline" size="sm" onClick={printList}>Print</Button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search" value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} className="pl-9 w-56" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Grid */}
      <div
        className={cn(
          "grid gap-4",
          viewMode === "grid"
            ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : "grid-cols-1"
        )}
      >
        {filteredEmployees.map((employee) => (
          <Card key={employee.id} className="group hover:shadow-md transition-shadow">
            <CardContent className={cn("p-6", viewMode === "list" && "flex items-center gap-6")}>
              {/* Avatar & Basic Info */}
              <div className={cn("flex items-center gap-4", viewMode === "grid" && "flex-col text-center")}>
                <div className="relative">
                  <Avatar className={cn(
                    viewMode === "grid" ? "w-20 h-20" : "w-12 h-12",
                    "ring-2 ring-primary/20 ring-offset-1 ring-offset-card shadow-sm"
                  )}>
                    {employee.image && (
                      <AvatarImage className="object-cover object-center" src={employee.image} alt={employee.name} />
                    )}
                    <AvatarFallback
                      className={`bg-gradient-to-br ${
                        departmentColors[employee.department] || "from-primary to-indigo"
                      } text-primary-foreground font-semibold ${viewMode === "grid" ? "text-xl" : "text-sm"}`}
                    >
                      {employee.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow",
                      employee.status === "active" && "bg-success",
                      employee.status === "on-leave" && "bg-warning",
                      employee.status === "remote" && "bg-primary",
                      employee.status === "inactive" && "bg-destructive"
                    )}
                  />
                </div>

                <div className={cn(viewMode === "grid" && "mt-2")}>
                  <h3 className="font-semibold">{employee.name}</h3>
                  <p className="text-sm text-muted-foreground">{employee.role}</p>
                  <Badge variant="secondary" className="mt-2">
                    {employee.department}
                  </Badge>
                </div>
              </div>

              {/* Contact Info */}
              <div
                className={cn(
                  "space-y-2 text-sm",
                  viewMode === "grid" ? "mt-4 pt-4 border-t" : "flex-1"
                )}
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{employee.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{employee.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{employee.location}</span>
                </div>
              </div>

              {/* Actions */}
              <div
                className={cn(
                  "flex items-center gap-2",
                  viewMode === "grid"
                    ? "mt-4 pt-4 border-t justify-center"
                    : "opacity-0 group-hover:opacity-100 transition-opacity"
                )}
              >
                <Button variant="outline" size="sm" onClick={()=>{
                  const idForUrl = employee.dbId || String(employee.id);
                  navigate(`/hrm/employees/${idForUrl}`, { state: { employee, dbId: employee.dbId } });
                }}>
                  View Profile
                </Button>
                {currentUserRole === "admin" && (
                  <>
                    <Button variant="outline" size="sm" onClick={()=>{
                      const fullIndex = items.findIndex(e=>e.id===employee.id);
                      startEdit(employee, fullIndex);
                    }}>Edit</Button>
                    <Button variant="destructive" size="sm" onClick={()=>{
                      setEmployeeToDelete(employee);
                      setConfirmDeleteOpen(true);
                    }}>Delete</Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        onConfirm={() => employeeToDelete && deleteEmployee(employeeToDelete)}
        title="Delete Member"
        description={`Are you sure you want to delete ${employeeToDelete?.name}? This action cannot be undone.`}
        variant="destructive"
      />
    </div>
  );
}

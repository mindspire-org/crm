import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSettings } from "@/hooks/useSettings";
import { API_BASE } from "@/lib/api/base";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MapPin, 
  Briefcase, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  Loader2, 
  Sparkles,
  Shield,
  FileText,
  User,
  Users,
  Phone,
  Mail,
  Building,
  Globe,
  Camera,
  Upload,
  Trophy,
  Layers
} from "lucide-react";
import { toast } from "sonner";

const CONTACT_METHODS = ["WhatsApp", "Phone Call", "Email"];
const CATEGORIES = [
  "Graphics", 
  "Video editing", 
  "Social media marketing", 
  "Sales", 
  "Web development", 
  "Software development", 
  "Deployment", 
  "QA"
];

const isValidEmail = (v: string) => {
  const s = String(v || "").trim();
  if (!s) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
};

const normalizePhone = (v: string) => {
  const s = String(v || "").trim();
  if (!s) return "";
  return s.replace(/[\s().-]/g, "");
};

const isValidPhone = (v: string) => {
  const p = normalizePhone(v);
  if (!p) return false;
  const digits = p.replace(/[^0-9]/g, "");
  return digits.length >= 7;
};

export default function PublicJobEnrollment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    company: "",
    contactMethod: CONTACT_METHODS[0],
    category: "",
    experience: "",
    portfolio: "",
    message: "",
    photo: null as File | null,
    resume: null as File | null,
    consent: false
  });

  useEffect(() => {
    if (!id) return;
    const fetchJob = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/jobs/${id}`);
        if (res.ok) {
          const data = await res.json();
          setJob(data);
        } else {
          console.error("Job not found or API error:", res.status);
          setJob(null);
        }
      } catch (e) {
        console.error("Failed to load job details:", e);
        setJob(null);
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id]);

  const canSubmit = useMemo(() => {
    return (
      formData.name.trim() &&
      isValidEmail(formData.email) &&
      isValidPhone(formData.phone) &&
      formData.category &&
      formData.consent
    );
  }, [formData]);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_BASE}/api/upload-public`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        return data.url;
      }
    } catch (e) {
      console.error("Upload error:", e);
    }
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      toast.error("Please fill in all required fields and accept the terms.");
      return;
    }
    
    setSubmitting(true);
    try {
      let photoUrl = "";
      let resumeUrl = "";

      if (formData.photo) {
        photoUrl = await uploadFile(formData.photo);
      }
      if (formData.resume) {
        resumeUrl = await uploadFile(formData.resume);
      }

      const payload = {
        name: formData.name.trim(),
        role: job?.title || "Enrolled Applicant",
        jobId: job?._id,
        stage: "Applied",
        email: formData.email.trim(),
        phone: normalizePhone(formData.phone),
        city: formData.city.trim(),
        company: formData.company.trim(),
        contactMethod: formData.contactMethod,
        category: formData.category,
        experience: formData.experience.trim(),
        portfolioUrl: formData.portfolio.trim(),
        notes: formData.message.trim(),
        photoUrl: photoUrl ? `${API_BASE}${photoUrl}` : "",
        resumeUrl: resumeUrl ? `${API_BASE}${resumeUrl}` : "",
        labels: ["Enrollment Form"]
      };

      const res = await fetch(`${API_BASE}/api/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSubmitted(true);
        toast.success("Enrollment submitted successfully!");
      } else {
        toast.error("Failed to submit enrollment. Please try again.");
      }
    } catch (e) {
      toast.error("An error occurred during submission.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
            Preparing Enrollment Form...
          </p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-10 bg-white rounded-[3rem] shadow-xl border border-slate-100 max-w-md mx-auto">
          <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-rose-500" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Form Expired</h1>
          <p className="text-slate-500 mb-8 font-medium">This enrollment link is no longer active or the position has been filled.</p>
          <Button onClick={() => navigate("/")} className="w-full h-14 rounded-2xl bg-slate-900 text-white font-bold uppercase tracking-widest text-[11px]">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  const brandName = settings?.general?.companyName || "HealthSpire";
  const primaryColor = settings?.general?.primaryColor || "#4f46e5";

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-white rounded-[3rem] shadow-2xl p-12 text-center border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full -mr-20 -mt-20" />
          <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8 relative">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-4 leading-none">Enrollment Successful!</h2>
          <p className="text-slate-500 mb-10 text-lg leading-relaxed font-medium">
            Your enrollment for <span className="text-indigo-600 font-bold">{job.title}</span> has been processed. Our HR team will contact you via your preferred method shortly.
          </p>
          <div className="space-y-4">
            <Button onClick={() => window.location.reload()} className="w-full h-16 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-[0.2em] text-[12px] shadow-xl transition-all hover:scale-[1.02]">
              Start New Enrollment
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const inputCls = "w-full h-14 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 ring-indigo-500 focus:bg-white font-semibold px-6 text-sm placeholder:text-slate-300 transition-all shadow-sm";
  const labelCls = "text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1 block flex items-center gap-2";

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100">
      {/* Premium Header */}
      <div className="bg-slate-950 text-white relative overflow-hidden py-24 px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(79,70,229,0.15),transparent_50%),radial-gradient(circle_at_80%_70%,rgba(124,58,237,0.1),transparent_50%)]" />
        
        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="flex flex-col items-center text-center">
            <div className="mb-8 inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-xs font-black uppercase tracking-[0.3em] text-indigo-300">
              <Sparkles className="w-4 h-4" />
              <span>Official Enrollment Portal</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-[0.9] max-w-4xl uppercase">
              {job.title}
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-4 text-slate-400 font-bold text-sm uppercase tracking-widest">
               <span className="flex items-center gap-2 bg-white/5 rounded-2xl px-5 py-2 border border-white/5"><MapPin className="w-4 h-4 text-indigo-400"/> {job.location || "Remote"}</span>
               <span className="flex items-center gap-2 bg-white/5 rounded-2xl px-5 py-2 border border-white/5"><Clock className="w-4 h-4 text-indigo-400"/> {job.type || "Full-time"}</span>
               <span className="flex items-center gap-2 bg-white/5 rounded-2xl px-5 py-2 border border-white/5"><Building className="w-4 h-4 text-indigo-400"/> {job.department || "General"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-12 mb-20">
        <div className="grid lg:grid-cols-[1fr_450px] gap-12 items-start">
          
          {/* Form Side */}
          <div className="bg-white rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] border border-slate-100 p-10 md:p-14 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-50" />
            
            <div className="relative z-10 mb-12">
              <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-2">Enrollment Form</h2>
              <p className="text-slate-500 font-medium text-lg leading-relaxed">Please provide your professional details to initiate the official enrollment process.</p>
            </div>

            <form onSubmit={handleSubmit} className="relative z-10 space-y-8">
              {/* Photo Upload Section */}
              <div className="flex flex-col items-center mb-10 pb-10 border-b border-slate-100">
                <Label className={`${labelCls} text-center w-full mb-4`}>Professional Photo</Label>
                <div className="relative group">
                  <div className="w-32 h-32 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-indigo-400">
                    {formData.photo ? (
                      <img src={URL.createObjectURL(formData.photo)} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-8 h-8 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => setFormData({...formData, photo: e.target.files?.[0] || null})}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
                <p className="text-[9px] font-bold text-slate-400 mt-3 uppercase tracking-widest">Click to upload photo</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <Label className={labelCls}><User className="w-3 h-3"/> Full Legal Name <span className="text-rose-500">*</span></Label>
                    <Input 
                      required 
                      placeholder="Enter your full name" 
                      value={formData.name} 
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className={inputCls} 
                    />
                  </div>
                  
                  <div>
                    <Label className={labelCls}><Mail className="w-3 h-3"/> Email Address <span className="text-rose-500">*</span></Label>
                    <Input 
                      required 
                      type="email" 
                      placeholder="name@example.com" 
                      value={formData.email} 
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className={inputCls} 
                    />
                  </div>

                  <div>
                    <Label className={labelCls}><Phone className="w-3 h-3"/> Phone Number <span className="text-rose-500">*</span></Label>
                    <Input 
                      required 
                      type="tel" 
                      placeholder="+1 (555) 000-0000" 
                      value={formData.phone} 
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className={inputCls} 
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <Label className={labelCls}><Layers className="w-3 h-3"/> Job Category <span className="text-rose-500">*</span></Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                      <SelectTrigger className={inputCls}>
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat} className="font-semibold text-slate-700 py-3 rounded-xl focus:bg-indigo-50">
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className={labelCls}><Trophy className="w-3 h-3"/> Years of Experience</Label>
                    <Input 
                      placeholder="e.g. 3 Years" 
                      value={formData.experience} 
                      onChange={(e) => setFormData({...formData, experience: e.target.value})}
                      className={inputCls} 
                    />
                  </div>

                  <div>
                    <Label className={labelCls}><Upload className="w-3 h-3"/> Attach Resume (PDF) <span className="text-rose-500">*</span></Label>
                    <div className="relative">
                      <div className={`w-full h-14 rounded-2xl border flex items-center px-6 transition-all ${formData.resume ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                        <FileText className="w-4 h-4 mr-3" />
                        <span className="text-sm font-semibold truncate">
                          {formData.resume ? formData.resume.name : "Select Resume File"}
                        </span>
                      </div>
                      <input 
                        type="file" 
                        accept=".pdf,.doc,.docx" 
                        required
                        onChange={(e) => setFormData({...formData, resume: e.target.files?.[0] || null})}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8 items-end">
                <div>
                  <Label className={labelCls}><MapPin className="w-3 h-3"/> City / Current Location</Label>
                  <Input 
                    placeholder="e.g. Lahore, Pakistan" 
                    value={formData.city} 
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className={inputCls} 
                  />
                </div>
                <div className="space-y-1">
                  <Label className={labelCls}>Preferred Contact Method</Label>
                  <Select value={formData.contactMethod} onValueChange={(v) => setFormData({...formData, contactMethod: v})}>
                    <SelectTrigger className={inputCls}>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                      {CONTACT_METHODS.map((m) => (
                        <SelectItem key={m} value={m} className="font-semibold text-slate-700 py-3 rounded-xl focus:bg-indigo-50">
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className={labelCls}><FileText className="w-3 h-3"/> Additional Notes / Message</Label>
                <Textarea 
                  placeholder="Tell us about your background or anything else..." 
                  value={formData.message} 
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  className="w-full min-h-[140px] rounded-[2rem] bg-slate-50 border border-slate-100 focus:ring-2 ring-indigo-500 focus:bg-white font-semibold p-6 text-sm placeholder:text-slate-300 transition-all shadow-sm"
                />
              </div>

              <div className="flex items-start gap-4 p-6 bg-slate-50 rounded-3xl border border-slate-100 group transition-all hover:bg-white hover:shadow-md">
                <Checkbox 
                  id="consent"
                  checked={formData.consent} 
                  onCheckedChange={(v) => setFormData({...formData, consent: Boolean(v)})} 
                  className="mt-1 w-6 h-6 rounded-lg border-2 border-slate-200 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                />
                <Label htmlFor="consent" className="text-xs font-bold text-slate-500 leading-relaxed cursor-pointer select-none">
                  I hereby confirm that all provided information is accurate and I consent to being contacted by {brandName}'s HR department for the purpose of this enrollment.
                </Label>
              </div>

              <Button 
                type="submit" 
                disabled={submitting || !canSubmit} 
                className="w-full h-20 rounded-[2rem] bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[13px] tracking-[0.3em] shadow-2xl shadow-slate-900/20 transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
              >
                {submitting ? (
                  <><Loader2 className="w-6 h-6 mr-3 animate-spin"/> Processing Enrollment...</>
                ) : (
                  "Submit Official Enrollment"
                )}
              </Button>
            </form>
          </div>

          {/* Info Side */}
          <div className="space-y-8 lg:sticky lg:top-10">
            <div className="bg-indigo-600 rounded-[3rem] p-10 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
               <h3 className="text-2xl font-black mb-6 tracking-tight">Position Summary</h3>
               <div className="space-y-6">
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                     <DollarSign className="w-6 h-6" />
                   </div>
                   <div>
                     <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">Compensation</p>
                     <p className="font-black text-lg tracking-tight">{job.salary || "Competitive"}</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                     <Users className="w-6 h-6" />
                   </div>
                   <div>
                     <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">Open Positions</p>
                     <p className="font-black text-lg tracking-tight">{job.openings || 1} Opening(s)</p>
                   </div>
                 </div>
               </div>
            </div>

            <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
              <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                Enrollment Process
              </h3>
              <ul className="space-y-6">
                {[
                  "Form Submission & Data Verification",
                  "HR Initial Screening Call",
                  "Technical Evaluation Phase",
                  "Official Offer & Onboarding"
                ].map((step, i) => (
                  <li key={i} className="flex gap-4 items-start">
                    <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <span className="text-sm font-bold text-slate-600 leading-tight">{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      </div>
      
      <footer className="py-10 text-center border-t border-slate-100 bg-white/50">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
          © {new Date().getFullYear()} mindspire.org • SECURE ENROLLMENT PORTAL
        </p>
      </footer>
    </div>
  );
}

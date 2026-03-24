import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSettings } from "@/hooks/useSettings";
import { API_BASE } from "@/lib/api/base";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MapPin, Briefcase, DollarSign, Clock, CheckCircle2, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

export default function PublicJobApplication() {
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
    portfolio: "",
    coverLetter: ""
  });

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/jobs/${id}`);
        if (res.ok) {
          const data = await res.json();
          setJob(data);
        } else {
          setJob(null);
        }
      } catch (e) {
        console.error("Failed to load job posting:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) {
      toast.error("Please fill in all required fields.");
      return;
    }
    
    setSubmitting(true);
    try {
      // Create Candidate record via public unauthenticated route or a generic endpoint
      // Note: If the backend requires auth for POST /api/candidates, we might need a dedicated public endpoint
      // Or we can try the standard endpoint and handle 401. Assuming there's no auth check on public routes or we try it first.
      
      const payload = {
        name: formData.name.trim(),
        role: job?.title || "Applicant", // Link them to the job position
        jobId: job?._id,
        stage: "Applied",
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        portfolioUrl: formData.portfolio.trim(),
        coverLetter: formData.coverLetter.trim()
      };

      const res = await fetch(`${API_BASE}/api/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSubmitted(true);
        toast.success("Application submitted successfully!");
      } else {
        toast.error("Failed to submit application. Please try again.");
      }
    } catch (e) {
      toast.error("An error occurred submitting your application.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
            Loading Job Details...
          </p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-3xl font-black text-slate-800 mb-2">Job Not Found</h1>
          <p className="text-slate-500 mb-6">This position may have been closed or removed.</p>
        </div>
      </div>
    );
  }

  const brandName = (settings as any)?.company?.name || "Mindspire";

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 text-center border border-slate-100">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-3">Application Received!</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Thank you for applying to the <span className="font-bold text-slate-700">{job.title}</span> position at {brandName}. Our team will review your application and get back to you soon.
          </p>
          <Button onClick={() => window.location.reload()} variant="outline" className="w-full h-12 rounded-xl border-slate-200 font-bold uppercase tracking-widest text-[11px] text-slate-600">
            Submit Another
          </Button>
        </div>
      </div>
    );
  }

  const inputCls = "w-full h-14 rounded-2xl bg-slate-50 border-0 focus:ring-2 ring-indigo-500 font-semibold px-5 text-sm placeholder:text-slate-300 transition-all shadow-sm";
  const labelCls = "text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1 block";

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100">
      {/* Dynamic Header */}
      <div className="bg-slate-900 text-white relative overflow-hidden flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px] -ml-32 -mb-32 pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl w-full">
          <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-bold uppercase tracking-widest text-indigo-200">
            <span>Join {brandName}</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 leading-tight">
            {job.title}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-3 text-slate-300 font-medium max-w-xl mx-auto">
            {job.department && (
              <span className="flex items-center bg-white/5 rounded-full px-4 py-1.5"><Briefcase className="w-4 h-4 mr-2 text-indigo-400"/> {job.department}</span>
            )}
            {job.location && (
              <span className="flex items-center bg-white/5 rounded-full px-4 py-1.5"><MapPin className="w-4 h-4 mr-2 text-indigo-400"/> {job.location}</span>
            )}
            {job.type && (
              <span className="flex items-center bg-white/5 rounded-full px-4 py-1.5"><Clock className="w-4 h-4 mr-2 text-indigo-400"/> {job.type}</span>
            )}
            {job.salary && (
              <span className="flex items-center bg-white/5 rounded-full px-4 py-1.5"><DollarSign className="w-4 h-4 mr-2 text-indigo-400"/> {job.salary}</span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12 grid md:grid-cols-[1fr_400px] gap-10 items-start">
        {/* Job Details Section */}
        <div className="space-y-12">
          {job.description && (
            <section>
              <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-6 flex items-center gap-4">
                <div className="h-[2px] w-8 bg-indigo-600" /> About the Role
              </h3>
              <p className="text-slate-600 leading-relaxed max-w-2xl whitespace-pre-wrap text-base">
                {job.description}
              </p>
            </section>
          )}

          {job.requirements && job.requirements.length > 0 && (
            <section>
              <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-6 flex items-center gap-4">
                <div className="h-[2px] w-8 bg-indigo-600" /> Key Requirements
              </h3>
              <ul className="space-y-4 max-w-2xl">
                {job.requirements.map((req: string, i: number) => (
                  <li key={i} className="flex items-start gap-4">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-600 leading-relaxed text-base">{req}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {job.benefits && job.benefits.length > 0 && (
            <section>
              <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-6 flex items-center gap-4">
                <div className="h-[2px] w-8 bg-indigo-600" /> What We Offer
              </h3>
              <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
                {job.benefits.map((ben: string, i: number) => (
                  <div key={i} className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex items-center gap-3">
                     <div className="w-2 h-2 rounded-full bg-indigo-600" />
                     <span className="text-slate-700 font-medium text-sm">{ben}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Application Form Drawer / Card */}
        <div className="bg-white border border-slate-100 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] rounded-[2.5rem] p-8 md:p-10 sticky top-12">
          <div className="mb-8">
            <h2 className="text-2xl font-black tracking-tight text-slate-900">Apply Now</h2>
            <p className="text-slate-500 mt-1 text-sm">Fill out the form below to submit your application directly to our hiring team.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label className={labelCls}>Full Name <span className="text-rose-500">*</span></Label>
              <Input 
                required 
                placeholder="Jane Doe" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className={inputCls} 
              />
            </div>
            
            <div>
              <Label className={labelCls}>Email Address <span className="text-rose-500">*</span></Label>
              <Input 
                required 
                type="email" 
                placeholder="jane@example.com" 
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className={inputCls} 
              />
            </div>

            <div>
              <Label className={labelCls}>Phone Number <span className="text-rose-500">*</span></Label>
              <Input 
                required 
                type="tel" 
                placeholder="+1 (555) 000-0000" 
                value={formData.phone} 
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className={inputCls} 
              />
            </div>

            <div>
              <Label className={labelCls}>Portfolio / LinkedIn / GitHub</Label>
              <Input 
                type="url" 
                placeholder="https://..." 
                value={formData.portfolio} 
                onChange={(e) => setFormData({...formData, portfolio: e.target.value})}
                className={inputCls} 
              />
            </div>

            <div>
              <Label className={labelCls}>Cover Letter / Note</Label>
              <Textarea 
                placeholder="Tell us why you're a great fit..." 
                value={formData.coverLetter} 
                onChange={(e) => setFormData({...formData, coverLetter: e.target.value})}
                className="w-full min-h-[120px] rounded-2xl bg-slate-50 border-0 focus:ring-2 ring-indigo-500 font-semibold p-5 text-sm placeholder:text-slate-300 transition-all shadow-sm"
              />
            </div>

            <Button 
              type="submit" 
              disabled={submitting} 
              className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[12px] tracking-[0.2em] shadow-xl shadow-indigo-600/20 transition-all hover:scale-[1.02]"
            >
              {submitting ? (
                <><Loader2 className="w-5 h-5 mr-3 animate-spin"/> Submitting...</>
              ) : (
                "Submit Application"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

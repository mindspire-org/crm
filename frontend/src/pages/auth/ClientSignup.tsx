import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { emailAvailable, clientRegister } from "@/services/authService";
import { Eye, EyeOff, Loader2 } from "lucide-react";

function useDebounced<T>(value: T, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function ClientSignup() {
  const [type, setType] = useState<"org"|"person">("org");
  const [companyName, setCompanyName] = useState("");
  const [clientName, setClientName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [industry, setIndustry] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw1, setShowPw1] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string | null>(null);
  const [emailOk, setEmailOk] = useState<boolean | null>(null);

  const debouncedEmail = useDebounced(email);
  useEffect(() => {
    (async () => {
      if (!debouncedEmail || !debouncedEmail.includes("@")) { setEmailOk(null); return; }
      try {
        const ok = await emailAvailable(debouncedEmail);
        setEmailOk(ok);
      } catch { setEmailOk(null); }
    })();
  }, [debouncedEmail]);

  const strong = useMemo(() => /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/.test(password), [password]);
  const match = password && confirm && password === confirm;

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErrors(null);
    const fullName = `${firstName} ${lastName}`.trim();
    const isOrg = type === "org";
    const nameForPerson = fullName || clientName.trim();
    if ((isOrg && !companyName.trim()) || !nameForPerson || !email.trim() || !password) {
      setErrors("Please fill all required fields");
      return;
    }
    if (!strong) { setErrors("Password must be at least 8 characters and include letters and numbers"); return; }
    if (!match) { setErrors("Passwords do not match"); return; }
    try {
      setLoading(true);
      const resp = await clientRegister({
        type,
        companyName: isOrg ? companyName.trim() : undefined,
        clientName: nameForPerson,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
        industry: industry || undefined,
        autoLogin: false,
      });
      toast.success("Signup submitted. Admin will grant access.");
      window.dispatchEvent(new CustomEvent("auth:signup", { detail: { role: "client" } }));
    } catch (e: any) {
      setErrors(String(e?.message || "Signup failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Name section */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1"><Label>First name</Label><Input value={firstName} onChange={(e)=>setFirstName(e.target.value)} placeholder="First name" /></div>
        <div className="space-y-1"><Label>Last name</Label><Input value={lastName} onChange={(e)=>setLastName(e.target.value)} placeholder="Last name" /></div>
      </div>

      {/* Type selection */}
      <div className="space-y-1">
        <Label>Type</Label>
        <div className="flex items-center gap-6 text-sm">
          <label className="inline-flex items-center gap-2 cursor-pointer"><input type="radio" name="ctype" value="org" checked={type==='org'} onChange={()=>setType('org')} /> Organization</label>
          <label className="inline-flex items-center gap-2 cursor-pointer"><input type="radio" name="ctype" value="person" checked={type==='person'} onChange={()=>setType('person')} /> Individual</label>
        </div>
      </div>

      {type === 'org' && (
        <div className="space-y-1"><Label>Company name</Label><Input value={companyName} onChange={(e)=>setCompanyName(e.target.value)} placeholder="Company name" /></div>
      )}

      {/* Optional fallback single name field */}
      <div className="hidden">
        <Input value={clientName} onChange={(e)=>setClientName(e.target.value)} placeholder="Name" />
      </div>

      {/* Contact & credentials */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1 sm:col-span-2">
          <Label>Email</Label>
          <Input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@company.com" type="email" />
          {emailOk === true && <div className="text-xs text-success mt-1">Email available</div>}
          {emailOk === false && <div className="text-xs text-warning mt-1">Email already in use</div>}
        </div>
        <div className="space-y-1"><Label>Phone Number</Label><Input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="03xx..." /></div>
        <div className="space-y-1"><Label>Industry (optional)</Label><Input value={industry} onChange={(e)=>setIndustry(e.target.value)} placeholder="IT Services" /></div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Password</Label>
          <div className="relative">
            <Input type={showPw1?"text":"password"} value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••" />
            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={()=>setShowPw1(s=>!s)}>{showPw1? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}</button>
          </div>
          {!strong && password && <div className="text-xs text-muted-foreground">Use at least 8 characters with letters and numbers</div>}
        </div>
        <div className="space-y-1">
          <Label>Confirm Password</Label>
          <div className="relative">
            <Input type={showPw2?"text":"password"} value={confirm} onChange={(e)=>setConfirm(e.target.value)} placeholder="••••••••" />
            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={()=>setShowPw2(s=>!s)}>{showPw2? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}</button>
          </div>
          {confirm && !match && <div className="text-xs text-destructive">Passwords do not match</div>}
        </div>
      </div>

      {errors && <div className="text-destructive text-sm">{errors}</div>}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (<span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/> Creating account...</span>) : "Create account"}
      </Button>
    </form>
  );
}

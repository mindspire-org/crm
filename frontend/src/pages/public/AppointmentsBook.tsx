import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { API_BASE } from "@/lib/api/base";

const SERVICES = ["General", "Consultation", "Discovery Call", "Support", "Other"];
const CONTACT_METHODS = ["WhatsApp", "Phone Call", "Email"];

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

export default function AppointmentsBook() {
  const location = useLocation();

  const sp = useMemo(() => new URLSearchParams(location.search || ""), [location.search]);
  const utmSource = sp.get("utm_source") || "";
  const utmMedium = sp.get("utm_medium") || "";
  const utmCampaign = sp.get("utm_campaign") || "";
  const utmTerm = sp.get("utm_term") || "";
  const utmContent = sp.get("utm_content") || "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState<string>(SERVICES[0]);
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [timezone, setTimezone] = useState("");
  const [message, setMessage] = useState("");

  const [contactMethod, setContactMethod] = useState<string>(CONTACT_METHODS[0]);
  const [company, setCompany] = useState("");
  const [city, setCity] = useState("");

  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string>("");

  // honeypot
  const [website, setWebsite] = useState("");

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTimezone(String(tz || ""));
    } catch {
      setTimezone("");
    }
  }, []);

  const canSubmit = useMemo(() => {
    const emailOk = email.trim() ? isValidEmail(email) : false;
    const phoneOk = phone.trim() ? isValidPhone(phone) : false;
    if (!name.trim()) return false;
    if (!emailOk && !phoneOk) return false;
    if (!preferredDate.trim()) return false;
    if (!preferredTime.trim()) return false;
    if (!message.trim()) return false;
    if (!consent) return false;
    return true;
  }, [name, email, phone, preferredDate, preferredTime, message, consent]);

  const submit = async () => {
    try {
      if (!canSubmit) return;
      setIsSubmitting(true);

      const emailTrimmed = email.trim();
      const phoneTrimmed = phone.trim();
      const emailOk = emailTrimmed ? isValidEmail(emailTrimmed) : false;
      const phoneOk = phoneTrimmed ? isValidPhone(phoneTrimmed) : false;
      if (emailTrimmed && !emailOk) {
        toast.error("Please enter a valid email address");
        return;
      }
      if (phoneTrimmed && !phoneOk) {
        toast.error("Please enter a valid phone number");
        return;
      }
      if (!emailOk && !phoneOk) {
        toast.error("Please provide a valid email or phone number");
        return;
      }

      const payload: any = {
        name: name.trim(),
        email: emailTrimmed,
        phone: normalizePhone(phoneTrimmed),
        service,
        preferredDate,
        preferredTime,
        timezone,
        message: message.trim(),
        contactMethod,
        company: company.trim(),
        city: city.trim(),
        source: "healthspire.org/book",
        utmSource,
        utmMedium,
        utmCampaign,
        utmTerm,
        utmContent,
        referrer: typeof document !== "undefined" ? document.referrer : "",
        website,
      };

      const r = await fetch(`${API_BASE}/api/appointments/public`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await r.json().catch(() => null);
      if (!r.ok) {
        toast.error(String(data?.error || "Failed to submit"));
        return;
      }

      setSuccessId(String(data?.id || ""));
      toast.success("Appointment request submitted");

      // reset
      setName("");
      setEmail("");
      setPhone("");
      setService(SERVICES[0]);
      setPreferredDate("");
      setPreferredTime("");
      setMessage("");
      setContactMethod(CONTACT_METHODS[0]);
      setCompany("");
      setCity("");
      setConsent(false);
      setWebsite("");
    } catch (e: any) {
      toast.error(String(e?.message || "Failed to submit"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 dark:bg-slate-950">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-6">
          <div className="text-2xl font-semibold tracking-tight text-foreground">Book an Appointment</div>
          <div className="text-sm text-muted-foreground mt-1 dark:text-slate-400">
            Submit your request and our team will contact you shortly.
          </div>
        </div>

        {successId ? (
          <Card className="border-emerald-200 bg-white dark:bg-slate-900 dark:border-emerald-900/50">
            <CardContent className="p-6">
              <div className="text-lg font-semibold">Thank you!</div>
              <div className="text-sm text-muted-foreground mt-1 dark:text-slate-400">
                Your request has been received.
              </div>
              <div className="mt-4 text-sm">
                Reference ID: <span className="font-medium">{successId}</span>
              </div>
              <div className="mt-6">
                <Button onClick={() => setSuccessId("")}>Submit another request</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="text-sm font-medium">Your Details</div>

                  <div className="space-y-1">
                    <Label>Full name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your full name" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Email</Label>
                      <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" type="email" />
                      {email.trim() && !isValidEmail(email) ? (
                        <div className="text-xs text-rose-600 dark:text-rose-400">Enter a valid email address.</div>
                      ) : null}
                    </div>
                    <div className="space-y-1">
                      <Label>Phone</Label>
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 0000" type="tel" />
                      {phone.trim() && !isValidPhone(phone) ? (
                        <div className="text-xs text-rose-600 dark:text-rose-400">Enter a valid phone number.</div>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Company (optional)</Label>
                      <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" />
                    </div>
                    <div className="space-y-1">
                      <Label>City (optional)</Label>
                      <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label>Preferred contact method</Label>
                    <Select value={contactMethod} onValueChange={setContactMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTACT_METHODS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="hidden">
                    <Label>Website</Label>
                    <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-sm font-medium">Appointment Details</div>

                  <div className="space-y-1">
                    <Label>Service</Label>
                    <Select value={service} onValueChange={setService}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Preferred date</Label>
                      <DatePicker value={preferredDate} onChange={setPreferredDate} placeholder="Pick date" />
                    </div>
                    <div className="space-y-1">
                      <Label>Preferred time</Label>
                      <Input type="time" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label>Timezone</Label>
                    <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Timezone" />
                  </div>

                  <div className="space-y-1">
                    <Label>Reason / Query</Label>
                    <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us what you need help with" className="min-h-[140px]" />
                  </div>

                  <div className="flex items-start gap-2 pt-1">
                    <Checkbox checked={consent} onCheckedChange={(v) => setConsent(Boolean(v))} />
                    <div className="text-xs text-muted-foreground leading-relaxed dark:text-slate-400">
                      I agree to be contacted regarding my request.
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button disabled={!canSubmit || isSubmitting} onClick={submit} className="w-full">
                      {isSubmitting ? "Submitting..." : "Submit request"}
                    </Button>
                    <div className="text-xs text-muted-foreground mt-2 text-center dark:text-slate-400">
                      By submitting, you confirm the information is correct.
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

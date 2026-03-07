import { useEffect, useRef, useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/sonner";
import { Globe, Mail, Phone } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { API_BASE } from "@/lib/api/base";


type ContactDoc = {
  _id: string;
  leadId?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  role?: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  location?: string;
  skype?: string;
  website?: string;
  avatar?: string;
  labels?: string[];
  isPrimaryContact?: boolean;
  gender?: "male" | "female" | "other" | "";
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  whatsapp?: string;
  youtube?: string;
  pinterest?: string;
  instagram?: string;
  github?: string;
  gitlab?: string;
  tumblr?: string;
  vimeo?: string;
  disableLogin?: boolean;
  canAccessEverything?: boolean;
};

export default function ContactProfile() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState<ContactDoc | null>(null);
  const [form, setForm] = useState<ContactDoc>({} as any);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/contacts/${id}`);
        const row = await res.json().catch(() => null);
        if (!res.ok) throw new Error(row?.error || "Failed to load contact");
        setContact(row);
        setForm({ ...row });
      } catch (e: any) {
        toast.error(String(e?.message || "Failed to load contact"));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const saveInfo = async () => {
    if (!contact?._id) return;
    try {
      const payload: any = { ...form };
      delete payload._id;
      delete payload.createdAt;
      delete payload.updatedAt;
      delete payload.__v;

      const res = await fetch(`${API_BASE}/api/contacts/${contact._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Save failed");
      setContact(json);
      setForm({ ...json });
      toast.success("Saved");
    } catch (e: any) {
      toast.error(String(e?.message || "Save failed"));
    }
  };

  const onChooseFile = () => fileRef.current?.click();
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !contact?._id) return;
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch(`${API_BASE}/api/contacts/${contact._id}/avatar`, { method: "POST", body: fd });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Upload failed");
      setContact(json);
      setForm((s) => ({ ...s, avatar: json.avatar }));
      toast.success("Photo updated");
    } catch (e: any) {
      toast.error(String(e?.message || "Upload failed"));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!contact) return <div className="p-6">Contact not found</div>;

  const displayName =
    `${form.firstName || ""}${form.lastName ? ` ${form.lastName}` : ""}`.trim() || form.name || "Contact";

  return (
    <div className="space-y-4 animate-fade-in p-1 sm:p-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton to="/crm/leads" />
          <div className="text-sm text-muted-foreground">
            <NavLink to="/crm/leads" className="text-primary">
              Leads
            </NavLink>{" "}
            / Contact
          </div>
        </div>
      </div>

      <Card className="p-0 overflow-hidden rounded-xl border">
        <div className="bg-primary text-primary-foreground p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                {form.avatar ? (
                  <img
                    src={`${API_BASE}${form.avatar}`}
                    alt="avatar"
                    className="w-16 h-16 rounded-full object-cover border border-white/30"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-white/20" />
                )}
                <button
                  type="button"
                  onClick={onChooseFile}
                  className="absolute -right-2 -bottom-2 text-xs px-2 py-1 rounded-full bg-white text-primary shadow"
                >
                  Upload
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
              </div>
              <div>
                <div className="text-xl font-semibold">{displayName}</div>
                <div className="mt-1 space-y-1 text-xs opacity-95">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" /> {form.email || "-"}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" /> {form.phone || "-"}
                  </div>
                </div>
              </div>
            </div>
            <div className="text-xs space-y-1 text-right">
              <div>{form.location || "-"}</div>
              <div className="flex items-center justify-end gap-2">
                <Globe className="w-4 h-4" /> {form.website || "-"}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4">
          <Tabs defaultValue="cp-general">
            <TabsList className="bg-muted/40">
              <TabsTrigger value="cp-general">General Info</TabsTrigger>
              <TabsTrigger value="cp-contact">Contact info</TabsTrigger>
              <TabsTrigger value="cp-social">Social Links</TabsTrigger>
            </TabsList>

            <TabsContent value="cp-general">
              <div className="space-y-4 py-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>First name</Label>
                    <Input value={form.firstName || ""} onChange={(e) => setForm((s) => ({ ...s, firstName: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Last name</Label>
                    <Input value={form.lastName || ""} onChange={(e) => setForm((s) => ({ ...s, lastName: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input value={form.email || ""} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Phone</Label>
                    <Input value={form.phone || ""} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Skype</Label>
                    <Input value={form.skype || ""} onChange={(e) => setForm((s) => ({ ...s, skype: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Job Title</Label>
                    <Input value={form.jobTitle || ""} onChange={(e) => setForm((s) => ({ ...s, jobTitle: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Gender</Label>
                    <RadioGroup
                      value={form.gender || ""}
                      onValueChange={(v) => setForm((s) => ({ ...s, gender: v as any }))}
                      className="flex items-center gap-6"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem id="cp-m" value="male" />
                        <Label htmlFor="cp-m">Male</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem id="cp-f" value="female" />
                        <Label htmlFor="cp-f">Female</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem id="cp-o" value="other" />
                        <Label htmlFor="cp-o">Other</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </div>
              <div className="flex justify-end pb-4 pr-2">
                <Button onClick={saveInfo}>Save</Button>
              </div>
            </TabsContent>

            <TabsContent value="cp-contact">
              <div className="space-y-4 py-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Role</Label>
                    <Input value={form.role || ""} onChange={(e) => setForm((s) => ({ ...s, role: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Location</Label>
                    <Input value={form.location || ""} onChange={(e) => setForm((s) => ({ ...s, location: e.target.value }))} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Website</Label>
                    <Input value={form.website || ""} onChange={(e) => setForm((s) => ({ ...s, website: e.target.value }))} />
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Checkbox
                      checked={!!form.isPrimaryContact}
                      onCheckedChange={(v) => setForm((s) => ({ ...s, isPrimaryContact: Boolean(v) }))}
                      id="cp-primary"
                    />
                    <Label htmlFor="cp-primary">Primary contact</Label>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Checkbox
                      checked={!!form.disableLogin}
                      onCheckedChange={(v) => setForm((s) => ({ ...s, disableLogin: Boolean(v) }))}
                      id="cp-disable-login"
                    />
                    <Label htmlFor="cp-disable-login">Disable login</Label>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Checkbox
                      checked={!!form.canAccessEverything}
                      onCheckedChange={(v) => setForm((s) => ({ ...s, canAccessEverything: Boolean(v) }))}
                      id="cp-all"
                    />
                    <Label htmlFor="cp-all">Can access everything</Label>
                  </div>
                </div>
              </div>
              <div className="flex justify-end pb-4 pr-2">
                <Button onClick={saveInfo}>Save</Button>
              </div>
            </TabsContent>

            <TabsContent value="cp-social">
              <div className="space-y-4 py-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Facebook</Label>
                    <Input value={form.facebook || ""} onChange={(e) => setForm((s) => ({ ...s, facebook: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Twitter</Label>
                    <Input value={form.twitter || ""} onChange={(e) => setForm((s) => ({ ...s, twitter: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>LinkedIn</Label>
                    <Input value={form.linkedin || ""} onChange={(e) => setForm((s) => ({ ...s, linkedin: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>WhatsApp</Label>
                    <Input value={form.whatsapp || ""} onChange={(e) => setForm((s) => ({ ...s, whatsapp: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>YouTube</Label>
                    <Input value={form.youtube || ""} onChange={(e) => setForm((s) => ({ ...s, youtube: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Pinterest</Label>
                    <Input value={form.pinterest || ""} onChange={(e) => setForm((s) => ({ ...s, pinterest: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Instagram</Label>
                    <Input value={form.instagram || ""} onChange={(e) => setForm((s) => ({ ...s, instagram: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Github</Label>
                    <Input value={form.github || ""} onChange={(e) => setForm((s) => ({ ...s, github: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Gitlab</Label>
                    <Input value={form.gitlab || ""} onChange={(e) => setForm((s) => ({ ...s, gitlab: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Tumblr</Label>
                    <Input value={form.tumblr || ""} onChange={(e) => setForm((s) => ({ ...s, tumblr: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Vimeo</Label>
                    <Input value={form.vimeo || ""} onChange={(e) => setForm((s) => ({ ...s, vimeo: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Notes</Label>
                  <Textarea value={(form as any).note || ""} onChange={(e) => setForm((s: any) => ({ ...s, note: e.target.value }))} className="min-h-[120px]" />
                </div>
              </div>
              <div className="flex justify-end pb-4 pr-2">
                <Button onClick={saveInfo}>Save</Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useParams, NavLink } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/sonner";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { COUNTRIES } from "@/data/countries";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PrimaryContact() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<any | null>(null);
  const [form, setForm] = useState<any>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/clients/${encodeURIComponent(String(id))}`, { headers: getAuthHeaders() });
        if (!res.ok) {
          const e = await res.json().catch(() => null);
          toast.error(e?.error || "Failed to load contact");
          return;
        }
        const row = await res.json().catch(() => null);
        if (row) {
          setClient(row);
          setForm({ ...row });
        }
      } catch (e: any) {
        toast.error(String(e?.message || "Failed to load contact"));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const saveInfo = async () => {
    if (!client) return;
    try {
      const payload: any = { ...form };
      delete payload._id; delete payload.createdAt; delete payload.updatedAt; delete payload.__v;
      const res = await fetch(`${API_BASE}/api/clients/${client._id}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const e = await res.json().catch(()=>null); toast.error(e?.error || "Save failed"); return; }
      const updated = await res.json();
      setClient(updated);
      setForm(updated);
      toast.success("Saved");
    } catch {}
  };

  const onChooseFile = () => fileRef.current?.click();
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !client) return;
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch(`${API_BASE}/api/clients/${client._id}/avatar`, { method: "POST", headers: getAuthHeaders(), body: fd });
      if (!res.ok) { const err = await res.json().catch(()=>null); toast.error(err?.error || "Upload failed"); return; }
      const updated = await res.json();
      setClient(updated);
      setForm((s:any)=> ({ ...s, avatar: updated.avatar }));
      toast.success("Photo updated");
    } catch (e:any) {
      toast.error(String(e?.message || "Upload failed"));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!client) return <div className="p-6">Client not found</div>;

  const displayName = client.company || client.person || "Client";

  return (
    <div className="space-y-4 animate-fade-in p-1 sm:p-2">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          <NavLink to="/clients" className="text-primary">Clients</NavLink> / {displayName} / Primary contact
        </div>
        <NavLink to={`/clients/${client._id}`} className="text-primary text-sm">Back to Client</NavLink>
      </div>

      {/* Header */}
      <Card className="p-0 overflow-hidden rounded-xl border">
        <div className="bg-primary text-primary-foreground p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                {form.avatar ? (
                  <img
                    src={`${API_BASE}${form.avatar}?t=${client?.updatedAt || Date.now()}`}
                    alt="avatar"
                    className="w-16 h-16 rounded-full object-cover border border-white/30"
                    onError={(e) => {
                      console.error("Avatar failed to load:", form.avatar);
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="text-2xl">{(form.firstName || form.person || "?").charAt(0).toUpperCase()}</span>
                  </div>
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
                <div className="text-xl font-semibold">
                  {(form.firstName||form.person||"") + (form.lastName?` ${form.lastName}`:"") || displayName}
                </div>
                <div className="text-xs opacity-90">{form.email || client?.email || "-"}</div>
              </div>
            </div>
            <div className="text-xs">Company name: <span className="font-semibold">{displayName}</span></div>
          </div>
        </div>

        <div className="p-4">
          <Tabs defaultValue="pc-general">
            <TabsList className="bg-muted/40">
              <TabsTrigger value="pc-general">General Info</TabsTrigger>
              <TabsTrigger value="pc-company">Company</TabsTrigger>
              <TabsTrigger value="pc-social">Social Links</TabsTrigger>
              <TabsTrigger value="pc-account">Account settings</TabsTrigger>
              <TabsTrigger value="pc-permissions">Permissions</TabsTrigger>
            </TabsList>

            {/* General Info */}
            <TabsContent value="pc-general">
              <div className="space-y-4 py-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>First name</Label><Input value={form.firstName||""} onChange={(e)=>setForm((s:any)=>({...s,firstName:e.target.value}))} /></div>
                  <div className="space-y-1"><Label>Last name</Label><Input value={form.lastName||""} onChange={(e)=>setForm((s:any)=>({...s,lastName:e.target.value}))} /></div>
                  <div className="space-y-1"><Label>Phone</Label><Input value={form.phone||""} onChange={(e)=>setForm((s:any)=>({...s,phone:e.target.value}))} /></div>
                  <div className="space-y-1"><Label>Skype</Label><Input value={form.skype||""} onChange={(e)=>setForm((s:any)=>({...s,skype:e.target.value}))} /></div>
                  <div className="space-y-1"><Label>Job Title</Label><Input value={form.jobTitle||""} onChange={(e)=>setForm((s:any)=>({...s,jobTitle:e.target.value}))} /></div>
                  <div className="space-y-1">
                    <Label>Gender</Label>
                    <RadioGroup value={form.gender||""} onValueChange={(v)=>setForm((s:any)=>({...s,gender:v}))} className="flex items-center gap-6">
                      <div className="flex items-center gap-2"><RadioGroupItem id="pc-m" value="male" /><Label htmlFor="pc-m">Male</Label></div>
                      <div className="flex items-center gap-2"><RadioGroupItem id="pc-f" value="female" /><Label htmlFor="pc-f">Female</Label></div>
                      <div className="flex items-center gap-2"><RadioGroupItem id="pc-o" value="other" /><Label htmlFor="pc-o">Other</Label></div>
                    </RadioGroup>
                  </div>
                </div>
              </div>
              <div className="flex justify-end pb-4 pr-2"><Button onClick={saveInfo}>Save</Button></div>
            </TabsContent>

            {/* Company */}
            <TabsContent value="pc-company">
              <div className="space-y-4 py-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Type</Label>
                    <RadioGroup value={form.type||"org"} onValueChange={(v)=>setForm((s:any)=>({...s,type:v}))} className="flex items-center gap-6">
                      <div className="flex items-center gap-2"><RadioGroupItem id="pc-org" value="org" /><Label htmlFor="pc-org">Organization</Label></div>
                      <div className="flex items-center gap-2"><RadioGroupItem id="pc-person" value="person" /><Label htmlFor="pc-person">Person</Label></div>
                    </RadioGroup>
                  </div>
                  <div className="space-y-1"><Label>Company name</Label><Input value={form.company||""} onChange={(e)=>setForm((s:any)=>({...s,company:e.target.value}))} /></div>
                  <div className="space-y-1"><Label>Owner</Label><Input value={form.owner||""} onChange={(e)=>setForm((s:any)=>({...s,owner:e.target.value}))} /></div>
                  <div className="space-y-1 sm:col-span-2"><Label>Address</Label><Textarea value={form.address||""} onChange={(e)=>setForm((s:any)=>({...s,address:e.target.value}))} /></div>
                  <div className="space-y-1"><Label>City</Label><Input value={form.city||""} onChange={(e)=>setForm((s:any)=>({...s,city:e.target.value}))} /></div>
                  <div className="space-y-1"><Label>State</Label><Input value={form.state||""} onChange={(e)=>setForm((s:any)=>({...s,state:e.target.value}))} /></div>
                  <div className="space-y-1"><Label>Zip</Label><Input value={form.zip||""} onChange={(e)=>setForm((s:any)=>({...s,zip:e.target.value}))} /></div>
                  <div className="space-y-1"><Label>Country</Label>
                    <Select value={form.country||""} onValueChange={(value)=>setForm((s:any)=>({...s,country:value}))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a country" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label>Phone</Label><Input value={form.phone||""} onChange={(e)=>setForm((s:any)=>({...s,phone:e.target.value}))} /></div>
                  <div className="space-y-1"><Label>Website</Label><Input value={form.website||""} onChange={(e)=>setForm((s:any)=>({...s,website:e.target.value}))} /></div>
                  <div className="space-y-1"><Label>VAT Number</Label><Input value={form.vatNumber||""} onChange={(e)=>setForm((s:any)=>({...s,vatNumber:e.target.value}))} /></div>
                  <div className="space-y-1"><Label>GST Number</Label><Input value={form.gstNumber||""} onChange={(e)=>setForm((s:any)=>({...s,gstNumber:e.target.value}))} /></div>
                  <div className="space-y-1"><Label>Client groups</Label><Input value={(form.clientGroups||[]).join(', ')} onChange={(e)=>setForm((s:any)=>({...s,clientGroups:e.target.value.split(',').map((x)=>x.trim()).filter(Boolean)}))} /></div>
                  <div className="space-y-1"><Label>Currency</Label><Input value={form.currency||""} onChange={(e)=>setForm((s:any)=>({...s,currency:e.target.value}))} /></div>
                  <div className="space-y-1"><Label>Currency Symbol</Label><Input value={form.currencySymbol||""} onChange={(e)=>setForm((s:any)=>({...s,currencySymbol:e.target.value}))} /></div>
                  <div className="space-y-1"><Label>Labels</Label><Input value={(form.labels||[]).join(', ')} onChange={(e)=>setForm((s:any)=>({...s,labels:e.target.value.split(',').map((x)=>x.trim()).filter(Boolean)}))} /></div>
                  <div className="flex items-center gap-2 pt-2"><Checkbox checked={!!form.disableOnlinePayment} onCheckedChange={(v)=>setForm((s:any)=>({...s,disableOnlinePayment:Boolean(v)}))} id="pc-dop" /><Label htmlFor="pc-dop">Disable online payments</Label></div>
                </div>
              </div>
              <div className="flex justify-end pb-4 pr-2"><Button onClick={saveInfo}>Save</Button></div>
            </TabsContent>

            {/* Social Links */}
            <TabsContent value="pc-social">
              <div className="space-y-4 py-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Facebook</Label><Input value={form.facebook||""} onChange={(e)=>setForm((s:any)=>({...s,facebook:e.target.value}))} /></div>
                  <div className="space-y-1"><Label>Twitter</Label><Input value={form.twitter||""} onChange={(e)=>setForm((s:any)=>({...s,twitter:e.target.value}))} /></div>
                  <div className="space-y-1"><Label>LinkedIn</Label><Input value={form.linkedin||""} onChange={(e)=>setForm((s:any)=>({...s,linkedin:e.target.value}))} /></div>
                  <div className="space-y-1"><Label>WhatsApp</Label><Input value={form.whatsapp||""} onChange={(e)=>setForm((s:any)=>({...s,whatsapp:e.target.value}))} /></div>
                  <div className="space-y-1"><Label>YouTube</Label><Input value={form.youtube||""} onChange={(e)=>setForm((s:any)=>({...s,youtube:e.target.value}))} /></div>
                  <div className="space-y-1"><Label>Pinterest</Label><Input value={form.pinterest||""} onChange={(e)=>setForm((s:any)=>({...s,pinterest:e.target.value}))} /></div>
                  <div className="space-y-1"><Label>Instagram</Label><Input value={form.instagram||""} onChange={(e)=>setForm((s:any)=>({...s,instagram:e.target.value}))} /></div>
                  <div className="space-y-1"><Label>Github</Label><Input value={form.github||""} onChange={(e)=>setForm((s:any)=>({...s,github:e.target.value}))} /></div>
                  <div className="space-y-1"><Label>Gitlab</Label><Input value={form.gitlab||""} onChange={(e)=>setForm((s:any)=>({...s,gitlab:e.target.value}))} /></div>
                  <div className="space-y-1"><Label>Tumblr</Label><Input value={form.tumblr||""} onChange={(e)=>setForm((s:any)=>({...s,tumblr:e.target.value}))} /></div>
                  <div className="space-y-1"><Label>Vimeo</Label><Input value={form.vimeo||""} onChange={(e)=>setForm((s:any)=>({...s,vimeo:e.target.value}))} /></div>
                </div>
              </div>
              <div className="flex justify-end pb-4 pr-2"><Button onClick={saveInfo}>Save</Button></div>
            </TabsContent>

            {/* Account settings */}
            <TabsContent value="pc-account">
              <div className="space-y-4 py-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Email</Label><Input value={form.email||""} onChange={(e)=>setForm((s:any)=>({...s,email:e.target.value}))} /></div>
                  <div className="space-y-1"><Label>Password</Label><Input type="password" placeholder="Password" disabled /></div>
                  <div className="space-y-1"><Label>Retype password</Label><Input type="password" placeholder="Retype password" disabled /></div>
                  <div className="flex items-center gap-2 pt-2"><Checkbox checked={!!form.disableLogin} onCheckedChange={(v)=>setForm((s:any)=>({...s,disableLogin:Boolean(v)}))} id="pc-dl" /><Label htmlFor="pc-dl">Disable login</Label></div>
                </div>
              </div>
              <div className="flex justify-end pb-4 pr-2"><Button onClick={saveInfo}>Save</Button></div>
            </TabsContent>

            {/* Permissions */}
            <TabsContent value="pc-permissions">
              <div className="space-y-4 py-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2"><Checkbox checked={!!form.isPrimaryContact} onCheckedChange={(v)=>setForm((s:any)=>({...s,isPrimaryContact:Boolean(v)}))} id="pc-prim" /><Label htmlFor="pc-prim">Primary contact</Label></div>
                  <div className="flex items-center gap-2"><Checkbox checked={!!form.canAccessEverything} onCheckedChange={(v)=>setForm((s:any)=>({...s,canAccessEverything:Boolean(v)}))} id="pc-all" /><Label htmlFor="pc-all">Can access everything</Label></div>
                </div>
              </div>
              <div className="flex justify-end pb-4 pr-2"><Button onClick={saveInfo}>Save</Button></div>
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </div>
  );
}

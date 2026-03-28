import { useNavigate, useParams, Link } from "react-router-dom";
import { useSettings } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useMemo, useRef, useState } from "react";
import { Upload, X, Building2, Globe, Mail, Phone, MapPin, Clock, Calendar, Check, RefreshCw, Send, DollarSign, Target } from "lucide-react";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const sections = [
  { key: "general", label: "General" },
  { key: "localization", label: "Localization" },
  { key: "email", label: "Email" },
  { key: "templates", label: "Email templates" },
  { key: "modules", label: "Modules" },
  { key: "left-menu", label: "Left menu" },
  { key: "notifications", label: "Notifications" },
  { key: "integration", label: "Integration" },
  { key: "cron", label: "Cron Job" },
  { key: "hr", label: "HR Settings" },
  { key: "terms", label: "Terms" },
  { key: "updates", label: "Updates" },
] as const;

type SectionKey = typeof sections[number]["key"];

export default function SettingsPage() {
  const { section } = useParams();
  const active = (section as SectionKey) || "general";
  const { settings, saveSection, exportJSON, importJSON, resetAll, resetSection } = useSettings();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [newCurCode, setNewCurCode] = useState("");
  const [newCurSymbol, setNewCurSymbol] = useState("");
  const [newCurRate, setNewCurRate] = useState<string>("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast.error("Please enter a recipient email address");
      return;
    }
    setSendingTest(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings/test-email`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ to: testEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Test email dispatched successfully");
      } else {
        throw new Error(data.error || "Failed to send test email");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSendingTest(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);

      const res = await fetch(`${API_BASE}/api/settings/logo`, {
        method: "POST",
        headers: { ...getAuthHeaders() },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        saveSection("general", { ...settings.general, logoUrl: data.logoUrl });
        toast.success("Logo uploaded successfully");
      } else {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const currencies = useMemo(() => {
    const list = Array.isArray((settings as any)?.localization?.currencies)
      ? ((settings as any).localization.currencies as any[])
      : [];
    return list
      .map((c) => ({
        code: String(c.code || "").toUpperCase().trim(),
        symbol: String(c.symbol || c.code || "").toUpperCase().trim(),
        rate: Number(c.rate) || 0,
      }))
      .filter((c) => c.code);
  }, [settings]);

  return (
    <div className="space-y-6">
      <Tabs value={active} className="w-full">
        <TabsList className="flex flex-wrap lg:grid lg:grid-cols-11 w-full h-auto min-h-10 gap-1">
          <TabsTrigger value="general" asChild>
            <Link to="/settings/general">General</Link>
          </TabsTrigger>
          <TabsTrigger value="localization" asChild>
            <Link to="/settings/localization">Localization</Link>
          </TabsTrigger>
          <TabsTrigger value="theme" asChild>
            <Link to="/settings/theme">Theme</Link>
          </TabsTrigger>
          <TabsTrigger value="email" asChild>
            <Link to="/settings/email">Email</Link>
          </TabsTrigger>
          <TabsTrigger value="modules" asChild>
            <Link to="/settings/modules">Modules</Link>
          </TabsTrigger>
          <TabsTrigger value="left-menu" asChild>
            <Link to="/settings/left-menu">Menu</Link>
          </TabsTrigger>
          <TabsTrigger value="notifications" asChild>
            <Link to="/settings/notifications">Notifications</Link>
          </TabsTrigger>
          <TabsTrigger value="integration" asChild>
            <Link to="/settings/integration">Integration</Link>
          </TabsTrigger>
          <TabsTrigger value="system" asChild>
            <Link to="/settings/system">System</Link>
          </TabsTrigger>
          <TabsTrigger value="terms" asChild>
            <Link to="/settings/terms">Terms</Link>
          </TabsTrigger>
          <TabsTrigger value="updates" asChild>
            <Link to="/settings/updates">Updates</Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card className="p-8 sm:p-10 space-y-10 rounded-[2.5rem] border-slate-200 shadow-2xl bg-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Building2 className="w-32 h-32" />
            </div>
            
            <div className="relative space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Corporate Profile</h2>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mt-1">Tech Entity Identity Parameters</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Logo Section */}
                <div className="lg:col-span-4 space-y-6">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Corporate Branding (Logo)</Label>
                  <div className="relative group aspect-square rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50/50 overflow-hidden flex flex-col items-center justify-center transition-all hover:border-indigo-300 hover:bg-indigo-50/30">
                    {settings.general.logoUrl ? (
                      <>
                        <img 
                          src={settings.general.logoUrl.startsWith('http') ? settings.general.logoUrl : `${API_BASE}${settings.general.logoUrl}`} 
                          alt="Logo" 
                          className="w-full h-full object-contain p-8"
                        />
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3">
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="rounded-xl font-bold text-[10px] tracking-widest uppercase h-10 px-6"
                            onClick={() => logoInputRef.current?.click()}
                            disabled={uploadingLogo}
                          >
                            {uploadingLogo ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" /> : <Upload className="w-3.5 h-3.5 mr-2" />}
                            Update Logo
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-white hover:text-rose-400 hover:bg-transparent font-bold text-[10px] tracking-widest uppercase"
                            onClick={() => saveSection("general", { ...settings.general, logoUrl: "" })}
                          >
                            <X className="w-3.5 h-3.5 mr-2" /> Remove
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-4 text-center p-6">
                        <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                          <Upload className="w-8 h-8 text-slate-300" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">No Logo Defined</p>
                          <p className="text-[10px] text-slate-400 font-medium">Import corporate identity from local device</p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2 rounded-xl font-bold text-[10px] tracking-widest uppercase border-slate-200"
                          onClick={() => logoInputRef.current?.click()}
                          disabled={uploadingLogo}
                        >
                          {uploadingLogo ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" /> : "Select File"}
                        </Button>
                      </div>
                    )}
                    <input 
                      type="file" 
                      ref={logoInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleLogoUpload} 
                    />
                  </div>
                </div>

                <div className="lg:col-span-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Company Name</Label>
                      <div className="relative">
                        <Input value={settings.general.companyName} onChange={(e)=>saveSection('general', { ...settings.general, companyName: e.target.value })} className="h-12 pl-11 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-indigo-500 font-bold" />
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Corporate Domain</Label>
                      <div className="relative">
                        <Input value={settings.general.domain || ''} onChange={(e)=>saveSection('general', { ...settings.general, domain: e.target.value })} className="h-12 pl-11 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-indigo-500 font-bold font-mono" />
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Corporate Email</Label>
                      <div className="relative">
                        <Input type="email" value={settings.general.companyEmail || ''} onChange={(e)=>saveSection('general', { ...settings.general, companyEmail: e.target.value })} className="h-12 pl-11 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-indigo-500 font-bold" />
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Primary Phone</Label>
                      <div className="relative">
                        <Input value={settings.general.companyPhone || ''} onChange={(e)=>saveSection('general', { ...settings.general, companyPhone: e.target.value })} className="h-12 pl-11 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-indigo-500 font-bold tabular-nums" />
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1 text-center block">Headquarters Address</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <Input placeholder="Address Line 1" value={settings.general.addressLine1 || ''} onChange={(e)=>saveSection('general', { ...settings.general, addressLine1: e.target.value })} className="h-12 rounded-xl border-slate-200 bg-slate-50/50" />
                      </div>
                      <Input placeholder="City" value={settings.general.city || ''} onChange={(e)=>saveSection('general', { ...settings.general, city: e.target.value })} className="h-12 rounded-xl border-slate-200 bg-slate-50/50" />
                      <Input placeholder="State/Province" value={settings.general.state || ''} onChange={(e)=>saveSection('general', { ...settings.general, state: e.target.value })} className="h-12 rounded-xl border-slate-200 bg-slate-50/50" />
                      <Input placeholder="ZIP/Postal" value={settings.general.zip || ''} onChange={(e)=>saveSection('general', { ...settings.general, zip: e.target.value })} className="h-12 rounded-xl border-slate-200 bg-slate-50/50" />
                      <Input placeholder="Country" value={settings.general.country || ''} onChange={(e)=>saveSection('general', { ...settings.general, country: e.target.value })} className="h-12 rounded-xl border-slate-200 bg-slate-50/50" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">Corporate Branding Visibility</p>
                      <p className="text-[10px] text-slate-400 font-medium">Hide default Mind Spire branding across the system</p>
                    </div>
                    <Switch checked={!!settings.general.brandingEnabled} onCheckedChange={(v)=>saveSection('general', { ...settings.general, brandingEnabled: Boolean(v) })} />
                  </div>
                </div>
                <div className="flex items-center gap-4 justify-end">
                  <Button 
                    variant="outline" 
                    className="h-12 px-8 rounded-xl font-bold uppercase text-[10px] tracking-widest border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all"
                    onClick={() => { resetSection('general'); toast.success('General settings reset'); }}
                  >
                    Reset Protocol
                  </Button>
                  <Button 
                    className="h-12 px-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95"
                    onClick={() => toast.success('General settings saved')}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="terms">
          <Card className="p-6 space-y-4">
            <div className="text-lg font-semibold">Invoice & Estimate Terms</div>
            <div className="text-sm text-muted-foreground">
              These terms will appear on the printed invoice/estimate.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Invoice terms</Label>
                <Textarea
                  className="min-h-[180px]"
                  value={(settings as any)?.documents?.invoiceTerms || ""}
                  onChange={(e) =>
                    saveSection("documents" as any, {
                      ...(settings as any).documents,
                      invoiceTerms: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Estimate terms</Label>
                <Textarea
                  className="min-h-[180px]"
                  value={(settings as any)?.documents?.estimateTerms || ""}
                  onChange={(e) =>
                    saveSection("documents" as any, {
                      ...(settings as any).documents,
                      estimateTerms: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={() => toast.success("Terms saved")}>Save changes</Button>
              <Button
                variant="outline"
                onClick={() => {
                  resetSection("documents" as any);
                  toast.success("Terms reset");
                }}
              >
                Reset section
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="theme">
          <Card className="p-6 space-y-4">
            <div className="text-lg font-semibold">Theme</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Primary color</Label>
                <Input type="color" value={settings.general.primaryColor} onChange={(e)=>saveSection('general', { ...settings.general, primaryColor: e.target.value })} />
              </div>
              <div>
                <Label>Accent color</Label>
                <Input type="color" value={settings.general.accentColor || ''} onChange={(e)=>saveSection('general', { ...settings.general, accentColor: e.target.value })} />
              </div>
              <div>
                <Label>Secondary color</Label>
                <Input type="color" value={settings.general.secondaryColor || ''} onChange={(e)=>saveSection('general', { ...settings.general, secondaryColor: e.target.value })} />
              </div>
              <div>
                <Label>Font family</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={settings.general.fontFamily || 'Inter'} 
                  onChange={(e)=>saveSection('general', { ...settings.general, fontFamily: e.target.value })}
                >
                  <option value="Inter">Inter</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Open Sans">Open Sans</option>
                  <option value="Lato">Lato</option>
                  <option value="Montserrat">Montserrat</option>
                  <option value="Poppins">Poppins</option>
                  <option value="system-ui">System UI</option>
                </select>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">Dark mode</div>
                  <div className="text-xs text-muted-foreground">Use dark theme across the app</div>
                </div>
                <Switch checked={!!settings.general.darkMode} onCheckedChange={(v)=>saveSection('general', { ...settings.general, darkMode: Boolean(v) })} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">Compact mode</div>
                  <div className="text-xs text-muted-foreground">Reduce spacing and padding</div>
                </div>
                <Switch checked={!!settings.general.compactMode} onCheckedChange={(v)=>saveSection('general', { ...settings.general, compactMode: Boolean(v) })} />
              </div>
              <div className="col-span-full">
                <div className="text-xs text-muted-foreground">Preview colors</div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-8 w-20 rounded" style={{ backgroundColor: settings.general.primaryColor }} />
                  <div className="h-8 w-20 rounded" style={{ backgroundColor: settings.general.accentColor || '#0891b2' }} />
                  <div className="h-8 w-20 rounded" style={{ backgroundColor: settings.general.secondaryColor || '#0ea5e9' }} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={()=>toast.success('Theme settings saved')}>Save changes</Button>
              <Button variant="outline" onClick={()=>{ resetSection('general'); toast.success('Theme settings reset'); }}>Reset section</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card className="p-6 space-y-4">
            <div className="text-lg font-semibold">System</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">Maintenance mode</div>
                  <div className="text-xs text-muted-foreground">Disable access for non-admins</div>
                </div>
                <Switch checked={!!settings.system?.maintenanceMode} onCheckedChange={(v)=>saveSection('system', { ...(settings.system||{}), maintenanceMode: Boolean(v) } as any)} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">Debug mode</div>
                  <div className="text-xs text-muted-foreground">Show detailed error messages</div>
                </div>
                <Switch checked={!!settings.system?.debugMode} onCheckedChange={(v)=>saveSection('system', { ...(settings.system||{}), debugMode: Boolean(v) } as any)} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">Auto backup</div>
                  <div className="text-xs text-muted-foreground">Daily database backups</div>
                </div>
                <Switch checked={!!settings.system?.autoBackup} onCheckedChange={(v)=>saveSection('system', { ...(settings.system||{}), autoBackup: Boolean(v) } as any)} />
              </div>
              <div>
                <Label>Session timeout (minutes)</Label>
                <Input type="number" value={(settings.system?.sessionTimeout ?? 120) as any} onChange={(e)=>saveSection('system', { ...(settings.system||{}), sessionTimeout: e.target.value? Number(e.target.value) : 120 } as any)} />
              </div>
              <div>
                <Label>Max upload size (MB)</Label>
                <Input type="number" value={(settings.system?.maxUploadSize ?? 10) as any} onChange={(e)=>saveSection('system', { ...(settings.system||{}), maxUploadSize: e.target.value? Number(e.target.value) : 10 } as any)} />
              </div>
              <div>
                <Label>Backup retention (days)</Label>
                <Input type="number" value={(settings.system?.backupRetention ?? 30) as any} onChange={(e)=>saveSection('system', { ...(settings.system||{}), backupRetention: e.target.value? Number(e.target.value) : 30 } as any)} />
              </div>
              <div className="col-span-full">
                <Label>Maintenance message</Label>
                <Textarea value={settings.system?.maintenanceMessage || ''} onChange={(e)=>saveSection('system', { ...(settings.system||{}), maintenanceMessage: e.target.value } as any)} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={()=>toast.success('System settings saved')}>Save changes</Button>
              <Button variant="outline" onClick={()=>toast.success('Backup initiated (simulated)')}>Backup now</Button>
              <Button variant="outline" onClick={()=>{ resetSection('system'); toast.success('System settings reset'); }}>Reset section</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="localization">
          <Card className="p-6 space-y-4">
            <div className="text-lg font-semibold">Localization</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Language</Label>
                <Input value={settings.localization.language} onChange={(e)=>saveSection('localization', { ...settings.localization, language: e.target.value })} />
              </div>
              <div>
                <Label>Display currency</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={settings.localization.currency}
                  onChange={(e)=>saveSection('localization', { ...settings.localization, currency: e.target.value })}
                >
                  {(currencies.length ? currencies : [{ code: "PKR", symbol: "PKR", rate: 1 }]).map((c) => (
                    <option key={c.code} value={c.code}>{c.code}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Base currency</Label>
                <Input
                  value={(settings.localization as any).baseCurrency || "PKR"}
                  onChange={(e)=>saveSection('localization', { ...(settings.localization as any), baseCurrency: e.target.value } as any)}
                />
              </div>
              <div>
                <Label>Number format</Label>
                <Input value={settings.localization.numberFormat} onChange={(e)=>saveSection('localization', { ...settings.localization, numberFormat: e.target.value })} />
              </div>
              <div>
                <Label>Timezone</Label>
                <Input value={settings.localization.timezone} onChange={(e)=>saveSection('localization', { ...settings.localization, timezone: e.target.value })} />
              </div>
              <div>
                <Label>First day of week (0-6)</Label>
                <Input type="number" value={(settings.localization.firstDayOfWeek ?? 1) as any} onChange={(e)=>{
                  const v = Number(e.target.value);
                  saveSection('localization', { ...settings.localization, firstDayOfWeek: isNaN(v) ? 1 : v });
                }} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">Week starts on Monday</div>
                  <div className="text-xs text-muted-foreground">Use ISO week</div>
                </div>
                <Switch checked={!!settings.localization.weekStartsOnMonday} onCheckedChange={(v)=>saveSection('localization', { ...settings.localization, weekStartsOnMonday: Boolean(v) })} />
              </div>
              <div>
                <Label>Decimal separator</Label>
                <Input value={settings.localization.decimalSeparator || '.'} onChange={(e)=>saveSection('localization', { ...settings.localization, decimalSeparator: e.target.value })} />
              </div>
              <div>
                <Label>Thousand separator</Label>
                <Input value={settings.localization.thousandSeparator || ','} onChange={(e)=>saveSection('localization', { ...settings.localization, thousandSeparator: e.target.value })} />
              </div>
              <div>
                <Label>Locale</Label>
                <Input value={settings.localization.locale || ''} onChange={(e)=>saveSection('localization', { ...settings.localization, locale: e.target.value })} />
              </div>
              <div className="col-span-full text-xs text-muted-foreground">Example: 12{settings.localization.thousandSeparator || ','}345{settings.localization.decimalSeparator || '.'}67</div>
            </div>

            <div className="rounded-md border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Multi-currency</div>
                  <div className="text-xs text-muted-foreground">Maintain currencies and exchange rates relative to base currency.</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <Label>Code</Label>
                  <Input value={newCurCode} onChange={(e)=>setNewCurCode(e.target.value.toUpperCase())} placeholder="USD" />
                </div>
                <div>
                  <Label>Symbol</Label>
                  <Input value={newCurSymbol} onChange={(e)=>setNewCurSymbol(e.target.value.toUpperCase())} placeholder="USD" />
                </div>
                <div>
                  <Label>Rate</Label>
                  <Input value={newCurRate} onChange={(e)=>setNewCurRate(e.target.value)} placeholder="280" />
                </div>
                <div className="flex items-end">
                  <Button
                    className="w-full"
                    onClick={() => {
                      const code = String(newCurCode || "").toUpperCase().trim();
                      if (!code) return;
                      const rate = Number(newCurRate) || 0;
                      const symbol = String(newCurSymbol || code).toUpperCase().trim();
                      const base = (settings.localization as any).baseCurrency || "PKR";
                      const next = (currencies || []).filter((c) => c.code !== code);
                      next.unshift({ code, symbol, rate: code === base ? 1 : rate || 0 });
                      saveSection('localization', { ...(settings.localization as any), currencies: next } as any);
                      setNewCurCode("");
                      setNewCurSymbol("");
                      setNewCurRate("");
                      toast.success("Currency added");
                    }}
                  >
                    Add currency
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">Code</th>
                      <th className="text-left py-2 px-3">Symbol</th>
                      <th className="text-left py-2 px-3">Rate (vs base)</th>
                      <th className="text-left py-2 px-3 w-28">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(currencies.length ? currencies : [{ code: "PKR", symbol: "PKR", rate: 1 }]).map((c) => (
                      <tr key={c.code} className="border-b">
                        <td className="py-2 px-3 font-medium">{c.code}</td>
                        <td className="py-2 px-3">
                          <Input
                            value={c.symbol}
                            onChange={(e) => {
                              const next = currencies.map((x) => x.code === c.code ? { ...x, symbol: e.target.value.toUpperCase() } : x);
                              saveSection('localization', { ...(settings.localization as any), currencies: next } as any);
                            }}
                          />
                        </td>
                        <td className="py-2 px-3">
                          <Input
                            type="number"
                            value={String(c.rate)}
                            onChange={(e) => {
                              const v = Number(e.target.value) || 0;
                              const base = (settings.localization as any).baseCurrency || "PKR";
                              const next = currencies.map((x) => x.code === c.code ? { ...x, rate: x.code === base ? 1 : v } : x);
                              saveSection('localization', { ...(settings.localization as any), currencies: next } as any);
                            }}
                          />
                        </td>
                        <td className="py-2 px-3">
                          <Button
                            variant="outline"
                            onClick={() => {
                              const base = (settings.localization as any).baseCurrency || "PKR";
                              if (c.code === base) {
                                toast.error("Base currency cannot be removed");
                                return;
                              }
                              const next = currencies.filter((x) => x.code !== c.code);
                              const display = String(settings.localization.currency || base);
                              const nextDisplay = display === c.code ? base : display;
                              saveSection('localization', { ...(settings.localization as any), currencies: next, currency: nextDisplay } as any);
                              toast.success("Currency removed");
                            }}
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={()=>toast.success('Localization saved')}>Save changes</Button>
              <Button variant="outline" onClick={()=>{ resetSection('localization'); toast.success('Localization reset'); }}>Reset section</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card className="p-8 sm:p-10 space-y-10 rounded-[2.5rem] border-slate-200 shadow-2xl bg-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Mail className="w-32 h-32" />
            </div>
            <div className="relative space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Email Integration</h2>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mt-1">SMTP Protocol Configuration</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">SMTP Host</Label>
                  <Input 
                    value={settings.email?.smtpHost || ""} 
                    onChange={(e) => saveSection("email" as any, { ...settings.email, smtpHost: e.target.value })} 
                    placeholder="smtp.hostinger.com"
                    className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-indigo-500 font-bold" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">SMTP Port</Label>
                  <Input 
                    type="number"
                    value={settings.email?.smtpPort || ""} 
                    onChange={(e) => saveSection("email" as any, { ...settings.email, smtpPort: e.target.value })} 
                    placeholder="465"
                    className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-indigo-500 font-bold" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">SMTP User</Label>
                  <Input 
                    value={settings.email?.smtpUser || ""} 
                    onChange={(e) => saveSection("email" as any, { ...settings.email, smtpUser: e.target.value })} 
                    placeholder="user@yourdomain.com"
                    className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-indigo-500 font-bold" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">SMTP Password</Label>
                  <Input 
                    type="password"
                    value={settings.email?.smtpPass || ""} 
                    onChange={(e) => saveSection("email" as any, { ...settings.email, smtpPass: e.target.value })} 
                    placeholder="••••••••"
                    className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-indigo-500 font-bold" 
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">Connection Audit</h3>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-relaxed">Dispatch a test transmission to verify SMTP handshake integrity.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1 space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Test Recipient</Label>
                    <Input 
                      value={testEmail} 
                      onChange={(e) => setTestEmail(e.target.value)} 
                      placeholder="audit@domain.com"
                      className="h-12 rounded-xl border-slate-200 bg-white focus:ring-indigo-500 font-medium" 
                    />
                  </div>
                  <Button 
                    onClick={handleSendTestEmail} 
                    disabled={sendingTest || !testEmail}
                    className="h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase text-[10px] tracking-widest shadow-lg transition-all active:scale-95"
                  >
                    {sendingTest ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                    SEND TEST TRANSMISSION
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6">
                <Button 
                  variant="outline" 
                  className="h-12 px-8 rounded-xl font-bold uppercase text-[10px] tracking-widest border-slate-200"
                  onClick={() => { resetSection("email" as any); toast.success("Email settings reset"); }}
                >
                  Reset Protocol
                </Button>
                <Button 
                  className="h-12 px-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase text-[10px] tracking-widest shadow-xl"
                  onClick={() => toast.success("Email settings saved")}
                >
                  Save Configuration
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="modules">
          <Card className="p-6 space-y-4">
            <div className="text-lg font-semibold">Modules</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(settings.modules).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="text-sm font-medium capitalize">{k}</div>
                    <div className="text-xs text-muted-foreground">Enable/disable module</div>
                  </div>
                  <Switch checked={v} onCheckedChange={(nv)=>saveSection('modules', { ...settings.modules, [k]: Boolean(nv) })} />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={()=>toast.success('Modules updated')}>Save changes</Button>
              <Button variant="outline" onClick={()=>{ resetSection('modules'); toast.success('Modules reset'); }}>Reset section</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="left-menu">
          <Card className="p-6 space-y-4">
            <div className="text-lg font-semibold">Left menu</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(settings.leftMenu).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="text-sm font-medium capitalize">{k.replace(/-/g,' ')}</div>
                    <div className="text-xs text-muted-foreground">Show/hide in sidebar</div>
                  </div>
                  <Switch checked={v} onCheckedChange={(nv)=>saveSection('leftMenu', { ...settings.leftMenu, [k]: Boolean(nv) })} />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">Compact menu</div>
                  <div className="text-xs text-muted-foreground">Reduce spacing to fit more</div>
                </div>
                <Switch checked={!!settings.leftMenuOptions?.compact} onCheckedChange={(nv)=>saveSection('leftMenuOptions', { ...(settings.leftMenuOptions||{}), compact: Boolean(nv) } as any)} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">Show badges</div>
                  <div className="text-xs text-muted-foreground">Display counters on items</div>
                </div>
                <Switch checked={!!settings.leftMenuOptions?.showBadges} onCheckedChange={(nv)=>saveSection('leftMenuOptions', { ...(settings.leftMenuOptions||{}), showBadges: Boolean(nv) } as any)} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">Collapsible groups</div>
                  <div className="text-xs text-muted-foreground">Allow expanding/collapsing groups</div>
                </div>
                <Switch checked={!!settings.leftMenuOptions?.collapsibleGroups} onCheckedChange={(nv)=>saveSection('leftMenuOptions', { ...(settings.leftMenuOptions||{}), collapsibleGroups: Boolean(nv) } as any)} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={()=>toast.success('Menu updated')}>Save changes</Button>
              <Button variant="outline" onClick={()=>{ resetSection('leftMenu'); toast.success('Left menu reset'); }}>Reset visibility</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="p-6 space-y-4">
            <div className="text-lg font-semibold">Notifications</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">Email notifications</div>
                  <div className="text-xs text-muted-foreground">Send important events by email</div>
                </div>
                <Switch checked={settings.notifications.email} onCheckedChange={(v)=>saveSection('notifications', { ...settings.notifications, email: Boolean(v) })} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">In-app notifications</div>
                  <div className="text-xs text-muted-foreground">Show alerts inside the app</div>
                </div>
                <Switch checked={settings.notifications.inApp} onCheckedChange={(v)=>saveSection('notifications', { ...settings.notifications, inApp: Boolean(v) })} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">SMS notifications</div>
                  <div className="text-xs text-muted-foreground">If an SMS provider is configured</div>
                </div>
                <Switch checked={settings.notifications.sms} onCheckedChange={(v)=>saveSection('notifications', { ...settings.notifications, sms: Boolean(v) })} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="text-sm font-medium">Desktop notifications</div>
                <div className="text-xs text-muted-foreground">Use browser notifications</div>
              </div>
              <Switch checked={!!settings.notifications.desktop} onCheckedChange={(v)=>saveSection('notifications', { ...settings.notifications, desktop: Boolean(v) })} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="text-sm font-medium">Daily digest</div>
                <div className="text-xs text-muted-foreground">Send a summary email daily</div>
              </div>
              <Switch checked={!!settings.notifications.dailyDigest} onCheckedChange={(v)=>saveSection('notifications', { ...settings.notifications, dailyDigest: Boolean(v) })} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="text-sm font-medium">Sound</div>
                <div className="text-xs text-muted-foreground">Play a sound for alerts</div>
              </div>
              <Switch checked={!!settings.notifications.sound} onCheckedChange={(v)=>saveSection('notifications', { ...settings.notifications, sound: Boolean(v) })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Test email</Label>
                <Input placeholder="test@example.com" value={settings.notifications.testEmail || ''} onChange={(e)=>saveSection('notifications', { ...settings.notifications, testEmail: e.target.value })} />
              </div>
              <div>
                <Label>Digest hour (0-23)</Label>
                <Input type="number" value={(settings.notifications.digestHour ?? 9) as any} onChange={(e)=>saveSection('notifications', { ...settings.notifications, digestHour: e.target.value? Number(e.target.value) : 9 })} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={()=>toast.success('Notifications saved')}>Save changes</Button>
              <Button variant="outline" onClick={()=>toast.success('Test notification sent (simulated)')}>Send test</Button>
              <Button variant="outline" onClick={()=>{ resetSection('notifications'); toast.success('Notifications reset'); }}>Reset section</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="integration">
          <Card className="p-6 space-y-4">
            <div className="text-lg font-semibold">Integration</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Slack webhook URL</Label>
                <Input value={settings.integration.slackWebhookUrl || ''} onChange={(e)=>saveSection('integration', { ...settings.integration, slackWebhookUrl: e.target.value })} />
              </div>
              <div>
                <Label>Zapier hook URL</Label>
                <Input value={settings.integration.zapierHookUrl || ''} onChange={(e)=>saveSection('integration', { ...settings.integration, zapierHookUrl: e.target.value })} />
              </div>
              <div>
                <Label>Stripe publishable key</Label>
                <Input value={settings.integration.stripePublishableKey || ''} onChange={(e)=>saveSection('integration', { ...settings.integration, stripePublishableKey: e.target.value })} />
              </div>
              <div>
                <Label>Google Calendar Client ID</Label>
                <Input value={settings.integration.googleCalendarClientId || ''} onChange={(e)=>saveSection('integration', { ...settings.integration, googleCalendarClientId: e.target.value })} />
              </div>
              <div>
                <Label>Google Calendar API Key</Label>
                <Input value={settings.integration.googleCalendarApiKey || ''} onChange={(e)=>saveSection('integration', { ...settings.integration, googleCalendarApiKey: e.target.value })} />
              </div>
              <div>
                <Label>Microsoft App ID</Label>
                <Input value={settings.integration.microsoftAppId || ''} onChange={(e)=>saveSection('integration', { ...settings.integration, microsoftAppId: e.target.value })} />
              </div>
              <div>
                <Label>Twilio SID</Label>
                <Input value={settings.integration.twilioSid || ''} onChange={(e)=>saveSection('integration', { ...settings.integration, twilioSid: e.target.value })} />
              </div>
              <div>
                <Label>Twilio Token</Label>
                <Input value={settings.integration.twilioToken || ''} onChange={(e)=>saveSection('integration', { ...settings.integration, twilioToken: e.target.value })} />
              </div>
              <div>
                <Label>Twilio From Phone</Label>
                <Input value={settings.integration.twilioFromPhone || ''} onChange={(e)=>saveSection('integration', { ...settings.integration, twilioFromPhone: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={()=>toast.success('Integration saved')}>Save changes</Button>
              <Button variant="outline" onClick={()=>toast.success('Slack test sent (simulated)')}>Test Slack</Button>
              <Button variant="outline" onClick={()=>toast.success('Twilio test sent (simulated)')}>Test Twilio</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="hr">
          <Card className="p-8 sm:p-10 space-y-10 rounded-[2.5rem] border-slate-200 shadow-2xl bg-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Clock className="w-32 h-32" />
            </div>
            <div className="relative space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">HR Settings</h2>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mt-1">Standard Timing &amp; Criteria</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Standard Timing */}
                <div className="space-y-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Standard Timing
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Start Time</Label>
                      <Input 
                        type="time"
                        value={settings.hr?.standardStartTime || "09:00"} 
                        onChange={(e) => saveSection("hr" as any, { ...settings.hr, standardStartTime: e.target.value })} 
                        className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-indigo-500 font-bold" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">End Time</Label>
                      <Input 
                        type="time"
                        value={settings.hr?.standardEndTime || "18:00"} 
                        onChange={(e) => saveSection("hr" as any, { ...settings.hr, standardEndTime: e.target.value })} 
                        className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-indigo-500 font-bold" 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Late Threshold (Mins)</Label>
                      <Input 
                        type="number"
                        value={settings.hr?.lateThresholdMinutes || 15} 
                        onChange={(e) => saveSection("hr" as any, { ...settings.hr, lateThresholdMinutes: parseInt(e.target.value) || 0 })} 
                        className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-indigo-500 font-bold" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Absent Threshold (Hours)</Label>
                      <Input 
                        type="number"
                        value={settings.hr?.absentThresholdHours || 4} 
                        onChange={(e) => saveSection("hr" as any, { ...settings.hr, absentThresholdHours: parseInt(e.target.value) || 0 })} 
                        className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-indigo-500 font-bold" 
                      />
                    </div>
                  </div>
                </div>

                {/* Deduction Criteria */}
                <div className="space-y-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-rose-600 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> Deduction Criteria
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Late Deduction (PKR)</Label>
                      <Input 
                        type="number"
                        value={settings.hr?.deductionLateAmount || 500} 
                        onChange={(e) => saveSection("hr" as any, { ...settings.hr, deductionLateAmount: parseInt(e.target.value) || 0 })} 
                        className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-indigo-500 font-bold" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Absent Deduction (PKR)</Label>
                      <Input 
                        type="number"
                        value={settings.hr?.deductionAbsentAmount || 2000} 
                        onChange={(e) => saveSection("hr" as any, { ...settings.hr, deductionAbsentAmount: parseInt(e.target.value) || 0 })} 
                        className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-indigo-500 font-bold" 
                      />
                    </div>
                  </div>
                </div>

                {/* Hiring Criteria */}
                <div className="space-y-6 md:col-span-2 pt-6 border-t border-slate-100">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                    <Target className="w-4 h-4" /> Hiring Criteria
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Min Experience</Label>
                      <Input 
                        value={settings.hr?.hiringMinExperience || "2 years"} 
                        onChange={(e) => saveSection("hr" as any, { ...settings.hr, hiringMinExperience: e.target.value })} 
                        className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-indigo-500 font-bold" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Min Education</Label>
                      <Input 
                        value={settings.hr?.hiringMinEducation || "Bachelor's"} 
                        onChange={(e) => saveSection("hr" as any, { ...settings.hr, hiringMinEducation: e.target.value })} 
                        className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-indigo-500 font-bold" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Age Limit</Label>
                      <Input 
                        value={settings.hr?.hiringAgeLimit || "18-45"} 
                        onChange={(e) => saveSection("hr" as any, { ...settings.hr, hiringAgeLimit: e.target.value })} 
                        className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-indigo-500 font-bold" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6">
                <Button 
                  variant="outline" 
                  className="h-12 px-8 rounded-xl font-bold uppercase text-[10px] tracking-widest border-slate-200"
                  onClick={() => { resetSection("hr" as any); toast.success("HR settings reset"); }}
                >
                  Reset HR Defaults
                </Button>
                <Button 
                  className="h-12 px-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase text-[10px] tracking-widest shadow-xl"
                  onClick={() => toast.success("HR settings saved successfully")}
                >
                  Save HR Configuration
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="updates">
          <Card className="p-6 space-y-4">
            <div className="text-lg font-semibold">Updates</div>
            <div className="text-sm">Current version: <span className="font-medium">{settings.meta.version}</span></div>
            <div className="text-xs text-muted-foreground">Last updated: {new Date(settings.meta.updatedAt).toLocaleString()}</div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" onClick={exportJSON}>Export settings</Button>
              <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e)=>{ const f = e.target.files?.[0]; if (f) importJSON(f).then(()=>toast.success('Settings imported')); }} />
              <Button variant="outline" onClick={()=>fileRef.current?.click()}>Import settings</Button>
              <Button onClick={()=>toast.success('You are on the latest version')}>Check for updates</Button>
              <Button variant="destructive" onClick={()=>{ resetAll(); toast.success('All settings reset to defaults'); }}>Reset all</Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

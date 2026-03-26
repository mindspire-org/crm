import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getAuthHeaders } from "@/lib/api/auth";
import { ImageManager } from "@/components/ImageManager";
import { API_BASE } from "@/lib/api/base";
import { Eye, EyeOff, User, Mail, Shield, Lock, Fingerprint, Camera, Sparkles, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";

const ASSET_BASE = API_BASE;

const normalizeAvatarSrc = (input: string, ver?: number) => {
  const s = String(input || "").trim();
  if (!s || s.startsWith("<")) return "/api/placeholder/64/64";
  try {
    const isAbs = /^https?:\/\//i.test(s);
    if (isAbs) {
      const u = new URL(s);
      if ((u.hostname === "localhost" || u.hostname === "127.0.0.1") && u.pathname.includes("/uploads/")) {
        const url = `${ASSET_BASE}${u.pathname}`;
        return ver ? `${url}?v=${ver}` : url;
      }
      if (u.pathname.includes("/uploads/")) {
        const url = `${ASSET_BASE}${u.pathname}`;
        return ver ? `${url}?v=${ver}` : url;
      }
      return ver ? `${s}?v=${ver}` : s;
    }
    const rel = s.startsWith("/") ? s : `/${s}`;
    const url = `${ASSET_BASE}${rel}`;
    return ver ? `${url}?v=${ver}` : url;
  } catch {
    const rel = s.startsWith("/") ? s : `/${s}`;
    const url = `${ASSET_BASE}${rel}`;
    return ver ? `${url}?v=${ver}` : url;
  }
};

type MeResponse = {
  user?: {
    _id?: string;
    id?: string;
    role?: string;
    email?: string;
    username?: string;
    name?: string;
    avatar?: string;
    permissions?: string[];
  };
};

const getStoredAuthUser = (): any | null => {
  const raw = localStorage.getItem("auth_user") || sessionStorage.getItem("auth_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const setStoredAuthUser = (next: any) => {
  const raw = JSON.stringify(next);
  if (localStorage.getItem("auth_user")) localStorage.setItem("auth_user", raw);
  if (sessionStorage.getItem("auth_user")) sessionStorage.setItem("auth_user", raw);
};

export default function ProfileSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarVer, setAvatarVer] = useState(0);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");
  const [avatar, setAvatar] = useState<string>("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [pinCurrentPassword, setPinCurrentPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [showPinCurrentPassword, setShowPinCurrentPassword] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);

  const fileRef = useRef<HTMLInputElement | null>(null);

  const initials = useMemo(() => {
    const src = String(name || email || "").trim();
    if (!src) return "U";
    const parts = src.split(" ").filter(Boolean);
    const out = parts.map((p) => p[0]).join("").slice(0, 2).toUpperCase();
    return out || "U";
  }, [name, email]);

  const loadMe = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/users/me`, { headers });
      const json: MeResponse = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error((json as any)?.error || "Failed to load profile");
      const u = json?.user || {};
      setName(String(u?.name || ""));
      setEmail(String(u?.email || ""));
      setUsername(String(u?.username || ""));
      setRole(String(u?.role || ""));
      setAvatar(String(u?.avatar || ""));

      const stored = getStoredAuthUser() || {};
      const merged = {
        ...stored,
        id: u?.id || u?._id || stored?.id,
        _id: u?._id || stored?._id,
        role: u?.role || stored?.role,
        email: u?.email || stored?.email,
        name: u?.name || stored?.name,
        avatar: u?.avatar || stored?.avatar,
        permissions: u?.permissions || stored?.permissions,
      };
      setStoredAuthUser(merged);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMe();
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const headers = getAuthHeaders({ "Content-Type": "application/json" });
      const body: any = {
        name: name.trim(),
        email: email.trim(),
        username: username.trim(),
      };
      if (newPassword.trim()) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }

      const res = await fetch(`${API_BASE}/api/users/me`, {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any)?.error || "Failed to update profile");

      toast.success("Profile updated");
      setCurrentPassword("");
      setNewPassword("");
      // Notify HRM Employees page to refresh
      window.dispatchEvent(new Event("employeeUpdated"));
      await loadMe();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const savePin = async () => {
    try {
      const headers = getAuthHeaders({ "Content-Type": "application/json" });
      const res = await fetch(`${API_BASE}/api/users/me/pin`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ currentPassword: pinCurrentPassword, newPin }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any)?.error || "Failed to update PIN");
      toast.success("PIN updated");
      setPinCurrentPassword("");
      setNewPin("");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update PIN");
    }
  };

  const uploadNewAvatar = async (file: File) => {
    setUploading(true);
    try {
      const headers = getAuthHeaders();
      const form = new FormData();
      form.append("avatar", file);
      const res = await fetch(`${API_BASE}/api/users/me/avatar`, {
        method: "POST",
        headers,
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any)?.error || "Failed to upload avatar");
      toast.success("Avatar updated");
      await loadMe();
      setAvatarVer(Date.now());
    } catch (e: any) {
      toast.error(e?.message || "Failed to upload avatar");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleAvatarChange = async (imageBlob: Blob) => {
    const file = new File([imageBlob], "avatar.jpg", { type: "image/jpeg" });
    await uploadNewAvatar(file);
    await loadMe(); // Refresh user data to get new avatar URL
    setAvatarVer(Date.now()); // Update cache-busting version
  };

  const handleAvatarRemove = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/users/me/avatar`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error("Failed to remove avatar");
      toast.success("Avatar removed");
      await loadMe();
      setAvatarVer(Date.now());
    } catch (e: any) {
      toast.error(e?.message || "Failed to remove avatar");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <RefreshCcw className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Loading Profile...</p>
        </div>
      </div>
    );
  }

  const inputCls = "h-12 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold px-4";
  const labelCls = "text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-1.5 block";

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">
            Account <span className="text-indigo-600">Settings</span>
          </h1>
          <p className="text-sm font-medium text-slate-500">Manage your profile information and security preferences.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => void loadMe()} 
            disabled={saving || uploading}
            className="h-11 px-6 rounded-2xl border-slate-200 font-bold uppercase text-[10px] tracking-widest hover:bg-slate-50"
          >
            <RefreshCcw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button 
            onClick={saveProfile} 
            disabled={saving || uploading}
            className="h-11 px-8 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase text-[10px] tracking-widest shadow-xl shadow-slate-200 hover:scale-[1.02] transition-all"
          >
            {saving ? <RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-1 space-y-8">
          <Card className="rounded-[2.5rem] border-0 shadow-2xl shadow-slate-200/50 overflow-hidden bg-white">
            <div className="h-32 bg-gradient-to-br from-indigo-600 to-violet-700 relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent)]" />
            </div>
            <CardContent className="pt-0 px-8 pb-8">
              <div className="relative -mt-16 mb-6 flex justify-center">
                <div className="relative group">
                  <Avatar className="h-32 w-32 border-[6px] border-white shadow-2xl rounded-[2rem]">
                    <AvatarImage
                      src={normalizeAvatarSrc(avatar, avatarVer)}
                      className="object-cover"
                      onError={(e) => {
                        const img = e.currentTarget as HTMLImageElement;
                        img.src = "/api/placeholder/128/128";
                      }}
                    />
                    <AvatarFallback className="text-3xl font-black bg-slate-100 text-slate-400">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 rounded-[2rem] bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>
              
              <div className="text-center space-y-1 mb-8">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">{name || "Unnamed User"}</h3>
                <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest">{role || "Member"}</p>
                <div className="pt-4 flex flex-wrap justify-center gap-2">
                  <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-0 rounded-lg px-3 py-1 font-bold text-[10px] uppercase tracking-wider">
                    {username || "no-username"}
                  </Badge>
                  <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-0 rounded-lg px-3 py-1 font-bold text-[10px] uppercase tracking-wider">
                    {email?.split('@')[1] || "domain"}
                  </Badge>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <ImageManager
                  currentImage={normalizeAvatarSrc(avatar, avatarVer)}
                  onImageChange={handleAvatarChange}
                  onImageRemove={handleAvatarRemove}
                  aspectRatio={1}
                  disabled={uploading}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-0 shadow-xl shadow-slate-200/40 bg-slate-900 text-white overflow-hidden">
            <CardContent className="p-8 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-indigo-400" />
              </div>
              <h4 className="text-lg font-bold tracking-tight">Data Privacy</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Your profile information is encrypted and visible only to authorized personnel within HealthSpire.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Settings Forms */}
        <div className="lg:col-span-2 space-y-8">
          {/* General Information */}
          <Card className="rounded-[2.5rem] border-0 shadow-2xl shadow-slate-200/50 bg-white overflow-hidden">
            <CardHeader className="px-10 pt-10 pb-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <User className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black tracking-tight text-slate-900">General Information</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Basic account details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label className={labelCls}>Full Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="John Doe" />
                </div>
                <div className="space-y-1.5">
                  <Label className={labelCls}>Email Address</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="john@healthspire.org" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className={labelCls}>Username</Label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} className={inputCls} placeholder="johndoe" />
                <p className="text-[10px] font-bold text-slate-400 ml-1 uppercase tracking-wider">Used for login. Can be different from your email.</p>
              </div>
            </CardContent>
          </Card>

          {/* Security & PIN */}
          <Card className="rounded-[2.5rem] border-0 shadow-2xl shadow-slate-200/50 bg-white overflow-hidden">
            <CardHeader className="px-10 pt-10 pb-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black tracking-tight text-slate-900">Security &amp; PIN</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Manage your credentials</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10 space-y-10">
              {/* PIN Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <Fingerprint className="w-4 h-4 text-rose-500" />
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">System PIN</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <Label className={labelCls}>Current Password</Label>
                    <div className="relative">
                      <Input 
                        type={showPinCurrentPassword ? "text" : "password"} 
                        value={pinCurrentPassword} 
                        onChange={(e) => setPinCurrentPassword(e.target.value)} 
                        className={cn(inputCls, "pr-12")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPinCurrentPassword(!showPinCurrentPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors"
                      >
                        {showPinCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className={labelCls}>New PIN (4-8 digits)</Label>
                    <div className="relative">
                      <Input 
                        type={showNewPin ? "text" : "password"} 
                        value={newPin} 
                        onChange={(e) => setNewPin(e.target.value)} 
                        className={cn(inputCls, "pr-12")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPin(!showNewPin)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors"
                      >
                        {showNewPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={savePin} 
                    disabled={!pinCurrentPassword.trim() || !newPin.trim()}
                    className="h-10 px-6 rounded-xl border-slate-200 font-bold uppercase text-[10px] tracking-widest"
                  >
                    Update PIN
                  </Button>
                </div>
              </div>

              {/* Password Section */}
              <div className="space-y-6 pt-10 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-rose-500" />
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">Change Password</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <Label className={labelCls}>Current Password</Label>
                    <div className="relative">
                      <Input 
                        type={showCurrentPassword ? "text" : "password"} 
                        value={currentPassword} 
                        onChange={(e) => setCurrentPassword(e.target.value)} 
                        className={cn(inputCls, "pr-12")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors"
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className={labelCls}>New Password</Label>
                    <div className="relative">
                      <Input 
                        type={showNewPassword ? "text" : "password"} 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                        className={cn(inputCls, "pr-12")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 ml-1 uppercase tracking-wider">Minimum 8 characters with letters &amp; numbers.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}



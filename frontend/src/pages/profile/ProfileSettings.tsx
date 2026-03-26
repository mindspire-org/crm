import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { getAuthHeaders } from "@/lib/api/auth";
import { ImageManager } from "@/components/ImageManager";
import { API_BASE } from "@/lib/api/base";
import { Eye, EyeOff } from "lucide-react";

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
    return <div className="text-sm text-muted-foreground">Loading profileâ€¦</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border">
                <AvatarImage
                  src={normalizeAvatarSrc(avatar, avatarVer)}
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    img.src = "/api/placeholder/64/64";
                  }}
                />
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="text-sm font-medium">{name || ""}</div>
                <div className="text-xs text-muted-foreground">{email || ""}</div>
                <div className="text-xs text-muted-foreground">{role ? String(role).toUpperCase() : ""}</div>
              </div>
            </div>
            
            <ImageManager
              currentImage={normalizeAvatarSrc(avatar, avatarVer)}
              onImageChange={handleAvatarChange}
              onImageRemove={handleAvatarRemove}
              aspectRatio={1}
              disabled={uploading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Username</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter your username" />
            <p className="text-xs text-muted-foreground">Used for login. Can be different from your email.</p>
          </div>

          <div className="rounded-lg border p-4 space-y-4">
            <div className="text-sm font-medium">Reset PIN</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <div className="relative">
                  <Input 
                    type={showPinCurrentPassword ? "text" : "password"} 
                    value={pinCurrentPassword} 
                    onChange={(e) => setPinCurrentPassword(e.target.value)} 
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPinCurrentPassword(!showPinCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPinCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>New PIN (4-8 digits)</Label>
                <div className="relative">
                  <Input 
                    type={showNewPin ? "text" : "password"} 
                    value={newPin} 
                    onChange={(e) => setNewPin(e.target.value)} 
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPin(!showNewPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={savePin} disabled={!pinCurrentPassword.trim() || !newPin.trim()}>
                Update PIN
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Current password</Label>
              <div className="relative">
                <Input 
                  type={showCurrentPassword ? "text" : "password"} 
                  value={currentPassword} 
                  onChange={(e) => setCurrentPassword(e.target.value)} 
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>New password</Label>
              <div className="relative">
                <Input 
                  type={showNewPassword ? "text" : "password"} 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="text-xs text-muted-foreground">Minimum 8 characters, include letters and numbers.</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={saveProfile} disabled={saving || uploading}>
              Save changes
            </Button>
            <Button variant="outline" onClick={() => void loadMe()} disabled={saving || uploading}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



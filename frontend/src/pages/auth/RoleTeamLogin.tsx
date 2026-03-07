import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { teamLogin } from "@/services/authService";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import ForgotPasswordDialog from "@/components/auth/ForgotPasswordDialog";

type LoginMode = "password" | "pin";

type Props = {
  // Used for the small heading inside the tab content.
  title: string;
  // Short hint text under the title.
  subtitle: string;
  // Allowed roles for this specific tab (UI-level restriction).
  allowedRoles: string[];
  // Whether to show PIN mode in the UI.
  allowPin?: boolean;
  // Optional override when the logged-in role is not allowed in this tab.
  wrongRoleMessage?: string;
  // Redirect after successful login.
  redirectTo?: string;
};

export default function RoleTeamLogin({
  title,
  subtitle,
  allowedRoles,
  allowPin = true,
  wrongRoleMessage,
  redirectTo = "/",
}: Props) {
  // Role-restricted team login calls POST /api/auth/team/login.
  // Backend returns the resolved role; we verify it here so each tab only
  // accepts the intended set of roles.
  const [identifier, setIdentifier] = useState("");
  const [secret, setSecret] = useState("");
  const [mode, setMode] = useState<LoginMode>(allowPin ? "password" : "password");
  const [remember, setRemember] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [forgotOpen, setForgotOpen] = useState(false);

  const location = useLocation();
  const returnTo = useMemo(() => {
    try {
      const sp = new URLSearchParams(location.search || "");
      const v = String(sp.get("returnTo") || "").trim();
      if (!v.startsWith("/")) return "";
      if (v.startsWith("/auth") || v.startsWith("/reset-password")) return "";
      return v;
    } catch {
      return "";
    }
  }, [location.search]);

  // Stable/safe DOM id (no spaces/special chars) for the Remember checkbox.
  const rememberId = useMemo(() => {
    const slug = String(title)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    return `remember_${slug || "login"}`;
  }, [title]);

  const allowed = useMemo(() => new Set(allowedRoles.map((r) => String(r).toLowerCase())), [allowedRoles]);

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErrors(null);

    if (!identifier.trim() || !secret) {
      setErrors("Please enter credentials");
      return;
    }

    try {
      setLoading(true);
      const resp = await teamLogin(identifier.trim(), secret, mode);

      const role = String(resp?.user?.role || "").toLowerCase();
      if (!allowed.has(role)) {
        setErrors(wrongRoleMessage || "This account is not allowed in this tab.");
        return;
      }

      // Store token in localStorage/sessionStorage depending on remember.
      const storage: Storage = remember ? localStorage : sessionStorage;
      storage.setItem("auth_token", resp.token);
      storage.setItem("auth_user", JSON.stringify(resp.user));

      toast.success("Welcome back");
      setTimeout(() => {
        window.location.assign(returnTo || redirectTo);
      }, 150);
    } catch (e: any) {
      const msg = String(e?.message || "Login failed");
      setErrors(msg);
      setAttempts((a) => a + 1);
    } finally {
      setLoading(false);
    }
  };

  const rateLimited = attempts >= 3;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-1">
        <div className="text-sm font-medium text-white/90">{title}</div>
        <div className="text-xs text-white/60">{subtitle}</div>
      </div>

      <div className="space-y-2">
        <Label className="text-white/80">Email or Username</Label>
        <Input
          placeholder="you@company.com"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          autoComplete="username"
          className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-sky-500/40"
        />
      </div>

      {allowPin && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={mode === "password" ? "secondary" : "outline"}
            onClick={() => setMode("password")}
            className={
              mode === "password"
                ? "bg-white/15 text-white border-white/20 hover:bg-white/20"
                : "bg-transparent text-white/80 border-white/20 hover:bg-white/10"
            }
          >
            Password
          </Button>
          <Button
            type="button"
            variant={mode === "pin" ? "secondary" : "outline"}
            onClick={() => setMode("pin")}
            className={
              mode === "pin"
                ? "bg-white/15 text-white border-white/20 hover:bg-white/20"
                : "bg-transparent text-white/80 border-white/20 hover:bg-white/10"
            }
          >
            PIN
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-white/80">{mode === "pin" ? "PIN" : "Password"}</Label>
        <div className="relative">
          <Input
            type={showPwd ? "text" : "password"}
            placeholder={mode === "pin" ? "••••" : "••••••••"}
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            autoComplete={mode === "pin" ? "one-time-code" : "current-password"}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-sky-500/40 pr-10"
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
            onClick={() => setShowPwd((s) => !s)}
            aria-label="Toggle password visibility"
          >
            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox checked={remember} onCheckedChange={(v) => setRemember(Boolean(v))} id={rememberId} />
          <Label htmlFor={rememberId} className="text-white/80">
            Remember me
          </Label>
        </div>
        <Button variant="link" type="button" onClick={() => setForgotOpen(true)} className="px-0 text-white/70 hover:text-white">
          Forgot password
        </Button>
      </div>

      {errors && <div className="text-destructive text-sm">{errors}</div>}
      {rateLimited && <div className="text-xs text-warning">Too many attempts. Please wait a moment before trying again.</div>}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Signing in...
          </span>
        ) : (
          "Sign in"
        )}
      </Button>

      <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} defaultEmail={identifier} />
    </form>
  );
}

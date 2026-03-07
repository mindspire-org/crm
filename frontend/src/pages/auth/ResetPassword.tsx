import { useMemo, useState } from "react";
import { useLocation, Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { resetPassword } from "@/services/authService";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function ResetPasswordPage() {
  const q = useQuery();
  const email = String(q.get("email") || "").trim();
  const token = String(q.get("token") || "").trim();

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const canSubmit = useMemo(() => {
    if (!email || !token) return false;
    const strong = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
    if (!strong.test(newPassword)) return false;
    if (newPassword !== confirm) return false;
    return true;
  }, [email, token, newPassword, confirm]);

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSubmit) return;
    try {
      setLoading(true);
      await resetPassword({ email, token, newPassword });
      toast.success("Password updated. You can sign in now.");
      setDone(true);
    } catch (err: any) {
      toast.error(String(err?.message || "Reset failed"));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return <Navigate to="/auth" replace />;
  }

  if (!email || !token) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-950 via-slate-950 to-indigo-950">
      <Card className="w-full max-w-md border border-white/10 bg-white/10 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white">Set a new password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/80">Email</Label>
              <Input value={email} disabled className="bg-white/5 border-white/10 text-white" />
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">New password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 chars, letters + numbers"
                autoComplete="new-password"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">Confirm password</Label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                autoComplete="new-password"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>

            <Button type="submit" disabled={!canSubmit || loading} className="w-full">
              {loading ? "Saving..." : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { requestPasswordReset } from "@/services/authService";

export default function ForgotPasswordDialog({
  open,
  onOpenChange,
  defaultEmail = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmail?: string;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);

  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setEmail(String(defaultEmail || ""));
    }
    wasOpenRef.current = open;
  }, [open, defaultEmail]);

  const canSubmit = useMemo(() => {
    const e = String(email || "").trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }, [email]);

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSubmit) return;
    try {
      setLoading(true);
      await requestPasswordReset(String(email).trim());
      toast.success("If the email exists, a reset link has been sent.");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(String(err?.message || "Failed to send reset link"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              Enter your email address and we will send you a password reset link.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="yourname@example.com"
              autoComplete="email"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || loading}>
              {loading ? "Sending..." : "Send reset link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

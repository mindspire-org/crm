import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Lock, Loader2, XCircle } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";

interface AuthVerifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export function AuthVerifyDialog({
  open,
  onOpenChange,
  onSuccess,
  title = "Authentication Required",
  description = "Please enter your security PIN or password to proceed with this sensitive action.",
}: AuthVerifyDialogProps) {
  const [loading, setLoading] = useState(false);
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"pin" | "password">("pin");

  const handleVerify = async () => {
    setLoading(true);
    try {
      const payload = mode === "pin" ? { pin } : { password };
      const res = await fetch(`${API_BASE}/api/auth/verify-action`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success("Verification successful");
        onSuccess();
        onOpenChange(false);
        setPin("");
        setPassword("");
      } else {
        throw new Error(data.error || "Verification failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[360px] rounded-[3rem] p-0 border-0 shadow-3xl bg-white overflow-hidden">
        <div className="absolute top-4 right-4 z-10">
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full h-8 w-8 bg-slate-50/50 hover:bg-slate-100 transition-colors">
            <XCircle className="h-4 w-4 text-slate-400" />
          </Button>
        </div>

        <div className="p-10 text-center">
          <div className="relative inline-flex mb-8">
            <div className="absolute inset-0 bg-indigo-500/10 blur-2xl rounded-full scale-150 animate-pulse" />
            <div className="relative w-20 h-20 rounded-[2rem] flex items-center justify-center bg-white border border-slate-100 shadow-2xl">
              <Shield className="h-10 w-10 text-indigo-500" />
            </div>
          </div>

          <DialogHeader className="items-center text-center space-y-3">
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900 leading-none">
              {title.split(" ").map((w, i) => i === 1 ? <span key={i} className="text-indigo-600">{w} </span> : w + " ")}
            </DialogTitle>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
              {description}
            </p>
          </DialogHeader>

          <div className="mt-10 space-y-8">
            <div className="inline-flex p-1.5 bg-slate-50 rounded-2xl border border-slate-100/50 w-full">
              <button
                onClick={() => setMode("pin")}
                className={`flex-1 py-3 text-[9px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${
                  mode === "pin" ? "bg-white text-indigo-600 shadow-lg shadow-indigo-100 border border-indigo-50" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                Security PIN
              </button>
              <button
                onClick={() => setMode("password")}
                className={`flex-1 py-3 text-[9px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${
                  mode === "password" ? "bg-white text-indigo-600 shadow-lg shadow-indigo-100 border border-indigo-50" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                Password
              </button>
            </div>

            <div className="relative">
              {mode === "pin" ? (
                <div className="space-y-4">
                  <div className="relative group">
                    <Input
                      type="password"
                      placeholder="••••"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="h-16 rounded-[1.5rem] bg-slate-50/50 border-0 focus:ring-4 ring-indigo-500/10 font-black text-center text-3xl tracking-[0.6em] px-10 transition-all placeholder:text-slate-200"
                      maxLength={6}
                    />
                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-indigo-400 transition-colors" />
                  </div>
                  <div className="flex justify-center gap-1.5">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${pin.length >= i ? "bg-indigo-500 scale-125 shadow-lg shadow-indigo-200" : "bg-slate-200"}`} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="relative group">
                  <Input
                    type="password"
                    placeholder="Enter Secure Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-16 rounded-[1.5rem] bg-slate-50/50 border-0 focus:ring-4 ring-indigo-500/10 font-bold px-14 transition-all text-sm placeholder:text-slate-300"
                  />
                  <Lock className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-indigo-400 transition-colors" />
                </div>
              )}
            </div>
          </div>

          <div className="mt-12 space-y-4">
            <Button
              onClick={handleVerify}
              disabled={loading || (mode === "pin" ? !pin : !password)}
              className="w-full h-16 rounded-[1.5rem] bg-slate-900 text-white uppercase font-black text-[10px] tracking-[0.3em] hover:bg-indigo-600 shadow-2xl shadow-slate-200 hover:shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Authorize Node"
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="w-full h-10 rounded-xl text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-900 transition-colors"
            >
              Abort Verification
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

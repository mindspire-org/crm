import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle, Trash2, HelpCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info" | "success";
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "info",
}: ConfirmDialogProps) {
  const getIcon = () => {
    switch (variant) {
      case "danger":
        return <Trash2 className="h-6 w-6 text-rose-500" />;
      case "warning":
        return <AlertCircle className="h-6 w-6 text-amber-500" />;
      case "success":
        return <CheckCircle2 className="h-6 w-6 text-emerald-500" />;
      default:
        return <HelpCircle className="h-6 w-6 text-indigo-500" />;
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return "bg-rose-500 hover:bg-rose-600 shadow-rose-100";
      case "warning":
        return "bg-amber-500 hover:bg-amber-600 shadow-amber-100";
      case "success":
        return "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100";
      default:
        return "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100";
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[400px] rounded-[2rem] p-8 border-0 shadow-2xl bg-white animate-in zoom-in-95 duration-200">
        <AlertDialogHeader className="items-center text-center">
          <div className={cn(
            "w-16 h-16 rounded-2xl mb-4 flex items-center justify-center bg-slate-50 border border-slate-100 shadow-sm",
            variant === 'danger' && "bg-rose-50 border-rose-100",
            variant === 'warning' && "bg-amber-50 border-amber-100",
            variant === 'success' && "bg-emerald-50 border-emerald-100",
            variant === 'info' && "bg-indigo-50 border-indigo-100"
          )}>
            {getIcon()}
          </div>
          <AlertDialogTitle className="text-xl font-black uppercase tracking-tight text-slate-900 leading-tight">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm font-medium text-slate-500 leading-relaxed mt-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-col gap-2 mt-8">
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(
              "w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-lg transition-all active:scale-95 border-0",
              getVariantStyles()
            )}
          >
            {confirmText}
          </AlertDialogAction>
          <AlertDialogCancel className="w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-slate-100 hover:bg-slate-50 hover:text-slate-900 transition-all mt-0">
            {cancelText}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Database, 
  Download, 
  RefreshCw, 
  Trash2, 
  History, 
  ShieldCheck, 
  AlertTriangle,
  FileJson,
  Calendar,
  Zap,
  CheckCircle2,
  XCircle,
  Lock,
  ArrowUpCircle
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
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

interface Backup {
  _id: string;
  filename: string;
  size: number;
  trigger: 'manual' | 'auto';
  status: 'success' | 'failed';
  createdAt: string;
}

export default function Backups() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);

  useEffect(() => {
    void loadBackups();
  }, []);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/backups`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setBackups(await res.json());
      }
    } catch (error) {
      toast.error("Failed to load backup history");
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/backups/create`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        toast.success("System backup created successfully");
        void loadBackups();
      } else {
        throw new Error("Backup failed");
      }
    } catch (error) {
      toast.error("Manual backup procedure failed");
    } finally {
      setLoading(false);
    }
  };

  const deleteBackup = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/backups/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        toast.success("Backup purged from registry");
        void loadBackups();
      }
    } catch (error) {
      toast.error("Failed to delete backup");
    }
  };

  const startRestoreProcess = (backup: Backup) => {
    setSelectedBackup(backup);
    setIsRestoreOpen(true);
  };

  const handleRestore = async () => {
    if (!selectedBackup) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/backups/restore/${selectedBackup._id}`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        toast.success("System successfully restored to protocol state");
        setIsRestoreConfirmOpen(false);
        setIsRestoreOpen(false);
        // Force reload after restore to ensure all data is fresh
        setTimeout(() => window.location.reload(), 2000);
      } else {
        throw new Error("Restore failed");
      }
    } catch (error) {
      toast.error("Critical: System restoration failed");
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes: number) => {
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  return (
    <div className="p-6 space-y-8 min-h-screen bg-slate-50 text-slate-900">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-100 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-100 blur-[120px]" />
      </div>

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative group overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-8 md:p-12 shadow-xl"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-transparent opacity-50" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="p-5 bg-indigo-100 rounded-[2rem] border border-indigo-200 shadow-sm">
              <Database className="w-10 h-10 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight uppercase leading-none">
                System <span className="text-indigo-600">Vault</span>
              </h1>
              <div className="flex items-center gap-2 mt-3">
                <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px] font-bold uppercase tracking-widest px-3 py-1">Registry Integrity</Badge>
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-bold uppercase tracking-widest px-3 py-1">12h Auto-Protocol Active</Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={loadBackups}
              className="rounded-[1.5rem] bg-white border-slate-200 text-slate-700 hover:bg-indigo-50 h-14 px-8 font-bold tracking-widest transition-all"
            >
              <RefreshCw className={cn("w-4 h-4 mr-3", loading && "animate-spin")} />
              REFRESH
            </Button>
            <Button 
              onClick={createBackup}
              disabled={loading}
              className="rounded-[1.5rem] bg-indigo-600 hover:bg-indigo-700 text-white h-14 px-10 font-bold tracking-widest shadow-lg transition-all"
            >
              <Zap className="w-5 h-5 mr-3" />
              TRIGGER BACKUP
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-[2rem] border-slate-200 bg-white shadow-md">
          <CardContent className="p-8 flex items-center gap-6">
            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <History className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Total Snapshots</p>
              <h4 className="text-3xl font-bold text-slate-900">{backups.length}</h4>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-slate-200 bg-white shadow-md">
          <CardContent className="p-8 flex items-center gap-6">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Last Auto-Backup</p>
              <h4 className="text-sm font-bold text-slate-900">
                {backups.find(b => b.trigger === 'auto')?.createdAt 
                  ? new Date(backups.find(b => b.trigger === 'auto')!.createdAt).toLocaleString()
                  : 'No protocol triggered'}
              </h4>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-slate-200 bg-white shadow-md">
          <CardContent className="p-8 flex items-center gap-6">
            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
              <Lock className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Data Integrity</p>
              <h4 className="text-sm font-bold text-emerald-600">VERIFIED PROTOCOL</h4>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backup Registry Table */}
      <Card className="rounded-[2.5rem] border-slate-200 bg-white shadow-xl overflow-hidden">
        <CardHeader className="p-8 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold uppercase tracking-tight">Registry Archive</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Chronological System Snapshots</CardDescription>
            </div>
            <Badge variant="outline" className="rounded-xl px-4 py-1.5 font-bold text-[10px] uppercase tracking-widest border-slate-200">
              {backups.length} Records Found
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="py-5 px-8 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Snapshot Registry</th>
                  <th className="py-5 px-6 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Trigger</th>
                  <th className="py-5 px-6 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Volume</th>
                  <th className="py-5 px-6 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Timestamp</th>
                  <th className="py-5 px-6 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Status</th>
                  <th className="py-5 px-8 text-right text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backups.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-20">
                        <Database className="w-16 h-16" />
                        <p className="font-bold uppercase tracking-widest text-sm">Registry Archive Empty</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  backups.map((backup, idx) => (
                    <motion.tr 
                      key={backup._id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-6 px-8">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                            <FileJson className="w-5 h-5" />
                          </div>
                          <span className="font-bold font-mono text-xs tracking-tight text-slate-900">{backup.filename}</span>
                        </div>
                      </td>
                      <td className="py-6 px-6">
                        <Badge className={cn(
                          "uppercase text-[9px] font-bold tracking-widest px-2.5 py-1 rounded-lg",
                          backup.trigger === 'auto' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-blue-50 text-blue-700 border-blue-100"
                        )}>
                          {backup.trigger}
                        </Badge>
                      </td>
                      <td className="py-6 px-6 font-bold font-mono text-xs text-slate-500 tabular-nums">
                        {formatSize(backup.size)}
                      </td>
                      <td className="py-6 px-6">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="w-3.5 h-3.5 opacity-40" />
                          <span className="text-xs font-bold">{new Date(backup.createdAt).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="py-6 px-6 text-center">
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest",
                          backup.status === 'success' ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
                        )}>
                          {backup.status === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {backup.status}
                        </div>
                      </td>
                      <td className="py-6 px-8 text-right opacity-0 group-hover:opacity-100 transition-all">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => startRestoreProcess(backup)}
                            className="h-10 w-10 rounded-xl text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                            title="Restore Protocol"
                          >
                            <Download className="w-5 h-5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => deleteBackup(backup._id)}
                            className="h-10 w-10 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                            title="Purge Snapshot"
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Double Verification Dialog - Step 1 */}
      <AlertDialog open={isRestoreOpen} onOpenChange={setIsRestoreOpen}>
        <AlertDialogContent className="rounded-[2.5rem] bg-white border-slate-200 p-8 shadow-2xl max-w-lg">
          <AlertDialogHeader className="space-y-4">
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 w-fit">
              <AlertTriangle className="w-8 h-8 text-rose-600" />
            </div>
            <AlertDialogTitle className="text-3xl font-bold uppercase tracking-tight text-slate-900 leading-none">
              Restore <span className="text-rose-600">Sequence</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-4">
              Step 01: Initial Protocol Confirmation
            </AlertDialogDescription>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3">
              <p className="text-sm font-bold text-slate-700 leading-relaxed">
                Initiating system restoration will overwrite the entire current registry with data from snapshot:
              </p>
              <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
                <FileJson className="w-5 h-5 text-indigo-600" />
                <span className="font-bold font-mono text-xs">{selectedBackup?.filename}</span>
              </div>
              <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Warning: All data since this snapshot was taken will be lost.</p>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-4">
            <AlertDialogCancel className="rounded-xl h-14 font-bold tracking-widest border-2 border-slate-100">ABORT</AlertDialogCancel>
            <Button 
              onClick={() => {
                setIsRestoreOpen(false);
                setIsRestoreConfirmOpen(true);
              }}
              className="rounded-xl h-14 px-8 font-bold tracking-widest bg-rose-600 hover:bg-rose-700 text-white shadow-lg"
            >
              INITIALIZE RESTORE
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Double Verification Dialog - Step 2 */}
      <AlertDialog open={isRestoreConfirmOpen} onOpenChange={setIsRestoreConfirmOpen}>
        <AlertDialogContent className="rounded-[2.5rem] bg-white border-slate-200 p-8 shadow-2xl max-w-lg">
          <AlertDialogHeader className="space-y-4">
            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 w-fit animate-pulse">
              <Lock className="w-8 h-8 text-indigo-600" />
            </div>
            <AlertDialogTitle className="text-3xl font-bold uppercase tracking-tight text-slate-900 leading-none">
              Final <span className="text-indigo-600">Validation</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-4">
              Step 02: Corporate Authority Verification
            </AlertDialogDescription>
            <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
              <p className="text-sm font-bold text-indigo-900 leading-relaxed">
                Are you absolutely certain you wish to proceed? This action is irreversible and will reset the system core to the selected temporal state.
              </p>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-4">
            <AlertDialogCancel className="rounded-xl h-14 font-bold tracking-widest border-2 border-slate-100">CANCEL</AlertDialogCancel>
            <Button 
              onClick={handleRestore}
              disabled={loading}
              className="rounded-xl h-14 px-8 font-bold tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><ArrowUpCircle className="w-5 h-5 mr-3" />EXECUTE RESTORE</>}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

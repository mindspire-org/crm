import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";
import { UserCheck, Target, Filter, Plus, Save, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function TargetManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const [formData, setFormData] = useState({
    leads: 0,
    sales: 0,
    commissionRate: 0,
    bonus: 0,
    deductions: 0,
    note: ""
  });

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [usersRes, targetsRes] = await Promise.all([
        fetch(`${API_BASE}/api/users`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/targets?month=${month}&year=${year}`, { headers: getAuthHeaders() })
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.filter((u: any) => 
          ["marketer", "sales", "sales_manager", "marketing_manager"].includes(u.role)
        ));
      }
      
      if (targetsRes.ok) {
        setTargets(await targetsRes.json());
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [month, year]);

  const handleSave = async () => {
    if (!selectedUser) return toast.error("Please select a user");
    try {
      const res = await fetch(`${API_BASE}/api/targets`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          user: selectedUser,
          month,
          year,
          ...formData
        })
      });
      if (res.ok) {
        toast.success("Target updated successfully");
        loadInitialData();
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 bg-slate-50/50 min-h-screen">
      <div>
        <h1 className="text-3xl font-black uppercase italic tracking-tight text-slate-900">
          Target <span className="text-indigo-600">Command</span>
        </h1>
        <p className="text-sm font-bold uppercase tracking-widest text-slate-400 mt-1">
          Monthly Quota & Incentive Management
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="border-0 shadow-2xl rounded-[2.5rem] bg-white">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-xl font-black uppercase italic text-slate-900">Configure <span className="text-indigo-600">Target</span></CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Assigned User</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="rounded-xl border-slate-100 bg-slate-50 h-12">
                  <SelectValue placeholder="Select User Node" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-0 shadow-2xl">
                  {users.map(u => (
                    <SelectItem key={u._id} value={u._id}>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{u.name}</span>
                        <Badge variant="outline" className="text-[8px] uppercase font-black">{u.role}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Target Leads</label>
                <Input type="number" value={formData.leads} onChange={e => setFormData({...formData, leads: parseInt(e.target.value)})} className="rounded-xl border-slate-100 bg-slate-50 h-12 font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Target Sales (Rs.)</label>
                <Input type="number" value={formData.sales} onChange={e => setFormData({...formData, sales: parseInt(e.target.value)})} className="rounded-xl border-slate-100 bg-slate-50 h-12 font-bold" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Commission %</label>
                <Input type="number" value={formData.commissionRate} onChange={e => setFormData({...formData, commissionRate: parseFloat(e.target.value)})} className="rounded-xl border-slate-100 bg-slate-50 h-12 font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Bonus Quota</label>
                <Input type="number" value={formData.bonus} onChange={e => setFormData({...formData, bonus: parseInt(e.target.value)})} className="rounded-xl border-slate-100 bg-slate-50 h-12 font-bold" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Managerial Note</label>
              <Input value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} placeholder="Incentive guidance..." className="rounded-xl border-slate-100 bg-slate-50 h-12 font-bold" />
            </div>

            <Button onClick={handleSave} className="w-full h-14 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:scale-[1.02] transition-all">
              <Save className="w-4 h-4 mr-2" /> Commit Target
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-0 shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
          <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-black uppercase italic text-slate-900">Current <span className="text-indigo-600">Deployments</span></CardTitle>
            <div className="flex gap-2">
              <Select value={String(month)} onValueChange={v => setMonth(parseInt(v))}>
                <SelectTrigger className="w-32 rounded-xl border-slate-100 bg-slate-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-0 shadow-2xl">
                  {Array.from({length: 12}, (_, i) => (
                    <SelectItem key={i+1} value={String(i+1)}>Month {i+1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100">
                    <TableHead className="py-6 px-8 font-black uppercase tracking-widest text-[10px] text-slate-500">Agent Node</TableHead>
                    <TableHead className="py-6 px-4 text-center font-black uppercase tracking-widest text-[10px] text-slate-500">Leads/Sales</TableHead>
                    <TableHead className="py-6 px-4 text-center font-black uppercase tracking-widest text-[10px] text-slate-500">Commission %</TableHead>
                    <TableHead className="py-6 px-8 text-right font-black uppercase tracking-widest text-[10px] text-slate-500">Bonus/Ded.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {targets.map(t => (
                    <TableRow key={t._id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-50 last:border-0">
                      <TableCell className="py-5 px-8">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black uppercase">{t.user?.name?.slice(0,2)}</div>
                          <div>
                            <div className="font-black text-slate-900 uppercase italic text-sm">{t.user?.name}</div>
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t.user?.role}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-5 px-4 text-center">
                        <div className="font-black text-slate-900">{t.leads} <span className="text-slate-300">/</span> Rs.{t.sales?.toLocaleString()}</div>
                      </TableCell>
                      <TableCell className="py-5 px-4 text-center">
                        <Badge className="bg-emerald-50 text-emerald-700 border-0 font-black text-[10px]">{t.commissionRate}%</Badge>
                      </TableCell>
                      <TableCell className="py-5 px-8 text-right font-black tabular-nums text-slate-900">
                        <span className="text-emerald-600">+{t.bonus}</span> / <span className="text-rose-600">-{t.deductions}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {targets.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-2 opacity-20">
                          <Target className="w-12 h-12" />
                          <span className="text-[10px] font-black uppercase tracking-widest">No deployments detected for this period.</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

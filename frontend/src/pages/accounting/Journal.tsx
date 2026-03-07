import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { 
  BookOpen, 
  Plus, 
  Minus, 
  Calculator, 
  Save, 
  FileText,
  Search,
  CheckCircle,
  AlertCircle,
  DollarSign
} from "lucide-react";
import { toast } from "@/components/ui/sonner";

type Line = {
  accountCode: string;
  debit?: number;
  credit?: number;
  entityType?: string;
  entityId?: string;
  description?: string;
};

export default function Journal() {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState("");
  const [refNo, setRefNo] = useState("");
  const [currency, setCurrency] = useState("PKR");
  const [lines, setLines] = useState<Line[]>([
    { accountCode: "", debit: 0, credit: 0 },
    { accountCode: "", debit: 0, credit: 0 },
  ]);
  const [busy, setBusy] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showAccountSearch, setShowAccountSearch] = useState<number | null>(null);
  const [accountSearchQuery, setAccountSearchQuery] = useState("");

  const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
  const isBalanced = totalDebit === totalCredit;
  const difference = Math.abs(totalDebit - totalCredit);

  const updateLine = (idx: number, patch: Partial<Line>) => {
    setLines((cur) => cur.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };
  const addLine = () => setLines((cur) => [...cur, { accountCode: "", debit: 0, credit: 0 }]);
  const removeLine = (idx: number) => {
    if (lines.length <= 2) return;
    setLines((cur) => cur.filter((_, i) => i !== idx));
  };

  const loadAccounts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/accounts`, { headers: getAuthHeaders() });
      const json = await res.json();
      if (res.ok) setAccounts(Array.isArray(json) ? json : []);
    } catch {}
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const filteredAccounts = accounts.filter(acc => 
    acc.code.toLowerCase().includes(accountSearchQuery.toLowerCase()) ||
    acc.name.toLowerCase().includes(accountSearchQuery.toLowerCase())
  );

  const selectAccount = (idx: number, account: any) => {
    updateLine(idx, { accountCode: account.code });
    setShowAccountSearch(null);
    setAccountSearchQuery("");
  };

  const post = async () => {
    if (!isBalanced) {
      toast.error("Journal must be balanced before posting");
      return;
    }
    if (lines.some(l => !l.accountCode.trim())) {
      toast.error("All lines must have account codes");
      return;
    }
    if (lines.every(l => Number(l.debit || 0) === 0 && Number(l.credit || 0) === 0)) {
      toast.error("At least one line must have a debit or credit amount");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        date,
        memo: memo.trim(),
        refNo: refNo.trim(),
        currency,
        lines: lines.map(l => ({
          accountCode: l.accountCode.trim(),
          debit: Number(l.debit || 0),
          credit: Number(l.credit || 0),
          entityType: l.entityType?.trim() || undefined,
          entityId: l.entityId?.trim() || undefined,
          description: l.description?.trim() || undefined,
        }))
      };
      const res = await fetch(`${API_BASE}/api/journals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Post failed");
      
      // Reset form
      setDate(new Date().toISOString().slice(0, 10));
      setMemo("");
      setRefNo("");
      setCurrency("PKR");
      setLines([{ accountCode: "", debit: 0, credit: 0 }, { accountCode: "", debit: 0, credit: 0 }]);
      
      toast.success("Journal posted successfully");
    } catch (e: any) {
      toast.error(e?.message || "Failed to post journal");
    } finally {
      setBusy(false);
    }
  };
  
  const exportJournal = () => {
    const journalData = {
      date,
      memo: memo.trim(),
      refNo: refNo.trim(),
      currency,
      lines: lines.map(l => ({
        accountCode: l.accountCode.trim(),
        debit: Number(l.debit || 0),
        credit: Number(l.credit || 0),
        description: l.description?.trim() || "",
      })),
      totals: {
        debit: totalDebit,
        credit: totalCredit,
        balanced: isBalanced
      }
    };
    
    const dataStr = JSON.stringify(journalData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `journal-${refNo || date}-${new Date().getTime()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success("Journal exported successfully");
  };

  return (
    <div className="p-4 space-y-4">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-indigo-600/10 via-sky-500/5 to-emerald-500/10">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.25),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(14,165,233,0.20),transparent_35%),radial-gradient(circle_at_60%_90%,rgba(34,197,94,0.16),transparent_45%)]" />
        <div className="relative p-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Accounting</div>
            <div className="text-2xl font-semibold tracking-tight">Journal Entry</div>
            <div className="text-sm text-muted-foreground">Post vouchers with balanced debit/credit lines.</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={totalDebit === totalCredit ? "success" : "warning"}>
              {totalDebit === totalCredit ? "Balanced" : "Not balanced"}
            </Badge>
            <Badge variant="secondary">Debit {totalDebit.toFixed(2)}</Badge>
            <Badge variant="secondary">Credit {totalCredit.toFixed(2)}</Badge>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Voucher details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div>
              <Label>Date</Label>
              <DatePicker value={date} onChange={setDate} placeholder="Pick date" />
            </div>
            <div className="lg:col-span-2">
              <Label>Memo</Label>
              <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="e.g. Office rent for January" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Voucher lines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            {lines.map((l, idx) => (
              <div key={idx} className="rounded-xl border p-4 space-y-3">
                <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
                  <div className="lg:col-span-2">
                    <Label>Account Code</Label>
                    <div className="relative">
                      <Input 
                        value={l.accountCode} 
                        onChange={(e) => {
                          updateLine(idx, { accountCode: e.target.value });
                          setAccountSearchQuery(e.target.value);
                          setShowAccountSearch(idx);
                        }} 
                        placeholder="e.g. 1000" 
                      />
                      {showAccountSearch === idx && filteredAccounts.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-40 overflow-auto">
                          {filteredAccounts.slice(0, 5).map((acc) => (
                            <div
                              key={acc._id}
                              className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                              onClick={() => selectAccount(idx, acc)}
                            >
                              <div className="font-medium">{acc.code} - {acc.name}</div>
                              <div className="text-xs text-muted-foreground">{acc.type}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Debit</Label>
                    <Input 
                      type="number" 
                      value={l.debit ?? 0} 
                      onChange={(e) => updateLine(idx, { debit: Number(e.target.value) })} 
                      className={l.debit > 0 && l.credit > 0 ? "border-red-500" : ""}
                    />
                  </div>
                  <div>
                    <Label>Credit</Label>
                    <Input 
                      type="number" 
                      value={l.credit ?? 0} 
                      onChange={(e) => updateLine(idx, { credit: Number(e.target.value) })} 
                      className={l.credit > 0 && l.debit > 0 ? "border-red-500" : ""}
                    />
                  </div>
                  <div>
                    <Label>Entity Type</Label>
                    <Input value={l.entityType || ""} onChange={(e) => updateLine(idx, { entityType: e.target.value })} placeholder="client|employee|vendor" />
                  </div>
                  <div>
                    <Label>Entity ID</Label>
                    <Input value={l.entityId || ""} onChange={(e) => updateLine(idx, { entityId: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label>Description</Label>
                    <Input value={l.description || ""} onChange={(e) => updateLine(idx, { description: e.target.value })} placeholder="Optional line description" />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {l.debit > 0 && l.credit > 0 && (
                      <div className="flex items-center gap-1 text-xs text-red-600">
                        <AlertCircle className="w-3 h-3" />
                        Both debit and credit cannot be positive
                      </div>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => removeLine(idx)} disabled={lines.length <= 2}>
                    <Minus className="w-3 h-3 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <Button type="button" onClick={addLine} variant="secondary">
              <Plus className="w-4 h-4 mr-2" />
              Add line
            </Button>
            <div className="flex items-center gap-2">
              <div className={`text-sm ${isBalanced ? "text-green-600" : "text-red-600"}`}>
                {isBalanced ? (
                  <><CheckCircle className="w-4 h-4 inline mr-1" /> Balanced</>
                ) : (
                  <><AlertCircle className="w-4 h-4 inline mr-1" /> Difference: {difference.toFixed(2)}</>
                )}
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="text-sm text-muted-foreground">
                Reference: <Input value={refNo} onChange={(e) => setRefNo(e.target.value)} placeholder="Optional reference" className="w-32 inline-block ml-2" />
              </div>
              <div className="text-sm text-muted-foreground">
                Currency: <Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="PKR" className="w-20 inline-block ml-2" />
              </div>
            </div>
            <Button onClick={post} disabled={busy || !isBalanced} className="min-w-[120px]">
              {busy ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Posting...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Post Journal
                </div>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

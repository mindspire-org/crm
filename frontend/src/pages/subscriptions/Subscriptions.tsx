import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, Edit, MoreHorizontal, RefreshCw, Search, Plus, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";

export default function Subscriptions() {
  type ClientDoc = { _id: string; company?: string; person?: string };
  type UserDoc = { _id: string; name?: string; email?: string };
  type SubscriptionLabelDoc = { _id: string; name: string; color?: string };
  type VendorDoc = { _id: string; name?: string; company?: string };
  type SubscriptionDoc = {
    _id: string;
    subscriptionNo?: number;
    clientId?: string;
    client?: string;
    companyName?: string;
    whatsappNumber?: string;
    title?: string;
    productName?: string;
    planName?: string;
    type?: string;
    currency?: string;
    firstBillingDate?: string;
    nextBillingDate?: string;
    repeatEveryCount?: number;
    repeatEveryUnit?: string;
    cycles?: number;
    status?: string;
    amount?: number;
    tax1?: number;
    tax2?: number;
    paymentMethod?: string;
    accountManagerUserId?: string;
    note?: string;
    labels?: string[];
    vendorId?: string;
    vendor?: string;
  };

  const clientDisplayName = (c: ClientDoc) => c.company || c.person || "Unnamed";

  const [query, setQuery] = useState("");
  const [currency, setCurrency] = useState("-");
  const [repeat, setRepeat] = useState("-");
  const [status, setStatus] = useState("-");
  const [pageSize, setPageSize] = useState("10");
  const [page, setPage] = useState(0);
  const [openAdd, setOpenAdd] = useState(false);
  const [openLabels, setOpenLabels] = useState(false);

  const [clients, setClients] = useState<ClientDoc[]>([]);
  const [vendors, setVendors] = useState<VendorDoc[]>([]);
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionDoc[]>([]);
  const [loading, setLoading] = useState(false);

  const [subscriptionLabels, setSubscriptionLabels] = useState<SubscriptionLabelDoc[]>([]);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#4F46E5");

  const [editingSubscription, setEditingSubscription] = useState<SubscriptionDoc | null>(null);

  const [title, setTitle] = useState("");
  const [productName, setProductName] = useState("");
  const [planName, setPlanName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [clientId, setClientId] = useState("-");
  const [vendorId, setVendorId] = useState("-");
  const [subType, setSubType] = useState("App");
  const [subCurrency, setSubCurrency] = useState("PKR");
  const [firstBillingDate, setFirstBillingDate] = useState("");
  const [nextBillingDate, setNextBillingDate] = useState("");
  const [repeatEveryCount, setRepeatEveryCount] = useState("1");
  const [repeatEveryUnit, setRepeatEveryUnit] = useState("month");
  const [cycles, setCycles] = useState("0");
  const [amount, setAmount] = useState("");
  const [tax1, setTax1] = useState("");
  const [tax2, setTax2] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [accountManagerUserId, setAccountManagerUserId] = useState("-");
  const [statusSel, setStatusSel] = useState("active");
  const [note, setNote] = useState("");
  const [label, setLabel] = useState("-");

  const labelColorByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of subscriptionLabels) {
      if (l?.name) m.set(l.name, l.color || "#4F46E5");
    }
    return m;
  }, [subscriptionLabels]);

  const accountManagerName = (id?: string) => {
    if (!id) return "-";
    const u = users.find((x) => String(x._id) === String(id));
    return u?.name || u?.email || "-";
  };

  const resetForm = () => {
    setTitle("");
    setProductName("");
    setPlanName("");
    setCompanyName("");
    setWhatsappNumber("");
    setClientId("-");
    setVendorId("-");
    setSubType("App");
    setSubCurrency("PKR");
    setFirstBillingDate("");
    setNextBillingDate("");
    setRepeatEveryCount("1");
    setRepeatEveryUnit("month");
    setCycles("0");
    setAmount("");
    setTax1("");
    setTax2("");
    setPaymentMethod("");
    setAccountManagerUserId("-");
    setStatusSel("active");
    setNote("");
    setLabel("-");
    setEditingSubscription(null);
  };

  const openEdit = (s: SubscriptionDoc) => {
    setEditingSubscription(s);
    setTitle(s.title || "");
    setProductName(s.productName || "");
    setPlanName(s.planName || "");
    setCompanyName(s.companyName || "");
    setWhatsappNumber(s.whatsappNumber || "");
    setClientId(s.clientId || "-");
    setVendorId(s.vendorId || "-");
    setSubType(s.type || "App");
    setSubCurrency(s.currency || "PKR");
    setFirstBillingDate(s.firstBillingDate ? new Date(s.firstBillingDate).toISOString().slice(0, 10) : "");
    setNextBillingDate(s.nextBillingDate ? new Date(s.nextBillingDate).toISOString().slice(0, 10) : "");
    setRepeatEveryCount(String(s.repeatEveryCount ?? 1));
    setRepeatEveryUnit(String(s.repeatEveryUnit ?? "month"));
    setCycles(String(s.cycles ?? 0));
    setAmount(String(s.amount ?? 0));
    setTax1(String(s.tax1 ?? 0));
    setTax2(String(s.tax2 ?? 0));
    setPaymentMethod(String(s.paymentMethod ?? ""));
    setAccountManagerUserId(s.accountManagerUserId ? String(s.accountManagerUserId) : "-");
    setStatusSel(String(s.status || "active"));
    setNote(String(s.note ?? ""));
    setLabel((s.labels || [])[0] || "-");
    setOpenAdd(true);
  };

  const loadClients = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/clients`, { headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load clients");
      setClients(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load clients");
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/users`, { headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (res.ok) setUsers(Array.isArray(json) ? json : []);
    } catch {}
  };

  const loadVendors = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/vendors`, { headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (res.ok) setVendors(Array.isArray(json) ? json : []);
    } catch {}
  };

  const loadLabels = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/subscription-labels`, { headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load labels");
      setSubscriptionLabels(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load labels");
    }
  };

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (currency !== "-") params.set("currency", currency);
      if (repeat !== "-") params.set("repeatEveryUnit", repeat);
      if (status !== "-") params.set("status", status);

      const res = await fetch(`${API_BASE}/api/subscriptions?${params.toString()}`, { headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load subscriptions");
      const arr = Array.isArray(json) ? json : [];
      setSubscriptions(arr);
      setPage(0);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
    loadVendors();
    loadUsers();
    loadLabels();
    loadSubscriptions();
  }, []);

  useEffect(() => {
    loadSubscriptions();
  }, [query, currency, repeat, status]);

  const saveSubscription = async () => {
    const t = title.trim();
    if (!t) {
      toast.error("Title is required");
      return;
    }

    const clientDoc = clients.find((c) => String(c._id) === String(clientId));
    const vendorDoc = vendors.find((v) => String(v._id) === String(vendorId));
    const payload: any = {
      title: t,
      productName: productName.trim() || undefined,
      planName: planName.trim() || undefined,
      companyName: companyName.trim() || undefined,
      whatsappNumber: whatsappNumber.trim() || undefined,
      type: subType || "App",
      currency: subCurrency || "PKR",
      firstBillingDate: firstBillingDate ? new Date(firstBillingDate).toISOString() : undefined,
      nextBillingDate: nextBillingDate ? new Date(nextBillingDate).toISOString() : undefined,
      repeatEveryCount: Number(repeatEveryCount) || 1,
      repeatEveryUnit: repeatEveryUnit || "month",
      cycles: Number(cycles) || 0,
      amount: Number(amount) || 0,
      tax1: Number(tax1) || 0,
      tax2: Number(tax2) || 0,
      paymentMethod: paymentMethod.trim() || undefined,
      accountManagerUserId: accountManagerUserId !== "-" ? accountManagerUserId : undefined,
      status: statusSel || "active",
      note: note || "",
    };
    if (clientId !== "-") {
      payload.clientId = clientId;
      payload.client = clientDoc ? clientDisplayName(clientDoc) : "";
    }
    if (vendorId !== "-") {
      payload.vendorId = vendorId;
      payload.vendor = vendorDoc ? (vendorDoc.name || vendorDoc.company || "") : "";
    }
    if (label !== "-") payload.labels = [label];

    try {
      const isEdit = Boolean(editingSubscription?._id);
      const url = isEdit ? `${API_BASE}/api/subscriptions/${editingSubscription!._id}` : `${API_BASE}/api/subscriptions`;
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || (isEdit ? "Failed to update subscription" : "Failed to create subscription"));
      toast.success(isEdit ? "Subscription updated" : "Subscription saved");
      setOpenAdd(false);
      resetForm();
      await loadSubscriptions();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save subscription");
    }
  };

  const deleteSubscription = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/subscriptions/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to delete subscription");
      toast.success("Subscription deleted");
      await loadSubscriptions();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete subscription");
    }
  };

  const cancelOrActivate = async (s: SubscriptionDoc) => {
    try {
      const isCancelled = (s.status || "").toLowerCase() === "cancelled";
      const endpoint = isCancelled ? "reactivate" : "cancel";
      const res = await fetch(`${API_BASE}/api/subscriptions/${s._id}/${endpoint}`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(isCancelled ? {} : { cancelledBy: "" }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to update status");
      toast.success(isCancelled ? "Subscription reactivated" : "Subscription cancelled");
      await loadSubscriptions();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update status");
    }
  };

  const createLabel = async () => {
    const name = newLabelName.trim();
    if (!name) {
      toast.error("Name is required");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/subscription-labels`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ name, color: newLabelColor }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to create label");
      setNewLabelName("");
      toast.success("Label created");
      await loadLabels();
    } catch (e: any) {
      toast.error(e?.message || "Failed to create label");
    }
  };

  const updateLabel = async (id: string, name: string, color: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/subscription-labels/${id}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ name, color }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to update label");
      toast.success("Label updated");
      await loadLabels();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update label");
    }
  };

  const deleteLabel = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/subscription-labels/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to delete label");
      toast.success("Label deleted");
      await loadLabels();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete label");
    }
  };

  const pageSizeN = Math.max(1, Number(pageSize) || 10);
  const total = subscriptions.length;
  const start = Math.min(total, page * pageSizeN);
  const end = Math.min(total, start + pageSizeN);
  const pageItems = subscriptions.slice(start, end);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-sm text-muted-foreground">Subscriptions</h1>
        <div className="flex items-center gap-2">
          <Dialog open={openLabels} onOpenChange={setOpenLabels}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Tags className="w-4 h-4 mr-2" />Manage labels</Button>
            </DialogTrigger>
            <DialogContent className="bg-card">
              <DialogHeader>
                <DialogTitle>Manage labels</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-end">
                  <div className="space-y-1">
                    <Label>Name</Label>
                    <Input placeholder="Label name" value={newLabelName} onChange={(e) => setNewLabelName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Color</Label>
                    <Input type="color" value={newLabelColor} onChange={(e) => setNewLabelColor(e.target.value)} className="h-10 p-1" />
                  </div>
                  <Button onClick={createLabel}>Add</Button>
                </div>

                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Label</TableHead>
                        <TableHead className="w-32">Color</TableHead>
                        <TableHead className="w-40"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(subscriptionLabels || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">No labels</TableCell>
                        </TableRow>
                      ) : (
                        subscriptionLabels.map((l) => (
                          <TableRow key={l._id}>
                            <TableCell className="font-medium">
                              <Input
                                defaultValue={l.name}
                                onBlur={(e) => {
                                  const name = (e.target.value || "").trim();
                                  if (name && name !== l.name) updateLabel(l._id, name, l.color || "#4F46E5");
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="color"
                                defaultValue={l.color || "#4F46E5"}
                                className="h-10 p-1"
                                onBlur={(e) => {
                                  const c = (e.target.value || "").trim();
                                  if (c && c !== (l.color || "#4F46E5")) updateLabel(l._id, l.name, c);
                                }}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="outline" size="sm" onClick={() => deleteLabel(l._id)}><Trash2 className="w-4 h-4 mr-2" />Delete</Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenLabels(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => { setOpenAdd(true); if (!editingSubscription) resetForm(); }}><Plus className="w-4 h-4 mr-2" />Add subscription</Button>
            </DialogTrigger>
            <DialogContent className="bg-card">
              <DialogHeader>
                <DialogTitle>{editingSubscription?._id ? "Edit subscription" : "Add subscription"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="space-y-1"><Label>Title</Label><Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Product / Software</Label><Input placeholder="Product name" value={productName} onChange={(e) => setProductName(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Plan</Label><Input placeholder="Plan name" value={planName} onChange={(e) => setPlanName(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Company Name</Label><Input placeholder="Company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></div>
                  <div className="space-y-1"><Label>WhatsApp Number</Label><Input placeholder="923001234567" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Client (Receivable)</Label>
                    <Select value={clientId} onValueChange={setClientId}>
                      <SelectTrigger><SelectValue placeholder="- Client -" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-">- Client -</SelectItem>
                        {clients.map((c) => (
                          <SelectItem key={c._id} value={c._id}>{clientDisplayName(c)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Vendor (Payable)</Label>
                    <Select value={vendorId} onValueChange={setVendorId}>
                      <SelectTrigger><SelectValue placeholder="- Vendor -" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-">- Vendor -</SelectItem>
                        {vendors.map((v) => (
                          <SelectItem key={v._id} value={v._id}>{v.name || v.company || "Unnamed"}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Status</Label>
                    <Select value={statusSel} onValueChange={setStatusSel}>
                      <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="renewal_due">Renewal due</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label>Payment Method</Label><Input placeholder="Bank / Cash / Stripe" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} /></div>
                  <div className="space-y-1">
                    <Label>Account Manager</Label>
                    <Select value={accountManagerUserId} onValueChange={setAccountManagerUserId}>
                      <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-">-</SelectItem>
                        {(users || []).map((u) => (
                          <SelectItem key={u._id} value={u._id}>{u.name || u.email || u._id}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Type</Label>
                    <Input value={subType} onChange={(e) => setSubType(e.target.value)} placeholder="App" />
                  </div>
                  <div className="space-y-1">
                    <Label>Currency</Label>
                    <Select value={subCurrency} onValueChange={setSubCurrency}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="PKR">PKR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Label</Label>
                    <Select value={label} onValueChange={setLabel}>
                      <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-">-</SelectItem>
                        {subscriptionLabels.map((l) => (
                          <SelectItem key={l._id} value={l.name}>{l.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>First billing date</Label><DatePicker value={firstBillingDate} onChange={setFirstBillingDate} placeholder="Pick date" /></div>
                  <div className="space-y-1"><Label>Next billing date</Label><DatePicker value={nextBillingDate} onChange={setNextBillingDate} placeholder="Pick date" /></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="space-y-1"><Label>Repeat every</Label><Input value={repeatEveryCount} onChange={(e) => setRepeatEveryCount(e.target.value)} placeholder="1" /></div>
                  <div className="space-y-1">
                    <Label>Unit</Label>
                    <Select value={repeatEveryUnit} onValueChange={setRepeatEveryUnit}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">day</SelectItem>
                        <SelectItem value="week">week</SelectItem>
                        <SelectItem value="month">month</SelectItem>
                        <SelectItem value="year">year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label>Cycles</Label><Input value={cycles} onChange={(e) => setCycles(e.target.value)} placeholder="0" /></div>
                  <div className="space-y-1"><Label>Amount</Label><Input placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Tax 1</Label><Input placeholder="0" value={tax1} onChange={(e) => setTax1(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Tax 2</Label><Input placeholder="0" value={tax2} onChange={(e) => setTax2(e.target.value)} /></div>
                </div>

                <div className="space-y-1"><Label>Note</Label><Input placeholder="" value={note} onChange={(e) => setNote(e.target.value)} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setOpenAdd(false); resetForm(); }}>Close</Button>
                <Button onClick={saveSubscription}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="icon"><Calendar className="w-4 h-4" /></Button>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-40"><SelectValue placeholder="- Currency -" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">- Currency -</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="PKR">PKR</SelectItem>
                </SelectContent>
              </Select>
              <Select value={repeat} onValueChange={setRepeat}>
                <SelectTrigger className="w-40"><SelectValue placeholder="- Repeat type -" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">- Repeat type -</SelectItem>
                  <SelectItem value="day">day</SelectItem>
                  <SelectItem value="week">week</SelectItem>
                  <SelectItem value="month">month</SelectItem>
                  <SelectItem value="year">year</SelectItem>
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-40"><SelectValue placeholder="- Status -" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">- Status -</SelectItem>
                  <SelectItem value="pending">pending</SelectItem>
                  <SelectItem value="active">active</SelectItem>
                  <SelectItem value="renewal_due">renewal_due</SelectItem>
                  <SelectItem value="overdue">overdue</SelectItem>
                  <SelectItem value="suspended">suspended</SelectItem>
                  <SelectItem value="cancelled">cancelled</SelectItem>
                  <SelectItem value="expired">expired</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="success" size="icon" onClick={loadSubscriptions} disabled={loading}><RefreshCw className="w-4 h-4" /></Button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9 w-56" />
              </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Subscription ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Product / Plan</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Client/Vendor</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>First billing date</TableHead>
                <TableHead>Next billing date</TableHead>
                <TableHead>Repeat every</TableHead>
                <TableHead>Cycles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Account Manager</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} className="text-center py-10 text-muted-foreground italic bg-muted/5">
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Loading subscriptions...</span>
                      </div>
                    ) : (
                      "No records found matching your filters."
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((s) => {
                  const isCancelled = (s.status || "").toLowerCase() === "cancelled";
                  const labelName = (s.labels || [])[0];
                  return (
                    <TableRow key={String(s._id)}>
                      <TableCell className="whitespace-nowrap font-medium">
                        {s.subscriptionNo ? (
                          <button onClick={() => window.location.href = `/subscriptions/${s._id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                            #{s.subscriptionNo}
                          </button>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <button onClick={() => window.location.href = `/subscriptions/${s._id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                          {s.title || "-"}
                        </button>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        <div className="flex flex-col">
                          <span>{s.productName || "-"}</span>
                          <span className="text-xs text-muted-foreground">{s.planName || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{s.type || "-"}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {s.vendor ? (
                          <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">V: {s.vendor}</Badge>
                        ) : s.client ? (
                          <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">C: {s.client}</Badge>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{s.whatsappNumber || "-"}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{s.firstBillingDate ? new Date(s.firstBillingDate).toISOString().slice(0, 10) : "-"}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{s.nextBillingDate ? new Date(s.nextBillingDate).toISOString().slice(0, 10) : "-"}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{`${s.repeatEveryCount ?? 1} ${s.repeatEveryUnit || "month"}`}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{String(s.cycles ?? 0)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Badge variant={isCancelled ? "secondary" : "default"}>{String(s.status || "active")}</Badge>
                          {labelName ? (
                            <Badge style={{ backgroundColor: labelColorByName.get(labelName) || "#4F46E5" }} className="text-white">{labelName}</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{accountManagerName(s.accountManagerUserId)}</TableCell>
                      <TableCell className="whitespace-nowrap">{typeof s.amount === "number" ? `${s.currency || ""} ${s.amount}` : "0"}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(s)}><Edit className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => cancelOrActivate(s)}><CheckCircle2 className="w-4 h-4 mr-2" />{isCancelled ? "Mark as Active" : "Mark as Cancelled"}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteSubscription(String(s._id))} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between p-3 border-t mt-2">
            <div className="flex items-center gap-2 text-sm">
              <Select value={pageSize} onValueChange={setPageSize}>
                <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span>{total === 0 ? "0-0 / 0" : `${start + 1}-${end} / ${total}`}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page <= 0}>‹</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => (end >= total ? p : p + 1))} disabled={end >= total}>›</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

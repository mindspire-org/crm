import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";
import { MessageSquare, MoreHorizontal, RefreshCw, Plus, Search, Download } from "lucide-react";
import { openWhatsappChat } from "@/lib/whatsapp";

type Appointment = {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  service?: string;
  preferredDate?: string;
  preferredTime?: string;
  timezone?: string;
  message?: string;
  contactMethod?: string;
  company?: string;
  city?: string;
  source?: string;
  status?: "New" | "Contacted" | "Confirmed" | "Completed" | "Cancelled";
  createdAt?: string;
};

const STATUSES: Array<Appointment["status"]> = ["New", "Contacted", "Confirmed", "Completed", "Cancelled"];
const STATUS_ALL = "__all__";

const isValidEmail = (v: string) => {
  const s = String(v || "").trim();
  if (!s) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
};

const normalizePhone = (v: string) => {
  const s = String(v || "").trim();
  if (!s) return "";
  return s.replace(/[\s().-]/g, "");
};

const isValidPhone = (v: string) => {
  const p = normalizePhone(v);
  if (!p) return false;
  const digits = p.replace(/[^0-9]/g, "");
  return digits.length >= 7;
};

export default function Appointments() {
  const location = useLocation();
  const navigate = useNavigate();

  const skipAutoOpenRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Appointment[]>([]);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>(STATUS_ALL);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [openDetail, setOpenDetail] = useState(false);
  const [selected, setSelected] = useState<Appointment | null>(null);

  const sp = useMemo(() => new URLSearchParams(location.search || ""), [location.search]);
  const openId = sp.get("open") || "";

  const load = async (overrides?: { query?: string; status?: string; from?: string; to?: string }) => {
    try {
      setLoading(true);
      const effectiveQuery = overrides?.query ?? query;
      const effectiveStatus = overrides?.status ?? status;
      const effectiveFrom = overrides?.from ?? from;
      const effectiveTo = overrides?.to ?? to;

      const qs = new URLSearchParams();
      if (effectiveQuery.trim()) qs.set("q", effectiveQuery.trim());
      if (effectiveStatus !== STATUS_ALL && effectiveStatus.trim()) qs.set("status", effectiveStatus.trim());
      if (effectiveFrom.trim()) qs.set("from", effectiveFrom.trim());
      if (effectiveTo.trim()) qs.set("to", effectiveTo.trim());
      qs.set("limit", "300");

      const r = await fetch(`${API_BASE}/api/appointments?${qs.toString()}`, { headers: getAuthHeaders() });
      const data = await r.json().catch(() => []);
      if (!r.ok) {
        toast.error(String((data as any)?.error || "Failed to load"));
        return;
      }
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast.error(String(e?.message || "Failed to load"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!openId) return;
    if (skipAutoOpenRef.current) {
      skipAutoOpenRef.current = false;
      return;
    }
    const found = rows.find((r) => String(r._id) === String(openId));
    if (found) {
      setSelected(found);
      setOpenDetail(true);
    }
  }, [openId, rows]);

  const kpis = useMemo(() => {
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);
    const total = rows.length;
    const byStatus = STATUSES.reduce((acc: any, s) => {
      acc[s] = rows.filter((r) => r.status === s).length;
      return acc;
    }, {});

    const todays = rows.filter((r) => String(r.preferredDate || "").slice(0, 10) === todayKey).length;
    return { total, todays, byStatus };
  }, [rows]);

  const applyStatus = async (next: string) => {
    setStatus(next);
    await load({ status: next });
  };

  const openWhatsappDirect = (phoneRaw?: string, name?: string) => {
    const msg = `Hello ${name || ""}, I'm reaching out from our CRM regarding your appointment.`;
    const r = openWhatsappChat(phoneRaw, msg, { defaultCountryCode: "92" });
    if (!r.ok) toast.error("Invalid or missing phone number");
  };
  const statusBadge = (s?: string) => {
    if (s === "Confirmed") return "success" as any;
    if (s === "Completed") return "success" as any;
    if (s === "Contacted") return "secondary" as any;
    if (s === "Cancelled") return "destructive" as any;
    return "outline" as any;
  };

  const openRow = (r: Appointment) => {
    setSelected(r);
    setOpenDetail(true);
    const qs = new URLSearchParams(location.search || "");
    qs.set("open", String(r._id));
    navigate({ pathname: "/appointments", search: `?${qs.toString()}` }, { replace: true });
  };

  const saveSelected = async () => {
    try {
      if (!selected?._id) return;

      const emailTrimmed = String(selected.email || "").trim();
      const phoneTrimmed = String(selected.phone || "").trim();
      const emailOk = emailTrimmed ? isValidEmail(emailTrimmed) : false;
      const phoneOk = phoneTrimmed ? isValidPhone(phoneTrimmed) : false;
      if (emailTrimmed && !emailOk) {
        toast.error("Please enter a valid email address");
        return;
      }
      if (phoneTrimmed && !phoneOk) {
        toast.error("Please enter a valid phone number");
        return;
      }
      if (!emailOk && !phoneOk) {
        toast.error("A valid email or phone number is required for lead conversion");
        return;
      }

      const r = await fetch(`${API_BASE}/api/appointments/${encodeURIComponent(selected._id)}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(selected),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        toast.error(String(data?.error || "Failed to save"));
        return;
      }

      // Prevent the dialog from reopening due to the openId URL param effect while we update state.
      skipAutoOpenRef.current = true;

      if (data?.convertedToLead && data?.appointmentRemoved && data?.leadId) {
        setRows((cur) => cur.filter((x) => x._id !== selected._id));
        toast.success("Converted to lead");
        try {
          localStorage.setItem("crm_leads_changed", String(Date.now()));
        } catch {}
        try {
          window.dispatchEvent(new Event("crm:leads:changed"));
        } catch {}
        const url = `/crm/leads/${encodeURIComponent(String(data.leadId))}`;
        navigate(url);
      } else {
        setRows((cur) => cur.map((x) => (x._id === selected._id ? data : x)));
        toast.success("Saved");
      }
      setOpenDetail(false);
      setSelected(null);

      const qs = new URLSearchParams(location.search || "");
      qs.delete("open");
      navigate({ pathname: "/appointments", search: qs.toString() ? `?${qs.toString()}` : "" }, { replace: true });
    } catch (e: any) {
      toast.error(String(e?.message || "Failed to save"));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold tracking-tight">Appointments</div>
          <div className="text-sm text-muted-foreground">All appointment requests submitted from the public form.</div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.open("/public/appointments/book", "_blank")}>Open booking form</Button>
          <Button onClick={() => load()} disabled={loading}>{loading ? "Loading..." : "Refresh"}</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card
          className={`cursor-pointer transition-colors ${status === STATUS_ALL ? "ring-2 ring-primary/30" : "hover:bg-muted/30"}`}
          onClick={() => applyStatus(STATUS_ALL)}
        >
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="text-2xl font-bold mt-1">{kpis.total}</div>
          </CardContent>
        </Card>

        <Card className="hover:bg-muted/30 transition-colors">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Today</div>
            <div className="text-2xl font-bold mt-1">{kpis.todays}</div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${status === "New" ? "ring-2 ring-primary/30" : "hover:bg-muted/30"}`}
          onClick={() => applyStatus("New")}
        >
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">New</div>
            <div className="text-2xl font-bold mt-1">{kpis.byStatus.New || 0}</div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${status === "Contacted" ? "ring-2 ring-primary/30" : "hover:bg-muted/30"}`}
          onClick={() => applyStatus("Contacted")}
        >
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Contacted</div>
            <div className="text-2xl font-bold mt-1">{kpis.byStatus.Contacted || 0}</div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${status === "Confirmed" ? "ring-2 ring-primary/30" : "hover:bg-muted/30"}`}
          onClick={() => applyStatus("Confirmed")}
        >
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Confirmed</div>
            <div className="text-2xl font-bold mt-1">{kpis.byStatus.Confirmed || 0}</div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${status === "Completed" ? "ring-2 ring-primary/30" : "hover:bg-muted/30"}`}
          onClick={() => applyStatus("Completed")}
        >
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Completed</div>
            <div className="text-2xl font-bold mt-1">{kpis.byStatus.Completed || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card
          className={`cursor-pointer transition-colors ${status === "Cancelled" ? "ring-2 ring-primary/30" : "hover:bg-muted/30"}`}
          onClick={() => applyStatus("Cancelled")}
        >
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Cancelled</div>
            <div className="text-2xl font-bold mt-1">{kpis.byStatus.Cancelled || 0}</div>
          </CardContent>
        </Card>

        <Card className="md:col-span-5">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Quick filters</div>
            <div className="flex flex-wrap gap-2 mt-2">
              <Button variant={status === STATUS_ALL ? "default" : "outline"} size="sm" onClick={() => applyStatus(STATUS_ALL)}>
                All
              </Button>
              {STATUSES.map((s) => (
                <Button
                  key={String(s)}
                  variant={status === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => applyStatus(String(s))}
                >
                  {s}
                  <span className="ml-2 text-xs opacity-80">{kpis.byStatus[s as any] || 0}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name/email/phone/message" />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue placeholder="Status (All)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={STATUS_ALL}>All</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DatePicker value={from} onChange={setFrom} placeholder="From date" />
            <DatePicker value={to} onChange={setTo} placeholder="To date" />
          </div>
          <div className="flex justify-end mb-2">
            <Button variant="outline" onClick={() => load()} disabled={loading}>Apply</Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date/Time</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-muted-foreground">No appointments found.</TableCell></TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r._id} className="cursor-pointer" onClick={() => openRow(r)}>
                    <TableCell>
                      <div className="font-medium">{[r.preferredDate, r.preferredTime].filter(Boolean).join(" ") || "-"}</div>
                      <div className="text-xs text-muted-foreground">{r.timezone || ""}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{r.name || "-"}</div>
                      <div className="text-xs text-muted-foreground">{r.company || r.city || ""}</div>
                    </TableCell>
                    <TableCell>{r.service || "General"}</TableCell>
                    <TableCell>
                      <div className="text-sm">{r.email || ""}</div>
                      <div className="text-xs text-muted-foreground">{r.phone || ""}</div>
                    </TableCell>
                    <TableCell>{r.source || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusBadge(r.status)}>{r.status || "New"}</Badge>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={!String(r.phone || "").trim()}
                          className={
                            String(r.phone || "").trim()
                              ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              : "text-muted-foreground"
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            openWhatsappDirect(r.phone, r.name);
                          }}
                          title={String(r.phone || "").trim() ? "Chat on WhatsApp" : "No phone number"}
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={openDetail} onOpenChange={(o) => {
        setOpenDetail(o);
        if (!o) {
          setSelected(null);
          const qs = new URLSearchParams(location.search || "");
          qs.delete("open");
          navigate({ pathname: "/appointments", search: qs.toString() ? `?${qs.toString()}` : "" }, { replace: true });
        }
      }}>
        <DialogContent className="bg-white dark:bg-slate-900 dark:border-slate-800 max-w-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Appointment</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="grid gap-3 sm:grid-cols-12 text-sm">
              <div className="sm:col-span-3 sm:text-right sm:pt-2 text-muted-foreground">Name</div>
              <div className="sm:col-span-9"><Input value={selected.name || ""} onChange={(e) => setSelected({ ...selected, name: e.target.value })} /></div>

              <div className="sm:col-span-3 sm:text-right sm:pt-2 text-muted-foreground">Email</div>
              <div className="sm:col-span-9">
                <Input value={selected.email || ""} onChange={(e) => setSelected({ ...selected, email: e.target.value })} type="email" />
                {String(selected.email || "").trim() && !isValidEmail(String(selected.email || "")) ? (
                  <div className="mt-1 text-xs text-rose-600 dark:text-rose-400">Enter a valid email address.</div>
                ) : null}
              </div>

              <div className="sm:col-span-3 sm:text-right sm:pt-2 text-muted-foreground">Phone</div>
              <div className="sm:col-span-9">
                <Input value={selected.phone || ""} onChange={(e) => setSelected({ ...selected, phone: e.target.value })} type="tel" />
                {String(selected.phone || "").trim() && !isValidPhone(String(selected.phone || "")) ? (
                  <div className="mt-1 text-xs text-rose-600 dark:text-rose-400">Enter a valid phone number.</div>
                ) : null}
              </div>

              <div className="sm:col-span-3 sm:text-right sm:pt-2 text-muted-foreground">Service</div>
              <div className="sm:col-span-9"><Input value={selected.service || ""} onChange={(e) => setSelected({ ...selected, service: e.target.value })} /></div>

              <div className="sm:col-span-3 sm:text-right sm:pt-2 text-muted-foreground">Preferred date</div>
              <div className="sm:col-span-9">
                <DatePicker
                  value={selected.preferredDate || ""}
                  onChange={(v) => setSelected({ ...selected, preferredDate: v })}
                  placeholder="Pick preferred date"
                />
              </div>

              <div className="sm:col-span-3 sm:text-right sm:pt-2 text-muted-foreground">Preferred time</div>
              <div className="sm:col-span-9"><Input type="time" value={selected.preferredTime || ""} onChange={(e) => setSelected({ ...selected, preferredTime: e.target.value })} /></div>

              <div className="sm:col-span-3 sm:text-right sm:pt-2 text-muted-foreground">Status</div>
              <div className="sm:col-span-9">
                <Select value={selected.status || "New"} onValueChange={(v) => setSelected({ ...selected, status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-3 sm:text-right sm:pt-2 text-muted-foreground">Message</div>
              <div className="sm:col-span-9"><Textarea className="min-h-[120px]" value={selected.message || ""} onChange={(e) => setSelected({ ...selected, message: e.target.value })} /></div>

              <div className="sm:col-span-3 sm:text-right sm:pt-2 text-muted-foreground">Source</div>
              <div className="sm:col-span-9"><Input value={selected.source || ""} onChange={(e) => setSelected({ ...selected, source: e.target.value })} /></div>

              <div className="sm:col-span-3 sm:text-right sm:pt-2 text-muted-foreground">Created</div>
              <div className="sm:col-span-9">
                <div className="pt-2">{selected.createdAt ? new Date(selected.createdAt).toLocaleString() : "-"}</div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDetail(false)}>Close</Button>
            <Button onClick={saveSelected}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

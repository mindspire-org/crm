import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "@/components/ui/sonner";
import type { RecoveryCaseDetail, RecoveryStatus, UserPick } from "./types";
import { createRecoveryEvent, fetchRecoveryCaseDetail, syncSchedulesFromMilestones, updateRecoveryCase } from "./api";
import { toDate, toMoney } from "./format";

const STATUSES: RecoveryStatus[] = [
  "Pending",
  "PartiallyPaid",
  "Overdue",
  "InFollowUp",
  "PaymentPromised",
  "Dispute",
  "Completed",
  "WrittenOff",
];

export function RecoveryCaseDrawer(props: {
  open: boolean;
  invoiceId: string;
  onOpenChange: (open: boolean) => void;
  owners: UserPick[];
  onChanged?: () => void;
}) {
  const { open, invoiceId, onOpenChange, owners, onChanged } = props;

  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<RecoveryCaseDetail | null>(null);
  const [saving, setSaving] = useState(false);

  const ownerOptions = useMemo(() => owners.filter((o) => o?._id), [owners]);

  const load = async () => {
    if (!invoiceId) return;
    try {
      setLoading(true);
      const d = await fetchRecoveryCaseDetail(invoiceId);
      setDetail(d);
    } catch (e: any) {
      toast.error(String(e?.message || "Failed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, invoiceId]);

  const savePatch = async (patch: any) => {
    try {
      setSaving(true);
      await updateRecoveryCase(invoiceId, patch);
      toast.success("Updated");
      await load();
      onChanged?.();
    } catch (e: any) {
      toast.error(String(e?.message || "Failed"));
    } finally {
      setSaving(false);
    }
  };

  const logFollowUp = async () => {
    try {
      const nextFollowUpAt = detail?.case?.nextFollowUpAt ? String(detail.case.nextFollowUpAt).slice(0, 10) : "";
      await createRecoveryEvent(invoiceId, {
        type: "followup",
        title: "Follow-up",
        body: "Follow-up logged",
        meta: { nextFollowUpAt },
      });
      toast.success("Follow-up logged");
      await load();
      onChanged?.();
    } catch (e: any) {
      toast.error(String(e?.message || "Failed"));
    }
  };

  const syncSchedules = async () => {
    try {
      await syncSchedulesFromMilestones(invoiceId);
      toast.success("Schedules synced");
      await load();
      onChanged?.();
    } catch (e: any) {
      toast.error(String(e?.message || "Failed"));
    }
  };

  const computed = detail?.computed;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-slate-900 dark:border-slate-800 max-w-4xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Recovery Case</DialogTitle>
        </DialogHeader>

        {loading || !detail ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Invoice</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Invoice #</div>
                    <div className="font-semibold">{String(detail.invoice?.number || detail.invoice?._id || "-")}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Client</div>
                    <div className="font-semibold">{String(detail.invoice?.client || "-")}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Project</div>
                    <div className="font-semibold">{String(detail.invoice?.project || "-")}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Due</div>
                    <div className="font-semibold">{toDate(detail.invoice?.dueDate || null)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Amount</div>
                    <div className="font-semibold">{toMoney(computed?.amount || 0)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Outstanding</div>
                    <div className="font-semibold">{toMoney(computed?.outstanding || 0)}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 flex-row items-center justify-between">
                  <CardTitle className="text-base">Schedules</CardTitle>
                  <Button size="sm" variant="outline" onClick={syncSchedules}>Sync from milestones</Button>
                </CardHeader>
                <CardContent>
                  {detail.schedules?.length ? (
                    <div className="space-y-2">
                      {detail.schedules.map((s) => (
                        <div key={s._id} className="flex items-center justify-between gap-3 p-3 border rounded-xl">
                          <div>
                            <div className="font-semibold">{s.title || "Milestone"}</div>
                            <div className="text-xs text-muted-foreground">Due: {toDate(s.dueDate || null)}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-black">{toMoney(Number(s.amountDue || 0))}</div>
                            <Badge variant="outline">{s.status || "Pending"}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No schedules yet. Click “Sync from milestones”.</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  {detail.events?.length ? (
                    <div className="space-y-2">
                      {detail.events.map((ev) => (
                        <div key={ev._id} className="p-3 rounded-xl border">
                          <div className="flex items-center justify-between">
                            <div className="font-semibold">{ev.title || ev.type}</div>
                            <div className="text-xs text-muted-foreground">{ev.createdAt ? new Date(ev.createdAt).toLocaleString() : ""}</div>
                          </div>
                          {ev.body ? <div className="text-sm text-muted-foreground mt-1">{ev.body}</div> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No recovery events yet.</div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Recovery Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label>Owner</Label>
                    <Select
                      value={detail.case?.ownerUserId ? String(detail.case.ownerUserId) : "__none__"}
                      onValueChange={(v) => savePatch({ ownerUserId: v === "__none__" ? "" : v })}
                      disabled={saving}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Unassigned</SelectItem>
                        {ownerOptions.map((o) => (
                          <SelectItem key={o._id} value={o._id}>{o.name || o.email || o._id}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={String(detail.case?.status || "Pending")}
                      onValueChange={(v) => savePatch({ status: v })}
                      disabled={saving}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>Next follow-up</Label>
                      <DatePicker
                        value={detail.case?.nextFollowUpAt ? String(detail.case.nextFollowUpAt).slice(0, 10) : ""}
                        onChange={(v) => savePatch({ nextFollowUpAt: v || null })}
                        placeholder="Pick"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Promised date</Label>
                      <DatePicker
                        value={detail.case?.nextExpectedPaymentAt ? String(detail.case.nextExpectedPaymentAt).slice(0, 10) : ""}
                        onChange={(v) => savePatch({ nextExpectedPaymentAt: v || null })}
                        placeholder="Pick"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={String(detail.case?.notes || "")}
                      onChange={(e) => setDetail((d) => (d ? { ...d, case: { ...d.case, notes: e.target.value } } : d))}
                      className="min-h-[120px]"
                    />
                    <Button size="sm" onClick={() => savePatch({ notes: String(detail.case?.notes || "") })} disabled={saving}>
                      Save notes
                    </Button>
                  </div>

                  <div className="pt-2 border-t">
                    <Button variant="outline" onClick={logFollowUp} disabled={saving} className="w-full">Log follow-up</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

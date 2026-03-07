import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { StickyNote } from "lucide-react";
import type { RecoveryCaseRow, RecoveryStatus, UserPick } from "./types";
import { daysOverdue, toDate, toMoney } from "./format";

function statusBadge(status: RecoveryStatus) {
  if (status === "Completed") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  if (status === "PartiallyPaid") return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  if (status === "PaymentPromised") return "bg-indigo-500/10 text-indigo-600 border-indigo-500/20";
  if (status === "InFollowUp") return "bg-purple-500/10 text-purple-600 border-purple-500/20";
  if (status === "Dispute") return "bg-slate-500/10 text-slate-700 border-slate-500/20";
  if (status === "WrittenOff") return "bg-slate-500/10 text-slate-700 border-slate-500/20";
  if (status === "Overdue") return "bg-rose-500/10 text-rose-600 border-rose-500/20";
  return "bg-slate-500/10 text-slate-700 border-slate-500/20";
}

export function RecoveryRegisterTable(props: {
  rows: RecoveryCaseRow[];
  loading?: boolean;
  onOpen: (invoiceId: string) => void;
  ownerById: Map<string, UserPick>;
}) {
  const { rows, loading, onOpen, ownerById } = props;

  const sectionCard =
    "border-0 shadow-xl bg-card/40 backdrop-blur-xl hover:shadow-2xl transition-all duration-500 rounded-3xl border border-white/10 dark:border-white/5";

  return (
    <Card className={sectionCard}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">Recovery Register</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border border-border/50">
          <div className="max-h-[620px] overflow-auto">
            <table className="min-w-[1200px] w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/30">
                <tr className="text-left">
                  <th className="py-4 px-6 font-bold uppercase tracking-widest text-[10px] text-muted-foreground/70">Invoice</th>
                  <th className="py-4 px-6 font-bold uppercase tracking-widest text-[10px] text-muted-foreground/70">Client</th>
                  <th className="py-4 px-6 font-bold uppercase tracking-widest text-[10px] text-muted-foreground/70">Project</th>
                  <th className="py-4 px-6 font-bold uppercase tracking-widest text-[10px] text-muted-foreground/70">Due</th>
                  <th className="py-4 px-6 font-bold uppercase tracking-widest text-[10px] text-muted-foreground/70 text-right">Outstanding</th>
                  <th className="py-4 px-6 font-bold uppercase tracking-widest text-[10px] text-muted-foreground/70">Recovery</th>
                  <th className="py-4 px-6 font-bold uppercase tracking-widest text-[10px] text-muted-foreground/70">Owner</th>
                  <th className="py-4 px-6 font-bold uppercase tracking-widest text-[10px] text-muted-foreground/70">Next follow-up</th>
                  <th className="py-4 px-6 font-bold uppercase tracking-widest text-[10px] text-muted-foreground/70">Overdue</th>
                  <th className="py-4 px-6 font-bold uppercase tracking-widest text-[10px] text-muted-foreground/70">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const owner = r.recovery?.ownerUserId ? ownerById.get(r.recovery.ownerUserId) : undefined;
                  const od = r.overdue ? daysOverdue(r.dueDate) : 0;

                  return (
                    <tr key={r.invoiceId} className="group border-b border-border/40 hover:bg-indigo-500/[0.03] transition-colors">
                      <td className="py-4 px-6 whitespace-nowrap">
                        <Link to={`/invoices/${encodeURIComponent(r.invoiceId)}`} className="text-indigo-600 font-bold hover:text-indigo-800 transition-colors">
                          {r.invoiceNumber || r.invoiceId}
                        </Link>
                      </td>
                      <td className="py-4 px-6 font-medium">{r.clientName || "-"}</td>
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900 dark:text-white">{r.projectName || "-"}</div>
                        <div className="text-xs text-muted-foreground mt-1">Issued: {toDate(r.issueDate)}</div>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap text-muted-foreground font-medium">{toDate(r.dueDate)}</td>
                      <td className="py-4 px-6 text-right font-black text-slate-900 dark:text-white tracking-tight">{toMoney(r.outstanding)}</td>
                      <td className="py-4 px-6">
                        <Badge
                          className={cn(
                            "font-bold text-[10px] px-2.5 py-0.5 uppercase tracking-wider",
                            statusBadge(r.effectiveStatus)
                          )}
                          variant="outline"
                        >
                          {r.effectiveStatus}
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-medium">{owner?.name || owner?.email || (r.recovery?.ownerUserId ? "Assigned" : "Unassigned")}</div>
                        <div className="text-xs text-muted-foreground">{owner?.role || ""}</div>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="font-medium">{toDate(r.recovery?.nextFollowUpAt || null)}</div>
                        {r.recovery?.nextExpectedPaymentAt ? (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <StickyNote className="w-3 h-3" /> Promise: {toDate(r.recovery.nextExpectedPaymentAt)}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-4 px-6 text-right">
                        {r.overdue ? (
                          <Badge className="bg-rose-600 text-white font-black px-2 py-0.5 border-0 shadow-lg shadow-rose-500/20">
                            {od}D OVERDUE
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="font-bold text-muted-foreground/60 px-2 py-0.5 bg-slate-100 border-0">
                            Scheduled
                          </Badge>
                        )}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <Button size="sm" variant="outline" onClick={() => onOpen(r.invoiceId)}>Open</Button>
                      </td>
                    </tr>
                  );
                })}

                {!loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                      No recovery cases found for current filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

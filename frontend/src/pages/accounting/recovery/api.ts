import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";
import type { RecoveryCaseDetail, RecoveryCaseRow, RecoveryStatus, UserPick } from "./types";

export async function fetchRecoveryCases(params: {
  q?: string;
  status?: string;
  ownerUserId?: string;
  overdueOnly?: boolean;
  nextFollowUpFrom?: string;
  nextFollowUpTo?: string;
  limit?: number;
}) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.status && params.status !== "all") sp.set("status", params.status);
  if (params.ownerUserId) sp.set("ownerUserId", params.ownerUserId);
  if (params.overdueOnly) sp.set("overdueOnly", "1");
  if (params.nextFollowUpFrom) sp.set("nextFollowUpFrom", params.nextFollowUpFrom);
  if (params.nextFollowUpTo) sp.set("nextFollowUpTo", params.nextFollowUpTo);
  if (params.limit) sp.set("limit", String(params.limit));

  const r = await fetch(`${API_BASE}/api/accounting/recovery/cases?${sp.toString()}`, { headers: getAuthHeaders() });
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error(String(d?.error || "Failed to load recovery cases"));
  return (Array.isArray(d?.rows) ? d.rows : []) as RecoveryCaseRow[];
}

export async function fetchRecoveryCaseDetail(invoiceId: string) {
  const r = await fetch(`${API_BASE}/api/accounting/recovery/cases/${encodeURIComponent(invoiceId)}`, {
    headers: getAuthHeaders(),
  });
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error(String(d?.error || "Failed to load recovery case"));
  return d as RecoveryCaseDetail;
}

export async function updateRecoveryCase(invoiceId: string, patch: {
  ownerUserId?: string;
  status?: RecoveryStatus;
  priority?: "low" | "normal" | "high" | "critical";
  riskFlags?: string[];
  nextFollowUpAt?: string | null;
  nextExpectedPaymentAt?: string | null;
  notes?: string;
}) {
  const r = await fetch(`${API_BASE}/api/accounting/recovery/cases/${encodeURIComponent(invoiceId)}`, {
    method: "PUT",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(patch),
  });
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error(String(d?.error || "Failed to update recovery case"));
  return d;
}

export async function createRecoveryEvent(invoiceId: string, payload: {
  type: string;
  title?: string;
  body?: string;
  scheduleId?: string;
  meta?: any;
}) {
  const r = await fetch(`${API_BASE}/api/accounting/recovery/cases/${encodeURIComponent(invoiceId)}/events`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error(String(d?.error || "Failed to log event"));
  return d;
}

export async function syncSchedulesFromMilestones(invoiceId: string) {
  const r = await fetch(
    `${API_BASE}/api/accounting/recovery/cases/${encodeURIComponent(invoiceId)}/schedules/sync-from-milestones`,
    { method: "POST", headers: getAuthHeaders() }
  );
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error(String(d?.error || "Failed to sync schedules"));
  return d;
}

export async function fetchUsers(search?: string) {
  const sp = new URLSearchParams();
  if (search) sp.set("search", search);
  sp.set("limit", "50");
  const r = await fetch(`${API_BASE}/api/users?${sp.toString()}`, { headers: getAuthHeaders() });
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error(String(d?.error || "Failed to load users"));
  return (Array.isArray(d) ? d : []) as UserPick[];
}

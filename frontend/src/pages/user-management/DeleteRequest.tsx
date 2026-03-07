import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronDown, RefreshCw, Settings, MoreHorizontal } from "lucide-react";

import { toast } from "@/components/ui/sonner";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";

type DeleteAccountRequestStatus = "pending" | "approved" | "rejected";
type DeleteAccountRequestDoc = {
  _id: string;
  userId?: { _id: string; name?: string; email?: string; role?: string } | string;
  reason?: string;
  status: DeleteAccountRequestStatus;
  createdAt?: string;
  updatedAt?: string;
  processedAt?: string;
};

export default function DeleteRequest() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | DeleteAccountRequestStatus>("all");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DeleteAccountRequestDoc[]>([]);
  const [openSettings, setOpenSettings] = useState(false);
  const [openColumns, setOpenColumns] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(["createdAt", "processedAt", "reason", "status"])
  );

  const loadRows = async () => {
    setLoading(true);
    try {
      const qp = new URLSearchParams();
      if (query.trim()) qp.set("q", query.trim());
      if (status !== "all") qp.set("status", status);

      const res = await fetch(`${API_BASE}/api/delete-account-requests?${qp.toString()}`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load delete requests");
      setRows(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load delete requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const formatDateTime = (iso?: string) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString();
  };

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const u = typeof r.userId === "string" ? null : r.userId;
      const hay = `${String(u?.name || "")} ${String(u?.email || "")} ${String(u?.role || "")} ${String(r.reason || "")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query]);

  const visibleIds = useMemo(() => filteredRows.map((r) => r._id).filter((x): x is string => Boolean(x)), [filteredRows]);
  const selectedVisibleCount = useMemo(() => {
    let c = 0;
    visibleIds.forEach((id) => {
      if (selectedIds.has(id)) c += 1;
    });
    return c;
  }, [selectedIds, visibleIds]);

  const selectAllState: boolean | "indeterminate" = useMemo(() => {
    if (visibleIds.length === 0) return false;
    if (selectedVisibleCount === 0) return false;
    if (selectedVisibleCount === visibleIds.length) return true;
    return "indeterminate";
  }, [selectedVisibleCount, visibleIds.length]);

  const toggleSelectAllVisible = (next: boolean) => {
    if (!next) {
      setSelectedIds((prev) => {
        const s = new Set(prev);
        visibleIds.forEach((id) => s.delete(id));
        return s;
      });
      return;
    }
    setSelectedIds((prev) => {
      const s = new Set(prev);
      visibleIds.forEach((id) => s.add(id));
      return s;
    });
  };

  const toggleRowSelected = (id: string, next: boolean) => {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (next) s.add(id);
      else s.delete(id);
      return s;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const toggleColumn = (k: string) => {
    setVisibleColumns((prev) => {
      const s = new Set(prev);
      if (s.has(k)) s.delete(k);
      else s.add(k);
      return s;
    });
  };

  const downloadTextFile = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const toCsvCell = (value: unknown) => {
    const s = String(value ?? "");
    if (/[\n\r",]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const exportCsv = (onlySelected = false) => {
    const source = onlySelected ? filteredRows.filter((r) => selectedIds.has(r._id)) : filteredRows;
    if (onlySelected && source.length === 0) {
      toast.error("No requests selected");
      return;
    }
    const header = ["User", "Role", "Requested At", "Processed At", "Reason", "Status"].map(toCsvCell).join(",");
    const lines = source.map((r) => {
      const u = typeof r.userId === "string" ? null : r.userId;
      const name = String(u?.name || u?.email || "User").trim() || "User";
      const role = String(u?.role || "-").trim() || "-";
      return [name, role, formatDateTime(r.createdAt), formatDateTime(r.processedAt || r.updatedAt), r.reason || "-", r.status]
        .map(toCsvCell)
        .join(",");
    });
    const csv = [header, ...lines].join("\n");
    downloadTextFile(
      `delete-requests${onlySelected ? "-selected" : ""}-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
      "text/csv;charset=utf-8"
    );
    toast.success("Exported CSV");
  };

  const exportExcel = () => {
    const tableRows = filteredRows
      .map((r) => {
        const u = typeof r.userId === "string" ? null : r.userId;
        const name = String(u?.name || u?.email || "User").replace(/</g, "&lt;");
        const role = String(u?.role || "-").replace(/</g, "&lt;");
        const requestedAt = String(formatDateTime(r.createdAt)).replace(/</g, "&lt;");
        const processedAt = String(formatDateTime(r.processedAt || r.updatedAt)).replace(/</g, "&lt;");
        const reason = String(r.reason || "-").replace(/</g, "&lt;");
        const st = String(r.status || "-").replace(/</g, "&lt;");
        return `<tr><td>${name}</td><td>${role}</td><td>${requestedAt}</td><td>${processedAt}</td><td>${reason}</td><td>${st}</td></tr>`;
      })
      .join("");

    const html =
      `<html><head><meta charset="utf-8" /></head><body>` +
      `<table border="1"><thead><tr><th>User</th><th>Role</th><th>Requested At</th><th>Processed At</th><th>Reason</th><th>Status</th></tr></thead><tbody>${tableRows}</tbody></table>` +
      `</body></html>`;

    downloadTextFile(
      `delete-requests-${new Date().toISOString().slice(0, 10)}.xls`,
      html,
      "application/vnd.ms-excel;charset=utf-8"
    );
    toast.success("Exported Excel");
  };

  const exportPdf = () => {
    const tableRows = filteredRows
      .map((r) => {
        const u = typeof r.userId === "string" ? null : r.userId;
        const name = String(u?.name || u?.email || "User").replace(/</g, "&lt;");
        const role = String(u?.role || "-").replace(/</g, "&lt;");
        const requestedAt = String(formatDateTime(r.createdAt)).replace(/</g, "&lt;");
        const processedAt = String(formatDateTime(r.processedAt || r.updatedAt)).replace(/</g, "&lt;");
        const reason = String(r.reason || "-").replace(/</g, "&lt;");
        const st = String(r.status || "-").replace(/</g, "&lt;");
        return `<tr><td>${name}</td><td>${role}</td><td>${requestedAt}</td><td>${processedAt}</td><td>${reason}</td><td>${st}</td></tr>`;
      })
      .join("");

    const filename = `delete-requests-${new Date().toISOString().slice(0, 10)}.pdf`;
    const html =
      `<html><head><meta charset="utf-8" /><title>Delete Requests</title>` +
      `<style>` +
      `body{font-family:Arial, sans-serif; padding:16px;}` +
      `.toolbar{display:flex; gap:8px; justify-content:flex-end; margin-bottom:12px;}` +
      `.btn{appearance:none; border:1px solid #d1d5db; background:#ffffff; padding:8px 10px; border-radius:8px; font-size:12px; cursor:pointer;}` +
      `.btn.primary{border-color:#2563eb; background:#2563eb; color:#fff;}` +
      `.note{font-size:12px; color:#6b7280; margin:0 0 12px;}` +
      `table{width:100%; border-collapse:collapse;}` +
      `th,td{border:1px solid #e5e7eb; padding:8px; font-size:12px; vertical-align:top;}` +
      `th{background:#f3f4f6; text-align:left;}` +
      `@media print {.toolbar,.note{display:none !important;} body{padding:0;}}` +
      `</style>` +
      `</head><body>` +
      `<div class="toolbar">` +
      `<button class="btn" onclick="window.print()">Print</button>` +
      `<button class="btn primary" id="downloadBtn">Download PDF</button>` +
      `</div>` +
      `<p class="note">Tip: if download is blocked, allow popups and try again.</p>` +
      `<div id="pdf-root">` +
      `<h2 style="margin:0 0 12px">Delete Account Requests</h2>` +
      `<table><thead><tr><th>User</th><th>Role</th><th>Requested At</th><th>Processed At</th><th>Reason</th><th>Status</th></tr></thead><tbody>${tableRows}</tbody></table>` +
      `</div>` +
      `<script src="https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js"></script>` +
      `<script>` +
      `document.getElementById('downloadBtn').addEventListener('click', function(){` +
      `  try {` +
      `    var el = document.getElementById('pdf-root');` +
      `    if (!window.html2pdf) { alert('PDF generator failed to load.'); return; }` +
      `    window.html2pdf().set({ margin: 0.3, filename: ${JSON.stringify(filename)}, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } }).from(el).save();` +
      `  } catch (e) { alert('Failed to generate PDF.'); }` +
      `});` +
      `</script>` +
      `</body></html>`;

    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Popup blocked. Allow popups to export PDF.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
  };

  const updateStatus = async (id: string, next: DeleteAccountRequestStatus) => {
    try {
      const res = await fetch(`${API_BASE}/api/delete-account-requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ status: next }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to update request");
      toast.success("Updated");
      await loadRows();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update request");
    }
  };

  const deleteRequest = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/delete-account-requests/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to delete request");
      toast.success("Deleted");
      await loadRows();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete request");
    }
  };

  const bulkUpdateStatus = async (next: DeleteAccountRequestStatus) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast.error("No requests selected");
      return;
    }
    setSaving(true);
    try {
      for (const id of ids) {
        const res = await fetch(`${API_BASE}/api/delete-account-requests/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({ status: next }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || "Failed to update one or more requests");
      }
      toast.success("Updated selected requests");
      clearSelection();
      await loadRows();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update selected requests");
    } finally {
      setSaving(false);
    }
  };

  const bulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast.error("No requests selected");
      return;
    }
    setSaving(true);
    try {
      for (const id of ids) {
        const res = await fetch(`${API_BASE}/api/delete-account-requests/${id}`, {
          method: "DELETE",
          headers: getAuthHeaders(),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || "Failed to delete one or more requests");
      }
      toast.success("Deleted selected requests");
      clearSelection();
      await loadRows();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete selected requests");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-sm text-muted-foreground">Delete Account Request</h1>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">Export <ChevronDown className="w-4 h-4 ml-2"/></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); exportCsv(false); }}>CSV</DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); exportExcel(); }}>Excel</DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); exportPdf(); }}>PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button type="button" variant="outline" size="icon" onClick={loadRows} disabled={loading}>
            <RefreshCw className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={() => setOpenSettings(true)}><Settings className="w-4 h-4"/></Button>

          <Dialog open={openSettings} onOpenChange={setOpenSettings}>
            <DialogContent className="bg-card sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Settings</DialogTitle>
                <DialogDescription>Quick actions for this page.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setStatus("all");
                      toast.success("Filters reset");
                    }}
                  >
                    Reset filters
                  </Button>
                  <Button variant="outline" type="button" onClick={loadRows} disabled={loading}>Refresh list</Button>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setVisibleColumns(new Set(["createdAt", "processedAt", "reason", "status"]));
                      toast.success("Columns reset");
                    }}
                  >
                    Reset columns
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setOpenSettings(false);
                      setOpenColumns(true);
                    }}
                  >
                    Manage columns
                  </Button>
                  {selectedIds.size ? (
                    <>
                      <Button variant="outline" type="button" onClick={clearSelection}>Clear selection</Button>
                      <Button variant="outline" type="button" onClick={() => exportCsv(true)}>Export selected</Button>
                    </>
                  ) : (
                    <div className="text-xs text-muted-foreground">Select rows to enable selection actions.</div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setOpenSettings(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search" value={query} onChange={(e)=>setQuery(e.target.value)} className="pl-9" />
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Button variant="outline">Filter</Button>
              <Button variant="outline">11 Nov 25 - 10 Dec 25</Button>
            </div>
            <div className="flex items-center gap-2">
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Status"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={() => setOpenColumns(true)}>Manage Columns</Button>
            </div>
          </div>

          {selectedIds.size ? (
            <div className="mb-3 rounded-lg border bg-muted/20 px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-sm">
                <span className="font-medium">{selectedIds.size}</span> selected
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => exportCsv(true)}>Export selected (CSV)</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => bulkUpdateStatus("approved")} disabled={saving}>Approve selected</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => bulkUpdateStatus("rejected")} disabled={saving}>Reject selected</Button>
                <Button type="button" variant="destructive" size="sm" onClick={bulkDelete} disabled={saving}>Delete selected</Button>
                <Button type="button" variant="outline" size="sm" onClick={clearSelection}>Clear selection</Button>
              </div>
            </div>
          ) : null}

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-8">
                  <Checkbox
                    checked={selectAllState}
                    onCheckedChange={(v) => toggleSelectAllVisible(Boolean(v))}
                  />
                </TableHead>
                <TableHead>User Name</TableHead>
                {visibleColumns.has("createdAt") ? <TableHead>Requisition Date</TableHead> : null}
                {visibleColumns.has("processedAt") ? <TableHead>Delete Request Date</TableHead> : null}
                {visibleColumns.has("reason") ? <TableHead>Reason for Deletion</TableHead> : null}
                {visibleColumns.has("status") ? <TableHead>Status</TableHead> : null}
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((r)=> {
                const u = typeof r.userId === "string" ? null : r.userId;
                const name = String(u?.name || u?.email || "User").trim() || "User";
                const role = String(u?.role || "").trim() || "-";
                const statusLabel = r.status === "pending" ? "Pending" : r.status === "approved" ? "Approved" : "Rejected";
                const badgeVariant = r.status === "pending" ? "secondary" : r.status === "approved" ? "success" : "destructive";

                return (
                <TableRow key={r._id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(r._id)}
                      onCheckedChange={(v) => toggleRowSelected(r._id, Boolean(v))}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8"><AvatarFallback>{name.split(' ').map(n=>n[0]).join('').slice(0,2)}</AvatarFallback></Avatar>
                      <div>
                        <div className="font-medium">{name}</div>
                        <div className="text-xs text-muted-foreground">{role}</div>
                      </div>
                    </div>
                  </TableCell>
                  {visibleColumns.has("createdAt") ? <TableCell>{formatDateTime(r.createdAt)}</TableCell> : null}
                  {visibleColumns.has("processedAt") ? <TableCell>{formatDateTime(r.processedAt || r.updatedAt)}</TableCell> : null}
                  {visibleColumns.has("reason") ? <TableCell className="text-muted-foreground">{r.reason || "-"}</TableCell> : null}
                  {visibleColumns.has("status") ? (
                    <TableCell>
                      <Badge variant={badgeVariant as any}>{statusLabel}</Badge>
                    </TableCell>
                  ) : null}
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm"><MoreHorizontal className="w-4 h-4"/></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => updateStatus(r._id, "approved")}>
                          Approve
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatus(r._id, "rejected")}>
                          Reject
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteRequest(r._id)}>
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
              })}
            </TableBody>
          </Table>

          <Dialog open={openColumns} onOpenChange={setOpenColumns}>
            <DialogContent className="bg-card sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Manage columns</DialogTitle>
                <DialogDescription>Show or hide columns in the Delete Requests table.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={visibleColumns.has("createdAt")} onCheckedChange={() => toggleColumn("createdAt")} />
                  <span>Requisition date</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={visibleColumns.has("processedAt")} onCheckedChange={() => toggleColumn("processedAt")} />
                  <span>Delete request date</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={visibleColumns.has("reason")} onCheckedChange={() => toggleColumn("reason")} />
                  <span>Reason</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={visibleColumns.has("status")} onCheckedChange={() => toggleColumn("status")} />
                  <span>Status</span>
                </label>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setVisibleColumns(new Set(["createdAt", "processedAt", "reason", "status"]));
                  }}
                >
                  Reset
                </Button>
                <Button type="button" onClick={() => setOpenColumns(false)}>Done</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}

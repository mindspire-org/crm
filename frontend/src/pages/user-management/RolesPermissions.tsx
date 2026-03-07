import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, ChevronDown, RefreshCw, Settings, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";
import { toast } from "@/components/ui/sonner";

type RoleRow = {
  _id: string;
  name: string;
  description?: string;
  permissions?: string[];
  createdAt?: string;
  updatedAt?: string;
};

const ALL_PERMS: Array<{ key: string; label: string }> = [
  { key: "crm", label: "CRM" },
  { key: "hrm", label: "HRM" },
  { key: "projects", label: "Projects" },
  { key: "prospects", label: "Prospects" },
  { key: "sales", label: "Sales" },
  { key: "reports", label: "Reports" },
  { key: "clients", label: "Clients" },
  { key: "tasks", label: "Tasks" },
  { key: "messages", label: "Messages" },
  { key: "tickets", label: "Tickets" },
  { key: "announcements", label: "Announcements" },
  { key: "calendar", label: "Calendar" },
  { key: "events", label: "Events" },
  { key: "subscriptions", label: "Subscriptions" },
  { key: "notes", label: "Notes" },
  { key: "files", label: "Files" },
];

export default function RolesPermissions() {
  const [query, setQuery] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [openColumns, setOpenColumns] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(["description", "permissions", "createdAt"])
  );

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<RoleRow[]>([]);

  const [addName, setAddName] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addPerms, setAddPerms] = useState<Set<string>>(new Set());
  const [addTemplate, setAddTemplate] = useState("-");

  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState<RoleRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPerms, setEditPerms] = useState<Set<string>>(new Set());

  const [openDelete, setOpenDelete] = useState(false);
  const [deleting, setDeleting] = useState<RoleRow | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders({ "Content-Type": "application/json" });
      const res = await fetch(`${API_BASE}/api/roles`, { headers });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load roles");
      setItems(Array.isArray(json) ? json : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((r) => {
      return (
        String(r.name || "").toLowerCase().includes(q) ||
        String(r.description || "").toLowerCase().includes(q)
      );
    });
  }, [items, query]);

  const visibleIds = useMemo(() => filtered.map((r) => r._id).filter((x): x is string => Boolean(x)), [filtered]);
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

  const exportSelectedCsv = () => {
    const rows = filtered.filter((r) => selectedIds.has(r._id));
    if (rows.length === 0) {
      toast.error("No roles selected");
      return;
    }
    const header = ["Name", "Description", "Permissions"].map(toCsvCell).join(",");
    const lines = rows.map((r) =>
      [r.name || "", r.description || "", (r.permissions || []).join("|")].map(toCsvCell).join(",")
    );
    const csv = [header, ...lines].join("\n");
    downloadTextFile(`roles-selected-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8");
    toast.success("Exported selected roles");
  };

  const doBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast.error("No roles selected");
      return;
    }
    setSaving(true);
    try {
      for (const id of ids) {
        const headers = getAuthHeaders({ "Content-Type": "application/json" });
        const res = await fetch(`${API_BASE}/api/roles/${id}`, {
          method: "DELETE",
          headers,
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || "Failed to delete one or more roles");
      }
      toast.success("Deleted selected roles");
      clearSelection();
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete selected roles");
    } finally {
      setSaving(false);
    }
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

  const exportCsv = () => {
    const rows = filtered;
    const header = ["Name", "Description", "Permissions"].map(toCsvCell).join(",");
    const lines = rows.map((r) =>
      [r.name || "", r.description || "", (r.permissions || []).join("|")].map(toCsvCell).join(",")
    );
    const csv = [header, ...lines].join("\n");
    downloadTextFile(`roles-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8");
    toast.success("Exported CSV");
  };

  const exportExcel = () => {
    const rows = filtered;
    const tableRows = rows
      .map(
        (r) =>
          `<tr><td>${String(r.name || "").replace(/</g, "&lt;")}</td><td>${String(r.description || "").replace(/</g, "&lt;")}</td><td>${String((r.permissions || []).join(", ") || "").replace(/</g, "&lt;")}</td></tr>`
      )
      .join("");

    const html =
      `<html><head><meta charset="utf-8" /></head><body>` +
      `<table border="1"><thead><tr><th>Name</th><th>Description</th><th>Permissions</th></tr></thead><tbody>${tableRows}</tbody></table>` +
      `</body></html>`;

    downloadTextFile(
      `roles-${new Date().toISOString().slice(0, 10)}.xls`,
      html,
      "application/vnd.ms-excel;charset=utf-8"
    );
    toast.success("Exported Excel");
  };

  const exportPdf = () => {
    const rows = filtered;
    const tableRows = rows
      .map(
        (r) =>
          `<tr><td>${String(r.name || "").replace(/</g, "&lt;")}</td><td>${String(r.description || "").replace(/</g, "&lt;")}</td><td>${String((r.permissions || []).join(", ") || "").replace(/</g, "&lt;")}</td></tr>`
      )
      .join("");

    const filename = `roles-${new Date().toISOString().slice(0, 10)}.pdf`;
    const html =
      `<html><head><meta charset="utf-8" /><title>Roles</title>` +
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
      `<h2 style="margin:0 0 12px">Roles & Permissions</h2>` +
      `<table><thead><tr><th>Name</th><th>Description</th><th>Permissions</th></tr></thead><tbody>${tableRows}</tbody></table>` +
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

  const toggleAddPerm = (k: string) => {
    setAddPerms((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const toggleEditPerm = (k: string) => {
    setEditPerms((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const openEditRole = (r: RoleRow) => {
    setEditing(r);
    setEditName(String(r.name || ""));
    setEditDescription(String(r.description || ""));
    setEditPerms(new Set(Array.isArray(r.permissions) ? r.permissions : []));
    setOpenEdit(true);
  };

  const saveAdd = async () => {
    const name = addName.trim();
    if (!name) throw new Error("Role name is required");
    const headers = getAuthHeaders({ "Content-Type": "application/json" });
    const res = await fetch(`${API_BASE}/api/roles`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name,
        description: addDescription.trim(),
        permissions: Array.from(addPerms),
      }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error || "Failed to create role");
    setOpenAdd(false);
    setAddName("");
    setAddDescription("");
    setAddPerms(new Set());
    setAddTemplate("-");
    await load();
  };

  const applyTemplate = (key: string) => {
    setAddTemplate(key);
    if (key === "-") return;
    return;
  };

  const saveEdit = async () => {
    if (!editing?._id) return;
    const name = editName.trim();
    if (!name) throw new Error("Role name is required");
    const headers = getAuthHeaders({ "Content-Type": "application/json" });
    const res = await fetch(`${API_BASE}/api/roles/${editing._id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        name,
        description: editDescription.trim(),
        permissions: Array.from(editPerms),
      }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error || "Failed to update role");
    setOpenEdit(false);
    setEditing(null);
    setEditName("");
    setEditDescription("");
    setEditPerms(new Set());
    await load();
  };

  const confirmDelete = (r: RoleRow) => {
    setDeleting(r);
    setOpenDelete(true);
  };

  const doDelete = async () => {
    if (!deleting?._id) return;
    const headers = getAuthHeaders({ "Content-Type": "application/json" });
    const res = await fetch(`${API_BASE}/api/roles/${deleting._id}`, {
      method: "DELETE",
      headers,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error || "Failed to delete role");
    setOpenDelete(false);
    setDeleting(null);
    await load();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-sm text-muted-foreground">Roles & Permissions</h1>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">Export <ChevronDown className="w-4 h-4 ml-2"/></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); exportCsv(); }}>CSV</DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); exportExcel(); }}>Excel</DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); exportPdf(); }}>PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button type="button" variant="outline" size="icon" onClick={load} disabled={loading}><RefreshCw className="w-4 h-4"/></Button>
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
                      toast.success("Filters reset");
                    }}
                  >
                    Reset filters
                  </Button>
                  <Button variant="outline" type="button" onClick={load} disabled={loading}>Refresh list</Button>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setVisibleColumns(new Set(["description", "permissions", "createdAt"]));
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
                      <Button variant="outline" type="button" onClick={exportSelectedCsv}>Export selected</Button>
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

          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild><Button className="bg-red-500 hover:bg-red-500/90" size="sm"><Plus className="w-4 h-4 mr-2"/>Add New Role</Button></DialogTrigger>
            <DialogContent className="bg-card">
              <DialogHeader><DialogTitle>Add role</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-1">
                  <div className="text-xs text-muted-foreground">Template</div>
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={addTemplate}
                    onChange={(e) => applyTemplate(e.target.value)}
                  >
                    <option value="-">Custom</option>
                  </select>
                </div>
                <Input placeholder="Role name" value={addName} onChange={(e)=>setAddName(e.target.value)} />
                <Input placeholder="Description" value={addDescription} onChange={(e)=>setAddDescription(e.target.value)} />
                <div className="grid sm:grid-cols-2 gap-2 pt-2 border-t">
                  {ALL_PERMS.map((p) => (
                    <label key={p.key} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={addPerms.has(p.key)} onCheckedChange={() => toggleAddPerm(p.key)} />
                      <span>{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={()=>setOpenAdd(false)}>Close</Button>
                <Button onClick={async ()=>{ try { await saveAdd(); toast.success('Role created'); } catch (e:any) { toast.error(e?.message || 'Failed'); } }}>Save</Button>
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

          {selectedIds.size ? (
            <div className="mb-3 rounded-lg border bg-muted/20 px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-sm">
                <span className="font-medium">{selectedIds.size}</span> selected
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={exportSelectedCsv}>Export selected (CSV)</Button>
                <Button type="button" variant="destructive" size="sm" onClick={doBulkDelete} disabled={saving}>Delete selected</Button>
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
                <TableHead>Role Name</TableHead>
                {visibleColumns.has("description") ? <TableHead>Description</TableHead> : null}
                {visibleColumns.has("permissions") ? <TableHead>Permissions</TableHead> : null}
                {visibleColumns.has("createdAt") ? <TableHead>Created</TableHead> : null}
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r)=> (
                <TableRow key={r._id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(r._id)}
                      onCheckedChange={(v) => toggleRowSelected(r._id, Boolean(v))}
                    />
                  </TableCell>
                  <TableCell>{r.name}</TableCell>
                  {visibleColumns.has("description") ? <TableCell className="text-muted-foreground">{r.description || "-"}</TableCell> : null}
                  {visibleColumns.has("permissions") ? <TableCell className="text-muted-foreground">{Array.isArray(r.permissions) && r.permissions.length ? r.permissions.join(", ") : "-"}</TableCell> : null}
                  {visibleColumns.has("createdAt") ? <TableCell>{r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : "-"}</TableCell> : null}
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm"><MoreHorizontal className="w-4 h-4"/></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditRole(r)}>
                          <Pencil className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => confirmDelete(r)}>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Dialog open={openColumns} onOpenChange={setOpenColumns}>
            <DialogContent className="bg-card sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Manage columns</DialogTitle>
                <DialogDescription>Show or hide columns in the Roles table.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={visibleColumns.has("description")} onCheckedChange={() => toggleColumn("description")} />
                  <span>Description</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={visibleColumns.has("permissions")} onCheckedChange={() => toggleColumn("permissions")} />
                  <span>Permissions</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={visibleColumns.has("createdAt")} onCheckedChange={() => toggleColumn("createdAt")} />
                  <span>Created</span>
                </label>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setVisibleColumns(new Set(["description", "permissions", "createdAt"]));
                  }}
                >
                  Reset
                </Button>
                <Button type="button" onClick={() => setOpenColumns(false)}>Done</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={openEdit} onOpenChange={setOpenEdit}>
            <DialogContent className="bg-card">
              <DialogHeader><DialogTitle>Edit role</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <Input placeholder="Role name" value={editName} onChange={(e)=>setEditName(e.target.value)} />
                <Input placeholder="Description" value={editDescription} onChange={(e)=>setEditDescription(e.target.value)} />
                <div className="grid sm:grid-cols-2 gap-2 pt-2 border-t">
                  {ALL_PERMS.map((p) => (
                    <label key={p.key} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={editPerms.has(p.key)} onCheckedChange={() => toggleEditPerm(p.key)} />
                      <span>{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={()=>setOpenEdit(false)}>Close</Button>
                <Button onClick={async ()=>{ try { await saveEdit(); toast.success('Role updated'); } catch (e:any) { toast.error(e?.message || 'Failed'); } }}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={openDelete} onOpenChange={setOpenDelete}>
            <DialogContent className="bg-card">
              <DialogHeader><DialogTitle>Delete role</DialogTitle></DialogHeader>
              <div className="py-2 text-sm text-muted-foreground">
                Are you sure you want to delete <span className="font-medium text-foreground">{deleting?.name}</span>?
                This action cannot be undone.
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenDelete(false)}>Cancel</Button>
                <Button variant="destructive" onClick={async ()=>{ try { await doDelete(); toast.success('Role deleted'); } catch (e:any) { toast.error(e?.message || 'Failed'); } }}>Delete</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}

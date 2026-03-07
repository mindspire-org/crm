import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Tags, Plus, RefreshCw, MoreHorizontal, Clock, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";

type NoteDoc = {
  _id: string;
  leadId?: string;
  employeeId?: string;
  createdBy?: string;
  title?: string;
  text?: string;
  category?: string;
  labels?: string;
  labelColor?: string;
  fileIds?: string[];
  private?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type NoteCategory = { _id: string; name: string };
type NoteLabel = { _id: string; name: string; color?: string };

function formatCreated(iso?: string) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    let hh = d.getHours();
    const min = String(d.getMinutes()).padStart(2, "0");
    const ampm = hh >= 12 ? "pm" : "am";
    hh = hh % 12;
    if (hh === 0) hh = 12;
    const hh12 = String(hh).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh12}:${min} ${ampm}`;
  } catch {
    return "-";
  }
}

export default function Notes({ leadId, clientId, myNotesOnly = false }: { leadId?: string; clientId?: string; myNotesOnly?: boolean }) {
  const [tab, setTab] = useState("list");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("-");
  const [labelFilter, setLabelFilter] = useState("-");
  const [showAddCategory, setShowAddCategory] = useState(false);

  const [categories, setCategories] = useState<NoteCategory[]>([]);
  const [labels, setLabels] = useState<NoteLabel[]>([]);

  const [openManageLabels, setOpenManageLabels] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#4F46E5");
  const [newCategoryName, setNewCategoryName] = useState("");

  const [notes, setNotes] = useState<NoteDoc[]>([]);
  const [loading, setLoading] = useState(false);

  const [openAddNote, setOpenAddNote] = useState(false);
  const [openEditNote, setOpenEditNote] = useState(false);
  const [editing, setEditing] = useState<NoteDoc | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteText, setNoteText] = useState("");
  const [notePrivate, setNotePrivate] = useState(true);
  const [noteCategory, setNoteCategory] = useState("-");
  const [noteLabel, setNoteLabel] = useState("-");

  // Determine self context for staff (team member)
  const getCurrentUserRole = () => {
    try {
      const raw = localStorage.getItem("auth_user") || sessionStorage.getItem("auth_user");
      if (!raw) return "admin";
      const u = JSON.parse(raw);
      return u?.role || "admin";
    } catch {
      return "admin";
    }
  };
  const currentUserRole = getCurrentUserRole();
  const [selfEmployeeId, setSelfEmployeeId] = useState<string>("");
  const canUseContext = Boolean(leadId || clientId || selfEmployeeId);

  const labelColorByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of labels) {
      if (l?.name) m.set(l.name, l.color || "#4F46E5");
    }
    return m;
  }, [labels]);

  const loadCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/note-categories`, { headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load categories");
      setCategories(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load categories");
    }
  };

  const loadLabels = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/note-labels`, { headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load labels");
      setLabels(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load labels");
    }
  };

  useEffect(() => {
    loadCategories();
    loadLabels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      // In personal notes mode, only fetch my notes
      if (myNotesOnly) {
        params.set("myNotes", "true");
      } else {
        if (leadId) params.set("leadId", leadId);
        if (clientId) params.set("clientId", clientId);
        if (selfEmployeeId) params.set("employeeId", selfEmployeeId);
      }
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(`${API_BASE}/api/notes?${params.toString()}`, { headers: getAuthHeaders() });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load notes");
      setNotes(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    try {
      const res = await fetch(`${API_BASE}/api/note-categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ name }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to add category");
      toast.success("Category saved");
      setNewCategoryName("");
      setShowAddCategory(false);
      await loadCategories();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save category");
    }
  };

  const deleteCategory = async (id: string) => {
    const ok = window.confirm("Delete this category?");
    if (!ok) return;
    try {
      const res = await fetch(`${API_BASE}/api/note-categories/${id}`, { 
        method: "DELETE",
        headers: getAuthHeaders()
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      toast.success("Category deleted");
      await loadCategories();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete category");
    }
  };

  const addLabel = async () => {
    const name = newLabelName.trim();
    if (!name) return;
    try {
      const res = await fetch(`${API_BASE}/api/note-labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ name, color: newLabelColor }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to add label");
      toast.success("Label saved");
      setNewLabelName("");
      await loadLabels();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save label");
    }
  };

  const deleteLabel = async (id: string) => {
    const ok = window.confirm("Delete this label?");
    if (!ok) return;
    try {
      const res = await fetch(`${API_BASE}/api/note-labels/${id}`, { 
        method: "DELETE",
        headers: getAuthHeaders()
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      toast.success("Label deleted");
      await loadLabels();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete label");
    }
  };

  const clearFilters = () => {
    setQuery("");
    setCategoryFilter("-");
    setLabelFilter("-");
  };

  useEffect(() => {
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId, clientId, selfEmployeeId, myNotesOnly]);

  useEffect(() => {
    const t = setTimeout(() => {
      loadNotes();
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Resolve employeeId for staff self mode (only when not in myNotesOnly mode)
  useEffect(() => {
    (async () => {
      try {
        if (myNotesOnly) return;
        if (currentUserRole !== "staff") return;
        if (leadId || clientId) return;
        const res = await fetch(`${API_BASE}/api/attendance/members`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json().catch(() => []);
        const first = Array.isArray(data) ? data[0] : null;
        const eid = first?.employeeId ? String(first.employeeId) : "";
        if (eid) setSelfEmployeeId(eid);
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredNotes = useMemo(() => {
    let list = notes;
    if (categoryFilter !== "-" && categoryFilter !== "- Category -") list = list.filter((n) => (n.category || "") === categoryFilter);
    if (labelFilter !== "-" && labelFilter !== "- Label -") {
      list = list.filter((n) => (n.labels || "") === labelFilter);
    }
    return list;
  }, [notes, categoryFilter, labelFilter]);

  const openAdd = () => {
    setEditing(null);
    setNoteTitle("");
    setNoteText("");
    setNotePrivate(true);
    setNoteCategory("-");
    setNoteLabel("-");
    setOpenAddNote(true);
  };

  const openEdit = (n: NoteDoc) => {
    setEditing(n);
    setNoteTitle(n.title || "");
    setNoteText(n.text || "");
    setNotePrivate(Boolean(n.private));
    setNoteCategory(n.category || "-");
    setNoteLabel(n.labels || "-");
    setOpenEditNote(true);
  };

  const saveNote = async () => {
    const t = noteTitle.trim();
    if (!t) {
      toast.error("Title is required");
      return;
    }
    try {
      const payload: any = {
        leadId: leadId || undefined,
        clientId: clientId || undefined,
        employeeId: selfEmployeeId || undefined,
        title: t,
        text: noteText || "",
        category: noteCategory !== "-" && noteCategory !== "- Category -" ? noteCategory : "",
        labels: noteLabel !== "-" && noteLabel !== "- Label -" ? noteLabel : "",
        labelColor: noteLabel !== "-" ? (labelColorByName.get(noteLabel) || "") : "",
        private: Boolean(notePrivate),
      };

      if (editing?._id) {
        const res = await fetch(`${API_BASE}/api/notes/${editing._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || "Failed to update note");
        toast.success("Note updated");
        setOpenEditNote(false);
        setEditing(null);
      } else {
        const res = await fetch(`${API_BASE}/api/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || "Failed to create note");
        toast.success("Note added");
        setOpenAddNote(false);
      }
      await loadNotes();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save note");
    }
  };

  const deleteNote = async (id: string) => {
    const ok = window.confirm("Delete this note?");
    if (!ok) return;
    try {
      const res = await fetch(`${API_BASE}/api/notes/${id}`, { 
        method: "DELETE",
        headers: getAuthHeaders()
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to delete note");
      toast.success("Note deleted");
      await loadNotes();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete");
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold">{myNotesOnly ? "My Notes" : "Notes (Private)"}</h1>
        <div className="flex items-center gap-2">
          {tab !== "categories" ? (
            <>
              {/* Manage labels */}
              <Dialog open={openManageLabels} onOpenChange={setOpenManageLabels}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2"><Tags className="w-4 h-4"/> Manage labels</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Manage labels</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {labels.map((l) => (
                        <div key={l._id} className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-full border" style={{ backgroundColor: `${l.color || "#4F46E5"}22`, color: l.color || "#4F46E5" }}>
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color || "#4F46E5" }} />
                          <span>{l.name}</span>
                          <button type="button" className="opacity-70 hover:opacity-100" onClick={() => deleteLabel(l._id)}>×</button>
                        </div>
                      ))}
                      {!labels.length && <div className="text-sm text-muted-foreground">No labels yet</div>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                      <Label className="md:text-right text-muted-foreground">Label</Label>
                      <div className="md:col-span-4 flex items-center gap-2">
                        <Input placeholder="Label" value={newLabelName} onChange={(e) => setNewLabelName(e.target.value)} />
                        <input type="color" value={newLabelColor} onChange={(e) => setNewLabelColor(e.target.value)} className="h-9 w-10 p-0 border rounded" />
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" type="button" onClick={() => setOpenManageLabels(false)}>Close</Button>
                    <Button type="button" onClick={addLabel}>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Add note */}
              <Dialog open={openAddNote} onOpenChange={setOpenAddNote}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2" onClick={openAdd}><Plus className="w-4 h-4"/> Add note</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add note</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                      <Label className="md:text-right text-muted-foreground">Title</Label>
                      <Input placeholder="Title" className="md:col-span-4" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                      <Label className="md:text-right text-muted-foreground">Category</Label>
                      <Select value={noteCategory} onValueChange={setNoteCategory}>
                        <SelectTrigger className="md:col-span-4"><SelectValue placeholder="-"/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="-">-</SelectItem>
                          {categories.map((c) => (
                            <SelectItem key={c._id} value={c.name}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                      <Label className="md:text-right text-muted-foreground">Label</Label>
                      <Select value={noteLabel} onValueChange={setNoteLabel}>
                        <SelectTrigger className="md:col-span-4"><SelectValue placeholder="-"/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="-">-</SelectItem>
                          {labels.map((l) => (
                            <SelectItem key={l._id} value={l.name}>{l.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
                      <Label className="md:text-right pt-2 text-muted-foreground">Description</Label>
                      <Textarea placeholder="Description" className="md:col-span-4 min-h-[140px]" value={noteText} onChange={(e) => setNoteText(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                      <Label className="md:text-right text-muted-foreground">Private</Label>
                      <div className="md:col-span-4 flex items-center gap-2">
                        <Checkbox checked={notePrivate} onCheckedChange={(v) => setNotePrivate(Boolean(v))} />
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" type="button" onClick={() => setOpenAddNote(false)}>Close</Button>
                    <Button type="button" onClick={saveNote} disabled={loading}>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          ) : (
            // Add category
            <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2"><Plus className="w-4 h-4"/> Add category</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add category</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  <Label className="md:text-right text-muted-foreground">Name</Label>
                  <Input placeholder="Name" className="md:col-span-4" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setShowAddCategory(false)}>Close</Button>
                  <Button type="button" onClick={addCategory}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <Tabs value={tab} onValueChange={setTab}>
            <div className="flex items-center justify-between mb-3">
              <TabsList className="bg-muted/40">
                <TabsTrigger value="list">List</TabsTrigger>
                <TabsTrigger value="grid">Grid</TabsTrigger>
                <TabsTrigger value="categories">Categories</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search" value={query} onChange={(e)=>setQuery(e.target.value)} className="pl-9 w-56" />
                </div>
              </div>
            </div>

            <TabsContent value="list">
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <Button variant="outline" size="icon" aria-label="grid">▦</Button>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="- Category -"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-">- Category -</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c._id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={labelFilter} onValueChange={setLabelFilter}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="- Label -"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-">- Label -</SelectItem>
                    {labels.map((l) => (
                      <SelectItem key={l._id} value={l.name}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="default" size="icon" aria-label="refresh" onClick={loadNotes}><RefreshCw className="w-4 h-4"/></Button>
                <Button type="button" variant="outline" size="icon" aria-label="clear" onClick={clearFilters}>✕</Button>
              </div>

              <Dialog open={openEditNote} onOpenChange={setOpenEditNote}>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Edit note</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                      <Label className="md:text-right text-muted-foreground">Title</Label>
                      <Input placeholder="Title" className="md:col-span-4" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                      <Label className="md:text-right text-muted-foreground">Category</Label>
                      <Select value={noteCategory} onValueChange={setNoteCategory}>
                        <SelectTrigger className="md:col-span-4"><SelectValue placeholder="-"/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="-">-</SelectItem>
                          {categories.map((c) => (
                            <SelectItem key={c._id} value={c.name}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                      <Label className="md:text-right text-muted-foreground">Label</Label>
                      <Select value={noteLabel} onValueChange={setNoteLabel}>
                        <SelectTrigger className="md:col-span-4"><SelectValue placeholder="-"/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="-">-</SelectItem>
                          {labels.map((l) => (
                            <SelectItem key={l._id} value={l.name}>{l.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
                      <Label className="md:text-right pt-2 text-muted-foreground">Description</Label>
                      <Textarea placeholder="Description" className="md:col-span-4 min-h-[140px]" value={noteText} onChange={(e) => setNoteText(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                      <Label className="md:text-right text-muted-foreground">Private</Label>
                      <div className="md:col-span-4 flex items-center gap-2">
                        <Checkbox checked={notePrivate} onCheckedChange={(v) => setNotePrivate(Boolean(v))} />
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" type="button" onClick={() => { setOpenEditNote(false); setEditing(null); }}>Close</Button>
                    <Button type="button" onClick={saveNote} disabled={loading || !editing?._id}>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Created date</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Files</TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNotes.length ? (
                    filteredNotes.map((n) => (
                      <TableRow key={n._id}>
                        <TableCell>{formatCreated(n.createdAt)}</TableCell>
                        <TableCell>
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 text-primary hover:underline cursor-pointer"
                            onClick={() => openEdit(n)}
                          >
                            <span className="h-2 w-2 rounded-full bg-primary"></span>
                            {n.title || "-"}
                          </button>
                        </TableCell>
                        <TableCell>{n.category || "-"}</TableCell>
                        <TableCell>{n.fileIds?.length ? String(n.fileIds.length) : "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button type="button" variant="ghost" size="icon" onClick={() => deleteNote(n._id)} aria-label="delete">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        {loading ? "Loading..." : "No record found."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="grid">
              {/* Toolbar for grid */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <Button type="button" variant="outline" size="icon" aria-label="refresh" onClick={loadNotes}><RefreshCw className="w-4 h-4"/></Button>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="- Category -"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-">- Category -</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c._id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={labelFilter} onValueChange={setLabelFilter}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="- Label -"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-">- Label -</SelectItem>
                    {labels.map((l) => (
                      <SelectItem key={l._id} value={l.name}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="default" size="icon" aria-label="refresh" onClick={loadNotes}><RefreshCw className="w-4 h-4"/></Button>
                <Button type="button" variant="outline" size="icon" aria-label="clear" onClick={clearFilters}>✕</Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredNotes.length ? (
                  filteredNotes.map((n) => (
                    <button
                      key={n._id}
                      type="button"
                      className="text-left rounded-lg border bg-blue-50 border-blue-200 p-3"
                      onClick={() => openEdit(n)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-blue-900 truncate">{n.title || "-"}</h3>
                        <MoreHorizontal className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-blue-700 mb-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatCreated(n.createdAt)}</span>
                      </div>
                      <p className="text-sm text-blue-800/90 line-clamp-4 whitespace-pre-wrap">{n.text || ""}</p>
                    </button>
                  ))
                ) : (
                  <div className="col-span-full text-center text-sm text-muted-foreground">
                    {loading ? "Loading..." : "No record found."}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="categories">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" aria-label="grid">▦</Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">Excel</Button>
                  <Button variant="outline" size="sm">Print</Button>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search" value={query} onChange={(e)=>setQuery(e.target.value)} className="pl-9 w-56" />
                  </div>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Name</TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.length ? (
                    categories
                      .filter((c) => (query.trim() ? c.name.toLowerCase().includes(query.trim().toLowerCase()) : true))
                      .map((c) => (
                        <TableRow key={c._id}>
                          <TableCell>{c.name}</TableCell>
                          <TableCell className="text-right">
                            <Button type="button" variant="ghost" size="icon" onClick={() => deleteCategory(c._id)} aria-label="delete">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">No record found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

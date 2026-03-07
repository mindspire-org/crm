import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Trash } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";

export default function EstimateForms() {
  const [query, setQuery] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [assignee, setAssignee] = useState("-");
  const [employees, setEmployees] = useState<Array<{ id: string; name: string }>>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");
  const [isPublic, setIsPublic] = useState(false);
  const [allowAttachment, setAllowAttachment] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [currentForm, setCurrentForm] = useState<any | null>(null);
  const [fieldTitle, setFieldTitle] = useState("");
  const [fieldTitleLangKey, setFieldTitleLangKey] = useState("");
  const [fieldPlaceholder, setFieldPlaceholder] = useState("");
  const [fieldPlaceholderLangKey, setFieldPlaceholderLangKey] = useState("");
  const [fieldType, setFieldType] = useState("text");
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldOptions, setFieldOptions] = useState("");
  const [previewValues, setPreviewValues] = useState<Record<string, any>>({});
  const [savingForm, setSavingForm] = useState(false);
  const [savingField, setSavingField] = useState(false);
  const [submittingPreview, setSubmittingPreview] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/employees`, { cache: "no-store", headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        const opts = (Array.isArray(data) ? data : []).map((d: any) => ({ id: String(d._id || d.id || ""), name: String(d.name || `${d.firstName||""} ${d.lastName||""}`.trim() || "Member") }));
        setEmployees(opts);
      } catch {}
    })();
  }, []);

  // Helpers to handle both /api/estimate-forms and /api/estimateforms aliases
  const ef = (path: string = "") => `${API_BASE}/api/estimate-forms${path}`;
  const efAlt = (path: string = "") => `${API_BASE}/api/estimateforms${path}`;
  const fetchEF = async (path: string, init?: RequestInit) => {
    const baseHeaders = getAuthHeaders(typeof (init as any)?.headers === "object" ? (init as any).headers : undefined);
    const nextInit: RequestInit = { ...(init || {}), headers: baseHeaders };
    let res = await fetch(ef(path), nextInit);
    if (res.status === 404) {
      try { const alt = await fetch(efAlt(path), nextInit); res = alt; } catch {}
    }
    return res;
  };

  const fetchForms = async (q = "") => {
    try {
      const res = await fetchEF(`?q=${encodeURIComponent(q)}`, { cache: "no-store" } as any);
      if (!res.ok) return;
      const data = await res.json();
      setForms(Array.isArray(data) ? data : []);
    } catch {}
  };

  const deleteForm = async (id: string) => {
    const ok = window.confirm("Delete this form?");
    if (!ok) return;
    try {
      const res = await fetchEF(`/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setForms((prev) => prev.filter((f: any) => String(f._id || f.id) !== id));
    } catch {}
  };

  useEffect(() => {
    fetchForms(query);
  }, [query]);

  const saveForm = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    try {
      setSavingForm(true);
      const match = employees.find((e) => e.id === assignee);
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        assignee: assignee !== "-" ? assignee : undefined,
        assigneeName: match?.name,
        public: isPublic,
        allowAttachment,
      } as any;
      const res = await fetchEF("", {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg = await res.text();
        toast.error(msg || "Failed to save form");
        return;
      }
      const d = await res.json();
      setForms((prev) => [d, ...prev]);
      // reset
      setTitle(""); setDescription(""); setStatus("active"); setAssignee("-"); setIsPublic(false); setAllowAttachment(false);
      setOpenAdd(false);
      toast.success("Form saved");
    } catch {
      toast.error("Server not reachable");
    }
    finally { setSavingForm(false); }
  };

  const openPreview = async (id: string) => {
    try {
      const res = await fetchEF(`/${id}`, { cache: "no-store" } as any);
      if (!res.ok) return;
      const d = await res.json();
      setCurrentForm(d);
      const init: Record<string, any> = {};
      (d.fields || []).forEach((f: any) => { init[String(f._id)] = ""; });
      setPreviewValues(init);
      setPreviewOpen(true);
    } catch {}
  };

  const submitPreview = async () => {
    if (!currentForm?._id) return setPreviewOpen(false);
    try {
      setSubmittingPreview(true);
      const res = await fetchEF(`/${currentForm._id}/submit`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(previewValues),
      });
      if (!res.ok) { const t = await res.text(); toast.error(t || "Submit failed"); return; }
      toast.success("Estimate request submitted");
      setPreviewOpen(false);
    } catch {}
    finally { setSubmittingPreview(false); }
  };

  const openAddField = async (id: string) => {
    try {
      const res = await fetchEF(`/${id}`, { cache: "no-store" } as any);
      if (!res.ok) return;
      const d = await res.json();
      setCurrentForm(d);
      setFieldTitle(""); setFieldTitleLangKey(""); setFieldPlaceholder(""); setFieldPlaceholderLangKey(""); setFieldType("text"); setFieldRequired(false); setFieldOptions("");
      setAddFieldOpen(true);
    } catch {}
  };

  const saveField = async () => {
    if (!currentForm?._id || !fieldTitle.trim()) { toast.error("Field title is required"); return; }
    try {
      setSavingField(true);
      const res = await fetchEF(`/${currentForm._id}/fields`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          title: fieldTitle.trim(),
          titleLangKey: fieldTitleLangKey || undefined,
          placeholder: fieldPlaceholder || undefined,
          placeholderLangKey: fieldPlaceholderLangKey || undefined,
          type: fieldType,
          required: fieldRequired,
          options: ["select","multiselect"].includes(fieldType) ? fieldOptions.split(",").map(s=>s.trim()).filter(Boolean) : undefined,
        }),
      });
      if (!res.ok) { const t = await res.text(); toast.error(t || "Failed to add field"); return; }
      const added = await res.json();
      setCurrentForm((prev: any) => ({ ...(prev||{}), fields: [...(prev?.fields||[]), added] }));
      toast.success("Field added");
      setAddFieldOpen(false);
    } catch {}
    finally { setSavingField(false); }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-sm text-muted-foreground">Estimate Forms</h1>
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-2"/>Add form</Button>
          </DialogTrigger>
          <DialogContent className="bg-card max-w-2xl">
            <DialogHeader><DialogTitle>Add form</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-12">
              <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Title</div>
              <div className="sm:col-span-9"><Input placeholder="Title" value={title} onChange={(e)=>setTitle(e.target.value)} /></div>

              <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Description</div>
              <div className="sm:col-span-9"><Textarea placeholder="Description" className="min-h-[120px]" value={description} onChange={(e)=>setDescription(e.target.value)} /></div>

              <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Status</div>
              <div className="sm:col-span-9">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue placeholder="Active" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Auto assign estimate request to</div>
              <div className="sm:col-span-9">
                <Select value={assignee} onValueChange={setAssignee}>
                  <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-">-</SelectItem>
                    {employees.map((e)=> (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Public</div>
              <div className="sm:col-span-9"><Checkbox checked={isPublic} onCheckedChange={(v)=>setIsPublic(Boolean(v))} /></div>

              <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Enable attachment</div>
              <div className="sm:col-span-9"><Checkbox checked={allowAttachment} onCheckedChange={(v)=>setAllowAttachment(Boolean(v))} /></div>
            </div>
            <DialogFooter>
              <div className="w-full flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={()=>setOpenAdd(false)} disabled={savingForm}>Close</Button>
                <Button type="button" onClick={saveForm} disabled={savingForm}>{savingForm?"Saving...":"Save"}</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search" value={query} onChange={(e)=>setQuery(e.target.value)} className="pl-9 w-56" />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Form name</TableHead>
                <TableHead>Assigned to</TableHead>
                <TableHead>Created at</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-48 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">No record found.</TableCell>
                </TableRow>
              ) : (
                forms.map((f: any) => (
                  <TableRow key={String(f._id || f.id)}>
                    <TableCell className="font-medium">{f.title}</TableCell>
                    <TableCell>{f.assigneeName || "-"}</TableCell>
                    <TableCell>{f.createdAt ? new Date(f.createdAt).toISOString().slice(0,10) : "-"}</TableCell>
                    <TableCell className="capitalize">{f.status || "active"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end space-y-2">
                        <Button size="sm" variant="outline" onClick={()=>openPreview(String(f._id || f.id))}>Preview</Button>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={()=>openAddField(String(f._id || f.id))}>Add field</Button>
                          <button className="text-destructive hover:opacity-80" onClick={()=>deleteForm(String(f._id || f.id))} title="Delete">
                            <Trash className="inline w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="bg-card max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="text-lg font-semibold">{currentForm?.title}</div>
              {currentForm?.description && <div className="text-sm text-muted-foreground">{currentForm?.description}</div>}
            </div>
            <div className="grid gap-3">
              {(currentForm?.fields || []).length === 0 && (
                <div className="text-sm text-muted-foreground">No fields added.</div>
              )}
              {(currentForm?.fields || []).map((fld: any) => (
                <div key={String(fld._id)} className="space-y-1">
                  <div className="text-sm text-muted-foreground">{fld.title}{fld.required ? " *" : ""}</div>
                  {fld.type === 'textarea' ? (
                    <Textarea placeholder={fld.placeholder || ""} value={previewValues[String(fld._id)] || ""} onChange={(e)=>setPreviewValues(v=>({...v,[String(fld._id)]: e.target.value}))} />
                  ) : fld.type === 'select' ? (
                    <select className="w-full border rounded-md h-9 px-3 bg-background" value={previewValues[String(fld._id)] || ""} onChange={(e)=>setPreviewValues(v=>({...v,[String(fld._id)]: e.target.value}))}>
                      <option value="" disabled>{fld.placeholder || "Select"}</option>
                      {(fld.options||[]).map((opt: string, idx: number)=>(<option key={idx} value={opt}>{opt}</option>))}
                    </select>
                  ) : fld.type === 'multiselect' ? (
                    <select multiple className="w-full border rounded-md min-h-[2.25rem] px-3 bg-background" value={Array.isArray(previewValues[String(fld._id)]) ? previewValues[String(fld._id)] : []} onChange={(e)=>{
                      const selected = Array.from(e.target.selectedOptions).map(o=>o.value);
                      setPreviewValues(v=>({...v,[String(fld._id)]: selected}));
                    }}>
                      {(fld.options||[]).map((opt: string, idx: number)=>(<option key={idx} value={opt}>{opt}</option>))}
                    </select>
                  ) : (
                    <Input type={
                      fld.type==='number'?'number':
                      fld.type==='email'?'email':
                      fld.type==='date'?'date':
                      fld.type==='time'?'time':'text'
                    } placeholder={fld.placeholder || ""} value={previewValues[String(fld._id)] || (fld.type==='date'||fld.type==='time'?undefined:"")} onChange={(e)=>setPreviewValues(v=>({...v,[String(fld._id)]: e.target.value}))} />
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={()=>setPreviewOpen(false)} disabled={submittingPreview}>Close</Button>
            <Button type="button" onClick={submitPreview} disabled={submittingPreview}>{submittingPreview?"Submitting...":"Request an estimate"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add field dialog */}
      <Dialog open={addFieldOpen} onOpenChange={setAddFieldOpen}>
        <DialogContent className="bg-card max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add field</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Title</div>
            <div className="sm:col-span-9"><Input placeholder="Title" value={fieldTitle} onChange={(e)=>setFieldTitle(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Title Language Key</div>
            <div className="sm:col-span-9"><Input placeholder="Keep it blank if you don't use translation" value={fieldTitleLangKey} onChange={(e)=>setFieldTitleLangKey(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Placeholder</div>
            <div className="sm:col-span-9"><Input placeholder="Placeholder" value={fieldPlaceholder} onChange={(e)=>setFieldPlaceholder(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Placeholder Language Key</div>
            <div className="sm:col-span-9"><Input placeholder="Keep it blank if you don't use translation" value={fieldPlaceholderLangKey} onChange={(e)=>setFieldPlaceholderLangKey(e.target.value)} /></div>

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Field Type</div>
            <div className="sm:col-span-9">
              <Select value={fieldType} onValueChange={setFieldType}>
                <SelectTrigger><SelectValue placeholder="Text" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="textarea">Textarea</SelectItem>
                  <SelectItem value="select">Select</SelectItem>
                  <SelectItem value="multiselect">Multi Select</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="time">Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {["select","multiselect"].includes(fieldType) && (
              <>
                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Options</div>
                <div className="sm:col-span-9"><Input placeholder="Comma separated (e.g. Small, Medium, Large)" value={fieldOptions} onChange={(e)=>setFieldOptions(e.target.value)} /></div>
              </>
            )}

            <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Required</div>
            <div className="sm:col-span-9"><Checkbox checked={fieldRequired} onCheckedChange={(v)=>setFieldRequired(Boolean(v))} /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={()=>setAddFieldOpen(false)} disabled={savingField}>Close</Button>
            <Button type="button" onClick={saveField} disabled={savingField}>{savingField?"Saving...":"Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

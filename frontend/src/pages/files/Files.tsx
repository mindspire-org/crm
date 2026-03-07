import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Home, Star, Search, FolderPlus, Upload, Info, X, Folder, ChevronLeft } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { cn } from "@/lib/utils";


type FolderDoc = {
  _id: string;
  name: string;
  description?: string;
  leadId?: string;
  projectId?: string;
  clientId?: string;
  employeeId?: string;
  ticketId?: string;
  taskId?: string;
  subscriptionId?: string;
  parentId?: string | null;
  createdAt?: string;
};

type FileDoc = {
  _id: string;
  leadId?: string;
  projectId?: string;
  employeeId?: string;
  folderId?: string | null;
  name?: string;
  type?: string;
  path?: string;
  url?: string;
  size?: number;
  mime?: string;
  favorite?: boolean;
  createdAt?: string;
};

function formatBytes(n?: number) {
  const v = Number(n || 0);
  if (!v) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const idx = Math.min(units.length - 1, Math.floor(Math.log(v) / Math.log(1024)));
  const num = v / Math.pow(1024, idx);
  return `${num.toFixed(num >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export default function Files({ leadId, clientId }: { leadId?: string; clientId?: string }) {
  const [selected, setSelected] = useState<string | null>(null);

  const [files, setFiles] = useState<FileDoc[]>([]);
  const [folders, setFolders] = useState<FolderDoc[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<FileDoc | FolderDoc | null>(null);
  const [query, setQuery] = useState("");

  const [openAdd, setOpenAdd] = useState(false);
  const [openFolderDialog, setOpenFolderDialog] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Detect current user role to enable team-member self mode
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

  const canUpload = Boolean(leadId || clientId || selfEmployeeId);

  const loadFolders = async () => {
    try {
      const params = new URLSearchParams();
      if (leadId) params.set("leadId", leadId);
      if (clientId) params.set("clientId", clientId);
      if (selfEmployeeId) params.set("employeeId", selfEmployeeId);
      if (currentFolderId) params.set("parentId", currentFolderId);
      else params.set("parentId", "null");
      const res = await fetch(`${API_BASE}/api/folders?${params.toString()}`, { 
        headers: getAuthHeaders() 
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load folders");
      setFolders(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load folders");
    }
  };

  const loadFiles = async () => {
    // Allow loading all files when no specific context is provided (standalone /files page)
    try {
      const params = new URLSearchParams();
      if (leadId) params.set("leadId", leadId);
      if (clientId) params.set("clientId", clientId);
      if (selfEmployeeId) params.set("employeeId", selfEmployeeId);
      if (query.trim()) params.set("q", query.trim());
      if (selected === "favorites") params.set("favorite", "true");
      if (currentFolderId) params.set("folderId", currentFolderId);
      else params.set("folderId", "null");
      const res = await fetch(`${API_BASE}/api/files?${params.toString()}`, { 
        headers: getAuthHeaders() 
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load files");
      setFiles(Array.isArray(json) ? json : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load files");
    }
  };

  useEffect(() => {
    loadFiles();
    loadFolders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId, clientId, selfEmployeeId, selected, currentFolderId]);

  useEffect(() => {
    const t = setTimeout(() => {
      loadFiles();
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Resolve employeeId for staff self mode
  useEffect(() => {
    (async () => {
      try {
        if (currentUserRole !== "staff") return;
        if (leadId || clientId) return; // using contextual mode
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

  const pendingTotal = useMemo(() => pendingFiles.reduce((sum, f) => sum + (f.size || 0), 0), [pendingFiles]);

  const addPendingFiles = (list: FileList | File[]) => {
    const arr = Array.isArray(list) ? list : Array.from(list || []);
    if (!arr.length) return;
    setPendingFiles((prev) => {
      const next = [...prev];
      for (const f of arr) {
        const exists = next.some((x) => x.name === f.name && x.size === f.size && x.lastModified === f.lastModified);
        if (!exists) next.push(f);
      }
      return next;
    });
  };

  const uploadOne = async (f: File) => {
    const fd = new FormData();
    if (leadId) fd.append("leadId", leadId);
    if (clientId) fd.append("clientId", clientId);
    if (selfEmployeeId) fd.append("employeeId", selfEmployeeId);
    if (currentFolderId) fd.append("folderId", currentFolderId);
    fd.append("name", f.name);
    fd.append("file", f);
    const res = await fetch(`${API_BASE}/api/files`, { 
      method: "POST", 
      body: fd,
      headers: { Authorization: getAuthHeaders().Authorization || "" }
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error || "Upload failed");
    return json as FileDoc;
  };

  const saveUploads = async () => {
    if (!pendingFiles.length) {
      toast.error("Select files first");
      return;
    }
    try {
      setUploading(true);
      for (const f of pendingFiles) {
        await uploadOne(f);
      }
      toast.success("Files uploaded");
      setPendingFiles([]);
      if (inputRef.current) inputRef.current.value = "";
      setOpenAdd(false);
      await loadFiles();
    } catch (e: any) {
      toast.error(e?.message || "Failed to upload");
    } finally {
      setUploading(false);
    }
  };

  const onBrowse = () => inputRef.current?.click();

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.files?.length) addPendingFiles(e.dataTransfer.files);
  };

  const onDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const removePending = (idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeUploaded = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/files/${id}`, { 
        method: "DELETE",
        headers: getAuthHeaders()
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to delete");
      toast.success("File deleted");
      await loadFiles();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete");
    }
  };

  const toggleFavorite = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/api/files/${id}/favorite`, { 
        method: "PATCH",
        headers: getAuthHeaders()
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to update favorite");
      toast.success(current ? "Removed from favorites" : "Added to favorites");
      await loadFiles();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update favorite");
    }
  };

  const downloadFile = async (f: FileDoc) => {
    try {
      const href = f.url || (f.path ? `${API_BASE}${f.path}` : "");
      if (!href) {
        toast.error("File URL not available");
        return;
      }
      const res = await fetch(href, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to download file");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = f.name || "download";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("File downloaded");
    } catch (e: any) {
      toast.error(e?.message || "Failed to download");
    }
  };

  const createFolder = async () => {
    if (!folderName.trim()) {
      toast.error("Folder name is required");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/folders`, {
        method: "POST",
        headers: { 
          ...getAuthHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: folderName.trim(),
          leadId,
          clientId,
          employeeId: selfEmployeeId || undefined,
          parentId: currentFolderId,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to create folder");
      toast.success("Folder created");
      setFolderName("");
      setOpenFolderDialog(false);
      await loadFolders();
    } catch (e: any) {
      toast.error(e?.message || "Failed to create folder");
    }
  };

  const deleteFolder = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/folders/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to delete folder");
      toast.success("Folder deleted");
      await loadFolders();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete folder");
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left panel */}
        <Card className="md:col-span-2">
          <CardContent className="p-3 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search folder or file" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <nav className="space-y-1 text-sm">
              <button
                className="w-full flex items-center gap-2 rounded-md px-2 py-2 hover:bg-muted/50 text-left border border-transparent data-[active=true]:bg-muted/60 data-[active=true]:border-muted"
                data-active={selected === "home" || selected === null}
                onClick={() => setSelected("home")}
              >
                <Home className="w-4 h-4 text-muted-foreground" />
                Home
              </button>
              <button
                className="w-full flex items-center gap-2 rounded-md px-2 py-2 hover:bg-muted/50 text-left border border-transparent data-[active=true]:bg-muted/60 data-[active=true]:border-muted"
                data-active={selected === "favorites"}
                onClick={() => setSelected("favorites")}
              >
                <Star className={cn("w-4 h-4", selected === "favorites" ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground")} />
                Favorites
              </button>
            </nav>
          </CardContent>
        </Card>

        {/* Center panel */}
        <Card className="md:col-span-7">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm">
                {currentFolderId ? (
                  <>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-1 px-2"
                      onClick={() => setCurrentFolderId(null)}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </Button>
                    <span className="text-muted-foreground">/</span>
                    <Folder className="w-4 h-4 text-blue-500" />
                    <span>Current Folder</span>
                  </>
                ) : selected === "favorites" ? (
                  <>
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span>Favorites</span>
                  </>
                ) : (
                  <>
                    <Home className="w-4 h-4 text-muted-foreground" />
                    <span>Home</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* New folder dialog */}
                <Dialog open={openFolderDialog} onOpenChange={setOpenFolderDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <FolderPlus className="w-4 h-4" /> New folder
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                      <DialogTitle>New folder</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                      <Label className="md:text-right text-muted-foreground">Name</Label>
                      <Input 
                        placeholder="Folder name" 
                        className="md:col-span-4" 
                        value={folderName}
                        onChange={(e) => setFolderName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") createFolder();
                        }}
                      />
                    </div>
                    <DialogFooter className="gap-2">
                      <Button variant="outline" onClick={() => {
                        setFolderName("");
                        setOpenFolderDialog(false);
                      }}>Close</Button>
                      <Button onClick={createFolder} disabled={!folderName.trim()}>Save</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Add files dialog */}
                <Dialog open={openAdd} onOpenChange={setOpenAdd}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Upload className="w-4 h-4" /> Add files
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>Add files</DialogTitle>
                    </DialogHeader>
                    <input
                      ref={inputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => addPendingFiles(e.target.files || [])}
                    />

                    <div
                      role="button"
                      tabIndex={0}
                      onClick={onBrowse}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") onBrowse();
                      }}
                      onDrop={onDrop}
                      onDragOver={onDragOver}
                      className="rounded-lg border border-dashed p-6 min-h-[180px] flex flex-col items-center justify-center text-sm text-muted-foreground select-none cursor-pointer"
                    >
                      <div className="text-center">
                        Drag-and-drop documents here
                        <br />
                        (or click to browse...)
                      </div>

                      {!!pendingFiles.length && (
                        <div className="w-full mt-4 space-y-2 text-foreground">
                          <div className="text-xs text-muted-foreground">
                            {pendingFiles.length} file(s) selected • {formatBytes(pendingTotal)}
                          </div>
                          <div className="max-h-[160px] overflow-auto space-y-2">
                            {pendingFiles.map((f, idx) => (
                              <div key={`${f.name}_${f.lastModified}_${f.size}`} className="flex items-center justify-between gap-3 text-sm border rounded-md px-3 py-2">
                                <div className="min-w-0">
                                  <div className="truncate">{f.name}</div>
                                  <div className="text-xs text-muted-foreground">{formatBytes(f.size)}</div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    removePending(idx);
                                  }}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <DialogFooter className="gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setOpenAdd(false);
                          setPendingFiles([]);
                          if (inputRef.current) inputRef.current.value = "";
                        }}
                        disabled={uploading}
                      >
                        Close
                      </Button>
                      <Button type="button" onClick={saveUploads} disabled={uploading || !pendingFiles.length}>
                        {uploading ? "Uploading..." : "Save"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" size="icon" aria-label="info">
                  <Info className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="h-[480px] md:h-[560px] border rounded-lg bg-muted/10 overflow-auto">
              {folders.length === 0 && files.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  No files or folders yet
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {/* Folders */}
                  {selected !== "favorites" && folders.map((folder) => (
                    <div 
                      key={folder._id} 
                      className={cn(
                        "flex items-center justify-between gap-3 bg-card border rounded-md px-3 py-2 cursor-pointer hover:bg-muted/50",
                        selectedItem?._id === folder._id && "ring-2 ring-primary border-primary"
                      )} 
                      onClick={() => setSelectedItem(folder)}
                      onDoubleClick={() => setCurrentFolderId(folder._id)}
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <Folder className="w-5 h-5 text-blue-500" />
                        <div>
                          <div className="truncate text-sm font-medium">{folder.name}</div>
                          <div className="text-xs text-muted-foreground">Folder</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentFolderId(folder._id);
                          }}
                        >
                          Open
                        </Button>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteFolder(folder._id);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Files */}
                  {files.map((f) => {
                    const href = f.url || (f.path ? `${API_BASE}${f.path}` : "");
                    return (
                      <div 
                        key={f._id} 
                        className={cn(
                          "flex items-center justify-between gap-3 bg-card border rounded-md px-3 py-2",
                          selectedItem?._id === f._id && "ring-2 ring-primary border-primary"
                        )}
                        onClick={() => setSelectedItem(f)}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{f.name || "file"}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatBytes(f.size)}{f.mime ? ` • ${f.mime}` : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleFavorite(f._id, !!f.favorite)}
                            className={f.favorite ? "text-yellow-500" : "text-muted-foreground"}
                            title={f.favorite ? "Remove from favorites" : "Add to favorites"}
                          >
                            <Star className={cn("w-4 h-4", f.favorite && "fill-yellow-500")} />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!href}
                            onClick={() => downloadFile(f)}
                          >
                            Download
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!href}
                            onClick={() => {
                              if (href) window.open(href, "_blank", "noopener,noreferrer");
                            }}
                          >
                            View
                          </Button>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeUploaded(f._id)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right panel */}
        <Card className="md:col-span-3">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium">Details</h2>
              <Button 
                variant="ghost" 
                size="icon" 
                aria-label="close details"
                onClick={() => setSelectedItem(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Separator className="my-3" />
            <div className="h-[480px] md:h-[520px] rounded-lg border bg-muted/10 overflow-auto p-4">
              {!selectedItem ? (
                <div className="h-full flex items-center justify-center text-center text-sm text-muted-foreground">
                  Select a file or folder to view its details
                </div>
              ) : "mime" in selectedItem ? (
                // File details
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-medium text-primary">{(selectedItem as FileDoc).name?.split('.').pop()?.toUpperCase() || "FILE"}</span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium truncate">{(selectedItem as FileDoc).name}</h3>
                      <p className="text-xs text-muted-foreground">{(selectedItem as FileDoc).mime || "Unknown type"}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-muted">
                      <span className="text-muted-foreground">Size</span>
                      <span>{formatBytes((selectedItem as FileDoc).size)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-muted">
                      <span className="text-muted-foreground">Type</span>
                      <span className="truncate max-w-[150px]">{(selectedItem as FileDoc).mime || "-"}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-muted">
                      <span className="text-muted-foreground">Created</span>
                      <span>{selectedItem.createdAt ? new Date(selectedItem.createdAt).toLocaleDateString() : "-"}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-muted">
                      <span className="text-muted-foreground">Favorite</span>
                      <span>{(selectedItem as FileDoc).favorite ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-muted">
                      <span className="text-muted-foreground">ID</span>
                      <span className="text-xs truncate max-w-[100px]">{selectedItem._id}</span>
                    </div>
                  </div>
                  
                  <div className="pt-2 space-y-2">
                    <Button 
                      className="w-full gap-2"
                      onClick={() => downloadFile(selectedItem as FileDoc)}
                      disabled={!(selectedItem as FileDoc).path}
                    >
                      <Upload className="w-4 h-4 rotate-180" /> Download
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full gap-2"
                      onClick={() => {
                        const href = (selectedItem as FileDoc).url || ((selectedItem as FileDoc).path ? `${API_BASE}${(selectedItem as FileDoc).path}` : "");
                        if (href) window.open(href, "_blank", "noopener,noreferrer");
                      }}
                      disabled={!(selectedItem as FileDoc).path}
                    >
                      <Search className="w-4 h-4" /> Preview
                    </Button>
                  </div>
                </div>
              ) : (
                // Folder details
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Folder className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium truncate">{(selectedItem as FolderDoc).name}</h3>
                      <p className="text-xs text-muted-foreground">Folder</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-muted">
                      <span className="text-muted-foreground">Name</span>
                      <span className="truncate max-w-[150px]">{(selectedItem as FolderDoc).name}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-muted">
                      <span className="text-muted-foreground">Description</span>
                      <span className="truncate max-w-[150px]">{(selectedItem as FolderDoc).description || "-"}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-muted">
                      <span className="text-muted-foreground">Created</span>
                      <span>{selectedItem.createdAt ? new Date(selectedItem.createdAt).toLocaleDateString() : "-"}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-muted">
                      <span className="text-muted-foreground">ID</span>
                      <span className="text-xs truncate max-w-[100px]">{selectedItem._id}</span>
                    </div>
                  </div>
                  
                  <div className="pt-2 space-y-2">
                    <Button 
                      className="w-full gap-2"
                      onClick={() => setCurrentFolderId(selectedItem._id)}
                    >
                      <Folder className="w-4 h-4" /> Open Folder
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full gap-2 text-destructive hover:text-destructive"
                      onClick={() => deleteFolder(selectedItem._id)}
                    >
                      <X className="w-4 h-4" /> Delete Folder
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

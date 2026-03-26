import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { 
  ExternalLink, 
  RefreshCw, 
  Trash2, 
  X, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Calendar, 
  User, 
  Tag, 
  Paperclip, 
  MessageSquare, 
  Activity, 
  ChevronRight,
  MoreVertical,
  Plus,
  Send,
  Flag
} from "lucide-react";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type Employee = { _id: string; name?: string; firstName?: string; lastName?: string; avatar?: string; image?: string };
type TaskLabel = { _id: string; name: string; color?: string };

type TaskDoc = {
  _id: string;
  taskNo?: number;
  leadId?: string;
  projectId?: string;
  invoiceId?: string;
  title?: string;
  description?: string;
  points?: number;
  status?: string;
  priority?: string;
  start?: string;
  deadline?: string;
  assignees?: Array<{ name?: string; initials?: string }>;
  collaborators?: string[];
  tags?: string[];
  attachments?: number;
  checklist?: Array<{ _id?: string; text?: string; done?: boolean }>;
  subTasks?: Array<{ _id?: string; title?: string; done?: boolean }>;
  reminders?: Array<{ _id?: string; title?: string; when?: string; repeat?: string; priority?: string }>;
  taskComments?: Array<{ _id?: string; authorName?: string; text?: string; attachmentCount?: number; createdAt?: string }>;
  dependencies?: { blockedBy?: string[]; blocking?: string[] };
  activity?: Array<{ _id?: string; type?: string; message?: string; authorName?: string; createdAt?: string }>;
};

export default function TaskDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [row, setRow] = useState<TaskDoc | null>(null);
  const [loading, setLoading] = useState(false);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [labels, setLabels] = useState<TaskLabel[]>([]);
  const [allTasks, setAllTasks] = useState<Array<{ _id: string; taskNo?: number; title?: string }>>([]);

  const [checklistDraft, setChecklistDraft] = useState("");
  const [subTaskDraft, setSubTaskDraft] = useState("");
  const [depOpen, setDepOpen] = useState(false);
  const [depBlockedBy, setDepBlockedBy] = useState<string>("");
  const [depBlocking, setDepBlocking] = useState<string>("");
  const [reminderDraft, setReminderDraft] = useState({
    priority: "medium",
    title: "",
    date: "",
    time: "",
    repeat: "",
  });
  const [commentDraft, setCommentDraft] = useState("");
  const [commentFiles, setCommentFiles] = useState<File[]>([]);

  const employeeByName = useMemo(() => {
    const m = new Map<string, Employee>();
    for (const e of employees || []) {
      const name = (e.name || `${e.firstName || ""} ${e.lastName || ""}`.trim() || "").trim();
      if (!name) continue;
      m.set(name, e);
    }
    return m;
  }, [employees]);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/tasks/${id}`, { headers: getAuthHeaders() });
      if (r.ok) {
        const d = await r.json();
        setRow(d);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const updateTask = async (taskId: string, patch: any) => {
    try {
      const r = await fetch(`${API_BASE}/api/tasks/${taskId}`,
        {
          method: "PUT",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(patch),
        }
      );
      if (r.ok) {
        const updated = await r.json();
        setRow(updated);
        return { ok: true as const, updated };
      }
    } catch {
    }
    return { ok: false as const, updated: null as any };
  };

  const pushActivity = async (taskId: string, message: string) => {
    const author = (() => {
      try {
        const u = localStorage.getItem("auth_user") || sessionStorage.getItem("auth_user");
        if (!u) return "";
        const j = JSON.parse(u);
        return j?.name || j?.email || "";
      } catch {
        return "";
      }
    })();
    const next = [{ type: "update", message, authorName: author }, ...(row?.activity || [])];
    await updateTask(taskId, { activity: next });
  };

  const uploadCommentFiles = async () => {
    if (!commentFiles.length) return 0;
    try {
      let uploaded = 0;
      for (const f of commentFiles) {
        const fd = new FormData();
        fd.append("file", f);
        fd.append("name", f.name);
        const r = await fetch(`${API_BASE}/api/files`, { method: "POST", headers: getAuthHeaders(), body: fd });
        if (r.ok) uploaded += 1;
      }
      return uploaded;
    } catch {
      return 0;
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/employees`, { headers: getAuthHeaders() });
        if (r.ok) {
          const d = await r.json();
          setEmployees(Array.isArray(d) ? d : []);
        }
      } catch {
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/task-labels`, { headers: getAuthHeaders() });
        if (r.ok) {
          const d = await r.json();
          setLabels(Array.isArray(d) ? d : []);
        }
      } catch {
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/tasks`, { headers: getAuthHeaders() });
        if (r.ok) {
          const d = await r.json();
          setAllTasks(Array.isArray(d) ? d : []);
        } else {
          setAllTasks([]);
        }
      } catch {
        setAllTasks([]);
      }
    })();
  }, []);

  const fmt = (iso?: string) => {
    if (!iso) return "-";
    try {
      return new Date(iso).toISOString().slice(0, 10);
    } catch {
      return "-";
    }
  };

  const getInitials = (name?: string) => {
    const s = (name || "").trim();
    if (!s) return "-";
    return s
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const assignee = useMemo(() => row?.assignees?.[0]?.name || "-", [row]);
  const collaborators = useMemo(() => (row?.collaborators || []).join(", ") || "-", [row]);

  const displayTaskNo = useMemo(() => {
    if (row?.taskNo) return `#${row.taskNo}`;
    return `#${String(row?._id || id || "").slice(-6)}`;
  }, [row, id]);

  const statusLabel = (s?: string) => {
    const v = (s || "").toLowerCase();
    if (v === "in-progress") return "In progress";
    if (v === "todo") return "To do";
    if (v === "done") return "Done";
    if (v === "backlog") return "Backlog";
    if (v === "review") return "Review";
    return s || "-";
  };

  const priorityLabel = (p?: string) => {
    const v = (p || "").toLowerCase();
    if (v === "urgent") return "Urgent";
    if (v === "high") return "High";
    if (v === "medium") return "Minor";
    if (v === "low") return "Low";
    return p || "-";
  };

  return (
    <div className="p-4">
      <Card>
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-lg font-semibold">Task info {displayTaskNo}</div>
              {row?._id ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => navigate(`/tasks/${row._id}`)}
                  aria-label="Open"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline">Actions</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card">
                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); void load(); }}>Refresh</DropdownMenuItem>
                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); navigate("/tasks"); }}>Back to tasks</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button type="button" variant="outline" onClick={load} disabled={loading}>
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                <X className="w-4 h-4 mr-2" />
                Close
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-4">
              <div className="space-y-1">
                <div className="text-sm font-medium">{row?.title || "-"}</div>
                <div className="text-sm text-muted-foreground">{row?.projectId ? "" : ""}</div>
                {row?.leadId ? (
                  <button type="button" className="text-sm text-primary underline" onClick={() => navigate(`/crm/leads/${row.leadId}`)}>
                    Lead: {"Open"}
                  </button>
                ) : null}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground font-medium">Checklist</div>
                    <div className="text-xs text-muted-foreground">
                      {(row?.checklist || []).filter((x) => !!x?.done).length}/{(row?.checklist || []).length}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground">Shortable</div>
                    <Switch checked={false} onCheckedChange={() => {}} />
                  </div>
                </div>

                {(row?.checklist || []).map((it, idx) => (
                  <div key={it._id || String(idx)} className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={!!it.done}
                        onChange={async () => {
                          if (!row?._id) return;
                          const next = (row.checklist || []).map((x, i) => (i === idx ? { ...x, done: !x.done } : x));
                          const r = await updateTask(row._id, { checklist: next });
                          if (r.ok) void pushActivity(row._id, "Updated checklist item");
                        }}
                      />
                      <span className={it.done ? "line-through text-muted-foreground truncate" : "truncate"}>{it.text || "-"}</span>
                    </label>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={async () => {
                        if (!row?._id) return;
                        const next = (row.checklist || []).filter((_, i) => i !== idx);
                        const r = await updateTask(row._id, { checklist: next });
                        if (r.ok) void pushActivity(row._id, "Removed checklist item");
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}

                <Input placeholder="Add item" value={checklistDraft} onChange={(e) => setChecklistDraft(e.target.value)} />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={async () => {
                      const text = (checklistDraft || "").trim();
                      if (!text || !row?._id) return;
                      const next = [{ text, done: false }, ...(row.checklist || [])];
                      const r = await updateTask(row._id, { checklist: next });
                      if (r.ok) {
                        setChecklistDraft("");
                        void pushActivity(row._id, "Added checklist item");
                      }
                    }}
                  >
                    Add
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setChecklistDraft("")}>Cancel</Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="text-xs text-muted-foreground font-medium">Sub tasks</div>
                {(row?.subTasks || []).map((st, idx) => (
                  <div key={st._id || String(idx)} className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={!!st.done}
                        onChange={async () => {
                          if (!row?._id) return;
                          const next = (row.subTasks || []).map((x, i) => (i === idx ? { ...x, done: !x.done } : x));
                          const r = await updateTask(row._id, { subTasks: next });
                          if (r.ok) void pushActivity(row._id, "Updated sub task");
                        }}
                      />
                      <span className={st.done ? "line-through text-muted-foreground truncate" : "truncate"}>{st.title || "-"}</span>
                    </label>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={async () => {
                        if (!row?._id) return;
                        const next = (row.subTasks || []).filter((_, i) => i !== idx);
                        const r = await updateTask(row._id, { subTasks: next });
                        if (r.ok) void pushActivity(row._id, "Removed sub task");
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}

                <Input placeholder="Create a sub task" value={subTaskDraft} onChange={(e) => setSubTaskDraft(e.target.value)} />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={async () => {
                      const title = (subTaskDraft || "").trim();
                      if (!title || !row?._id) return;
                      const next = [{ title, done: false }, ...(row.subTasks || [])];
                      const r = await updateTask(row._id, { subTasks: next });
                      if (r.ok) {
                        setSubTaskDraft("");
                        void pushActivity(row._id, "Added sub task");
                      }
                    }}
                  >
                    Create
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setSubTaskDraft("")}>Cancel</Button>
                </div>

                <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setDepOpen((s) => !s)}>
                  Add dependency
                </Button>

                {depOpen ? (
                  <div className="border rounded-md p-3 space-y-2">
                    <div className="text-xs text-muted-foreground">This task blocked by</div>
                    <Select value={depBlockedBy || "__none__"} onValueChange={(v) => setDepBlockedBy(v === "__none__" ? "" : v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select task" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-</SelectItem>
                        {allTasks.filter((t) => t._id !== row?._id).slice(0, 50).map((t) => (
                          <SelectItem key={t._id} value={t._id}>{t.taskNo ? `#${t.taskNo}` : ""} {t.title || "Task"}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="text-xs text-muted-foreground">This task blocking</div>
                    <Select value={depBlocking || "__none__"} onValueChange={(v) => setDepBlocking(v === "__none__" ? "" : v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select task" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-</SelectItem>
                        {allTasks.filter((t) => t._id !== row?._id).slice(0, 50).map((t) => (
                          <SelectItem key={t._id} value={t._id}>{t.taskNo ? `#${t.taskNo}` : ""} {t.title || "Task"}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        onClick={async () => {
                          if (!row?._id) return;
                          const next = {
                            blockedBy: depBlockedBy ? [depBlockedBy] : [],
                            blocking: depBlocking ? [depBlocking] : [],
                          };
                          const r = await updateTask(row._id, { dependencies: next });
                          if (r.ok) {
                            void pushActivity(row._id, "Updated dependencies");
                            setDepOpen(false);
                          }
                        }}
                      >
                        Add
                      </Button>
                      <Button type="button" variant="outline" onClick={() => { setDepOpen(false); setDepBlockedBy(""); setDepBlocking(""); }}>Cancel</Button>
                    </div>
                  </div>
                ) : null}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Write a comment...</div>
                <Textarea placeholder="Write a comment..." value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} />

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      id="tasks-details-comment-files"
                      onChange={(e) => setCommentFiles(Array.from(e.target.files || []))}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("tasks-details-comment-files")?.click()}>
                      Upload File
                    </Button>
                    <div className="text-xs text-muted-foreground truncate">
                      {commentFiles.length ? `${commentFiles.length} file(s) selected` : ""}
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={async () => {
                      const text = (commentDraft || "").trim();
                      if (!row?._id || !text) return;
                      const attachmentCount = await uploadCommentFiles();
                      const author = (() => {
                        try {
                          const u = localStorage.getItem("auth_user") || sessionStorage.getItem("auth_user");
                          if (!u) return "";
                          const j = JSON.parse(u);
                          return j?.name || j?.email || "";
                        } catch {
                          return "";
                        }
                      })();
                      const next = [{ authorName: author, text, attachmentCount }, ...(row.taskComments || [])];
                      const r = await updateTask(row._id, {
                        taskComments: next,
                        comments: next.length,
                        attachments: (row.attachments || 0) + attachmentCount,
                      });
                      if (r.ok) {
                        setCommentDraft("");
                        setCommentFiles([]);
                        void pushActivity(row._id, "Posted a comment");
                      }
                    }}
                  >
                    Post Comment
                  </Button>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="text-sm font-medium">Activity</div>
                  {(row?.activity || []).length ? (
                    <div className="space-y-2">
                      {(row?.activity || []).slice(0, 30).map((a, idx) => (
                        <div key={a._id || String(idx)} className="flex items-start gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-[10px]">{getInitials(a.authorName)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">{a.authorName || ""}</span>
                              {a.authorName ? " " : ""}
                              {a.message || a.type || ""}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">No activity yet.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-9 w-9">
                    {(() => {
                      const name = row?.assignees?.[0]?.name;
                      const emp = name ? employeeByName.get(String(name).trim()) : undefined;
                      const img = emp?.avatar || emp?.image;
                      return img ? <AvatarImage src={`${API_BASE}${img}`} alt={name || "avatar"} /> : null;
                    })()}
                    <AvatarFallback className="text-[10px]">{getInitials(assignee)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{assignee}</div>
                    <div className="text-xs text-muted-foreground truncate">{row?.assignees?.[0]?.name ? "" : "-"}</div>
                  </div>
                </div>

                <Select
                  value={(row?.status || "todo")}
                  onValueChange={async (v) => {
                    if (!row?._id) return;
                    const r = await updateTask(row._id, { status: v });
                    if (r.ok) void pushActivity(row._id, `Status changed to ${statusLabel(v)}`);
                  }}
                >
                  <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To do</SelectItem>
                    <SelectItem value="in-progress">In progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Start date</div>
                  <DatePicker
                    value={(row?.start ? String(row.start).slice(0, 10) : "")}
                    onChange={async (v) => {
                      if (!row?._id) return;
                      const r = await updateTask(row._id, { start: v || undefined });
                      if (r.ok) void pushActivity(row._id, "Start date updated");
                    }}
                    placeholder="Pick start date"
                    className="h-9"
                  />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Deadline</div>
                  <DatePicker
                    value={(row?.deadline ? String(row.deadline).slice(0, 10) : "")}
                    onChange={async (v) => {
                      if (!row?._id) return;
                      const r = await updateTask(row._id, { deadline: v || undefined });
                      if (r.ok) void pushActivity(row._id, "Deadline updated");
                    }}
                    placeholder="Pick deadline"
                    className="h-9"
                  />
                </div>
              </div>

              <div className="text-sm">
                <div className="text-xs text-muted-foreground">Priority</div>
                <Select
                  value={(row?.priority || "medium")}
                  onValueChange={async (v) => {
                    if (!row?._id) return;
                    const r = await updateTask(row._id, { priority: v });
                    if (r.ok) void pushActivity(row._id, "Priority updated");
                  }}
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Critical</SelectItem>
                    <SelectItem value="high">Major</SelectItem>
                    <SelectItem value="medium">Minor</SelectItem>
                    <SelectItem value="low">Blocker</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="text-sm">
                <div className="text-xs text-muted-foreground">Label</div>
                <Select
                  value={((row?.tags || [])[0] || "__none__")}
                  onValueChange={async (v) => {
                    if (!row?._id) return;
                    const nextTags = v === "__none__" ? [] : [v];
                    const r = await updateTask(row._id, { tags: nextTags });
                    if (r.ok) void pushActivity(row._id, "Label updated");
                  }}
                >
                  <SelectTrigger className="h-9"><SelectValue placeholder="Add Label" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-</SelectItem>
                    {labels.map((l) => (
                      <SelectItem key={l._id} value={l.name}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="text-sm">
                <div className="text-xs text-muted-foreground">Collaborators</div>
                <div className="font-medium">{collaborators}</div>
              </div>

              <div className="text-sm">
                <div className="text-xs text-muted-foreground">Reminders (Private):</div>
                <button type="button" className="text-primary underline text-sm" onClick={() => setReminderDraft((p) => ({ ...p }))}>+ Add reminder</button>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Input placeholder="Title" value={reminderDraft.title} onChange={(e) => setReminderDraft((p) => ({ ...p, title: e.target.value }))} className="h-9" />
                  <Select value={reminderDraft.priority} onValueChange={(v) => setReminderDraft((p) => ({ ...p, priority: v }))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Priority" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Minor</SelectItem>
                      <SelectItem value="high">Major</SelectItem>
                      <SelectItem value="urgent">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  <DatePicker value={reminderDraft.date} onChange={(v) => setReminderDraft((p) => ({ ...p, date: v }))} placeholder="Pick date" className="h-9" />
                  <Input type="time" value={reminderDraft.time} onChange={(e) => setReminderDraft((p) => ({ ...p, time: e.target.value }))} className="h-9" />
                  <Input placeholder="Repeat" value={reminderDraft.repeat} onChange={(e) => setReminderDraft((p) => ({ ...p, repeat: e.target.value }))} className="h-9 col-span-2" />
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <Button
                    type="button"
                    onClick={async () => {
                      if (!row?._id) return;
                      const title = (reminderDraft.title || "").trim();
                      if (!title) return;
                      const when = reminderDraft.date
                        ? new Date(`${reminderDraft.date}T${reminderDraft.time || "00:00"}:00`).toISOString()
                        : undefined;
                      const next = [{
                        title,
                        when,
                        repeat: (reminderDraft.repeat || "").trim(),
                        priority: reminderDraft.priority,
                      }, ...(row.reminders || [])];
                      const r = await updateTask(row._id, { reminders: next });
                      if (r.ok) {
                        setReminderDraft({ priority: "medium", title: "", date: "", time: "", repeat: "" });
                        void pushActivity(row._id, "Added reminder");
                      }
                    }}
                  >
                    Add
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setReminderDraft({ priority: "medium", title: "", date: "", time: "", repeat: "" })}>Cancel</Button>
                </div>

                {(row?.reminders || []).length ? (
                  <div className="mt-3 space-y-2">
                    {(row?.reminders || []).slice(0, 5).map((r, idx) => (
                      <div key={r._id || String(idx)} className="flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{r.title}</div>
                          <div className="text-muted-foreground truncate">{fmt(r.when as any) || ""}</div>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={async () => {
                            if (!row?._id) return;
                            const next = (row.reminders || []).filter((_, i) => i !== idx);
                            const rr = await updateTask(row._id, { reminders: next });
                            if (rr.ok) void pushActivity(row._id, "Removed reminder");
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground mt-2">No record found.</div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

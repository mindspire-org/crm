import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import ReactQuill, { Quill } from "react-quill";
import "react-quill/dist/quill.snow.css";
import { API_BASE } from "@/lib/api/base";


const getAuthHeaders = () => {
  const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return { headers, token };
};

export default function AddAnnouncement() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [shareTeam, setShareTeam] = useState(true);
  const [shareClients, setShareClients] = useState(false);
  const [shareLeads, setShareLeads] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quill = useMemo(() => {
    try {
      const Font = Quill.import("formats/font") as any;
      Font.whitelist = [
        "open-sans",
        "arial",
        "arial-black",
        "comic-sans",
        "courier-new",
        "helvetica",
        "impact",
        "tahoma",
        "times-new-roman",
        "verdana",
      ];
      (Quill as any).register(Font, true);
    } catch {
      // ignore
    }

    const modules = {
      toolbar: [
        [{ font: [
          "open-sans",
          "arial",
          "arial-black",
          "comic-sans",
          "courier-new",
          "helvetica",
          "impact",
          "tahoma",
          "times-new-roman",
          "verdana",
        ] }],
        [{ size: ["small", false, "large", "huge"] }],
        ["bold", "italic", "underline", "strike"],
        [{ color: [] }, { background: [] }],
        [{ script: "sub" }, { script: "super" }],
        [{ header: 1 }, { header: 2 }, "blockquote", "code-block"],
        [{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
        [{ direction: "rtl" }, { align: [] }],
        ["link", "image"],
        ["clean"],
      ],
    } as const;

    const formats = [
      "font",
      "size",
      "bold",
      "italic",
      "underline",
      "strike",
      "color",
      "background",
      "script",
      "header",
      "blockquote",
      "code-block",
      "list",
      "bullet",
      "indent",
      "direction",
      "align",
      "link",
      "image",
      "clean",
    ];

    return { modules, formats };
  }, []);

  const onSubmit = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { headers, token } = getAuthHeaders();
      if (!token) {
        setError("Please login again.");
        navigate("/auth", { replace: true });
        return;
      }

      const res = await fetch(`${API_BASE}/api/announcements`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: title.trim(),
          message,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          shareWith: {
            teamMembers: shareTeam,
            clients: shareClients,
            leads: shareLeads,
          },
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.status === 401) {
        setError("Session expired. Please login again.");
        navigate("/auth", { replace: true });
        return;
      }
      if (!res.ok) throw new Error(json?.error || `Failed to create announcement (HTTP ${res.status})`);
      navigate(`/announcements/${json._id}`);
    } catch (e: any) {
      setError(String(e?.message || "Failed to create announcement"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-sm text-muted-foreground">Add announcement</h1>
        <Button variant="outline" size="sm" onClick={() => navigate("/announcements")}>Back</Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          {error && <div className="text-sm text-destructive">{error}</div>}

          <div className="space-y-2">
            <Label>Title</Label>
            <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Content</Label>
            <div className="border rounded-md bg-background overflow-hidden">
              <style>{`
                .ql-toolbar.ql-snow { border: 0; border-bottom: 1px solid hsl(var(--border)); }
                .ql-container.ql-snow { border: 0; }
                .ql-editor { min-height: 220px; }
                .ql-snow .ql-picker.ql-font .ql-picker-label[data-value='open-sans']::before,
                .ql-snow .ql-picker.ql-font .ql-picker-item[data-value='open-sans']::before { content: 'Open Sans'; font-family: 'Open Sans', sans-serif; }
                .ql-snow .ql-picker.ql-font .ql-picker-label[data-value='arial']::before,
                .ql-snow .ql-picker.ql-font .ql-picker-item[data-value='arial']::before { content: 'Arial'; font-family: Arial, sans-serif; }
                .ql-snow .ql-picker.ql-font .ql-picker-label[data-value='arial-black']::before,
                .ql-snow .ql-picker.ql-font .ql-picker-item[data-value='arial-black']::before { content: 'Arial Black'; font-family: 'Arial Black', sans-serif; }
                .ql-snow .ql-picker.ql-font .ql-picker-label[data-value='comic-sans']::before,
                .ql-snow .ql-picker.ql-font .ql-picker-item[data-value='comic-sans']::before { content: 'Comic Sans MS'; font-family: 'Comic Sans MS', cursive; }
                .ql-snow .ql-picker.ql-font .ql-picker-label[data-value='courier-new']::before,
                .ql-snow .ql-picker.ql-font .ql-picker-item[data-value='courier-new']::before { content: 'Courier New'; font-family: 'Courier New', monospace; }
                .ql-snow .ql-picker.ql-font .ql-picker-label[data-value='helvetica']::before,
                .ql-snow .ql-picker.ql-font .ql-picker-item[data-value='helvetica']::before { content: 'Helvetica'; font-family: Helvetica, sans-serif; }
                .ql-snow .ql-picker.ql-font .ql-picker-label[data-value='impact']::before,
                .ql-snow .ql-picker.ql-font .ql-picker-item[data-value='impact']::before { content: 'Impact'; font-family: Impact, sans-serif; }
                .ql-snow .ql-picker.ql-font .ql-picker-label[data-value='tahoma']::before,
                .ql-snow .ql-picker.ql-font .ql-picker-item[data-value='tahoma']::before { content: 'Tahoma'; font-family: Tahoma, sans-serif; }
                .ql-snow .ql-picker.ql-font .ql-picker-label[data-value='times-new-roman']::before,
                .ql-snow .ql-picker.ql-font .ql-picker-item[data-value='times-new-roman']::before { content: 'Times New Roman'; font-family: 'Times New Roman', serif; }
                .ql-snow .ql-picker.ql-font .ql-picker-label[data-value='verdana']::before,
                .ql-snow .ql-picker.ql-font .ql-picker-item[data-value='verdana']::before { content: 'Verdana'; font-family: Verdana, sans-serif; }
                .ql-font-open-sans { font-family: 'Open Sans', sans-serif; }
                .ql-font-arial { font-family: Arial, sans-serif; }
                .ql-font-arial-black { font-family: 'Arial Black', sans-serif; }
                .ql-font-comic-sans { font-family: 'Comic Sans MS', cursive; }
                .ql-font-courier-new { font-family: 'Courier New', monospace; }
                .ql-font-helvetica { font-family: Helvetica, sans-serif; }
                .ql-font-impact { font-family: Impact, sans-serif; }
                .ql-font-tahoma { font-family: Tahoma, sans-serif; }
                .ql-font-times-new-roman { font-family: 'Times New Roman', serif; }
                .ql-font-verdana { font-family: Verdana, sans-serif; }
              `}</style>

              <ReactQuill
                theme="snow"
                value={message}
                onChange={setMessage}
                modules={quill.modules as any}
                formats={quill.formats as any}
                placeholder="Write announcement..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Start date</Label>
              <DatePicker value={startDate} onChange={setStartDate} placeholder="Pick start date" />
            </div>
            <div className="space-y-2">
              <Label>End date</Label>
              <DatePicker value={endDate} onChange={setEndDate} placeholder="Pick end date" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Share with</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={shareTeam} onCheckedChange={(v) => setShareTeam(Boolean(v))} />
                <span>All team members</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={shareClients} onCheckedChange={(v) => setShareClients(Boolean(v))} />
                <span>All clients</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={shareLeads} onCheckedChange={(v) => setShareLeads(Boolean(v))} />
                <span>All leads</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => navigate("/announcements")} disabled={loading}>Cancel</Button>
            <Button onClick={onSubmit} disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

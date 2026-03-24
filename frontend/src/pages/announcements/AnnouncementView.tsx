import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowLeft, Layout, Calendar, Star } from "lucide-react";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders as getHeaders } from "@/lib/api/auth";
import { getCurrentUser } from "@/utils/roleAccess";

type Announcement = {
  _id: string;
  title: string;
  message?: string;
  createdByName?: string;
  createdAt?: string;
  startDate?: string;
  endDate?: string;
};

const toYmd = (v?: string) => {
  if (!v) return "";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
};

export default function AnnouncementView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPoster, setShowPoster] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  const handlePrintPoster = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !item) return;

    const html = `
      <html>
        <head>
          <title>Announcement Poster - ${item.title}</title>
          <style>
            body { margin: 0; padding: 0; }
            @page { size: A4; margin: 0; }
          </style>
        </head>
        <body>
          <div id="poster-root"></div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    
    // We need to inject the styles and content into the new window
    // A better way is to use a dedicated print route like I did for subscriptions
    window.open(`/announcements/${id}/poster`, '_blank');
  };

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const { headers, token } = getHeaders();
        if (!token) {
          setError("Please login again.");
          navigate("/auth", { replace: true });
          return;
        }

        const res = await fetch(`${API_BASE}/api/announcements/${id}`, { 
          headers: headers as any 
        });
        const json = await res.json().catch(() => null);
        if (res.status === 401) {
          setError("Session expired. Please login again.");
          navigate("/auth", { replace: true });
          return;
        }
        if (!res.ok) throw new Error(json?.error || `Failed to load announcement (HTTP ${res.status})`);
        setItem(json);
      } catch (e: any) {
        setError(String(e?.message || "Failed to load announcement"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const role = getCurrentUser()?.role || "admin";

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black uppercase italic tracking-tight text-slate-900">
                  Announcement <span className="text-indigo-600">View</span>
                </h1>
              </div>
              <p className="text-sm text-slate-500 font-medium tracking-tight">
                Ref: <span className="text-slate-900 font-bold">#{item?._id?.slice(-6).toUpperCase()}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate(`/announcements/${id}/poster`)}
              className="rounded-xl border-indigo-200 bg-indigo-50 text-indigo-700 font-black text-[10px] tracking-widest uppercase hover:bg-indigo-100"
            >
              <Layout className="w-4 h-4 mr-2" />
              View as Poster
            </Button>
            <Button variant="link" onClick={() => navigate("/announcements")}>← Back to List</Button>
          </div>
        </div>

        <Card className="border-0 shadow-2xl shadow-indigo-100/50 rounded-[2.5rem] overflow-hidden bg-white">
          <CardContent className="p-8 sm:p-12">
            {loading && (
              <div className="text-center py-20 flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span className="font-black uppercase text-[10px] tracking-[0.2em] text-slate-400 italic">Accessing Matrix...</span>
              </div>
            )}
            {error && <div className="text-sm text-destructive bg-rose-50 p-4 rounded-xl border border-rose-100 font-bold uppercase tracking-widest">{error}</div>}

            {item && (
              <div className="space-y-8">
                <div className="space-y-4 border-b border-slate-100 pb-8">
                  <h2 className="text-4xl font-black text-slate-900 uppercase italic leading-tight tracking-tighter">
                    {item.title}
                  </h2>
                  <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-500" />
                      <span>{toYmd(item.startDate || item.createdAt)}</span>
                    </div>
                    {item.createdByName && (
                      <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                        <Star className="w-4 h-4 text-indigo-500" />
                        <span>Issued by {item.createdByName}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="prose prose-slate max-w-none prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-p:text-slate-600 prose-p:leading-relaxed prose-li:text-slate-600">
                  {item.message ? (
                    <div dangerouslySetInnerHTML={{ __html: item.message }} />
                  ) : (
                    <p className="italic text-slate-400 uppercase tracking-widest text-[10px] font-black">No content in record.</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

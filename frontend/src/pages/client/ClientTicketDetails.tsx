import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Send } from "lucide-react";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";

type TicketMessage = {
  text?: string;
  createdBy?: string;
  createdAt?: string;
};

type TicketDoc = {
  _id: string;
  ticketNo?: number;
  title?: string;
  description?: string;
  status?: string;
  projectId?: string;
  createdAt?: string;
  messages?: TicketMessage[];
};

const toIsoDateTime = (d?: any) => {
  try {
    if (!d) return "";
    return new Date(d).toISOString().replace("T", " ").slice(0, 16);
  } catch {
    return "";
  }
};

export default function ClientTicketDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<TicketDoc | null>(null);
  const [reply, setReply] = useState("");

  const loadTicket = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/client/tickets/${id}`, { headers });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load ticket");
      setTicket(json);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load ticket");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicket();
  }, [id]);

  const sendReply = async () => {
    if (!id) return;
    const text = reply.trim();
    if (!text) return;

    try {
      const headers = getAuthHeaders({ "Content-Type": "application/json" });
      const res = await fetch(`${API_BASE}/api/client/tickets/${id}/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify({ text }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to send message");
      setReply("");
      setTicket(json);
      toast.success("Message sent");
    } catch (e: any) {
      toast.error(e?.message || "Failed to send message");
    }
  };

  const no = ticket?.ticketNo != null ? String(ticket.ticketNo) : "";
  const ticketCode = ticket ? (no ? `TK-${no.padStart(3, "0")}` : String(ticket._id || "").slice(0, 8)) : "";
  const statusRaw = String(ticket?.status || "open").toLowerCase();
  const statusLabel = statusRaw === "closed" ? "Closed" : statusRaw === "open" ? "Open" : "In Progress";
  const variant = statusRaw === "closed" ? "default" : statusRaw === "open" ? "secondary" : "secondary";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/client/tickets")}> 
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{ticket?.title || (loading ? "Loading..." : "Ticket")}</h1>
            {ticket ? <p className="text-sm text-muted-foreground">{ticketCode}</p> : null}
          </div>
        </div>
        <Badge variant={variant as any}>{statusLabel}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm">
            <div className="font-medium">Description</div>
            <div className="text-muted-foreground whitespace-pre-wrap">{ticket?.description || "-"}</div>
          </div>
          <div className="text-sm">
            <div className="font-medium">Created</div>
            <div className="text-muted-foreground">{toIsoDateTime(ticket?.createdAt)}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(ticket?.messages || []).length === 0 ? (
            <div className="text-sm text-muted-foreground">No messages yet.</div>
          ) : (
            <div className="space-y-3">
              {(ticket?.messages || []).map((m, idx) => (
                <div key={idx} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{m.createdBy || ""}</div>
                    <div className="text-xs text-muted-foreground">{toIsoDateTime(m.createdAt)}</div>
                  </div>
                  <div className="text-sm mt-2 whitespace-pre-wrap">{m.text || ""}</div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply..." rows={4} />
            <div className="flex justify-end">
              <Button onClick={sendReply} disabled={!reply.trim()}>
                <Send className="w-4 h-4 mr-2" />
                Send
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

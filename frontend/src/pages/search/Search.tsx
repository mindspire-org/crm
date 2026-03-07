import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { getCurrentUser } from "@/utils/roleAccess";

type SearchResult = {
  type: string;
  title: string;
  subtitle?: string;
  href: string;
};

const safeJson = async (res: Response) => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

export default function Search() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  const role = useMemo(() => {
    const u = getCurrentUser();
    return String(u?.role || "staff").toLowerCase();
  }, []);

  const canSearchProjects = useMemo(
    () => ["admin", "staff", "sales", "sales_manager", "finance", "developer", "project_manager", "marketing_manager"].includes(role),
    [role]
  );
  const canSearchTickets = useMemo(() => ["admin", "staff", "marketer", "marketing_manager"].includes(role), [role]);
  const canSearchClients = useMemo(() => ["admin", "staff", "marketer", "marketing_manager"].includes(role), [role]);
  const canSearchLeads = useMemo(
    () => ["admin", "marketer", "marketing_manager", "sales", "sales_manager", "staff", "finance", "developer", "project_manager"].includes(role),
    [role]
  );
  const canSearchTasks = useMemo(
    () => ["admin", "staff", "marketer", "marketing_manager", "sales", "sales_manager", "finance", "developer", "project_manager"].includes(role),
    [role]
  );

  useEffect(() => {
    const query = q.trim();
    const t = window.setTimeout(async () => {
      if (!query) {
        setResults([]);
        return;
      }

      setLoading(true);
      const headers = getAuthHeaders();

      const fetchJson = async (url: string) => {
        try {
          const res = await fetch(url, { headers });
          if (!res.ok) return [];
          const json = await safeJson(res);
          return Array.isArray(json) ? json : [];
        } catch {
          return [];
        }
      };

      const next: SearchResult[] = [];

      if (role === "client") {
        const [projects, tickets, invoices, estimates, proposals, contracts] = await Promise.all([
          fetchJson(`${API_BASE}/api/client/projects`),
          fetchJson(`${API_BASE}/api/client/tickets`),
          fetchJson(`${API_BASE}/api/client/invoices`),
          fetchJson(`${API_BASE}/api/client/estimates`),
          fetchJson(`${API_BASE}/api/client/proposals`),
          fetchJson(`${API_BASE}/api/client/contracts`),
        ]);

        for (const p of projects) {
          const title = String(p?.title || "").trim();
          const clientName = String(p?.client || "").trim();
          if (!title) continue;
          if (!title.toLowerCase().includes(query.toLowerCase()) && !clientName.toLowerCase().includes(query.toLowerCase())) continue;
          next.push({ type: "Project", title, subtitle: clientName || undefined, href: "/client/projects" });
        }

        for (const t of tickets) {
          const title = String(t?.title || "").trim();
          const clientName = String(t?.client || "").trim();
          const no = String(t?.ticketNo || "").trim();
          const hay = `${title} ${clientName} ${no}`.toLowerCase();
          if (!title) continue;
          if (!hay.includes(query.toLowerCase())) continue;
          next.push({ type: "Ticket", title, subtitle: no ? `#${no}` : undefined, href: `/client/tickets/${t?._id}` });
        }

        const filterDocs = (items: any[], type: string, titleKey: string, href: string) => {
          for (const it of items) {
            const title = String(it?.[titleKey] || it?.number || "").trim();
            const clientName = String(it?.client || "").trim();
            const hay = `${title} ${clientName}`.toLowerCase();
            if (!title) continue;
            if (!hay.includes(query.toLowerCase())) continue;
            next.push({ type, title, subtitle: clientName || undefined, href });
          }
        };

        filterDocs(invoices, "Invoice", "number", "/client/invoices");
        filterDocs(estimates, "Estimate", "number", "/client/estimates");
        filterDocs(proposals, "Proposal", "title", "/client/proposals");
        filterDocs(contracts, "Contract", "title", "/client/contracts");

        setResults(next);
        setLoading(false);
        return;
      }

      const calls: Promise<any[]>[] = [];
      const mapFns: ((items: any[]) => void)[] = [];

      if (canSearchTasks) {
        calls.push(fetchJson(`${API_BASE}/api/tasks?q=${encodeURIComponent(query)}`));
        mapFns.push((items) => {
          for (const it of items) {
            const title = String(it?.title || "").trim();
            if (!title) continue;
            const no = String(it?.taskNo || "").trim();
            const status = String(it?.status || "").trim();
            next.push({ type: "Task", title, subtitle: no ? `#${no}${status ? ` • ${status}` : ""}` : status || undefined, href: `/tasks/${it?._id}` });
          }
        });
      }

      if (canSearchProjects) {
        calls.push(fetchJson(`${API_BASE}/api/projects?q=${encodeURIComponent(query)}`));
        mapFns.push((items) => {
          for (const it of items) {
            const title = String(it?.title || "").trim();
            if (!title) continue;
            const clientName = String(it?.client || "").trim();
            next.push({ type: "Project", title, subtitle: clientName || undefined, href: `/projects/${it?._id}` });
          }
        });
      }

      if (canSearchTickets) {
        calls.push(fetchJson(`${API_BASE}/api/tickets?q=${encodeURIComponent(query)}`));
        mapFns.push((items) => {
          for (const it of items) {
            const title = String(it?.title || "").trim();
            if (!title) continue;
            const no = String(it?.ticketNo || "").trim();
            const clientName = String(it?.client || "").trim();
            next.push({ type: "Ticket", title, subtitle: no ? `#${no}${clientName ? ` • ${clientName}` : ""}` : clientName || undefined, href: `/tickets/${it?._id}` });
          }
        });
      }

      if (canSearchLeads) {
        calls.push(fetchJson(`${API_BASE}/api/leads?q=${encodeURIComponent(query)}`));
        mapFns.push((items) => {
          for (const it of items) {
            const name = String(it?.name || "").trim();
            if (!name) continue;
            const company = String(it?.company || "").trim();
            const email = String(it?.email || "").trim();
            const subtitle = company || email || undefined;
            next.push({ type: "Lead", title: name, subtitle, href: `/crm/leads/${it?._id}` });
          }
        });
      }

      if (canSearchClients) {
        calls.push(fetchJson(`${API_BASE}/api/clients?q=${encodeURIComponent(query)}`));
        mapFns.push((items) => {
          for (const it of items) {
            const title = String(it?.company || it?.person || it?.email || "").trim();
            if (!title) continue;
            const email = String(it?.email || "").trim();
            next.push({ type: "Client", title, subtitle: email || undefined, href: `/clients/${it?._id}` });
          }
        });
      }

      const responses = await Promise.allSettled(calls);
      responses.forEach((r, idx) => {
        const items = r.status === "fulfilled" ? r.value : [];
        const map = mapFns[idx];
        if (map) map(items);
      });

      setResults(next);
      setLoading(false);
    }, 250);

    return () => window.clearTimeout(t);
  }, [q, role, canSearchProjects, canSearchTickets, canSearchClients, canSearchLeads, canSearchTasks]);

  const grouped = useMemo(() => {
    const m = new Map<string, SearchResult[]>();
    for (const r of results) {
      const k = r.type;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    return Array.from(m.entries());
  }, [results]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Search</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tasks, projects, tickets, leads, clients..."
          />
          <div className="text-sm text-muted-foreground">
            {loading ? "Searching..." : results.length ? `${results.length} results` : q.trim() ? "No results" : "Type to search"}
          </div>
        </CardContent>
      </Card>

      {grouped.map(([type, items]) => (
        <Card key={type}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{type}</span>
              <Badge variant="secondary">{items.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.slice(0, 20).map((it, idx) => (
              <Link
                key={`${type}-${idx}-${it.href}`}
                to={it.href}
                className="block rounded-md border border-border bg-card px-3 py-2 hover:bg-accent transition"
              >
                <div className="font-medium leading-tight">{it.title}</div>
                {it.subtitle ? <div className="text-sm text-muted-foreground">{it.subtitle}</div> : null}
              </Link>
            ))}
            {items.length > 20 ? (
              <div className="text-sm text-muted-foreground">Showing first 20 results</div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

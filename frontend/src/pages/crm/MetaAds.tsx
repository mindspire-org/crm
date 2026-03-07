import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { RefreshCw } from "lucide-react";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

type MetaStatsRow = {
  campaign_id?: string;
  campaign_name?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  cpc?: string;
  cpm?: string;
  actions?: any[];
  action_values?: any[];
};

type MetaLeadRow = {
  _id: string;
  leadgenId: string;
  formId?: string;
  adId?: string;
  adsetId?: string;
  campaignId?: string;
  createdTime?: string;
  createdAt?: string;
  leadId?: {
    _id: string;
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    status?: string;
    source?: string;
    createdAt?: string;
  };
};

type MetaConfig = {
  enabled: boolean;
  hasAccessToken: boolean;
  adAccountId: string;
  verifyToken: string;
  source?: string;
  updatedAt?: string | null;
};

const safeNum = (v: any) => {
  const n = Number(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export default function MetaAds() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<MetaStatsRow[]>([]);
  const [metaLeads, setMetaLeads] = useState<MetaLeadRow[]>([]);

  const [settingsLoading, setSettingsLoading] = useState(false);
  const [config, setConfig] = useState<MetaConfig | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [adAccountId, setAdAccountId] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [accessToken, setAccessToken] = useState("");

  const [since, setSince] = useState<string>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [until, setUntil] = useState<string>(new Date().toISOString().slice(0, 10));

  const loadConfig = async () => {
    try {
      setSettingsLoading(true);
      const res = await fetch(`${API_BASE}/api/meta/config`, { headers: getAuthHeaders() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to load Meta config");
      setConfig(json as MetaConfig);
      setEnabled(Boolean((json as MetaConfig)?.enabled));
      setAdAccountId(String((json as MetaConfig)?.adAccountId || ""));
      setVerifyToken(String((json as MetaConfig)?.verifyToken || ""));
      setAccessToken("");
    } catch (e: any) {
      toast.error(e?.message || "Failed to load Meta config");
      setConfig(null);
    } finally {
      setSettingsLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setSettingsLoading(true);
      const res = await fetch(`${API_BASE}/api/meta/config`, {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          adAccountId: adAccountId.trim(),
          verifyToken: verifyToken.trim(),
          ...(accessToken.trim() ? { accessToken: accessToken.trim() } : {}),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to save Meta config");
      setConfig(json as MetaConfig);
      setAccessToken("");
      toast.success("Meta config saved");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save Meta config");
    } finally {
      setSettingsLoading(false);
    }
  };

  const disconnect = async () => {
    try {
      setSettingsLoading(true);
      const res = await fetch(`${API_BASE}/api/meta/config`, { method: "DELETE", headers: getAuthHeaders() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to disconnect Meta config");
      toast.success("Meta disconnected");
      setConfig(null);
      setEnabled(true);
      setAdAccountId("");
      setVerifyToken("");
      setAccessToken("");
    } catch (e: any) {
      toast.error(e?.message || "Failed to disconnect Meta config");
    } finally {
      setSettingsLoading(false);
    }
  };

  const load = async () => {
    try {
      setLoading(true);

      const qs = new URLSearchParams();
      if (since) qs.set("since", since);
      if (until) qs.set("until", until);

      const [statsRes, leadsRes] = await Promise.all([
        fetch(`${API_BASE}/api/meta/stats?${qs.toString()}`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/meta/leads?limit=50`, { headers: getAuthHeaders() }),
      ]);

      const statsJson = await statsRes.json().catch(() => ({}));
      if (!statsRes.ok) throw new Error(statsJson?.error || "Failed to load Meta stats");

      const leadsJson = await leadsRes.json().catch(() => []);
      if (!leadsRes.ok) throw new Error((leadsJson as any)?.error || "Failed to load Meta leads");

      setStats(Array.isArray(statsJson?.data) ? statsJson.data : []);
      setMetaLeads(Array.isArray(leadsJson) ? leadsJson : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load Meta Ads data");
      setStats([]);
      setMetaLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    const spend = stats.reduce((a, r) => a + safeNum(r.spend), 0);
    const impressions = stats.reduce((a, r) => a + safeNum(r.impressions), 0);
    const clicks = stats.reduce((a, r) => a + safeNum(r.clicks), 0);
    return { spend, impressions, clicks };
  }, [stats]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-2xl font-semibold">Meta Ads</div>
          <div className="text-sm text-muted-foreground">Campaign stats + lead form submissions synced into CRM leads.</div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex items-center gap-2">
              <Input type="date" value={since} onChange={(e) => setSince(e.target.value)} className="h-9 w-[160px]" />
              <Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} className="h-9 w-[160px]" />
            </div>
            <Button onClick={load} disabled={loading} className="h-9">
              <RefreshCw className={"w-4 h-4 mr-2 " + (loading ? "animate-spin" : "")} />
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Spend</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold tabular-nums">{totals.spend.toFixed(2)}</CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Impressions</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold tabular-nums">{Math.round(totals.impressions).toLocaleString()}</CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Clicks</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold tabular-nums">{Math.round(totals.clicks).toLocaleString()}</CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Campaign Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead className="text-right">Spend</TableHead>
                      <TableHead className="text-right">Impr.</TableHead>
                      <TableHead className="text-right">Clicks</TableHead>
                      <TableHead className="text-right">CPC</TableHead>
                      <TableHead className="text-right">CPM</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.length ? (
                      stats.map((r) => (
                        <TableRow key={String(r.campaign_id || r.campaign_name)}>
                          <TableCell className="min-w-[240px]">
                            <div className="font-medium">{r.campaign_name || "-"}</div>
                            <div className="text-xs text-muted-foreground">{r.campaign_id || ""}</div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{safeNum(r.spend).toFixed(2)}</TableCell>
                          <TableCell className="text-right tabular-nums">{Math.round(safeNum(r.impressions)).toLocaleString()}</TableCell>
                          <TableCell className="text-right tabular-nums">{Math.round(safeNum(r.clicks)).toLocaleString()}</TableCell>
                          <TableCell className="text-right tabular-nums">{safeNum(r.cpc).toFixed(2)}</TableCell>
                          <TableCell className="text-right tabular-nums">{safeNum(r.cpm).toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          {loading ? "Loading..." : "No stats available"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Recent Meta Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Form</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metaLeads.length ? (
                      metaLeads.map((r) => (
                        <TableRow key={r._id}>
                          <TableCell className="min-w-[240px]">
                            <div className="font-medium">{r.leadId?.name || "Meta Lead"}</div>
                            <div className="text-xs text-muted-foreground">{r.leadgenId}</div>
                          </TableCell>
                          <TableCell className="min-w-[220px]">
                            <div className="text-sm">{r.leadId?.email || "-"}</div>
                            <div className="text-xs text-muted-foreground">{r.leadId?.phone || "-"}</div>
                          </TableCell>
                          <TableCell className="min-w-[160px]">
                            <div className="text-sm">{r.campaignId || "-"}</div>
                          </TableCell>
                          <TableCell className="min-w-[160px]">
                            <div className="text-sm">{r.formId || "-"}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{r.leadId?.status || "New"}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground min-w-[160px]">
                            {String(r.createdTime || r.createdAt || "-")}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          {loading ? "Loading..." : "No leads received yet"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Configuration</CardTitle>
                <div className="text-sm text-muted-foreground">
                  Configure Meta integration for local testing now; later you can move to Hostinger VPS.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={loadConfig} disabled={settingsLoading} className="h-9">
                  Refresh
                </Button>
                <Button onClick={saveConfig} disabled={settingsLoading} className="h-9">
                  Save
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium">Enabled</div>
                  <div className="text-sm text-muted-foreground">Turn Meta integration on/off without deleting configuration.</div>
                </div>
                <Switch checked={enabled} onCheckedChange={(v) => setEnabled(Boolean(v))} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Ad Account ID</div>
                  <Input value={adAccountId} onChange={(e) => setAdAccountId(e.target.value)} placeholder="act_1234567890" />
                  <div className="text-xs text-muted-foreground">Example: act_1234567890</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Verify Token (Webhook)</div>
                  <Input value={verifyToken} onChange={(e) => setVerifyToken(e.target.value)} placeholder="your-verify-token" />
                  <div className="text-xs text-muted-foreground">This must match the token you enter in Meta webhook settings.</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Access Token</div>
                <Input
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder={config?.hasAccessToken ? "(already configured) paste new token to rotate" : "paste token here"}
                />
                <div className="text-xs text-muted-foreground">
                  For security: we don’t show the existing token. Paste a new one to rotate.
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg bg-muted/40 p-3">
                <div className="text-sm text-muted-foreground">
                  <div>
                    Status: {config ? (config.enabled ? "Enabled" : "Disabled") : "Not configured"}
                  </div>
                  <div>
                    Source: {config?.source || "-"}
                  </div>
                </div>
                <Button variant="destructive" onClick={disconnect} disabled={settingsLoading} className="h-9">
                  Disconnect
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Webhook (Leadgen)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                Callback URL:
              </div>
              <div className="rounded-md border bg-background p-2 font-mono text-xs break-all">
                {`${API_BASE}/api/meta/webhook`}
              </div>
              <div className="text-muted-foreground">
                Note: Meta cannot reach localhost. For testing webhooks locally, use a tunnel (ngrok/cloudflared) or test on VPS.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

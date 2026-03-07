import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, HelpCircle } from "lucide-react";
import { API_BASE } from "@/lib/api/base";

type HelpArticle = { _id?: string; title: string; content?: string; updatedAt?: string };
type HelpCategory = { _id?: string; name: string; description?: string };

export default function HelpSupportHelp() {
  const [query, setQuery] = useState("");
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getJson = async (path: string) => {
    try {
      const res = await fetch(`${API_BASE}${path}`);
      const ct = res.headers.get("content-type") || "";
      if (res.ok && ct.includes("application/json")) return await res.json();
    } catch {}
    return [] as any[];
  };

  const fetchAll = async () => {
    setLoading(true); setError("");
    try {
      const a = await getJson(`/api/help/articles?scope=help`);
      const c = await getJson(`/api/help/categories?scope=help`);
      setArticles(Array.isArray(a)?a.slice(0, 8):[]);
      setCategories(Array.isArray(c)?c:[]);
    } catch (e) {
      setError("Failed to load data");
    } finally { setLoading(false); }
  };

  useEffect(()=>{ fetchAll(); }, []);

  const filtered = useMemo(()=>{
    if (!query.trim()) return articles;
    const q = query.toLowerCase();
    return articles.filter(a => a.title.toLowerCase().includes(q) || (a.content||"").toLowerCase().includes(q));
  }, [articles, query]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold flex items-center gap-2"><HelpCircle className="w-5 h-5"/> Help</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search help" value={query} onChange={(e)=>setQuery(e.target.value)} className="pl-9 w-80" />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">Top help articles</div>
              <Button size="sm" variant="ghost" onClick={fetchAll}>Refresh</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Title</TableHead>
                  <TableHead className="w-40">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={2}>Loading...</TableCell></TableRow>
                ) : error ? (
                  <TableRow><TableCell colSpan={2} className="text-red-600">{error}</TableCell></TableRow>
                ) : filtered.length ? (
                  filtered.map(a => (
                    <TableRow key={String(a._id)}>
                      <TableCell className="font-medium">{a.title}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{a.updatedAt? new Date(a.updatedAt).toLocaleString():""}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">No articles found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-2">Categories</div>
            <div className="grid gap-2">
              {error ? (
                <div className="text-sm text-red-600">{error}</div>
              ) : categories.length ? categories.map(c => (
                <div key={String(c._id)} className="rounded-md border p-3">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.description || ""}</div>
                </div>
              )) : (
                <div className="text-sm text-muted-foreground">No categories yet.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Mail,
  Phone,
  MapPin,
  MoreHorizontal,
  Filter,
  Download,
  RefreshCw,
  Settings,
  Plus,
} from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { API_BASE } from "@/lib/api/base";

interface Contact {
  name: string;
  role: string;
  email: string;
  phone: string;
  location: string;
  avatar?: string;
  labels?: string[];
}

const SAMPLE: Contact[] = [
  {
    name: "Darlee Robertson",
    role: "Facility Manager",
    email: "robertson@example.com",
    phone: "+1 1234567890",
    location: "Germany",
    labels: ["Collab", "VIP"],
  },
  {
    name: "Sharon Roy",
    role: "Installer",
    email: "sharon@example.com",
    phone: "+1 989757485",
    location: "India",
    labels: ["Collab", "Rated"],
  },
  {
    name: "Vaughan Lewis",
    role: "Senior Manager",
    email: "vaughan12@example.com",
    phone: "+1 5465554555",
    location: "India",
    labels: ["Collab", "Rated"],
  },
  {
    name: "Jessica Louise",
    role: "Test Engineer",
    email: "jessica13@example.com",
    phone: "+1 2223334444",
    location: "USA",
    labels: ["Collab"],
  },
  {
    name: "Carol Thomas",
    role: "UI/UX Designer",
    email: "carolth03@example.com",
    phone: "+1 8887776666",
    location: "USA",
    labels: ["Rated"],
  },
  {
    name: "Dawn Mercha",
    role: "Technician",
    email: "dawnmercha@example.com",
    phone: "+1 9988776655",
    location: "UK",
    labels: ["Collab"],
  },
];


export default function Contacts() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [items, setItems] = useState<Contact[]>(SAMPLE);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/contacts`);
        if (!res.ok) throw new Error("Failed to load");
        const data: Contact[] = await res.json();
        if (mounted && Array.isArray(data) && data.length) setItems(data);
      } catch (e) {
        // fallback to SAMPLE silently
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((c) =>
      [c.name, c.role, c.email, c.phone, c.location].some((v) => v.toLowerCase().includes(q))
    );
  }, [query, items]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Contacts</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{filtered.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">Export <Download className="w-4 h-4"/></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>CSV</DropdownMenuItem>
              <DropdownMenuItem>Excel</DropdownMenuItem>
              <DropdownMenuItem>PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="icon" aria-label="refresh"><RefreshCw className="w-4 h-4"/></Button>
          <Button variant="outline" size="icon" aria-label="settings"><Settings className="w-4 h-4"/></Button>
          {/* Add Contact */}
          <AddContactDialog onCreated={(c)=> setItems((prev)=>[c as Contact, ...prev])} />
        </div>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-4 flex items-center gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2"><Filter className="w-4 h-4"/> Filter</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setFilter("All")}>All</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("Collab")}>Collab</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("VIP")}>VIP</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("Rated")}>Rated</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="relative">
            <Input placeholder="Search" value={query} onChange={(e)=>setQuery(e.target.value)} className="w-72" />
          </div>
        </CardContent>
      </Card>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {filtered
          .filter((c) => filter === "All" || (c.labels || []).includes(filter))
          .map((c, idx) => (
          <Card key={idx} className="border bg-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={c.avatar} alt={c.name} />
                    <AvatarFallback>{c.name.split(" ").map((s) => s[0]).join("")}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-sm text-muted-foreground">{c.role}</div>
                  </div>
                </div>
                <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4"/></Button>
              </div>

              <div className="mt-3 space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-4 h-4"/> {c.email}</div>
                <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-4 h-4"/> {c.phone}</div>
                <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="w-4 h-4"/> {c.location}</div>
              </div>

              {c.labels && c.labels.length > 0 && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  {c.labels.map((l) => (
                    <Badge key={l} variant={l === "VIP" ? "secondary" : "outline"} className={l === "VIP" ? "bg-yellow-400/70 text-yellow-950 border-none" : l === "Rated" ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-emerald-100 text-emerald-800 border-emerald-200"}>
                      {l}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between text-muted-foreground">
                <div className="flex items-center gap-4 text-sm">
                  <span className="hover:text-foreground cursor-pointer">💬</span>
                  <span className="hover:text-foreground cursor-pointer">📞</span>
                  <span className="hover:text-foreground cursor-pointer">📅</span>
                  <span className="hover:text-foreground cursor-pointer">📎</span>
                </div>
                <Avatar className="h-6 w-6">
                  <AvatarImage src="" />
                  <AvatarFallback>AR</AvatarFallback>
                </Avatar>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AddContactDialog({ onCreated }: { onCreated: (c: Partial<Contact>) => void }) {
  const [role, setRole] = useState("-");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2"><Plus className="w-4 h-4"/> Add Contacts</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add contact</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
            <Label className="md:text-right text-muted-foreground">Name</Label>
            <Input placeholder="Full name" value={name} onChange={(e)=>setName(e.target.value)} className="md:col-span-4" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
            <Label className="md:text-right text-muted-foreground">Email</Label>
            <Input placeholder="name@example.com" value={email} onChange={(e)=>setEmail(e.target.value)} className="md:col-span-4" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
            <Label className="md:text-right text-muted-foreground">Phone</Label>
            <Input placeholder="+1 0000000000" value={phone} onChange={(e)=>setPhone(e.target.value)} className="md:col-span-4" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
            <Label className="md:text-right text-muted-foreground">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="md:col-span-4"><SelectValue placeholder="-"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="-">-</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="engineer">Engineer</SelectItem>
                <SelectItem value="designer">Designer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
            <Label className="md:text-right text-muted-foreground">Notes</Label>
            <Textarea placeholder="Notes" value={notes} onChange={(e)=>setNotes(e.target.value)} className="md:col-span-4 min-h-[120px]" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline">Close</Button>
          <Button onClick={async ()=>{
            const payload: Partial<Contact> = { name, email, phone, role } as any;
            try {
              const res = await fetch(`${API_BASE}/api/contacts`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
              if (res.ok) {
                const created = await res.json();
                onCreated(created);
              }
            } catch {}
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

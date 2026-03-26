import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Building2, 
  Phone, 
  MapPin, 
  FileText, 
  Download, 
  Plus, 
  Search, 
  Briefcase,
  Users,
  Target,
  Mail,
  Globe,
  Activity
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";
import { useSettings } from "@/hooks/useSettings";

type ApiClient = {
  _id: string;
  type?: "org" | "person";
  company?: string;
  person?: string;
  owner?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  website?: string;
  avatar?: string;
  labels?: string[];
  status?: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
};

type PortfolioClient = {
  id: string;
  type: "org" | "person";
  displayName: string;
  owner: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  status: "active" | "inactive";
  labels: string[];
  avatar?: string;
  createdAt?: string;
};

export default function Portfolio() {
  const { settings } = useSettings();
  const [clients, setClients] = useState<PortfolioClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [openPdfExport, setOpenPdfExport] = useState(false);
  const [pdfConfig, setPdfConfig] = useState({
    companyName: "Healthspire CRM",
    tagline: "Client Portfolio",
    primaryColor: "#2563EB",
    secondaryColor: "#7C3AED",
    includeStats: true,
    includeLogo: true,
    includeCompanyName: true,
  });
  const [pdfFieldMode, setPdfFieldMode] = useState<"all" | "custom">("all");
  const [pdfSelectedFields, setPdfSelectedFields] = useState<Record<string, boolean>>({
    type: true,
    owner: true,
    email: true,
    phone: true,
    address: true,
    website: true,
    createdAt: true,
  });
  const [pdfConfigInitialized, setPdfConfigInitialized] = useState(false);
  const [openAddClient, setOpenAddClient] = useState(false);
  const [openTestimonial, setOpenTestimonial] = useState(false);
  const [selectedClient, setSelectedClient] = useState<PortfolioClient | null>(null);
  const [editingClient, setEditingClient] = useState<PortfolioClient | null>(null);

  useEffect(() => {
    if (pdfConfigInitialized) return;
    const name = String(settings?.general?.companyName || "").trim();
    const primary = String(settings?.general?.primaryColor || "").trim();
    const secondary = String(settings?.general?.secondaryColor || settings?.general?.accentColor || "").trim();

    if (name || primary || secondary) {
      setPdfConfig((p) => ({
        ...p,
        companyName: name || p.companyName,
        primaryColor: primary || p.primaryColor,
        secondaryColor: secondary || p.secondaryColor,
      }));
    }

    setPdfConfigInitialized(true);
  }, [pdfConfigInitialized, settings]);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    owner: "",
    phone: "",
    email: "",
    address: "",
    website: "",
    labels: "",
    status: "active" as const,
  });

  // Load clients data
  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/clients`, { headers: getAuthHeaders() });
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error((data as any)?.error || "Failed to load clients");
      const mapped: PortfolioClient[] = (Array.isArray(data) ? data : []).map((c: ApiClient) => {
        const displayName = String(c.company || c.person || "Client").trim() || "Client";
        const addressParts = [
          String(c.address || "").trim(),
          String(c.city || "").trim(),
          String(c.state || "").trim(),
          String(c.zip || "").trim(),
          String(c.country || "").trim(),
        ].filter(Boolean);
        const address = addressParts.join(", ");
        return {
          id: String(c._id),
          type: (c.type as any) || "org",
          displayName,
          owner: String(c.owner || "").trim(),
          phone: String(c.phone || "").trim(),
          email: String(c.email || "").trim(),
          address,
          website: String(c.website || "").trim(),
          status: (c.status as any) || "active",
          labels: Array.isArray(c.labels) ? c.labels.map((x) => String(x)).filter(Boolean) : [],
          avatar: String(c.avatar || "") || undefined,
          createdAt: c.createdAt,
        };
      });
      setClients(mapped);
    } catch (error) {
      console.error("Error loading clients:", error);
      toast.error((error as any)?.message || "Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  const renderElementToPdf = async (opts: { element: HTMLElement; filename: string }) => {
    const docAny = document as any;
    if (docAny?.fonts?.ready) await docAny.fonts.ready;

    const images = Array.from(opts.element.querySelectorAll("img")) as HTMLImageElement[];
    await Promise.all(
      images.map(
        (img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                img.onload = () => resolve();
                img.onerror = () => resolve();
              }),
      ),
    );

    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    const canvas = await html2canvas(opts.element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: 0,
      windowWidth: opts.element.scrollWidth || 800,
      windowHeight: opts.element.scrollHeight || 1000,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const margin = 32;
    const contentWidth = Math.max(1, pageWidth - margin * 2);
    const contentHeight = Math.max(1, pageHeight - margin * 2);

    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", margin, margin + position, imgWidth, imgHeight, undefined, "FAST");
    heightLeft -= contentHeight;

    while (heightLeft > 0) {
      position -= contentHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", margin, margin + position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= contentHeight;
    }

    pdf.save(opts.filename);
  };

  // Filter clients
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        client.displayName.toLowerCase().includes(q) ||
        client.owner.toLowerCase().includes(q) ||
        client.email.toLowerCase().includes(q) ||
        client.phone.toLowerCase().includes(q) ||
        client.address.toLowerCase().includes(q) ||
        client.website.toLowerCase().includes(q);

      return matchesSearch;
    });
  }, [clients, searchQuery]);

  const orgClients = useMemo(() => filteredClients.filter((c) => c.type === "org"), [filteredClients]);
  const personClients = useMemo(() => filteredClients.filter((c) => c.type === "person"), [filteredClients]);

  // Add new client
  const addClient = async () => {
    try {
      const name = String(formData.name || "").trim();
      if (!name) {
        toast.error("Client name is required");
        return;
      }
      const payload: any = {
        type: "org",
        company: name,
        owner: String(formData.owner || "").trim() || undefined,
        phone: String(formData.phone || "").trim() || undefined,
        email: String(formData.email || "").trim() || undefined,
        address: String(formData.address || "").trim() || undefined,
        website: String(formData.website || "").trim() || undefined,
        labels: String(formData.labels || "")
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter(Boolean),
        status: formData.status,
      };

      const res = await fetch(`${API_BASE}/api/clients`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any)?.error || "Failed to add client");
      await loadClients();
      
      // Reset form
      setFormData({
        name: "",
        owner: "",
        phone: "",
        email: "",
        address: "",
        website: "",
        labels: "",
        status: "active",
      });
      
      setOpenAddClient(false);
      toast.success("Client added successfully");
    } catch (error) {
      toast.error((error as any)?.message || "Failed to add client");
    }
  };

  const updateClient = async () => {
    if (!editingClient) return;
    try {
      const name = String(formData.name || "").trim();
      if (!name) {
        toast.error("Client name is required");
        return;
      }
      const payload: any = {
        company: name,
        owner: String(formData.owner || "").trim() || "",
        phone: String(formData.phone || "").trim() || "",
        email: String(formData.email || "").trim() || "",
        address: String(formData.address || "").trim() || "",
        website: String(formData.website || "").trim() || "",
        labels: String(formData.labels || "")
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter(Boolean),
        status: formData.status,
      };
      const res = await fetch(`${API_BASE}/api/clients/${encodeURIComponent(editingClient.id)}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any)?.error || "Failed to update client");
      await loadClients();
      setOpenAddClient(false);
      setEditingClient(null);
      toast.success("Client updated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update client");
    }
  };

  const deleteClient = async (id: string) => {
    if (!confirm("Delete this client?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/clients/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any)?.error || "Failed to delete client");
      await loadClients();
      toast.success("Client deleted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete client");
    }
  };

  // Generate PDF testimonial
  const generateTestimonialPDF = async (client: PortfolioClient) => {
    try {
      const created = new Date();
      const createdStr = created.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

      const sanitize = (str: string) =>
        String(str || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));

      const el = document.createElement("div");
      el.style.cssText = `
        position: fixed;
        left: -10000px;
        top: 0;
        width: 800px;
        pointer-events: none;
        font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        color: #0f172a;
        background: white;
        padding: 20px;
        box-sizing: border-box;
      `;

      el.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto;">
          <div style="display:flex; align-items:flex-start; justify-content:space-between; gap: 16px; padding-bottom: 14px; border-bottom: 1px solid #e2e8f0;">
            <div>
              <div style="font-size: 18px; font-weight: 800; letter-spacing: -0.2px; color: #0f172a; margin: 0;">${sanitize(pdfConfig.companyName || "")}</div>
              <div style="margin-top: 2px; font-size: 12px; color: #64748b; margin: 0;">${sanitize(pdfConfig.tagline || "")}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size: 11px; color: #475569; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; margin: 0;">Client Profile</div>
              <div style="margin-top: 4px; font-size: 11px; color: #64748b; margin: 0;">Generated: ${sanitize(createdStr)}</div>
            </div>
          </div>

          <div style="margin-top: 16px; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; background: #ffffff;">
            <div style="display:flex; align-items:flex-start; justify-content:space-between; gap: 12px;">
              <div>
                <div style="font-weight: 900; font-size: 22px; letter-spacing: -0.2px; margin: 0; color: #0f172a;">${sanitize(client.displayName)}</div>
                <div style="margin-top: 6px; font-size: 12px; color: #64748b; margin: 0;">Owner: ${sanitize(client.owner || "-")}</div>
              </div>
              <div style="padding: 6px 10px; border-radius: 999px; font-size: 11px; font-weight: 800; background: ${client.status === "active" ? "#dcfce7" : "#fef3c7"}; color: ${client.status === "active" ? "#166534" : "#92400e"};">
                ${client.status === "active" ? "Active" : "Inactive"}
              </div>
            </div>

            <div style="margin-top: 14px; display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;">
              <div style="border: 1px solid #eef2f7; background: #f8fafc; border-radius: 12px; padding: 10px;">
                <div style="font-size: 10px; color: #64748b; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;">Email</div>
                <div style="margin-top: 4px; font-size: 13px; color: #0f172a; word-break: break-word;">${sanitize(client.email || "-")}</div>
              </div>
              <div style="border: 1px solid #eef2f7; background: #f8fafc; border-radius: 12px; padding: 10px;">
                <div style="font-size: 10px; color: #64748b; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;">Phone</div>
                <div style="margin-top: 4px; font-size: 13px; color: #0f172a; word-break: break-word;">${sanitize(client.phone || "-")}</div>
              </div>
              <div style="border: 1px solid #eef2f7; background: #f8fafc; border-radius: 12px; padding: 10px; grid-column: span 2;">
                <div style="font-size: 10px; color: #64748b; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;">Address</div>
                <div style="margin-top: 4px; font-size: 13px; color: #0f172a; word-break: break-word;">${sanitize(client.address || "-")}</div>
              </div>
              ${client.website ? `
                <div style="border: 1px solid #eef2f7; background: #f8fafc; border-radius: 12px; padding: 10px; grid-column: span 2;">
                  <div style="font-size: 10px; color: #64748b; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;">Website</div>
                  <div style="margin-top: 4px; font-size: 13px; color: #0f172a; word-break: break-word;">${sanitize(client.website)}</div>
                </div>
              ` : ""}
            </div>

            <div style="margin-top: 14px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
              <div style="font-size: 10px; color: #64748b; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;">Labels</div>
              <div style="margin-top: 8px;">
                ${(client.labels || []).length
                  ? (client.labels || [])
                      .slice(0, 12)
                      .map((label) => `<span style="display:inline-block; margin: 0 6px 6px 0; padding: 3px 10px; border-radius: 999px; border: 1px solid #e2e8f0; background: #ffffff; color: #0f172a; font-size: 11px; font-weight: 700;">${sanitize(label)}</span>`)
                      .join("")
                  : `<span style="color:#94a3b8;">-</span>`}
              </div>
            </div>
          </div>

          <div style="margin-top: 16px; border-top: 1px solid #e2e8f0; padding-top: 10px; display:flex; align-items:center; justify-content:space-between; gap: 10px; color:#94a3b8; font-size: 10px;">
            <div style="margin:0;">Confidential • Internal use only</div>
            <div style="margin:0;">© ${new Date().getFullYear()} ${sanitize(pdfConfig.companyName || "")}</div>
          </div>
        </div>
      `;

      document.body.appendChild(el);
      try {
        const file = `${client.displayName.replace(/\s+/g, "_")}_testimonial_${new Date().toISOString().slice(0, 10)}.pdf`;

        await renderElementToPdf({ element: el, filename: file });

        toast.success("Testimonial PDF generated successfully");
      } finally {
        if (el.parentNode) el.parentNode.removeChild(el);
      }
    } catch (e: any) {
      console.error("Testimonial PDF generation error:", e);
      toast.error(e?.message || "Failed to generate testimonial PDF");
    }
  };

  // Generate portfolio PDF
  const generatePortfolioPDF = async () => {
    try {
      const rows = clients;

      if (!rows.length) {
        toast.error("No clients available to export");
        return;
      }

      const sanitize = (str: string) =>
        String(str || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));

      const created = new Date();
      const createdStr = created.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
      const paletteA = pdfConfig.primaryColor;
      const paletteB = pdfConfig.secondaryColor;

      const total = rows.length;
      const orgRows = rows.filter((c) => c.type === "org");
      const personRows = rows.filter((c) => c.type === "person");

      const selected = (key: string) => {
        if (key === "displayName") return true;
        if (pdfFieldMode === "all") return true;
        return Boolean(pdfSelectedFields[key]);
      };

      const columns = [
        {
          key: "displayName",
          label: "Client",
          weight: 22,
          align: "left",
          cell: (c: PortfolioClient) =>
            `<div style="font-weight: 600; color: #0f172a;">${sanitize(c.displayName)}</div>`,
        },
        {
          key: "type",
          label: "Type",
          weight: 10,
          align: "center",
          cell: (c: PortfolioClient) => `<div>${c.type === "org" ? "Organization" : "Individual"}</div>`,
        },
        {
          key: "owner",
          label: "Contact person",
          weight: 14,
          align: "left",
          cell: (c: PortfolioClient) => `<div>${sanitize(c.owner || "-")}</div>`,
        },
        {
          key: "email",
          label: "Email",
          weight: 18,
          align: "left",
          cell: (c: PortfolioClient) => `<div style="word-break: break-word;">${sanitize(c.email || "-")}</div>`,
        },
        {
          key: "phone",
          label: "Phone",
          weight: 12,
          align: "left",
          cell: (c: PortfolioClient) => `<div style="word-break: break-word;">${sanitize(c.phone || "-")}</div>`,
        },
        {
          key: "address",
          label: "Address",
          weight: 24,
          align: "left",
          cell: (c: PortfolioClient) => `<div style="word-break: break-word;">${sanitize(c.address || "-")}</div>`,
        },
        {
          key: "website",
          label: "Website",
          weight: 14,
          align: "left",
          cell: (c: PortfolioClient) =>
            c.website
              ? `<div style="word-break: break-word;">${sanitize(c.website)}</div>`
              : `<div style="color:#94a3b8;">-</div>`,
        },
        {
          key: "createdAt",
          label: "Created",
          weight: 12,
          align: "center",
          cell: (c: PortfolioClient) => {
            const v = c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "-";
            return `<div>${sanitize(v)}</div>`;
          },
        },
      ].filter((col) => selected(col.key));

      if (columns.length <= 1) {
        toast.error("Please select at least one additional field to export");
        return;
      }

      const logoSrc = pdfConfig.includeLogo ? String(settings?.general?.logoUrl || "/HealthSpire%20logo.png") : "";
      const companyEmail = String(settings?.general?.companyEmail || "").trim();
      const companyPhone = String(settings?.general?.companyPhone || "").trim();
      const companyWebsite = String(settings?.general?.domain || "").trim();
      const companyAddress = [
        String(settings?.general?.addressLine1 || "").trim(),
        String(settings?.general?.addressLine2 || "").trim(),
        [
          String(settings?.general?.city || "").trim(),
          String(settings?.general?.state || "").trim(),
          String(settings?.general?.zip || "").trim(),
        ]
          .filter(Boolean)
          .join(", "),
        String(settings?.general?.country || "").trim(),
      ]
        .filter(Boolean)
        .join("\n");

      const renderTable = (sectionTitle: string, tableRows: PortfolioClient[]) => {
        if (!tableRows.length) return "";
        const totalWeight = columns.reduce((a, c) => a + c.weight, 0) || 1;
        return `
          <div style="margin-top: 16px;">
            <div style="display:flex; align-items:center; gap: 8px; margin: 0 0 10px 0;">
              <div style="width: 10px; height: 10px; border-radius: 3px; background: ${paletteA};"></div>
              <div style="font-size: 11px; color: #475569; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase;">${sanitize(sectionTitle)}</div>
            </div>
            <div style="border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; background: white;">
              <table style="width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed;">
                <thead>
                  <tr style="background: ${paletteA}12; color: #0f172a;">
                    ${columns
                      .map((col) => {
                        const w = ((col.weight / totalWeight) * 100).toFixed(2);
                        const align = col.align || "left";
                        return `<th style="width: ${w}%; text-align: ${align}; padding: 8px 10px; border-bottom: 1px solid #e2e8f0;">${sanitize(col.label)}</th>`;
                      })
                      .join("")}
                  </tr>
                </thead>
                <tbody>
                  ${tableRows
                    .map((client, idx) => {
                      const zebra = idx % 2 === 0 ? "#ffffff" : "#fcfcfd";
                      return `
                        <tr style="background: ${zebra}; page-break-inside: avoid;">
                          ${columns
                            .map((col) => {
                              const align = col.align || "left";
                              return `<td style="padding: 8px 10px; text-align: ${align}; border-bottom: 1px solid #eef2f7; vertical-align: top; color: #334155; word-break: break-word; overflow-wrap: anywhere;">${col.cell(client)}</td>`;
                            })
                            .join("")}
                        </tr>
                      `;
                    })
                    .join("")}
                </tbody>
              </table>
            </div>
          </div>
        `;
      };

      const el = document.createElement("div");
      el.style.cssText = `
        position: fixed;
        left: -10000px;
        top: 0;
        width: 820px;
        z-index: 0;
        pointer-events: none;
        font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        line-height: 1.45;
        color: #1f2937;
        background: #f8fafc;
        padding: 22px;
        box-sizing: border-box;
      `;
      
      el.innerHTML = `
        <div style="max-width: 820px; margin: 0 auto;">
          <div style="border-radius: 18px; overflow: hidden; border: 1px solid #e2e8f0; background: #ffffff;">
            <div style="height: 8px; background: linear-gradient(90deg, ${paletteA}, ${paletteB});"></div>
            <div style="padding: 16px 16px 12px 16px;">
              <div style="display:flex; align-items:flex-start; justify-content:space-between; gap: 14px;">
                <div style="display:flex; align-items:flex-start; gap: 12px;">
                  ${logoSrc ? `<img src="${sanitize(logoSrc)}" crossorigin="anonymous" style="width: 42px; height: 42px; object-fit: contain; border-radius: 12px; border: 1px solid #e2e8f0; background: #ffffff;"/>` : ""}
                  <div>
                    ${pdfConfig.includeCompanyName ? `<div style="font-size: 18px; font-weight: 900; letter-spacing: -0.3px; color: #0f172a; margin: 0;">${sanitize(pdfConfig.companyName)}</div>` : ""}
                    <div style="margin-top: ${pdfConfig.includeCompanyName ? "2px" : "0px"}; font-size: 11px; color: #64748b; margin: 0;">${sanitize(pdfConfig.tagline)}</div>
                    ${(companyWebsite || companyEmail || companyPhone || companyAddress)
                      ? `<div style="margin-top: 8px; font-size: 10px; color: #475569; line-height: 1.45; white-space: pre-line;">
                          ${companyWebsite ? `<div><span style=\"font-weight:800; color:${paletteA};\">Website:</span> ${sanitize(companyWebsite)}</div>` : ""}
                          ${companyEmail ? `<div><span style=\"font-weight:800; color:${paletteA};\">Email:</span> ${sanitize(companyEmail)}</div>` : ""}
                          ${companyPhone ? `<div><span style=\"font-weight:800; color:${paletteA};\">Phone:</span> ${sanitize(companyPhone)}</div>` : ""}
                          ${companyAddress ? `<div><span style=\"font-weight:800; color:${paletteA};\">Address:</span> ${sanitize(companyAddress).replace(/\n/g, "<br/>")}</div>` : ""}
                        </div>`
                      : ""}
                  </div>
                </div>
                <div style="text-align:right;">
                  <div style="margin-top: 6px; font-size: 10px; color: #64748b; margin: 0;">Generated: ${sanitize(createdStr)}</div>
                  <div style="margin-top: 6px; font-size: 10px; color: #475569; font-weight: 900;">${total} clients</div>
                </div>
              </div>
            </div>
          </div>

          ${pdfConfig.includeStats ? `
            <div style="margin-top: 14px; display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px;">
              <div style="border: 1px solid #eef2f7; background: #ffffff; border-radius: 14px; padding: 12px;">
                <div style="font-size: 10px; color: #64748b; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;">Total</div>
                <div style="margin-top: 6px; font-size: 22px; font-weight: 900; color: #0f172a;">${total}</div>
              </div>
              <div style="border: 1px solid #eef2f7; background: #ffffff; border-radius: 14px; padding: 12px; background: linear-gradient(135deg, ${paletteA}12, ${paletteB}12);">
                <div style="font-size: 10px; color: #64748b; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;">Portfolio</div>
                <div style="margin-top: 6px; font-size: 14px; font-weight: 900; color: #0f172a;">Selected company relationships & references</div>
              </div>
            </div>
          ` : ""}

          ${renderTable("Organizations", orgRows)}
          ${renderTable("Individuals", personRows)}

          <div style="margin-top: 16px; border-top: 1px solid #e2e8f0; padding-top: 10px; display:flex; align-items:center; justify-content:space-between; gap: 10px; color:#94a3b8; font-size: 9px;">
            <div style="margin:0;">Prepared for sharing • ${sanitize(createdStr)}</div>
            <div style="margin:0;">© ${new Date().getFullYear()} mindspire.org • All rights reserved</div>
          </div>
        </div>
      `;

      document.body.appendChild(el);
      try {
        const file = `portfolio_${String(pdfConfig.companyName || "company").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;

        await renderElementToPdf({ element: el, filename: file });

        toast.success("Portfolio PDF generated successfully");
        setOpenPdfExport(false);
      } finally {
        if (el.parentNode) el.parentNode.removeChild(el);
      }
    } catch (e: any) {
      console.error('PDF generation error:', e);
      toast.error(e?.message || "Failed to generate PDF");
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Hero Header */}
        <div className="rounded-2xl border bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 p-6 text-white">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/10 p-3">
                  <Briefcase className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">Client Portfolio</h1>
                  <p className="mt-1 text-sm text-white/80">A shareable overview of your client relationships</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-white/15 text-white border-white/20 hover:bg-white/20">
                  <Users className="w-3 h-3 mr-1" />
                  {clients.length} Clients
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                onClick={() => setOpenPdfExport(true)}
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>

              <Dialog
                open={openAddClient}
                onOpenChange={(v) => {
                  setOpenAddClient(v);
                  if (!v) setEditingClient(null);
                }}
              >
                <DialogTrigger asChild>
                  <Button variant="secondary" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Client
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingClient ? "Edit Client" : "Add New Client"}</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Company Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Company name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="owner">Owner Name</Label>
                      <Input
                        id="owner"
                        value={formData.owner}
                        onChange={(e) => setFormData(prev => ({ ...prev, owner: e.target.value }))}
                        placeholder="Owner name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Phone"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="contact@company.com"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="address">Address *</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="Full address"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={formData.website}
                        onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://company.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={formData.status} onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="labels">Labels</Label>
                      <Input
                        id="labels"
                        value={formData.labels}
                        onChange={(e) => setFormData(prev => ({ ...prev, labels: e.target.value }))}
                        placeholder="VIP, Enterprise, Long-term (comma separated)"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={() => setOpenAddClient(false)}>
                      Cancel
                    </Button>
                    <Button onClick={editingClient ? updateClient : addClient}>
                      {editingClient ? "Update Client" : "Add Client"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={openPdfExport} onOpenChange={setOpenPdfExport}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Export Portfolio PDF</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="text-sm font-medium">Branding</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label>Company name</Label>
                          <Input value={pdfConfig.companyName} onChange={(e) => setPdfConfig((p) => ({ ...p, companyName: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <Label>Tagline</Label>
                          <Input value={pdfConfig.tagline} onChange={(e) => setPdfConfig((p) => ({ ...p, tagline: e.target.value }))} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={pdfConfig.includeLogo}
                            onChange={(e) => setPdfConfig((p) => ({ ...p, includeLogo: e.target.checked }))}
                          />
                          Include company logo
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={pdfConfig.includeCompanyName}
                            onChange={(e) => setPdfConfig((p) => ({ ...p, includeCompanyName: e.target.checked }))}
                          />
                          Include company name
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label>Primary color</Label>
                          <Input type="color" value={pdfConfig.primaryColor} onChange={(e) => setPdfConfig((p) => ({ ...p, primaryColor: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <Label>Secondary color</Label>
                          <Input type="color" value={pdfConfig.secondaryColor} onChange={(e) => setPdfConfig((p) => ({ ...p, secondaryColor: e.target.value }))} />
                        </div>
                      </div>

                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={pdfConfig.includeStats}
                          onChange={(e) => setPdfConfig((p) => ({ ...p, includeStats: e.target.checked }))}
                        />
                        Include portfolio overview section
                      </label>
                    </div>

                    <div className="space-y-3">
                      <div className="text-sm font-medium">Fields</div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label>Fields mode</Label>
                          <Select value={pdfFieldMode} onValueChange={(v: any) => setPdfFieldMode(v)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All fields</SelectItem>
                              <SelectItem value="custom">Select fields</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() =>
                              setPdfSelectedFields({
                                type: true,
                                owner: true,
                                email: true,
                                phone: true,
                                address: true,
                                website: true,
                                createdAt: true,
                              })
                            }
                          >
                            Select all
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() =>
                              setPdfSelectedFields({
                                type: false,
                                owner: false,
                                email: false,
                                phone: false,
                                address: false,
                                website: false,
                                createdAt: false,
                              })
                            }
                          >
                            Clear
                          </Button>
                        </div>
                      </div>

                      {pdfFieldMode === "custom" && (
                        <div className="border rounded-md p-3 space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(
                              [
                                { key: "type", label: "Type" },
                                { key: "owner", label: "Contact person" },
                                { key: "email", label: "Email" },
                                { key: "phone", label: "Phone" },
                                { key: "address", label: "Address" },
                                { key: "website", label: "Website" },
                                { key: "createdAt", label: "Created date" },
                              ] as const
                            ).map((f) => (
                              <label key={f.key} className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={Boolean(pdfSelectedFields[f.key])}
                                  onChange={(e) =>
                                    setPdfSelectedFields((p) => ({
                                      ...p,
                                      [f.key]: e.target.checked,
                                    }))
                                  }
                                />
                                {f.label}
                              </label>
                            ))}
                          </div>
                          <div className="text-xs text-muted-foreground">Client name is always included.</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setOpenPdfExport(false)}>Cancel</Button>
                    <Button onClick={generatePortfolioPDF}><Download className="w-4 h-4 mr-2" />Generate PDF</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-6">
        {/* Filters and Search */}
        <Card className="shadow-sm bg-card">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end">
              <div className="md:col-span-12">
                <Label className="text-sm font-medium">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search clients, contacts, email, phone, address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clients Grid */}
        {!loading && (
          <div className="space-y-8">
            {orgClients.length > 0 && (
              <div>
                <div className="mb-3 text-sm font-semibold text-muted-foreground">Organizations</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {orgClients.map((client) => (
                    <Card key={client.id} className="shadow-sm bg-card hover:shadow-md transition-shadow">
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <Building2 className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div className="min-w-0">
                              <CardTitle className="text-base truncate">{client.displayName}</CardTitle>
                              <p className="text-sm text-muted-foreground truncate">{client.owner || client.email || "-"}</p>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="w-4 h-4" />
                            <span className="truncate">{client.phone || "-"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="w-4 h-4" />
                            <span className="truncate">{client.email || "-"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span className="truncate">{client.address || "-"}</span>
                          </div>
                          {client.website && (
                            <div className="flex items-center gap-2 text-sm">
                              <Globe className="w-4 h-4 text-muted-foreground" />
                              <a
                                href={client.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:underline truncate"
                              >
                                {client.website}
                              </a>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedClient(client);
                              setOpenTestimonial(true);
                            }}
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            Details
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => generateTestimonialPDF(client)}>
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </Button>
                        </div>
                        <Button asChild size="sm" className="w-full">
                          <Link to={`/clients/${client.id}`}>Open in CRM</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {personClients.length > 0 && (
              <div>
                <div className="mb-3 text-sm font-semibold text-muted-foreground">Individuals</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {personClients.map((client) => (
                    <Card key={client.id} className="shadow-sm bg-card hover:shadow-md transition-shadow">
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <Users className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div className="min-w-0">
                              <CardTitle className="text-base truncate">{client.displayName}</CardTitle>
                              <p className="text-sm text-muted-foreground truncate">{client.email || "-"}</p>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="w-4 h-4" />
                            <span className="truncate">{client.phone || "-"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="w-4 h-4" />
                            <span className="truncate">{client.email || "-"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span className="truncate">{client.address || "-"}</span>
                          </div>
                          {client.website && (
                            <div className="flex items-center gap-2 text-sm">
                              <Globe className="w-4 h-4 text-muted-foreground" />
                              <a
                                href={client.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:underline truncate"
                              >
                                {client.website}
                              </a>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedClient(client);
                              setOpenTestimonial(true);
                            }}
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            Details
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => generateTestimonialPDF(client)}>
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </Button>
                        </div>
                        <Button asChild size="sm" className="w-full">
                          <Link to={`/clients/${client.id}`}>Open in CRM</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {loading && (
          <Card className="shadow-sm bg-card">
            <CardContent className="p-10 text-center text-muted-foreground">Loading portfolio…</CardContent>
          </Card>
        )}

        {!loading && filteredClients.length === 0 && (
          <Card className="shadow-sm bg-card">
            <CardContent className="p-12 text-center">
              <Briefcase className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No clients found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "Try adjusting your search query"
                  : "Start by adding your first client to build your portfolio"}
              </p>
              <Button onClick={() => setOpenAddClient(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Client
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Client Details Modal */}
        <Dialog open={openTestimonial} onOpenChange={setOpenTestimonial}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Client Details - {selectedClient?.displayName}</DialogTitle>
            </DialogHeader>
            {selectedClient && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Company Name</Label>
                    <p className="text-sm">{selectedClient.displayName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Owner Name</Label>
                    <p className="text-sm">{selectedClient.owner || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Phone</Label>
                    <p className="text-sm">{selectedClient.phone || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <p className="text-sm">{selectedClient.email || "-"}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-sm font-medium">Address</Label>
                    <p className="text-sm">{selectedClient.address || "-"}</p>
                  </div>
                  {selectedClient.website && (
                    <div className="col-span-2">
                      <Label className="text-sm font-medium">Website</Label>
                      <a href={selectedClient.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                        {selectedClient.website}
                      </a>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2" />
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => generateTestimonialPDF(selectedClient)}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Testimonial
                  </Button>
                  <Button asChild variant="outline">
                    <Link to={`/clients/${selectedClient.id}`}>Open in CRM</Link>
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </div>
  );
}

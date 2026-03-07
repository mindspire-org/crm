import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/sonner";
import ExcelJS from "exceljs";
import {
  Plus,
  Search,
  Download,
  MoreHorizontal,
  Eye,
  Mail,
  Printer,
  FileText,
  HelpCircle,
  Paperclip,
  FileSpreadsheet,
  CalendarDays,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAuthHeaders } from "@/lib/api/auth";
import { API_BASE } from "@/lib/api/base";
import { canViewFinancialData, getCurrentUser, maskFinancialData } from "@/utils/roleAccess";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

type ListInvoice = {
  id: string;
  dbId: string;
  client: string;
  project?: string;
  billDate: string;
  dueDate: string;
  totalInvoiced: string;
  paymentReceived: string;
  due: string;
  status: "Paid" | "Partially paid" | "Unpaid";
  advancedAmount?: string;
  discount?: string;
};

// API_BASE is centralized in lib/api/base
export default function InvoiceList() {
  const [tab, setTab] = useState("list");
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const [rows, setRows] = useState<ListInvoice[]>([]);
  const [invoiceDocs, setInvoiceDocs] = useState<any[]>([]);
  const [allPayments, setAllPayments] = useState<any[]>([]);

  const urlClientId = useMemo(() => {
    const sp = new URLSearchParams(location.search || "");
    return String(sp.get("clientId") || "").trim();
  }, [location.search]);

  const urlAdd = useMemo(() => {
    const sp = new URLSearchParams(location.search || "");
    const v = String(sp.get("add") || "").trim();
    return v === "1" || v.toLowerCase() === "true";
  }, [location.search]);

  const canViewPricing = useMemo(() => {
    const u = getCurrentUser();
    return u ? canViewFinancialData(u as any) : false;
  }, []);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCurrency, setFilterCurrency] = useState<string>("all");
  const [datePreset, setDatePreset] = useState<string>("all");
  const [quickView, setQuickView] = useState<string>("__all__");
  const [clientOptions, setClientOptions] = useState<{ id: string; name: string }[]>([]);
  const [projectOptions, setProjectOptions] = useState<{ id: string; title: string; clientId?: string }[]>([]);
  const [clientSel, setClientSel] = useState("");
  const [projectSel, setProjectSel] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string>("");
  const [editingInvoiceNum, setEditingInvoiceNum] = useState<string>("");
  const [billDate, setBillDate] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [dueDate, setDueDate] = useState<string>("");
  const [tax1Sel, setTax1Sel] = useState<string>("0");
  const [tax2Sel, setTax2Sel] = useState<string>("0");
  const [tdsSel, setTdsSel] = useState<string>("0");
  const [discount, setDiscount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [labels, setLabels] = useState<string>("");
  const [advanceAmount, setAdvanceAmount] = useState<string>("");
  const [attachments, setAttachments] = useState<{ name: string; path: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleUploadClick = () => fileInputRef.current?.click();
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const f = e.target.files?.[0];
      if (!f) return;
      const fd = new FormData();
      fd.append("file", f);
      const r = await fetch(`${API_BASE}/api/invoices/upload`, { method: "POST", headers: { ...getAuthHeaders() }, body: fd });
      if (r.ok) {
        const res = await r.json();
        setAttachments((prev) => [...prev, { name: res.name, path: res.path }]);
      }
    } catch {}
    finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleExportExcel = async () => {
    try {
      const pick = new Map<string, any>();
      for (const d of invoiceDocs || []) {
        const id = String(d?._id || "");
        if (id) pick.set(id, d);
      }
      const selected = (displayRows || [])
        .map((r) => pick.get(String(r.dbId || "")) || null)
        .filter(Boolean);

      if (!selected.length) {
        toast.error("No invoices to export");
        return;
      }

      const receivedByInvoiceId = (allPayments || []).reduce((acc: Record<string, number>, p: any) => {
        const id = String(p?.invoiceId || p?.invoice || "");
        if (!id) return acc;
        acc[id] = (acc[id] || 0) + (Number(p.amount) || 0);
        return acc;
      }, {});

      const getClientNameFromDoc = (doc: any) => {
        if (!doc) return "-";
        return getClientName(doc.clientId || doc.client || "-");
      };
      const getProjectTitleFromDoc = (doc: any) => {
        if (!doc) return "-";
        return getProjectTitle(doc.projectId || doc.project || "-");
      };

      const parseDate = (v: any) => {
        const t = Date.parse(String(v || ""));
        return Number.isFinite(t) ? new Date(t) : null;
      };

      const toNumber = (v: any) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };

      const currencyFmt = "[$Rs-ur-PK] #,##0.00";
      const dateFmt = "yyyy-mm-dd";

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "CRM";
      workbook.created = new Date();

      const sheet = workbook.addWorksheet("Invoices", {
        properties: { defaultRowHeight: 18 },
        pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
      });

      const columnsAll = [
        { header: "Invoice No", key: "number", width: 14 },
        { header: "Status", key: "status", width: 14 },
        { header: "Client", key: "client", width: 26 },
        { header: "Project", key: "project", width: 24 },
        { header: "Issue Date", key: "issueDate", width: 12 },
        { header: "Due Date", key: "dueDate", width: 12 },
        { header: "Labels", key: "labels", width: 18 },
        { header: "Note", key: "note", width: 28 },
        { header: "Items", key: "items", width: 40 },
        { header: "Attachments", key: "attachments", width: 24 },
        { header: "Created", key: "createdAt", width: 18 },
        { header: "Updated", key: "updatedAt", width: 18 },
      ];

      const columnsMoney = [
        { header: "Subtotal (Amount)", key: "amount", width: 16 },
        { header: "Discount", key: "discount", width: 12 },
        { header: "Tax 1 %", key: "tax1", width: 10 },
        { header: "Tax 2 %", key: "tax2", width: 10 },
        { header: "TDS %", key: "tds", width: 10 },
        { header: "Advance", key: "advance", width: 12 },
        { header: "Paid", key: "paid", width: 12 },
        { header: "Balance Due", key: "due", width: 14 },
      ];

      sheet.columns = canViewPricing ? [...columnsAll.slice(0, 6), ...columnsMoney, ...columnsAll.slice(6)] : columnsAll;

      const lastCol = sheet.columns.length;

      const titleRow = sheet.addRow(["Invoices Export"]);
      sheet.mergeCells(1, 1, 1, lastCol);
      titleRow.font = { name: "Poppins", size: 16, bold: true, color: { argb: "FF0F172A" } };
      titleRow.alignment = { vertical: "middle", horizontal: "left" };
      titleRow.height = 26;

      const meta1 = sheet.addRow([`Generated: ${new Date().toLocaleString()}`]);
      sheet.mergeCells(2, 1, 2, lastCol);
      meta1.font = { name: "Poppins", size: 10, color: { argb: "FF64748B" } };
      meta1.alignment = { vertical: "middle", horizontal: "left" };

      const meta2 = sheet.addRow([
        `Filters → Search: ${query || "-"} | Status: ${filterStatus} | Type: ${filterType} | Currency: ${filterCurrency} | Date preset: ${datePreset}`,
      ]);
      sheet.mergeCells(3, 1, 3, lastCol);
      meta2.font = { name: "Poppins", size: 10, color: { argb: "FF64748B" } };
      meta2.alignment = { vertical: "middle", horizontal: "left" };

      sheet.addRow([]);

      const headerRowIndex = sheet.rowCount + 1;
      const headerRow = sheet.addRow((sheet.columns || []).map((c) => String(c.header || "")));
      headerRow.font = { name: "Poppins", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      headerRow.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      headerRow.height = 20;

      headerRow.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FF1F2937" } },
          left: { style: "thin", color: { argb: "FF1F2937" } },
          bottom: { style: "thin", color: { argb: "FF1F2937" } },
          right: { style: "thin", color: { argb: "FF1F2937" } },
        };
      });

      for (const doc of selected) {
        const id = String(doc?._id || "");
        const amount = toNumber(doc?.amount);
        const discountVal = toNumber(doc?.discount);
        const tax1 = toNumber(doc?.tax1);
        const tax2 = toNumber(doc?.tax2);
        const tds = toNumber(doc?.tds);
        const advance = toNumber(doc?.advanceAmount);
        const paid = toNumber(receivedByInvoiceId[id] || 0);
        const due = Math.max(0, amount - paid);

        const items = Array.isArray(doc?.items) ? doc.items : [];
        const itemsSummary = items.length
          ? items
              .slice(0, 10)
              .map((it: any) => {
                const name = String(it?.name || "Item");
                const qty = it?.quantity ?? it?.qty ?? 0;
                const rate = it?.rate ?? 0;
                return `${name} (${qty} × ${rate})`;
              })
              .join("\n") + (items.length > 10 ? `\n(+${items.length - 10} more)` : "")
          : "";

        const atts = Array.isArray(doc?.attachments) ? doc.attachments : [];
        const attachmentsSummary = atts.length
          ? atts
              .slice(0, 8)
              .map((a: any) => String(a?.name || a?.path || ""))
              .filter(Boolean)
              .join("\n") + (atts.length > 8 ? `\n(+${atts.length - 8} more)` : "")
          : "";

        const rowObj: Record<string, any> = {
          number: doc?.number != null ? String(doc.number) : "-",
          status: String(doc?.status || "Unpaid"),
          client: getClientNameFromDoc(doc),
          project: getProjectTitleFromDoc(doc),
          issueDate: parseDate(doc?.issueDate),
          dueDate: parseDate(doc?.dueDate),
          labels: String(doc?.labels || ""),
          note: String(doc?.note || ""),
          items: itemsSummary,
          attachments: attachmentsSummary,
          createdAt: parseDate(doc?.createdAt),
          updatedAt: parseDate(doc?.updatedAt),
        };

        if (canViewPricing) {
          rowObj.amount = amount;
          rowObj.discount = discountVal;
          rowObj.tax1 = tax1;
          rowObj.tax2 = tax2;
          rowObj.tds = tds;
          rowObj.advance = advance;
          rowObj.paid = paid;
          rowObj.due = due;
        }

        const dataRow = sheet.addRow(rowObj);
        dataRow.font = { name: "Poppins", size: 10, color: { argb: "FF0F172A" } };
        dataRow.alignment = { vertical: "top", horizontal: "left", wrapText: true };

        dataRow.eachCell((cell) => {
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
          };
        });

        if (rowObj.issueDate instanceof Date) {
          const c = dataRow.getCell("issueDate");
          c.numFmt = dateFmt;
        }
        if (rowObj.dueDate instanceof Date) {
          const c = dataRow.getCell("dueDate");
          c.numFmt = dateFmt;
        }
        if (rowObj.createdAt instanceof Date) {
          const c = dataRow.getCell("createdAt");
          c.numFmt = dateFmt;
        }
        if (rowObj.updatedAt instanceof Date) {
          const c = dataRow.getCell("updatedAt");
          c.numFmt = dateFmt;
        }

        if (canViewPricing) {
          const moneyKeys = ["amount", "discount", "advance", "paid", "due"];
          for (const k of moneyKeys) {
            const c = dataRow.getCell(k);
            c.numFmt = currencyFmt;
          }
        }
      }

      sheet.views = [{ state: "frozen", ySplit: headerRowIndex }];
      sheet.autoFilter = {
        from: { row: headerRowIndex, column: 1 },
        to: { row: headerRowIndex, column: lastCol },
      };

      const buf = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoices_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Excel export generated");
    } catch (e: any) {
      console.error("Excel export error:", e);
      toast.error(e?.message || "Failed to export Excel");
    }
  };

  // Payments state and helpers (top-level)
  const [openPay, setOpenPay] = useState(false);
  const [payInvoiceNum, setPayInvoiceNum] = useState<string>("");
  const [payInvoiceId, setPayInvoiceId] = useState<string>("");
  const [payAmount, setPayAmount] = useState<string>("");
  const [payMethod, setPayMethod] = useState<string>("Bank Transfer");
  const [payDate, setPayDate] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [payNote, setPayNote] = useState<string>("");
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentEditingId, setPaymentEditingId] = useState<string>("");
  const [payInvoiceDropdownOpen, setPayInvoiceDropdownOpen] = useState(false);

  const [openProjectPrompt, setOpenProjectPrompt] = useState(false);
  const [projectDraftTitle, setProjectDraftTitle] = useState("");
  const [projectDraftPrice, setProjectDraftPrice] = useState<string>("");
  const [projectDraftStart, setProjectDraftStart] = useState<string>(new Date().toISOString().slice(0, 10));
  const [projectDraftDeadline, setProjectDraftDeadline] = useState<string>("");
  const [projectInvoice, setProjectInvoice] = useState<any | null>(null);

  const openPaymentFor = async (invoiceIdText: string) => {
    try {
      const num = invoiceIdText.split('#')[1]?.trim() || "";
      setPayInvoiceNum(num);
      setPaymentEditingId("");
      setPayAmount(""); setPayMethod("Bank Transfer"); setPayNote(""); setPayDate(new Date().toISOString().slice(0,10));
      if (!num) { setOpenPay(true); return; }
      const invRes = await fetch(`${API_BASE}/api/invoices/${encodeURIComponent(num)}`, { headers: getAuthHeaders() });
      if (!invRes.ok) { setOpenPay(true); return; }
      const inv = await invRes.json();
      setProjectInvoice(inv);
      const invId = inv._id || "";
      setPayInvoiceId(invId);
      const pRes = await fetch(`${API_BASE}/api/payments?invoiceId=${encodeURIComponent(invId)}`, { headers: getAuthHeaders() });
      if (pRes.ok) {
        const list = await pRes.json();
        setPayments(Array.isArray(list) ? list : []);
      } else {
        setPayments([]);
      }
      setOpenPay(true);
    } catch {
      setOpenPay(true);
    }
  };

  const formatClient = (c: any) => {
    if (!c) return "-";
    if (typeof c === "string") return c;
    return c.name || c.company || c.person || "-";
  };

  const openCreateProjectPrompt = (suggestedAmount?: number) => {
    const inv = projectInvoice;
    const num = String(inv?.number || payInvoiceNum || "").trim();
    const clientName = formatClient(inv?.client);
    setProjectDraftTitle(`Project - Invoice ${num}${clientName && clientName !== "-" ? ` (${clientName})` : ""}`);
    const amt = Number.isFinite(Number(suggestedAmount)) ? Number(suggestedAmount) : Number(inv?.amount || 0);
    setProjectDraftPrice(String(Math.max(0, Math.round(amt || 0))));
    setProjectDraftStart(new Date().toISOString().slice(0, 10));
    setProjectDraftDeadline(inv?.dueDate ? new Date(inv.dueDate).toISOString().slice(0, 10) : "");
    setOpenProjectPrompt(true);
  };

  const createProjectFromInvoice = async () => {
    try {
      const inv = projectInvoice;
      const title = String(projectDraftTitle || "").trim();
      if (!title) return;
      const payload: any = {
        title,
        client: formatClient(inv?.client),
        clientId: inv?.clientId ? String(inv.clientId) : undefined,
        price: canViewPricing && projectDraftPrice ? Number(projectDraftPrice) : 0,
        start: projectDraftStart ? new Date(projectDraftStart) : undefined,
        deadline: projectDraftDeadline ? new Date(projectDraftDeadline) : undefined,
        status: "Open",
        description: `Created from Invoice ${String(inv?.number || payInvoiceNum || "")}\nInvoice ID: ${String(inv?._id || payInvoiceId || "")}`,
        labels: `invoice:${String(inv?._id || payInvoiceId || "")}`,
      };
      const r = await fetch(`${API_BASE}/api/projects`, {
        method: "POST",
        headers: { ...getAuthHeaders({ "Content-Type": "application/json" }) },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        toast.error(String(data?.error || "Failed to create project"));
        return;
      }
      setOpenProjectPrompt(false);
      const pid = String(data?._id || data?.id || "");
      if (pid) navigate(`/projects/overview/${encodeURIComponent(pid)}`);
      toast.success("Project created");
    } catch (e: any) {
      toast.error(String(e?.message || "Failed to create project"));
    }
  };

  const openEditFor = async (invoiceIdText: string) => {
    try {
      const num = invoiceIdText.split('#')[1]?.trim() || "";
      if (!num) return;
      const r = await fetch(`${API_BASE}/api/invoices/${encodeURIComponent(num)}`, { headers: getAuthHeaders() });
      if (!r.ok) return;
      const inv = await r.json();
      setEditingInvoiceId(inv._id || "");
      setEditingInvoiceNum(inv.number || num);
      setBillDate(inv.issueDate ? new Date(inv.issueDate).toISOString().slice(0,10) : "");
      setDueDate(inv.dueDate ? new Date(inv.dueDate).toISOString().slice(0,10) : "");
      if (inv.clientId) setClientSel(String(inv.clientId));
      if (inv.projectId) setProjectSel(String(inv.projectId));
      setTax1Sel(String(inv.tax1 ?? "0"));
      setTax2Sel(String(inv.tax2 ?? "0"));
      setTdsSel(String(inv.tds ?? "0"));
      setDiscount(inv.discount != null ? String(inv.discount) : "");
      setNote(inv.note || "");
      setLabels(inv.labels || "");
      setAdvanceAmount(inv.advanceAmount != null ? String(inv.advanceAmount) : "");
      setAttachments(Array.isArray(inv.attachments) ? inv.attachments : []);
      setIsEditing(true);
      setOpenAdd(true);
    } catch {}
  };

  const handleDropdownPayment = async (invoiceIdText: string) => {
    setPayInvoiceDropdownOpen(false);
    await openPaymentFor(invoiceIdText);
  };

  const loadInvoices = async () => {
    try {
      const sp = new URLSearchParams();
      if (query) sp.set("q", query);
      if (urlClientId) sp.set("clientId", urlClientId);
      const url = `${API_BASE}/api/invoices${sp.toString() ? `?${sp.toString()}` : ""}`;
      const [res, payRes] = await Promise.all([
        fetch(url, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/payments`, { headers: getAuthHeaders() }).catch(() => null as any),
      ]);
      if (!res.ok) return;
      const data = await res.json();
      setInvoiceDocs(Array.isArray(data) ? data : []);

      const payList = payRes?.ok ? await payRes.json().catch(() => []) : [];
      const paymentsList: any[] = Array.isArray(payList) ? payList : [];
      setAllPayments(paymentsList);
      const receivedByInvoiceId = paymentsList.reduce((acc: Record<string, number>, p: any) => {
        const id = String(p?.invoiceId || p?.invoice || "");
        if (!id) return acc;
        acc[id] = (acc[id] || 0) + (Number(p.amount) || 0);
        return acc;
      }, {});

      const mapped: ListInvoice[] = (Array.isArray(data) ? data : []).map((d: any) => {
        const c = d.client;
        const p = d.project;
        const clientId = c && typeof c === 'object' ? String(c._id || c.id || '') : '';
        const clientName = c && typeof c === 'object' ? (c.name || c.company || c.person || '-') : (c || '-');
        const projectId = p && typeof p === 'object' ? String(p._id || p.id || '') : '';
        const projectTitle = p && typeof p === 'object' ? (p.title || '-') : (p || '-');
        const invoiceId = String(d._id || "");
        const amount = Number(d.amount) || 0;
        const received = Number(receivedByInvoiceId[invoiceId] || 0);
        const dueAmt = Math.max(0, amount - received);
        const computedStatus: ListInvoice["status"] =
          dueAmt <= 0 ? "Paid" : received > 0 ? "Partially paid" : "Unpaid";
        return {
          id: `INVOICE #${d.number || '-'}`,
          dbId: String(d._id || ''),
          client: clientId || clientName,
          project: projectId || projectTitle,
          billDate: d.issueDate ? new Date(d.issueDate).toISOString().slice(0,10) : '-',
          dueDate: d.dueDate ? new Date(d.dueDate).toISOString().slice(0,10) : '-',
          totalInvoiced: `Rs ${amount.toLocaleString()}`,
          paymentReceived: `Rs ${received.toLocaleString()}`,
          due: `Rs ${dueAmt.toLocaleString()}`,
          status: (d.status as any) || computedStatus,
          advancedAmount: d.advanceAmount != null ? String(d.advanceAmount) : undefined,
          discount: d.discount != null && Number(d.discount) > 0 ? String(d.discount) : undefined,
        };
      });
      setRows(mapped);
    } catch {}
  };

  useEffect(() => { loadInvoices(); }, [query, urlClientId]);

  const applyQuickView = (next: string) => {
    setTab("list");
    setQuickView(next);
    // Reset high-level filters for predictable results
    setFilterType("all");
    setFilterCurrency("all");
    setClientSel("");
    setProjectSel("");
    setQuery("");

    if (next === "this_month") {
      setDatePreset("monthly");
      setFilterStatus("all");
      return;
    }

    setDatePreset("all");
    if (next === "paid") {
      setFilterStatus("Paid");
      return;
    }
    if (next === "due" || next === "overdue" || next === "received") {
      setFilterStatus("all");
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const headers = { ...getAuthHeaders() } as any;
        const [cRes, pRes] = await Promise.all([
          fetch(`${API_BASE}/api/clients`, { headers }),
          fetch(`${API_BASE}/api/projects`, { headers }),
        ]);
        if (cRes.ok) {
          const cData = await cRes.json();
          const cOpts: { id: string; name: string }[] = (Array.isArray(cData) ? cData : [])
            .map((c: any) => ({ id: String(c._id || ""), name: (c.company || c.person || "-") }))
            .filter((c: any) => c.id && c.name);
          setClientOptions(cOpts);
          if (!clientSel && cOpts.length) setClientSel(cOpts[0].id);
        }
        if (pRes.ok) {
          const pData = await pRes.json();
          const pOpts: { id: string; title: string; clientId?: string }[] = (Array.isArray(pData) ? pData : [])
            .map((p: any) => {
              const id = String(p._id || p.id || "");
              const title = String(p.title || p.name || p.projectName || p.project || "Untitled");
              const clientId = p.clientId ? String(p.clientId) : (p.client?._id ? String(p.client._id) : undefined);
              return { id, title, clientId };
            })
            .filter((p: any) => p.id);
          setProjectOptions(pOpts);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!urlClientId) return;
    setClientSel(urlClientId);
    setProjectSel("");
  }, [urlClientId]);

  useEffect(() => {
    if (!urlAdd) return;
    setOpenAdd(true);
    setIsEditing(false);
    setEditingInvoiceId("");
    setEditingInvoiceNum("");
  }, [urlAdd]);

  const displayRows = useMemo(() => {
    const parseISO = (s: string) => {
      const t = Date.parse(String(s || ""));
      return Number.isFinite(t) ? new Date(t) : null;
    };
    const parseMoney = (s: string) => Number(String(s || "0").replace(/[^0-9.-]/g, "")) || 0;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    let start: Date | null = null;
    let end: Date | null = null;
    if (datePreset === "monthly") {
      start = startOfMonth;
      end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    } else if (datePreset === "yearly") {
      start = startOfYear;
      end = new Date(now.getFullYear() + 1, 0, 1);
    } else if (datePreset === "dec-2025") {
      start = new Date(2025, 11, 1);
      end = new Date(2026, 0, 1);
    }

    return (rows || []).filter((r) => {
      if (filterType !== "all") {
        // Current module only lists invoices; keep a future-proof filter.
        if (filterType === "recurring") return false;
      }
      if (filterStatus !== "all" && String(r.status) !== String(filterStatus)) return false;
      if (filterCurrency !== "all") {
        // Current invoices are PKR-only in UI.
        if (filterCurrency !== "PKR") return false;
      }
      if (start || end) {
        const d = parseISO(r.billDate);
        if (!d) return false;
        if (start && d < start) return false;
        if (end && d >= end) return false;
      }

      if (quickView && quickView !== "__all__") {
        if (quickView === "due") {
          const st = String(r.status || "");
          return st !== "Paid";
        }
        if (quickView === "received") {
          return parseMoney(r.paymentReceived) > 0;
        }
        if (quickView === "overdue") {
          const st = String(r.status || "");
          if (st === "Paid") return false;
          const due = parseISO(r.dueDate);
          if (!due) return false;
          return due.getTime() < startOfToday;
        }
        if (quickView === "this_month") {
          // Date preset already handles this; keep safe fallback
          const d = parseISO(r.billDate);
          if (!d) return false;
          return d >= startOfMonth;
        }
      }
      return true;
    });
  }, [rows, filterType, filterStatus, filterCurrency, datePreset, quickView]);

  const totals = useMemo(() => {
    const parse = (s: string) => Number(String(s || "0").replace(/[^0-9.-]/g, "")) || 0;
    const invoiced = displayRows.reduce((sum, r) => sum + parse(r.totalInvoiced), 0);
    const received = displayRows.reduce((sum, r) => sum + parse(r.paymentReceived), 0);
    const due = displayRows.reduce((sum, r) => sum + parse(r.due), 0);
    return { invoiced, received, due };
  }, [displayRows]);

  const invoiceDashboard = useMemo(() => {
    const parse = (s: string) => Number(String(s || "0").replace(/[^0-9.-]/g, "")) || 0;
    const now = new Date();
    const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const thisMonthKey = monthKey(now);

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const inDays = (d: Date) => Math.floor((d.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));

    const rowsAll = Array.isArray(rows) ? rows : [];

    const withDates = rowsAll.map((r) => {
      const bill = r.billDate && r.billDate !== "-" ? new Date(r.billDate) : null;
      const due = r.dueDate && r.dueDate !== "-" ? new Date(r.dueDate) : null;
      return { r, bill, due };
    });

    const overdue = withDates
      .filter(({ r, due }) => {
        if (!due || Number.isNaN(due.getTime())) return false;
        if (String(r.status).toLowerCase() === "paid") return false;
        return due < now;
      })
      .map(({ r }) => r);

    const dueIn7 = withDates
      .filter(({ r, due }) => {
        if (!due || Number.isNaN(due.getTime())) return false;
        if (String(r.status).toLowerCase() === "paid") return false;
        if (due < startOfToday) return false;
        const dd = inDays(due);
        return dd >= 0 && dd <= 7;
      })
      .map(({ r }) => r);

    const dueIn7Amount = dueIn7.reduce((acc, r) => acc + parse(r.due), 0);

    const overdueAmount = overdue.reduce((acc, r) => acc + parse(r.due), 0);

    const thisMonth = withDates
      .filter(({ bill }) => {
        if (!bill || Number.isNaN(bill.getTime())) return false;
        return monthKey(bill) === thisMonthKey;
      })
      .map(({ r }) => r);
    const thisMonthInvoiced = thisMonth.reduce((acc, r) => acc + parse(r.totalInvoiced), 0);
    const thisMonthReceived = thisMonth.reduce((acc, r) => acc + parse(r.paymentReceived), 0);

    const recent = rowsAll
      .slice()
      .sort((a, b) => (a.billDate < b.billDate ? 1 : -1))
      .slice(0, 6);

    const trend: Array<{ month: string; invoiced: number; received: number; due: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKey(d);
      const monthRows = withDates
        .filter(({ bill }) => bill && !Number.isNaN(bill.getTime()) && monthKey(bill) === key)
        .map(({ r }) => r);
      trend.push({
        month: d.toLocaleString(undefined, { month: "short" }),
        invoiced: monthRows.reduce((acc, r) => acc + parse(r.totalInvoiced), 0),
        received: monthRows.reduce((acc, r) => acc + parse(r.paymentReceived), 0),
        due: monthRows.reduce((acc, r) => acc + parse(r.due), 0),
      });
    }

    return {
      overdue,
      overdueAmount,
      dueIn7,
      dueIn7Amount,
      thisMonthInvoiced,
      thisMonthReceived,
      recent,
      trend,
    };
  }, [rows]);

  const getClientName = (val: any) => {
    if (!val) return "-";
    if (typeof val === "object") {
      return val.name || val.company || val.person || val.id || "-";
    }
    const f = clientOptions.find(c => c.id === val);
    return f ? f.name : String(val);
  };
  const getProjectTitle = (val?: any) => {
    if (!val) return "-";
    if (typeof val === "object") {
      return val.title || val.name || val.id || "-";
    }
    const f = projectOptions.find(p => p.id === val);
    return f ? f.title : String(val);
  };

  // Export all invoices to CSV (opens a download)
  const handleExportCSV = () => {
    const head = canViewPricing
      ? ["Invoice ID", "Client", "Project", "Bill date", "Due date", "Total Invoiced", "Discount", "Payment Received", "Due", "Status", "Advanced Amount"]
      : ["Invoice ID", "Client", "Project", "Bill date", "Due date", "Status", "Advanced Amount"];
    const lines = rows.map((r) =>
      canViewPricing
        ? [
            r.id,
            getClientName(r.client),
            getProjectTitle(r.project),
            r.billDate,
            r.dueDate,
            r.totalInvoiced,
            r.discount ? `Rs ${Number(r.discount).toLocaleString()}` : "",
            r.paymentReceived,
            r.due,
            r.status,
            r.advancedAmount || "",
          ]
        : [
            r.id,
            getClientName(r.client),
            getProjectTitle(r.project),
            r.billDate,
            r.dueDate,
            r.status,
            r.advancedAmount || "",
          ]
    );
    const csv = [head.join(","), ...lines.map((row) => row.join(","))].join("\n");
    const encoded = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    const a = document.createElement("a");
    a.href = encoded;
    a.download = "invoices.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Print friendly page (new window) similar to the provided screenshot
  const handlePrintInvoices = () => {
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoices | Mindspire</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; padding: 24px; }
    h1 { text-align:center; margin: 0 0 16px; font-size: 22px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px 10px; text-align: left; }
    thead th { border-bottom: 2px solid #ddd; }
    tbody td { border-top: 1px solid #eee; }
  </style>
  <script>function doPrint(){ setTimeout(function(){ window.print(); }, 50); }</script>
  </head>
  <body onload="doPrint()">
    <h1>Invoices | Mindspire</h1>
    <table>
      <thead>
        <tr>
          <th>Invoice ID</th>
          <th>Client</th>
          <th>Project</th>
          <th>Due date</th>
          ${canViewPricing ? "<th>Total invoiced</th><th>Discount</th><th>Payment Received</th><th>Due</th>" : ""}
          <th>Status</th>
          <th>Advanced Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td>${r.id}</td>
            <td>${getClientName(r.client)}</td>
            <td>${getProjectTitle(r.project)}</td>
            <td>${r.dueDate}</td>
            ${canViewPricing ? `<td>${r.totalInvoiced}</td><td>${r.discount ? `Rs ${Number(r.discount).toLocaleString()}` : ''}</td><td>${r.paymentReceived}</td><td>${r.due}</td>` : ""}
            <td>${r.status}</td>
            <td>${r.advancedAmount || ''}</td>
          </tr>`).join("")}
      </tbody>
    </table>
  </body>
  </html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <h1 className="text-sm text-muted-foreground">Invoices</h1>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="bg-muted/40">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="list">List</TabsTrigger>
              <TabsTrigger value="recurring">Recurring</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Dialog>
            <DialogTrigger asChild><Button variant="outline" size="sm">Manage labels</Button></DialogTrigger>
            <DialogContent className="bg-card" aria-describedby={undefined}><DialogHeader><DialogTitle>Manage labels</DialogTitle></DialogHeader><DialogFooter><Button variant="outline">Close</Button></DialogFooter></DialogContent>
          </Dialog>
          <DropdownMenu open={payInvoiceDropdownOpen} onOpenChange={setPayInvoiceDropdownOpen}>
            <DropdownMenuTrigger asChild><Button variant="outline" size="sm">Add payment</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
              {rows.length === 0 ? (
                <DropdownMenuItem disabled>No invoices</DropdownMenuItem>
              ) : (
                rows.map((r) => (
                  <DropdownMenuItem key={r.id} onClick={() => handleDropdownPayment(r.id)}>
                    {r.id} – {getClientName(r.client)}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={() => handlePrintInvoices()}><Printer className="w-4 h-4 mr-2"/>Print</Button>
          <Button variant="outline" size="sm" onClick={() => handleExportExcel()}><FileSpreadsheet className="w-4 h-4 mr-2"/>Excel</Button>
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild><Button variant="outline" size="sm" onClick={()=>setOpenAdd(true)}><Plus className="w-4 h-4 mr-2"/>Add invoice</Button></DialogTrigger>
            <DialogContent className="bg-card max-w-3xl" aria-describedby={undefined}>
              <DialogHeader><DialogTitle>Add invoice</DialogTitle></DialogHeader>
              <div className="grid gap-3 sm:grid-cols-12">
                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Bill date</div>
                <div className="sm:col-span-9"><DatePicker value={billDate} onChange={setBillDate} placeholder="Pick bill date" /></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Due date</div>
                <div className="sm:col-span-9"><DatePicker value={dueDate} onChange={setDueDate} placeholder="Pick due date" /></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Client</div>
                <div className="sm:col-span-9">
                  <Select value={clientSel} onValueChange={(v)=>{ setClientSel(v); setProjectSel(""); }}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                      {clientOptions.length === 0 ? (
                        <SelectItem value="__no_clients__" disabled>No clients</SelectItem>
                      ) : (
                        clientOptions.map((c)=> (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Project</div>
                <div className="sm:col-span-9">
                  <Select value={projectSel} onValueChange={setProjectSel}>
                    <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const list = clientSel
                          ? projectOptions.filter(p => !p.clientId || p.clientId === clientSel)
                          : projectOptions;
                        if (list.length === 0) return <SelectItem value="__no_projects__" disabled>No projects</SelectItem>;
                        return list.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">TAX</div>
                <div className="sm:col-span-9">
                  <Input type="number" min={0} step="0.01" value={tax1Sel} onChange={(e)=>setTax1Sel(e.target.value)} placeholder="0" />
                </div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Second TAX</div>
                <div className="sm:col-span-9">
                  <Input type="number" min={0} step="0.01" value={tax2Sel} onChange={(e)=>setTax2Sel(e.target.value)} placeholder="0" />
                </div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">TDS</div>
                <div className="sm:col-span-9">
                  <Input type="number" min={0} step="0.01" value={tdsSel} onChange={(e)=>setTdsSel(e.target.value)} placeholder="0" />
                </div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Discount</div>
                <div className="sm:col-span-9">
                  <Input type="number" min={0} step="0.01" value={discount} onChange={(e)=>setDiscount(e.target.value)} placeholder="0" />
                </div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground flex items-center gap-1">Recurring <HelpCircle className="w-3 h-3 text-muted-foreground"/></div>
                <div className="sm:col-span-9 flex items-center gap-2"><Checkbox id="recurring" /><label htmlFor="recurring" className="text-sm"></label></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Note</div>
                <div className="sm:col-span-9"><Textarea placeholder="Note" className="min-h-[96px]" value={note} onChange={(e)=>setNote(e.target.value)} /></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Labels</div>
                <div className="sm:col-span-9"><Input placeholder="Labels" value={labels} onChange={(e)=>setLabels(e.target.value)} /></div>

                <div className="sm:col-span-3 sm:text-right sm:pt-2 text-sm text-muted-foreground">Advanced Amount</div>
                <div className="sm:col-span-9"><Input placeholder="Advanced Amount" value={advanceAmount} onChange={(e)=>setAdvanceAmount(e.target.value)} /></div>
              </div>
              <DialogFooter>
                <div className="w-full flex items-center justify-between">
                  <Button variant="outline" size="sm" onClick={handleUploadClick}><Paperclip className="w-4 h-4 mr-2"/>Upload File</Button>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={onFileChange} />
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={()=>setOpenAdd(false)}>Close</Button>
                    <Button onClick={async ()=>{
                      const clientName = (()=>{ const f = clientOptions.find(c=>c.id===clientSel); return f?.name || "-"; })();
                      const payload:any = {
                        issueDate: billDate ? new Date(billDate) : undefined,
                        dueDate: dueDate ? new Date(dueDate) : undefined,
                        clientId: clientSel || undefined,
                        client: clientName,
                        status: 'Unpaid',
                        amount: 0,
                        advanceAmount: advanceAmount ? Number(advanceAmount) : undefined,
                        tax1: Number(tax1Sel)||0,
                        tax2: Number(tax2Sel)||0,
                        tds: Number(tdsSel)||0,
                        discount: discount !== "" ? Number(discount) : 0,
                        projectId: projectSel || undefined,
                        project: getProjectTitle(projectSel),
                        note,
                        labels,
                        attachments,
                      };
                      try {
                        const method = isEditing ? 'PUT' : 'POST';
                        const url = isEditing ? `${API_BASE}/api/invoices/${encodeURIComponent(editingInvoiceId)}` : `${API_BASE}/api/invoices`;
                        const r = await fetch(url, { method, headers:{'Content-Type':'application/json', ...getAuthHeaders()}, body: JSON.stringify(payload)});
                        if (r.ok) {
                          setOpenAdd(false);
                          // reset form
                          setDueDate(""); setTax1Sel("0"); setTax2Sel("0"); setTdsSel("0"); setDiscount(""); setNote(""); setLabels(""); setAdvanceAmount("");
                          setIsEditing(false); setEditingInvoiceId(""); setEditingInvoiceNum("");
                          await loadInvoices();
                        }
                      } catch {}
                    }}>Save</Button>
                  </div>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {/* Add payment dialog */}
          <Dialog open={openPay} onOpenChange={setOpenPay}>
            <DialogContent className="bg-card max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
              <DialogHeader><DialogTitle>Add payment</DialogTitle></DialogHeader>
              <div className="grid gap-3 sm:grid-cols-12">
                <div className="sm:col-span-4 sm:text-right sm:pt-2 text-sm text-muted-foreground">Invoice #</div>
                <div className="sm:col-span-8"><Input value={payInvoiceNum} readOnly /></div>
                <div className="sm:col-span-4 sm:text-right sm:pt-2 text-sm text-muted-foreground">Amount</div>
                <div className="sm:col-span-8"><Input type="number" value={payAmount} onChange={(e)=>setPayAmount(e.target.value)} placeholder="Amount" /></div>
                <div className="sm:col-span-4 sm:text-right sm:pt-2 text-sm text-muted-foreground">Method</div>
                <div className="sm:col-span-8">
                  <Select value={payMethod} onValueChange={setPayMethod}>
                    <SelectTrigger><SelectValue placeholder="Method" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Stripe">Stripe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-4 sm:text-right sm:pt-2 text-sm text-muted-foreground">Date</div>
                <div className="sm:col-span-8"><DatePicker value={payDate} onChange={setPayDate} placeholder="Pick date" /></div>
                <div className="sm:col-span-4 sm:text-right sm:pt-2 text-sm text-muted-foreground">Note</div>
                <div className="sm:col-span-8"><Textarea placeholder="Note" value={payNote} onChange={(e)=>setPayNote(e.target.value)} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={()=>setOpenPay(false)}>Close</Button>
                <Button onClick={async ()=>{
                  try {
                    if (!payInvoiceId) return;
                    const payload:any = {
                      invoiceId: payInvoiceId,
                      clientId: (rows || []).find((r) => String(r.dbId) === String(payInvoiceId))?.client || undefined,
                      amount: payAmount ? Number(payAmount) : 0,
                      method: payMethod,
                      date: payDate ? new Date(payDate) : undefined,
                      note: payNote,
                    };
                    const method = paymentEditingId ? 'PUT' : 'POST';
                    const url = paymentEditingId ? `${API_BASE}/api/payments/${encodeURIComponent(paymentEditingId)}` : `${API_BASE}/api/payments`;
                    const r = await fetch(url, { method, headers: { ...getAuthHeaders({ 'Content-Type': 'application/json' }) }, body: JSON.stringify(payload) });
                    if (r.ok) {
                      setPayAmount(""); setPayMethod("Bank Transfer"); setPayNote(""); setPayDate(new Date().toISOString().slice(0,10));
                      setPaymentEditingId("");
                      // reload payments list
                      if (payInvoiceId) {
                        const pRes = await fetch(`${API_BASE}/api/payments?invoiceId=${encodeURIComponent(payInvoiceId)}`, { headers: getAuthHeaders() });
                        if (pRes.ok) {
                          const list = await pRes.json();
                          setPayments(Array.isArray(list) ? list : []);
                        }
                      }

                      // Offer: Create a new project from this invoice
                      openCreateProjectPrompt(Number(payload.amount || 0));
                    }
                  } catch {}
                }}>{paymentEditingId ? "Update" : "Save"}</Button>
              </DialogFooter>
              {payments.length > 0 && (
                <>
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-medium mb-2">Existing payments</h4>
                    <div className="space-y-2">
                      {payments.map((p) => (
                        <div key={p._id} className="flex items-center justify-between text-xs bg-muted p-2 rounded">
                          <div className="flex-1">
                            <div className="font-medium">{p.method} • {p.date ? new Date(p.date).toLocaleDateString() : ''}</div>
                            <div className="text-muted-foreground">Rs.{p.amount || 0} {p.note ? `• ${p.note}` : ''}</div>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => {
                              setPaymentEditingId(p._id);
                              setPayAmount(String(p.amount || ""));
                              setPayMethod(p.method || "Bank Transfer");
                              setPayDate(p.date ? new Date(p.date).toISOString().slice(0,10) : new Date().toISOString().slice(0,10));
                              setPayNote(p.note || "");
                            }}>Edit</Button>
                            <Button size="sm" variant="destructive" onClick={async () => {
                              if (!confirm("Delete this payment?")) return;
                              await fetch(`${API_BASE}/api/payments/${encodeURIComponent(p._id)}`, { method: 'DELETE', headers: getAuthHeaders() });
                              if (payInvoiceId) {
                                const pRes = await fetch(`${API_BASE}/api/payments?invoiceId=${encodeURIComponent(payInvoiceId)}`, { headers: getAuthHeaders() });
                                if (pRes.ok) {
                                  const list = await pRes.json();
                                  setPayments(Array.isArray(list) ? list : []);
                                }
                              }
                            }}>Delete</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={openProjectPrompt} onOpenChange={setOpenProjectPrompt}>
            <DialogContent className="bg-card max-w-lg" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>Start a project for this invoice?</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="text-muted-foreground">Create a project linked to this invoice so you can track tasks, milestones and deadline.</div>
                <div className="grid gap-3">
                  <div className="space-y-1">
                    <Label>Project title</Label>
                    <Input value={projectDraftTitle} onChange={(e)=>setProjectDraftTitle(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Price</Label>
                      {canViewPricing ? (
                        <Input type="number" value={projectDraftPrice} onChange={(e)=>setProjectDraftPrice(e.target.value)} />
                      ) : (
                        <Input type="text" value={maskFinancialData(Number(projectDraftPrice || 0))} readOnly />
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label>Start</Label>
                      <DatePicker value={projectDraftStart} onChange={setProjectDraftStart} placeholder="Pick start date" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Deadline</Label>
                    <DatePicker value={projectDraftDeadline} onChange={setProjectDraftDeadline} placeholder="Pick deadline" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenProjectPrompt(false)}>Not now</Button>
                <Button onClick={createProjectFromInvoice}>Create project</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {/* Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-36"><SelectValue placeholder="- Type -"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="recurring">Recurring</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36"><SelectValue placeholder="- Status -"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Partially paid">Partially paid</SelectItem>
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterCurrency} onValueChange={setFilterCurrency}>
                <SelectTrigger className="w-36"><SelectValue placeholder="- Currency -"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="PKR">PKR</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => setDatePreset("monthly")}>Monthly</Button>
              <Button variant="outline" onClick={() => setDatePreset("yearly")}>Yearly</Button>
              <Button variant="outline" onClick={() => setDatePreset("all")}>Custom</Button>
              <Button variant="outline" onClick={() => setDatePreset("all")}>Dynamic</Button>
              <Button variant="outline" onClick={() => setDatePreset("dec-2025")}>December 2025</Button>
              <Button variant="success" size="sm" onClick={loadInvoices}>↻</Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportExcel}>Excel</Button>
              <Button variant="outline" size="sm" onClick={handlePrintInvoices}>Print</Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search" value={query} onChange={(e)=>setQuery(e.target.value)} className="pl-9 w-56" />
              </div>
            </div>
          </div>

          <Tabs value={tab} onValueChange={setTab} className="mt-4">
            <TabsContent value="dashboard" className="space-y-4">
              <div className="rounded-2xl border bg-white/70 backdrop-blur-sm shadow-sm dark:bg-slate-900/50">
                <div className="p-5 sm:p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Invoice Dashboard</div>
                    <div className="mt-1 text-lg sm:text-xl font-semibold">Quick financial overview</div>
                    <div className="mt-1 text-sm text-muted-foreground">KPIs, trends, and overdue insights.</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={loadInvoices}>Refresh</Button>
                    <Button variant="outline" size="sm" onClick={handlePrintInvoices}>Print</Button>
                    <Button variant="outline" size="sm" onClick={handleExportExcel}>Export</Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                <Card
                  className="border-0 shadow-sm bg-gradient-to-br from-slate-50 to-white dark:from-slate-950/60 dark:to-slate-900/40 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => applyQuickView("__all__")}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground">Total invoiced</div>
                        <div className="mt-2 text-2xl font-bold tracking-tight">{canViewPricing ? `Rs.${totals.invoiced.toLocaleString()}` : maskFinancialData(totals.invoiced)}</div>
                      </div>
                      <div className="rounded-2xl bg-slate-900/5 dark:bg-white/10 p-3">
                        <FileText className="w-5 h-5 text-slate-700 dark:text-slate-200" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className="border-0 shadow-sm bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-950/40 dark:to-slate-900/40 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => applyQuickView("due")}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground">Due in 7 days</div>
                        <div className="mt-2 text-2xl font-bold tracking-tight text-cyan-700 dark:text-cyan-200">
                          {canViewPricing ? `Rs.${invoiceDashboard.dueIn7Amount.toLocaleString()}` : maskFinancialData(invoiceDashboard.dueIn7Amount)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{invoiceDashboard.dueIn7.length} invoices</div>
                      </div>
                      <div className="rounded-2xl bg-cyan-600/10 dark:bg-white/10 p-3">
                        <CalendarDays className="w-5 h-5 text-cyan-700 dark:text-cyan-200" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/40 dark:to-slate-900/40 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => applyQuickView("received")}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground">Payment received</div>
                        <div className="mt-2 text-2xl font-bold tracking-tight">{canViewPricing ? `Rs.${totals.received.toLocaleString()}` : maskFinancialData(totals.received)}</div>
                      </div>
                      <div className="rounded-2xl bg-emerald-600/10 dark:bg-white/10 p-3">
                        <Download className="w-5 h-5 text-emerald-700 dark:text-emerald-200" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className="border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/40 dark:to-slate-900/40 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => applyQuickView("due")}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground">Due</div>
                        <div className="mt-2 text-2xl font-bold tracking-tight">{canViewPricing ? `Rs.${totals.due.toLocaleString()}` : maskFinancialData(totals.due)}</div>
                      </div>
                      <div className="rounded-2xl bg-indigo-600/10 dark:bg-white/10 p-3">
                        <Mail className="w-5 h-5 text-indigo-700 dark:text-indigo-200" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className="border-0 shadow-sm bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/40 dark:to-slate-900/40 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => applyQuickView("overdue")}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground">Overdue</div>
                        <div className="mt-2 text-2xl font-bold tracking-tight text-rose-600">{canViewPricing ? `Rs.${invoiceDashboard.overdueAmount.toLocaleString()}` : maskFinancialData(invoiceDashboard.overdueAmount)}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{invoiceDashboard.overdue.length} invoices</div>
                      </div>
                      <div className="rounded-2xl bg-rose-600/10 dark:bg-white/10 p-3">
                        <Eye className="w-5 h-5 text-rose-700 dark:text-rose-200" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/40 dark:to-slate-900/40 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => applyQuickView("this_month")}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground">This month</div>
                        <div className="mt-2 text-2xl font-bold tracking-tight">{canViewPricing ? `Rs.${invoiceDashboard.thisMonthInvoiced.toLocaleString()}` : maskFinancialData(invoiceDashboard.thisMonthInvoiced)}</div>
                        <div className="mt-1 text-xs text-muted-foreground">Received: {canViewPricing ? `Rs.${invoiceDashboard.thisMonthReceived.toLocaleString()}` : maskFinancialData(invoiceDashboard.thisMonthReceived)}</div>
                      </div>
                      <div className="rounded-2xl bg-amber-600/10 dark:bg-white/10 p-3">
                        <Printer className="w-5 h-5 text-amber-700 dark:text-amber-200" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-12">
                <Card className="lg:col-span-7 border-0 shadow-sm bg-white/80 dark:bg-slate-900/60 overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-4 sm:p-5 flex items-center justify-between border-b bg-white/60 dark:bg-slate-900/40">
                      <div>
                        <div className="text-sm font-semibold">Last 6 months</div>
                        <div className="text-xs text-muted-foreground">Invoiced vs received</div>
                      </div>
                      <div className="text-xs text-muted-foreground">{canViewPricing ? "Amounts" : "Hidden"}</div>
                    </div>
                    <div className="mt-3 h-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={invoiceDashboard.trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} width={48} hide={!canViewPricing} />
                          <Tooltip />
                          <Bar dataKey={canViewPricing ? "invoiced" : "due"} fill="#3b82f6" radius={[6, 6, 0, 0]} />
                          {canViewPricing && <Bar dataKey="received" fill="#22c55e" radius={[6, 6, 0, 0]} />}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-5 border-0 shadow-sm bg-white/80 dark:bg-slate-900/60 overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-4 sm:p-5 flex items-center justify-between border-b bg-white/60 dark:bg-slate-900/40">
                      <div>
                        <div className="text-sm font-semibold">Overdue invoices</div>
                        <div className="text-xs text-muted-foreground">Needs attention</div>
                      </div>
                      <Badge variant={invoiceDashboard.overdue.length ? "destructive" : "secondary"}>{invoiceDashboard.overdue.length}</Badge>
                    </div>
                    <div className="mt-3 overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead>Invoice</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Due date</TableHead>
                            {canViewPricing && <TableHead className="text-right">Due</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(invoiceDashboard.overdue || []).slice(0, 6).map((r) => (
                            <TableRow key={r.id}>
                              <TableCell className="text-primary underline cursor-pointer" onClick={() => navigate(`/invoices/${encodeURIComponent(r.id.split('#')[1] || '1')}`)}>{r.id}</TableCell>
                              <TableCell>{getClientName(r.client)}</TableCell>
                              <TableCell>{r.dueDate}</TableCell>
                              {canViewPricing && <TableCell className="text-right font-medium">{r.due}</TableCell>}
                            </TableRow>
                          ))}
                          {invoiceDashboard.overdue.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={canViewPricing ? 4 : 3} className="text-center text-muted-foreground">No overdue invoices</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-900/60 overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4 sm:p-5 flex items-center justify-between border-b bg-white/60 dark:bg-slate-900/40">
                    <div>
                      <div className="text-sm font-semibold">Recent invoices</div>
                      <div className="text-xs text-muted-foreground">Latest activity</div>
                    </div>
                    <Badge variant="secondary">{invoiceDashboard.recent.length}</Badge>
                  </div>
                  <div className="mt-3 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead>Invoice</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Bill date</TableHead>
                          <TableHead>Status</TableHead>
                          {canViewPricing && <TableHead className="text-right">Total</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(invoiceDashboard.recent || []).map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-primary underline cursor-pointer" onClick={() => navigate(`/invoices/${encodeURIComponent(r.id.split('#')[1] || '1')}`)}>{r.id}</TableCell>
                            <TableCell>{getClientName(r.client)}</TableCell>
                            <TableCell>{r.billDate}</TableCell>
                            <TableCell>
                              <Badge variant={r.status === 'Paid' ? 'success' : r.status === 'Partially paid' ? 'secondary' : 'destructive'}>{r.status}</Badge>
                            </TableCell>
                            {canViewPricing && <TableCell className="text-right font-medium">{r.totalInvoiced}</TableCell>}
                          </TableRow>
                        ))}
                        {invoiceDashboard.recent.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={canViewPricing ? 5 : 4} className="text-center text-muted-foreground">No invoices</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="list">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Invoice ID</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Bill date</TableHead>
                        <TableHead>Due date</TableHead>
                        {canViewPricing && <TableHead>Total invoiced</TableHead>}
                        {canViewPricing && <TableHead>Discount</TableHead>}
                        {canViewPricing && <TableHead>Payment Received</TableHead>}
                        {canViewPricing && <TableHead>Due</TableHead>}
                        <TableHead>Status</TableHead>
                        <TableHead>Advanced Amount</TableHead>
                        <TableHead className="w-8"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayRows.map((r)=> (
                        <TableRow key={r.id}>
                          <TableCell className="text-primary underline cursor-pointer" onClick={()=>navigate(`/invoices/${encodeURIComponent(r.id.split('#')[1] || '1')}`)}>{r.id}</TableCell>
                          <TableCell>{getClientName(r.client)}</TableCell>
                          <TableCell>{getProjectTitle(r.project)}</TableCell>
                          <TableCell>{r.billDate}</TableCell>
                          <TableCell>{r.dueDate}</TableCell>
                          {canViewPricing && <TableCell>{r.totalInvoiced}</TableCell>}
                          {canViewPricing && <TableCell>{r.discount ? `Rs ${Number(r.discount).toLocaleString()}` : '-'}</TableCell>}
                          {canViewPricing && <TableCell>{r.paymentReceived}</TableCell>}
                          {canViewPricing && <TableCell>{r.due}</TableCell>}
                          <TableCell>
                            <Badge variant={r.status === 'Paid' ? 'success' : r.status === 'Partially paid' ? 'secondary' : 'destructive'}>{r.status}</Badge>
                          </TableCell>
                          <TableCell>{r.advancedAmount || '-'}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4"/></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={()=>openEditFor(r.id)}>Edit</DropdownMenuItem>
                                <DropdownMenuItem onClick={()=>navigate(`/invoices/${encodeURIComponent(r.id.split('#')[1] || '1')}/preview`)}>Preview</DropdownMenuItem>
                                <DropdownMenuItem onClick={async ()=>{
                                  const num = r.id.split('#')[1] || '';
                                  if (!num) return;
                                  await fetch(`${API_BASE}/api/invoices/${encodeURIComponent(num)}`, { method: 'DELETE', headers: getAuthHeaders() });
                                  await loadInvoices();
                                }}>Delete</DropdownMenuItem>
                                <DropdownMenuItem onClick={()=>openPaymentFor(r.id)}>Add payment</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell className="font-medium">Total</TableCell>
                        <TableCell colSpan={5}></TableCell>
                        {canViewPricing && <TableCell className="font-semibold">{`Rs.${totals.invoiced.toLocaleString()}`}</TableCell>}
                        {canViewPricing && <TableCell></TableCell>}
                        {canViewPricing && <TableCell className="font-semibold">{`Rs.${totals.received.toLocaleString()}`}</TableCell>}
                        {canViewPricing && <TableCell className="font-semibold">{`Rs.${totals.due.toLocaleString()}`}</TableCell>}
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recurring">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Invoice ID</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Next recurring</TableHead>
                        <TableHead>Repeat every</TableHead>
                        <TableHead>Cycles</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Total invoiced</TableHead>
                        <TableHead className="w-8"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">No record found.</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

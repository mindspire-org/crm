import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { HealthspirePrintTemplate } from "@/components/print/HealthspirePrintTemplate";
import { API_BASE } from "@/lib/api/base";
import { useSettings } from "@/hooks/useSettings";
import { getAuthHeaders } from "@/lib/api/auth";

// Dynamically load html2pdf when needed to avoid bundler install requirement
const loadHtml2Pdf = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    const w = window as any;
    if (w.html2pdf) return resolve(w.html2pdf);
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js";
    script.async = true;
    script.onload = () => resolve((window as any).html2pdf);
    script.onerror = () => reject(new Error("Failed to load html2pdf"));
    document.head.appendChild(script);
  });
};

const DEFAULT_PAYMENT_INFO = `A/c Title: Health Spire Pvt LTd
Bank No: 3130301000008524
IBAN: PK81FAYS3130301000008524
Faysal Bank Bahria Orchard
Branch Code 3139.

A/c Title: Health Spire Pvt LTd
Bank No: 02220113618930
IBAN: PK86MEZN0002220113618930
Meezan Bank College
Road Branch Lahore Code 0222`;

export default function InvoicePreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const location = useLocation();
  const [inv, setInv] = useState<any | null>(null);
  const [lastFetch, setLastFetch] = useState(0);
  const pdfTargetRef = useRef<HTMLDivElement | null>(null);
  const autoCloseRef = useRef(false);
  const [isSharing, setIsSharing] = useState(false);
  const [company] = useState({
    name: "HealthSpire",
    address: "761/D2 Shah Jelani Rd Township Lahore",
    city: "",
    email: "info@healthspire.org",
    phone: "+92 312 7231875",
    logo: "/HealthSpire%20logo.png",
    taxId: "",
    website: "www.healthspire.org"
  });
  const [payments, setPayments] = useState<any[]>([]);

  const viewMode = useMemo(() => {
    const sp = new URLSearchParams(location.search || "");
    const isPrint = sp.get("print") === "1";
    const mode = sp.get("mode") || "";
    const share = sp.get("share") === "1";
    const shareChannel = (sp.get("channel") || "").toLowerCase();
    const shareTo = sp.get("to") || "";
    const sharePhone = sp.get("phone") || "";
    return {
      isPrint,
      isPdf: mode === "pdf",
      share,
      shareChannel,
      shareTo,
      sharePhone,
    };
  }, [location.search]);

  const fetchInvoice = async () => {
    if (!id) return;
    try {
      const sp = new URLSearchParams(location.search || "");
      const t = sp.get("t") || "";

      const authHeaders = getAuthHeaders();
      const hasAuth = Boolean((authHeaders as any)?.Authorization);

      const bust = Date.now();
      const invUrl = hasAuth
        ? `${API_BASE}/api/invoices/${id}?_t=${bust}`
        : `${API_BASE}/api/invoices/public/${encodeURIComponent(id)}?t=${encodeURIComponent(t)}&_t=${bust}`;

      const r = await fetch(invUrl, hasAuth ? { headers: authHeaders } : undefined);
      if (!r.ok) return;
      const invRow = await r.json();
      setInv(invRow);
      setLastFetch(Date.now());

      const invId = String(invRow?._id || "");

      const payUrl = hasAuth
        ? `${API_BASE}/api/payments?invoiceId=${encodeURIComponent(invId)}&_t=${bust}`
        : `${API_BASE}/api/payments/public?invoiceId=${encodeURIComponent(invId)}&t=${encodeURIComponent(t)}&_t=${bust}`;

      const p = await fetch(payUrl, hasAuth ? { headers: authHeaders } : undefined);
      if (p.ok) setPayments(await p.json());
    } catch {}
  };

  useEffect(() => {
    fetchInvoice();
  }, [id, location.search]);

  useEffect(() => {
    if (viewMode.isPrint || viewMode.isPdf || viewMode.share) return;
    const t = window.setInterval(() => {
      fetchInvoice();
    }, 4000);
    return () => window.clearInterval(t);
  }, [viewMode.isPrint, viewMode.isPdf, viewMode.share, id, location.search]);

  const uploadPdf = async (blob: Blob, filename: string) => {
    const fd = new FormData();
    fd.append("file", new File([blob], filename, { type: "application/pdf" }));
    const authHeaders = getAuthHeaders();
    const hasAuth = Boolean((authHeaders as any)?.Authorization);
    const r = await fetch(`${API_BASE}/api/invoices/upload`, { method: "POST", headers: hasAuth ? authHeaders : undefined, body: fd });
    if (!r.ok) throw new Error("Upload failed");
    const json = await r.json().catch(() => null);
    const p = String(json?.path || "");
    if (!p) throw new Error("Upload failed");
    return `${API_BASE}${p}`;
  };

  const openShareTarget = (pdfUrl: string) => {
    const subject = `Invoice ${inv?.number || id || ""}`.trim() || "Invoice";
    const body = `Hello,\n\nPlease find the invoice here: ${pdfUrl}\n\nThanks`;
    if (viewMode.shareChannel === "whatsapp") {
      const text = `Invoice: ${pdfUrl}`;
      const webBase = viewMode.sharePhone ? `https://wa.me/${encodeURIComponent(viewMode.sharePhone)}` : "https://wa.me/";
      const webUrl = `${webBase}?text=${encodeURIComponent(text)}`;
      const deepLink = `whatsapp://send?text=${encodeURIComponent(text)}${viewMode.sharePhone ? `&phone=${encodeURIComponent(viewMode.sharePhone)}` : ""}`;
      const t = window.setTimeout(() => {
        window.location.href = webUrl;
      }, 700);
      window.location.href = deepLink;
      window.setTimeout(() => window.clearTimeout(t), 1500);
      return;
    }

    const to = viewMode.shareTo ? encodeURIComponent(viewMode.shareTo) : "";
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  useEffect(() => {
    const shouldAutoClose = viewMode.isPrint || viewMode.isPdf;
    autoCloseRef.current = shouldAutoClose;

    const onAfterPrint = () => {
      if (!autoCloseRef.current) return;
      try {
        window.close();
      } catch {}
    };
    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, [viewMode.isPrint, viewMode.isPdf]);

  useEffect(() => {
    if (!inv) return;
    if (viewMode.isPrint) {
      const t = window.setTimeout(() => {
        try {
          window.print();
        } catch {}
      }, 300);
      return () => window.clearTimeout(t);
    }
  }, [viewMode.isPrint, inv]);

  useEffect(() => {
    if (!inv) return;
    if (!viewMode.isPdf) return;
    const el = pdfTargetRef.current;
    if (!el) return;

    const t = window.setTimeout(async () => {
      try {
        try {
          await (document as any).fonts?.ready;
        } catch {}
        const html2pdf = await loadHtml2Pdf();
        const filename = `invoice-${inv?.number || id || ""}.pdf`;
        await html2pdf()
          .set({
            margin: 0,
            filename,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
            pagebreak: { mode: ["avoid-all", "css", "legacy"], avoid: ["tr", "table"] },
          } as any)
          .from(el)
          .save();

        // close the tab after download triggers
        try {
          window.close();
        } catch {}
      } catch {
        // if PDF generation fails, do nothing
      }
    }, 450);
    return () => window.clearTimeout(t);
  }, [viewMode.isPdf, inv, id]);

  useEffect(() => {
    if (!inv) return;
    if (!viewMode.share) return;
    if (isSharing) return;
    const el = pdfTargetRef.current;
    if (!el) return;

    setIsSharing(true);
    const t = window.setTimeout(async () => {
      try {
        const html2pdf = await loadHtml2Pdf();
        const filename = `invoice-${inv?.number || id || ""}.pdf`;
        const worker: any = html2pdf()
          .set({
            margin: 0,
            filename,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
            pagebreak: { mode: ["avoid-all", "css", "legacy"], avoid: ["tr", "table"] },
          } as any)
          .from(el)
          .toPdf();

        const pdfObj = await worker.get("pdf");
        const blob: Blob = await pdfObj.output("blob");
        const pdfUrl = await uploadPdf(blob, filename);
        openShareTarget(pdfUrl);
      } catch {
      } finally {
        try {
          window.close();
        } catch {}
      }
    }, 450);

    return () => window.clearTimeout(t);
  }, [inv, viewMode.share, viewMode.shareChannel, viewMode.shareTo, viewMode.sharePhone, id, isSharing]);

  const formatClient = (c: any) => {
    if (!c) return "-";
    if (typeof c === "string") return c;
    return c.name || c.company || c.person || "-";
  };

  const viewPaymentInfo = ((inv?.paymentInfo || "").trim() ? inv.paymentInfo : DEFAULT_PAYMENT_INFO);

  const itemsSub = useMemo(() => {
    const list: any[] = Array.isArray(inv?.items) ? inv!.items : [];
    if (!list.length) return Number(inv?.amount || 0);
    return list.reduce((sum, it) => sum + (Number(it.quantity ?? it.qty ?? 0) * Number(it.rate ?? 0)), 0);
  }, [inv]);
  const total = useMemo(() => {
    const amount = Number(inv?.amount);
    if (Number.isFinite(amount) && amount > 0) return amount;
    const subTotal = itemsSub;
    const tax1 = (Number(inv?.tax1 ?? 0) / 100) * subTotal;
    const tax2 = (Number(inv?.tax2 ?? 0) / 100) * subTotal;
    const tds = (Number(inv?.tds ?? 0) / 100) * subTotal;
    const advance = Number(inv?.advanceAmount || 0);
    const discount = Number(inv?.discount || 0);
    return Math.max(0, subTotal + tax1 + tax2 - tds - advance - discount);
  }, [itemsSub, inv?.amount, inv?.advanceAmount, inv?.discount, inv?.tax1, inv?.tax2, inv?.tds]);
  const paid = useMemo(() => (Array.isArray(payments) ? payments.reduce((s, p:any)=> s + (Number(p.amount)||0), 0) : 0), [payments]);
  const balanceDue = useMemo(() => Math.max(0, Number(total || 0) - Number(paid || 0)), [total, paid]);

  const viewBrand = {
    name: inv?.branding?.name || company.name,
    address: inv?.branding?.address || company.address,
    city: company.city,
    email: inv?.branding?.email || company.email,
    phone: inv?.branding?.phone || company.phone,
    logo: inv?.branding?.logo || company.logo,
    taxId: inv?.branding?.taxId || company.taxId,
    website: inv?.branding?.website || company.website,
  };

  const items = useMemo(() => {
    const list: any[] = Array.isArray(inv?.items) ? inv!.items : [];
    const maxRows = 8;
    const mapped = list
      .map((it) => {
        const name = String(it?.name || it?.title || it?.item || "").trim();
        const desc = String(it?.description || "").trim();
        const description = [name, desc].filter(Boolean).join("\n");
        const qty = it?.quantity ?? it?.qty ?? "";
        const price = it?.rate ?? "";
        const rowTotal = Number(qty || 0) * Number(price || 0);
        return {
          description: description || "-",
          qty: qty === "" ? "" : String(qty).padStart(2, "0"),
          price: price === "" ? "" : Number(price).toLocaleString(),
          total: Number.isFinite(rowTotal) ? rowTotal.toLocaleString() : "",
        };
      })
      .filter((x) => x.description);
    const sliced = mapped.slice(0, maxRows);
    const remaining = mapped.length - sliced.length;
    if (remaining > 0) {
      sliced.push({
        description: `Additional items: ${remaining} (see full invoice in system)` ,
        qty: "",
        price: "",
        total: "",
      });
    }
    return sliced;
  }, [inv]);

  const totalsRows = useMemo(() => {
    const rows: Array<{ label: string; value: string; bold?: boolean }> = [];
    const subTotal = itemsSub;
    const tax1Rate = Number(inv?.tax1 ?? 0);
    const tax2Rate = Number(inv?.tax2 ?? 0);
    const tax1 = (tax1Rate / 100) * subTotal;
    const tax2 = (tax2Rate / 100) * subTotal;
    const tax1Amount = Number.isFinite(tax1) ? tax1 : 0;
    const tax2Amount = Number.isFinite(tax2) ? tax2 : 0;

    const advance = Number(inv?.advanceAmount || 0);
    if (advance) rows.push({ label: "Advance Amount", value: advance.toLocaleString() });
    const discount = Number(inv?.discount || 0);
    if (discount) rows.push({ label: "Discount", value: `-${discount.toLocaleString()} pkr` });
    if (tax1Rate > 0 || tax1Amount > 0) rows.push({ label: `Tax${tax1Rate ? ` (${tax1Rate}%)` : ""}`, value: `${tax1Amount.toLocaleString()} pkr` });
    if (tax2Rate > 0 || tax2Amount > 0) rows.push({ label: `Tax 2${tax2Rate ? ` (${tax2Rate}%)` : ""}`, value: `${tax2Amount.toLocaleString()} pkr` });
    rows.push({ label: "Invoice Total", value: `${Number(total || 0).toLocaleString()} pkr` });
    rows.push({ label: "Already Paid", value: `${Number(paid || 0).toLocaleString()} pkr` });
    rows.push({ label: "Balance Due", value: `${Number(balanceDue || 0).toLocaleString()} pkr`, bold: true });

    const twilio = (inv as any)?.monthlyTwilioCharges ?? (inv as any)?.twilioCharges ?? (inv as any)?.monthlyCharges;
    if (twilio !== undefined && twilio !== null && String(twilio).trim() !== "") {
      rows.push({ label: "MONTHLY TWILIO\nCHARGES", value: `${Number(twilio).toLocaleString()} pkr` });
    }

    return rows;
  }, [inv, itemsSub, paid, total, balanceDue]);

  return (
    <div className={`invoice-preview p-4 bg-gray-100 min-h-screen ${viewMode.isPdf ? "pdf-mode" : ""}`}>
      <style>{`
        .pdf-mode { padding: 0 !important; background: white !important; min-height: auto !important; }
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .invoice-preview { padding: 0 !important; background: white !important; min-height: auto !important; }
        }
      `}</style>

      <div className={`flex items-center justify-end mb-3 print:hidden ${viewMode.isPdf || viewMode.isPrint ? "hidden" : ""}`}>
        <Button variant="outline" onClick={fetchInvoice} className="mr-2">Refresh</Button>
        <Button variant="outline" onClick={() => navigate(-1)}>Close</Button>
      </div>

      <HealthspirePrintTemplate
        ref={pdfTargetRef}
        title="INVOICE"
        brand={{
          name: viewBrand.name,
          email: viewBrand.email,
          phone: viewBrand.phone,
          website: viewBrand.website,
          address: viewBrand.address,
          logoSrc: viewBrand.logo,
        }}
        invoiceToLabel="INVOICE TO:"
        invoiceToValue={formatClient(inv?.client)}
        numberLabel="Invoice #"
        numberValue={String(inv?.number || id || "-")}
        dateLabel="Date"
        dateValue={inv?.issueDate ? new Date(inv.issueDate).toLocaleDateString() : "-"}
        items={items}
        paymentInformation={viewPaymentInfo}
        totals={totalsRows}
        termsText={(settings as any)?.documents?.invoiceTerms}
      />
    </div>
  );
}

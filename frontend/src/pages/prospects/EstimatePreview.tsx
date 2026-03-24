import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { HealthspirePrintTemplate } from "@/components/print/HealthspirePrintTemplate";
import { API_BASE } from "@/lib/api/base";
import { useSettings } from "@/hooks/useSettings";
import { Download, Printer } from "lucide-react";

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

export default function EstimatePreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const location = useLocation();
  const [est, setEst] = useState<any | null>(null);
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
    website: "www.healthspire.org",
  });

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/estimates/${id}`);
        if (!r.ok) return;
        const d = await r.json();
        setEst(d);
      } catch {}
    })();
  }, [id]);

  const viewMode = useMemo(() => {
    const sp = new URLSearchParams(location.search || "");
    const isPrint = sp.get("print") === "1";
    const mode = sp.get("mode") || "";
    const share = sp.get("share") === "1";
    const shareChannel = (sp.get("channel") || "").toLowerCase();
    const shareTo = sp.get("to") || "";
    const sharePhone = sp.get("phone") || "";
    return { isPrint, isPdf: mode === "pdf", share, shareChannel, shareTo, sharePhone };
  }, [location.search]);

  const uploadPdf = async (blob: Blob, filename: string) => {
    const fd = new FormData();
    fd.append("file", new File([blob], filename, { type: "application/pdf" }));
    const r = await fetch(`${API_BASE}/api/estimates/upload`, { method: "POST", body: fd });
    if (!r.ok) throw new Error("Upload failed");
    const json = await r.json().catch(() => null);
    const p = String(json?.path || "");
    if (!p) throw new Error("Upload failed");
    return `${API_BASE}${p}`;
  };

  const openShareTarget = (pdfUrl: string) => {
    const subject = `Estimate ${est?.number || id || ""}`.trim() || "Estimate";
    const body = `Hello,\n\nPlease find the estimate here: ${pdfUrl}\n\nThanks`;
    if (viewMode.shareChannel === "whatsapp") {
      const text = `Estimate: ${pdfUrl}`;
      const webBase = viewMode.sharePhone ? `https://wa.me/${encodeURIComponent(viewMode.sharePhone)}` : "https://wa.me/";
      const webUrl = `${webBase}?text=${encodeURIComponent(text)}`;
      const deepLink = `whatsapp://send?text=${encodeURIComponent(text)}${viewMode.sharePhone ? `&phone=${encodeURIComponent(viewMode.sharePhone)}` : ""}`;
      const t = window.setTimeout(() => { window.location.href = webUrl; }, 700);
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
      try { window.close(); } catch {}
    };
    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, [viewMode.isPrint, viewMode.isPdf]);

  useEffect(() => {
    if (!est) return;
    if (viewMode.isPrint) {
      const t = window.setTimeout(() => { try { window.print(); } catch {} }, 350);
      return () => window.clearTimeout(t);
    }
  }, [viewMode.isPrint, est]);

  useEffect(() => {
    if (!est) return;
    if (!viewMode.isPdf) return;
    const el = pdfTargetRef.current; if (!el) return;
    const t = window.setTimeout(async () => {
      try {
        try {
          await (document as any).fonts?.ready;
        } catch {}
        const html2pdf = await loadHtml2Pdf();
        const filename = `estimate-${est?.number || id || ""}.pdf`;
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
        try { window.close(); } catch {}
      } catch {}
    }, 450);
    return () => window.clearTimeout(t);
  }, [viewMode.isPdf, est, id]);

  const downloadPdf = async () => {
    if (!est) return;
    const el = pdfTargetRef.current;
    if (!el) return;
    try {
      try {
        await (document as any).fonts?.ready;
      } catch {}
      const html2pdf = await loadHtml2Pdf();
      const filename = `estimate-${est?.number || id || ""}.pdf`;
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
    } catch {}
  };

  useEffect(() => {
    if (!est) return;
    if (!viewMode.share) return;
    if (isSharing) return;
    const el = pdfTargetRef.current; if (!el) return;
    setIsSharing(true);
    const t = window.setTimeout(async () => {
      try {
        const html2pdf = await loadHtml2Pdf();
        const filename = `estimate-${est?.number || id || ""}.pdf`;
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
        try { window.close(); } catch {}
      }
    }, 450);
    return () => window.clearTimeout(t);
  }, [est, viewMode.share, viewMode.shareChannel, viewMode.shareTo, viewMode.sharePhone, id, isSharing]);

  const formatClient = (c: any) => {
    if (!c) return "-";
    if (typeof c === "string") return c;
    return c.name || c.company || c.person || "-";
  };

  const viewPaymentInfo = ((est?.paymentInfo || "").trim() ? est.paymentInfo : DEFAULT_PAYMENT_INFO);

  const itemsSub = useMemo(() => {
    const list: any[] = Array.isArray(est?.items) ? est!.items : [];
    if (!list.length) return Number(est?.amount || 0);
    return list.reduce((sum, it) => sum + (Number(it.quantity ?? it.qty ?? 0) * Number(it.rate ?? 0)), 0);
  }, [est]);
  const total = useMemo(() => {
    const subTotal = itemsSub;
    const tax1 = (Number(est?.tax1 ?? est?.tax ?? 0) / 100) * subTotal;
    const tax2 = (Number(est?.tax2 ?? 0) / 100) * subTotal;
    const tds = (Number(est?.tds ?? 0) / 100) * subTotal;
    const advance = Number(est?.advancedAmount || est?.advanceAmount || 0);
    return subTotal + tax1 + tax2 - tds - advance;
  }, [est?.advanceAmount, est?.advancedAmount, est?.tax, est?.tax1, est?.tax2, est?.tds, itemsSub]);

  const viewBrand = {
    name: est?.branding?.name || company.name,
    address: est?.branding?.address || company.address,
    city: company.city,
    email: est?.branding?.email || company.email,
    phone: est?.branding?.phone || company.phone,
    logo: est?.branding?.logo || company.logo,
    taxId: est?.branding?.taxId || company.taxId,
    website: est?.branding?.website || company.website,
  };

  const items = useMemo(() => {
    const list: any[] = Array.isArray(est?.items) ? est!.items : [];
    const maxRows = 8;
    const mapped = list
      .map((it) => {
        const name = String(it?.name || it?.item || it?.title || "").trim();
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
        description: `Additional items: ${remaining} (see full estimate in system)` ,
        qty: "",
        price: "",
        total: "",
      });
    }
    return sliced;
  }, [est]);

  const totalsRows = useMemo(() => {
    const rows: Array<{ label: string; value: string; bold?: boolean }> = [];
    const alreadyPaid = Number((est as any)?.paidAmount ?? (est as any)?.alreadyPaid ?? 0);
    if (alreadyPaid) rows.push({ label: "Already Paid", value: alreadyPaid.toLocaleString() });
    const advance = Number(est?.advancedAmount || est?.advanceAmount || 0);
    if (advance) rows.push({ label: "Advance Amount", value: advance.toLocaleString() });
    rows.push({ label: "TOTAL AMOUNT", value: `${total.toLocaleString()} pkr`, bold: true });

    const twilio = (est as any)?.monthlyTwilioCharges ?? (est as any)?.twilioCharges ?? (est as any)?.monthlyCharges;
    if (twilio !== undefined && twilio !== null && String(twilio).trim() !== "") {
      rows.push({ label: "MONTHLY TWILIO\nCHARGES", value: `${Number(twilio).toLocaleString()} pkr` });
    }

    return rows;
  }, [est, total]);

  return (
    <div className={`estimate-preview p-4 bg-gray-100 min-h-screen ${viewMode.isPdf ? "pdf-mode" : ""}`}>
      <style>{`
        .pdf-mode { padding: 0 !important; background: white !important; min-height: auto !important; }
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .estimate-preview { padding: 0 !important; background: white !important; min-height: auto !important; }
        }
      `}</style>
      <div className={`flex items-center justify-end gap-2 mb-3 print:hidden ${viewMode.isPdf ? "hidden" : ""}`}>
        <Button variant="outline" onClick={downloadPdf}>
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
        <Button variant="outline" onClick={() => { try { window.print(); } catch {} }}>
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
        <Button variant="outline" onClick={() => navigate(-1)}>Close</Button>
      </div>

      <HealthspirePrintTemplate
        ref={pdfTargetRef}
        title="ESTIMATE"
        brand={{
          name: viewBrand.name,
          email: viewBrand.email,
          phone: viewBrand.phone,
          website: viewBrand.website,
          address: viewBrand.address,
          logoSrc: viewBrand.logo,
        }}
        invoiceToLabel="ESTIMATE TO:"
        invoiceToValue={formatClient(est?.client)}
        numberLabel="Estimate #"
        numberValue={String(est?.number || id || "-")}
        dateLabel="Date"
        dateValue={est?.estimateDate ? new Date(est.estimateDate).toLocaleDateString() : "-"}
        items={items}
        paymentInformation={viewPaymentInfo}
        totals={totalsRows}
        termsText={(settings as any)?.documents?.estimateTerms}
      />
    </div>
  );
}

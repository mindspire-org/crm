import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";
import { HaroomPrintTemplate } from "@/components/print/HaroomPrintTemplate";

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

export default function ContractPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [doc, setDoc] = useState<any | null>(null);
  const pdfTargetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/contracts/${id}`, { headers: getAuthHeaders() });
        if (!r.ok) return;
        const d = await r.json();
        setDoc(d);
      } catch {}
    })();
  }, [id]);

  const viewMode = useMemo(() => {
    const sp = new URLSearchParams(location.search || "");
    return { isPrint: sp.get("print") === "1", isPdf: sp.get("mode") === "pdf" };
  }, [location.search]);

  useEffect(() => {
    if (!doc) return;
    if (viewMode.isPrint) {
      const t = window.setTimeout(() => {
        try { window.print(); } catch {}
      }, 350);
      return () => window.clearTimeout(t);
    }
  }, [viewMode.isPrint, doc]);

  useEffect(() => {
    if (!doc || !viewMode.isPdf) return;
    const el = pdfTargetRef.current; if (!el) return;
    const t = window.setTimeout(async () => {
      try {
        const html2pdf = await loadHtml2Pdf();
        const filename = `contract-${doc?.number || doc?._id || id}.pdf`;
        await html2pdf().set({
          margin: 0,
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["avoid-all", "css", "legacy"], avoid: ["tr", "table"] },
        } as any).from(el).save();
        try { window.close(); } catch {}
      } catch {}
    }, 450);
    return () => window.clearTimeout(t);
  }, [viewMode.isPdf, doc, id]);

  const items: any[] = useMemo(() => {
    const list: any[] = Array.isArray(doc?.items) ? doc!.items : [];
    if (list.length) return list;
    const amt = Number(doc?.amount || 0);
    if (Number.isFinite(amt) && amt > 0) {
      return [
        {
          name: String(doc?.title || "Contract").trim() || "Contract",
          description: "",
          quantity: 1,
          rate: amt,
        },
      ];
    }
    return [];
  }, [doc?.amount, doc?.items, doc?.title]);

  const subTotal = useMemo(() => items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.rate || 0), 0), [items]);
  const tax1 = (Number(doc?.tax1 || 0) / 100) * subTotal;
  const tax2 = (Number(doc?.tax2 || 0) / 100) * subTotal;
  const total = subTotal + tax1 + tax2;

  const viewBrand = {
    name: "HealthSpire",
    email: "info@healthspire.org",
    phone: "+92 312 7231875",
    address: "761/D2 Shah Jelani Rd Township Lahore",
    website: "www.healthspire.org",
    logoSrc: "/HealthSpire%20logo.png",
  };

  const totals = useMemo(() => {
    const rows: { label: string; value: string; bold?: boolean }[] = [{ label: "Sub Total", value: `Rs.${subTotal.toLocaleString()}` }];
    if (tax1 > 0) rows.push({ label: `Tax (${doc?.tax1}%)`, value: `Rs.${tax1.toLocaleString()}` });
    if (tax2 > 0) rows.push({ label: `Tax (${doc?.tax2}%)`, value: `Rs.${tax2.toLocaleString()}` });
    if (Number(doc?.discount || 0) > 0) rows.push({ label: "Discount", value: `-Rs.${Number(doc.discount).toLocaleString()}` });
    rows.push({ label: "Total Amount", value: `Rs.${total.toLocaleString()}`, bold: true });
    return rows;
  }, [subTotal, tax1, tax2, doc?.tax1, doc?.tax2, doc?.discount, total]);

  const sections = useMemo(() => {
    if (!doc?.note) return [{ heading: "CONTRACT TERMS & SCOPE", content: "Detailed scope of work and technical specifications." }];
    return [{ heading: "CONTRACT TERMS & SCOPE", content: doc.note }];
  }, [doc?.note]);

  if (!doc) return <div className="p-8 text-center">Loading contract...</div>;

  return (
    <div className={`haroom-preview-container p-4 bg-slate-100 min-h-screen ${viewMode.isPdf ? "pdf-mode" : ""}`}>
      <style>{`
        @media screen {
          .haroom-preview-container {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .preview-actions {
            width: 210mm;
            display: flex;
            justify-content: flex-end;
            margin-bottom: 1rem;
          }
        }
        .pdf-mode {
          padding: 0 !important;
          background: white !important;
        }
      `}</style>

      <div className="preview-actions print:hidden">
        <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
      </div>

      <div className="shadow-2xl bg-white rounded-sm overflow-hidden">
        <HaroomPrintTemplate
          ref={pdfTargetRef}
          title={doc.title?.toUpperCase() || "CONTRACT AGREEMENT"}
          brand={viewBrand}
          clientName={doc.client || "-"}
          clientAddress={doc.clientAddress || doc.address || ""}
          docNumber={doc.number || doc._id?.slice(-8).toUpperCase() || "-"}
          date={doc.contractDate ? new Date(doc.contractDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
          items={items.map(it => ({
            description: `${it.name}${it.description ? `\n${it.description}` : ""}`,
            qty: it.quantity,
            price: it.rate,
            total: Number(it.quantity || 0) * Number(it.rate || 0)
          }))}
          totals={totals}
          timeframe={doc.timeframe}
          timeframeStartDate={doc.timeframeStartDate}
          timeframeDays={doc.timeframeDays}
          sections={sections}
          paymentInformation={doc.paymentTerms || "50% Upfront Advance Payment required to initiate the project. Remaining 50% upon successful deployment and handover."}
          termsText={doc.termsConditions || "1. Validity: This contract is valid for 15 days from the date of issuance.\n2. Support: Post-deployment support is included for 30 days.\n3. Confidentiality: Both parties agree to maintain strict confidentiality of shared business data."}
          signatureData={{
            companyName: "Health Spire (Pvt) Ltd",
            companySignatory: "Mr. Qutaibah Talat",
            companyDesignation: "CEO",
            clientName: doc.client || "Authorized Client Representative"
          }}
        />
      </div>
    </div>
  );
}

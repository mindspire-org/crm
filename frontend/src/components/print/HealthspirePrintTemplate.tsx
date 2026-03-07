import React, { forwardRef, useEffect, useMemo } from "react";

type Brand = {
  name: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  logoSrc: string;
};

type LineItem = {
  description: string;
  qty?: string | number;
  price?: string | number;
  total?: string | number;
};

type TotalsRow = {
  label: string;
  value: string;
  bold?: boolean;
};

type Props = {
  title: string;
  brand: Brand;
  invoiceToLabel: string;
  invoiceToValue: string;
  numberLabel: string;
  numberValue: string;
  dateLabel: string;
  dateValue: string;
  items: LineItem[];
  paymentInformationTitle?: string;
  paymentInformation: string;
  totals: TotalsRow[];
  termsText?: string;
};

const fmt = (v: unknown) => {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return v.toLocaleString();
  return String(v);
};

export const HealthspirePrintTemplate = forwardRef<HTMLDivElement, Props>(function HealthspirePrintTemplate(
  {
    title,
    brand,
    invoiceToLabel,
    invoiceToValue,
    numberLabel,
    numberValue,
    dateLabel,
    dateValue,
    items,
    paymentInformationTitle = "PAYMENT INFORMATION:",
    paymentInformation,
    totals,
    termsText,
  },
  ref,
) {
  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  const viewTerms = useMemo(() => {
    const t = String(termsText || "").trim();
    if (t) return t;
    return (
      "1. Please reference the document number with your payment.\n\n" +
      "2. Delivery and scope are as agreed in the quotation / invoice.\n\n" +
      "3. This is a computer-generated document."
    );
  }, [termsText]);

  useEffect(() => {
    const id = "hs-poppins-font";
    if (typeof document === "undefined") return;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap";
    document.head.appendChild(link);
  }, []);

  return (
    <div ref={ref} className="hs-print-root">
      <style>{`
        .hs-print-root {
          --hs-primary: #7c3aed;
          --hs-primary-dark: #5b21b6;
          --hs-surface: #ffffff;
          --hs-surface-2: #f8fafc;
          --hs-border: rgba(15, 23, 42, 0.12);
          --hs-text: #0f172a;
          --hs-muted: #475569;

          position: relative;
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: #ffffff;
          color: #111827;
          font-family: 'Poppins', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          overflow: hidden;
          border-radius: 14px;
          box-shadow: 0 18px 50px rgba(2, 6, 23, 0.12);
          border: 1px solid rgba(15, 23, 42, 0.10);
        }

        .hs-print-root,
        .hs-print-root * {
          max-width: 100%;
        }

        .hs-print-root:before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(900px 380px at 10% -10%, rgba(124, 58, 237, 0.12), rgba(124, 58, 237, 0) 60%),
            radial-gradient(900px 380px at 90% 0%, rgba(124, 58, 237, 0.10), rgba(124, 58, 237, 0) 55%),
            linear-gradient(135deg, rgba(124, 58, 237, 0.06) 0%, rgba(255, 255, 255, 0) 40%);
          pointer-events: none;
          z-index: 0;
        }

        .hs-print-root * {
          box-sizing: border-box;
        }

        .hs-content {
          position: relative;
          z-index: 1;
          padding: 18mm 18mm 18mm;
          display: flex;
          flex-direction: column;
          min-height: 297mm;
        }

        .hs-accent {
          height: 4mm;
          background: linear-gradient(90deg, var(--hs-primary) 0%, #4f46e5 40%, #1d4ed8 100%);
          border-radius: 999px;
          opacity: 0.95;
        }

        @media print {
          .hs-content {
            padding: 18mm 18mm 18mm;
          }
          .hs-title { font-size: 28px; }
          .hs-contact { font-size: 11px; }
          .hs-table { font-size: 11px; }
          .hs-payment { font-size: 10.5px; }
          .hs-terms { font-size: 10px; }
        }

        .hs-header {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 10mm;
          align-items: start;
          padding: 12px 12px;
          border-radius: 16px;
          border: 1px solid rgba(15, 23, 42, 0.10);
          background: rgba(255, 255, 255, 0.78);
          backdrop-filter: blur(10px);
        }

        .hs-header > * {
          min-width: 0;
        }

        .hs-brand {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .hs-brand img {
          width: 64px;
          height: 64px;
          object-fit: contain;
          border-radius: 10px;
          background: transparent;
          border: 0;
          padding: 0;
          filter: drop-shadow(0 10px 18px rgba(2, 6, 23, 0.14));
        }

        .hs-brand-name {
          font-weight: 800;
          font-size: 18px;
          color: var(--hs-text);
          line-height: 1.2;
        }

        .hs-brand-address {
          margin-top: 4px;
          font-size: 11px;
          color: var(--hs-muted);
          line-height: 1.35;
          white-space: pre-line;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .hs-contact {
          margin-top: 5mm;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4mm 10mm;
          font-size: 12px;
          color: #0f172a;
        }

        .hs-contact-item {
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: normal;
          overflow-wrap: anywhere;
        }

        .hs-icon {
          width: 22px;
          height: 22px;
          padding: 2px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--hs-primary);
          background: rgba(124, 58, 237, 0.10);
          border: 1px solid rgba(124, 58, 237, 0.18);
          border-radius: 999px;
          flex: 0 0 auto;
        }

        .hs-divider {
          margin-top: 7mm;
          border-top: 0;
        }

        .hs-body {
          margin-top: 7mm;
          border-radius: 16px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          background: rgba(255, 255, 255, 0.86);
          box-shadow: 0 12px 26px rgba(2, 6, 23, 0.05);
          overflow: hidden;
        }

        .hs-body-inner {
          padding: 12px 14px;
        }

        .hs-title {
          margin-top: 7mm;
          font-size: 30px;
          line-height: 1.05;
          letter-spacing: 0.6px;
          font-weight: 900;
          color: var(--hs-text);
        }

        .hs-doc-meta {
          text-align: right;
          line-height: 1.55;
          background: rgba(248, 250, 252, 0.86);
          border: 1px solid rgba(15, 23, 42, 0.12);
          border-radius: 14px;
          padding: 14px 14px;
          backdrop-filter: blur(6px);
          border-top: 4px solid rgba(124, 58, 237, 0.55);
          overflow: hidden;
        }

        .hs-doc-meta-label {
          font-size: 11px;
          color: #64748b;
          letter-spacing: 0.4px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .hs-doc-meta-value {
          margin-top: 2px;
          font-size: 12px;
          color: var(--hs-text);
          font-weight: 700;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .hs-doc-meta .hs-doc-meta-value:first-of-type {
          display: inline-block;
          padding: 6px 10px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(124, 58, 237, 0.16) 0%, rgba(79, 70, 229, 0.14) 45%, rgba(29, 78, 216, 0.12) 100%);
          border: 1px solid rgba(124, 58, 237, 0.20);
          letter-spacing: 0.5px;
          font-weight: 800;
        }

        .hs-meta {
          margin-top: 0;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10mm;
          font-size: 12px;
          color: #111827;
          padding: 0;
          border: 0;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
        }

        .hs-meta > * {
          min-width: 0;
        }

        .hs-meta-label {
          font-weight: 700;
          letter-spacing: 0.6px;
          color: var(--hs-primary);
        }

        .hs-meta-value {
          margin-top: 4px;
          font-size: 13px;
          color: #111827;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .hs-meta-right {
          text-align: right;
          line-height: 1.8;
        }

        .hs-table-wrap {
          margin-top: 8mm;
          border-radius: 0;
          overflow: hidden;
          border: 1px solid rgba(15, 23, 42, 0.12);
          background: #ffffff;
          box-shadow: none;
        }

        .hs-table {
          width: 100%;
          border-collapse: collapse;
          border: 0;
          font-size: 12px;
          table-layout: fixed;
        }

        .hs-table th,
        .hs-table td {
          border-bottom: 1px solid rgba(15, 23, 42, 0.10);
          padding: 9px 10px;
          vertical-align: top;
        }

        .hs-table tbody td {
          border-left: 1px solid rgba(15, 23, 42, 0.08);
          border-right: 1px solid rgba(15, 23, 42, 0.08);
        }

        .hs-table tbody td:first-child {
          white-space: pre-line;
          line-height: 1.35;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .hs-table th {
          font-size: 12px;
          font-weight: 800;
          color: var(--hs-text);
          text-align: left;
          background: linear-gradient(90deg, rgba(124, 58, 237, 0.10) 0%, rgba(79, 70, 229, 0.08) 45%, rgba(29, 78, 216, 0.06) 100%),
            linear-gradient(180deg, rgba(248, 250, 252, 1) 0%, rgba(241, 245, 249, 1) 100%);
          border-top: 0;
          border-bottom: 1px solid rgba(15, 23, 42, 0.14);
        }

        .hs-table thead th:nth-child(2),
        .hs-table tbody td:nth-child(2) {
          text-align: center;
          width: 14%;
        }

        .hs-table thead th:nth-child(3),
        .hs-table tbody td:nth-child(3),
        .hs-table thead th:nth-child(4),
        .hs-table tbody td:nth-child(4) {
          text-align: right;
          width: 14%;
        }

        .hs-table tbody tr:nth-child(even) td {
          background: rgba(248, 250, 252, 0.85);
        }

        .hs-bottom-grid {
          margin-top: 8mm;
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 12mm;
          align-items: start;
        }

        .hs-bottom-grid > * {
          min-width: 0;
        }

        .hs-payment-title {
          font-weight: 800;
          color: var(--hs-text);
          letter-spacing: 0.4px;
          margin-bottom: 6px;
        }

        .hs-payment {
          font-size: 11px;
          color: var(--hs-text);
          line-height: 1.5;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          word-break: break-word;
          max-height: 46mm;
          overflow: hidden;
          background: transparent;
          border: 1px solid rgba(15, 23, 42, 0.12);
          border-radius: 12px;
          padding: 10px 10px;
        }

        .hs-totals {
          font-size: 12px;
          line-height: 2.0;
          border: 1px solid rgba(15, 23, 42, 0.12);
          border-radius: 12px;
          padding: 12px 12px;
          background: transparent;
          backdrop-filter: none;
        }

        .hs-extras {
          margin-top: 7mm;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10mm;
          align-items: end;
        }

        .hs-terms-title {
          font-weight: 800;
          color: var(--hs-text);
          letter-spacing: 0.4px;
          font-size: 12px;
          margin-bottom: 4px;
        }

        .hs-terms {
          font-size: 10.5px;
          color: var(--hs-text);
          line-height: 1.5;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          word-break: break-word;
          max-height: 22mm;
          overflow: hidden;
          background: transparent;
          border: 1px solid rgba(15, 23, 42, 0.12);
          border-radius: 12px;
          padding: 10px 10px;
        }

        .hs-signature {
          text-align: right;
        }

        .hs-signature-line {
          display: inline-block;
          width: 70mm;
          border-top: 1px solid #111827;
          padding-top: 4px;
          font-size: 11px;
          color: #111827;
        }

        .hs-footer-note {
          margin-top: auto;
          padding-top: 6mm;
          font-size: 10px;
          color: #374151;
          display: flex;
          justify-content: space-between;
          gap: 10mm;
          border-top: 1px solid rgba(15, 23, 42, 0.12);
        }

        .hs-footer-note div:last-child {
          color: var(--hs-primary);
          font-weight: 600;
        }

        .hs-totals-row {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          padding: 2px 4px;
          border-radius: 10px;
        }

        .hs-totals-row .label {
          color: #111827;
          letter-spacing: 0.4px;
          flex: 1 1 auto;
          min-width: 0;
          white-space: pre-line;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .hs-totals-row .value {
          color: #111827;
          text-align: right;
          min-width: 90px;
          flex: 0 0 auto;
        }

        .hs-totals-row.bold .label,
        .hs-totals-row.bold .value {
          font-weight: 800;
        }

        .hs-totals-row.bold {
          background: rgba(124, 58, 237, 0.10);
          border: 1px solid rgba(124, 58, 237, 0.18);
          padding: 4px 8px;
        }

        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body {
            width: 210mm;
            height: 297mm;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .hs-print-root {
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            border: 0 !important;
          }
          .hs-print-root:before { display: none !important; }
          .hs-header { backdrop-filter: none !important; }
          .hs-body { box-shadow: none !important; background: #ffffff !important; }
          .hs-meta { box-shadow: none !important; }
          .hs-doc-meta,
          .hs-totals {
            backdrop-filter: none !important;
            background: #ffffff !important;
          }
          .hs-table-wrap { box-shadow: none !important; }
        }

        /* html2pdf uses screen CSS. When the preview page is in .pdf-mode, enforce A4 sizing
           without forcing an extra page break. */
        .pdf-mode .hs-print-root {
          width: 210mm !important;
          min-height: 297mm !important;
          height: 297mm !important;
          margin: 0 !important;
          overflow: hidden !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          border: 0 !important;
        }

        .pdf-mode .hs-doc-meta,
        .pdf-mode .hs-totals {
          backdrop-filter: none !important;
          background: #ffffff !important;
        }

        .pdf-mode .hs-header {
          backdrop-filter: none !important;
        }

        .pdf-mode .hs-table-wrap { box-shadow: none !important; }

        .pdf-mode .hs-content {
          padding: 16mm 16mm 14mm;
          min-height: 297mm;
        }

        .pdf-mode .hs-title {
          font-size: 28px;
        }

        .pdf-mode .hs-contact { font-size: 11px; }
        .pdf-mode .hs-table { font-size: 11px; }
        .pdf-mode .hs-payment { font-size: 10.5px; }
        .pdf-mode .hs-terms { font-size: 10px; }
      `}</style>

      <div className="hs-content">
        <div className="hs-header" style={{ marginTop: "6mm" }}>
          <div>
            <div className="hs-brand">
              {brand.logoSrc ? <img src={brand.logoSrc} alt={brand.name} /> : null}
              <div>
                <div className="hs-brand-name">{brand.name}</div>
                <div className="hs-brand-address">{brand.address}</div>
              </div>
            </div>

            <div className="hs-contact">
              <div className="hs-contact-item">
                <span className="hs-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07A19.5 19.5 0 0 1 3.15 10.8 19.86 19.86 0 0 1 .08 2.18 2 2 0 0 1 2.06 0h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L6.09 7.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </span>
                <span>{brand.phone}</span>
              </div>
              <div className="hs-contact-item">
                <span className="hs-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16v16H4z" opacity="0" />
                    <path d="M4 4h16v16H4z" fill="none" />
                    <path d="m4 4 8 8 8-8" />
                    <path d="M4 20h16" />
                  </svg>
                </span>
                <span>{brand.email}</span>
              </div>
              <div className="hs-contact-item">
                <span className="hs-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </span>
                <span>{brand.website}</span>
              </div>
              <div className="hs-contact-item">
                <span className="hs-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </span>
                <span>{brand.address}</span>
              </div>
            </div>
          </div>

          <div className="hs-doc-meta">
            <div className="hs-doc-meta-label">Document</div>
            <div className="hs-doc-meta-value">{title}</div>

            <div style={{ marginTop: "6mm" }}>
              <div className="hs-doc-meta-label">{numberLabel}</div>
              <div className="hs-doc-meta-value">{numberValue}</div>
            </div>

            <div style={{ marginTop: "3mm" }}>
              <div className="hs-doc-meta-label">{dateLabel}</div>
              <div className="hs-doc-meta-value">{dateValue}</div>
            </div>
          </div>
        </div>

        <div className="hs-divider" />

        <div className="hs-body">
          <div className="hs-body-inner">
            <div className="hs-meta">
              <div>
                <div className="hs-meta-label">{invoiceToLabel}</div>
                <div className="hs-meta-value">{invoiceToValue}</div>
              </div>
              <div className="hs-meta-right" />
            </div>

            <div className="hs-table-wrap">
              <table className="hs-table">
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {safeItems.length ? (
                    safeItems.map((it, idx) => (
                      <tr key={idx}>
                        <td dangerouslySetInnerHTML={{ __html: it.description }} className="prose prose-sm max-w-none dark:prose-invert" />
                        <td>{fmt(it.qty)}</td>
                        <td>{fmt(it.price)}</td>
                        <td>{fmt(it.total)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td style={{ height: "65mm" }} />
                      <td />
                      <td />
                      <td />
                    </tr>
                  )}
                  {safeItems.length < 5 &&
                    Array.from({ length: Math.max(0, 5 - safeItems.length) }).map((_, idx) => (
                      <tr key={`f-${idx}`}>
                        <td style={{ height: "12mm" }} />
                        <td />
                        <td />
                        <td />
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="hs-bottom-grid">
              <div>
                <div className="hs-payment-title">{paymentInformationTitle}</div>
                <div className="hs-payment">{paymentInformation}</div>
              </div>
              <div className="hs-totals">
                {totals.map((row, idx) => (
                  <div key={idx} className={`hs-totals-row ${row.bold ? "bold" : ""}`.trim()}>
                    <span className="label">{row.label}</span>
                    <span className="value">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="hs-extras">
              <div>
                <div className="hs-terms-title">TERMS & NOTES:</div>
                <div className="hs-terms">
                  {viewTerms}
                </div>
              </div>
              <div className="hs-signature">
                <div className="hs-signature-line">Authorized Signature</div>
              </div>
            </div>

            <div className="hs-footer-note">
              <div>Thank you for your business.</div>
              <div>{brand.website} | {brand.email}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

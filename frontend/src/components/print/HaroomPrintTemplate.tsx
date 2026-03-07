import React, { forwardRef, useEffect } from "react";
import { cn } from "@/lib/utils";

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
  clientName: string;
  clientAddress?: string;
  docNumber: string;
  date: string;
  items: LineItem[];
  paymentInformation?: string;
  totals: TotalsRow[];
  termsText?: string;
  sections?: { heading: string; content: string }[];
  signatureData?: {
    companyName: string;
    companySignatory: string;
    companyDesignation: string;
    clientName: string;
    clientSignatory?: string;
    clientDesignation?: string;
  };
};

export const HaroomPrintTemplate = forwardRef<HTMLDivElement, Props>(function HaroomPrintTemplate(
  {
    title,
    brand,
    clientName,
    clientAddress,
    docNumber,
    date,
    items,
    paymentInformation,
    totals,
    termsText,
    sections,
    signatureData,
  },
  ref
) {
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
    <div ref={ref} className="haroom-print-root">
      <style>{`
        .haroom-print-root {
          font-family: 'Poppins', sans-serif;
          color: #1a1a1a;
          line-height: 1.5;
          width: 210mm;
          margin: 0 auto;
          background: white;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .page {
          position: relative;
          width: 210mm;
          min-height: 297mm;
          padding: 20mm 15mm;
          box-sizing: border-box;
          overflow: hidden;
          background: white;
          display: flex;
          flex-direction: column;
        }

        .cover-page {
          height: 297mm;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          position: relative;
          background: #f8fafc;
          overflow: hidden;
          page-break-after: always;
        }
        .cover-page .logo-large {
          width: 120mm;
          margin-bottom: 20mm;
          z-index: 5;
        }
        .cover-page .title-main {
          font-size: 72px;
          font-weight: 900;
          color: #1e3a8a;
          text-transform: uppercase;
          letter-spacing: 4px;
          text-align: center;
          z-index: 5;
          margin-bottom: 10mm;
        }
        .cover-page .subtitle {
          font-size: 24px;
          color: #0369a1;
          letter-spacing: 2px;
          text-transform: uppercase;
          z-index: 5;
          margin-bottom: 40mm;
        }
        .cover-page .client-info {
          text-align: center;
          z-index: 5;
        }
        .cover-page .client-label {
          font-size: 14px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 5mm;
        }
        .cover-page .client-name {
          font-size: 32px;
          font-weight: 700;
          color: #1e293b;
        }
        .cover-page .decorative-line {
          width: 80mm;
          height: 4px;
          background: #3b82f6;
          margin: 10mm auto;
          border-radius: 2px;
        }
        .cover-page::before {
          content: "";
          position: absolute;
          top: -100mm;
          right: -100mm;
          width: 300mm;
          height: 300mm;
          background: #1e3a8a;
          clip-path: polygon(100% 0, 0 100%, 100% 100%);
          opacity: 0.1;
          z-index: 1;
        }
        .cover-page::after {
          content: "";
          position: absolute;
          bottom: -50mm;
          left: -50mm;
          width: 250mm;
          height: 250mm;
          background: #3b82f6;
          clip-path: polygon(0 0, 0 100%, 100% 0);
          opacity: 0.1;
          z-index: 1;
        }

        /* Top Blue Shapes */
        .page::before {
          content: "";
          position: absolute;
          top: 0;
          right: 0;
          width: 140mm;
          height: 60mm;
          background: #1e3a8a;
          clip-path: polygon(100% 0, 20% 0, 100% 100%);
          z-index: 1;
          opacity: 0.9;
        }
        .page::after {
          content: "";
          position: absolute;
          top: 0;
          right: 0;
          width: 160mm;
          height: 45mm;
          background: #3b82f6;
          clip-path: polygon(100% 0, 0% 0, 100% 100%);
          z-index: 0;
          opacity: 0.6;
        }

        /* Bottom Blue Shapes */
        .footer-shape-1 {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 120mm;
          height: 50mm;
          background: #1e3a8a;
          clip-path: polygon(0 0, 0 100%, 100% 100%);
          z-index: 1;
        }
        .footer-shape-2 {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 150mm;
          height: 35mm;
          background: #3b82f6;
          clip-path: polygon(0 20%, 0 100%, 100% 100%);
          z-index: 0;
          opacity: 0.7;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10mm;
          position: relative;
          z-index: 2;
        }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 4mm;
        }

        .logo-section img {
          height: 20mm;
          width: auto;
        }

        .brand-info h1 {
          font-size: 24px;
          font-weight: 800;
          color: #1e3a8a;
          margin: 0;
        }

        .brand-info p {
          font-size: 10px;
          color: #666;
          margin: 0;
        }

        .contact-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2mm 8mm;
          margin-bottom: 8mm;
          font-size: 11px;
          position: relative;
          z-index: 2;
        }

        .contact-item {
          display: flex;
          align-items: center;
          gap: 2mm;
        }

        .contact-icon {
          color: #1e40af;
        }

        .divider {
          height: 1px;
          background: #e5e7eb;
          margin: 5mm 0;
          position: relative;
          z-index: 2;
        }

        .doc-title {
          font-size: 56px;
          font-weight: 900;
          color: #0369a1;
          text-align: center;
          text-transform: uppercase;
          margin: 15mm 0;
          letter-spacing: 1px;
          position: relative;
          z-index: 2;
          line-height: 1.1;
        }

        .meta-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8mm;
          font-size: 12px;
          position: relative;
          z-index: 2;
        }

        .meta-block h3 {
          font-weight: 800;
          color: #1e3a8a;
          text-transform: uppercase;
          margin-bottom: 1mm;
        }

        .table-container {
          margin-bottom: 8mm;
          position: relative;
          z-index: 2;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          background: #f8fafc;
          border: 1px solid #1e3a8a;
          padding: 3mm;
          text-align: left;
          font-size: 12px;
          color: #1e3a8a;
          font-weight: 800;
        }

        td {
          border: 1px solid #e5e7eb;
          padding: 3mm;
          font-size: 11px;
        }

        .total-section {
          display: flex;
          justify-content: flex-end;
          margin-top: 4mm;
          position: relative;
          z-index: 2;
        }

        .total-box {
          width: 80mm;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 1mm 0;
          font-size: 12px;
        }

        .total-row.grand-total {
          border-top: 2px solid #1e3a8a;
          margin-top: 2mm;
          padding-top: 2mm;
          font-weight: 800;
          font-size: 14px;
          color: #1e3a8a;
        }

        .payment-info {
          margin-top: 8mm;
          font-size: 11px;
          position: relative;
          z-index: 2;
        }

        .payment-info h3 {
          font-weight: 800;
          color: #1e3a8a;
          margin-bottom: 2mm;
          text-transform: uppercase;
        }

        .signature-section {
          margin-top: auto;
          display: flex;
          justify-content: space-between;
          padding-bottom: 15mm;
          position: relative;
          z-index: 2;
        }

        .signature-block {
          width: 70mm;
          text-align: center;
        }

        .signature-line {
          border-top: 1px solid #1a1a1a;
          margin-top: 15mm;
          padding-top: 2mm;
          font-size: 11px;
        }

        .footer {
          position: absolute;
          bottom: 10mm;
          width: calc(100% - 30mm);
          text-align: center;
          font-size: 10px;
          color: #666;
          z-index: 2;
        }

        .section-title {
          font-weight: 800;
          text-decoration: underline;
          text-transform: uppercase;
          margin: 6mm 0 2mm;
          font-size: 13px;
          color: #1e3a8a;
        }

        .section-content {
          font-size: 11px;
          margin-bottom: 4mm;
          white-space: pre-wrap;
        }

        @media print {
          .page {
            margin: 0;
            box-shadow: none;
          }
          .haroom-print-root {
            width: 100%;
          }
        }
      `}</style>

      {/* COVER PAGE */}
      <div className="cover-page">
        <div className="footer-shape-1"></div>
        <div className="footer-shape-2"></div>
        <img src={brand.logoSrc} alt="logo" className="logo-large" />
        <div className="title-main">{title}</div>
        <div className="subtitle">Project Proposal & Implementation Plan</div>
        <div className="decorative-line"></div>
        <div className="client-info">
          <div className="client-label">Prepared For</div>
          <div className="client-name">{clientName}</div>
        </div>
        <div style={{ position: 'absolute', bottom: '20mm', right: '20mm', textAlign: 'right', zIndex: 5 }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Reference No: {docNumber}</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Date: {date}</div>
        </div>
      </div>

      {/* PAGE 1: Front Page / Invoice */}
      <div className="page">
        <div className="footer-shape-1"></div>
        <div className="footer-shape-2"></div>
        <div className="header">
          <div className="logo-section">
            <img src={brand.logoSrc} alt="logo" />
            <div className="brand-info">
              <h1>{brand.name}</h1>
              <p>Powering the Future of Care</p>
            </div>
          </div>
        </div>

        <div className="contact-grid">
          <div className="contact-item">
            <span className="contact-icon">📞</span>
            <span>{brand.phone}</span>
          </div>
          <div className="contact-item">
            <span className="contact-icon">✉️</span>
            <span>{brand.email}</span>
          </div>
          <div className="contact-item">
            <span className="contact-icon">🌐</span>
            <span>{brand.website}</span>
          </div>
          <div className="contact-item">
            <span className="contact-icon">📍</span>
            <span>{brand.address}</span>
          </div>
        </div>

        <div className="divider" />

        <div className="doc-title">{title}</div>

        <div className="meta-info">
          <div className="meta-block">
            <h3>{title.includes('INVOICE') ? 'INVOICE TO:' : 'PREPARED FOR:'}</h3>
            <div>{clientName}</div>
            {clientAddress && <div className="text-muted-foreground">{clientAddress}</div>}
          </div>
          <div className="meta-block text-right">
            <div><span className="font-bold">Number:</span> {docNumber}</div>
            <div><span className="font-bold">Date:</span> {date}</div>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '60%' }}>Item Description</th>
                <th style={{ width: '20%', textAlign: 'right' }}>Price</th>
                <th style={{ width: '20%', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx}>
                  <td>
                    <div className="font-bold">{it.description.split('\n')[0]}</div>
                    <div className="text-[10px] text-gray-600 mt-1">
                      {it.description.split('\n').slice(1).join('\n')}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>{it.price?.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>{it.total?.toLocaleString()}</td>
                </tr>
              ))}
              {/* Fill remaining space to match template look if few items */}
              {items.length < 5 && Array.from({ length: 5 - items.length }).map((_, i) => (
                <tr key={`empty-${i}`}>
                  <td style={{ height: '8mm' }}></td>
                  <td></td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="total-section">
          <div className="total-box">
            {totals.map((t, idx) => (
              <div key={idx} className={cn("total-row", t.bold && "font-bold", idx === totals.length - 1 && "grand-total")}>
                <span>{t.label}</span>
                <span>{t.value}</span>
              </div>
            ))}
          </div>
        </div>

        {paymentInformation && (
          <div className="payment-info">
            <h3>Payment Information:</h3>
            <div className="grid grid-cols-2 gap-4">
              <div dangerouslySetInnerHTML={{ __html: paymentInformation.replace(/\n/g, '<br/>') }} />
            </div>
          </div>
        )}

        <div className="footer">
          {brand.website} | {brand.email}
        </div>
      </div>

      {/* PAGE 2+: Content / Agreement / Modules */}
      {(sections && sections.length > 0) && (
        <div className="page">
          <div className="footer-shape-1"></div>
          <div className="footer-shape-2"></div>
          <div className="header">
            <div className="logo-section">
              <img src={brand.logoSrc} alt="logo" />
            </div>
          </div>

          <div style={{ position: 'relative', zIndex: 2 }}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="font-bold text-blue-800">{brand.name}</div>
                <div className="text-xs text-gray-600">{brand.address}</div>
                <div className="text-xs text-gray-600">{brand.email}</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold">To:</div>
                <div className="font-bold text-blue-800">{clientName}</div>
                <div className="text-xs text-gray-600">{clientAddress}</div>
              </div>
            </div>

            <div className="text-xs mb-6 italic">
              This {title.toLowerCase()} is entered into between {brand.name.toUpperCase()} and {clientName.toUpperCase()} for 
              provision implementation and ongoing support of the software as outlined in this document.
            </div>

            {sections.map((s, idx) => (
              <div key={idx}>
                <div className="section-title">{s.heading}</div>
                <div className="section-content">{s.content}</div>
              </div>
            ))}

            {termsText && (
              <>
                <div className="section-title">TERMS & CONDITIONS</div>
                <div className="section-content">{termsText}</div>
              </>
            )}

            {signatureData && (
              <div className="signature-section">
                <div className="signature-block">
                  <div className="font-bold text-blue-800 mb-1">{signatureData.companyName}</div>
                  <div className="text-xs mb-4">Authorized Signature</div>
                  <div className="h-12 flex items-end justify-center">
                    {/* Placeholder for signature image if exists */}
                    <div className="w-40 border-b border-gray-400 italic font-serif text-sm">
                      {signatureData.companySignatory}
                    </div>
                  </div>
                  <div className="text-[10px] mt-2">
                    Name: {signatureData.companySignatory}<br/>
                    Designation: {signatureData.companyDesignation}<br/>
                    Date: {date}
                  </div>
                </div>

                <div className="signature-block">
                  <div className="font-bold text-blue-800 mb-1">{signatureData.clientName}</div>
                  <div className="text-xs mb-4">Authorized Signature</div>
                  <div className="h-12 flex items-end justify-center">
                    <div className="w-40 border-b border-gray-400 h-8"></div>
                  </div>
                  <div className="text-[10px] mt-2 text-left ml-8">
                    Name: {signatureData.clientSignatory || '________________'}<br/>
                    Designation: {signatureData.clientDesignation || '________________'}<br/>
                    Date: ________________
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="footer">
            {brand.website} | {brand.email}
          </div>
        </div>
      )}
    </div>
  );
});

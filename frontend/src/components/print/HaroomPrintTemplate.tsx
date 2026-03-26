import React, { forwardRef, useEffect } from "react";

/* ─── Types ──────────────────────────────────────────────────── */

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
  timeframe?: string;
  timeframeStartDate?: string;
  timeframeDays?: number;
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

/* ─── Shared SVG Components ──────────────────────────────────── */

/** Header hex-grid background pattern */
const HexBg = () => {
  const hexes: React.ReactNode[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      const x = c * 34 + (r % 2) * 17 + 5;
      const y = r * 30 + 5;
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (i * 60 - 30) * Math.PI / 180;
        return `${x + 13 * Math.cos(a)},${y + 13 * Math.sin(a)}`;
      }).join(" ");
      hexes.push(<polygon key={`${r}-${c}`} points={pts} fill="none" stroke="currentColor" strokeWidth="0.7" />);
    }
  }
  return (
    <svg viewBox="0 0 160 105" xmlns="http://www.w3.org/2000/svg"
      style={{ position: "absolute", top: 0, right: 0, width: "45mm", height: "100%", opacity: 0.065, color: "#7dd3fc", pointerEvents: "none" }}>
      {hexes}
    </svg>
  );
};

/** Dot-grid watermark for terms page */
const DotGrid = () => (
  <svg viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg"
    style={{ position: "absolute", bottom: "8mm", right: "8mm", width: "38mm", height: "38mm", opacity: 0.07, pointerEvents: "none" }}>
    {Array.from({ length: 6 }, (_, row) =>
      Array.from({ length: 6 }, (_, col) => (
        <circle key={`${row}-${col}`} cx={col * 16 + 8} cy={row * 16 + 8} r="2" fill="#0ea5e9" />
      ))
    )}
  </svg>
);

/** Thin signature wave divider */
const SigWave = () => (
  <svg viewBox="0 0 400 28" xmlns="http://www.w3.org/2000/svg"
    style={{ width: "100%", height: "7mm", display: "block", opacity: 0.16, margin: "4mm 0" }}>
    <defs>
      <linearGradient id="sig-wg" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
        <stop offset="25%" stopColor="#38bdf8" />
        <stop offset="75%" stopColor="#0ea5e9" />
        <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path d="M0 14 C 30 4,60 24,90 14 C 120 4,150 24,180 14 C 210 4,240 24,270 14 C 300 4,330 24,360 14 C 385 6,400 18,420 14"
      fill="none" stroke="url(#sig-wg)" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

/** Cover page network illustration */
const CoverIllustration = () => (
  <svg viewBox="0 0 380 200" preserveAspectRatio="xMidYMid meet"
    xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%", display: "block" }}>
    <defs>
      <radialGradient id="cov-rg" cx="50%" cy="50%" r="55%">
        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
      </radialGradient>
      <filter id="cov-glow">
        <feGaussianBlur stdDeviation="2.5" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
    <ellipse cx="190" cy="100" rx="170" ry="85" fill="url(#cov-rg)" />
    {/* edges */}
    {([
      [48,38, 138,82],[138,82,258,48],[258,48,338,98],
      [138,82,192,152],[258,48,192,152],[338,98,318,155],
      [318,155,192,152],[48,38, 68,142],[68,142,192,152],
      [338,98,370,55],[370,55,258,48],
    ] as [number,number,number,number][]).map(([x1,y1,x2,y2],i) => (
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(125,211,252,0.28)" strokeWidth="0.8" />
    ))}
    {/* centre document icon */}
    <rect x="165" y="64" width="54" height="68" rx="5" fill="rgba(255,255,255,0.05)" stroke="rgba(125,211,252,0.42)" strokeWidth="1" />
    {[[174,82,210,82,0.65,1.5],[174,93,210,93,0.35,1],[174,103,200,103,0.35,1],[174,113,204,113,0.25,1]].map(([x1,y1,x2,y2,op,sw],i) => (
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={`rgba(125,211,252,${op})`} strokeWidth={sw} strokeLinecap="round" />
    ))}
    {/* nodes */}
    {([
      [48,38,4.5,"#38bdf8"],[138,82,7,"#0ea5e9"],[258,48,5.5,"#38bdf8"],
      [338,98,4,"#7dd3fc"],[192,152,8.5,"#0284c7"],[68,142,3.5,"#38bdf8"],
      [318,155,3.5,"#38bdf8"],[370,55,3,"#7dd3fc"],
    ] as [number,number,number,string][]).map(([cx,cy,r,fill],i) => (
      <circle key={i} cx={cx} cy={cy} r={r} fill={fill} filter="url(#cov-glow)" opacity="0.88" />
    ))}
    <circle cx="355" cy="30" r="22" fill="none" stroke="rgba(125,211,252,0.14)" strokeWidth="0.8" />
    <circle cx="355" cy="30" r="12" fill="none" stroke="rgba(125,211,252,0.09)" strokeWidth="0.5" />
    {[[118,18],[282,172],[362,130],[24,98]].map(([cx,cy],i) => (
      <circle key={i} cx={cx} cy={cy} r="1.4" fill="#7dd3fc" opacity="0.5" />
    ))}
  </svg>
);

/* ─── Main Component ─────────────────────────────────────────── */

export const HaroomPrintTemplate = forwardRef<HTMLDivElement, Props>(
  function HealthSpirePrintTemplate(
    {
      title, brand, clientName, clientAddress, docNumber, date,
      items, paymentInformation, totals, termsText, timeframe,
      timeframeStartDate, timeframeDays, sections, signatureData,
    },
    ref
  ) {
    /* Load Google Fonts once */
    useEffect(() => {
      const id = "hpt-fonts-v5";
      if (typeof document === "undefined" || document.getElementById(id)) return;
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap";
      document.head.appendChild(link);
    }, []);

    /* Helpers */
    const calcEnd = (start?: string, days?: number) => {
      if (!start || !days) return null;
      const d = new Date(start);
      d.setDate(d.getDate() + days);
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    };
    const fmtStart = timeframeStartDate
      ? new Date(timeframeStartDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
      : null;
    const fmtEnd = calcEnd(timeframeStartDate, timeframeDays);
    const titleYear = date ? date.split(" ").slice(-1)[0] : new Date().getFullYear().toString();

    /* ── Shared sub-components ── */

    /** Dark navy page header band used on pages 3-6 */
    const PgHeader = ({ num, kicker, title: t }: { num: string; kicker: string; title: string }) => (
      <div style={{
        background: "linear-gradient(135deg,#075985 0%,#0369a1 100%)",
        padding: "7mm 16mm", display: "flex", alignItems: "center",
        justifyContent: "space-between", position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "2.5px",
          background: "linear-gradient(90deg,#7dd3fc,#bae6fd,transparent)",
        }} />
        <HexBg />
        <div style={{ display: "flex", alignItems: "center", gap: "4mm" }}>
          <div style={{
            fontFamily: "'Syne',sans-serif", fontSize: "36px", fontWeight: 800,
            color: "rgba(255,255,255,0.08)", lineHeight: 1, letterSpacing: "-2px", flexShrink: 0,
          }}>{num}</div>
          <div>
            <div style={{
              fontFamily: "'Syne',sans-serif", fontSize: "7px", fontWeight: 600,
              letterSpacing: "3.5px", color: "#bae6fd", textTransform: "uppercase", marginBottom: "1mm",
            }}>{kicker}</div>
            <div style={{
              fontFamily: "'Syne',sans-serif", fontSize: "20px", fontWeight: 700,
              color: "white", lineHeight: 1, letterSpacing: "-0.5px",
            }}>{t}</div>
          </div>
        </div>
        <img src={brand.logoSrc} alt=""
          style={{ height: "7mm", filter: "brightness(0) invert(1)", opacity: 0.6 }}
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      </div>
    );

    /** Page footer strip */
    const PgFooter = ({ label, pg }: { label: string; pg: number }) => (
      <div style={{
        position: "absolute", bottom: "7mm", left: "16mm", right: "16mm",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        borderTop: "0.5px solid #e0f2fe", paddingTop: "2mm",
      }}>
        <span style={{ fontFamily: "'Syne',sans-serif", fontSize: "7px", letterSpacing: "2px", color: "#0ea5e9", textTransform: "uppercase", fontWeight: 700 }}>
          {brand.name}
        </span>
        <span style={{ fontFamily: "'Syne',sans-serif", fontSize: "7px", color: "#94a3b8", letterSpacing: "1px" }}>
          {label} · {pg} of 6
        </span>
      </div>
    );

    return (
      <div ref={ref} className="hpt5">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');

          /* ── Design tokens ──────────────────────────────── */
          .hpt5 {
            --s9:#082f49; --s8:#075985; --s7:#0369a1; --s6:#0284c7;
            --s5:#0ea5e9; --s4:#38bdf8; --s3:#7dd3fc; --s2:#bae6fd;
            --s1:#e0f2fe; --s0:#f0f9ff;
            --ink:#0f172a; --mist:#64748b; --rule:#e0f2fe;
            font-family:'Plus Jakarta Sans',sans-serif;
            color:var(--ink); width:210mm; margin:0 auto;
            background:white; font-size:11px; line-height:1.7;
          }

          /* ── Page shell ──────────────────────────────────── */
          .hpt5 .page {
            width:210mm; min-height:297mm;
            page-break-after:always; position:relative;
            overflow:hidden; box-sizing:border-box; background:white;
          }

          /* ════════════════════════════════════════════════
             PAGE 1 — COVER
          ════════════════════════════════════════════════ */
          .hpt5 .cover { background:#ffffff; display:block; }

          .hpt5 .c-kicker {
            font-family:'Syne',sans-serif; font-size:7.5px; font-weight:600;
            letter-spacing:4px; color:var(--s5); text-transform:uppercase;
            margin-bottom:4mm; display:flex; align-items:center; gap:3mm;
          }
          .hpt5 .c-kicker::before { content:''; width:7mm; height:1.5px; background:var(--s5); }

          .hpt5 .c-title {
            font-family:'Syne',sans-serif; font-size:42px; font-weight:800;
            color:var(--s9); line-height:0.94; letter-spacing:-2px;
            text-transform:uppercase; margin-bottom:3mm;
          }

          .hpt5 .c-tagline {
            font-family:'Instrument Serif',serif; font-style:italic;
            font-size:12px; color:var(--s5); margin-bottom:0;
          }

          .hpt5 .c-client-card {
            background:var(--s0);
            border:0.5px solid var(--s2);
            border-radius:4mm; padding:5.5mm 7mm;
            position:relative; overflow:hidden;
          }
          .hpt5 .c-client-card::before {
            content:''; position:absolute; top:0; left:0; width:100%; height:2px;
            background:linear-gradient(90deg,var(--s4),var(--s2),transparent);
          }
          .hpt5 .c-for-lb {
            font-family:'Syne',sans-serif; font-size:7px; font-weight:600;
            letter-spacing:3px; color:var(--s5); text-transform:uppercase; margin-bottom:2mm;
          }
          .hpt5 .c-cname {
            font-family:'Syne',sans-serif; font-size:17px; font-weight:700;
            color:var(--s8); line-height:1.2; margin-bottom:1mm;
          }
          .hpt5 .c-caddr { font-size:9px; color:var(--mist); line-height:1.5; }

          .hpt5 .c-meta-strip {
            display:flex; margin-top:7mm;
            border:0.5px solid var(--s2);
            border-radius:3mm; overflow:hidden;
          }
          .hpt5 .c-meta-cell {
            flex:1; padding:4mm 5mm;
            border-right:0.5px solid var(--s2);
          }
          .hpt5 .c-meta-cell:last-child { border-right:none; }
          .hpt5 .cml { font-size:6.5px; font-weight:600; letter-spacing:2px;
            color:var(--s5); text-transform:uppercase; margin-bottom:0.8mm; }
          .hpt5 .cmv { font-family:'Syne',sans-serif; font-size:10px; font-weight:600;
            color:var(--s8); }

          .hpt5 .c-chip-grid { display:grid; grid-template-columns:1fr 1fr; gap:3mm; }
          .hpt5 .c-chip {
            background:var(--s0); border:0.5px solid var(--s2);
            border-radius:3mm; padding:4mm 5mm;
          }
          .hpt5 .c-chip-lb { font-size:6.5px; font-weight:600; letter-spacing:2px;
            color:var(--s5); text-transform:uppercase; margin-bottom:1mm; }
          .hpt5 .c-chip-vl { font-family:'Syne',sans-serif; font-size:11px; font-weight:700; color:var(--s8); }

          .hpt5 .c-illus-box {
            border-radius:3mm; overflow:hidden; background:var(--s0);
            border:0.5px solid var(--s1);
            flex:1; min-height:0; display:flex; align-items:center; justify-content:center;
            margin-bottom:4mm;
          }

          /* ════════════════════════════════════════════════
             PAGE 2 — INVOICE  (wave style)
          ════════════════════════════════════════════════ */
          .hpt5 .inv-header {
            position:relative; height:28mm; overflow:hidden;
            display:flex; align-items:center; justify-content:space-between;
            padding:0 14mm;
          }
          .hpt5 .inv-logo-circle {
            width:12mm; height:12mm; border-radius:50%; background:var(--s8);
            display:flex; align-items:center; justify-content:center; flex-shrink:0;
          }
          .hpt5 .inv-brand-name { font-family:'Syne',sans-serif; font-size:11px; font-weight:800; color:var(--s8); }
          .hpt5 .inv-brand-sub  { font-size:7px; color:var(--mist); letter-spacing:1px; }
          .hpt5 .inv-big-title  {
            font-family:'Syne',sans-serif; font-size:36px; font-weight:900;
            color:var(--s8); letter-spacing:-1px; text-transform:uppercase; z-index:2;
          }

          .hpt5 .inv-arrows-row {
            display:flex; align-items:center; gap:2mm;
            padding:3mm 14mm; border-bottom:0.5px solid var(--rule);
          }
          .hpt5 .inv-ref-badge {
            background:var(--s1); border-radius:20px; padding:1.5mm 5mm;
            display:flex; align-items:center; gap:4mm; margin-left:auto;
          }
          .hpt5 .inv-ref-item { font-size:8px; color:var(--s8); }
          .hpt5 .inv-ref-item strong { font-weight:800; }
          .hpt5 .inv-ref-sep { width:1px; height:10px; background:var(--s3); }

          .hpt5 .inv-body { padding:5mm 14mm 26mm; }
          .hpt5 .inv-to-label { font-size:8px; color:var(--mist); margin-bottom:1mm; }
          .hpt5 .inv-to-name  { font-family:'Syne',sans-serif; font-size:13px; font-weight:800; color:var(--s9); margin-bottom:1mm; }
          .hpt5 .inv-to-addr  { font-size:9px; color:var(--mist); line-height:1.6; }
          .hpt5 .inv-slashes  { font-size:22px; font-weight:700; color:var(--s3); letter-spacing:-3px; line-height:1; }

          .hpt5 .inv-tbl { width:100%; border-collapse:collapse; margin:4mm 0; }
          .hpt5 .inv-tbl thead tr { background:var(--s8); }
          .hpt5 .inv-tbl thead th {
            padding:3mm 4mm; font-family:'Syne',sans-serif; font-size:8.5px;
            font-weight:700; color:white; text-align:left; border:none;
          }
          .hpt5 .inv-tbl thead th:not(:first-child) { text-align:right; }
          .hpt5 .inv-tbl tbody tr { border-bottom:0.5px solid var(--s1); }
          .hpt5 .inv-tbl tbody td { padding:3.5mm 4mm; font-size:10px; vertical-align:middle; border:none; }
          .hpt5 .inv-tbl tbody td:not(:first-child) { text-align:right; }
          .hpt5 .inv-qty { color:var(--mist); }

          .hpt5 .inv-bottom { display:grid; grid-template-columns:1fr auto; gap:8mm; padding-bottom:28mm; }
          .hpt5 .inv-terms-title { font-family:'Syne',sans-serif; font-size:9px; font-weight:800; color:var(--s9); margin-bottom:2mm; }
          .hpt5 .inv-terms-body { font-size:8.5px; color:var(--mist); line-height:1.6; max-width:75mm; }
          .hpt5 .inv-sig-line { width:28mm; border-bottom:1px solid var(--s9); margin-bottom:1.5mm; height:6mm; }
          .hpt5 .inv-sig-name { font-family:'Syne',sans-serif; font-size:10px; font-weight:800; color:var(--s9); }
          .hpt5 .inv-sig-role { font-size:8px; color:var(--mist); }

          .hpt5 .inv-tot-row {
            display:flex; justify-content:space-between; gap:14mm;
            padding:1.5mm 0; font-size:10px; border-bottom:0.5px solid var(--s1);
          }
          .hpt5 .inv-tot-row:last-child { border-bottom:none; }
          .hpt5 .inv-tot-label { color:var(--mist); }
          .hpt5 .inv-tot-val   { font-weight:600; min-width:20mm; text-align:right; }
          .hpt5 .inv-grand-row {
            display:flex; justify-content:space-between; gap:14mm;
            padding:3mm 0; margin-top:1mm;
          }
          .hpt5 .inv-grand-label {
            font-family:'Syne',sans-serif; font-size:11px; font-weight:800; color:var(--s9);
          }
          .hpt5 .inv-grand-val {
            font-family:'Syne',sans-serif; font-size:14px; font-weight:800;
            color:var(--s7); min-width:20mm; text-align:right;
          }

          /* ════════════════════════════════════════════════
             PAGE 3 — MODULES
          ════════════════════════════════════════════════ */
          .hpt5 .mod-body { padding:8mm 16mm 20mm; }
          .hpt5 .mod-card {
            margin-bottom:5mm; padding:5mm 6mm; border-radius:3mm;
            border:0.5px solid var(--s1); background:white;
            position:relative; overflow:hidden;
            display:flex; gap:4mm; align-items:flex-start;
          }
          .hpt5 .mod-card::before {
            content:''; position:absolute; top:0; left:0;
            width:3px; height:100%;
            background:linear-gradient(180deg,var(--s5),var(--s3));
          }
          .hpt5 .mod-badge {
            flex-shrink:0; margin-left:4mm;
            width:8mm; height:8mm; border-radius:50%;
            background:linear-gradient(135deg,var(--s5),var(--s4));
            display:flex; align-items:center; justify-content:center;
            font-family:'Syne',sans-serif; font-size:9px; font-weight:800; color:white;
          }
          .hpt5 .mod-title { font-family:'Syne',sans-serif; font-size:12px; font-weight:700; color:var(--s8); margin-bottom:1.5mm; }
          .hpt5 .mod-body-txt { font-size:10px; color:var(--mist); line-height:1.75; }

          /* ════════════════════════════════════════════════
             PAGE 4 — TIMELINE
          ════════════════════════════════════════════════ */
          .hpt5 .tl-stats-band {
            background:var(--s0); border-bottom:0.5px solid var(--s1);
            display:grid; grid-template-columns:1fr 1fr 1fr;
          }
          .hpt5 .tl-stat { padding:5.5mm 16mm; border-right:0.5px solid var(--s1); }
          .hpt5 .tl-stat:last-child { border-right:none; }
          .hpt5 .tl-stat-lb { font-family:'Syne',sans-serif; font-size:6.5px; font-weight:600;
            letter-spacing:2.5px; color:var(--s5); text-transform:uppercase; margin-bottom:1.5mm; }
          .hpt5 .tl-stat-vl { font-family:'Syne',sans-serif; font-size:16px; font-weight:800;
            color:var(--s8); line-height:1; }
          .hpt5 .tl-stat-sub { font-size:9px; color:var(--mist); margin-top:0.5mm; }

          .hpt5 .tl-body { padding:7mm 16mm 20mm; }
          .hpt5 .tl-item { display:grid; grid-template-columns:10mm 1fr; gap:0 5mm; }
          .hpt5 .tl-connector { display:flex; flex-direction:column; align-items:center; }
          .hpt5 .tl-dot {
            width:9mm; height:9mm; border-radius:50%; flex-shrink:0;
            background:linear-gradient(135deg,var(--s5),var(--s4));
            display:flex; align-items:center; justify-content:center;
            font-family:'Syne',sans-serif; font-size:10px; font-weight:800; color:white;
            box-shadow:0 0 0 3px var(--s1);
          }
          .hpt5 .tl-line { flex:1; width:1.5px; min-height:4mm; background:linear-gradient(180deg,var(--s3),var(--s1)); }
          .hpt5 .tl-card { padding:4mm 5mm; border-radius:3mm; border:0.5px solid var(--s1); background:white; margin-bottom:4mm; }
          .hpt5 .tl-ph-title { font-family:'Syne',sans-serif; font-size:11px; font-weight:700; color:var(--s8); margin-bottom:1mm; }
          .hpt5 .tl-ph-period { font-weight:400; color:var(--mist); font-size:9px; margin-left:2mm; }
          .hpt5 .tl-ph-desc { font-size:9.5px; color:var(--mist); line-height:1.65; }

          /* ════════════════════════════════════════════════
             PAGE 5 — TERMS & CONDITIONS
          ════════════════════════════════════════════════ */
          .hpt5 .terms-body { padding:8mm 16mm 20mm; }
          .hpt5 .terms-grid { display:grid; grid-template-columns:1fr 1fr; gap:8mm; }
          .hpt5 .terms-col-head {
            font-family:'Syne',sans-serif; font-size:8px; font-weight:700;
            letter-spacing:2.5px; color:var(--s7); text-transform:uppercase;
            margin-bottom:4mm; padding-bottom:2mm;
            border-bottom:1.5px solid var(--s4);
            display:flex; align-items:center; gap:2mm;
          }
          .hpt5 .terms-col-head::before { content:''; width:5px; height:5px; background:var(--s4); border-radius:50%; display:inline-block; }
          .hpt5 .terms-txt { font-size:10px; color:var(--ink); line-height:1.85; }

          .hpt5 .pay-row {
            display:flex; justify-content:space-between; align-items:center;
            padding:2.5mm 3mm; border-radius:2mm; margin-bottom:1.5mm;
            background:var(--s0); font-size:10px;
          }
          .hpt5 .pay-row-lb { color:var(--mist); }
          .hpt5 .pay-row-vl { font-weight:700; color:var(--s8); }

          .hpt5 .clause { margin-bottom:3mm; }
          .hpt5 .clause-title { font-family:'Syne',sans-serif; font-size:10px; font-weight:700; color:var(--s7); margin-bottom:0.6mm; }
          .hpt5 .clause-body { font-size:9.5px; color:var(--mist); line-height:1.75; }

          /* ════════════════════════════════════════════════
             PAGE 6 — SIGNATURES
          ════════════════════════════════════════════════ */
          .hpt5 .sig-page { background:var(--s0); }

          .hpt5 .sig-top-band {
            background:linear-gradient(135deg,var(--s8),var(--s7));
            padding:10mm 16mm; display:flex; flex-direction:column;
            align-items:center; text-align:center;
            position:relative; overflow:hidden;
          }
          .hpt5 .sig-top-band::after {
            content:''; position:absolute; bottom:0; left:0; right:0; height:2.5px;
            background:linear-gradient(90deg,transparent,var(--s4),var(--s2),transparent);
          }
          .hpt5 .sig-kicker {
            font-family:'Syne',sans-serif; font-size:7.5px; font-weight:600;
            letter-spacing:4px; color:var(--s2); text-transform:uppercase; margin-bottom:2mm;
          }
          .hpt5 .sig-title {
            font-family:'Syne',sans-serif; font-size:26px; font-weight:800;
            color:white; letter-spacing:-1px; line-height:1;
          }

          .hpt5 .sig-body { padding:9mm 16mm 16mm; }
          .hpt5 .sig-agree {
            font-family:'Instrument Serif',serif; font-style:italic;
            font-size:13px; color:var(--mist); text-align:center;
            line-height:1.7; max-width:130mm; margin:0 auto 6mm;
          }

          .hpt5 .sig-cards { display:grid; grid-template-columns:1fr 1fr; gap:12mm; margin-bottom:10mm; }
          .hpt5 .sig-card { border:0.5px solid var(--s1); border-radius:4mm; overflow:hidden; background:white; }
          .hpt5 .sig-card-top {
            background:var(--s0); padding:3mm 5mm;
            font-family:'Syne',sans-serif; font-size:7px; font-weight:700;
            letter-spacing:2.5px; color:var(--s5); text-transform:uppercase;
            display:flex; align-items:center; gap:2mm;
            border-bottom:1px solid var(--s2);
          }
          .hpt5 .sig-card-top::before { content:''; width:5px; height:5px; background:var(--s4); border-radius:50%; }
          .hpt5 .sig-card-body { padding:5mm; }
          .hpt5 .sig-write-area {
            height:20mm; border-bottom:1.5px solid var(--s2); margin-bottom:3mm;
            background:repeating-linear-gradient(to bottom,transparent,transparent 9px,var(--s0) 9px,var(--s0) 10px);
            position:relative;
          }
          .hpt5 .sig-write-hint {
            position:absolute; bottom:3mm; left:2mm;
            font-family:'Instrument Serif',serif; font-style:italic;
            font-size:10px; color:var(--s2);
          }
          .hpt5 .sig-name { font-family:'Syne',sans-serif; font-size:13px; font-weight:700; color:var(--s8); margin-bottom:0.5mm; }
          .hpt5 .sig-role { font-size:9px; color:var(--mist); }
          .hpt5 .sig-co   { font-size:9px; color:var(--s5); font-weight:600; }

          .hpt5 .sig-footer {
            display:flex; justify-content:space-between; align-items:center;
            padding-top:6mm; border-top:0.5px solid var(--rule);
          }
          .hpt5 .sig-footer-brand { font-family:'Syne',sans-serif; font-size:18px; font-weight:800; color:var(--s2); opacity:0.5; }
          .hpt5 .sig-footer-meta  { text-align:right; font-size:8px; color:var(--mist); line-height:1.8; font-family:'Syne',sans-serif; }

          @media print {
            .hpt5 { width:100%; }
            @page { margin:0; size:A4; }
          }
        `}</style>

        {/* ════════════════════════════════════════════
            PAGE 1 — COVER  (Annual-report style)
            White bg · diagonal silver swooshes top-right
            Blue circle left-mid · dark navy wave bottom
            Two-column: text left, illustration right
        ════════════════════════════════════════════ */}
        <div className="page cover">
          {/* Full-page SVG shapes */}
          <svg viewBox="0 0 595 842" xmlns="http://www.w3.org/2000/svg"
            style={{ position:"absolute", inset:0, width:"100%", height:"100%", display:"block", pointerEvents:"none" }}>
            <defs>
              <linearGradient id="cov-sw1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.4"/><stop offset="100%" stopColor="#e0f2fe" stopOpacity="0.1"/>
              </linearGradient>
              <linearGradient id="cov-sw2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f0f9ff" stopOpacity="0.8"/><stop offset="100%" stopColor="#e0f2fe" stopOpacity="0.2"/>
              </linearGradient>
              <linearGradient id="cov-sw3" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.1"/><stop offset="100%" stopColor="#bae6fd" stopOpacity="0.05"/>
              </linearGradient>
              <linearGradient id="cov-bot" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#075985"/><stop offset="55%" stopColor="#0369a1"/><stop offset="100%" stopColor="#0284c7"/>
              </linearGradient>
              <radialGradient id="cov-circ1" cx="38%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#7dd3fc"/><stop offset="45%" stopColor="#38bdf8"/><stop offset="100%" stopColor="#0ea5e9"/>
              </radialGradient>
              <radialGradient id="cov-circ2" cx="32%" cy="28%" r="50%">
                <stop offset="0%" stopColor="white" stopOpacity="0.3"/><stop offset="100%" stopColor="white" stopOpacity="0"/>
              </radialGradient>
              <linearGradient id="cov-lbar" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0ea5e9"/><stop offset="100%" stopColor="#0369a1"/>
              </linearGradient>
            </defs>
            {/* Swooshes */}
            <path d="M595 0 L595 310 Q470 390 295 195 Q230 115 290 0 Z" fill="url(#cov-sw1)"/>
            <path d="M595 0 L595 200 Q505 270 365 128 Q318 72 355 0 Z" fill="url(#cov-sw2)"/>
            <path d="M595 0 L595 110 Q550 160 460 75 Q435 42 450 0 Z" fill="url(#cov-sw3)"/>
            <path d="M290 0 Q230 115 295 195 Q470 390 595 310" fill="none" stroke="#bae6fd" strokeWidth="1" opacity="0.5"/>
            <path d="M355 0 Q318 72 365 128 Q505 270 595 200" fill="none" stroke="#e0f2fe" strokeWidth="0.8" opacity="0.4"/>
            {/* Left accent bar */}
            <rect x="0" y="310" width="7" height="215" fill="url(#cov-lbar)" rx="3"/>
            {/* Blue circle */}
            <circle cx="54" cy="448" r="90" fill="url(#cov-circ1)"/>
            <circle cx="54" cy="448" r="90" fill="url(#cov-circ2)"/>
            <circle cx="54" cy="448" r="63" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
            <circle cx="54" cy="448" r="37" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
            <circle cx="54" cy="448" r="14" fill="rgba(255,255,255,0.2)"/>
            {/* Bottom dark wave */}
            <path d="M0 842 L0 590 Q70 535 170 568 Q290 608 415 555 Q510 516 595 548 L595 842 Z" fill="url(#cov-bot)"/>
            <path d="M0 590 Q70 535 170 568 Q290 608 415 555 Q510 516 595 548" fill="none" stroke="#bae6fd" strokeWidth="2" opacity="0.3"/>
            {/* Rule above title */}
            <line x1="200" y1="415" x2="568" y2="415" stroke="#0ea5e9" strokeWidth="1.5" opacity="0.4"/>
          </svg>

          {/* Top bar */}
          <div style={{ position:"absolute", top:0, left:0, right:0, zIndex:10,
            display:"flex", justifyContent:"space-between", alignItems:"flex-start",
            padding:"10mm 13mm 0" }}>
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:"9px", fontWeight:700, letterSpacing:"3px", color:"#0ea5e9", textTransform:"uppercase" }}>
                {brand.name}
              </div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:"14px", fontWeight:800, color: "var(--s8)", letterSpacing:"0.5px", marginTop:"1.5mm" }}>
                <img src={brand.logoSrc} alt="logo"
                  style={{ height:"9mm", maxWidth:"38mm", objectFit:"contain" }}
                  onError={e => { (e.target as HTMLImageElement).style.display="none"; }}
                />
              </div>
              <div style={{ fontSize:"8px", color:"#64748b", marginTop:"1.5mm", fontWeight: 600 }}>Advanced Digital Infrastructure</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:"8px", fontWeight:600, letterSpacing:"3px", color:"var(--s5)", textTransform:"uppercase" }}>DOCUMENT</div>
              <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:"20px", fontWeight:400, color:"var(--s8)", fontStyle:"italic", lineHeight:1 }}>node analysis</div>
            </div>
          </div>

          {/* Vertical side text */}
          <div style={{ position:"absolute", left:"-14mm", top:"50%",
            transform:"translateY(-50%) rotate(-90deg)", zIndex:10, whiteSpace:"nowrap" }}>
            <span style={{ fontFamily:"'Syne',sans-serif", fontSize:"8px", fontWeight:700,
              letterSpacing:"4px", color:"#0ea5e9", textTransform:"uppercase" }}>Official {title.includes("CONTRACT") ? "Agreement" : "Proposal"}</span>
          </div>

          {/* Centre-right: year + big title + tagline */}
          <div style={{ position:"absolute", left:"92mm", right:"13mm", top:"95mm", zIndex:10 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:"22px", fontWeight:800, color:"#0ea5e9", letterSpacing:"-0.5px", marginBottom:"1mm" }}>
              {titleYear}
            </div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:"44px", fontWeight:800, color:"var(--s9)",
              lineHeight:0.93, letterSpacing:"-2px", textTransform:"uppercase" }}>
              {(() => {
                const words = title.toUpperCase().split(" ");
                const mid = Math.ceil(words.length / 2);
                return (<><div>{words.slice(0, mid).join(" ")}</div><div>{words.slice(mid).join(" ")}</div></>);
              })()}
            </div>
            <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:"10px", fontWeight:600,
              color: "var(--s5)", letterSpacing:"3px", marginTop:"4mm", textTransform:"uppercase" }}>
              Enterprise Solution Architecture
            </div>
          </div>

          {/* Bottom dark section */}
          <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"108mm", zIndex:10,
            display:"flex", flexDirection:"column", justifyContent:"flex-end", padding:"0 14mm 13mm 82mm" }}>
            {/* Icons */}
            <div style={{ display:"flex", gap:"5mm", marginBottom:"5mm" }}>
              {[
                "M22 12 18 12 15 21 9 3 6 12 2 12",
                undefined,
                undefined,
              ].map((_, i) => {
                const icons = [
                  <polyline key="a" points="22 12 18 12 15 21 9 3 6 12 2 12"/>,
                  <><path key="b" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle key="c" cx="12" cy="9" r="2.5"/></>,
                  <><circle key="d" cx="12" cy="12" r="10"/><line key="e" x1="2" y1="12" x2="22" y2="12"/><path key="f" d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>,
                ];
                return (
                  <svg key={i} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#bae6fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {icons[i]}
                  </svg>
                );
              })}
            </div>
            {/* Client name */}
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:"13px", fontWeight:800,
              color:"white", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"4mm" }}>
              {clientName}
            </div>
            {/* Bullets */}
            {[clientAddress ?? brand.address, `Ref: ${docNumber}`, brand.website].filter(Boolean).map((line, i) => (
              <div key={i} style={{ display:"flex", justifyContent:"flex-end", alignItems:"center", gap:"3mm", marginBottom:"1.5mm" }}>
                <span style={{ fontSize:"9.5px", color:"rgba(255,255,255,0.75)", textAlign:"right", fontWeight: 500 }}>{line}</span>
                <span style={{ width:"5px", height:"5px", background:"#7dd3fc", borderRadius:"50%", flexShrink:0 }}/>
              </div>
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════════════
            PAGE 2 — INVOICE  (wave style)
            Logo + INVOICE header · arrows + ref row
            Invoice-to · table · terms + totals
            Wave footer with contact info
        ════════════════════════════════════════════ */}
        <div className="page">
          {/* SVG waves */}
          <svg viewBox="0 0 595 842" xmlns="http://www.w3.org/2000/svg"
            style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }}>
            <defs>
              <linearGradient id="inv-tg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.9"/><stop offset="100%" stopColor="#e0f2fe" stopOpacity="0.6"/>
              </linearGradient>
              <linearGradient id="inv-bg" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.5"/><stop offset="100%" stopColor="#bae6fd" stopOpacity="0.9"/>
              </linearGradient>
              <linearGradient id="inv-navy" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#075985"/><stop offset="100%" stopColor="#0369a1"/>
              </linearGradient>
            </defs>
            <path d="M595 0 L595 215 Q490 248 360 168 Q265 106 298 0 Z" fill="url(#inv-tg)"/>
            <path d="M595 0 L595 168 Q528 185 440 125 Q370 80 398 0 Z" fill="#f0f9ff" opacity="0.5"/>
            <path d="M595 0 L595 100 Q565 118 520 85 Q495 68 510 0 Z" fill="white" opacity="0.18"/>
            <circle cx="595" cy="445" r="54" fill="#bae6fd" opacity="0.55"/>
            <circle cx="595" cy="445" r="37" fill="#7dd3fc" opacity="0.38"/>
            <path d="M0 842 L0 738 Q60 706 148 726 Q218 742 262 718 L262 842 Z" fill="url(#inv-navy)"/>
            <path d="M595 842 L595 762 Q525 732 435 750 Q348 768 265 746 L265 842 Z" fill="url(#inv-bg)"/>
            <path d="M0 738 Q60 706 148 726 Q218 742 265 718 Q348 768 435 750 Q525 732 595 762"
              fill="none" stroke="white" strokeWidth="1.2" opacity="0.22"/>
          </svg>

          {/* Header */}
          <div className="inv-header">
            <div style={{ display:"flex", alignItems:"center", gap:"3mm", zIndex:2 }}>
              <div className="inv-logo-circle">
                <img src={brand.logoSrc} alt="logo"
                  style={{ width:"7mm", height:"7mm", objectFit:"contain", filter:"brightness(0) invert(1)" }}
                  onError={e => { (e.target as HTMLImageElement).style.display="none"; }}
                />
              </div>
              <div>
                <div className="inv-brand-name">{brand.name}</div>
                <div className="inv-brand-sub">Enterprise Digital Node</div>
              </div>
            </div>
            <div className="inv-big-title">LEDGER</div>
          </div>

          {/* Arrows + ref */}
          <div className="inv-arrows-row">
            {Array.from({ length: 11 }).map((_, i) => (
              <svg key={i} width="9" height="12" viewBox="0 0 9 12" fill="none">
                <path d="M0 0 L9 6 L0 12" stroke="#0ea5e9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ))}
            <div className="inv-ref-badge">
              <div className="inv-ref-item"><strong>Node ID: </strong>{docNumber}</div>
              <div className="inv-ref-sep"/>
              <div className="inv-ref-item"><strong>Sync Date </strong>{date}</div>
            </div>
          </div>

          {/* Body */}
          <div className="inv-body">
            {/* Invoice to + slashes */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"5mm" }}>
              <div>
                <div className="inv-to-label">Target Entity:</div>
                <div className="inv-to-name">{clientName}</div>
                {clientAddress && (
                  <div className="inv-to-addr">
                    {clientAddress.split(",").map((l, i) => <div key={i}>{l.trim()}</div>)}
                  </div>
                )}
              </div>
              <div className="inv-slashes">{"/////"}</div>
            </div>

            {/* Table */}
            <table className="inv-tbl">
              <thead>
                <tr>
                  <th style={{ width:"8%" }}>U.</th>
                  <th style={{ width:"50%", textAlign:"left" }}>Deliverable Description</th>
                  <th style={{ width:"21%" }}>Rate</th>
                  <th style={{ width:"21%" }}>Valuation</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const [name, ...rest] = it.description.split("\n");
                  return (
                    <tr key={idx}>
                      <td className="inv-qty">{it.qty ?? 1}</td>
                      <td>
                        <span style={{ fontWeight:700, color:"var(--s8)" }}>{name}</span>
                        {rest.length > 0 && <div style={{ color:"var(--mist)", fontSize:"9px", marginTop:"0.5mm" }}>{rest.join(" ")}</div>}
                      </td>
                      <td>{it.price?.toLocaleString()}</td>
                      <td style={{ fontWeight:800, color:"var(--s9)" }}>{it.total?.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{ borderTop:"1px solid var(--s1)", marginBottom:"5mm" }}/>

            {/* Bottom: terms/sig + totals */}
            <div className="inv-bottom">
              <div>
                <div className="inv-terms-title">Fiscal Terms</div>
                <div className="inv-terms-body">
                  {paymentInformation
                    ? paymentInformation
                    : "Payment is due within 7 working days of document synchronization. Digital settlement preferred."}
                </div>
                <div style={{ marginTop:"10mm" }}>
                  <div className="inv-sig-line" style={{ borderColor:"var(--s5)" }}/>
                  <div className="inv-sig-name">{signatureData?.companySignatory || brand.name}</div>
                  <div className="inv-sig-role">{signatureData?.companyDesignation || "Authority Signatory"}</div>
                </div>
              </div>
              <div style={{ minWidth:"55mm" }}>
                {totals.slice(0, -1).map((t, i) => (
                  <div key={i} className="inv-tot-row">
                    <span className="inv-tot-label">{t.label}</span>
                    <span className="inv-tot-val" style={{ color:"var(--s8)" }}>{t.value}</span>
                  </div>
                ))}
                {totals.length > 0 && (
                  <>
                    <div style={{ borderTop:"1.5px solid var(--s5)", margin:"2mm 0" }}/>
                    <div className="inv-grand-row">
                      <span className="inv-grand-label">Aggregate Value</span>
                      <span className="inv-grand-val">{totals[totals.length - 1].value}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Footer on wave */}
          <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"27mm",
            display:"flex", alignItems:"center", justifyContent:"flex-end",
            padding:"0 14mm", zIndex:5 }}>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:"9.5px", fontWeight:800, color:"white", marginBottom:"1mm" }}>
                {brand.address}
              </div>
              <div style={{ fontSize:"9px", color:"rgba(255,255,255,0.9)", marginBottom:"0.5mm", fontWeight: 600 }}>{brand.phone}</div>
              <div style={{ fontSize:"9px", color:"rgba(255,255,255,0.9)", fontWeight: 600 }}>{brand.website}</div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════
            PAGE 3 — MODULES
        ════════════════════════════════════════════ */}
        {sections && sections.length > 0 && (
          <div className="page">
            <PgHeader num="03" kicker="Scope of Work" title="Integrated Software Modules"/>
            <div className="mod-body">
              {sections.map((s, idx) => (
                <div key={idx} className="mod-card">
                  <div className="mod-badge">{String(idx + 1).padStart(2, "0")}</div>
                  <div style={{ flex:1 }}>
                    <div className="mod-title" style={{ color:"var(--s8)" }}>{s.heading}</div>
                    <div className="mod-body-txt ql-editor p-0" style={{ color:"var(--mist)" }} dangerouslySetInnerHTML={{ __html: s.content }}/>
                  </div>
                </div>
              ))}
            </div>
            <PgFooter label="Modules" pg={3}/>
          </div>
        )}

        {/* ════════════════════════════════════════════
            PAGE 4 — TIMELINE
            CSS-only vertical connector (no SVG column)
        ════════════════════════════════════════════ */}
        {(timeframeStartDate || timeframeDays || timeframe) && (
          <div className="page">
            <PgHeader num="04" kicker="Execution Plan" title="Operational Roadmap"/>

            <div className="tl-stats-band">
              <div className="tl-stat">
                <div className="tl-stat-lb">Commencement</div>
                <div className="tl-stat-vl" style={{ fontSize:"13px", color:"var(--s7)" }}>{fmtStart || "—"}</div>
              </div>
              <div className="tl-stat">
                <div className="tl-stat-lb">Duration</div>
                <div className="tl-stat-vl" style={{ color:"var(--s8)" }}>{timeframeDays || "—"}</div>
                <div className="tl-stat-sub">working days</div>
              </div>
              <div className="tl-stat">
                <div className="tl-stat-lb">Target Delivery</div>
                <div className="tl-stat-vl" style={{ fontSize:"13px", color:"var(--s7)" }}>{fmtEnd || "—"}</div>
              </div>
            </div>

            {timeframe ? (
              <div style={{ padding:"8mm 16mm 18mm" }}>
                <div className="ql-editor p-0"
                  style={{ fontSize:"10.5px", color:"var(--ink)", lineHeight:1.75 }}
                  dangerouslySetInnerHTML={{ __html: timeframe }}/>
              </div>
            ) : (
              <div className="tl-body">
                {[
                  { n:1, title:"Infrastructure Discovery", period:"Cycle 1",
                    desc:"Comprehensive audit of existing digital assets, stakeholder mapping, and technical architecture finalization." },
                  { n:2, title:"System Integration", period:"Cycle 2",
                    desc:"Core module deployment, database configuration, and secure protocol implementation across the enterprise." },
                  { n:3, title:"Validation & QA", period:"Cycle 3",
                    desc:"Rigorous testing of all system nodes, data integrity validation, and final quality assurance audits." },
                  { n:4, title:"Operational Handover", period:"Cycle 4",
                    desc:"End-user training modules, system documentation transfer, and official production environment go-live." },
                  { n:5, title:"Maintenance Support", period:"Continuous",
                    desc:"Proactive monitoring, periodic security updates, and dedicated technical support for all system modules." },
                ].map((ph, i, arr) => (
                  <div key={i} className="tl-item">
                    <div className="tl-connector">
                      <div className="tl-dot">{ph.n}</div>
                      {i < arr.length - 1 && <div className="tl-line"/>}
                    </div>
                    <div className="tl-card">
                      <div className="tl-ph-title">
                        {ph.title}
                        <span className="tl-ph-period" style={{ color:"var(--s5)" }}>— {ph.period}</span>
                      </div>
                      <div className="tl-ph-desc">{ph.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <PgFooter label="Timeline" pg={4}/>
          </div>
        )}

        {/* ════════════════════════════════════════════
            PAGE 5 — TERMS & CONDITIONS
        ════════════════════════════════════════════ */}
        {(paymentInformation || termsText) && (
          <div className="page">
            <PgHeader num="05" kicker="Legal Framework" title="Governance & Terms"/>
            <DotGrid/>
            <div className="terms-body">
              <div className="terms-grid">
                {paymentInformation && (
                  <div>
                    <div className="terms-col-head" style={{ color:"var(--s7)", borderBottomColor:"var(--s3)" }}>Fiscal Protocol</div>
                    <div className="terms-txt">
                      {/* Milestone rows if paymentInformation contains structured lines */}
                      {paymentInformation.split("\n").filter(Boolean).map((line, i) => {
                        const hasDash = line.includes("—") || line.includes("-");
                        if (hasDash) {
                          const parts = line.split(/[—\-]/);
                          return (
                            <div key={i} className="pay-row" style={{ background:"var(--s0)" }}>
                              <span className="pay-row-lb">{parts[0]?.trim()}</span>
                              <span className="pay-row-vl" style={{ color:"var(--s8)" }}>{parts.slice(1).join("—").trim()}</span>
                            </div>
                          );
                        }
                        return <p key={i} style={{ marginTop:"4mm", fontSize:"10px", lineHeight:1.8, color:"var(--mist)" }}>{line}</p>;
                      })}
                    </div>
                  </div>
                )}
                {termsText && (
                  <div>
                    <div className="terms-col-head" style={{ color:"var(--s7)", borderBottomColor:"var(--s3)" }}>Service Agreement</div>
                    <div className="terms-txt">
                      {termsText.split(/\n\n+/).map((block, i) => {
                        const isNumbered = /^\d+\./.test(block.trim());
                        if (isNumbered) {
                          const [titlePart, ...rest] = block.split(/[:\.]\s+/);
                          return (
                            <div key={i} className="clause">
                              <div className="clause-title" style={{ color:"var(--s7)" }}>{titlePart?.trim()}</div>
                              <div className="clause-body" style={{ color:"var(--mist)" }}>{rest.join(". ").trim()}</div>
                            </div>
                          );
                        }
                        return <p key={i} style={{ fontSize:"10px", color:"var(--mist)", marginBottom:"3mm", lineHeight:1.8 }}>{block}</p>;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <PgFooter label="Terms" pg={5}/>
          </div>
        )}

        {/* ════════════════════════════════════════════
            PAGE 6 — SIGNATURES
        ════════════════════════════════════════════ */}
        <div className="page sig-page">
          {/* Ambient blobs */}
          <div style={{ position:"absolute", top:"-10mm", right:"-10mm", width:"55mm", height:"55mm",
            background:"radial-gradient(circle,rgba(14,165,233,0.12) 0%,transparent 70%)", borderRadius:"50%", zIndex:0 }}/>
          <div style={{ position:"absolute", bottom:"-10mm", left:"-10mm", width:"45mm", height:"45mm",
            background:"radial-gradient(circle,rgba(56,189,248,0.1) 0%,transparent 70%)", borderRadius:"50%", zIndex:0 }}/>

          <div className="sig-top-band">
            <div className="sig-kicker">Authorization &amp; Execution</div>
            <div className="sig-title">Authority Handover</div>
          </div>

          <div className="sig-body">
            <p className="sig-agree">
              This document constitutes a formal agreement between{" "}
              <strong style={{ color:"var(--s7)" }}>{brand.name}</strong> and <strong style={{ color:"var(--s7)" }}>{clientName}</strong>.{" "}
              Execution of signatures confirms unconditional acceptance of all digital nodes,
              operational cycles, and fiscal valuations outlined within this document.
            </p>

            <SigWave/>

            <div className="sig-cards">
              {/* Service provider */}
              <div className="sig-card">
                <div className="sig-card-top">Authority Node</div>
                <div className="sig-card-body">
                  <div className="sig-write-area"><span className="sig-write-hint">Digital Key / Signature</span></div>
                  <div className="sig-name">{signatureData?.companySignatory || "Authority Signatory"}</div>
                  <div className="sig-role" style={{ color:"var(--s5)", fontWeight:600 }}>{signatureData?.companyDesignation}</div>
                  <div className="sig-co" style={{ color:"var(--mist)" }}>{signatureData?.companyName || brand.name}</div>
                </div>
              </div>
              {/* Client */}
              <div className="sig-card">
                <div className="sig-card-top">Target Node</div>
                <div className="sig-card-body">
                  <div className="sig-write-area"><span className="sig-write-hint">Digital Key / Signature</span></div>
                  <div className="sig-name">{signatureData?.clientSignatory || "Authorized Entity"}</div>
                  <div className="sig-role" style={{ color:"var(--s5)", fontWeight:600 }}>{signatureData?.clientDesignation || "Official Representative"}</div>
                  <div className="sig-co" style={{ color:"var(--mist)" }}>{signatureData?.clientName || clientName}</div>
                </div>
              </div>
            </div>

            <div className="sig-footer">
              <div className="sig-footer-brand" style={{ color:"var(--s3)", opacity:0.6 }}>{brand.name}</div>
              <div className="sig-footer-meta">
                <div>Node Ref: {docNumber}</div>
                <div>Sync: {date}</div>
                <div>{brand.website}</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  }
);
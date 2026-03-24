import React, { forwardRef, useEffect } from "react";
import { Briefcase, MapPin, Users, DollarSign, Clock, Sparkles, CheckCircle2 } from "lucide-react";

type Props = {
  title: string;
  department?: string;
  location?: string;
  type?: string;
  salary?: string;
  openings?: number;
  description?: string;
  requirements?: string[];
  benefits?: string[];
  enrollmentUrl?: string;
  brandName?: string;
  logoSrc?: string;
  postedDate?: string;
  applyUrl?: string;
  primaryColor?: string;
  accentColor?: string;
};

export const JobPosterTemplate = forwardRef<HTMLDivElement, Props>(function JobPosterTemplate(
  {
    title,
    department,
    location,
    type,
    salary,
    openings,
    description,
    requirements = [],
    benefits = [],
    enrollmentUrl,
    brandName = "Mindspire",
    logoSrc,
    postedDate,
    applyUrl = "career.mindspire.org",
    primaryColor = "#4f46e5",
    accentColor = "#7c3aed",
  },
  ref
) {
  useEffect(() => {
    const id = "job-poster-fonts";
    if (typeof document === "undefined") return;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&family=Syne:wght@700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(link);
  }, []);

  const visibleReqs = requirements.slice(0, 6);
  const visibleBenefits = benefits.slice(0, 5);

  const mainQrLink = enrollmentUrl || applyUrl;
  
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
    mainQrLink.startsWith("http") ? mainQrLink : `https://${mainQrLink}`
  )}`;

  return (
    <div ref={ref} className="job-poster-root">
      <style>{`
        @font-face {
          font-family: 'Gondens DEMO';
          src: url('/fonts/Gondens DEMO.otf') format('opentype');
          font-weight: normal;
          font-style: normal;
        }
        @font-face {
          font-family: 'Moralana';
          src: url('/fonts/Moralana.otf') format('opentype');
          font-weight: normal;
          font-style: normal;
        }

        .job-poster-root {
          width: 210mm;
          height: 297mm;
          max-height: 297mm;
          background: #ffffff;
          margin: 0 auto;
          position: relative;
          overflow: hidden;
          font-family: 'Poppins', sans-serif;
          color: #0f172a;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }

        /* Premium Mesh Background */
        .jp-mesh-bg {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 140mm;
          background-color: #0f172a;
          background-image: 
            radial-gradient(at 0% 0%, ${primaryColor}33 0, transparent 50%),
            radial-gradient(at 100% 0%, ${accentColor}22 0, transparent 50%),
            radial-gradient(at 100% 100%, ${primaryColor}11 0, transparent 50%),
            radial-gradient(at 0% 100%, ${accentColor}33 0, transparent 50%);
          z-index: 1;
        }
        
        .jp-mesh-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; height: 140mm;
          background: linear-gradient(to bottom, transparent, #ffffff);
          z-index: 2;
        }

        .jp-container {
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 15mm 20mm 12mm;
          box-sizing: border-box;
          overflow: hidden;
        }

        /* Header */
        .jp-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18mm;
        }
        .jp-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .jp-logo-box {
          width: 52px; height: 52px;
          background: #ffffff;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px;
          box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }
        .jp-logo-img {
          width: 100%; height: 100%;
          object-fit: contain;
        }
        .jp-brand-name {
          font-family: 'Poppins', sans-serif;
          font-size: 26px;
          font-weight: 900;
          color: #ffffff;
          letter-spacing: -1px;
          text-transform: uppercase;
        }
        .jp-badge {
          background: ${primaryColor};
          color: #ffffff;
          padding: 10px 24px;
          border-radius: 99px;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 2px;
          box-shadow: 0 10px 20px ${primaryColor}44;
        }

        /* Hero */
        .jp-hero {
          margin-bottom: 20mm;
          text-align: center;
          position: relative;
          z-index: 5;
          display: flex;
          flex-direction: column;
          align-items: center;
          max-height: 120mm;
          overflow: hidden;
        }
        .jp-pre-title {
          font-family: 'Poppins', sans-serif;
          font-size: 14px;
          font-weight: 900;
          color: ${primaryColor};
          text-transform: uppercase;
          letter-spacing: 6px;
          margin-bottom: 20px;
          line-height: 1;
        }
        .jp-title {
          font-family: 'Poppins', sans-serif;
          font-size: 100px;
          font-weight: 900;
          line-height: 0.9;
          letter-spacing: -2px;
          color: #ffffff;
          margin: 0;
          text-transform: uppercase;
          text-shadow: 0 10px 20px rgba(0,0,0,0.2);
          display: block;
          max-width: 100%;
          word-wrap: break-word;
        }

        /* Info Grid */
        .jp-info-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 5mm;
          margin-top: -8mm;
          margin-bottom: 18mm;
        }
        .jp-info-card {
          background: #ffffff;
          border: 1px solid #f1f5f9;
          border-radius: 20px;
          padding: 24px 15px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          box-shadow: 0 12px 25px rgba(0,0,0,0.04);
          transition: transform 0.3s ease;
        }
        .jp-info-icon {
          width: 36px; height: 36px;
          background: ${primaryColor}11;
          color: ${primaryColor};
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 15px;
        }
        .jp-info-label {
          font-size: 9px;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 6px;
        }
        .jp-info-value {
          font-family: 'Poppins', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.2;
        }

        /* Body Content */
        .jp-body {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 15mm;
          flex: 1;
          overflow: hidden;
          min-height: 0; /* Important for flex overflow */
        }
        .jp-section-title {
          font-family: 'Poppins', sans-serif;
          font-size: 21px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 8mm;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .jp-section-title::before {
          content: '';
          width: 5px; height: 22px;
          background: ${primaryColor};
          border-radius: 4px;
        }
        
        .jp-desc {
          font-family: 'Poppins', sans-serif;
          font-size: 15px;
          line-height: 1.7;
          color: #475569;
          font-weight: 500;
          margin-bottom: 12mm;
          padding-left: 2px;
        }

        .jp-list {
          font-family: 'Poppins', sans-serif;
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding-left: 2px;
        }
        .jp-item {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }
        .jp-check {
          width: 20px; height: 20px;
          background: #f0fdf4;
          color: #16a34a;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .jp-item-text {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
          line-height: 1.5;
        }

        /* Sidebar - Benefits */
        .jp-sidebar {
          background: #f8fafc;
          border-radius: 28px;
          padding: 28px;
          border: 1px solid #f1f5f9;
          height: fit-content;
        }
        .jp-benefit {
          background: #ffffff;
          border-radius: 14px;
          padding: 14px 18px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.02);
        }
        .jp-benefit-icon {
          width: 18px; height: 18px;
          color: ${primaryColor};
        }
        .jp-benefit-text {
          font-family: 'Poppins', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: #334155;
          line-height: 1.3;
        }

        /* Footer / QR Area */
        .jp-footer {
          margin-top: auto;
          background: #0f172a;
          border-radius: 40px;
          padding: 30px 45px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #ffffff;
          box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.5);
          min-height: 140px;
          position: relative;
          overflow: hidden;
        }
        .jp-footer-glow {
          position: absolute;
          top: 0; right: 0;
          width: 200px; height: 200px;
          background: radial-gradient(circle, ${primaryColor}20 0%, transparent 70%);
          z-index: 1;
        }

        .jp-qr-main-wrap {
          display: flex;
          align-items: center;
          gap: 35px;
          position: relative;
          z-index: 2;
        }
        .jp-qr-frame {
          width: 100px; height: 100px;
          background: #ffffff;
          border-radius: 24px;
          padding: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          flex-shrink: 0;
          transform: rotate(-2deg);
        }
        .jp-qr-frame img { width: 100%; height: 100%; }
        
        .jp-cta-text {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .jp-cta-badge {
          font-family: 'Poppins', sans-serif;
          font-size: 14px;
          color: ${primaryColor};
          font-weight: 900;
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        .jp-cta-main {
          font-family: 'Poppins', sans-serif;
          font-size: 42px;
          font-weight: 900;
          line-height: 0.9;
          letter-spacing: -2px;
          text-transform: uppercase;
        }

        .jp-enroll-button-wrap {
          position: relative;
          z-index: 2;
        }
        .jp-enroll-pill {
          background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%);
          padding: 18px 35px;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
          box-shadow: 0 10px 20px rgba(0,0,0,0.2);
          transition: transform 0.3s ease;
        }
        .jp-enroll-pill:hover { transform: translateY(-2px); }
        .jp-enroll-pill-tag {
          font-size: 10px;
          font-weight: 800;
          color: rgba(255,255,255,0.8);
          text-transform: uppercase;
          letter-spacing: 1.5px;
        }
        .jp-enroll-pill-val {
          font-family: 'Poppins', sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: #ffffff;
        }

        .jp-bottom-line {
          display: flex;
          justify-content: space-between;
          padding: 15px 20px 0;
          font-size: 10px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 2px;
        }
      `}</style>

      <div className="jp-mesh-bg" />
      <div className="jp-mesh-overlay" />

      <div className="jp-container">
        <header className="jp-header">
          <div className="jp-brand">
            <div className="jp-logo-box">
              {logoSrc ? (
                <img src={logoSrc} alt={brandName} className="jp-logo-img" />
              ) : (
                <Sparkles className="text-indigo-600 w-6 h-6" />
              )}
            </div>
            <span className="jp-brand-name">{brandName}</span>
          </div>
          <div className="jp-badge">Join Our Team</div>
        </header>

        <section className="jp-hero">
          <div className="jp-pre-title">Career Opportunity</div>
          <h1 className="jp-title">{title}</h1>
        </section>

        <div className="jp-info-grid">
          <div className="jp-info-card">
            <div className="jp-info-icon"><MapPin className="w-5 h-5" /></div>
            <span className="jp-info-label">Location</span>
            <span className="jp-info-value">{location || "Remote"}</span>
          </div>
          <div className="jp-info-card">
            <div className="jp-info-icon"><Clock className="w-5 h-5" /></div>
            <span className="jp-info-label">Job Type</span>
            <span className="jp-info-value">{type || "Full-Time"}</span>
          </div>
          <div className="jp-info-card">
            <div className="jp-info-icon"><DollarSign className="w-5 h-5" /></div>
            <span className="jp-info-label">Salary</span>
            <span className="jp-info-value">{salary || "Competitive"}</span>
          </div>
          <div className="jp-info-card">
            <div className="jp-info-icon"><Users className="w-5 h-5" /></div>
            <span className="jp-info-label">Openings</span>
            <span className="jp-info-value">{openings || 1} Position(s)</span>
          </div>
        </div>

        <main className="jp-body">
          <div className="jp-left">
            <h2 className="jp-section-title">About the Role</h2>
            <div className="jp-desc">
              {description || "We are looking for a passionate individual to join our growing team and help us build the future of our platform."}
            </div>

            {visibleReqs.length > 0 && (
              <>
                <h2 className="jp-section-title">Key Requirements</h2>
                <div className="jp-list">
                  {visibleReqs.map((req, i) => (
                    <div key={i} className="jp-item">
                      <div className="jp-check">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <span className="jp-item-text">{req}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <aside className="jp-sidebar">
            <h2 className="jp-section-title" style={{ fontSize: '18px' }}>Perks & Benefits</h2>
            <div className="jp-benefits-list">
              {(visibleBenefits.length > 0 ? visibleBenefits : ["Health Insurance", "Remote Work", "Annual Bonus", "Learning Budget"]).map((benefit, i) => (
                <div key={i} className="jp-benefit">
                  <Sparkles className="jp-benefit-icon" />
                  <span className="jp-benefit-text">{benefit}</span>
                </div>
              ))}
            </div>
            
            <div style={{ marginTop: '20px', padding: '15px', background: '#ffffff', borderRadius: '20px', fontSize: '12px', color: '#64748b', fontWeight: 600, lineHeight: 1.5 }}>
              Be part of a team that values innovation, creativity, and your professional growth.
            </div>
          </aside>
        </main>

        <footer className="jp-footer">
          <div className="jp-footer-glow" />
          
          <div className="jp-qr-main-wrap">
            <div className="jp-qr-frame">
              <img src={qrUrl} alt="Apply QR" />
            </div>
            <div className="jp-cta-text">
              <span className="jp-cta-badge">Scan to Enroll</span>
              <span className="jp-cta-main">Apply Now</span>
            </div>
          </div>

          <div className="jp-enroll-button-wrap">
            <div className="jp-enroll-pill">
              <span className="jp-enroll-pill-tag">Portal Access</span>
              <span className="jp-enroll-pill-val">{enrollmentUrl?.replace(/^https?:\/\//, '').split('/')[0]}</span>
            </div>
          </div>
        </footer>

        <div className="jp-bottom-line">
          <span>Posted on {postedDate || "Recently"}</span>
          <span>{brandName} • Official Recruitment Portal</span>
        </div>
      </div>
    </div>
  );
});

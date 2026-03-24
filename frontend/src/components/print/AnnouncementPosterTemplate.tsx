import React, { forwardRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Megaphone, Calendar, User, Sparkles } from "lucide-react";

type Props = {
  title: string;
  message?: string;
  date?: string;
  author?: string;
  brandName?: string;
  logoSrc?: string;
  announcementNumber?: string | number;
};

export const AnnouncementPosterTemplate = forwardRef<HTMLDivElement, Props>(function AnnouncementPosterTemplate(
  { title, message, date, author, brandName = "HealthSpire", logoSrc = "/HealthSpire%20logo.png", announcementNumber },
  ref
) {
  useEffect(() => {
    const id = "hs-poster-fonts";
    if (typeof document === "undefined") return;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&family=Playfair+Display:wght@700;900&display=swap";
    document.head.appendChild(link);
  }, []);

  return (
    <div ref={ref} className="announcement-poster-root">
      <style>{`
        .announcement-poster-root {
          width: 210mm;
          height: 297mm;
          background: #ffffff;
          margin: 0 auto;
          position: relative;
          overflow: hidden;
          font-family: 'Montserrat', sans-serif;
          color: #1e293b;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .poster-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
        }

        .poster-bg-shape-1 {
          position: absolute;
          top: -100px;
          right: -100px;
          width: 500px;
          height: 500px;
          background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
          border-radius: 50%;
          opacity: 0.1;
          filter: blur(60px);
        }

        .poster-bg-shape-2 {
          position: absolute;
          bottom: -150px;
          left: -150px;
          width: 600px;
          height: 600px;
          background: linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%);
          border-radius: 50%;
          opacity: 0.1;
          filter: blur(80px);
        }

        .poster-accent-bar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 12px;
          background: linear-gradient(90deg, #7c3aed, #0ea5e9, #10b981);
        }

        .poster-content {
          position: relative;
          z-index: 10;
          height: 100%;
          padding: 25mm 20mm;
          display: flex;
          flex-direction: column;
        }

        .poster-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20mm;
        }

        .poster-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .poster-logo {
          height: 50px;
          width: auto;
        }

        .poster-brand-name {
          font-weight: 800;
          font-size: 24px;
          letter-spacing: -0.5px;
          color: #1e293b;
        }

        .poster-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #f1f5f9;
          padding: 8px 16px;
          border-radius: 999px;
          font-weight: 700;
          font-size: 14px;
          color: #4f46e5;
          text-transform: uppercase;
          letter-spacing: 1px;
          border: 1px solid #e2e8f0;
        }

        .poster-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          text-align: center;
        }

        .poster-title-container {
          margin-bottom: 15mm;
        }

        .poster-title {
          font-family: 'Playfair Display', serif;
          font-size: 72px;
          font-weight: 900;
          line-height: 1.1;
          color: #0f172a;
          margin-bottom: 10mm;
          text-wrap: balance;
        }

        .poster-message {
          font-size: 22px;
          line-height: 1.6;
          color: #334155;
          max-width: 90%;
          margin: 0 auto;
          text-wrap: balance;
        }

        .poster-footer {
          margin-top: auto;
          padding-top: 20mm;
          border-top: 1px solid #f1f5f9;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        .poster-meta-item {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #64748b;
        }

        .poster-meta-icon {
          width: 44px;
          height: 44px;
          background: #f8fafc;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #4f46e5;
          border: 1px solid #f1f5f9;
        }

        .poster-meta-label {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 2px;
        }

        .poster-meta-value {
          font-size: 16px;
          font-weight: 700;
          color: #1e293b;
        }

        .poster-decoration-1 {
          position: absolute;
          top: 15%;
          left: 10%;
          color: #7c3aed;
          opacity: 0.2;
        }

        .poster-decoration-2 {
          position: absolute;
          bottom: 20%;
          right: 10%;
          color: #0ea5e9;
          opacity: 0.2;
        }

        @media print {
          body { margin: 0; }
          .announcement-poster-root {
            width: 100%;
            height: 100vh;
            border: none;
            box-shadow: none;
          }
        }
      `}</style>

      <div className="poster-accent-bar" />
      
      <div className="poster-bg">
        <div className="poster-bg-shape-1" />
        <div className="poster-bg-shape-2" />
      </div>

      <div className="poster-decoration-1">
        <Sparkles size={48} />
      </div>
      <div className="poster-decoration-2">
        <Megaphone size={48} />
      </div>

      <div className="poster-content">
        <div className="poster-header">
          <div className="poster-brand">
            <img src={logoSrc} alt="logo" className="poster-logo" />
            <span className="poster-brand-name">{brandName}</span>
          </div>
          <div className="poster-badge">
            <Megaphone size={16} />
            <span>Announcement {announcementNumber ? `#${announcementNumber}` : ""}</span>
          </div>
        </div>

        <div className="poster-body">
          <div className="poster-title-container">
            <h1 className="poster-title">{title}</h1>
          </div>
          
          <div className="poster-message">
            {message ? (
              <div dangerouslySetInnerHTML={{ __html: message }} />
            ) : (
              <p>Special announcement from our team. Please check the details for more information.</p>
            )}
          </div>
        </div>

        <div className="poster-footer">
          <div className="poster-meta-item">
            <div className="poster-meta-icon">
              <Calendar size={20} />
            </div>
            <div>
              <div className="poster-meta-label">Date Published</div>
              <div className="poster-meta-value">{date || new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <div className="poster-meta-item">
            <div className="poster-meta-icon">
              <User size={20} />
            </div>
            <div>
              <div className="poster-meta-label">Issued By</div>
              <div className="poster-meta-value">{author || "Management Team"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

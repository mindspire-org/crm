import { useRef, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { JobPosterTemplate } from "@/components/print/JobPosterTemplate";
import { useSettings } from "@/hooks/useSettings";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Printer,
  Share2,
  Download,
  Loader2,
  FileImage,
  FileType,
  FileText,
  Link as LinkIcon,
  Settings,
  Pencil,
} from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function JobPoster() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const posterRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/jobs/${id}`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const json = await res.json();
          setJob(json);
        }
      } catch (e) {
        console.error("Failed to load job", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handlePrint = () => window.print();

  const handleCopyLink = (url: string, label: string) => {
    navigator.clipboard.writeText(url);
    toast.success(`${label} link copied to clipboard!`);
  };

  const handleDownload = async (format: "png" | "jpg" | "pdf") => {
    if (!posterRef.current || !job) return;
    try {
      setSharing(true);
      const canvas = await html2canvas(posterRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });
      const fileName = `job-poster-${(job.title || "job").replace(/\s+/g, "-").toLowerCase()}`;
      if (format === "pdf") {
        const imgData = canvas.toDataURL("image/jpeg", 1.0);
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${fileName}.pdf`);
      } else {
        const mimeType = format === "png" ? "image/png" : "image/jpeg";
        const link = document.createElement("a");
        link.download = `${fileName}.${format}`;
        link.href = canvas.toDataURL(mimeType, 1.0);
        link.click();
      }
      toast.success(`Poster downloaded as ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Error downloading poster:", error);
      toast.error("Failed to download poster");
    } finally {
      setSharing(false);
    }
  };

  const handleWhatsAppShare = async () => {
    if (!job) return;
    try {
      setSharing(true);
      const canvas = await html2canvas(posterRef.current!, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png", 0.9)
      );
      if (!blob) throw new Error("Failed to generate image");
      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [new File([blob], "job.png", { type: "image/png" })] })
      ) {
        const file = new File(
          [blob],
          `job-${(job.title || "job").replace(/\s+/g, "-")}.png`,
          { type: "image/png" }
        );
        await navigator.share({ files: [file], title: job.title, text: `We're hiring: ${job.title}` });
      } else {
        const text = `🚀 *We're Hiring!*\n\n*Position:* ${job.title}\n*Department:* ${job.department}\n*Type:* ${job.type}\n*Location:* ${job.location}\n\nApply at career.mindspire.org`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
        toast.info("Image sharing not supported. Opening WhatsApp with text link.");
      }
    } catch (error) {
      console.error("Error sharing:", error);
      toast.error("Failed to share");
    } finally {
      setSharing(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
            Loading Poster...
          </p>
        </div>
      </div>
    );

  if (!job)
    return (
      <div className="p-8 text-center font-bold text-slate-400">Job not found</div>
    );

  const brandLogo = settings?.general?.logoUrl
    ? settings.general.logoUrl.startsWith("http")
      ? settings.general.logoUrl
      : `${API_BASE}${settings.general.logoUrl}`
    : undefined;

  const brandName = settings?.general?.companyName || "HealthSpire";
  const primaryColor = settings?.general?.primaryColor || "#4f46e5";
  const accentColor = settings?.general?.accentColor || "#7c3aed";
  const cleanDomain = (settings?.general?.domain || "")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  const applyUrl = cleanDomain
    ? `https://${cleanDomain}/public/jobs/${id}/apply`
    : `${window.location.origin}/public/jobs/${id}/apply`;
  const enrollmentUrl = cleanDomain
    ? `https://${cleanDomain}/public/jobs/${id}/enroll`
    : `${window.location.origin}/public/jobs/${id}/enroll`;

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .poster-outer-container, .poster-outer-container * { visibility: visible !important; }
          .poster-outer-container {
            position: fixed !important;
            left: 0 !important; top: 0 !important;
            width: 210mm !important; height: 297mm !important;
            padding: 0 !important; margin: 0 !important;
            border: none !important; box-shadow: none !important;
            background: white !important; z-index: 9999 !important;
          }
          body { padding: 0 !important; margin: 0 !important; background: white !important; }
          .no-print { display: none !important; }
          @page { size: A4; margin: 0; }
        }
      `}</style>

      <div className="max-w-[210mm] mx-auto space-y-6">
        {/* Toolbar */}
        <div className="no-print flex items-center justify-between bg-white/80 backdrop-blur p-4 rounded-2xl border border-slate-200 shadow-sm">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="rounded-xl font-bold uppercase text-[10px] tracking-widest"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/hrm/recruitment")}
              className="rounded-xl border-slate-200 bg-white font-bold uppercase text-[10px] tracking-widest shadow-sm hover:bg-slate-50"
            >
              <Settings className="w-4 h-4 mr-2 text-slate-500" />
              Manage All
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/hrm/recruitment", { state: { editJobId: id } })}
              className="rounded-xl border-slate-200 bg-white font-bold uppercase text-[10px] tracking-widest shadow-sm hover:bg-slate-50"
            >
              <Pencil className="w-4 h-4 mr-2 text-indigo-500" />
              Edit Job
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={sharing}
                  className="rounded-xl border-slate-200 bg-white font-bold uppercase text-[10px] tracking-widest shadow-sm"
                >
                  {sharing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Download
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl border-slate-200 shadow-xl">
                <DropdownMenuItem
                  onClick={() => handleDownload("png")}
                  className="flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest"
                >
                  <FileImage className="w-4 h-4 text-blue-500" />
                  Save as PNG
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDownload("jpg")}
                  className="flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest"
                >
                  <FileType className="w-4 h-4 text-amber-500" />
                  Save as JPG
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDownload("pdf")}
                  className="flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest"
                >
                  <FileText className="w-4 h-4 text-red-500" />
                  Save as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopyLink(enrollmentUrl, "Enrollment Form")}
              className="rounded-xl border-indigo-200 bg-indigo-50 text-indigo-700 font-bold uppercase text-[10px] tracking-widest hover:bg-indigo-100"
            >
              <LinkIcon className="w-4 h-4 mr-2" />
              Copy Form URL
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleWhatsAppShare}
              disabled={sharing}
              className="rounded-xl border-emerald-200 bg-emerald-50 text-emerald-700 font-bold uppercase text-[10px] tracking-widest hover:bg-emerald-100"
            >
              {sharing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Share2 className="w-4 h-4 mr-2" />
              )}
              WhatsApp
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handlePrint}
              className="rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print / PDF
            </Button>
          </div>
        </div>

        {/* Poster */}
        <div className="poster-outer-container bg-white shadow-2xl rounded-3xl overflow-hidden mx-auto border border-slate-200">
          <JobPosterTemplate
            ref={posterRef}
            title={job.title}
            department={job.department}
            location={job.location}
            type={job.type}
            salary={job.salary}
            openings={job.openings}
            description={job.description}
            requirements={job.requirements || []}
            benefits={job.benefits || []}
            brandName={brandName}
            logoSrc={brandLogo}
            primaryColor={primaryColor}
            accentColor={accentColor}
            applyUrl={applyUrl}
            enrollmentUrl={enrollmentUrl}
            postedDate={
              job.posted
                ? new Date(job.posted).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}

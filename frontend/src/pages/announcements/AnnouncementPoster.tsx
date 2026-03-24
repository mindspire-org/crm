import { useRef, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AnnouncementPosterTemplate } from "@/components/print/AnnouncementPosterTemplate";
import { useSettings } from "@/hooks/useSettings";
import { API_BASE } from "@/lib/api/base";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Share2, Download, Loader2, FileImage, FileType, FileText } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function AnnouncementPoster() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const posterRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
        const res = await fetch(`${API_BASE}/api/announcements/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          setItem(json);
        }
      } catch (e) {
        console.error("Failed to load announcement", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async (format: 'png' | 'jpg' | 'pdf') => {
    if (!posterRef.current || !item) return;

    try {
      setSharing(true);
      const canvas = await html2canvas(posterRef.current, {
        scale: 3, // High quality for downloads
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff"
      });

      const fileName = `announcement-${item.title.replace(/\s+/g, '-').toLowerCase()}`;

      if (format === 'pdf') {
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${fileName}.pdf`);
      } else {
        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        const link = document.createElement('a');
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
    if (!posterRef.current || !item) return;

    try {
      setSharing(true);
      // Generate canvas from the poster element
      const canvas = await html2canvas(posterRef.current, {
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff"
      });

      // Convert to blob
      const blob = await new Promise<Blob | null>((resolve) => 
        canvas.toBlob((b) => resolve(b), "image/png", 0.9)
      );

      if (!blob) throw new Error("Failed to generate image");

      // Check if Web Share API is available for files
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], "announcement.png", { type: "image/png" })] })) {
        const file = new File([blob], `announcement-${item.title.replace(/\s+/g, '-')}.png`, { type: "image/png" });
        await navigator.share({
          files: [file],
          title: item.title,
          text: `Check out this announcement: ${item.title}`
        });
      } else {
        // Fallback: Upload to server or just provide WhatsApp link with text
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`📢 *${item.title}*\n\nCheck out this announcement in the portal.`)}`;
        window.open(whatsappUrl, '_blank');
        toast.info("Image sharing not supported on this browser. Opening WhatsApp with text link.");
      }
    } catch (error) {
      console.error("Error sharing to WhatsApp:", error);
      toast.error("Failed to share to WhatsApp");
    } finally {
      setSharing(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-slate-500 tracking-tight uppercase italic">Synthesizing Poster Data...</p>
      </div>
    </div>
  );

  if (!item) return <div className="p-8 text-center">Announcement not found</div>;

  const brandLogo = (settings as any)?.company?.logo 
    ? ((settings as any).company.logo.startsWith('http') ? (settings as any).company.logo : `${API_BASE}${(settings as any).company.logo}`)
    : undefined;

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <style>{`
        @media print {
          /* Hide everything by default */
          body * { visibility: hidden !important; }
          /* Only show the poster container and its children */
          .poster-outer-container, .poster-outer-container * { visibility: visible !important; }
          
          /* Position the poster correctly for print */
          .poster-outer-container {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            z-index: 9999 !important;
          }

          /* Ensure body doesn't add extra space */
          body { 
            padding: 0 !important; 
            margin: 0 !important; 
            background: white !important; 
          }
          
          .no-print { display: none !important; }
          .min-h-screen { min-height: 0 !important; height: auto !important; background: white !important; }
          @page { size: A4; margin: 0; }
        }
      `}</style>

      <div className="max-w-[210mm] mx-auto space-y-6">
        <div className="flex items-center justify-between no-print bg-white/80 backdrop-blur p-4 rounded-2xl border border-slate-200 shadow-sm">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="rounded-xl font-bold uppercase text-[10px] tracking-widest">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={sharing}
                  className="rounded-xl border-slate-200 bg-white font-bold uppercase text-[10px] tracking-widest shadow-sm"
                >
                  {sharing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  Download
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl border-slate-200 shadow-xl">
                <DropdownMenuItem onClick={() => handleDownload('png')} className="flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest">
                  <FileImage className="w-4 h-4 text-blue-500" />
                  Save as PNG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload('jpg')} className="flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest">
                  <FileType className="w-4 h-4 text-amber-500" />
                  Save as JPG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload('pdf')} className="flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest">
                  <FileText className="w-4 h-4 text-red-500" />
                  Save as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleWhatsAppShare} 
              disabled={sharing}
              className="rounded-xl border-emerald-200 bg-emerald-50 text-emerald-700 font-bold uppercase text-[10px] tracking-widest hover:bg-emerald-100 hover:text-emerald-800"
            >
              {sharing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Share2 className="w-4 h-4 mr-2" />}
              WhatsApp
            </Button>
            <Button variant="default" size="sm" onClick={handlePrint} className="rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100">
              <Printer className="w-4 h-4 mr-2" />
              Print / PDF
            </Button>
          </div>
        </div>

        <div className="poster-outer-container bg-white shadow-2xl rounded-3xl overflow-hidden mx-auto border border-slate-200 transition-all duration-500">
          <AnnouncementPosterTemplate
            ref={posterRef}
            title={item.title}
            message={item.message}
            date={item.startDate ? new Date(item.startDate).toLocaleDateString() : new Date(item.createdAt).toLocaleDateString()}
            author={item.createdByName || "Management Team"}
            brandName={(settings as any)?.company?.name}
            logoSrc={brandLogo}
            announcementNumber={item.announcementNumber || item._id?.slice(-4).toUpperCase()}
          />
        </div>
      </div>
    </div>
  );
}

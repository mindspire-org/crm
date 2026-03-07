import { useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, Eye, Trash2, Edit } from "lucide-react";
import { ImageCropDialog } from "./ImageCropDialog";

interface ImageManagerProps {
  currentImage?: string;
  onImageChange: (imageBlob: Blob) => Promise<void>;
  onImageRemove: () => Promise<void>;
  aspectRatio?: number;
  className?: string;
  disabled?: boolean;
}

export function ImageManager({ 
  currentImage, 
  onImageChange, 
  onImageRemove, 
  aspectRatio = 1,
  className = "",
  disabled = false
}: ImageManagerProps) {
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  const assetBase = (typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname))
    ? "https://healthspire-crm.onrender.com"
    : "";

  const displayImage = useMemo(() => {
    const s = String(currentImage || "").trim();
    if (!s) return s;
    try {
      const isAbs = /^https?:\/\//i.test(s);
      if (isAbs) {
        const u = new URL(s);
        if ((u.hostname === "localhost" || u.hostname === "127.0.0.1") && u.pathname.includes("/uploads/")) {
          return `${"https://healthspire-crm.onrender.com"}${u.pathname}`;
        }
        return s;
      }
      if (s.startsWith("/uploads/") && assetBase) return `${assetBase}${s}`;
      return s;
    } catch {
      return s;
    }
  }, [currentImage]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target?.result as string);
      setIsCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!croppedBlob) return;

    setIsUploading(true);
    try {
      await onImageChange(croppedBlob);
      toast.success("Image updated successfully");
    } catch (error) {
      toast.error("Failed to update image");
    } finally {
      setIsUploading(false);
      setSelectedFile(null);
      setImageSrc("");
    }
  };

  const handleRemove = async () => {
    setIsUploading(true);
    try {
      await onImageRemove();
      toast.success("Image removed successfully");
    } catch (error) {
      toast.error("Failed to remove image");
    } finally {
      setIsUploading(false);
    }
  };

  const clearFileInput = () => {
    const fileInput = document.getElementById("image-upload-input") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  return (
    <>
      <div className={`flex items-center gap-4 ${className}`}>
        <Avatar className="h-16 w-16 border">
          <AvatarImage
            src={displayImage}
            alt="Current image"
            className="object-cover"
          />
          <AvatarFallback className="text-lg">IMG</AvatarFallback>
        </Avatar>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Input
              id="image-upload-input"
              type="file"
              accept="image/*"
              className="max-w-[200px]"
              onChange={handleFileSelect}
              disabled={disabled || isUploading}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsViewDialogOpen(true)}
              disabled={!currentImage}
            >
              <Eye className="w-4 h-4" />
            </Button>
            {currentImage && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRemove}
                disabled={disabled || isUploading}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Upload, view, or change image
          </div>
        </div>
      </div>

      <ImageCropDialog
        open={isCropDialogOpen}
        onClose={() => {
          setIsCropDialogOpen(false);
          clearFileInput();
          setSelectedFile(null);
          setImageSrc("");
        }}
        imageSrc={imageSrc}
        onCropComplete={handleCropComplete}
        aspectRatio={aspectRatio}
      />

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>View Image</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            <img
              src={displayImage}
              alt="Full size image"
              className="max-w-full max-h-96 object-contain rounded-lg"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

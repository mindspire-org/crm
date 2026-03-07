import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  to?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg";
  children?: React.ReactNode;
}

export function BackButton({ 
  to, 
  className, 
  variant = "outline", 
  size = "icon-sm",
  children 
}: BackButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={cn("shrink-0", className)}
      title="Go back"
    >
      {children || <ArrowLeft className="h-4 w-4" />}
    </Button>
  );
}

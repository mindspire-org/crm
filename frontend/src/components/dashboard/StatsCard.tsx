import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  change?: {
    value: string;
    type: "increase" | "decrease";
  };
  icon: LucideIcon;
  variant?: "default" | "primary" | "success" | "warning" | "danger";
  className?: string;
}

const variantStyles = {
  default: {
    card: "bg-card",
    icon: "icon-badge-primary",
    text: "text-foreground",
    subtext: "text-muted-foreground",
  },
  primary: {
    card: "stats-card-primary",
    icon: "bg-white/20 text-white",
    text: "text-white",
    subtext: "text-white/80",
  },
  success: {
    card: "stats-card-success",
    icon: "bg-white/20 text-white",
    text: "text-white",
    subtext: "text-white/80",
  },
  warning: {
    card: "stats-card-warning",
    icon: "bg-black/10 text-warning-foreground",
    text: "text-warning-foreground",
    subtext: "text-warning-foreground/80",
  },
  danger: {
    card: "stats-card-danger",
    icon: "bg-white/20 text-white",
    text: "text-white",
    subtext: "text-white/80",
  },
};

export function StatsCard({
  title,
  value,
  change,
  icon: Icon,
  variant = "default",
  className,
}: StatsCardProps) {
  const styles = variantStyles[variant];

  return (
    <div className={cn("stats-card", styles.card, className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={cn("text-sm font-medium", styles.subtext)}>{title}</p>
          <p className={cn("text-3xl font-bold mt-2 font-display", styles.text)}>
            {value}
          </p>
          {change && (
            <div className="flex items-center gap-1 mt-2">
              {change.type === "increase" ? (
                <TrendingUp className={cn("w-4 h-4", variant === "default" ? "text-success" : styles.subtext)} />
              ) : (
                <TrendingDown className={cn("w-4 h-4", variant === "default" ? "text-destructive" : styles.subtext)} />
              )}
              <span
                className={cn(
                  "text-sm font-medium",
                  variant === "default"
                    ? change.type === "increase"
                      ? "text-success"
                      : "text-destructive"
                    : styles.subtext
                )}
              >
                {change.value}
              </span>
              <span className={cn("text-sm", styles.subtext)}>vs last month</span>
            </div>
          )}
        </div>
        <div className={cn("icon-badge", styles.icon)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      
      {/* Decorative element for gradient cards */}
      {variant !== "default" && (
        <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-white/10 blur-2xl" />
      )}
    </div>
  );
}

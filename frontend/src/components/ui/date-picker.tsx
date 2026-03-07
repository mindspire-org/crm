import * as React from "react";
import { CalendarDays } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type DatePickerProps = {
  value?: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

function parseYmdLocal(value?: string) {
  const s = String(value || "").trim();
  if (!s) return undefined;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return undefined;
  const y = Number(m[1]);
  const mm = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mm) || !Number.isFinite(d)) return undefined;
  const dt = new Date(y, mm - 1, d);
  return Number.isFinite(dt.getTime()) ? dt : undefined;
}

function toYmdLocal(date?: Date) {
  if (!date || !Number.isFinite(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplay(date?: Date) {
  if (!date || !Number.isFinite(date.getTime())) return "";
  try {
    const s = date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
    return String(s).replace(",", "");
  } catch {
    return toYmdLocal(date);
  }
}

export function DatePicker({ value, onChange, placeholder = "Pick a date", disabled, className }: DatePickerProps) {
  const selected = React.useMemo(() => parseYmdLocal(value), [value]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start gap-2 rounded-md px-3 font-normal text-left shadow-sm",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <CalendarDays className="h-4 w-4 opacity-70" />
          <span className="truncate">{selected ? formatDisplay(selected) : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 rounded-xl overflow-hidden shadow-lg border" align="start" sideOffset={8}>
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => onChange(toYmdLocal(d || undefined))}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

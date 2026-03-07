import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";

export interface DateTimePickerProps {
  value?: string; // YYYY-MM-DDTHH:mm
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Split DateTimePicker: DatePicker + native time input.
 * Value format: YYYY-MM-DDTHH:mm (same as datetime-local).
 */
export function DateTimePicker({ value, onChange, placeholder = "Pick date & time", disabled, className }: DateTimePickerProps) {
  const [datePart, setDatePart] = React.useState<string>(() => (value ? value.slice(0, 10) : ""));
  const [timePart, setTimePart] = React.useState<string>(() => (value ? value.slice(11, 16) : "09:00"));

  // Sync internal state when external value changes
  React.useEffect(() => {
    if (value) {
      setDatePart(value.slice(0, 10));
      setTimePart(value.slice(11, 16));
    }
  }, [value]);

  const handleDateChange = (newDate: string) => {
    const newDateTime = newDate ? `${newDate}T${timePart}` : "";
    setDatePart(newDate);
    onChange?.(newDateTime);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTimePart(newTime);
    const newDateTime = datePart ? `${datePart}T${newTime}` : "";
    onChange?.(newDateTime);
  };

  const selectedDate = React.useMemo(() => {
    if (!datePart) return undefined;
    const [y, m, d] = datePart.split("-").map(Number);
    if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return undefined;
    return new Date(y, m - 1, d);
  }, [datePart]);

  return (
    <div className={cn("flex gap-2", className)}>
      {/* Date picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "flex-1 justify-start gap-2 rounded-md px-3 font-normal text-left",
              !selectedDate && "text-muted-foreground"
            )}
          >
            <CalendarDays className="h-4 w-4 opacity-70" />
            <span className="truncate">
              {selectedDate ? selectedDate.toLocaleDateString() : placeholder}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => handleDateChange(d ? toYmdLocal(d) : "")}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Time input */}
      <Input
        type="time"
        value={timePart}
        onChange={handleTimeChange}
        disabled={disabled}
        className="w-32"
      />
    </div>
  );
}

function toYmdLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, Formatters } from "react-day-picker";
import type { Locale } from "date-fns";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

// Explicitly format month names to avoid "undefined" issue
const customFormatters: Partial<Formatters> = {
  formatCaption: (date: Date, options?: { locale?: Locale }) => {
    const month = date.toLocaleString("en-US", { month: "long" });
    const year = date.getFullYear();
    return `${month} ${year}`;
  },
  formatMonthCaption: (date: Date, options?: { locale?: Locale }) => {
    return date.toLocaleString("en-US", { month: "long" });
  },
};

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      formatters={customFormatters}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "space-y-4",
        caption: "flex items-center justify-center relative py-1",
        caption_label: "text-sm font-semibold tracking-wide",
        nav: "flex items-center gap-1",
        nav_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 rounded-full opacity-70 hover:opacity-100 hover:bg-accent/80 transition-colors",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell: "w-9 rounded-md text-[0.7rem] font-medium text-muted-foreground/80 uppercase tracking-wide",
        row: "mt-2 flex w-full",
        cell:
          "relative h-9 w-9 p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected].day-range-end)]:rounded-r-full [&:has([aria-selected].day-range-start)]:rounded-l-full",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal rounded-full hover:bg-accent/80 hover:text-accent-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent/60 text-accent-foreground font-semibold ring-1 ring-primary/30",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-accent/60 aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };

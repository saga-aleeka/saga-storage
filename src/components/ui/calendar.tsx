"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

// tiny class combiner so you don't need ./utils
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Tailwind-only skin for react-day-picker.
 * No shadcn tokens; no :has() tricks. Works with plain Tailwind v3+.
 */
export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "flex flex-col gap-4",
        caption: "flex w-full items-center justify-center pt-1 relative",
        caption_label: "text-sm font-medium",
        nav: "flex items-center gap-1",
        nav_button: cn(
          // outline button look (no dependency on buttonVariants)
          "inline-flex h-7 w-7 items-center justify-center rounded-md border",
          "border-slate-300 bg-transparent p-0 text-slate-700 hover:bg-slate-100",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
          "disabled:opacity-50 disabled:pointer-events-none"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell:
          "w-8 text-[0.8rem] font-normal text-slate-500 dark:text-slate-400",
        row: "mt-2 flex w-full",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20"
        ),
        day: cn(
          // ghost button look for days
          "inline-flex h-8 w-8 items-center justify-center rounded-md",
          "text-slate-900 dark:text-slate-100 font-normal",
          "hover:bg-slate-100 dark:hover:bg-slate-800/60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
          "aria-selected:opacity-100"
        ),
        day_selected: cn(
          "bg-blue-600 text-white hover:bg-blue-600 hover:text-white",
          "focus:bg-blue-600 focus:text-white"
        ),
        day_today: "bg-slate-100 text-slate-900 dark:bg-slate-800/60",
        day_outside: "text-slate-400 dark:text-slate-500",
        day_disabled: "text-slate-400 opacity-50 dark:text-slate-500",
        day_range_start:
          "day-range-start bg-blue-600 text-white rounded-l-md",
        day_range_end: "day-range-end bg-blue-600 text-white rounded-r-md",
        day_range_middle:
          "bg-slate-100 text-slate-900 dark:bg-slate-800/60",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...p }) => (
          <ChevronLeft className={cn("h-4 w-4", className)} {...p} />
        ),
        IconRight: ({ className, ...p }) => (
          <ChevronRight className={cn("h-4 w-4", className)} {...p} />
        ),
      }}
      {...props}
    />
  );
}

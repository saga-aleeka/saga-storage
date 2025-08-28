"use client";

import * as React from "react";
import { cn } from "./utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        data-slot="textarea"
        className={cn(
          // layout
          "flex w-full min-h-16 resize-none rounded-md border px-3 py-2 text-base md:text-sm transition-[color,box-shadow]",
          // colors (light/dark)
          "bg-white dark:bg-slate-900",
          "border-slate-300 dark:border-slate-700",
          "placeholder:text-slate-500 dark:placeholder:text-slate-400",
          // focus
          "outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/40",
          // invalid
          "aria-invalid:border-red-500 aria-invalid:ring-2 aria-invalid:ring-red-500/20",
          // disabled
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea };

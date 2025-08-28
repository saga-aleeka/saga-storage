import * as React from "react";
import { cn } from "./utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        className={cn(
          // layout
          "flex h-9 w-full min-w-0 rounded-md px-3 py-2 text-sm",
          // base colors
          "bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100",
          "border border-slate-300 dark:border-slate-700",
          // placeholder & selection
          "placeholder:text-slate-500 dark:placeholder:text-slate-400",
          "selection:bg-blue-600 selection:text-white",
          // focus & invalid
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:border-blue-500",
          "aria-invalid:border-red-500 aria-invalid:focus-visible:ring-red-400/50",
          // disabled
          "disabled:cursor-not-allowed disabled:opacity-50",
          // file input tweaks (ignored for non-file types)
          "file:inline-flex file:h-7 file:items-center file:border-0 file:bg-transparent file:px-0 file:text-sm file:font-medium",
          "file:text-slate-700 dark:file:text-slate-300",
          // misc
          "transition-colors shadow-sm",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

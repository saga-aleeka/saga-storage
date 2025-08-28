"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

// tiny class combiner so you don't need ./utils
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type CheckboxProps = React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & {
  /** Optional pixel size for the box (default 16). */
  sizePx?: number;
};

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, sizePx = 16, style, ...props }, ref) => {
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      data-slot="checkbox"
      className={cn(
        "inline-flex items-center justify-center rounded-[4px] border shadow-sm",
        "shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "border-slate-300 bg-white text-white dark:border-slate-700 dark:bg-slate-900",
        // checked state
        "data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600",
        "dark:data-[state=checked]:bg-blue-500 dark:data-[state=checked]:border-blue-500",
        // invalid state
        "aria-invalid:border-red-500 aria-invalid:focus-visible:ring-red-400/50",
        className
      )}
      style={{ width: sizePx, height: sizePx, ...style }}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center"
      >
        <Check className="h-3.5 w-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});
Checkbox.displayName = "Checkbox";

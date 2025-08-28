"use client";

import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

export const toggleVariants = cva(
  [
    "inline-flex items-center justify-center rounded-md text-sm font-medium",
    "transition-colors outline-none select-none",
    "focus-visible:ring-2 focus-visible:ring-blue-500/40",
    "disabled:pointer-events-none disabled:opacity-50",
    // pressed/on state
    "data-[state=on]:bg-blue-600 data-[state=on]:text-white",
    "dark:data-[state=on]:bg-blue-500",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-slate-100 text-slate-900 hover:bg-slate-200",
          "dark:bg-slate-800/60 dark:text-slate-100 dark:hover:bg-slate-800",
        ].join(" "),
        outline: [
          "border border-slate-300 text-slate-900 hover:bg-slate-50",
          "dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800/60",
        ].join(" "),
      },
      size: {
        sm: "h-8 px-2",
        default: "h-9 px-3",
        lg: "h-10 px-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

type ToggleProps = React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>;

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  ToggleProps
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(toggleVariants({ variant, size }), className)}
    {...props}
  />
));
Toggle.displayName = "Toggle";

export { Toggle };

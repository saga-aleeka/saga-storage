"use client";

import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { cn } from "./utils";

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-3", className)}
      {...props}
    />
  );
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        // size & shape
        "h-4 w-4 shrink-0 rounded-full",
        // base colors
        "bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700",
        // focus/keyboard
        "outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:border-blue-500",
        // invalid/disabled
        "aria-invalid:border-red-500 aria-invalid:focus-visible:ring-red-400/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        // motion
        "transition-colors",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="flex h-full w-full items-center justify-center"
      >
        <div className="h-2.5 w-2.5 rounded-full bg-blue-600 dark:bg-blue-500" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };

"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "./utils";

type ProgressProps = React.ComponentProps<typeof ProgressPrimitive.Root> & {
  value?: number;
};

export function Progress({ className, value = 0, ...props }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, value)); // clamp 0–100

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={pct}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full",
        "bg-slate-200 dark:bg-slate-800",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "h-full w-full flex-1",
          "bg-blue-600 dark:bg-blue-500",
          "transition-transform duration-300"
        )}
        style={{ transform: `translateX(-${100 - pct}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

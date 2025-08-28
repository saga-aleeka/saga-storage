"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "./utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent transition-colors",
        "outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
        // track colors
        "data-[state=unchecked]:bg-slate-300 dark:data-[state=unchecked]:bg-slate-700",
        "data-[state=checked]:bg-blue-600 dark:data-[state=checked]:bg-blue-500",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
            "pointer-events-none block h-4 w-4 rounded-full shadow transition-transform",
            // thumb colors
            "bg-white dark:bg-slate-900",
            // motion
            "data-[state=unchecked]:translate-x-0",
            "data-[state=checked]:translate-x-[calc(100%-2px)]"
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };

"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "./utils";

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    data-slot="label"
    className={cn(
      "flex items-center gap-2 select-none text-sm font-medium leading-none",
      // disabled styles via peer/aria (no custom group-data variant needed)
      "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
      "aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Label.displayName = "Label";

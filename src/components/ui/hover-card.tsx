"use client";

import * as React from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import { cn } from "./utils";

function HoverCard(
  props: React.ComponentProps<typeof HoverCardPrimitive.Root>
) {
  return <HoverCardPrimitive.Root data-slot="hover-card" {...props} />;
}

function HoverCardTrigger(
  props: React.ComponentProps<typeof HoverCardPrimitive.Trigger>
) {
  return (
    <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />
  );
}

const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <HoverCardPrimitive.Portal data-slot="hover-card-portal">
    <HoverCardPrimitive.Content
      ref={ref}
      data-slot="hover-card-content"
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-64 rounded-md border p-4 shadow-md outline-none",
        "bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100",
        "border-slate-200 dark:border-slate-800",
        // smooth open/close without shadcn animation utilities
        "origin-[var(--radix-hover-card-content-transform-origin)]",
        "transition-opacity transition-transform duration-150",
        "data-[state=closed]:opacity-0 data-[state=closed]:scale-95",
        "data-[state=open]:opacity-100 data-[state=open]:scale-100",
        className
      )}
      {...props}
    />
  </HoverCardPrimitive.Portal>
));
HoverCardContent.displayName = "HoverCardContent";

export { HoverCard, HoverCardTrigger, HoverCardContent };

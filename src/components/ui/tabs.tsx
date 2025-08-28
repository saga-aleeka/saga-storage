"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "./utils";

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex h-9 w-fit items-center justify-center rounded-xl p-[3px]",
        "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400",
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5",
        "rounded-xl border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap",
        "transition-[color,box-shadow]",
        // base text
        "text-slate-900 dark:text-slate-400",
        // active state “pill”
        "data-[state=active]:bg-white data-[state=active]:text-slate-900",
        "data-[state=active]:border-slate-200 dark:data-[state=active]:bg-slate-900",
        "dark:data-[state=active]:text-slate-100 dark:data-[state=active]:border-slate-700",
        // focus
        "outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
        // disabled
        "disabled:pointer-events-none disabled:opacity-50",
        // svg sizing
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };

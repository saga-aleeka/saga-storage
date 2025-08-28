"use client";

import * as React from "react";
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
import { cva } from "class-variance-authority";
import { ChevronDown } from "lucide-react";
import { cn } from "./utils";

function NavigationMenu({
  className,
  children,
  viewport = true,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Root> & {
  viewport?: boolean;
}) {
  return (
    <NavigationMenuPrimitive.Root
      data-slot="navigation-menu"
      data-viewport={viewport}
      className={cn(
        "group/navigation-menu relative flex max-w-max flex-1 items-center justify-center",
        className
      )}
      {...props}
    >
      {children}
      {viewport && <NavigationMenuViewport />}
    </NavigationMenuPrimitive.Root>
  );
}

function NavigationMenuList({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.List>) {
  return (
    <NavigationMenuPrimitive.List
      data-slot="navigation-menu-list"
      className={cn("group flex flex-1 list-none items-center justify-center gap-1", className)}
      {...props}
    />
  );
}

function NavigationMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Item>) {
  return (
    <NavigationMenuPrimitive.Item
      data-slot="navigation-menu-item"
      className={cn("relative", className)}
      {...props}
    />
  );
}

/* Trigger styles (plain Tailwind, light/dark) */
const navigationMenuTriggerStyle = cva(
  [
    "group inline-flex h-9 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium",
    "bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100",
    "border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
    "disabled:opacity-50 disabled:pointer-events-none",
    // open state
    "data-[state=open]:bg-slate-100 dark:data-[state=open]:bg-slate-800/60",
  ].join(" ")
);

function NavigationMenuTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Trigger>) {
  return (
    <NavigationMenuPrimitive.Trigger
      data-slot="navigation-menu-trigger"
      className={cn(navigationMenuTriggerStyle(), "group", className)}
      {...props}
    >
      {children}
      <ChevronDown
        className="ml-1 h-3 w-3 transition duration-200 group-data-[state=open]:rotate-180"
        aria-hidden="true"
      />
    </NavigationMenuPrimitive.Trigger>
  );
}

function NavigationMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Content>) {
  return (
    <NavigationMenuPrimitive.Content
      data-slot="navigation-menu-content"
      className={cn(
        // responsive positioning: stacked on mobile, floating on md+
        "top-0 left-0 w-full p-2 md:absolute md:w-auto",
        // simple enter/leave transitions (no plugin utilities)
        "transition-opacity transition-transform duration-150",
        "data-[motion^=from-]:opacity-0 data-[motion^=from-]:translate-y-1",
        "data-[motion^=to-]:opacity-0 data-[motion^=to-]:translate-y-1",
        // when viewport=false, style as its own floating panel
        "group-data-[viewport=false]/navigation-menu:top-full group-data-[viewport=false]/navigation-menu:mt-1.5",
        "group-data-[viewport=false]/navigation-menu:overflow-hidden group-data-[viewport=false]/navigation-menu:rounded-md",
        "group-data-[viewport=false]/navigation-menu:border group-data-[viewport=false]/navigation-menu:shadow-md",
        "group-data-[viewport=false]/navigation-menu:bg-white group-data-[viewport=false]/navigation-menu:text-slate-900",
        "dark:group-data-[viewport=false]/navigation-menu:bg-slate-900 dark:group-data-[viewport=false]/navigation-menu:text-slate-100",
        "border-slate-200 dark:border-slate-800",
        className
      )}
      {...props}
    />
  );
}

function NavigationMenuViewport({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Viewport>) {
  return (
    <div className="absolute left-0 top-full z-50 isolate flex justify-center">
      <NavigationMenuPrimitive.Viewport
        data-slot="navigation-menu-viewport"
        className={cn(
          "relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden rounded-md border shadow",
          "md:w-[var(--radix-navigation-menu-viewport-width)]",
          "bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100",
          "border-slate-200 dark:border-slate-800",
          "origin-top-center transition-transform transition-opacity duration-150",
          "data-[state=closed]:opacity-0 data-[state=closed]:scale-95",
          "data-[state=open]:opacity-100 data-[state=open]:scale-100",
          className
        )}
        {...props}
      />
    </div>
  );
}

function NavigationMenuLink({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Link>) {
  return (
    <NavigationMenuPrimitive.Link
      data-slot="navigation-menu-link"
      className={cn(
        "flex flex-col gap-1 rounded-sm p-2 text-sm outline-none transition-colors",
        "hover:bg-slate-100 hover:text-slate-900",
        "dark:hover:bg-slate-800/60 dark:hover:text-slate-100",
        "focus-visible:ring-2 focus-visible:ring-blue-500/50",
        // active state
        "data-[active=true]:bg-slate-100 dark:data-[active=true]:bg-slate-800/60",
        className
      )}
      {...props}
    />
  );
}

function NavigationMenuIndicator({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Indicator>) {
  return (
    <NavigationMenuPrimitive.Indicator
      data-slot="navigation-menu-indicator"
      className={cn(
        "top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden",
        "transition-opacity duration-150 data-[state=hidden]:opacity-0 data-[state=visible]:opacity-100",
        className
      )}
      {...props}
    >
      {/* little diamond pointer */}
      <div className="relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-slate-200 shadow-md dark:bg-slate-700" />
    </NavigationMenuPrimitive.Indicator>
  );
}

export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
};

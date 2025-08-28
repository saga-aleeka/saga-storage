"use client";

import * as React from "react";
import * as MenubarPrimitive from "@radix-ui/react-menubar";
import { Check, ChevronRight, Circle } from "lucide-react";
import { cn } from "./utils";

function Menubar({
  className,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Root>) {
  return (
    <MenubarPrimitive.Root
      data-slot="menubar"
      className={cn(
        "flex h-9 items-center gap-1 rounded-md border p-1 shadow-sm",
        "bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100",
        "border-slate-200 dark:border-slate-800",
        className
      )}
      {...props}
    />
  );
}

function MenubarMenu(props: React.ComponentProps<typeof MenubarPrimitive.Menu>) {
  return <MenubarPrimitive.Menu data-slot="menubar-menu" {...props} />;
}

function MenubarGroup(props: React.ComponentProps<typeof MenubarPrimitive.Group>) {
  return <MenubarPrimitive.Group data-slot="menubar-group" {...props} />;
}

function MenubarPortal(props: React.ComponentProps<typeof MenubarPrimitive.Portal>) {
  return <MenubarPrimitive.Portal data-slot="menubar-portal" {...props} />;
}

function MenubarRadioGroup(
  props: React.ComponentProps<typeof MenubarPrimitive.RadioGroup>
) {
  return <MenubarPrimitive.RadioGroup data-slot="menubar-radio-group" {...props} />;
}

function MenubarTrigger({
  className,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Trigger>) {
  return (
    <MenubarPrimitive.Trigger
      data-slot="menubar-trigger"
      className={cn(
        "flex select-none items-center rounded-sm px-2 py-1 text-sm font-medium outline-none",
        "data-[state=open]:bg-slate-100 data-[state=open]:text-slate-900",
        "dark:data-[state=open]:bg-slate-800/60 dark:data-[state=open]:text-slate-100",
        "focus-visible:ring-2 focus-visible:ring-blue-500/50",
        className
      )}
      {...props}
    />
  );
}

function MenubarContent({
  className,
  align = "start",
  alignOffset = -4,
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Content>) {
  return (
    <MenubarPortal>
      <MenubarPrimitive.Content
        data-slot="menubar-content"
        align={align}
        alignOffset={alignOffset}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-[12rem] overflow-hidden rounded-md border p-1 shadow-md outline-none",
          "bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100",
          "border-slate-200 dark:border-slate-800",
          // simple transitions (no extra plugins)
          "origin-[var(--radix-menubar-content-transform-origin)]",
          "transition-opacity transition-transform duration-100",
          "data-[state=closed]:opacity-0 data-[state=closed]:scale-95",
          "data-[state=open]:opacity-100 data-[state=open]:scale-100",
          className
        )}
        {...props}
      />
    </MenubarPortal>
  );
}

function MenubarItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Item> & {
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  return (
    <MenubarPrimitive.Item
      data-slot="menubar-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "relative flex select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
        "cursor-default data-[inset]:pl-8",
        // states
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900",
        "dark:data-[highlighted]:bg-slate-800/60 dark:data-[highlighted]:text-slate-100",
        // destructive variant
        "data-[variant=destructive]:text-red-600",
        "data-[variant=destructive]:data-[highlighted]:bg-red-50",
        "dark[data-variant=destructive]:data-[highlighted]:bg-red-900/30",
        // default icon sizing
        "[&_svg]:pointer-events-none [&_svg]:shrink-0",
        "[&_svg:not([class*='h-']):not([class*='w-'])]:h-4",
        "[&_svg:not([class*='h-']):not([class*='w-'])]:w-4",
        className
      )}
      {...props}
    />
  );
}

function MenubarCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.CheckboxItem>) {
  return (
    <MenubarPrimitive.CheckboxItem
      data-slot="menubar-checkbox-item"
      className={cn(
        "relative flex select-none items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none",
        "cursor-default",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900",
        "dark:data-[highlighted]:bg-slate-800/60 dark:data-[highlighted]:text-slate-100",
        className
      )}
      checked={checked}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <MenubarPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.CheckboxItem>
  );
}

function MenubarRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.RadioItem>) {
  return (
    <MenubarPrimitive.RadioItem
      data-slot="menubar-radio-item"
      className={cn(
        "relative flex select-none items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none",
        "cursor-default",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900",
        "dark:data-[highlighted]:bg-slate-800/60 dark:data-[highlighted]:text-slate-100",
        className
      )}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <MenubarPrimitive.ItemIndicator>
          <Circle className="h-2 w-2 fill-current" />
        </MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.RadioItem>
  );
}

function MenubarLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Label> & { inset?: boolean }) {
  return (
    <MenubarPrimitive.Label
      data-slot="menubar-label"
      data-inset={inset}
      className={cn("px-2 py-1.5 text-sm font-medium data-[inset]:pl-8", className)}
      {...props}
    />
  );
}

function MenubarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Separator>) {
  return (
    <MenubarPrimitive.Separator
      data-slot="menubar-separator"
      className={cn("-mx-1 my-1 h-px bg-slate-200 dark:bg-slate-700", className)}
      {...props}
    />
  );
}

function MenubarShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="menubar-shortcut"
      className={cn("ml-auto text-xs tracking-widest text-slate-500 dark:text-slate-400", className)}
      {...props}
    />
  );
}

function MenubarSub(props: React.ComponentProps<typeof MenubarPrimitive.Sub>) {
  return <MenubarPrimitive.Sub data-slot="menubar-sub" {...props} />;
}

function MenubarSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.SubTrigger> & { inset?: boolean }) {
  return (
    <MenubarPrimitive.SubTrigger
      data-slot="menubar-sub-trigger"
      data-inset={inset}
      className={cn(
        "flex select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
        "cursor-default data-[inset]:pl-8",
        "data-[state=open]:bg-slate-100 data-[state=open]:text-slate-900",
        "dark:data-[state=open]:bg-slate-800/60 dark:data-[state=open]:text-slate-100",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto h-4 w-4" />
    </MenubarPrimitive.SubTrigger>
  );
}

function MenubarSubContent({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.SubContent>) {
  return (
    <MenubarPrimitive.SubContent
      data-slot="menubar-sub-content"
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-lg outline-none",
        "bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100",
        "border-slate-200 dark:border-slate-800",
        "origin-[var(--radix-menubar-content-transform-origin)]",
        "transition-opacity transition-transform duration-100",
        "data-[state=closed]:opacity-0 data-[state=closed]:scale-95",
        "data-[state=open]:opacity-100 data-[state=open]:scale-100",
        className
      )}
      {...props}
    />
  );
}

export {
  Menubar,
  MenubarPortal,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarGroup,
  MenubarSeparator,
  MenubarLabel,
  MenubarItem,
  MenubarShortcut,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
};

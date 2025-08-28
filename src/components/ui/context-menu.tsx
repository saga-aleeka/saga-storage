"use client";

import * as React from "react";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { Check, ChevronRight, Circle } from "lucide-react";

// tiny class combiner so you don't need ./utils
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function ContextMenu(
  props: React.ComponentProps<typeof ContextMenuPrimitive.Root>
) {
  return <ContextMenuPrimitive.Root data-slot="context-menu" {...props} />;
}

function ContextMenuTrigger(
  props: React.ComponentProps<typeof ContextMenuPrimitive.Trigger>
) {
  return <ContextMenuPrimitive.Trigger data-slot="context-menu-trigger" {...props} />;
}

function ContextMenuGroup(
  props: React.ComponentProps<typeof ContextMenuPrimitive.Group>
) {
  return <ContextMenuPrimitive.Group data-slot="context-menu-group" {...props} />;
}

function ContextMenuPortal(
  props: React.ComponentProps<typeof ContextMenuPrimitive.Portal>
) {
  return <ContextMenuPrimitive.Portal data-slot="context-menu-portal" {...props} />;
}

function ContextMenuSub(
  props: React.ComponentProps<typeof ContextMenuPrimitive.Sub>
) {
  return <ContextMenuPrimitive.Sub data-slot="context-menu-sub" {...props} />;
}

function ContextMenuRadioGroup(
  props: React.ComponentProps<typeof ContextMenuPrimitive.RadioGroup>
) {
  return (
    <ContextMenuPrimitive.RadioGroup
      data-slot="context-menu-radio-group"
      {...props}
    />
  );
}

function ContextMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubTrigger> & {
  inset?: boolean;
}) {
  return (
    <ContextMenuPrimitive.SubTrigger
      data-slot="context-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "flex select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
        "cursor-default",
        // open/hover states
        "data-[state=open]:bg-slate-100 data-[state=open]:text-slate-900",
        "dark:data-[state=open]:bg-slate-800/60 dark:data-[state=open]:text-slate-100",
        // inset support
        "data-[inset]:pl-8",
        // icon sizing
        "[&_svg]:pointer-events-none [&_svg]:shrink-0",
        "[&_svg:not([class*='h-']):not([class*='w-'])]:h-4",
        "[&_svg:not([class*='h-']):not([class*='w-'])]:w-4",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto h-4 w-4" />
    </ContextMenuPrimitive.SubTrigger>
  );
}

function ContextMenuSubContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubContent>) {
  return (
    <ContextMenuPrimitive.SubContent
      data-slot="context-menu-sub-content"
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-lg",
        "bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100",
        "border-slate-200 dark:border-slate-800",
        // simple transitions (no plugin)
        "transition-opacity transition-transform duration-100",
        "data-[state=closed]:opacity-0 data-[state=closed]:scale-95",
        "data-[state=open]:opacity-100 data-[state=open]:scale-100",
        // origin based on side
        "data-[side=bottom]:origin-top data-[side=top]:origin-bottom",
        "data-[side=left]:origin-right data-[side=right]:origin-left",
        className
      )}
      {...props}
    />
  );
}

function ContextMenuContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Content>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        data-slot="context-menu-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 max-h-[var(--radix-context-menu-content-available-height)] min-w-[8rem]",
          "overflow-y-auto overflow-x-hidden rounded-md border p-1 shadow-md",
          "bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100",
          "border-slate-200 dark:border-slate-800",
          // simple transitions
          "transition-opacity transition-transform duration-100",
          "data-[state=closed]:opacity-0 data-[state=closed]:scale-95",
          "data-[state=open]:opacity-100 data-[state=open]:scale-100",
          "data-[side=bottom]:origin-top data-[side=top]:origin-bottom",
          "data-[side=left]:origin-right data-[side=right]:origin-left",
          className
        )}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  );
}

function ContextMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Item> & {
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  return (
    <ContextMenuPrimitive.Item
      data-slot="context-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "relative flex select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
        "cursor-default",
        // states
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900",
        "dark:data-[highlighted]:bg-slate-800/60 dark:data-[highlighted]:text-slate-100",
        // destructive variant
        "data-[variant=destructive]:text-red-600",
        "data-[variant=destructive]:data-[highlighted]:bg-red-50",
        "dark:data-[variant=destructive]:data-[highlighted]:bg-red-900/30",
        // inset padding
        "data-[inset]:pl-8",
        // icon sizing defaults
        "[&_svg]:pointer-events-none [&_svg]:shrink-0",
        "[&_svg:not([class*='h-']):not([class*='w-'])]:h-4",
        "[&_svg:not([class*='h-']):not([class*='w-'])]:w-4",
        className
      )}
      {...props}
    />
  );
}

function ContextMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.CheckboxItem>) {
  return (
    <ContextMenuPrimitive.CheckboxItem
      data-slot="context-menu-checkbox-item"
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
        <ContextMenuPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  );
}

function ContextMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.RadioItem>) {
  return (
    <ContextMenuPrimitive.RadioItem
      data-slot="context-menu-radio-item"
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
        <ContextMenuPrimitive.ItemIndicator>
          <Circle className="h-2 w-2 fill-current" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  );
}

function ContextMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Label> & {
  inset?: boolean;
}) {
  return (
    <ContextMenuPrimitive.Label
      data-slot="context-menu-label"
      data-inset={inset}
      className={cn(
        "px-2 py-1.5 text-sm font-medium text-slate-900 dark:text-slate-100",
        "data-[inset]:pl-8",
        className
      )}
      {...props}
    />
  );
}

function ContextMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Separator>) {
  return (
    <ContextMenuPrimitive.Separator
      data-slot="context-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-slate-200 dark:bg-slate-700", className)}
      {...props}
    />
  );
}

function ContextMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="context-menu-shortcut"
      className={cn("ml-auto text-xs tracking-widest text-slate-500 dark:text-slate-400", className)}
      {...props}
    />
  );
}

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
};

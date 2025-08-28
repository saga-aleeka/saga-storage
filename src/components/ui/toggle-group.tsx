"use client";

import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { type VariantProps } from "class-variance-authority";
import { cn } from "./utils";
import { toggleVariants } from "./toggle";

type TVariants = VariantProps<typeof toggleVariants>;

const ToggleGroupContext = React.createContext<TVariants>({
  size: "default",
  variant: "default",
});

function ToggleGroup({
  className,
  variant,
  size,
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> & TVariants) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      className={cn(
        "inline-flex w-fit items-center rounded-md shadow-sm",
        "overflow-hidden", // ensures clean rounded corners in group
        className
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> & TVariants) {
  const ctx = React.useContext(ToggleGroupContext);

  const v = ctx.variant || variant;
  const s = ctx.size || size;

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={v}
      data-size={s}
      className={cn(
        toggleVariants({ variant: v, size: s }),
        // group shaping
        "rounded-none first:rounded-l-md last:rounded-r-md",
        "min-w-0 flex-1 shrink-0",
        // merge borders nicely for outline variant
        "data-[variant=outline]:-ml-px first:data-[variant=outline]:ml-0",
        // better focus stacking
        "focus:z-10",
        className
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
}

export { ToggleGroup, ToggleGroupItem };

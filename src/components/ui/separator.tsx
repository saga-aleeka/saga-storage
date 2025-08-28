"use client";

import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn } from "./utils";

type Props = React.ComponentProps<typeof SeparatorPrimitive.Root>;

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: Props) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator-root"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        // base color (light/dark)
        "shrink-0 bg-slate-200 dark:bg-slate-700",
        // sizes per orientation
        "data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full",
        "data-[orientation=vertical]:w-px data-[orientation=vertical]:h-full",
        className
      )}
      {...props}
    />
  );
}

export { Separator };

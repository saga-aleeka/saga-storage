"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "./utils";

type SliderProps = React.ComponentProps<typeof SliderPrimitive.Root>;

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: SliderProps) {
  // Determine how many thumbs to render (1 for single value, 2+ for ranges)
  const handleCount = React.useMemo(
    () =>
      Array.isArray(value)
        ? value.length
        : Array.isArray(defaultValue)
          ? defaultValue.length
          : 1,
    [value, defaultValue]
  );

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full select-none items-center touch-none disabled:opacity-50",
        "data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          "relative grow overflow-hidden rounded-full",
          "data-[orientation=horizontal]:h-2 data-[orientation=horizontal]:w-full",
          "data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5",
          "bg-slate-200 dark:bg-slate-800/60"
        )}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn(
            "absolute",
            "data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full",
            "bg-blue-600 dark:bg-blue-500"
          )}
        />
      </SliderPrimitive.Track>

      {Array.from({ length: handleCount }).map((_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          data-slot="slider-thumb"
          className={cn(
            "block h-4 w-4 shrink-0 rounded-full border shadow-sm outline-none",
            "bg-white dark:bg-slate-900 border-blue-600",
            "focus-visible:ring-4 focus-visible:ring-blue-500/30",
            "hover:ring-4 hover:ring-blue-500/20",
            "disabled:pointer-events-none disabled:opacity-50"
          )}
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };

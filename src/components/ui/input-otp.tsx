"use client";

import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { Minus } from "lucide-react";
import { cn } from "./utils";

function InputOTP({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput> & {
  containerClassName?: string;
}) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn(
        "flex items-center gap-2",
        // if you pass disabled to OTPInput, also add aria-disabled here:
        // "aria-disabled:opacity-50",
        containerClassName
      )}
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
    />
  );
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn("flex items-center gap-1", className)}
      {...props}
    />
  );
}

function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<"div"> & { index: number }) {
  const ctx = React.useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = ctx?.slots[index] ?? {};

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className={cn(
        // segmented box
        "relative flex h-9 w-9 items-center justify-center text-sm",
        "border-y border-r first:border-l rounded-none first:rounded-l-md last:rounded-r-md",
        // base colors (light/dark)
        "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700",
        // focus/active ring without shadcn tokens
        "outline-none data-[active=true]:z-10 data-[active=true]:ring-2 data-[active=true]:ring-blue-500/50 data-[active=true]:border-blue-500",
        // invalid state
        "aria-invalid:border-red-500 data-[active=true]:aria-invalid:ring-red-400/50",
        "transition-all",
        className
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px bg-slate-900 dark:bg-slate-100 animate-pulse" />
        </div>
      )}
    </div>
  );
}

function InputOTPSeparator(props: React.ComponentProps<"div">) {
  return (
    <div data-slot="input-otp-separator" role="separator" {...props}>
      <Minus className="h-4 w-4 opacity-60" />
    </div>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };

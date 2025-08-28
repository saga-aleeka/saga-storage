"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

// tiny class combiner so you don't need a utils file
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const alertVariants = cva(
  // base
  [
    "relative w-full rounded-lg border px-4 py-3 text-sm",
    "grid items-start gap-y-1",
    // by default it's one column; when an icon is present we switch to 2 cols via variant
  ].join(" "),
  {
    variants: {
      variant: {
        // neutral “card-like” styling
        default:
          "bg-white text-slate-900 border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800",
        // destructive (error) styling
        destructive:
          "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
      },
      withIcon: {
        // when there's an icon, make a small 1.25rem column for it
        true:
          "grid-cols-[1.25rem_1fr] gap-x-3 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
        false: "grid-cols-1",
      },
    },
    defaultVariants: {
      variant: "default",
      withIcon: false,
    },
  }
);

type AlertProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof alertVariants> & {
    /** Optional icon (e.g. <Triangle/> from lucide-react). */
    icon?: React.ReactNode;
  };

export function Alert({
  className,
  variant,
  icon,
  withIcon, // you can override, but it's auto-set from `icon`
  children,
  ...props
}: AlertProps) {
  const hasIcon = withIcon ?? !!icon;
  return (
    <div
      data-slot="alert"
      role="alert"
      data-with-icon={hasIcon ? "true" : "false"}
      className={cn(alertVariants({ variant, withIcon: hasIcon }), className)}
      {...props}
    >
      {icon ? <span aria-hidden>{icon}</span> : null}
      {children}
    </div>
  );
}

export function AlertTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="alert-title"
      // when an icon is present, push title to column 2
      className={cn(
        "min-h-4 font-medium tracking-tight",
        "truncate", // simpler than requiring the line-clamp plugin
        "data-[with-icon=true]:col-start-2",
        className
      )}
      {...props}
    />
  );
}

export function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "grid justify-items-start gap-1 text-sm",
        "text-slate-600 dark:text-slate-400",
        "[&_p]:leading-relaxed",
        "data-[with-icon=true]:col-start-2",
        className
      )}
      {...props}
    />
  );
}

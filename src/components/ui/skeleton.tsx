import { cn } from "./utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-busy="true"
      className={cn(
        "animate-pulse rounded-md",
        "bg-slate-200 dark:bg-slate-800/60",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };

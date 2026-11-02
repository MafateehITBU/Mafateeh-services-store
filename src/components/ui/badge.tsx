import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex min-w-5 items-center justify-center rounded-full bg-brand-gold px-1.5 text-[11px] font-bold leading-5 text-brand-deep",
        className,
      )}
      {...props}
    />
  );
}

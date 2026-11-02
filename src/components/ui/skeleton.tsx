import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <span className={cn("block animate-pulse rounded-2xl bg-line", className)} />;
}

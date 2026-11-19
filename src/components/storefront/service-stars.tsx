import { Star } from "lucide-react";

export function ServiceStars({ value, label, className = "mt-3" }: { value: number; label: string; className?: string }) {
  const filled = Math.min(5, Math.max(0, Math.round(value)));

  return (
    <p className={`inline-flex items-center gap-1 ${className}`} aria-hidden={label ? undefined : true} aria-label={label || undefined}>
      {Array.from({ length: 5 }, (_, index) => {
        const active = index < filled;

        return (
          <Star
            key={index}
            aria-hidden="true"
            className={`size-5 ${active ? "fill-[#dfb026] text-[#dfb026]" : "fill-transparent text-[#d5d5d5]"}`}
          />
        );
      })}
    </p>
  );
}

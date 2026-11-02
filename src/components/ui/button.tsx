import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

const variants = {
  primary:
    "bg-brand text-white shadow-[var(--shadow-soft)] hover:bg-brand-rich focus-visible:outline-brand",
  secondary:
    "bg-white text-ink border border-line hover:bg-canvas-muted focus-visible:outline-brand",
  ghost:
    "bg-white/15 text-white hover:bg-white/25 focus-visible:outline-white",
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
};

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

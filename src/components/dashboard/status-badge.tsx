import { cn } from "@/lib/utils";

const tones = {
  success: "bg-brand/10 text-brand-rich",
  warning: "bg-brand-gold/15 text-brand-gold-deep",
  danger: "bg-danger/10 text-danger",
  info: "bg-info/10 text-info",
  neutral: "bg-canvas-muted text-muted",
} as const;

export type StatusTone = keyof typeof tones;

export function statusTone(value: string): StatusTone {
  if (["COMPLETED", "APPROVED", "ACTIVE", "PAID", "SUCCEEDED"].includes(value)) {
    return "success";
  }

  if (["PENDING_PAYMENT", "PENDING", "PROCESSING", "CREATED"].includes(value)) {
    return "warning";
  }

  if (["CANCELLED", "FAILED", "REJECTED", "SUSPENDED"].includes(value)) {
    return "danger";
  }

  if (["REFUNDED", "DEACTIVATED"].includes(value)) {
    return "neutral";
  }

  return "info";
}

export function statusLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function StatusBadge({ tone, children }: { tone: StatusTone; children: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone])}>
      {children}
    </span>
  );
}

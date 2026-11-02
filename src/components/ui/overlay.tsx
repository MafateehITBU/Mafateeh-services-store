"use client";

import { cn } from "@/lib/utils";
import { useEffect, useId, useRef } from "react";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

type OverlayProps = {
  open: boolean;
  titleId: string;
  onClose: () => void;
  children: React.ReactNode;
  panelClassName?: string;
  align?: "left" | "right" | "center" | "top";
};

export function Overlay({
  open,
  titleId,
  onClose,
  children,
  panelClassName,
  align = "center",
}: OverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleDomId = useId();
  const labelledBy = titleId || titleDomId;

  useEffect(() => {
    if (!open) {
      return;
    }

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    const focusable = panel?.querySelectorAll<HTMLElement>(focusableSelector);
    focusable?.[0]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panel) {
        return;
      }

      const items = [...panel.querySelectorAll<HTMLElement>(focusableSelector)];

      if (items.length === 0) {
        event.preventDefault();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70]">
      <button type="button" aria-label="Close" className="absolute inset-0 cursor-pointer bg-brand-deep/45" onClick={onClose} />
      <div
        className={cn(
          "pointer-events-none absolute",
          align === "center" && "inset-0 flex items-end justify-center p-4 sm:items-center",
          align === "top" && "inset-x-0 top-0 flex justify-center p-4 pt-6",
          align === "left" && "inset-y-0 left-0 flex",
          align === "right" && "inset-y-0 right-0 flex",
        )}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          className={cn(
            "pointer-events-auto relative max-h-full bg-white text-ink shadow-[var(--shadow-panel)]",
            align === "center" && "w-full max-w-md rounded-3xl",
            align === "top" && "w-full max-w-2xl rounded-3xl",
            align !== "center" && "h-full w-[min(100%,22rem)]",
            panelClassName,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

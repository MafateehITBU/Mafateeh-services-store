"use client";

import { cn } from "@/lib/utils";
import { useEffect, useId, useRef, useState } from "react";

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
  closeLabel?: string;
};

export function Overlay({
  open,
  titleId,
  onClose,
  children,
  panelClassName,
  align = "center",
  closeLabel = "Close",
}: OverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const titleDomId = useId();
  const labelledBy = titleId || titleDomId;
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (open) {
      const show = window.setTimeout(() => setRendered(true), 0);
      return () => window.clearTimeout(show);
    }

    const hide = window.setTimeout(() => setVisible(false), 0);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setRendered(false), reduced ? 0 : 350);
    return () => {
      window.clearTimeout(hide);
      window.clearTimeout(timer);
    };
  }, [open]);

  useEffect(() => {
    if (!rendered || !open) {
      return;
    }

    const frame = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [rendered, open]);

  useEffect(() => {
    if (!open || !rendered) {
      return;
    }

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>(focusableSelector)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
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
  }, [open, rendered]);

  if (!rendered) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        aria-label={closeLabel}
        className={cn(
          "absolute inset-0 cursor-pointer bg-brand-deep/55 backdrop-blur-md transition-opacity duration-300 ease-out motion-reduce:transition-none",
          visible ? "opacity-100" : "opacity-0",
        )}
        onClick={() => onCloseRef.current()}
      />
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
            "pointer-events-auto relative max-h-full bg-white text-ink shadow-[var(--shadow-panel)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            align === "center" && "w-full max-w-md rounded-3xl",
            align === "top" && "w-full max-w-2xl rounded-3xl",
            align === "right" && (visible ? "translate-x-0" : "translate-x-full"),
            align === "left" && (visible ? "translate-x-0" : "-translate-x-full"),
            (align === "center" || align === "top") && (visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"),
            align !== "center" && align !== "top" && "h-full w-[min(90vw,30rem)]",
            panelClassName,
          )}
          onClick={(event) => event.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

"use client";

import { isDisplayableImage } from "@/lib/display-image";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function StoredImage({
  src,
  alt,
  className,
  fit = "cover",
  sizing = "intrinsic",
  position = "center",
  priority = false,
  width,
  height,
}: {
  src: string | null;
  alt: string;
  className?: string;
  fit?: "cover" | "contain";
  sizing?: "intrinsic" | "frame";
  position?: "center" | "bottom";
  priority?: boolean;
  width?: number;
  height?: number;
}) {
  const [failed, setFailed] = useState(false);
  const stored = isDisplayableImage(src);

  if (!stored || failed) {
    return (
      <span className={cn("block bg-canvas-muted", className)} role="img" aria-label={alt || "No image"}>
        <span className="sr-only">{alt || "No image"}</span>
      </span>
    );
  }

  return (
    <span className={cn("relative block bg-canvas-muted", (fit === "cover" || sizing === "frame") && "overflow-hidden", className)}>
      {/* Data URLs are often complete before React can attach onLoad, so visibility must not depend on that event. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src ?? undefined}
        alt={alt}
        className={cn(
          sizing === "frame" && "absolute inset-0 h-full w-full object-contain",
          sizing === "intrinsic" && fit === "contain" && "block h-auto w-full object-contain",
          sizing === "intrinsic" && fit === "cover" && "absolute inset-0 h-full w-full object-cover",
          position === "bottom" && "object-bottom",
        )}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        onError={() => setFailed(true)}
      />
    </span>
  );
}

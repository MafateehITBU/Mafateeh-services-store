"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

export function StoredImage({
  src,
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const stored = Boolean(src?.startsWith("data:image/"));

  if (!stored || failed) {
    return (
      <span className={cn("block bg-canvas-muted", className)} role="img" aria-label={alt || "No image"}>
        <span className="sr-only">{alt || "No image"}</span>
      </span>
    );
  }

  return (
    <span className={cn("relative block overflow-hidden bg-canvas-muted", className)}>
      {loaded ? null : <span className="absolute inset-0 animate-pulse bg-canvas-muted" aria-hidden="true" />}
      {/* Stored images are base64 data URLs in PostgreSQL, so they are not loaded from an image host. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src ?? undefined}
        alt={alt}
        className={cn("h-full w-full object-cover", loaded ? "opacity-100" : "opacity-0")}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </span>
  );
}

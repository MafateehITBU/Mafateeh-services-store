"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

export function FramedArtwork({
  src,
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const stored = Boolean(src?.startsWith("data:image/"));

  if (!stored || failed) {
    return (
      <span className={cn("block bg-[#f7f4ec]", className)} role="img" aria-label={alt || "No image"}>
        <span className="sr-only">{alt || "No image"}</span>
      </span>
    );
  }

  return (
    <span className={cn("relative block overflow-hidden", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src ?? undefined} alt={alt} className="absolute inset-0 h-full w-full object-cover object-center" onError={() => setFailed(true)} />
    </span>
  );
}

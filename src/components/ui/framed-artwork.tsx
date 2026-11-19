"use client";

import { isDisplayableImage } from "@/lib/display-image";
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
  const stored = isDisplayableImage(src);

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
      <img src={src ?? undefined} alt={alt} width={1200} height={720} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-center" onError={() => setFailed(true)} />
    </span>
  );
}

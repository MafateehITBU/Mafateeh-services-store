"use client";

import { RichTextView } from "@/features/services/rich-text-view";
import type { RichNode } from "@/features/services/rich-text";
import { StoredImage } from "@/components/ui/stored-image";

export function ServicePreview({
  locale,
  name,
  shortDescription,
  description,
  cover,
  gallery,
  price,
  currency,
  ratingAverage,
  reviewCount,
}: {
  locale: "en" | "ar";
  name: string;
  shortDescription: string;
  description: RichNode;
  cover: string | null;
  gallery: Array<{ image: string; altText: string }>;
  price: string;
  currency: string;
  ratingAverage: number | null;
  reviewCount: number;
}) {
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <article dir={dir} className="rounded-3xl border border-line bg-canvas-muted p-4">
      <StoredImage src={cover} alt="" className="aspect-[16/9] w-full rounded-2xl" />
      {gallery.length > 0 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {gallery.map((image, index) => (
            <StoredImage key={`${image.altText}-${index}`} src={image.image} alt={image.altText} className="size-16 shrink-0 rounded-xl" />
          ))}
        </div>
      ) : null}
      <h3 className="mt-4 text-2xl font-bold text-ink">{name || (locale === "ar" ? "اسم الخدمة" : "Service name")}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{shortDescription}</p>
      {reviewCount > 0 && ratingAverage !== null ? (
        <p className="mt-3 text-sm font-semibold text-ink">
          {ratingAverage.toFixed(1)} · {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
        </p>
      ) : null}
      <p className="mt-4 text-xl font-bold text-brand">
        {price || "0"} {currency}
      </p>
      <div className="mt-4 rounded-2xl bg-white p-4">
        <RichTextView document={description} dir={dir} />
      </div>
    </article>
  );
}

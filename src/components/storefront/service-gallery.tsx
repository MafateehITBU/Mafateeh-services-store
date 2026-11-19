"use client";

import { StoredImage } from "@/components/ui/stored-image";
import { useState } from "react";

type GalleryImage = {
  id: string;
  imageUrl: string;
  altText: string | null;
};

export function ServiceGallery({
  name,
  coverImageUrl,
  gallery,
}: {
  name: string;
  coverImageUrl: string;
  gallery: GalleryImage[];
}) {
  const images = [{ id: "cover", imageUrl: coverImageUrl, altText: name }, ...gallery];
  const [activeId, setActiveId] = useState(images[0]?.id ?? "cover");
  const active = images.find((image) => image.id === activeId) ?? images[0];

  return (
    <div className="space-y-3">
      <StoredImage src={active?.imageUrl ?? coverImageUrl} alt={active?.altText || name} className="aspect-[4/3] w-full rounded-3xl" width={1200} height={900} />
      {gallery.length > 0 ? (
        <div className="grid grid-cols-4 gap-3">
          {images.map((image) => {
            const selected = image.id === active?.id;

            return (
              <button
                key={image.id}
                type="button"
                aria-pressed={selected}
                aria-label={image.altText || name}
                onClick={() => setActiveId(image.id)}
                className={`cursor-pointer overflow-hidden rounded-xl ${selected ? "ring-2 ring-[#157037]" : "ring-1 ring-[#e4ebe6]"}`}
              >
                <StoredImage src={image.imageUrl} alt="" className="aspect-square w-full" width={240} height={240} />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

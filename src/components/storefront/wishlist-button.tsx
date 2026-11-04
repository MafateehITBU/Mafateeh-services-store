"use client";

import { useWishlist } from "@/features/wishlist/wishlist-provider";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function WishlistButton({ serviceId }: { serviceId: string }) {
  const t = useTranslations("Profile");
  const wishlist = useWishlist();
  const router = useRouter();
  const saved = wishlist.saved(serviceId);

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? t("removeWishlist") : t("addWishlist")}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void wishlist.toggle(serviceId).then((changed) => {
          if (changed) {
            router.refresh();
          }
        });
      }}
      className="absolute top-2 end-2 z-10 inline-flex size-9 cursor-pointer items-center justify-center rounded-full bg-white/95 shadow-[0_8px_16px_-12px_rgba(12,61,30,0.8)]"
    >
      <Heart aria-hidden="true" className={saved ? "size-4 fill-[#d3122a] text-[#d3122a]" : "size-4 text-[#6b7280]"} />
    </button>
  );
}

import { AddToCartButton } from "@/components/storefront/add-to-cart-button";
import { WishlistButton } from "@/components/storefront/wishlist-button";
import { StoredImage } from "@/components/ui/stored-image";
import { Link } from "@/i18n/navigation";
import { Star } from "lucide-react";

export function CategoryServiceCard({
  service,
  labels,
}: {
  service: {
    id: string;
    slug: string;
    name: string;
    shortDescription: string;
    coverImageUrl: string;
    price: string;
    currency: string;
    isFeatured: boolean;
    categoryTitle: string;
    ratingAverage: number | null;
    reviewCount: number;
  };
  labels: {
    addToCart: string;
    featured: string;
    rating: string;
  };
}) {
  const rated = service.reviewCount > 0 && service.ratingAverage != null;

  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#e4ebe6] bg-white shadow-[0_10px_18px_-14px_rgba(12,61,30,0.45)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_24px_-14px_rgba(12,61,30,0.4)]">
      <WishlistButton serviceId={service.id} />
      <Link href={`/services/${service.slug}`} className="flex flex-1 cursor-pointer flex-col">
        <StoredImage src={service.coverImageUrl} alt={service.name} className="aspect-square w-full" />
        <div className="flex flex-1 flex-col px-3 pt-3 text-center">
          <h2 className="line-clamp-2 min-h-[2.7em] text-sm font-bold leading-snug text-ink md:text-base">{service.name}</h2>
          <p className="mt-1 line-clamp-2 min-h-[2.5em] text-xs leading-5 text-[#5d6b62]">{service.shortDescription}</p>
          <p className="mt-3 rounded-lg bg-[#f3f6f4] px-2 py-2 text-xs leading-5 text-[#3d4d44]">
            {service.categoryTitle}
            {service.isFeatured ? ` · ${labels.featured}` : ""}
          </p>
          {rated ? (
            <p className="mt-1 inline-flex items-center justify-center gap-1 text-xs font-semibold text-[#9a6b12]">
              <Star aria-hidden="true" className="size-3.5 fill-[#dfb026] text-[#dfb026]" />
              <span>{labels.rating}</span>
            </p>
          ) : null}
          <p className="mt-1 text-lg font-bold text-[#d3122a]">
            {service.price} <span className="text-sm">{service.currency}</span>
          </p>
        </div>
      </Link>
      <div className="px-3 pb-3">
        <AddToCartButton service={service} label={labels.addToCart} />
      </div>
    </article>
  );
}

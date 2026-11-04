import { WishlistButton } from "@/components/storefront/wishlist-button";
import { StoredImage } from "@/components/ui/stored-image";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export type ServiceCardData = {
  id: string;
  slug: string;
  name: string;
  shortDescription?: string | null;
  coverImageUrl: string;
  price: string;
  currency: string;
  ratingAverage?: number | null;
  reviewCount?: number | null;
};

export async function ServiceCard({ service }: { service: ServiceCardData }) {
  const t = await getTranslations("Store");
  const reviews = service.reviewCount ?? 0;

  return (
    <article className="relative overflow-hidden rounded-2xl border border-line bg-white shadow-[var(--shadow-soft)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-panel)]">
      <WishlistButton serviceId={service.id} />
      <Link href={`/services/${service.slug}`} className="block cursor-pointer">
        <StoredImage src={service.coverImageUrl} alt={service.name} className="aspect-[4/3] w-full" />
        <div className="space-y-2 p-4">
          <h3 className="line-clamp-2 text-base font-bold">{service.name}</h3>
          {service.shortDescription ? <p className="line-clamp-2 text-sm leading-6 text-muted">{service.shortDescription}</p> : null}
          {reviews > 0 && service.ratingAverage != null ? (
            <p className="text-sm font-semibold text-brand-gold">{t("rating", { rating: service.ratingAverage, count: reviews })}</p>
          ) : null}
          <p className="text-sm font-bold text-brand">
            {service.price} {service.currency}
          </p>
        </div>
      </Link>
    </article>
  );
}

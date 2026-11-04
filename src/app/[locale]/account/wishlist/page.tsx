import { CategoryServiceCard } from "@/components/storefront/category-service-card";
import { redirect } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { listCustomerWishlist } from "@/server/storefront/account";
import { Heart } from "lucide-react";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";

export const instant = false;

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await connection();
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: "Profile" });
  return { title: t("wishlist") };
}

export default async function WishlistPage({ params }: PageProps) {
  await connection();
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const language = locale as AppLocale;
  const [t, store, services] = await Promise.all([getTranslations("Profile"), getTranslations("Store"), listCustomerWishlist(language)]);

  if (!services) {
    redirect({ href: "/", locale });
    return null;
  }

  return (
    <section>
      <h1 className="text-xl font-bold">{t("wishlist")}</h1>
      {services.length === 0 ? (
        <div className="flex flex-col items-center px-4 py-20 text-center text-[#9aa59e]">
          <Heart aria-hidden="true" className="size-14 stroke-[1.25]" />
          <p className="mt-4 text-sm">{t("emptyWishlist")}</p>
          <p className="mt-1 text-sm">{t("emptyWishlistBody")}</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <CategoryServiceCard
              key={service.id}
              service={service}
              labels={{
                addToCart: store("addToCart"),
                featured: store("featured"),
                rating: store("rating", { rating: service.ratingAverage ?? 0, count: service.reviewCount }),
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

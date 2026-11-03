import { HomeSections } from "@/components/storefront/home-content";
import { CategoryCarousel } from "@/components/storefront/category-carousel";
import { HeroCarousel } from "@/components/storefront/hero-carousel";
import { PromoFeature } from "@/components/storefront/promo-banners";
import { TestimonialCarousel } from "@/components/storefront/testimonial-carousel";
import { getPublicCategoryTree } from "@/features/categories/get-public-categories";
import { getPublicHomepage } from "@/features/homepage/get-public-homepage";
import { listHomepageTestimonials } from "@/features/reviews/get-public-testimonials";
import { routing, type AppLocale } from "@/i18n/routing";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const instant = false;

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `/${locale}`,
      languages: { en: "/en", ar: "/ar", "x-default": "/en" },
    },
  };
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const language = locale as AppLocale;
  const [homepage, catalog, t] = await Promise.all([
    getPublicHomepage(language),
    getPublicCategoryTree(language),
    getTranslations("Store"),
  ]);
  const showReviews = homepage.blocks.some((block) => block.type === "TESTIMONIAL_CAROUSEL");
  const testimonials = showReviews ? await listHomepageTestimonials(language) : [];

  return (
    <div className="bg-white">
      {homepage.blocks.map((block, index) => {
        if (block.type === "HERO_CAROUSEL") {
          return <HeroCarousel key={block.id} banners={block.banners} />;
        }

        if (block.type === "CATEGORY_CAROUSEL") {
          return <CategoryCarousel key={block.id} categories={catalog.categories} />;
        }

        if (block.type === "PROMOTIONAL_BANNER") {
          const earlierPromos = homepage.blocks.slice(0, index).filter((item) => item.type === "PROMOTIONAL_BANNER").length;

          return (
            <section key={block.id} className="bg-white">
              <div className="mx-auto max-w-[var(--container)] px-4 py-14 md:px-6 md:py-16">
                <PromoFeature banner={block.banner} imageFirst={earlierPromos % 2 === 1} />
              </div>
            </section>
          );
        }

        if (block.type === "HOME_SECTION") {
          return <HomeSections key={block.id} sections={[block.section]} />;
        }

        return <TestimonialCarousel key={block.id} items={testimonials} />;
      })}
      {homepage.blocks.length > 0 ? null : (
        <section className="mx-auto max-w-xl px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">{t("emptyTitle")}</h1>
          <p className="mt-3 text-sm leading-6 text-muted">{t("emptyBody")}</p>
        </section>
      )}
    </div>
  );
}

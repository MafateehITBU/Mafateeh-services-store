import { JsonLd } from "@/components/seo/json-ld";
import { HomeSections } from "@/components/storefront/home-content";
import { CategoryCarousel } from "@/components/storefront/category-carousel";
import { HeroCarousel } from "@/components/storefront/hero-carousel";
import { PromoFeature } from "@/components/storefront/promo-banners";
import { TestimonialCarousel } from "@/components/storefront/testimonial-carousel";
import { getPublicCategoryTree } from "@/features/categories/get-public-categories";
import { getPublicHomepage } from "@/features/homepage/get-public-homepage";
import { site } from "@/config/site";
import { routing, type AppLocale } from "@/i18n/routing";
import { absoluteUrl } from "@/lib/env";
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
  const homepage = await getPublicHomepage(locale);
  const hero = homepage.blocks.find((block) => block.type === "HERO_CAROUSEL");
  const image = hero?.type === "HERO_CAROUSEL" ? hero.banners[0]?.desktopImageUrl : undefined;
  const title = t("title");
  const description = t("description");

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/${locale}`),
      languages: { en: absoluteUrl("/en"), ar: absoluteUrl("/ar"), "x-default": absoluteUrl("/en") },
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/${locale}`),
      siteName: site.name,
      locale: locale === "ar" ? "ar_JO" : "en_US",
      type: "website",
      images: image ? [{ url: absoluteUrl(image) }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [absoluteUrl(image)] : undefined,
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
  return (
    <div className="bg-white">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: site.legalName,
          url: absoluteUrl(`/${language}`),
          email: site.email,
          telephone: site.phone,
          address: { "@type": "PostalAddress", streetAddress: site.locale(language).address, addressCountry: "JO" },
        }}
      />
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

        if (block.type === "TESTIMONIAL_CAROUSEL") {
          return <TestimonialCarousel key={block.id} />;
        }

        return null;
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

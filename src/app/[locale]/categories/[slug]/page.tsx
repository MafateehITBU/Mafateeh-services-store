import { JsonLd } from "@/components/seo/json-ld";
import { CategoryBanner } from "@/components/storefront/category-banner";
import { CategoryPagination } from "@/components/storefront/category-pagination";
import { CategoryServiceCard } from "@/components/storefront/category-service-card";
import { CategoryToolbar } from "@/components/storefront/category-toolbar";
import { getPublicCategory } from "@/features/categories/get-public-categories";
import { listCategoryServices, parseCategoryPage, parseCategorySort } from "@/features/services/get-public-services";
import { site } from "@/config/site";
import { absoluteUrl } from "@/lib/env";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { ChevronRight } from "lucide-react";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";

export const instant = false;

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ sort?: string | string[]; page?: string | string[] }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await connection();
  const { locale, slug } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return {};
  }

  const category = await getPublicCategory(slug, locale);
  if (!category) {
    return {};
  }

  const title = category.seoTitle || category.title;
  const description = category.seoDescription || category.description || undefined;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/${locale}/categories/${category.slug}`),
      languages: {
        en: absoluteUrl(`/en/categories/${category.slug}`),
        ar: absoluteUrl(`/ar/categories/${category.slug}`),
        "x-default": absoluteUrl(`/en/categories/${category.slug}`),
      },
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/${locale}/categories/${category.slug}`),
      siteName: site.name,
      locale: locale === "ar" ? "ar_JO" : "en_US",
      type: "website",
      images: category.bannerImageUrl ? [{ url: absoluteUrl(category.bannerImageUrl) }] : undefined,
    },
    twitter: {
      card: category.bannerImageUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: category.bannerImageUrl ? [absoluteUrl(category.bannerImageUrl)] : undefined,
    },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  await connection();
  const { locale, slug } = await params;
  const query = await searchParams;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const language = locale as AppLocale;
  const category = await getPublicCategory(slug, language);

  if (!category) {
    notFound();
  }

  const sort = parseCategorySort(first(query.sort));
  const requestedPage = parseCategoryPage(first(query.page));
  const [listing, t] = await Promise.all([
    listCategoryServices(language, slug, sort, requestedPage),
    getTranslations("Store"),
  ]);

  return (
    <article className="mx-auto max-w-[var(--container)] px-4 py-6 md:px-6 md:py-8">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: t("home"), item: absoluteUrl(`/${language}`) },
            { "@type": "ListItem", position: 2, name: category.title, item: absoluteUrl(`/${language}/categories/${category.slug}`) },
          ],
        }}
      />
      <nav aria-label={t("breadcrumbs")} className="mb-4 flex items-center gap-2 text-sm text-[#5d6b62]">
        <Link href="/" className="cursor-pointer font-semibold hover:text-brand">{t("home")}</Link>
        <ChevronRight aria-hidden="true" className="size-3.5 rtl:rotate-180" />
        <span className="text-ink">{category.title}</span>
      </nav>
      <CategoryBanner
        title={category.title}
        description={category.description}
        bannerImageUrl={category.bannerImageUrl}
        locale={language}
        brand={t("brandMark")}
      />
      <div className="mt-6">
        <CategoryToolbar
          sort={listing.sort}
          sortLabel={t("sortLabel")}
          summary={t("results", { title: category.title, count: listing.total })}
          options={[
            { value: "featured", label: t("sortFeatured") },
            { value: "newest", label: t("sortNewest") },
            { value: "price-asc", label: t("sortPriceAsc") },
            { value: "price-desc", label: t("sortPriceDesc") },
            { value: "rating", label: t("sortRating") },
          ]}
        />
      </div>
      {listing.services.length === 0 ? (
        <p className="mt-10 text-center text-sm text-[#5d6b62]">{t("categoryEmpty")}</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 lg:grid-cols-3">
          {listing.services.map((service) => (
            <CategoryServiceCard
              key={service.id}
              service={service}
              labels={{
                addToCart: t("addToCart"),
                featured: t("featured"),
                rating: t("rating", { rating: service.ratingAverage ?? 0, count: service.reviewCount }),
              }}
            />
          ))}
        </div>
      )}
      <CategoryPagination
        slug={category.slug}
        sort={listing.sort}
        page={listing.page}
        pageCount={listing.pageCount}
        locale={language}
        labels={{ previous: t("pagePrevious"), next: t("pageNext"), page: t("pageLabel") }}
      />
    </article>
  );
}

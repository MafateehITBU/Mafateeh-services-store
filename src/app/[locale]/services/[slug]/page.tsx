import { JsonLd } from "@/components/seo/json-ld";
import { CategoryServiceCard } from "@/components/storefront/category-service-card";
import { ReviewForm } from "@/components/storefront/review-form";
import { ReviewSummary } from "@/components/storefront/review-summary";
import { ServiceGallery } from "@/components/storefront/service-gallery";
import { ServiceStars } from "@/components/storefront/service-stars";
import { AddToCartButton } from "@/components/storefront/add-to-cart-button";
import { StoredImage } from "@/components/ui/stored-image";
import { RichTextView } from "@/features/services/rich-text-view";
import { getPublicService } from "@/features/services/get-public-services";
import { Link } from "@/i18n/navigation";
import { absoluteUrl } from "@/lib/env";
import { site } from "@/config/site";
import { routing, type AppLocale } from "@/i18n/routing";
import { readSignedInUser } from "@/server/auth/storefront-user";
import { hasUserReview } from "@/server/storefront/reviews";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { UserRound } from "lucide-react";
import { connection } from "next/server";
import { notFound } from "next/navigation";

export const instant = false;

type PageProps = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await connection();
  const { locale, slug } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return {};
  }

  const service = await getPublicService(slug, locale);
  if (!service) {
    return {};
  }

  const title = service.seoTitle || service.name;
  const description = service.seoDescription || service.shortDescription;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/${locale}/services/${service.slug}`),
      languages: {
        en: absoluteUrl(`/en/services/${service.slug}`),
        ar: absoluteUrl(`/ar/services/${service.slug}`),
        "x-default": absoluteUrl(`/en/services/${service.slug}`),
      },
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/${locale}/services/${service.slug}`),
      siteName: site.name,
      locale: locale === "ar" ? "ar_JO" : "en_US",
      type: "website",
      images: [{ url: absoluteUrl(service.coverImageUrl) }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteUrl(service.coverImageUrl)],
    },
  };
}

export default async function ServicePage({ params }: PageProps) {
  await connection();
  const { locale, slug } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const language = locale as AppLocale;
  const [service, t, user] = await Promise.all([getPublicService(slug, language), getTranslations("Store"), readSignedInUser()]);

  if (!service) {
    notFound();
  }

  const reviewed = user ? await hasUserReview(user.id, service.id) : false;
  const showReviewForm = Boolean(user) && !reviewed;
  const starValue = service.reviewCount > 0 && service.ratingAverage != null ? service.ratingAverage : 4;
  const dateFormat = new Intl.DateTimeFormat(language === "ar" ? "ar" : "en-GB", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });

  return (
    <article className="mx-auto max-w-[var(--container)] px-4 py-8 md:px-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: t("home"), item: absoluteUrl(`/${language}`) },
            { "@type": "ListItem", position: 2, name: service.category.title, item: absoluteUrl(`/${language}/categories/${service.category.slug}`) },
            { "@type": "ListItem", position: 3, name: service.name, item: absoluteUrl(`/${language}/services/${service.slug}`) },
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: service.name,
          description: service.shortDescription,
          image: absoluteUrl(service.coverImageUrl),
          provider: { "@type": "Organization", name: site.legalName },
          ...(service.reviewCount > 0 && service.ratingAverage != null
            ? { aggregateRating: { "@type": "AggregateRating", ratingValue: service.ratingAverage, reviewCount: service.reviewCount } }
            : {}),
        }}
      />
      <nav aria-label={t("breadcrumbs")} className="text-sm text-muted">
        <Link href="/" className="cursor-pointer font-semibold text-brand">{t("home")}</Link>
        <span aria-hidden="true"> / </span>
        <Link href={`/categories/${service.category.slug}`} className="cursor-pointer font-semibold text-brand">{service.category.title}</Link>
        <span aria-hidden="true"> / </span>
        <span>{service.name}</span>
      </nav>
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
        <ServiceGallery name={service.name} coverImageUrl={service.coverImageUrl} gallery={service.gallery} />
        <div>
          <h1 className="text-3xl font-bold md:text-4xl">{service.name}</h1>
          <ServiceStars value={starValue} label={service.reviewCount > 0 ? t("stars", { count: Math.round(starValue) }) : ""} />
          <p className="mt-4 text-base leading-7 text-muted">{service.shortDescription}</p>
          <p className="mt-4 text-2xl font-bold text-[#d3122a]">
            {service.price} <span className="text-lg">{service.currency}</span>
          </p>
          <AddToCartButton
            service={{
              id: service.id,
              slug: service.slug,
              name: service.name,
              price: service.price,
              currency: service.currency,
            }}
            label={t("addToCart")}
          />
        </div>
      </div>
      <hr className="mt-10 border-0 border-t border-[#e4e4e4]" />
      <section className="mt-8">
        <RichTextView document={service.detailedDescription} dir={locale === "ar" ? "rtl" : "ltr"} className="space-y-3 text-base leading-7" />
      </section>
      {service.reviews.length > 0 || showReviewForm ? (
        <section className="mt-10 border-t border-[#e4e4e4] pt-8">
          {showReviewForm ? <ReviewForm serviceId={service.id} /> : null}
          {service.reviews.length > 0 ? (
            <div className={showReviewForm ? "mt-10" : undefined}>
              <h2 className="text-2xl font-bold">{t("reviews")}</h2>
              <div className="mt-6">
                <ReviewSummary
                  average={service.ratingAverage ?? starValue}
                  count={service.reviewCount}
                  counts={service.ratingCounts}
                  basedOn={t("basedOn", { count: service.reviewCount })}
                  recommendedLabel={t("recommended")}
                />
              </div>
              <ul className="mt-8">
                {service.reviews.map((review) => (
                  <li key={review.id} className="border-t border-[#ececec] py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {review.avatarUrl ? (
                          <StoredImage src={review.avatarUrl} alt="" className="size-10 shrink-0 rounded-full" />
                        ) : (
                          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e7f5ec] text-brand">
                            <UserRound aria-hidden="true" className="size-5" />
                          </span>
                        )}
                        <div>
                          <p className="font-bold">{review.author || t("customer")}</p>
                          <ServiceStars value={review.rating} label={t("stars", { count: review.rating })} className="mt-1" />
                        </div>
                      </div>
                      <time dateTime={review.createdAt} className="text-sm text-muted">
                        {dateFormat.format(new Date(review.createdAt))}
                      </time>
                    </div>
                    {review.comment ? <p className="mt-3 text-sm leading-6">{review.comment}</p> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
      {service.related.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-2xl font-bold">{t("similar")}</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 lg:grid-cols-3">
            {service.related.map((item) => (
              <CategoryServiceCard
                key={item.id}
                service={{ ...item, categoryTitle: service.category.title }}
                labels={{
                  addToCart: t("addToCart"),
                  featured: t("featured"),
                  rating: t("rating", { rating: item.ratingAverage ?? 0, count: item.reviewCount }),
                }}
              />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}

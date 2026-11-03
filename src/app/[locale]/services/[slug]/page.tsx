import { ServiceCard } from "@/components/storefront/service-card";
import { StoredImage } from "@/components/ui/stored-image";
import { RichTextView } from "@/features/services/rich-text-view";
import { getPublicService } from "@/features/services/get-public-services";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
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

  return {
    title: service.seoTitle || service.name,
    description: service.seoDescription || service.shortDescription,
    alternates: {
      canonical: `/${locale}/services/${service.slug}`,
      languages: {
        en: `/en/services/${service.slug}`,
        ar: `/ar/services/${service.slug}`,
        "x-default": `/en/services/${service.slug}`,
      },
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
  const [service, t] = await Promise.all([getPublicService(slug, language), getTranslations("Store")]);

  if (!service) {
    notFound();
  }

  return (
    <article className="mx-auto max-w-[var(--container)] px-4 py-8 md:px-6">
      <nav aria-label={t("breadcrumbs")} className="text-sm text-muted">
        <Link href="/" className="cursor-pointer font-semibold text-brand">{t("home")}</Link>
        <span aria-hidden="true"> / </span>
        <Link href={`/categories/${service.category.slug}`} className="cursor-pointer font-semibold text-brand">{service.category.title}</Link>
        <span aria-hidden="true"> / </span>
        <span>{service.name}</span>
      </nav>
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
        <div className="space-y-3">
          <StoredImage src={service.coverImageUrl} alt={service.name} className="aspect-[4/3] w-full rounded-3xl" />
          {service.gallery.length > 0 ? (
            <div className="grid grid-cols-4 gap-3">
              {service.gallery.map((image) => (
                <StoredImage key={image.id} src={image.imageUrl} alt={image.altText || service.name} className="aspect-square rounded-xl" />
              ))}
            </div>
          ) : null}
        </div>
        <div>
          <p className="text-sm font-semibold text-brand">{service.category.title}</p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">{service.name}</h1>
          {service.reviewCount > 0 && service.ratingAverage != null ? (
            <p className="mt-3 text-sm font-semibold text-brand-gold">{t("rating", { rating: service.ratingAverage, count: service.reviewCount })}</p>
          ) : null}
          <p className="mt-4 text-2xl font-bold text-brand">{service.price} {service.currency}</p>
          <p className="mt-4 text-base leading-7 text-muted">{service.shortDescription}</p>
        </div>
      </div>
      <section className="mt-10">
        <h2 className="text-2xl font-bold">{t("description")}</h2>
        <RichTextView document={service.detailedDescription} dir={locale === "ar" ? "rtl" : "ltr"} className="mt-4 space-y-3 text-base leading-7" />
      </section>
      <section className="mt-10">
        <h2 className="text-2xl font-bold">{t("reviews")}</h2>
        {service.reviews.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{t("noReviews")}</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {service.reviews.map((review) => (
              <li key={review.id} className="rounded-2xl border border-line bg-white p-4">
                <p className="font-semibold">{review.author || t("customer")}</p>
                <p className="mt-1 text-sm text-brand-gold">{t("stars", { count: review.rating })}</p>
                <p className="mt-2 text-sm leading-6">{review.comment}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      {service.related.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-2xl font-bold">{t("related")}</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {service.related.map((item) => (
              <ServiceCard key={item.id} service={item} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}

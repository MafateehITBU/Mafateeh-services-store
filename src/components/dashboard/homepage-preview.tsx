"use client";

import { StoredImage } from "@/components/ui/stored-image";
import { bannerDestinationHref } from "@/features/homepage/banner-destination";
import type { ReactNode } from "react";

type Copy = { title: string; subtitle: string; buttonLabel?: string };

export type PreviewBanner = {
  id: string;
  desktopImageUrl: string | null;
  mobileImageUrl: string | null;
  linkUrl: string | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  en: Copy;
  ar: Copy;
};

export type PreviewService = {
  id: string;
  name: string;
  price: string;
  currency: string;
  coverImageUrl: string | null;
};

export type PreviewSection = {
  id: string;
  type: string;
  isActive: boolean;
  categoryTitle: string | null;
  serviceIds: string[];
  en: { title: string; subtitle: string };
  ar: { title: string; subtitle: string };
};

const typeLabels: Record<string, string> = {
  FEATURED_CATEGORIES: "Featured category",
  FEATURED_SERVICES: "Featured services",
  CATEGORY_SERVICES: "Category services",
  CUSTOM_SERVICES: "Custom services",
};

function scheduled(item: PreviewBanner, now: number) {
  if (!item.isActive) {
    return false;
  }

  if (item.startsAt && new Date(item.startsAt).getTime() > now) {
    return false;
  }

  if (item.endsAt && new Date(item.endsAt).getTime() < now) {
    return false;
  }

  return true;
}

export function HomepagePreview({
  locale,
  now,
  hero,
  promotions,
  sections,
  services,
}: {
  locale: "en" | "ar";
  now: number;
  hero: PreviewBanner[];
  promotions: PreviewBanner[];
  sections: PreviewSection[];
  services: PreviewService[];
}) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const visibleHero = hero.filter((item) => scheduled(item, now));
  const visiblePromos = promotions.filter((item) => scheduled(item, now));
  const visibleSections = sections.filter((item) => item.isActive);
  const byId = new Map(services.map((service) => [service.id, service]));
  const categoryAnchorId = visibleSections.find((section) => section.type === "FEATURED_CATEGORIES")?.id;

  return (
    <div dir={dir} className="grid gap-6">
      <PreviewBand title={locale === "ar" ? "البانر الرئيسي" : "Hero carousel"} empty={locale === "ar" ? "لا توجد لافتات ظاهرة." : "No visible hero banners."}>
        {visibleHero.map((banner) => (
          <BannerCard key={banner.id} banner={banner} locale={locale} />
        ))}
      </PreviewBand>
      <PreviewBand title={locale === "ar" ? "البانرات الترويجية" : "Promotional banners"} empty={locale === "ar" ? "لا توجد لافتات ظاهرة." : "No visible promotional banners."}>
        {visiblePromos.map((banner) => (
          <BannerCard key={banner.id} banner={banner} locale={locale} />
        ))}
      </PreviewBand>
      {visibleSections.length === 0 ? <p className="text-sm text-muted">{locale === "ar" ? "لا توجد أقسام ظاهرة." : "No visible sections."}</p> : null}
      {visibleSections.map((section) => {
        const copy = locale === "ar" ? section.ar : section.en;
        const cards = section.serviceIds.flatMap((id) => {
          const service = byId.get(id);
          return service ? [service] : [];
        });

        return (
          <section key={section.id} id={section.id === categoryAnchorId ? "service-categories" : undefined} className="rounded-3xl border border-line bg-white p-4">
            <p className="text-xs font-semibold text-muted">{typeLabels[section.type] ?? section.type}</p>
            <h3 className="mt-1 text-xl font-bold">{copy.title || (locale === "ar" ? "قسم" : "Section")}</h3>
            {copy.subtitle ? <p className="mt-1 text-sm text-muted">{copy.subtitle}</p> : null}
            {section.categoryTitle ? <p className="mt-2 text-sm font-semibold">{section.categoryTitle}</p> : null}
            {cards.length > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map((service) => (
                  <article key={service.id} className="rounded-2xl border border-line p-3">
                    <StoredImage src={service.coverImageUrl} alt="" className="aspect-[4/3] w-full rounded-xl" />
                    <p className="mt-2 font-semibold">{service.name}</p>
                    <p className="text-sm text-brand">
                      {service.price} {service.currency}
                    </p>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function PreviewBand({ title, empty, children }: { title: string; empty: string; children: ReactNode[] }) {
  return (
    <section>
      <h3 className="mb-3 text-lg font-bold">{title}</h3>
      {children.length === 0 ? <p className="text-sm text-muted">{empty}</p> : <div className="grid gap-3 md:grid-cols-2">{children}</div>}
    </section>
  );
}

function BannerCard({ banner, locale }: { banner: PreviewBanner; locale: "en" | "ar" }) {
  const copy = locale === "ar" ? banner.ar : banner.en;
  const href = bannerDestinationHref(banner.linkUrl);

  return (
    <article className="overflow-hidden rounded-3xl border border-line bg-white">
      <StoredImage src={banner.desktopImageUrl} alt="" className="aspect-[16/7] w-full" />
      {banner.mobileImageUrl ? <StoredImage src={banner.mobileImageUrl} alt="" className="aspect-[4/3] w-full border-t border-line md:hidden" /> : null}
      <div className="p-4">
        <h4 className="text-lg font-bold">
          {href ? (
            <a href={href} className="cursor-pointer">
              {copy.title}
            </a>
          ) : (
            copy.title
          )}
        </h4>
        {copy.subtitle ? <p className="mt-1 text-sm text-muted">{copy.subtitle}</p> : null}
        {copy.buttonLabel ? (
          href ? (
            <a href={href} className="mt-3 inline-flex cursor-pointer text-sm font-semibold text-brand">
              {copy.buttonLabel}
            </a>
          ) : (
            <p className="mt-3 text-sm font-semibold text-brand">{copy.buttonLabel}</p>
          )
        ) : null}
      </div>
    </article>
  );
}

import "server-only";

import { bannerDestinationHref } from "@/features/homepage/banner-destination";
import { Locale, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const localeMap = { en: Locale.EN, ar: Locale.AR } as const;
type PublicLocale = keyof typeof localeMap;

function scheduled(now: Date): Prisma.StoreBannerWhereInput {
  return {
    isActive: true,
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
    ],
  };
}

async function ratingsFor(serviceIds: string[]) {
  const ratings = new Map<string, { ratingAverage: number | null; reviewCount: number }>();

  if (serviceIds.length === 0) {
    return ratings;
  }

  const rows = await prisma.review.groupBy({
    by: ["serviceId"],
    where: { serviceId: { in: serviceIds }, status: "APPROVED" },
    _avg: { rating: true },
    _count: { _all: true },
  });

  for (const row of rows) {
    ratings.set(row.serviceId, {
      reviewCount: row._count._all,
      ratingAverage: row._count._all > 0 && row._avg.rating !== null ? Math.round(row._avg.rating * 10) / 10 : null,
    });
  }

  return ratings;
}

const serviceSelect = {
  id: true,
  slug: true,
  coverImageUrl: true,
  basePrice: true,
  currency: true,
  sortOrder: true,
  translations: { select: { locale: true, name: true } },
} as const;

type ServiceRow = Prisma.ServiceGetPayload<{ select: typeof serviceSelect }>;
type ServiceCard = NonNullable<ReturnType<typeof presentService>>;
type PublicSection = {
  id: string;
  type: string;
  title: string;
  subtitle: string | null;
  sortOrder: number;
  category: { slug: string; title: string; imageUrl: string | null } | null;
  services: ServiceCard[];
};

function presentService(service: ServiceRow, locale: Locale, rating?: { ratingAverage: number | null; reviewCount: number }) {
  const translation = service.translations.find((item) => item.locale === locale);

  if (!translation || !service.coverImageUrl) {
    return null;
  }

  return {
    id: service.id,
    slug: service.slug,
    name: translation.name,
    coverImageUrl: service.coverImageUrl,
    price: service.basePrice.toString(),
    currency: service.currency,
    ratingAverage: rating?.ratingAverage ?? null,
    reviewCount: rating?.reviewCount ?? 0,
  };
}

export async function getPublicHomepage(locale: PublicLocale) {
  const language = localeMap[locale];
  const now = new Date();
  const [banners, sections] = await Promise.all([
    prisma.storeBanner.findMany({
      where: scheduled(now),
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        placement: true,
        desktopImageUrl: true,
        mobileImageUrl: true,
        linkUrl: true,
        sortOrder: true,
        translations: { where: { locale: language }, take: 1 },
      },
    }),
    prisma.homeSection.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        type: true,
        sortOrder: true,
        maxItems: true,
        translations: { where: { locale: language }, take: 1 },
        category: {
          select: {
            id: true,
            slug: true,
            isActive: true,
            iconImageUrl: true,
            translations: { where: { locale: language }, select: { title: true }, take: 1 },
          },
        },
        services: {
          orderBy: { sortOrder: "asc" },
          select: {
            service: {
              select: {
                ...serviceSelect,
                isActive: true,
                publishedAt: true,
                categoryId: true,
                category: { select: { isActive: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const visibleBanners = banners.flatMap((banner) => {
    const translation = banner.translations[0];

    if (!translation || !banner.desktopImageUrl.startsWith("data:image/")) {
      return [];
    }

    return [
      {
        id: banner.id,
        placement: banner.placement,
        desktopImageUrl: banner.desktopImageUrl,
        mobileImageUrl: banner.mobileImageUrl,
        linkUrl: bannerDestinationHref(banner.linkUrl),
        sortOrder: banner.sortOrder,
        title: translation.title,
        subtitle: translation.subtitle,
        buttonLabel: translation.buttonLabel,
      },
    ];
  });

  const linkedIds = sections.flatMap((section) => section.services.map((item) => item.service.id));
  const categoryIds = sections.flatMap((section) => (section.type === "CATEGORY_SERVICES" && section.services.length === 0 && section.category?.id ? [section.category.id] : []));
  const fallbackServices = categoryIds.length
    ? await prisma.service.findMany({
        where: { categoryId: { in: categoryIds }, isActive: true, publishedAt: { not: null }, category: { isActive: true } },
        orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
        select: { ...serviceSelect, categoryId: true },
      })
    : [];
  const ratings = await ratingsFor([...linkedIds, ...fallbackServices.map((service) => service.id)]);

  const sectionsResult: PublicSection[] = [];

  for (const section of sections) {
    const translation = section.translations[0];

    if (!translation) {
      continue;
    }

    const category = section.category?.isActive && section.category.translations[0]
      ? {
          slug: section.category.slug,
          title: section.category.translations[0].title,
          imageUrl: section.category.iconImageUrl,
        }
      : null;

    if (section.type === "FEATURED_CATEGORIES") {
      if (category) {
        sectionsResult.push({ id: section.id, type: section.type, title: translation.title, subtitle: translation.subtitle, sortOrder: section.sortOrder, category, services: [] });
      }

      continue;
    }

    const explicit = section.services.flatMap((item) => {
      const service = item.service;

      if (!service.isActive || !service.publishedAt || !service.category.isActive) {
        return [];
      }

      if (section.type === "CATEGORY_SERVICES" && service.categoryId !== section.category?.id) {
        return [];
      }

      const card = presentService(service, language, ratings.get(service.id));
      return card ? [card] : [];
    });
    const services = explicit.length > 0
      ? explicit.slice(0, section.maxItems)
      : section.type === "CATEGORY_SERVICES" && section.category
        ? fallbackServices
            .filter((service) => service.categoryId === section.category?.id)
            .flatMap((service) => {
              const card = presentService(service, language, ratings.get(service.id));
              return card ? [card] : [];
            })
            .slice(0, section.maxItems)
        : [];

    if ((section.type === "CATEGORY_SERVICES" && !category) || services.length === 0) {
      continue;
    }

    sectionsResult.push({ id: section.id, type: section.type, title: translation.title, subtitle: translation.subtitle, sortOrder: section.sortOrder, category, services });
  }

  return {
    hero: visibleBanners.filter((banner) => banner.placement === "HOME_HERO"),
    promotions: visibleBanners.filter((banner) => banner.placement === "HOME_PROMO"),
    sections: sectionsResult,
  };
}

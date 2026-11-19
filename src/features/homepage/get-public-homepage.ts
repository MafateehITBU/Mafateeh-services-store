import "server-only";

import { bannerDestinationHref } from "@/features/homepage/banner-destination";
import { Locale, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { idsWithStoredImage, mediaPath } from "@/server/media/media-url";
import { connection } from "next/server";
import { cache } from "react";

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
  updatedAt: true,
  basePrice: true,
  currency: true,
  sortOrder: true,
  translations: { select: { locale: true, name: true, shortDescription: true } },
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

function preferredTranslation<T extends { locale: Locale }>(rows: T[], locale: Locale) {
  return rows.find((item) => item.locale === locale) ?? rows[0] ?? null;
}

function presentService(service: ServiceRow, locale: Locale, covers: Set<string>, rating?: { ratingAverage: number | null; reviewCount: number }) {
  const translation = preferredTranslation(service.translations, locale);

  if (!translation || !covers.has(service.id)) {
    return null;
  }

  return {
    id: service.id,
    slug: service.slug,
    name: translation.name,
    shortDescription: translation.shortDescription,
    coverImageUrl: mediaPath("service-cover", service.id, service.updatedAt),
    price: service.basePrice.toString(),
    currency: service.currency,
    ratingAverage: rating?.ratingAverage ?? null,
    reviewCount: rating?.reviewCount ?? 0,
  };
}

type BannerRow = {
  id: string;
  updatedAt: Date;
  linkUrl: string | null;
  translations: Array<{ locale: Locale; title: string; subtitle: string | null; buttonLabel: string | null }>;
};

type SectionRow = {
  id: string;
  type: string;
  isActive: boolean;
  sortOrder: number;
  maxItems: number;
  translations: Array<{ locale: Locale; title: string; subtitle: string | null }>;
  category: {
    id: string;
    slug: string;
    isActive: boolean;
    updatedAt: Date;
    translations: Array<{ locale: Locale; title: string }>;
  } | null;
  services: Array<{
    service: ServiceRow & { isActive: boolean; publishedAt: Date | null; categoryId: string; category: { isActive: boolean } };
  }>;
};

export type PublicBanner = {
  id: string;
  desktopImageUrl: string;
  mobileImageUrl: string | null;
  linkUrl: string | null;
  title: string;
  subtitle: string | null;
  buttonLabel: string | null;
};

export type PublicHomeBlock =
  | { id: string; type: "HERO_CAROUSEL"; banners: PublicBanner[] }
  | { id: string; type: "PROMOTIONAL_BANNER"; banner: PublicBanner }
  | { id: string; type: "CATEGORY_CAROUSEL" }
  | { id: string; type: "HOME_SECTION"; section: PublicSection }
  | { id: string; type: "TESTIMONIAL_CAROUSEL" };

function presentBanner(banner: BannerRow, locale: Locale, desktops: Set<string>): PublicBanner | null {
  const translation = preferredTranslation(banner.translations, locale);

  if (!translation || !desktops.has(banner.id)) {
    return null;
  }

  return {
    id: banner.id,
    desktopImageUrl: mediaPath("banner-desktop", banner.id, banner.updatedAt),
    mobileImageUrl: mediaPath("banner-mobile", banner.id, banner.updatedAt),
    linkUrl: bannerDestinationHref(banner.linkUrl),
    title: translation.title,
    subtitle: translation.subtitle,
    buttonLabel: translation.buttonLabel,
  };
}

function presentSection(
  section: SectionRow,
  locale: Locale,
  ratings: Map<string, { ratingAverage: number | null; reviewCount: number }>,
  fallbackServices: Array<ServiceRow & { categoryId: string }>,
  covers: Set<string>,
  icons: Set<string>,
): PublicSection | null {
  const translation = preferredTranslation(section.translations, locale);
  const categoryTranslation = section.category ? preferredTranslation(section.category.translations, locale) : null;

  if (!section.isActive || !translation) {
    return null;
  }

  const category = section.category?.isActive && categoryTranslation
    ? { slug: section.category.slug, title: categoryTranslation.title, imageUrl: icons.has(section.category.id) ? mediaPath("category-icon", section.category.id, section.category.updatedAt) : null }
    : null;

  if (section.type === "FEATURED_CATEGORIES") {
    return category
      ? { id: section.id, type: section.type, title: translation.title, subtitle: translation.subtitle, sortOrder: section.sortOrder, category, services: [] }
      : null;
  }

  const explicit = section.services.flatMap((item) => {
    const service = item.service;

    if (!service.isActive || !service.publishedAt || !service.category.isActive) {
      return [];
    }

    if (section.type === "CATEGORY_SERVICES" && service.categoryId !== section.category?.id) {
      return [];
    }

    const card = presentService(service, locale, covers, ratings.get(service.id));
    return card ? [card] : [];
  });
  const services = explicit.length > 0
    ? explicit.slice(0, section.maxItems)
    : section.type === "CATEGORY_SERVICES" && section.category
      ? fallbackServices
          .filter((service) => service.categoryId === section.category?.id)
          .flatMap((service) => {
            const card = presentService(service, locale, covers, ratings.get(service.id));
            return card ? [card] : [];
          })
          .slice(0, section.maxItems)
      : [];

  if ((section.type === "CATEGORY_SERVICES" && !category) || services.length === 0) {
    return null;
  }

  return { id: section.id, type: section.type, title: translation.title, subtitle: translation.subtitle, sortOrder: section.sortOrder, category, services };
}

const sectionInclude = {
  id: true,
  type: true,
  isActive: true,
  sortOrder: true,
  maxItems: true,
  translations: true,
  category: {
    select: {
      id: true,
      slug: true,
      isActive: true,
      updatedAt: true,
      translations: { select: { locale: true, title: true } },
    },
  },
  services: {
    orderBy: { sortOrder: "asc" as const },
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
} as const;

async function loadPublicHomepage(locale: PublicLocale) {
  await connection();
  const language = localeMap[locale];
  const now = new Date();
  const items = await prisma.homepageLayoutItem.findMany({
    where: { isVisible: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      type: true,
      banner: {
        select: {
          id: true,
          isActive: true,
          startsAt: true,
          endsAt: true,
          updatedAt: true,
          linkUrl: true,
          translations: true,
        },
      },
      section: { select: sectionInclude },
    },
  });
  const heroSlides = items.some((item) => item.type === "HERO_CAROUSEL")
    ? await prisma.storeBanner.findMany({
        where: { placement: "HOME_HERO", ...scheduled(now) },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, updatedAt: true, linkUrl: true, translations: true },
      })
    : [];
  const sections = items.flatMap((item) => (item.section ? [item.section] : []));
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
  const bannerIds = [...heroSlides.map((banner) => banner.id), ...items.flatMap((item) => (item.banner ? [item.banner.id] : []))];
  const iconIds = sections.flatMap((section) => (section.category ? [section.category.id] : []));
  const [covers, desktops, icons] = await Promise.all([
    idsWithStoredImage("Service", "coverImageUrl", [...linkedIds, ...fallbackServices.map((service) => service.id)]),
    idsWithStoredImage("StoreBanner", "desktopImageUrl", bannerIds),
    idsWithStoredImage("Category", "iconImageUrl", iconIds),
  ]);
  const blocks: PublicHomeBlock[] = [];

  for (const item of items) {
    if (item.type === "HERO_CAROUSEL") {
      const banners = heroSlides.flatMap((banner) => {
        const card = presentBanner(banner, language, desktops);
        return card ? [card] : [];
      }).slice(0, 1);

      if (banners.length > 0) {
        blocks.push({ id: item.id, type: "HERO_CAROUSEL", banners });
      }

      continue;
    }

    if (item.type === "PROMOTIONAL_BANNER" && item.banner) {
      const current = item.banner.isActive && (!item.banner.startsAt || item.banner.startsAt <= now) && (!item.banner.endsAt || item.banner.endsAt >= now);
      const banner = current ? presentBanner(item.banner, language, desktops) : null;

      if (banner) {
        blocks.push({ id: item.id, type: "PROMOTIONAL_BANNER", banner });
      }

      continue;
    }

    if (item.type === "CATEGORY_CAROUSEL") {
      blocks.push({ id: item.id, type: "CATEGORY_CAROUSEL" });
      continue;
    }

    if (item.type === "HOME_SECTION" && item.section) {
      const section = presentSection(item.section, language, ratings, fallbackServices, covers, icons);

      if (section) {
        blocks.push({ id: item.id, type: "HOME_SECTION", section });
      }

      continue;
    }

    if (item.type === "TESTIMONIAL_CAROUSEL") {
      blocks.push({ id: item.id, type: "TESTIMONIAL_CAROUSEL" });
    }
  }

  return { blocks };
}

export const getPublicHomepage = cache(loadPublicHomepage);

import "server-only";

import { emptyDocument, sanitizeRichText } from "@/features/services/rich-text";
import { Locale, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const localeMap = { en: Locale.EN, ar: Locale.AR } as const;

type PublicLocale = keyof typeof localeMap;

function money(value: Prisma.Decimal | null) {
  return value ? value.toString() : null;
}

async function approvedRatings(serviceIds: string[]) {
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

const publishedWhere = {
  isActive: true,
  publishedAt: { not: null },
  category: { isActive: true },
} as const;

export async function listPublicServices(locale: PublicLocale) {
  const language = localeMap[locale];
  const rows = await prisma.service.findMany({
    where: { ...publishedWhere, translations: { some: { locale: language } } },
    orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
    select: {
      id: true,
      slug: true,
      coverImageUrl: true,
      basePrice: true,
      compareAtPrice: true,
      currency: true,
      isFeatured: true,
      translations: { where: { locale: language }, select: { name: true, shortDescription: true }, take: 1 },
      category: { select: { slug: true, translations: { where: { locale: language }, select: { title: true }, take: 1 } } },
    },
  });
  const ratings = await approvedRatings(rows.map((row) => row.id));

  return rows.flatMap((row) => {
    const translation = row.translations[0];
    const category = row.category.translations[0];

    if (!translation || !category || !row.coverImageUrl) {
      return [];
    }

    return [
      {
        id: row.id,
        slug: row.slug,
        name: translation.name,
        shortDescription: translation.shortDescription,
        coverImageUrl: row.coverImageUrl,
        basePrice: row.basePrice.toString(),
        compareAtPrice: money(row.compareAtPrice),
        currency: row.currency,
        isFeatured: row.isFeatured,
        category: { slug: row.category.slug, title: category.title },
        ratingAverage: ratings.get(row.id)?.ratingAverage ?? null,
        reviewCount: ratings.get(row.id)?.reviewCount ?? 0,
      },
    ];
  });
}

export async function getPublicService(slug: string, locale: PublicLocale) {
  const language = localeMap[locale];
  const service = await prisma.service.findFirst({
    where: { slug, ...publishedWhere, translations: { some: { locale: language } } },
    select: {
      id: true,
      slug: true,
      coverImageUrl: true,
      basePrice: true,
      compareAtPrice: true,
      currency: true,
      isFeatured: true,
      translations: { where: { locale: language }, take: 1 },
      images: { orderBy: { sortOrder: "asc" }, select: { imageUrl: true, altText: true, sortOrder: true } },
      variants: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          price: true,
          compareAtPrice: true,
          currency: true,
          sortOrder: true,
          translations: { select: { locale: true, name: true, description: true } },
        },
      },
      reviews: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, rating: true, comment: true, createdAt: true },
      },
      category: { select: { slug: true, translations: { where: { locale: language }, select: { title: true }, take: 1 } } },
    },
  });

  const translation = service?.translations[0];
  const category = service?.category.translations[0];

  if (!service || !translation || !category || !service.coverImageUrl) {
    return null;
  }

  const ratings = await approvedRatings([service.id]);

  return {
    id: service.id,
    slug: service.slug,
    name: translation.name,
    shortDescription: translation.shortDescription,
    detailedDescription: sanitizeRichText(translation.detailedDescription ?? emptyDocument),
    coverImageUrl: service.coverImageUrl,
    gallery: service.images,
    basePrice: service.basePrice.toString(),
    compareAtPrice: money(service.compareAtPrice),
    currency: service.currency,
    isFeatured: service.isFeatured,
    category: { slug: service.category.slug, title: category.title },
    ratingAverage: ratings.get(service.id)?.ratingAverage ?? null,
    reviewCount: ratings.get(service.id)?.reviewCount ?? 0,
    packages: service.variants.flatMap((item) => {
      const english = item.translations.find((copy) => copy.locale === Locale.EN);
      const arabic = item.translations.find((copy) => copy.locale === Locale.AR);
      const copy = item.translations.find((entry) => entry.locale === language);

      if (!english?.name || !arabic?.name || !copy) {
        return [];
      }

      return [
        {
          id: item.id,
          name: copy.name,
          description: copy.description,
          price: item.price.toString(),
          compareAtPrice: money(item.compareAtPrice),
          currency: item.currency,
          sortOrder: item.sortOrder,
        },
      ];
    }),
    reviews: service.reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
    })),
  };
}

import "server-only";

import { emptyDocument, sanitizeRichText } from "@/features/services/rich-text";
import { Locale } from "@/generated/prisma/client";
import { localizedAlt } from "@/lib/display-image";
import { prisma } from "@/lib/prisma";
import { idsWithStoredImage, mediaPath } from "@/server/media/media-url";
import { cache } from "react";

const localeMap = { en: Locale.EN, ar: Locale.AR } as const;

type PublicLocale = keyof typeof localeMap;

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

export async function listPublicServices(locale: PublicLocale, categorySlug?: string) {
  const language = localeMap[locale];
  const rows = await prisma.service.findMany({
    where: categorySlug
      ? { ...publishedWhere, coverImageUrl: { startsWith: "data:image/" }, category: { slug: categorySlug, isActive: true } }
      : { ...publishedWhere, coverImageUrl: { startsWith: "data:image/" } },
    orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
    take: 48,
    select: {
      id: true,
      slug: true,
      updatedAt: true,
      basePrice: true,
      currency: true,
      isFeatured: true,
      translations: { select: { locale: true, name: true, shortDescription: true } },
      category: { select: { slug: true, translations: { select: { locale: true, title: true } } } },
    },
  });
  const ratings = await approvedRatings(rows.map((row) => row.id));

  return rows.flatMap((row) => {
    const translation = row.translations.find((item) => item.locale === language) ?? row.translations[0];
    const category = row.category.translations.find((item) => item.locale === language) ?? row.category.translations[0];

    if (!translation || !category) {
      return [];
    }

    return [
      {
        id: row.id,
        slug: row.slug,
        name: translation.name,
        shortDescription: translation.shortDescription,
        coverImageUrl: mediaPath("service-cover", row.id, row.updatedAt),
        price: row.basePrice.toString(),
        currency: row.currency,
        isFeatured: row.isFeatured,
        category: { slug: row.category.slug, title: category.title },
        ratingAverage: ratings.get(row.id)?.ratingAverage ?? null,
        reviewCount: ratings.get(row.id)?.reviewCount ?? 0,
      },
    ];
  });
}

export async function listPublicServicesByCategory(locale: PublicLocale, categorySlug: string) {
  return listPublicServices(locale, categorySlug);
}

export const categoryPageSize = 12;

export const categorySortValues = ["featured", "newest", "price-asc", "price-desc", "rating"] as const;

export type CategorySort = (typeof categorySortValues)[number];

export type CategoryListingService = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  coverImageUrl: string;
  price: string;
  currency: string;
  isFeatured: boolean;
  categoryTitle: string;
  ratingAverage: number | null;
  reviewCount: number;
};

export type CategoryListing = {
  services: CategoryListingService[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  sort: CategorySort;
};

export function parseCategorySort(value: string | undefined): CategorySort {
  return categorySortValues.includes(value as CategorySort) ? (value as CategorySort) : "featured";
}

export function parseCategoryPage(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

const listingSelect = {
  id: true,
  slug: true,
  updatedAt: true,
  basePrice: true,
  currency: true,
  isFeatured: true,
  translations: { select: { locale: true, name: true, shortDescription: true } },
  category: { select: { translations: { select: { locale: true, title: true } } } },
} as const;

export async function listCategoryServices(locale: PublicLocale, categorySlug: string, sort: CategorySort, requestedPage: number): Promise<CategoryListing> {
  const where = {
    isActive: true,
    publishedAt: { not: null },
    coverImageUrl: { startsWith: "data:image/" },
    category: { slug: categorySlug, isActive: true },
  };
  const total = await prisma.service.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / categoryPageSize));
  const page = Math.min(requestedPage, total === 0 ? 1 : pageCount);
  const skip = (page - 1) * categoryPageSize;
  const language = localeMap[locale];
  const rows = sort === "rating"
    ? await rankedCategoryServices(categorySlug, skip)
    : await prisma.service.findMany({
        where,
        orderBy: categoryOrder(sort),
        skip,
        take: categoryPageSize,
        select: listingSelect,
      });
  const ratings = await approvedRatings(rows.map((row) => row.id));

  return {
    services: rows.flatMap((row) => {
      const translation = row.translations.find((item) => item.locale === language) ?? row.translations[0];
      const category = row.category.translations.find((item) => item.locale === language) ?? row.category.translations[0];

      if (!translation || !category) {
        return [];
      }

      return [{
        id: row.id,
        slug: row.slug,
        name: translation.name,
        shortDescription: translation.shortDescription,
        coverImageUrl: mediaPath("service-cover", row.id, row.updatedAt),
        price: formatAmount(row.basePrice.toString(), locale),
        currency: row.currency,
        isFeatured: row.isFeatured,
        categoryTitle: category.title,
        ratingAverage: ratings.get(row.id)?.ratingAverage ?? null,
        reviewCount: ratings.get(row.id)?.reviewCount ?? 0,
      }];
    }),
    total,
    page,
    pageSize: categoryPageSize,
    pageCount: total === 0 ? 0 : pageCount,
    sort,
  };
}

function categoryOrder(sort: Exclude<CategorySort, "rating">) {
  if (sort === "newest") {
    return [{ publishedAt: "desc" as const }, { sortOrder: "asc" as const }];
  }

  if (sort === "price-asc") {
    return [{ basePrice: "asc" as const }, { publishedAt: "desc" as const }];
  }

  if (sort === "price-desc") {
    return [{ basePrice: "desc" as const }, { publishedAt: "desc" as const }];
  }

  return [{ isFeatured: "desc" as const }, { sortOrder: "asc" as const }, { publishedAt: "desc" as const }];
}

async function rankedCategoryServices(categorySlug: string, skip: number) {
  const ranked = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT s.id
    FROM "Service" s
    INNER JOIN "Category" c ON c.id = s."categoryId"
    LEFT JOIN (
      SELECT "serviceId", AVG(rating) AS average, COUNT(*)::int AS reviews
      FROM "Review"
      WHERE status = 'APPROVED'::"ReviewStatus"
      GROUP BY "serviceId"
    ) r ON r."serviceId" = s.id
    WHERE c.slug = ${categorySlug}
      AND c."isActive" = true
      AND s."isActive" = true
      AND s."publishedAt" IS NOT NULL
      AND left(s."coverImageUrl", 11) = 'data:image/'
    ORDER BY r.average DESC NULLS LAST, r.reviews DESC NULLS LAST, s."publishedAt" DESC
    LIMIT ${categoryPageSize} OFFSET ${skip}
  `;
  const ids = ranked.map((row) => row.id);

  if (ids.length === 0) {
    return [];
  }

  const rows = await prisma.service.findMany({ where: { id: { in: ids } }, select: listingSelect });
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
}

function formatAmount(value: string, locale: PublicLocale) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return value;
  }

  return new Intl.NumberFormat(locale === "ar" ? "ar" : "en", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 3,
    maximumFractionDigits: 3,
  }).format(amount);
}

export async function searchPublicServices(locale: PublicLocale, query: string) {
  const term = query.trim();

  if (term.length < 2 || term.length > 80) {
    return [];
  }

  const language = localeMap[locale];
  const rows = await prisma.service.findMany({
    where: {
      ...publishedWhere,
      coverImageUrl: { startsWith: "data:image/" },
      translations: { some: { name: { contains: term, mode: "insensitive" } } },
    },
    orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
    take: 8,
    select: {
      id: true,
      slug: true,
      updatedAt: true,
      basePrice: true,
      currency: true,
      translations: { select: { locale: true, name: true } },
    },
  });

  return rows.flatMap((row) => {
    const translation = row.translations.find((item) => item.locale === language) ?? row.translations[0];

    if (!translation) {
      return [];
    }

    return [
      {
        slug: row.slug,
        name: translation.name,
        coverImageUrl: mediaPath("service-cover", row.id, row.updatedAt),
        price: row.basePrice.toString(),
        currency: row.currency,
      },
    ];
  });
}

export const getPublicService = cache(async function getPublicService(slug: string, locale: PublicLocale) {
  const language = localeMap[locale];
  const service = await prisma.service.findFirst({
    where: { slug, ...publishedWhere, coverImageUrl: { startsWith: "data:image/" } },
    select: {
      id: true,
      slug: true,
      categoryId: true,
      updatedAt: true,
      basePrice: true,
      currency: true,
      translations: true,
      images: { orderBy: { sortOrder: "asc" }, select: { id: true, altText: true } },
      reviews: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          user: { select: { id: true, updatedAt: true, firstName: true, lastName: true } },
        },
      },
      category: { select: { slug: true, translations: { select: { locale: true, title: true } } } },
    },
  });
  const translation = service?.translations.find((item) => item.locale === language) ?? service?.translations[0];
  const category = service?.category.translations.find((item) => item.locale === language) ?? service?.category.translations[0];

  if (!service || !translation || !category) {
    return null;
  }

  const avatars = await idsWithStoredImage("User", "avatarUrl", service.reviews.map((review) => review.user.id));

  const [ratings, ratingRows, relatedRows] = await Promise.all([
    approvedRatings([service.id]),
    prisma.review.groupBy({
      by: ["rating"],
      where: { serviceId: service.id, status: "APPROVED" },
      _count: { _all: true },
    }),
    prisma.service.findMany({
      where: { ...publishedWhere, coverImageUrl: { startsWith: "data:image/" }, categoryId: service.categoryId, id: { not: service.id } },
      orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
      take: 3,
      select: {
        id: true,
        slug: true,
        isFeatured: true,
        updatedAt: true,
        basePrice: true,
        currency: true,
        translations: { select: { locale: true, name: true, shortDescription: true } },
      },
    }),
  ]);
  const relatedRatings = await approvedRatings(relatedRows.map((row) => row.id));
  const ratingCounts = [0, 0, 0, 0, 0];

  for (const row of ratingRows) {
    if (row.rating >= 1 && row.rating <= 5) {
      ratingCounts[row.rating - 1] = row._count._all;
    }
  }

  return {
    id: service.id,
    slug: service.slug,
    name: translation.name,
    shortDescription: translation.shortDescription,
    detailedDescription: sanitizeRichText(translation.detailedDescription ?? emptyDocument),
    seoTitle: translation.seoTitle,
    seoDescription: translation.seoDescription,
    coverImageUrl: mediaPath("service-cover", service.id, service.updatedAt),
    gallery: service.images.map((image) => ({
      id: image.id,
      altText: localizedAlt(image.altText, translation.name, locale),
      imageUrl: mediaPath("service-image", image.id, service.updatedAt),
    })),
    price: formatAmount(service.basePrice.toString(), locale),
    currency: service.currency,
    category: { slug: service.category.slug, title: category.title },
    ratingAverage: ratings.get(service.id)?.ratingAverage ?? null,
    reviewCount: ratings.get(service.id)?.reviewCount ?? 0,
    ratingCounts,
    reviews: service.reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
      author: [review.user.firstName, review.user.lastName].filter(Boolean).join(" "),
      avatarUrl: avatars.has(review.user.id) ? mediaPath("avatar", review.user.id, review.user.updatedAt) : null,
    })),
    related: relatedRows.flatMap((row) => {
      const copy = row.translations.find((item) => item.locale === language) ?? row.translations[0];

      if (!copy) {
        return [];
      }

      return [
        {
          id: row.id,
          slug: row.slug,
          name: copy.name,
          shortDescription: copy.shortDescription,
          coverImageUrl: mediaPath("service-cover", row.id, row.updatedAt),
          price: formatAmount(row.basePrice.toString(), locale),
          currency: row.currency,
          isFeatured: row.isFeatured,
          ratingAverage: relatedRatings.get(row.id)?.ratingAverage ?? null,
          reviewCount: relatedRatings.get(row.id)?.reviewCount ?? 0,
        },
      ];
    }),
  };
});

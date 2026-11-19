import "server-only";

import { Locale } from "@/generated/prisma/enums";
import type { AppLocale } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { idsWithStoredImage, mediaPath } from "@/server/media/media-url";
import type { PublicCategory, PublicCategoryDetail, PublicCategoryResult } from "./types";

const databaseLocale: Record<AppLocale, Locale> = {
  en: Locale.EN,
  ar: Locale.AR,
};

export async function getPublicCategoryTree(
  locale: AppLocale,
): Promise<PublicCategoryResult> {
  try {
    const rows = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        parentId: true,
        slug: true,
        iconName: true,
        updatedAt: true,
        translations: {
          select: { locale: true, title: true, description: true },
        },
      },
    });

    const icons = await idsWithStoredImage("Category", "iconImageUrl", rows.map((row) => row.id));
    const nodes = new Map<string, PublicCategory>();

    for (const row of rows) {
      const translation = row.translations.find((item) => item.locale === databaseLocale[locale]) ?? row.translations[0];

      if (!translation?.title) {
        continue;
      }

      nodes.set(row.id, {
        id: row.id,
        slug: row.slug,
        title: translation.title,
        description: translation.description,
        imageUrl: icons.has(row.id) ? mediaPath("category-icon", row.id, row.updatedAt) : null,
        iconName: row.iconName,
        children: [],
      });
    }

    const categories = rows.flatMap((row) => {
      const node = nodes.get(row.id);
      return node ? [node] : [];
    });

    return { categories, unavailable: false };
  } catch {
    return { categories: [], unavailable: true };
  }
}

export async function getPublicCategory(slug: string, locale: AppLocale): Promise<PublicCategoryDetail | null> {
  const row = await prisma.category.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true,
      slug: true,
      updatedAt: true,
      translations: { select: { locale: true, title: true, description: true, seoTitle: true, seoDescription: true } },
    },
  });
  const translation = row?.translations.find((item) => item.locale === databaseLocale[locale]) ?? row?.translations[0];

  if (!row || !translation?.title) {
    return null;
  }

  const [icons, banners] = await Promise.all([
    idsWithStoredImage("Category", "iconImageUrl", [row.id]),
    idsWithStoredImage("Category", "bannerImageUrl", [row.id]),
  ]);

  return {
    id: row.id,
    slug: row.slug,
    title: translation.title,
    description: translation.description,
    imageUrl: icons.has(row.id) ? mediaPath("category-icon", row.id, row.updatedAt) : null,
    bannerImageUrl: banners.has(row.id) ? mediaPath("category-banner", row.id, row.updatedAt) : null,
    seoTitle: translation.seoTitle,
    seoDescription: translation.seoDescription,
  };
}

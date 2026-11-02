import "server-only";

import { Locale } from "@/generated/prisma/enums";
import type { AppLocale } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import type { PublicCategory, PublicCategoryResult } from "./types";

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
        translations: {
          where: { locale: databaseLocale[locale] },
          select: { title: true },
          take: 1,
        },
      },
    });

    const nodes = new Map<string, PublicCategory>();

    for (const row of rows) {
      const title = row.translations[0]?.title;

      if (!title) {
        continue;
      }

      nodes.set(row.id, {
        id: row.id,
        slug: row.slug,
        title,
        iconName: row.iconName,
        children: [],
      });
    }

    const roots: PublicCategory[] = [];

    for (const row of rows) {
      const node = nodes.get(row.id);

      if (!node) {
        continue;
      }

      const parent = row.parentId ? nodes.get(row.parentId) : undefined;

      if (parent) {
        parent.children.push(node);
      } else if (!row.parentId) {
        roots.push(node);
      }
    }

    return { categories: roots, unavailable: false };
  } catch {
    return { categories: [], unavailable: true };
  }
}

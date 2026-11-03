import "server-only";

import { Locale } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const localeMap = { en: Locale.EN, ar: Locale.AR } as const;
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CartService = {
  id: string;
  slug: string;
  name: string;
  coverImageUrl: string | null;
  currency: string;
  price: number;
  compareAtPrice: number | null;
};

export async function listCartServices(locale: keyof typeof localeMap, ids: string[]) {
  const unique = [...new Set(ids.filter((id) => idPattern.test(id)))].slice(0, 30);

  if (unique.length === 0) {
    return [];
  }

  const language = localeMap[locale];
  const rows = await prisma.service.findMany({
    where: {
      id: { in: unique },
      isActive: true,
      publishedAt: { not: null },
      category: { isActive: true },
    },
    select: {
      id: true,
      slug: true,
      coverImageUrl: true,
      basePrice: true,
      compareAtPrice: true,
      currency: true,
      translations: { select: { locale: true, name: true } },
    },
  });
  const byId = new Map(rows.map((row) => [row.id, row]));

  return unique.flatMap((id) => {
    const row = byId.get(id);
    const translation = row?.translations.find((item) => item.locale === language) ?? row?.translations[0];

    if (!row || !translation) {
      return [];
    }

    const price = Number(row.basePrice.toString());
    const compareAt = row.compareAtPrice === null ? null : Number(row.compareAtPrice.toString());

    return [
      {
        id: row.id,
        slug: row.slug,
        name: translation.name,
        coverImageUrl: row.coverImageUrl,
        currency: row.currency,
        price,
        compareAtPrice: compareAt !== null && Number.isFinite(compareAt) && compareAt > price ? compareAt : null,
      },
    ];
  });
}

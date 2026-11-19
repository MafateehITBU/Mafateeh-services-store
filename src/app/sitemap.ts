import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, services] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    prisma.service.findMany({
      where: { isActive: true, publishedAt: { not: null }, category: { isActive: true } },
      select: { slug: true, updatedAt: true },
    }),
  ]);
  const home = {
    url: absoluteUrl("/en"),
    alternates: { languages: { en: absoluteUrl("/en"), ar: absoluteUrl("/ar"), "x-default": absoluteUrl("/en") } },
  };
  const categoryEntries = categories.flatMap((category) =>
    (["en", "ar"] as const).map((locale) => ({
      url: absoluteUrl(`/${locale}/categories/${category.slug}`),
      lastModified: category.updatedAt,
      alternates: {
        languages: {
          en: absoluteUrl(`/en/categories/${category.slug}`),
          ar: absoluteUrl(`/ar/categories/${category.slug}`),
          "x-default": absoluteUrl(`/en/categories/${category.slug}`),
        },
      },
    })),
  );
  const serviceEntries = services.flatMap((service) =>
    (["en", "ar"] as const).map((locale) => ({
      url: absoluteUrl(`/${locale}/services/${service.slug}`),
      lastModified: service.updatedAt,
      alternates: {
        languages: {
          en: absoluteUrl(`/en/services/${service.slug}`),
          ar: absoluteUrl(`/ar/services/${service.slug}`),
          "x-default": absoluteUrl(`/en/services/${service.slug}`),
        },
      },
    })),
  );

  return [home, { ...home, url: absoluteUrl("/ar") }, ...categoryEntries, ...serviceEntries];
}

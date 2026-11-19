import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;

export async function rememberServiceSlug(tx: Tx, serviceId: string, previous: string, next: string) {
  if (previous === next) {
    return;
  }

  await tx.serviceSlugHistory.deleteMany({ where: { serviceId, slug: next } });
  await tx.serviceSlugHistory.create({ data: { serviceId, slug: previous } });
}

export async function rememberCategorySlug(tx: Tx, categoryId: string, previous: string, next: string) {
  if (previous === next) {
    return;
  }

  await tx.categorySlugHistory.deleteMany({ where: { categoryId, slug: next } });
  await tx.categorySlugHistory.create({ data: { categoryId, slug: previous } });
}

export async function historicServiceSlug(slug: string) {
  const row = await prisma.serviceSlugHistory.findUnique({
    where: { slug },
    select: {
      service: { select: { slug: true, isActive: true, publishedAt: true, category: { select: { isActive: true } } } },
    },
  });

  if (!row || row.service.slug === slug || !row.service.isActive || !row.service.publishedAt || !row.service.category.isActive) {
    return null;
  }

  return row.service.slug;
}

export async function historicCategorySlug(slug: string) {
  const row = await prisma.categorySlugHistory.findUnique({
    where: { slug },
    select: { category: { select: { slug: true, isActive: true } } },
  });

  if (!row || row.category.slug === slug || !row.category.isActive) {
    return null;
  }

  return row.category.slug;
}

import "server-only";

import { Locale, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAdminAuditLog } from "@/server/admin/audit";
import { ImageStorageError, imageFromDataUrl, optionalImageFromDataUrl } from "@/server/media/image-storage";
import type { CategoryInput } from "@/validations/category";
import { z } from "zod";

export class CategoryRuleError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "CategoryRuleError";
  }
}

function assertId(id: string) {
  if (!z.string().uuid().safeParse(id).success) {
    throw new CategoryRuleError(404, "not_found", "That category was not found.");
  }
}

function storedImage(value: string) {
  try {
    return imageFromDataUrl(value).dataUrl;
  } catch (error) {
    if (error instanceof ImageStorageError) {
      throw new CategoryRuleError(400, "invalid_image", error.message);
    }

    throw error;
  }
}

function storedOptionalImage(value: string | null) {
  try {
    return optionalImageFromDataUrl(value);
  } catch (error) {
    if (error instanceof ImageStorageError) {
      throw new CategoryRuleError(400, "invalid_image", error.message);
    }

    throw error;
  }
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);

  return slug || "category";
}

async function allocateSlug(title: string, categoryId?: string) {
  const base = slugify(title);

  for (let suffix = 0; suffix < 1000; suffix += 1) {
    const slug = suffix === 0 ? base : `${base}-${suffix + 1}`;
    const existing = await prisma.category.findUnique({ where: { slug }, select: { id: true } });

    if (!existing || existing.id === categoryId) {
      return slug;
    }
  }

  throw new CategoryRuleError(409, "duplicate_slug", "A unique link for this category could not be created.");
}

function translationData(locale: Locale, input: CategoryInput["en"]) {
  return {
    locale,
    title: input.title,
    description: input.description,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
  };
}

function snapshot(category: {
  slug: string;
  parentId: string | null;
  iconName: string | null;
  iconImageUrl: string | null;
  bannerImageUrl: string;
  isActive: boolean;
  sortOrder: number;
  translations: Array<{ locale: string; title: string; description: string | null }>;
}) {
  return {
    slug: category.slug,
    parentId: null,
    imageStored: Boolean(category.iconImageUrl?.startsWith("data:image/")),
    bannerStored: category.bannerImageUrl.startsWith("data:image/"),
    isActive: category.isActive,
    sortOrder: category.sortOrder,
    translations: category.translations.map((item) => ({
      locale: item.locale,
      title: item.title,
      description: item.description,
    })),
  };
}

const detailSelect = {
  id: true,
  slug: true,
  parentId: true,
  iconName: true,
  iconImageUrl: true,
  bannerImageUrl: true,
  isActive: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  translations: true,
} as const;

export async function listCategories(input: {
  page: number;
  pageSize: number;
  search: string;
  status: "all" | "active" | "inactive";
  view: "table" | "options";
}) {
  if (input.view === "options") {
    const rows = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        parentId: true,
        translations: { where: { locale: Locale.EN }, select: { title: true }, take: 1 },
      },
    });

    return {
      options: rows.map((row) => ({
        id: row.id,
        parentId: row.parentId,
        title: row.translations[0]?.title ?? row.id,
      })),
    };
  }

  const where: Prisma.CategoryWhereInput = {
    ...(input.status === "all" ? {} : { isActive: input.status === "active" }),
    ...(input.search
      ? {
          OR: [
            { slug: { contains: input.search, mode: "insensitive" } },
            { translations: { some: { title: { contains: input.search, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [total, active, inactive, filtered, rows] = await Promise.all([
    prisma.category.count(),
    prisma.category.count({ where: { isActive: true } }),
    prisma.category.count({ where: { isActive: false } }),
    prisma.category.count({ where }),
    prisma.category.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      select: {
        id: true,
        slug: true,
        iconImageUrl: true,
        isActive: true,
        sortOrder: true,
        createdAt: true,
        translations: { select: { locale: true, title: true } },
        _count: { select: { services: true, children: true } },
      },
    }),
  ]);

  return {
    stats: { total, active, inactive },
    page: input.page,
    pageSize: input.pageSize,
    pageCount: Math.max(1, Math.ceil(filtered / input.pageSize)),
    filtered,
    categories: rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      imageUrl: row.iconImageUrl,
      name: row.translations.find((item) => item.locale === Locale.EN)?.title ?? row.slug,
      servicesCount: row._count.services,
      childrenCount: row._count.children,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

export async function getCategory(id: string) {
  assertId(id);
  const category = await prisma.category.findUnique({
    where: { id },
    select: {
      ...detailSelect,
      parent: {
        select: {
          id: true,
          parentId: true,
          translations: { where: { locale: Locale.EN }, select: { title: true }, take: 1 },
        },
      },
    },
  });

  if (!category) {
    throw new CategoryRuleError(404, "not_found", "That category was not found.");
  }

  const translation = (locale: Locale) => category.translations.find((item) => item.locale === locale);

  return {
    id: category.id,
    slug: category.slug,
    parentId: category.parentId,
    iconName: category.iconName,
    iconImageUrl: category.iconImageUrl,
    bannerImageUrl: category.bannerImageUrl,
    isActive: category.isActive,
    sortOrder: category.sortOrder,
    createdAt: category.createdAt.toISOString(),
    parent: category.parent
      ? {
          id: category.parent.id,
          parentId: category.parent.parentId,
          title: category.parent.translations[0]?.title ?? category.parent.id,
        }
      : null,
    en: translation(Locale.EN) ?? null,
    ar: translation(Locale.AR) ?? null,
  };
}

export async function createCategory(actorId: string, input: CategoryInput) {
  const image = storedOptionalImage(input.image);
  const banner = storedImage(input.banner);
  const slug = await allocateSlug(input.en.title);

  try {
    const category = await prisma.$transaction(async (tx) => {
      const created = await tx.category.create({
        data: {
          slug,
          parentId: null,
          iconName: null,
          iconImageUrl: image,
          bannerImageUrl: banner,
          isActive: input.isActive,
          sortOrder: input.sortOrder,
          translations: {
            create: [translationData(Locale.EN, input.en), translationData(Locale.AR, input.ar)],
          },
        },
        select: detailSelect,
      });
      return created;
    });

    await writeAdminAuditLog({
      actorId,
      action: "category.create",
      entityType: "Category",
      entityId: category.id,
      afterData: snapshot(category),
    });

    return { id: category.id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new CategoryRuleError(409, "duplicate_slug", "That slug is already used by another category.");
    }

    throw error;
  }
}

export async function updateCategory(actorId: string, id: string, input: CategoryInput) {
  assertId(id);
  const current = await prisma.category.findUnique({ where: { id }, select: detailSelect });

  if (!current) {
    throw new CategoryRuleError(404, "not_found", "That category was not found.");
  }

  const image = storedOptionalImage(input.image);
  const banner = storedImage(input.banner);
  const slug = await allocateSlug(input.en.title, id);

  try {
    const category = await prisma.$transaction(async (tx) => {
      await tx.categoryTranslation.deleteMany({ where: { categoryId: id } });
      return tx.category.update({
        where: { id },
        data: {
          slug,
          parentId: null,
          iconName: null,
          iconImageUrl: image,
          bannerImageUrl: banner,
          isActive: input.isActive,
          sortOrder: input.sortOrder,
          translations: {
            create: [translationData(Locale.EN, input.en), translationData(Locale.AR, input.ar)],
          },
        },
        select: detailSelect,
      });
    });

    await writeAdminAuditLog({
      actorId,
      action: "category.update",
      entityType: "Category",
      entityId: id,
      beforeData: snapshot(current),
      afterData: snapshot(category),
    });

    return { id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new CategoryRuleError(409, "duplicate_slug", "That slug is already used by another category.");
    }

    throw error;
  }
}

export async function setCategoryStatus(actorId: string, id: string, isActive: boolean) {
  assertId(id);
  const current = await prisma.category.findUnique({
    where: { id },
    select: { id: true, slug: true, isActive: true },
  });

  if (!current) {
    throw new CategoryRuleError(404, "not_found", "That category was not found.");
  }

  await prisma.category.update({ where: { id }, data: { isActive } });
  await writeAdminAuditLog({
    actorId,
    action: isActive ? "category.activate" : "category.deactivate",
    entityType: "Category",
    entityId: id,
    beforeData: { slug: current.slug, isActive: current.isActive },
    afterData: { slug: current.slug, isActive },
  });
}

export async function deleteCategory(actorId: string, id: string) {
  assertId(id);
  const current = await prisma.category.findUnique({
    where: { id },
    select: {
      ...detailSelect,
      _count: { select: { children: true, services: true, homeSections: true } },
    },
  });

  if (!current) {
    throw new CategoryRuleError(404, "not_found", "That category was not found.");
  }

  if (current._count.children > 0 || current._count.services > 0 || current._count.homeSections > 0) {
    throw new CategoryRuleError(
      409,
      "category_in_use",
      "This category still has subcategories, services, or homepage sections. Deactivate it instead of deleting it.",
    );
  }

  await prisma.category.delete({ where: { id } });
  await writeAdminAuditLog({
    actorId,
    action: "category.delete",
    entityType: "Category",
    entityId: id,
    beforeData: snapshot(current),
  });
}

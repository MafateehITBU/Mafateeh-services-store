import "server-only";

import { emptyDocument, RichTextError, sanitizeRichText } from "@/features/services/rich-text";
import { Locale, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAdminAuditLog } from "@/server/admin/audit";
import { ImageStorageError, imageFromDataUrl, optionalImageFromDataUrl } from "@/server/media/image-storage";
import type { ServiceInput } from "@/validations/service";
import { z } from "zod";

export class ServiceRuleError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ServiceRuleError";
  }
}

type Tx = Prisma.TransactionClient;

const detailSelect = {
  id: true,
  categoryId: true,
  slug: true,
  sku: true,
  coverImageUrl: true,
  basePrice: true,
  compareAtPrice: true,
  currency: true,
  isActive: true,
  isFeatured: true,
  sortOrder: true,
  publishedAt: true,
  createdAt: true,
  translations: true,
  images: { orderBy: { sortOrder: "asc" as const }, select: { id: true, imageUrl: true, altText: true, sortOrder: true } },
  variants: {
    orderBy: { sortOrder: "asc" as const },
    select: {
      id: true,
      sku: true,
      price: true,
      compareAtPrice: true,
      currency: true,
      isActive: true,
      sortOrder: true,
      translations: true,
    },
  },
  category: {
    select: {
      id: true,
      isActive: true,
      translations: { where: { locale: Locale.EN }, select: { title: true }, take: 1 },
    },
  },
} as const;

type ServiceRecord = Prisma.ServiceGetPayload<{ select: typeof detailSelect }>;

function assertId(id: string) {
  if (!z.string().uuid().safeParse(id).success) {
    throw new ServiceRuleError(404, "not_found", "That service was not found.");
  }
}

function storedImage(value: string) {
  try {
    return imageFromDataUrl(value).dataUrl;
  } catch (error) {
    if (error instanceof ImageStorageError) {
      throw new ServiceRuleError(400, "invalid_image", error.message);
    }

    throw error;
  }
}

function storedOptionalImage(value: string | null) {
  try {
    return optionalImageFromDataUrl(value);
  } catch (error) {
    if (error instanceof ImageStorageError) {
      throw new ServiceRuleError(400, "invalid_image", error.message);
    }

    throw error;
  }
}

function description(value: unknown) {
  try {
    return sanitizeRichText(value ?? emptyDocument);
  } catch (error) {
    if (error instanceof RichTextError) {
      throw new ServiceRuleError(400, "invalid_description", error.message);
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

  return slug || "service";
}

async function allocateSlug(tx: Tx, title: string, serviceId?: string) {
  const base = slugify(title);

  for (let suffix = 0; suffix < 1000; suffix += 1) {
    const slug = suffix === 0 ? base : `${base}-${suffix + 1}`;
    const existing = await tx.service.findUnique({ where: { slug }, select: { id: true } });

    if (!existing || existing.id === serviceId) {
      return slug;
    }
  }

  throw new ServiceRuleError(409, "duplicate_slug", "A unique link for this service could not be created.");
}

function packageSku() {
  return `pkg-${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
}

async function allocatePackageSku(tx: Tx, requested: string | null, variantId?: string) {
  const sku = requested || packageSku();
  const existing = await tx.serviceVariant.findUnique({ where: { sku }, select: { id: true } });

  if (existing && existing.id !== variantId) {
    if (requested) {
      throw new ServiceRuleError(409, "duplicate_sku", "That package SKU is already used.");
    }

    return packageSku();
  }

  return sku;
}

function serviceState(service: { publishedAt: Date | null; isActive: boolean }) {
  if (!service.publishedAt) {
    return "draft" as const;
  }

  return service.isActive ? ("published" as const) : ("inactive" as const);
}

function money(value: Prisma.Decimal | null) {
  return value ? value.toString() : null;
}

function translation(service: ServiceRecord, locale: Locale) {
  return service.translations.find((item) => item.locale === locale);
}

function snapshot(service: ServiceRecord) {
  return {
    slug: service.slug,
    categoryId: service.categoryId,
    sku: service.sku,
    basePrice: service.basePrice.toString(),
    compareAtPrice: money(service.compareAtPrice),
    currency: service.currency,
    isActive: service.isActive,
    isFeatured: service.isFeatured,
    sortOrder: service.sortOrder,
    publishedAt: service.publishedAt?.toISOString() ?? null,
    status: serviceState(service),
    coverStored: Boolean(service.coverImageUrl?.startsWith("data:image/")),
    galleryCount: service.images.length,
    packages: service.variants.map((item) => ({
      id: item.id,
      price: item.price.toString(),
      currency: item.currency,
      isActive: item.isActive,
      sortOrder: item.sortOrder,
    })),
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
    const reviewCount = row._count._all;
    ratings.set(row.serviceId, {
      reviewCount,
      ratingAverage: reviewCount > 0 && row._avg.rating !== null ? Math.round(row._avg.rating * 10) / 10 : null,
    });
  }

  return ratings;
}

function present(service: ServiceRecord, rating?: { ratingAverage: number | null; reviewCount: number }) {
  const en = translation(service, Locale.EN);
  const ar = translation(service, Locale.AR);
  const copy = (item: typeof en) => ({
    name: item?.name ?? "",
    shortDescription: item?.shortDescription ?? "",
    detailedDescription: sanitizeRichText(item?.detailedDescription ?? emptyDocument),
  });

  return {
    id: service.id,
    categoryId: service.categoryId,
    category: {
      id: service.category.id,
      title: service.category.translations[0]?.title ?? "Category",
      isActive: service.category.isActive,
    },
    sku: service.sku,
    coverImageUrl: service.coverImageUrl,
    basePrice: service.basePrice.toString(),
    compareAtPrice: money(service.compareAtPrice),
    currency: service.currency,
    isFeatured: service.isFeatured,
    sortOrder: service.sortOrder,
    status: serviceState(service),
    createdAt: service.createdAt.toISOString(),
    ratingAverage: rating?.ratingAverage ?? null,
    reviewCount: rating?.reviewCount ?? 0,
    en: copy(en),
    ar: copy(ar),
    gallery: service.images.map((image) => ({
      id: image.id,
      imageUrl: image.imageUrl,
      altText: image.altText,
      sortOrder: image.sortOrder,
    })),
    packages: service.variants.map((item) => ({
      id: item.id,
      sku: item.sku,
      price: item.price.toString(),
      compareAtPrice: money(item.compareAtPrice),
      currency: item.currency,
      isActive: item.isActive,
      sortOrder: item.sortOrder,
      en: {
        name: item.translations.find((copy) => copy.locale === Locale.EN)?.name ?? "",
        description: item.translations.find((copy) => copy.locale === Locale.EN)?.description ?? "",
      },
      ar: {
        name: item.translations.find((copy) => copy.locale === Locale.AR)?.name ?? "",
        description: item.translations.find((copy) => copy.locale === Locale.AR)?.description ?? "",
      },
    })),
  };
}

function assertPublishable(input: ServiceInput, cover: string | null) {
  if (!cover) {
    throw new ServiceRuleError(400, "cover_required", "Add a cover image before publishing.");
  }

  if (!input.en.name || !input.ar.name || !input.en.shortDescription || !input.ar.shortDescription) {
    throw new ServiceRuleError(400, "translation_required", "English and Arabic names and short descriptions are required before publishing.");
  }

  for (const item of input.packages) {
    if (item.isActive && (!item.en.name || !item.ar.name)) {
      throw new ServiceRuleError(400, "package_translation_required", "Active packages need English and Arabic names.");
    }
  }
}

function prepared(input: ServiceInput) {
  return {
    cover: storedOptionalImage(input.cover),
    gallery: input.gallery.map((item) => ({ dataUrl: storedImage(item.image), altText: item.altText || input.en.name })),
    en: description(input.en.detailedDescription),
    ar: description(input.ar.detailedDescription),
  };
}

async function writeService(tx: Tx, serviceId: string | undefined, input: ServiceInput, preparedInput: ReturnType<typeof prepared>, publishing: boolean) {
  const category = await tx.category.findUnique({ where: { id: input.categoryId }, select: { id: true, isActive: true } });

  if (!category) {
    throw new ServiceRuleError(400, "category_required", "Choose an active category.");
  }

  const current = serviceId ? await tx.service.findUnique({ where: { id: serviceId }, select: { id: true, categoryId: true, publishedAt: true, isActive: true } }) : null;

  if (serviceId && !current) {
    throw new ServiceRuleError(404, "not_found", "That service was not found.");
  }

  const categoryChanged = !current || current.categoryId !== input.categoryId;

  if ((publishing || categoryChanged || !current) && !category.isActive) {
    throw new ServiceRuleError(400, "inactive_category", "Choose an active category.");
  }

  if (input.sku) {
    const skuOwner = await tx.service.findUnique({ where: { sku: input.sku }, select: { id: true } });

    if (skuOwner && skuOwner.id !== serviceId) {
      throw new ServiceRuleError(409, "duplicate_sku", "That SKU is already used.");
    }
  }

  const slug = await allocateSlug(tx, input.en.name, serviceId);
  const isActive = input.intent === "publish" ? true : input.intent === "draft" ? false : (current?.isActive ?? false);
  const publishedAt = input.intent === "publish" ? (current?.publishedAt ?? new Date()) : input.intent === "draft" ? null : (current?.publishedAt ?? null);

  const data = {
    categoryId: input.categoryId,
    slug,
    sku: input.sku,
    coverImageUrl: preparedInput.cover,
    basePrice: input.basePrice,
    compareAtPrice: input.compareAtPrice,
    currency: input.currency,
    isFeatured: input.isFeatured,
    sortOrder: input.sortOrder,
    isActive,
    publishedAt,
  };

  const translations = [
    {
      locale: Locale.EN,
      name: input.en.name,
      shortDescription: input.en.shortDescription,
      detailedDescription: preparedInput.en as Prisma.InputJsonValue,
      seoTitle: null,
      seoDescription: null,
    },
    {
      locale: Locale.AR,
      name: input.ar.name,
      shortDescription: input.ar.shortDescription,
      detailedDescription: preparedInput.ar as Prisma.InputJsonValue,
      seoTitle: null,
      seoDescription: null,
    },
  ];

  const saved = serviceId
    ? await tx.service.update({ where: { id: serviceId }, data, select: { id: true } })
    : await tx.service.create({ data, select: { id: true } });

  await tx.serviceTranslation.deleteMany({ where: { serviceId: saved.id } });
  await tx.serviceTranslation.createMany({ data: translations.map((item) => ({ ...item, serviceId: saved.id })) });
  await tx.serviceImage.deleteMany({ where: { serviceId: saved.id } });

  if (preparedInput.gallery.length > 0) {
    await tx.serviceImage.createMany({
      data: preparedInput.gallery.map((image, index) => ({
        serviceId: saved.id,
        imageUrl: image.dataUrl,
        altText: image.altText,
        sortOrder: index + 1,
      })),
    });
  }

  await syncPackages(tx, saved.id, input.packages);
  return tx.service.findUniqueOrThrow({ where: { id: saved.id }, select: detailSelect });
}

async function syncPackages(tx: Tx, serviceId: string, packages: ServiceInput["packages"]) {
  const existing = await tx.serviceVariant.findMany({ where: { serviceId }, select: { id: true } });
  const retained = new Set(packages.flatMap((item) => (item.id ? [item.id] : [])));

  for (const item of existing) {
    if (retained.has(item.id)) {
      continue;
    }

    const orders = await tx.orderItem.count({ where: { variantId: item.id } });

    if (orders > 0) {
      throw new ServiceRuleError(409, "package_in_use", "A package that appears on an order cannot be removed. Deactivate it instead.");
    }

    await tx.serviceVariant.delete({ where: { id: item.id } });
  }

  for (const [index, item] of packages.entries()) {
    if (item.id && !existing.some((row) => row.id === item.id)) {
      throw new ServiceRuleError(400, "invalid_package", "A package does not belong to this service.");
    }

    const sku = await allocatePackageSku(tx, item.sku, item.id ?? undefined);
    const data = {
      sku,
      price: item.price,
      compareAtPrice: item.compareAtPrice,
      currency: item.currency,
      isActive: item.isActive,
      sortOrder: index + 1,
    };
    const translations = [
      { locale: Locale.EN, name: item.en.name, description: item.en.description },
      { locale: Locale.AR, name: item.ar.name, description: item.ar.description },
    ];

    if (item.id) {
      await tx.serviceVariant.update({ where: { id: item.id }, data });
      await tx.serviceVariantTranslation.deleteMany({ where: { variantId: item.id } });
      await tx.serviceVariantTranslation.createMany({ data: translations.map((copy) => ({ ...copy, variantId: item.id as string })) });
    } else {
      await tx.serviceVariant.create({
        data: { ...data, serviceId, translations: { create: translations } },
      });
    }
  }
}

async function auditChange(actorId: string, before: ServiceRecord | null, after: ServiceRecord, action: string) {
  await writeAdminAuditLog({
    actorId,
    action,
    entityType: "Service",
    entityId: after.id,
    beforeData: before ? snapshot(before) : undefined,
    afterData: snapshot(after),
  });

  const imagesChanged = !before || before.coverImageUrl !== after.coverImageUrl || before.images.length !== after.images.length || before.images.some((image, index) => image.imageUrl !== after.images[index]?.imageUrl || image.altText !== after.images[index]?.altText || image.sortOrder !== after.images[index]?.sortOrder);

  if (imagesChanged) {
    await writeAdminAuditLog({
      actorId,
      action: "service.images",
      entityType: "Service",
      entityId: after.id,
      beforeData: before ? { coverStored: Boolean(before.coverImageUrl), galleryCount: before.images.length } : undefined,
      afterData: { coverStored: Boolean(after.coverImageUrl), galleryCount: after.images.length },
    });
  }

  const beforePackages = before?.variants.map((item) => `${item.id}:${item.price.toString()}:${item.isActive}:${item.sortOrder}`).join("|") ?? "";
  const afterPackages = after.variants.map((item) => `${item.id}:${item.price.toString()}:${item.isActive}:${item.sortOrder}`).join("|");

  if (beforePackages !== afterPackages) {
    await writeAdminAuditLog({
      actorId,
      action: "service.packages",
      entityType: "Service",
      entityId: after.id,
      afterData: snapshot(after).packages,
    });
  }
}

function guard(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new ServiceRuleError(409, "duplicate", "A service or package with that unique value already exists.");
  }

  throw error;
}

export async function listServices(input: {
  page: number;
  pageSize: number;
  search: string;
  categoryId: string;
  status: "all" | "draft" | "published" | "inactive";
  featured: "all" | "featured" | "standard";
  sort: "newest" | "oldest" | "price" | "price_desc" | "sort_order";
}) {
  const where: Prisma.ServiceWhereInput = {
    ...(input.search ? { translations: { some: { name: { contains: input.search, mode: "insensitive" } } } } : {}),
    ...(input.categoryId ? { categoryId: input.categoryId } : {}),
    ...(input.featured === "featured" ? { isFeatured: true } : {}),
    ...(input.featured === "standard" ? { isFeatured: false } : {}),
    ...(input.status === "draft" ? { publishedAt: null } : {}),
    ...(input.status === "published" ? { publishedAt: { not: null }, isActive: true } : {}),
    ...(input.status === "inactive" ? { publishedAt: { not: null }, isActive: false } : {}),
  };
  const orderBy =
    input.sort === "oldest"
      ? { createdAt: "asc" as const }
      : input.sort === "price"
        ? { basePrice: "asc" as const }
        : input.sort === "price_desc"
          ? { basePrice: "desc" as const }
          : input.sort === "sort_order"
            ? { sortOrder: "asc" as const }
            : { createdAt: "desc" as const };

  const [total, published, draft, inactive, filtered, rows] = await Promise.all([
    prisma.service.count(),
    prisma.service.count({ where: { publishedAt: { not: null }, isActive: true } }),
    prisma.service.count({ where: { publishedAt: null } }),
    prisma.service.count({ where: { publishedAt: { not: null }, isActive: false } }),
    prisma.service.count({ where }),
    prisma.service.findMany({
      where,
      orderBy,
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      select: {
        id: true,
        coverImageUrl: true,
        basePrice: true,
        currency: true,
        isFeatured: true,
        isActive: true,
        publishedAt: true,
        createdAt: true,
        translations: { where: { locale: Locale.EN }, select: { name: true }, take: 1 },
        category: { select: { translations: { where: { locale: Locale.EN }, select: { title: true }, take: 1 } } },
      },
    }),
  ]);
  const ratings = await ratingsFor(rows.map((row) => row.id));

  return {
    stats: { total, published, draft, inactive },
    page: input.page,
    pageSize: input.pageSize,
    pageCount: Math.max(1, Math.ceil(filtered / input.pageSize)),
    services: rows.map((row) => ({
      id: row.id,
      coverImageUrl: row.coverImageUrl,
      name: row.translations[0]?.name ?? "Untitled",
      category: row.category.translations[0]?.title ?? "Category",
      basePrice: row.basePrice.toString(),
      currency: row.currency,
      ratingAverage: ratings.get(row.id)?.ratingAverage ?? null,
      reviewCount: ratings.get(row.id)?.reviewCount ?? 0,
      status: serviceState(row),
      isFeatured: row.isFeatured,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

export async function getService(id: string) {
  assertId(id);
  const service = await prisma.service.findUnique({ where: { id }, select: detailSelect });

  if (!service) {
    throw new ServiceRuleError(404, "not_found", "That service was not found.");
  }

  const ratings = await ratingsFor([service.id]);
  return present(service, ratings.get(service.id));
}

export async function createService(actorId: string, input: ServiceInput) {
  if (input.intent === "keep") {
    throw new ServiceRuleError(400, "invalid_request", "Save the new service as a draft or publish it.");
  }

  const stored = prepared(input);

  if (input.intent === "publish") {
    assertPublishable(input, stored.cover);
  }

  try {
    const service = await prisma.$transaction((tx) => writeService(tx, undefined, input, stored, input.intent === "publish"));
    await auditChange(actorId, null, service, input.intent === "publish" ? "service.publish" : "service.create");
    const ratings = await ratingsFor([service.id]);
    return present(service, ratings.get(service.id));
  } catch (error) {
    guard(error);
  }
}

export async function updateService(actorId: string, id: string, input: ServiceInput) {
  assertId(id);
  const before = await prisma.service.findUnique({ where: { id }, select: detailSelect });

  if (!before) {
    throw new ServiceRuleError(404, "not_found", "That service was not found.");
  }

  if (input.intent === "draft" && before.publishedAt) {
    throw new ServiceRuleError(400, "already_published", "Deactivate a published service instead of turning it back into a draft.");
  }

  const stored = prepared(input);
  const staysPublished = input.intent === "keep" && Boolean(before.publishedAt) && before.isActive;

  if (input.intent === "publish" || staysPublished) {
    assertPublishable(input, stored.cover);
  }

  try {
    const service = await prisma.$transaction((tx) => writeService(tx, id, input, stored, input.intent === "publish" || staysPublished));
    const action = input.intent === "publish" && !before.publishedAt ? "service.publish" : "service.update";
    await auditChange(actorId, before, service, action);

    if (input.intent === "publish" && before.publishedAt && !before.isActive) {
      await writeAdminAuditLog({
        actorId,
        action: "service.reactivate",
        entityType: "Service",
        entityId: service.id,
        beforeData: snapshot(before),
        afterData: snapshot(service),
      });
    }

    const ratings = await ratingsFor([service.id]);
    return present(service, ratings.get(service.id));
  } catch (error) {
    guard(error);
  }
}

export async function setServiceStatus(actorId: string, id: string, action: "publish" | "deactivate" | "reactivate") {
  assertId(id);
  const current = await prisma.service.findUnique({ where: { id }, select: detailSelect });

  if (!current) {
    throw new ServiceRuleError(404, "not_found", "That service was not found.");
  }

  if (action === "deactivate") {
    const service = await prisma.service.update({ where: { id }, data: { isActive: false }, select: detailSelect });
    await writeAdminAuditLog({
      actorId,
      action: "service.deactivate",
      entityType: "Service",
      entityId: id,
      beforeData: snapshot(current),
      afterData: snapshot(service),
    });
    return { status: serviceState(service) };
  }

  const en = translation(current, Locale.EN);
  const ar = translation(current, Locale.AR);
  const input = {
    en: { name: en?.name ?? "", shortDescription: en?.shortDescription ?? "" },
    ar: { name: ar?.name ?? "", shortDescription: ar?.shortDescription ?? "" },
    packages: current.variants.map((item) => ({
      isActive: item.isActive,
      en: { name: item.translations.find((copy) => copy.locale === Locale.EN)?.name ?? "" },
      ar: { name: item.translations.find((copy) => copy.locale === Locale.AR)?.name ?? "" },
    })),
  } as ServiceInput;

  assertPublishable(input, storedOptionalImage(current.coverImageUrl));

  if (!current.category.isActive) {
    throw new ServiceRuleError(400, "inactive_category", "Activate the category or choose another active category before publishing.");
  }

  const service = await prisma.service.update({
    where: { id },
    data: { isActive: true, publishedAt: current.publishedAt ?? new Date() },
    select: detailSelect,
  });
  await writeAdminAuditLog({
    actorId,
    action: action === "reactivate" || current.publishedAt ? "service.reactivate" : "service.publish",
    entityType: "Service",
    entityId: id,
    beforeData: snapshot(current),
    afterData: snapshot(service),
  });
  return { status: serviceState(service) };
}

export async function deleteService(actorId: string, id: string) {
  assertId(id);
  const service = await prisma.service.findUnique({ where: { id }, select: detailSelect });

  if (!service) {
    throw new ServiceRuleError(404, "not_found", "That service was not found.");
  }

  const [orders, reviews, homepageLinks] = await Promise.all([
    prisma.orderItem.count({ where: { OR: [{ serviceId: id }, { variant: { serviceId: id } }] } }),
    prisma.review.count({ where: { serviceId: id } }),
    prisma.homeSectionService.count({ where: { serviceId: id } }),
  ]);

  if (orders > 0) {
    throw new ServiceRuleError(409, "service_in_orders", "This service has existing orders, so it cannot be deleted. Deactivate it instead. Past orders stay unchanged.");
  }

  if (reviews > 0) {
    throw new ServiceRuleError(409, "service_has_reviews", "This service has reviews, so it cannot be deleted. Deactivate it instead.");
  }

  if (homepageLinks > 0) {
    throw new ServiceRuleError(409, "service_on_homepage", "This service is linked to a homepage section. Remove that link before deleting it.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.service.delete({ where: { id } });
  });
  await writeAdminAuditLog({
    actorId,
    action: "service.delete",
    entityType: "Service",
    entityId: id,
    beforeData: snapshot(service),
  });
}

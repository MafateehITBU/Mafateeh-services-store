import "server-only";

import { RichTextError, sanitizeRichText } from "@/features/services/rich-text";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAdminAuditLog } from "@/server/admin/audit";
import { ImageStorageError, imageFromDataUrl } from "@/server/media/image-storage";
import { catalogFileSchema, type CatalogFile } from "@/validations/catalog-transfer";

export class CatalogTransferError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "CatalogTransferError";
  }
}

export type CatalogCounts = {
  categories: number;
  services: number;
  banners: number;
  sections: number;
  layoutItems: number;
};

const MAX_IMPORT_CHARS = 60_000_000;

function countsOf(file: Pick<CatalogFile, "categories" | "services" | "banners" | "sections" | "layoutItems">): CatalogCounts {
  return {
    categories: file.categories.length,
    services: file.services.length,
    banners: file.banners.length,
    sections: file.sections.length,
    layoutItems: file.layoutItems.length,
  };
}

function money(value: Prisma.Decimal | null) {
  return value ? value.toFixed(3) : null;
}

function storedImage(value: string, label: string) {
  try {
    return imageFromDataUrl(value).dataUrl;
  } catch (error) {
    if (error instanceof ImageStorageError) {
      throw new CatalogTransferError(400, "invalid_image", `${label}: ${error.message}`);
    }

    throw error;
  }
}

function optionalImage(value: string | null, label: string) {
  return value ? storedImage(value, label) : null;
}

function description(value: unknown) {
  try {
    return sanitizeRichText(value) as Prisma.InputJsonValue;
  } catch (error) {
    if (error instanceof RichTextError) {
      throw new CatalogTransferError(400, "invalid_file", error.message);
    }

    throw error;
  }
}

function assertUnique(ids: string[], label: string) {
  if (new Set(ids).size !== ids.length) {
    throw new CatalogTransferError(400, "invalid_file", `The file contains two ${label} with the same id.`);
  }
}

function orderedCategories(categories: CatalogFile["categories"]) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const ordered: CatalogFile["categories"] = [];
  const seen = new Set<string>();

  function visit(category: CatalogFile["categories"][number], stack: Set<string>) {
    if (seen.has(category.id)) {
      return;
    }

    if (stack.has(category.id)) {
      throw new CatalogTransferError(400, "invalid_file", "A category cannot be inside itself.");
    }

    stack.add(category.id);
    const parent = category.parentId ? byId.get(category.parentId) : undefined;

    if (parent) {
      visit(parent, stack);
    }

    stack.delete(category.id);
    seen.add(category.id);
    ordered.push(category);
  }

  for (const category of categories) {
    visit(category, new Set());
  }

  return ordered;
}

async function assertFree<T extends { id: string }>(
  rows: T[],
  label: string,
  findClash: (ids: string[]) => Promise<T | null>,
) {
  if (rows.length === 0) {
    return;
  }

  const clash = await findClash(rows.map((row) => row.id));

  if (clash) {
    throw new CatalogTransferError(
      409,
      "already_exists",
      `This database already has a different ${label}. Import into a new database, or remove the conflicting ${label} first.`,
    );
  }
}

export async function exportCatalog(): Promise<CatalogFile> {
  const [categories, services, banners, sections, layoutItems] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { translations: true } }),
    prisma.service.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        translations: true,
        images: { orderBy: { sortOrder: "asc" } },
        variants: { orderBy: { sortOrder: "asc" }, include: { translations: true } },
      },
    }),
    prisma.storeBanner.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { translations: true } }),
    prisma.homeSection.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { translations: true, services: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.homepageLayoutItem.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return {
    format: "mafateeh-store-catalog",
    version: 1,
    exportedAt: new Date().toISOString(),
    categories: categories.map((category) => ({
      id: category.id,
      parentId: category.parentId,
      slug: category.slug,
      iconName: category.iconName,
      iconImageUrl: category.iconImageUrl,
      bannerImageUrl: category.bannerImageUrl,
      isActive: category.isActive,
      sortOrder: category.sortOrder,
      createdAt: category.createdAt.toISOString(),
      translations: category.translations.map((item) => ({
        id: item.id,
        locale: item.locale,
        title: item.title,
        description: item.description,
        seoTitle: item.seoTitle,
        seoDescription: item.seoDescription,
      })),
    })),
    services: services.map((service) => ({
      id: service.id,
      categoryId: service.categoryId,
      slug: service.slug,
      sku: service.sku,
      coverImageUrl: service.coverImageUrl,
      basePrice: money(service.basePrice) ?? "0.000",
      compareAtPrice: money(service.compareAtPrice),
      currency: service.currency.toUpperCase(),
      loyaltyPoints: service.loyaltyPoints,
      isActive: service.isActive,
      isFeatured: service.isFeatured,
      sortOrder: service.sortOrder,
      publishedAt: service.publishedAt?.toISOString() ?? null,
      createdAt: service.createdAt.toISOString(),
      translations: service.translations.map((item) => ({
        id: item.id,
        locale: item.locale,
        name: item.name,
        shortDescription: item.shortDescription,
        detailedDescription: item.detailedDescription,
        seoTitle: item.seoTitle,
        seoDescription: item.seoDescription,
      })),
      images: service.images.map((item) => ({
        id: item.id,
        imageUrl: item.imageUrl,
        altText: item.altText,
        sortOrder: item.sortOrder,
      })),
      variants: service.variants.map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        price: money(variant.price) ?? "0.000",
        compareAtPrice: money(variant.compareAtPrice),
        currency: variant.currency.toUpperCase(),
        isActive: variant.isActive,
        sortOrder: variant.sortOrder,
        translations: variant.translations.map((item) => ({
          id: item.id,
          locale: item.locale,
          name: item.name,
          description: item.description,
        })),
      })),
    })),
    banners: banners.map((banner) => ({
      id: banner.id,
      placement: banner.placement,
      desktopImageUrl: banner.desktopImageUrl,
      mobileImageUrl: banner.mobileImageUrl,
      linkUrl: banner.linkUrl,
      isActive: banner.isActive,
      sortOrder: banner.sortOrder,
      startsAt: banner.startsAt?.toISOString() ?? null,
      endsAt: banner.endsAt?.toISOString() ?? null,
      createdAt: banner.createdAt.toISOString(),
      translations: banner.translations.map((item) => ({
        id: item.id,
        locale: item.locale,
        title: item.title,
        subtitle: item.subtitle,
        buttonLabel: item.buttonLabel,
        altText: item.altText,
      })),
    })),
    sections: sections.map((section) => ({
      id: section.id,
      key: section.key,
      type: section.type,
      categoryId: section.categoryId,
      isActive: section.isActive,
      sortOrder: section.sortOrder,
      maxItems: section.maxItems,
      createdAt: section.createdAt.toISOString(),
      translations: section.translations.map((item) => ({
        id: item.id,
        locale: item.locale,
        title: item.title,
        subtitle: item.subtitle,
      })),
      services: section.services.map((item) => ({
        id: item.id,
        serviceId: item.serviceId,
        sortOrder: item.sortOrder,
      })),
    })),
    layoutItems: layoutItems.map((item) => ({
      id: item.id,
      type: item.type,
      bannerId: item.bannerId,
      sectionId: item.sectionId,
      isVisible: item.isVisible,
      sortOrder: item.sortOrder,
    })),
  };
}

export async function importCatalog(actorId: string, raw: string) {
  if (raw.length > MAX_IMPORT_CHARS) {
    throw new CatalogTransferError(413, "file_too_large", "That catalog file is larger than 60 MB.");
  }

  let json: unknown;

  try {
    json = JSON.parse(raw);
  } catch {
    throw new CatalogTransferError(400, "invalid_file", "Choose a catalog file exported from this dashboard.");
  }

  const parsed = catalogFileSchema.safeParse(json);

  if (!parsed.success) {
    throw new CatalogTransferError(400, "invalid_file", "Choose a catalog file exported from this dashboard.");
  }

  const file = parsed.data;
  assertUnique(file.categories.map((item) => item.id), "categories");
  assertUnique(file.services.map((item) => item.id), "services");
  assertUnique(file.banners.map((item) => item.id), "banners");
  assertUnique(file.sections.map((item) => item.id), "sections");
  assertUnique(file.layoutItems.map((item) => item.id), "homepage blocks");
  assertUnique(
    file.services.flatMap((service) => service.variants.map((variant) => variant.id)),
    "service packages",
  );

  const categories = orderedCategories(file.categories);
  const categoryIds = categories.map((item) => item.id);
  const serviceIds = file.services.map((item) => item.id);
  const bannerIds = new Set(file.banners.map((item) => item.id));
  const sectionIds = new Set(file.sections.map((item) => item.id));

  try {
    await prisma.$transaction(
      async (tx) => {
        await assertFree(categories, "category slug", async (ids) =>
          tx.category.findFirst({ where: { slug: { in: categories.map((item) => item.slug) }, id: { notIn: ids } }, select: { id: true } }),
        );
        await assertFree(file.services, "service slug", async (ids) =>
          tx.service.findFirst({ where: { slug: { in: file.services.map((item) => item.slug) }, id: { notIn: ids } }, select: { id: true } }),
        );
        const serviceSkus = file.services.flatMap((item) => (item.sku ? [item.sku] : []));

        if (serviceSkus.length > 0) {
          const clash = await tx.service.findFirst({
            where: { sku: { in: serviceSkus }, id: { notIn: serviceIds } },
            select: { id: true },
          });

          if (clash) {
            throw new CatalogTransferError(409, "already_exists", "A service SKU in the file is already used by a different service.");
          }
        }

        const variantSkus = file.services.flatMap((service) => service.variants.map((variant) => variant.sku));

        if (variantSkus.length > 0) {
          const clash = await tx.serviceVariant.findFirst({
            where: { sku: { in: variantSkus }, serviceId: { notIn: serviceIds.length > 0 ? serviceIds : ["00000000-0000-0000-0000-000000000000"] } },
            select: { id: true },
          });

          if (clash) {
            throw new CatalogTransferError(409, "already_exists", "A package SKU in the file is already used by another service.");
          }
        }

        await assertFree(file.sections, "homepage section", async (ids) =>
          tx.homeSection.findFirst({ where: { key: { in: file.sections.map((item) => item.key) }, id: { notIn: ids } }, select: { id: true } }),
        );

        await tx.homepageLayoutItem.deleteMany();

        for (const category of categories) {
          const data = {
            slug: category.slug,
            iconName: category.iconName,
            iconImageUrl: optionalImage(category.iconImageUrl, category.slug),
            bannerImageUrl: storedImage(category.bannerImageUrl, category.slug),
            isActive: category.isActive,
            sortOrder: category.sortOrder,
            parentId: null,
          };
          await tx.category.upsert({
            where: { id: category.id },
            create: { id: category.id, ...data, createdAt: new Date(category.createdAt) },
            update: data,
          });
        }

        const knownCategories = new Set([
          ...categoryIds,
          ...(
            await tx.category.findMany({
              where: { id: { in: categories.flatMap((item) => (item.parentId ? [item.parentId] : [])) } },
              select: { id: true },
            })
          ).map((item) => item.id),
        ]);

        for (const category of categories) {
          if (category.parentId && !knownCategories.has(category.parentId)) {
            throw new CatalogTransferError(400, "invalid_file", "A category points at a parent that is not in the file or this database.");
          }

          await tx.category.update({ where: { id: category.id }, data: { parentId: category.parentId } });
        }

        if (categoryIds.length > 0) {
          await tx.categoryTranslation.deleteMany({ where: { categoryId: { in: categoryIds } } });
          await tx.categoryTranslation.createMany({
            data: categories.flatMap((category) =>
              category.translations.map((item) => ({
                id: item.id,
                categoryId: category.id,
                locale: item.locale,
                title: item.title,
                description: item.description,
                seoTitle: item.seoTitle,
                seoDescription: item.seoDescription,
              })),
            ),
          });
        }

        const knownCategoryIds = new Set(
          (
            await tx.category.findMany({
              where: { id: { in: [...new Set(file.services.map((item) => item.categoryId))] } },
              select: { id: true },
            })
          ).map((item) => item.id),
        );

        for (const service of file.services) {
          if (!knownCategoryIds.has(service.categoryId)) {
            throw new CatalogTransferError(400, "invalid_file", "A service points at a category that is not in the file or this database.");
          }

          const data = {
            categoryId: service.categoryId,
            slug: service.slug,
            sku: service.sku,
            coverImageUrl: optionalImage(service.coverImageUrl, service.slug),
            basePrice: new Prisma.Decimal(service.basePrice),
            compareAtPrice: service.compareAtPrice ? new Prisma.Decimal(service.compareAtPrice) : null,
            currency: service.currency,
            loyaltyPoints: service.loyaltyPoints,
            isActive: service.isActive,
            isFeatured: service.isFeatured,
            sortOrder: service.sortOrder,
            publishedAt: service.publishedAt ? new Date(service.publishedAt) : null,
          };
          await tx.service.upsert({
            where: { id: service.id },
            create: { id: service.id, ...data, createdAt: new Date(service.createdAt) },
            update: data,
          });
        }

        if (serviceIds.length > 0) {
          await tx.serviceTranslation.deleteMany({ where: { serviceId: { in: serviceIds } } });
          await tx.serviceImage.deleteMany({ where: { serviceId: { in: serviceIds } } });
          await tx.serviceVariantTranslation.deleteMany({ where: { variant: { serviceId: { in: serviceIds } } } });
          await tx.serviceVariant.deleteMany({ where: { serviceId: { in: serviceIds } } });
          await tx.serviceTranslation.createMany({
            data: file.services.flatMap((service) =>
              service.translations.map((item) => ({
                id: item.id,
                serviceId: service.id,
                locale: item.locale,
                name: item.name,
                shortDescription: item.shortDescription,
                detailedDescription: description(item.detailedDescription),
                seoTitle: item.seoTitle,
                seoDescription: item.seoDescription,
              })),
            ),
          });
          await tx.serviceImage.createMany({
            data: file.services.flatMap((service) =>
              service.images.map((item) => ({
                id: item.id,
                serviceId: service.id,
                imageUrl: storedImage(item.imageUrl, service.slug),
                altText: item.altText,
                sortOrder: item.sortOrder,
              })),
            ),
          });
          await tx.serviceVariant.createMany({
            data: file.services.flatMap((service) =>
              service.variants.map((variant) => ({
                id: variant.id,
                serviceId: service.id,
                sku: variant.sku,
                price: new Prisma.Decimal(variant.price),
                compareAtPrice: variant.compareAtPrice ? new Prisma.Decimal(variant.compareAtPrice) : null,
                currency: variant.currency,
                isActive: variant.isActive,
                sortOrder: variant.sortOrder,
              })),
            ),
          });
          await tx.serviceVariantTranslation.createMany({
            data: file.services.flatMap((service) =>
              service.variants.flatMap((variant) =>
                variant.translations.map((item) => ({
                  id: item.id,
                  variantId: variant.id,
                  locale: item.locale,
                  name: item.name,
                  description: item.description,
                })),
              ),
            ),
          });
        }

        for (const banner of file.banners) {
          const data = {
            placement: banner.placement,
            desktopImageUrl: storedImage(banner.desktopImageUrl, "Banner"),
            mobileImageUrl: optionalImage(banner.mobileImageUrl, "Banner"),
            linkUrl: banner.linkUrl,
            isActive: banner.isActive,
            sortOrder: banner.sortOrder,
            startsAt: banner.startsAt ? new Date(banner.startsAt) : null,
            endsAt: banner.endsAt ? new Date(banner.endsAt) : null,
          };
          await tx.storeBanner.upsert({
            where: { id: banner.id },
            create: { id: banner.id, ...data, createdAt: new Date(banner.createdAt) },
            update: data,
          });
        }

        if (bannerIds.size > 0) {
          await tx.storeBannerTranslation.deleteMany({ where: { bannerId: { in: [...bannerIds] } } });
          await tx.storeBannerTranslation.createMany({
            data: file.banners.flatMap((banner) =>
              banner.translations.map((item) => ({
                id: item.id,
                bannerId: banner.id,
                locale: item.locale,
                title: item.title,
                subtitle: item.subtitle,
                buttonLabel: item.buttonLabel,
                altText: item.altText,
              })),
            ),
          });
        }

        const sectionCategoryIds = [...new Set(file.sections.flatMap((item) => (item.categoryId ? [item.categoryId] : [])))];
        const foundSectionCategories = new Set(
          (await tx.category.findMany({ where: { id: { in: sectionCategoryIds } }, select: { id: true } })).map((item) => item.id),
        );

        for (const section of file.sections) {
          if (section.categoryId && !foundSectionCategories.has(section.categoryId)) {
            throw new CatalogTransferError(400, "invalid_file", "A homepage section points at a category that is not available.");
          }

          const data = {
            key: section.key,
            type: section.type,
            categoryId: section.categoryId,
            isActive: section.isActive,
            sortOrder: section.sortOrder,
            maxItems: section.maxItems,
          };
          await tx.homeSection.upsert({
            where: { id: section.id },
            create: { id: section.id, ...data, createdAt: new Date(section.createdAt) },
            update: data,
          });
        }

        if (sectionIds.size > 0) {
          const linkedServiceIds = [...new Set(file.sections.flatMap((section) => section.services.map((item) => item.serviceId)))];
          const foundServices = new Set(
            (await tx.service.findMany({ where: { id: { in: linkedServiceIds } }, select: { id: true } })).map((item) => item.id),
          );

          if (linkedServiceIds.some((serviceId) => !foundServices.has(serviceId))) {
            throw new CatalogTransferError(400, "invalid_file", "A homepage section points at a service that is not in the file or this database.");
          }

          await tx.homeSectionTranslation.deleteMany({ where: { sectionId: { in: [...sectionIds] } } });
          await tx.homeSectionService.deleteMany({ where: { sectionId: { in: [...sectionIds] } } });
          await tx.homeSectionTranslation.createMany({
            data: file.sections.flatMap((section) =>
              section.translations.map((item) => ({
                id: item.id,
                sectionId: section.id,
                locale: item.locale,
                title: item.title,
                subtitle: item.subtitle,
              })),
            ),
          });
          await tx.homeSectionService.createMany({
            data: file.sections.flatMap((section) =>
              section.services.map((item) => ({
                id: item.id,
                sectionId: section.id,
                serviceId: item.serviceId,
                sortOrder: item.sortOrder,
              })),
            ),
          });
        }

        const [foundBanners, foundSections] = await Promise.all([
          tx.storeBanner.findMany({
            where: { id: { in: file.layoutItems.flatMap((item) => (item.bannerId ? [item.bannerId] : [])) } },
            select: { id: true },
          }),
          tx.homeSection.findMany({
            where: { id: { in: file.layoutItems.flatMap((item) => (item.sectionId ? [item.sectionId] : [])) } },
            select: { id: true },
          }),
        ]);
        const foundBannerIds = new Set(foundBanners.map((item) => item.id));
        const foundSectionIds = new Set(foundSections.map((item) => item.id));

        for (const item of file.layoutItems) {
          if ((item.bannerId && !foundBannerIds.has(item.bannerId)) || (item.sectionId && !foundSectionIds.has(item.sectionId))) {
            throw new CatalogTransferError(400, "invalid_file", "The homepage order points at a banner or section that is not available.");
          }
        }

        if (file.layoutItems.length > 0) {
          await tx.homepageLayoutItem.createMany({
            data: file.layoutItems.map((item) => ({
              id: item.id,
              type: item.type,
              bannerId: item.bannerId,
              sectionId: item.sectionId,
              isVisible: item.isVisible,
              sortOrder: item.sortOrder,
            })),
          });
        }
      },
      { timeout: 180_000 },
    );
  } catch (error) {
    if (error instanceof CatalogTransferError || error instanceof ImageStorageError || error instanceof RichTextError) {
      throw error;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2002" || error.code === "P2003")) {
      throw new CatalogTransferError(
        409,
        "import_conflict",
        "The file overlaps with data already in this database. Import it into a new database before customers place orders.",
      );
    }

    throw error;
  }

  const counts = countsOf(file);
  await writeAdminAuditLog({
    actorId,
    action: "catalog.import",
    entityType: "Catalog",
    entityId: actorId,
    afterData: counts,
  });

  return counts;
}

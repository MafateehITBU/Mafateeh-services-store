import { z } from "zod";

const id = z.string().uuid();
const locale = z.enum(["EN", "AR"]);
const timestamp = z.string().refine((value) => Number.isFinite(Date.parse(value)), "Invalid date");
const money = z.string().regex(/^\d{1,9}(\.\d{1,3})?$/);
const optionalMoney = money.nullable();
const currency = z.string().regex(/^[A-Z]{3}$/);
const image = z.string().trim().min(1).max(7_000_000);

export const catalogFileSchema = z
  .object({
    format: z.literal("mafateeh-store-catalog"),
    version: z.literal(1),
    exportedAt: timestamp,
    categories: z.array(
      z.object({
        id,
        parentId: id.nullable(),
        slug: z.string().trim().min(1).max(180),
        iconName: z.string().max(80).nullable(),
        iconImageUrl: image.nullable(),
        bannerImageUrl: image,
        isActive: z.boolean(),
        sortOrder: z.number().int().min(0).max(100000),
        createdAt: timestamp,
        translations: z
          .array(
            z.object({
              id,
              locale,
              title: z.string().max(2000),
              description: z.string().max(4000).nullable(),
              seoTitle: z.string().max(2000).nullable(),
              seoDescription: z.string().max(2000).nullable(),
            }),
          )
          .max(2),
      }),
    ),
    services: z.array(
      z.object({
        id,
        categoryId: id,
        slug: z.string().trim().min(1).max(180),
        sku: z.string().trim().min(1).max(80).nullable(),
        coverImageUrl: image.nullable(),
        basePrice: money,
        compareAtPrice: optionalMoney,
        currency,
        loyaltyPoints: z.number().int().min(0).max(1_000_000),
        isActive: z.boolean(),
        isFeatured: z.boolean(),
        sortOrder: z.number().int().min(0).max(100000),
        publishedAt: timestamp.nullable(),
        createdAt: timestamp,
        translations: z
          .array(
            z.object({
              id,
              locale,
              name: z.string().max(2000),
              shortDescription: z.string().max(4000),
              detailedDescription: z.unknown(),
              seoTitle: z.string().max(2000).nullable(),
              seoDescription: z.string().max(2000).nullable(),
            }),
          )
          .max(2),
        images: z.array(
          z.object({
            id,
            imageUrl: image,
            altText: z.string().max(1000),
            sortOrder: z.number().int().min(0).max(100000),
          }),
        ),
        variants: z.array(
          z.object({
            id,
            sku: z.string().trim().min(1).max(80),
            price: money,
            compareAtPrice: optionalMoney,
            currency,
            isActive: z.boolean(),
            sortOrder: z.number().int().min(0).max(100000),
            translations: z
              .array(
                z.object({
                  id,
                  locale,
                  name: z.string().max(2000),
                  description: z.string().max(2000).nullable(),
                }),
              )
              .max(2),
          }),
        ),
      }),
    ),
    banners: z.array(
      z.object({
        id,
        placement: z.enum(["HOME_HERO", "HOME_PROMO"]),
        desktopImageUrl: image,
        mobileImageUrl: image.nullable(),
        linkUrl: z.string().max(500).nullable(),
        isActive: z.boolean(),
        sortOrder: z.number().int().min(0).max(100000),
        startsAt: timestamp.nullable(),
        endsAt: timestamp.nullable(),
        createdAt: timestamp,
        translations: z
          .array(
            z.object({
              id,
              locale,
              title: z.string().max(2000),
              subtitle: z.string().max(2000).nullable(),
              buttonLabel: z.string().max(200).nullable(),
              altText: z.string().max(1000),
            }),
          )
          .max(2),
      }),
    ),
    sections: z.array(
      z.object({
        id,
        key: z.string().trim().min(1).max(80),
        type: z.enum(["FEATURED_CATEGORIES", "FEATURED_SERVICES", "CATEGORY_SERVICES", "CUSTOM_SERVICES"]),
        categoryId: id.nullable(),
        isActive: z.boolean(),
        sortOrder: z.number().int().min(0).max(100000),
        maxItems: z.number().int().min(1).max(50),
        createdAt: timestamp,
        translations: z
          .array(
            z.object({
              id,
              locale,
              title: z.string().max(2000),
              subtitle: z.string().max(2000).nullable(),
            }),
          )
          .max(2),
        services: z.array(
          z.object({
            id,
            serviceId: id,
            sortOrder: z.number().int().min(0).max(100000),
          }),
        ),
      }),
    ),
    layoutItems: z.array(
      z.object({
        id,
        type: z.enum(["HERO_CAROUSEL", "PROMOTIONAL_BANNER", "CATEGORY_CAROUSEL", "HOME_SECTION", "TESTIMONIAL_CAROUSEL"]),
        bannerId: id.nullable(),
        sectionId: id.nullable(),
        isVisible: z.boolean(),
        sortOrder: z.number().int().min(0).max(100000),
      }),
    ),
  })
  .superRefine((file, context) => {
    const singleton = new Set<string>();

    for (const item of file.layoutItems) {
      if (item.type === "HERO_CAROUSEL" || item.type === "CATEGORY_CAROUSEL" || item.type === "TESTIMONIAL_CAROUSEL") {
        if (singleton.has(item.type) || item.bannerId || item.sectionId) {
          context.addIssue({ code: "custom", message: "The homepage file has an invalid carousel block.", path: ["layoutItems"] });
        }

        singleton.add(item.type);
      }

      if (item.type === "PROMOTIONAL_BANNER" && (!item.bannerId || item.sectionId)) {
        context.addIssue({ code: "custom", message: "A promotional block must point at one banner.", path: ["layoutItems"] });
      }

      if (item.type === "HOME_SECTION" && (!item.sectionId || item.bannerId)) {
        context.addIssue({ code: "custom", message: "A homepage section block must point at one section.", path: ["layoutItems"] });
      }
    }
  });

export type CatalogFile = z.infer<typeof catalogFileSchema>;

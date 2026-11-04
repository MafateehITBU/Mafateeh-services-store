import { z } from "zod";

const imageDataUrl = z
  .string()
  .trim()
  .min(1)
  .max(7_000_000)
  .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/);

const money = z.string().trim().regex(/^\d{1,9}(\.\d{1,3})?$/, "Enter a price with up to 3 decimal places.");

const optionalMoney = z
  .union([money, z.literal(""), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

export const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Use a 3-letter currency code.");

export const commonCurrencies = ["JOD", "USD", "SAR", "AED", "EUR", "GBP"] as const;

const descriptionSchema = z.object({
  name: z.string().trim().min(1, "Enter the service name.").max(160),
  shortDescription: z.string().trim().max(500),
  detailedDescription: z.unknown(),
});

const packageCopySchema = z.object({
  name: z.string().trim().min(1, "Enter the package name.").max(160),
  description: z
    .union([z.string().trim().max(1000), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value ? value : null)),
});

const galleryItemSchema = z.object({
  image: imageDataUrl,
  altText: z.string().trim().max(160).optional().default(""),
});

const packageSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  sku: z
    .union([z.string().trim().max(64), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value ? value : null)),
  price: money,
  compareAtPrice: optionalMoney,
  currency: currencySchema,
  isActive: z.boolean(),
  en: packageCopySchema,
  ar: packageCopySchema,
});

export const serviceInputSchema = z
  .object({
    categoryId: z.string().uuid("Choose a category."),
    sku: z
      .union([z.string().trim().max(64), z.literal(""), z.null()])
      .optional()
      .transform((value) => (value ? value : null)),
    cover: z.union([imageDataUrl, z.literal(""), z.null()]).optional().transform((value) => value || null),
    basePrice: money,
    compareAtPrice: optionalMoney,
    currency: currencySchema,
    loyaltyPoints: z.coerce.number().int().min(0).max(1_000_000).default(0),
    isFeatured: z.boolean(),
    sortOrder: z.coerce.number().int().min(1).max(100000),
    intent: z.enum(["draft", "publish", "keep"]),
    en: descriptionSchema,
    ar: descriptionSchema,
    gallery: z.array(galleryItemSchema).max(10),
    packages: z.array(packageSchema).max(30),
  })
  .superRefine((input, context) => {
    assertCompare(input.basePrice, input.compareAtPrice, context, ["compareAtPrice"]);
    input.packages.forEach((item, index) => {
      assertCompare(item.price, item.compareAtPrice, context, ["packages", index, "compareAtPrice"]);
    });
  });

export const serviceListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().max(120).optional().default(""),
  categoryId: z.union([z.string().uuid(), z.literal("")]).optional().default(""),
  status: z.enum(["all", "draft", "published", "inactive"]).default("all"),
  featured: z.enum(["all", "featured", "standard"]).default("all"),
  sort: z.enum(["newest", "oldest", "price", "price_desc", "sort_order"]).default("newest"),
});

export const serviceStatusSchema = z.object({
  action: z.enum(["publish", "deactivate", "reactivate"]),
});

export type ServiceInput = z.infer<typeof serviceInputSchema>;

export function moneyMillis(value: string) {
  if (!/^\d{1,9}(\.\d{1,3})?$/.test(value)) {
    return null;
  }

  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 1000 + Number(`${fraction}000`.slice(0, 3));
}

export function discountPercent(price: string, compareAtPrice: string | null) {
  if (!compareAtPrice) {
    return null;
  }

  const selling = moneyMillis(price);
  const original = moneyMillis(compareAtPrice);

  if (selling === null || original === null || original <= selling) {
    return null;
  }

  return Math.round(((original - selling) * 100) / original);
}

function assertCompare(price: string, compareAtPrice: string | null, context: z.RefinementCtx, path: (string | number)[]) {
  if (!compareAtPrice) {
    return;
  }

  const selling = moneyMillis(price);
  const original = moneyMillis(compareAtPrice);

  if (selling === null || original === null || original <= selling) {
    context.addIssue({
      code: "custom",
      path,
      message: "Compare-at price must be greater than the selling price.",
    });
  }
}

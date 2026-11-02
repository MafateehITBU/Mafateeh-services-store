import { z } from "zod";

const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value ? value : null));

const translationSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(4000),
  seoTitle: optionalText(160),
  seoDescription: optionalText(320),
});

const categoryImage = z
  .string()
  .trim()
  .min(1)
  .max(7_000_000)
  .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/);

export const categoryInputSchema = z.object({
  image: z.union([categoryImage, z.literal(""), z.null()]).optional().transform((value) => value || null),
  banner: categoryImage,
  sortOrder: z.coerce.number().int().min(1).max(100000),
  isActive: z.boolean(),
  en: translationSchema,
  ar: translationSchema,
});

export const categoryListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().max(120).optional().default(""),
  status: z.enum(["all", "active", "inactive"]).default("all"),
  view: z.enum(["table", "options"]).default("table"),
});

export const categoryStatusSchema = z.object({
  isActive: z.boolean(),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;

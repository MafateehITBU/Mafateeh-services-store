import { bannerDestinationError, isSafeBannerDestination } from "@/features/homepage/banner-destination";
import { z } from "zod";

const imageDataUrl = z
  .string()
  .trim()
  .min(1)
  .max(7_000_000)
  .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/);

const optionalImage = z.union([imageDataUrl, z.literal(""), z.null()]).optional().transform((value) => value || null);

const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value ? value : null));

const optionalDate = z
  .union([z.string().trim().max(40), z.literal(""), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

const bannerCopy = z.object({
  title: z.string().trim().min(1, "Enter the banner title.").max(160),
  subtitle: optionalText(300),
  buttonLabel: optionalText(40),
});

export const bannerInputSchema = z
  .object({
    placement: z.enum(["HOME_HERO", "HOME_PROMO"]),
    desktop: imageDataUrl,
    mobile: optionalImage,
    linkUrl: optionalText(500),
    isActive: z.boolean(),
    sortOrder: z.coerce.number().int().min(1).max(100000),
    startsAt: optionalDate,
    endsAt: optionalDate,
    en: bannerCopy,
    ar: bannerCopy,
  })
  .superRefine((input, context) => {
    if (input.linkUrl && !isSafeBannerDestination(input.linkUrl)) {
      context.addIssue({ code: "custom", path: ["linkUrl"], message: bannerDestinationError });
    }

    if (input.startsAt && input.endsAt && new Date(input.endsAt).getTime() <= new Date(input.startsAt).getTime()) {
      context.addIssue({ code: "custom", path: ["endsAt"], message: "The end date must be after the start date." });
    }

    if ((input.startsAt && Number.isNaN(new Date(input.startsAt).getTime())) || (input.endsAt && Number.isNaN(new Date(input.endsAt).getTime()))) {
      context.addIssue({ code: "custom", path: ["startsAt"], message: "Enter a valid schedule." });
    }
  });

const sectionCopy = z.object({
  title: z.string().trim().min(1, "Enter the section title.").max(160),
  subtitle: optionalText(300),
});

export const sectionInputSchema = z
  .object({
    type: z.enum(["FEATURED_CATEGORIES", "FEATURED_SERVICES", "CATEGORY_SERVICES", "CUSTOM_SERVICES"]),
    categoryId: z.union([z.string().uuid(), z.literal(""), z.null()]).optional().transform((value) => value || null),
    isActive: z.boolean(),
    sortOrder: z.coerce.number().int().min(1).max(100000),
    maxItems: z.coerce.number().int().min(1).max(24),
    en: sectionCopy,
    ar: sectionCopy,
    serviceIds: z.array(z.string().uuid()).max(24),
  })
  .superRefine((input, context) => {
    const needsCategory = input.type === "FEATURED_CATEGORIES" || input.type === "CATEGORY_SERVICES";
    const needsServices = input.type === "FEATURED_SERVICES" || input.type === "CUSTOM_SERVICES" || input.type === "CATEGORY_SERVICES";

    if (needsCategory && !input.categoryId) {
      context.addIssue({ code: "custom", path: ["categoryId"], message: "Choose an active category." });
    }

    if (!needsCategory && input.categoryId) {
      context.addIssue({ code: "custom", path: ["categoryId"], message: "This section does not use a category." });
    }

    if (!needsServices && input.serviceIds.length > 0) {
      context.addIssue({ code: "custom", path: ["serviceIds"], message: "This section highlights a category, not individual services." });
    }

    if (new Set(input.serviceIds).size !== input.serviceIds.length) {
      context.addIssue({ code: "custom", path: ["serviceIds"], message: "A service can appear only once in a section." });
    }
  });

export const reorderSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

export const activeStatusSchema = z.object({
  isActive: z.boolean(),
});

export type BannerInput = z.infer<typeof bannerInputSchema>;
export type SectionInput = z.infer<typeof sectionInputSchema>;

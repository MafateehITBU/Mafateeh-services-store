import "server-only";

import { BannerPlacement, HomepageBlockType, HomeSectionType, Locale, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAdminAuditLog } from "@/server/admin/audit";
import { ImageStorageError, imageFromDataUrl, optionalImageFromDataUrl } from "@/server/media/image-storage";
import type { BannerInput, SectionInput } from "@/validations/homepage";
import { z } from "zod";

export class HomepageRuleError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "HomepageRuleError";
  }
}

type Tx = Prisma.TransactionClient;

const bannerSelect = {
  id: true,
  placement: true,
  desktopImageUrl: true,
  mobileImageUrl: true,
  linkUrl: true,
  isActive: true,
  sortOrder: true,
  startsAt: true,
  endsAt: true,
  createdAt: true,
  translations: true,
} as const;

const sectionSelect = {
  id: true,
  key: true,
  type: true,
  categoryId: true,
  isActive: true,
  sortOrder: true,
  maxItems: true,
  createdAt: true,
  translations: true,
  services: { orderBy: { sortOrder: "asc" as const }, select: { serviceId: true, sortOrder: true } },
  category: {
    select: {
      id: true,
      isActive: true,
      translations: { where: { locale: Locale.EN }, select: { title: true }, take: 1 },
    },
  },
} as const;

type BannerRecord = Prisma.StoreBannerGetPayload<{ select: typeof bannerSelect }>;
type SectionRecord = Prisma.HomeSectionGetPayload<{ select: typeof sectionSelect }>;

function assertId(id: string) {
  if (!z.string().uuid().safeParse(id).success) {
    throw new HomepageRuleError(404, "not_found", "That record was not found.");
  }
}

function storedImage(value: string) {
  try {
    return imageFromDataUrl(value).dataUrl;
  } catch (error) {
    if (error instanceof ImageStorageError) {
      throw new HomepageRuleError(400, "invalid_image", error.message);
    }

    throw error;
  }
}

function storedOptionalImage(value: string | null) {
  try {
    return optionalImageFromDataUrl(value);
  } catch (error) {
    if (error instanceof ImageStorageError) {
      throw new HomepageRuleError(400, "invalid_image", error.message);
    }

    throw error;
  }
}

function schedule(value: string | null, label: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new HomepageRuleError(400, "invalid_schedule", `Enter a valid ${label}.`);
  }

  return date;
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug || "section";
}

async function allocateKey(tx: Tx, title: string, sectionId?: string) {
  const base = slugify(title);

  for (let suffix = 0; suffix < 1000; suffix += 1) {
    const key = suffix === 0 ? base : `${base}-${suffix + 1}`;
    const existing = await tx.homeSection.findUnique({ where: { key }, select: { id: true } });

    if (!existing || existing.id === sectionId) {
      return key;
    }
  }

  throw new HomepageRuleError(409, "duplicate_key", "A unique key for this section could not be created.");
}

function bannerSnapshot(banner: BannerRecord) {
  return {
    placement: banner.placement,
    linkUrl: banner.linkUrl,
    isActive: banner.isActive,
    sortOrder: banner.sortOrder,
    startsAt: banner.startsAt?.toISOString() ?? null,
    endsAt: banner.endsAt?.toISOString() ?? null,
    desktopStored: banner.desktopImageUrl.startsWith("data:image/"),
    mobileStored: Boolean(banner.mobileImageUrl?.startsWith("data:image/")),
    titles: banner.translations.map((item) => ({ locale: item.locale, title: item.title })),
  };
}

function sectionSnapshot(section: SectionRecord) {
  return {
    key: section.key,
    type: section.type,
    categoryId: section.categoryId,
    isActive: section.isActive,
    sortOrder: section.sortOrder,
    maxItems: section.maxItems,
    serviceIds: section.services.map((item) => item.serviceId),
    titles: section.translations.map((item) => ({ locale: item.locale, title: item.title })),
  };
}

function presentBanner(banner: BannerRecord) {
  const copy = (locale: Locale) => banner.translations.find((item) => item.locale === locale);

  return {
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
    en: { title: copy(Locale.EN)?.title ?? "", subtitle: copy(Locale.EN)?.subtitle ?? "", buttonLabel: copy(Locale.EN)?.buttonLabel ?? "" },
    ar: { title: copy(Locale.AR)?.title ?? "", subtitle: copy(Locale.AR)?.subtitle ?? "", buttonLabel: copy(Locale.AR)?.buttonLabel ?? "" },
  };
}

function presentSection(section: SectionRecord) {
  const copy = (locale: Locale) => section.translations.find((item) => item.locale === locale);

  return {
    id: section.id,
    type: section.type,
    categoryId: section.categoryId,
    categoryTitle: section.category?.translations[0]?.title ?? null,
    isActive: section.isActive,
    sortOrder: section.sortOrder,
    maxItems: section.maxItems,
    createdAt: section.createdAt.toISOString(),
    serviceIds: section.services.map((item) => item.serviceId),
    en: { title: copy(Locale.EN)?.title ?? "", subtitle: copy(Locale.EN)?.subtitle ?? "" },
    ar: { title: copy(Locale.AR)?.title ?? "", subtitle: copy(Locale.AR)?.subtitle ?? "" },
  };
}

const singletonTypes = ["HERO_CAROUSEL", "CATEGORY_CAROUSEL", "TESTIMONIAL_CAROUSEL"] as const;
type SingletonBlock = (typeof singletonTypes)[number];

async function nextLayoutOrder(tx: Tx) {
  const last = await tx.homepageLayoutItem.aggregate({ _max: { sortOrder: true } });
  return (last._max.sortOrder ?? 0) + 1;
}

async function repairHomepageLayout() {
  const [promos, sections, items] = await Promise.all([
    prisma.storeBanner.findMany({
      where: { placement: "HOME_PROMO" },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    }),
    prisma.homeSection.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } }),
    prisma.homepageLayoutItem.findMany({ select: { bannerId: true, sectionId: true } }),
  ]);
  const bannerIds = new Set(items.flatMap((item) => (item.bannerId ? [item.bannerId] : [])));
  const sectionIds = new Set(items.flatMap((item) => (item.sectionId ? [item.sectionId] : [])));
  const missingPromos = promos.filter((promo) => !bannerIds.has(promo.id));
  const missingSections = sections.filter((section) => !sectionIds.has(section.id));

  if (missingPromos.length === 0 && missingSections.length === 0) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    let order = await nextLayoutOrder(tx);

    for (const promo of missingPromos) {
      await tx.homepageLayoutItem.create({
        data: { type: HomepageBlockType.PROMOTIONAL_BANNER, bannerId: promo.id, sortOrder: order, isVisible: true },
      });
      order += 1;
    }

    for (const section of missingSections) {
      await tx.homepageLayoutItem.create({
        data: { type: HomepageBlockType.HOME_SECTION, sectionId: section.id, sortOrder: order, isVisible: true },
      });
      order += 1;
    }
  });
}

export async function getHomepageAdmin() {
  await repairHomepageLayout();
  const [banners, sections, categories, services, layout, approvedReviewCount] = await Promise.all([
    prisma.storeBanner.findMany({ orderBy: [{ placement: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }], select: bannerSelect }),
    prisma.homeSection.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: sectionSelect }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, translations: { where: { locale: Locale.EN }, select: { title: true }, take: 1 } },
    }),
    prisma.service.findMany({
      where: { isActive: true, publishedAt: { not: null }, category: { isActive: true } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        categoryId: true,
        basePrice: true,
        currency: true,
        coverImageUrl: true,
        translations: { where: { locale: Locale.EN }, select: { name: true }, take: 1 },
        category: { select: { translations: { where: { locale: Locale.EN }, select: { title: true }, take: 1 } } },
      },
    }),
    prisma.homepageLayoutItem.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, type: true, bannerId: true, sectionId: true, isVisible: true, sortOrder: true },
    }),
    prisma.review.count({
      where: { status: "APPROVED", service: { isActive: true, publishedAt: { not: null }, category: { isActive: true } } },
    }),
  ]);

  return {
    banners: banners.map(presentBanner),
    sections: sections.map(presentSection),
    layout,
    approvedReviewCount,
    categories: categories.map((category) => ({ id: category.id, title: category.translations[0]?.title ?? "Category" })),
    services: services.map((service) => ({
      id: service.id,
      categoryId: service.categoryId,
      name: service.translations[0]?.name ?? "Service",
      category: service.category.translations[0]?.title ?? "Category",
      price: service.basePrice.toString(),
      currency: service.currency,
      coverImageUrl: service.coverImageUrl,
    })),
  };
}

async function writeBanner(tx: Tx, bannerId: string | undefined, input: BannerInput) {
  const startsAt = schedule(input.startsAt, "start date");
  const endsAt = schedule(input.endsAt, "end date");

  if (startsAt && endsAt && endsAt <= startsAt) {
    throw new HomepageRuleError(400, "invalid_schedule", "The end date must be after the start date.");
  }

  const data = {
    placement: input.placement as BannerPlacement,
    desktopImageUrl: storedImage(input.desktop),
    mobileImageUrl: storedOptionalImage(input.mobile),
    linkUrl: input.linkUrl,
    isActive: input.isActive,
    sortOrder: input.sortOrder,
    startsAt,
    endsAt,
  };
  const translations = [Locale.EN, Locale.AR].map((locale) => {
    const copy = locale === Locale.EN ? input.en : input.ar;

    return {
      locale,
      title: copy.title,
      subtitle: copy.subtitle,
      buttonLabel: copy.buttonLabel,
      altText: copy.title,
    };
  });
  const saved = bannerId
    ? await tx.storeBanner.update({ where: { id: bannerId }, data, select: { id: true } })
    : await tx.storeBanner.create({ data, select: { id: true } });

  await tx.storeBannerTranslation.deleteMany({ where: { bannerId: saved.id } });
  await tx.storeBannerTranslation.createMany({ data: translations.map((item) => ({ ...item, bannerId: saved.id })) });
  return tx.storeBanner.findUniqueOrThrow({ where: { id: saved.id }, select: bannerSelect });
}

export async function createBanner(actorId: string, input: BannerInput) {
  const banner = await prisma.$transaction(async (tx) => {
    if (input.placement === "HOME_HERO") {
      const existing = await tx.storeBanner.count({ where: { placement: "HOME_HERO" } });

      if (existing > 0) {
        throw new HomepageRuleError(409, "hero_exists", "The homepage already has a hero banner.");
      }
    }

    const saved = await writeBanner(tx, undefined, input);

    if (saved.placement === "HOME_PROMO") {
      await tx.homepageLayoutItem.create({
        data: { type: HomepageBlockType.PROMOTIONAL_BANNER, bannerId: saved.id, sortOrder: await nextLayoutOrder(tx), isVisible: true },
      });
    } else {
      const hero = await tx.homepageLayoutItem.findFirst({ where: { type: HomepageBlockType.HERO_CAROUSEL }, select: { id: true } });

      if (!hero) {
        await tx.homepageLayoutItem.create({
          data: { type: HomepageBlockType.HERO_CAROUSEL, sortOrder: await nextLayoutOrder(tx), isVisible: true },
        });
      }
    }

    return saved;
  });
  await writeAdminAuditLog({ actorId, action: "banner.create", entityType: "StoreBanner", entityId: banner.id, afterData: bannerSnapshot(banner) });
  return presentBanner(banner);
}

export async function updateBanner(actorId: string, id: string, input: BannerInput) {
  assertId(id);
  const before = await prisma.storeBanner.findUnique({ where: { id }, select: bannerSelect });

  if (!before) {
    throw new HomepageRuleError(404, "not_found", "That banner was not found.");
  }

  const banner = await prisma.$transaction((tx) => writeBanner(tx, id, input));
  await writeAdminAuditLog({
    actorId,
    action: "banner.update",
    entityType: "StoreBanner",
    entityId: id,
    beforeData: bannerSnapshot(before),
    afterData: bannerSnapshot(banner),
  });
  return presentBanner(banner);
}

export async function setBannerStatus(actorId: string, id: string, isActive: boolean) {
  assertId(id);
  const before = await prisma.storeBanner.findUnique({ where: { id }, select: bannerSelect });

  if (!before) {
    throw new HomepageRuleError(404, "not_found", "That banner was not found.");
  }

  const banner = await prisma.storeBanner.update({ where: { id }, data: { isActive }, select: bannerSelect });
  await writeAdminAuditLog({
    actorId,
    action: isActive ? "banner.activate" : "banner.deactivate",
    entityType: "StoreBanner",
    entityId: id,
    beforeData: bannerSnapshot(before),
    afterData: bannerSnapshot(banner),
  });
  return { isActive: banner.isActive };
}

export async function deleteBanner(actorId: string, id: string) {
  assertId(id);
  const banner = await prisma.storeBanner.findUnique({ where: { id }, select: bannerSelect });

  if (!banner) {
    throw new HomepageRuleError(404, "not_found", "That banner was not found.");
  }

  await prisma.storeBanner.delete({ where: { id } });
  await writeAdminAuditLog({ actorId, action: "banner.delete", entityType: "StoreBanner", entityId: id, beforeData: bannerSnapshot(banner) });
}

export async function reorderBanners(actorId: string, placement: "HOME_HERO" | "HOME_PROMO", ids: string[]) {
  const rows = await prisma.storeBanner.findMany({ where: { id: { in: ids }, placement }, select: { id: true } });

  if (rows.length !== ids.length) {
    throw new HomepageRuleError(400, "invalid_order", "The banner order does not match this placement.");
  }

  await prisma.$transaction(ids.map((id, index) => prisma.storeBanner.update({ where: { id }, data: { sortOrder: index + 1 } })));
  await writeAdminAuditLog({ actorId, action: "banner.reorder", entityType: "StoreBanner", entityId: ids[0], afterData: { placement, ids } });
}

async function assertSectionLinks(tx: Tx, input: SectionInput) {
  if (input.categoryId) {
    const category = await tx.category.findUnique({ where: { id: input.categoryId }, select: { isActive: true } });

    if (!category?.isActive) {
      throw new HomepageRuleError(400, "inactive_category", "Choose an active category.");
    }
  }

  if (input.serviceIds.length === 0) {
    return;
  }

  const services = await tx.service.findMany({
    where: { id: { in: input.serviceIds } },
    select: { id: true, categoryId: true, isActive: true, publishedAt: true, category: { select: { isActive: true } } },
  });

  if (services.length !== input.serviceIds.length) {
    throw new HomepageRuleError(400, "invalid_service", "One of the selected services was not found.");
  }

  for (const service of services) {
    if (!service.isActive || !service.publishedAt || !service.category.isActive) {
      throw new HomepageRuleError(400, "unpublished_service", "Only active published services can be added.");
    }

    if (input.type === "CATEGORY_SERVICES" && service.categoryId !== input.categoryId) {
      throw new HomepageRuleError(400, "wrong_category", "Choose services from the selected category.");
    }
  }
}

async function writeSection(tx: Tx, sectionId: string | undefined, input: SectionInput) {
  await assertSectionLinks(tx, input);
  const key = await allocateKey(tx, input.en.title, sectionId);
  const data = {
    key,
    type: input.type as HomeSectionType,
    categoryId: input.categoryId,
    isActive: input.isActive,
    sortOrder: input.sortOrder,
    maxItems: input.maxItems,
  };
  const saved = sectionId
    ? await tx.homeSection.update({ where: { id: sectionId }, data, select: { id: true } })
    : await tx.homeSection.create({ data, select: { id: true } });
  const translations = [Locale.EN, Locale.AR].map((locale) => {
    const copy = locale === Locale.EN ? input.en : input.ar;
    return { locale, title: copy.title, subtitle: copy.subtitle, sectionId: saved.id };
  });

  await tx.homeSectionTranslation.deleteMany({ where: { sectionId: saved.id } });
  await tx.homeSectionTranslation.createMany({ data: translations });
  await tx.homeSectionService.deleteMany({ where: { sectionId: saved.id } });

  if (input.serviceIds.length > 0) {
    await tx.homeSectionService.createMany({
      data: input.serviceIds.map((serviceId, index) => ({ sectionId: saved.id, serviceId, sortOrder: index + 1 })),
    });
  }

  return tx.homeSection.findUniqueOrThrow({ where: { id: saved.id }, select: sectionSelect });
}

export async function createSection(actorId: string, input: SectionInput) {
  const section = await prisma.$transaction(async (tx) => {
    const saved = await writeSection(tx, undefined, input);
    await tx.homepageLayoutItem.create({
      data: { type: HomepageBlockType.HOME_SECTION, sectionId: saved.id, sortOrder: await nextLayoutOrder(tx), isVisible: true },
    });
    return saved;
  });
  await writeAdminAuditLog({ actorId, action: "section.create", entityType: "HomeSection", entityId: section.id, afterData: sectionSnapshot(section) });
  return presentSection(section);
}

export async function updateSection(actorId: string, id: string, input: SectionInput) {
  assertId(id);
  const before = await prisma.homeSection.findUnique({ where: { id }, select: sectionSelect });

  if (!before) {
    throw new HomepageRuleError(404, "not_found", "That section was not found.");
  }

  const section = await prisma.$transaction((tx) => writeSection(tx, id, input));
  await writeAdminAuditLog({
    actorId,
    action: "section.update",
    entityType: "HomeSection",
    entityId: id,
    beforeData: sectionSnapshot(before),
    afterData: sectionSnapshot(section),
  });
  return presentSection(section);
}

export async function setSectionStatus(actorId: string, id: string, isActive: boolean) {
  assertId(id);
  const before = await prisma.homeSection.findUnique({ where: { id }, select: sectionSelect });

  if (!before) {
    throw new HomepageRuleError(404, "not_found", "That section was not found.");
  }

  const section = await prisma.homeSection.update({ where: { id }, data: { isActive }, select: sectionSelect });
  await writeAdminAuditLog({
    actorId,
    action: isActive ? "section.activate" : "section.deactivate",
    entityType: "HomeSection",
    entityId: id,
    beforeData: sectionSnapshot(before),
    afterData: sectionSnapshot(section),
  });
  return { isActive: section.isActive };
}

export async function deleteSection(actorId: string, id: string) {
  assertId(id);
  const section = await prisma.homeSection.findUnique({ where: { id }, select: sectionSelect });

  if (!section) {
    throw new HomepageRuleError(404, "not_found", "That section was not found.");
  }

  await prisma.homeSection.delete({ where: { id } });
  await writeAdminAuditLog({ actorId, action: "section.delete", entityType: "HomeSection", entityId: id, beforeData: sectionSnapshot(section) });
}

export async function reorderSections(actorId: string, ids: string[]) {
  const rows = await prisma.homeSection.findMany({ where: { id: { in: ids } }, select: { id: true } });

  if (rows.length !== ids.length) {
    throw new HomepageRuleError(400, "invalid_order", "The section order is not valid.");
  }

  await prisma.$transaction(ids.map((id, index) => prisma.homeSection.update({ where: { id }, data: { sortOrder: index + 1 } })));
  await writeAdminAuditLog({ actorId, action: "section.reorder", entityType: "HomeSection", entityId: ids[0], afterData: { ids } });
}

export async function reorderLayout(actorId: string, ids: string[]) {
  const rows = await prisma.homepageLayoutItem.findMany({ select: { id: true } });
  const known = new Set(rows.map((row) => row.id));

  if (rows.length !== ids.length || new Set(ids).size !== ids.length || ids.some((id) => !known.has(id))) {
    throw new HomepageRuleError(400, "invalid_order", "The homepage order does not match the saved blocks.");
  }

  await prisma.$transaction(ids.map((id, index) => prisma.homepageLayoutItem.update({ where: { id }, data: { sortOrder: index + 1 } })));
  await writeAdminAuditLog({ actorId, action: "layout.reorder", entityType: "HomepageLayoutItem", entityId: ids[0], afterData: { ids } });
}

export async function setLayoutVisibility(actorId: string, id: string, isVisible: boolean) {
  assertId(id);
  const before = await prisma.homepageLayoutItem.findUnique({ where: { id }, select: { id: true, type: true, isVisible: true } });

  if (!before) {
    throw new HomepageRuleError(404, "not_found", "That homepage block was not found.");
  }

  const item = await prisma.homepageLayoutItem.update({ where: { id }, data: { isVisible }, select: { id: true, isVisible: true } });
  await writeAdminAuditLog({
    actorId,
    action: isVisible ? "layout.show" : "layout.hide",
    entityType: "HomepageLayoutItem",
    entityId: id,
    beforeData: before,
    afterData: item,
  });
  return { isVisible: item.isVisible };
}

export async function createSingletonLayout(actorId: string, type: SingletonBlock) {
  const existing = await prisma.homepageLayoutItem.findFirst({ where: { type }, select: { id: true } });

  if (existing) {
    throw new HomepageRuleError(409, "duplicate_block", "This block is already on the homepage.");
  }

  try {
    const item = await prisma.$transaction(async (tx) =>
      tx.homepageLayoutItem.create({
        data: { type, sortOrder: await nextLayoutOrder(tx), isVisible: true },
        select: { id: true, type: true, isVisible: true, sortOrder: true },
      }),
    );
    await writeAdminAuditLog({ actorId, action: "layout.create", entityType: "HomepageLayoutItem", entityId: item.id, afterData: item });
    return item;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new HomepageRuleError(409, "duplicate_block", "This block is already on the homepage.");
    }

    throw error;
  }
}

export async function deleteLayoutItem(actorId: string, id: string) {
  assertId(id);
  const item = await prisma.homepageLayoutItem.findUnique({
    where: { id },
    select: { id: true, type: true, bannerId: true, sectionId: true },
  });

  if (!item) {
    throw new HomepageRuleError(404, "not_found", "That homepage block was not found.");
  }

  if (item.type === HomepageBlockType.PROMOTIONAL_BANNER && item.bannerId) {
    await deleteBanner(actorId, item.bannerId);
    return;
  }

  if (item.type === HomepageBlockType.HOME_SECTION && item.sectionId) {
    await deleteSection(actorId, item.sectionId);
    return;
  }

  if (!singletonTypes.includes(item.type as SingletonBlock)) {
    throw new HomepageRuleError(400, "invalid_block", "That homepage block cannot be removed this way.");
  }

  await prisma.homepageLayoutItem.delete({ where: { id } });
  await writeAdminAuditLog({ actorId, action: "layout.delete", entityType: "HomepageLayoutItem", entityId: id, beforeData: item });
}

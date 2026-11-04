import "server-only";

import { countryFromPhone, findCountry, nationalFromPhone, normalizeNationalNumber } from "@/lib/countries";
import { Locale } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { readCustomerSessionUserId } from "@/server/auth/customer-session";
import { ImageStorageError, imageFromDataUrl } from "@/server/media/image-storage";

const publishedService = {
  isActive: true,
  publishedAt: { not: null },
  category: { isActive: true },
} as const;

async function requireCustomer() {
  const userId = await readCustomerSessionUserId();

  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      status: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      phoneCountry: true,
      avatarUrl: true,
    },
  });

  if (!user || user.role !== "CUSTOMER" || user.status !== "ACTIVE") {
    return null;
  }

  return user;
}

function money(value: { toString(): string }, locale: "en" | "ar") {
  const amount = Number(value.toString());

  if (!Number.isFinite(amount)) {
    return value.toString();
  }

  return new Intl.NumberFormat(locale === "ar" ? "ar" : "en", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 3,
    maximumFractionDigits: 3,
  }).format(amount);
}

export async function readCustomerAccount() {
  const user = await requireCustomer();

  if (!user) {
    return null;
  }

  const country = countryFromPhone(user.phone, user.phoneCountry);

  return {
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    email: user.email,
    countryIso: country.iso,
    phone: nationalFromPhone(user.phone, country),
    avatarUrl: user.avatarUrl?.startsWith("data:image/") ? user.avatarUrl : null,
  };
}

export async function updateCustomerAccount(input: {
  firstName: string;
  lastName: string;
  email: string;
  countryIso: string;
  phone: string;
  avatar?: string;
}) {
  const user = await requireCustomer();

  if (!user) {
    return { ok: false as const, status: 401, error: "unauthenticated" };
  }

  const country = findCountry(input.countryIso);

  if (!country) {
    return { ok: false as const, status: 400, error: "invalid_phone" };
  }

  const email = input.email.trim().toLowerCase();

  if (email !== user.email) {
    const taken = await prisma.user.findUnique({ where: { email }, select: { id: true } });

    if (taken) {
      return { ok: false as const, status: 409, error: "email_taken" };
    }
  }

  let avatarUrl: string | undefined;

  if (input.avatar) {
    try {
      avatarUrl = imageFromDataUrl(input.avatar).dataUrl;
    } catch (error) {
      if (error instanceof ImageStorageError) {
        return { ok: false as const, status: 400, error: "invalid_image" };
      }

      throw error;
    }
  }

  const emailChanged = email !== user.email;
  const saved = await prisma.user.update({
    where: { id: user.id },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      phone: `+${country.dial}${normalizeNationalNumber(input.phone)}`,
      phoneCountry: country.iso,
      profileCompletedAt: new Date(),
      ...(avatarUrl ? { avatarUrl } : {}),
    },
    select: { firstName: true },
  });

  return { ok: true as const, firstName: saved.firstName ?? input.firstName, emailConfirmation: emailChanged, email };
}

export async function listCustomerOrders(locale: "en" | "ar") {
  const user = await requireCustomer();

  if (!user) {
    return null;
  }

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      currency: true,
      total: true,
      createdAt: true,
      items: {
        orderBy: { createdAt: "asc" },
        select: { id: true, serviceNameSnapshot: true, quantity: true, lineTotal: true, currency: true },
      },
    },
  });

  return orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    currency: order.currency,
    total: money(order.total, locale),
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      name: item.serviceNameSnapshot,
      quantity: item.quantity,
      total: money(item.lineTotal, locale),
      currency: item.currency,
    })),
  }));
}

export async function listCustomerWishlist(locale: "en" | "ar") {
  const user = await requireCustomer();

  if (!user) {
    return null;
  }

  const language = locale === "ar" ? Locale.AR : Locale.EN;
  const rows = await prisma.wishlistItem.findMany({
    where: { userId: user.id, service: publishedService },
    orderBy: { createdAt: "desc" },
    select: {
      service: {
        select: {
          id: true,
          slug: true,
          coverImageUrl: true,
          currency: true,
          basePrice: true,
          isFeatured: true,
          translations: { where: { locale: language }, select: { name: true, shortDescription: true }, take: 1 },
          category: { select: { translations: { where: { locale: language }, select: { title: true }, take: 1 } } },
        },
      },
    },
  });
  const ids = rows.map((row) => row.service.id);
  const ratings = ids.length
    ? await prisma.review.groupBy({
        by: ["serviceId"],
        where: { serviceId: { in: ids }, status: "APPROVED" },
        _avg: { rating: true },
        _count: { _all: true },
      })
    : [];
  const ratingById = new Map(ratings.map((row) => [row.serviceId, row]));

  return rows.flatMap((row) => {
    const translation = row.service.translations[0];

    if (!translation || !row.service.coverImageUrl) {
      return [];
    }

    const rating = ratingById.get(row.service.id);
    const reviewCount = rating?._count._all ?? 0;

    return [
      {
        id: row.service.id,
        slug: row.service.slug,
        name: translation.name,
        shortDescription: translation.shortDescription,
        coverImageUrl: row.service.coverImageUrl,
        price: money(row.service.basePrice, locale),
        currency: row.service.currency,
        isFeatured: row.service.isFeatured,
        categoryTitle: row.service.category.translations[0]?.title ?? "",
        ratingAverage: reviewCount > 0 && rating?._avg.rating != null ? Math.round(rating._avg.rating * 10) / 10 : null,
        reviewCount,
      },
    ];
  });
}

export async function listCustomerLoyalty() {
  const user = await requireCustomer();

  if (!user) {
    return null;
  }

  const wallet = await prisma.loyaltyWallet.findUnique({
    where: { userId: user.id },
    select: {
      pointsBalance: true,
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, type: true, points: true, description: true, createdAt: true },
      },
    },
  });

  return {
    balance: wallet?.pointsBalance ?? 0,
    transactions: (wallet?.transactions ?? [])
      .filter((entry) => entry.points !== 0)
      .map((entry) => ({
        id: entry.id,
        type: entry.type,
        points: entry.points,
        description: entry.description,
        createdAt: entry.createdAt.toISOString(),
      })),
  };
}

export async function listWishlistIds() {
  const user = await requireCustomer();

  if (!user) {
    return [];
  }

  const rows = await prisma.wishlistItem.findMany({
    where: { userId: user.id },
    select: { serviceId: true },
  });

  return rows.map((row) => row.serviceId);
}

export async function toggleWishlist(serviceId: string) {
  const user = await requireCustomer();

  if (!user) {
    return { ok: false as const, status: 401, error: "unauthenticated" };
  }

  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_serviceId: { userId: user.id, serviceId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    return { ok: true as const, saved: false };
  }

  const service = await prisma.service.findFirst({
    where: { id: serviceId, ...publishedService },
    select: { id: true },
  });

  if (!service) {
    return { ok: false as const, status: 404, error: "not_found" };
  }

  await prisma.wishlistItem.create({ data: { userId: user.id, serviceId } });
  return { ok: true as const, saved: true };
}

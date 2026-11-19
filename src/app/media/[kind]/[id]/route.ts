import { createHash } from "node:crypto";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { readAdminSession } from "@/server/admin/session";
import { readCustomerSession } from "@/server/auth/customer-session";
import { decodeStoredImage } from "@/server/media/process-image";
import { mediaKinds, type MediaKind } from "@/server/media/media-url";
import { connection } from "next/server";

type RouteContext = { params: Promise<{ kind: string; id: string }> };

const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const leanCache = new Map<string, { body: Buffer; etag: string }>();

function etagFor(body: Buffer) {
  return `"${createHash("sha256").update(body).digest("hex").slice(0, 32)}"`;
}

function imageResponse(request: Request, body: Buffer, mimeType: string, cache: "public" | "private") {
  const etag = etagFor(body);
  const headers = {
    "Content-Type": mimeType,
    ETag: etag,
    "Cache-Control": cache === "public" ? "public, max-age=31536000, immutable" : "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };

  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers });
  }

  return new Response(new Uint8Array(body), { headers });
}

async function privateViewer() {
  try {
    const session = await readAdminSession();

    if (!session) {
      return false;
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true, status: true, sessionVersion: true },
    });

    return Boolean(user && user.status === "ACTIVE" && (user.role === "ADMIN" || user.role === "SUPER_ADMIN") && user.sessionVersion === session.sessionVersion);
  } catch {
    return false;
  }
}

async function avatarAccess(userId: string) {
  const publishedReview = await prisma.review.findFirst({
    where: {
      userId,
      status: "APPROVED",
      service: { isActive: true, publishedAt: { not: null }, category: { isActive: true } },
    },
    select: { id: true },
  });

  if (publishedReview) {
    return "public" as const;
  }

  try {
    const session = await readCustomerSession();

    if (session?.userId === userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { status: true, sessionVersion: true, role: true },
      });

      if (user?.status === "ACTIVE" && user.role === "CUSTOMER" && user.sessionVersion === session.sessionVersion) {
        return "private" as const;
      }
    }
  } catch {
    return null;
  }

  return (await privateViewer()) ? ("private" as const) : null;
}

async function leanBanner(id: string, updatedAt: Date, desktop: Buffer) {
  const key = `${id}:${updatedAt.getTime()}`;
  const cached = leanCache.get(key);

  if (cached) {
    return cached;
  }

  const body = await sharp(desktop, { failOn: "error" }).rotate().resize({ width: 1080, withoutEnlargement: true }).webp({ quality: 75 }).toBuffer();
  const entry = { body, etag: etagFor(body) };
  leanCache.set(key, entry);

  if (leanCache.size > 40) {
    const oldest = leanCache.keys().next().value;

    if (oldest) {
      leanCache.delete(oldest);
    }
  }

  return entry;
}

async function loadImage(kind: MediaKind, id: string) {
  if (kind === "category-icon" || kind === "category-banner") {
    const row = await prisma.category.findUnique({
      where: { id },
      select: { isActive: true, iconImageUrl: true, bannerImageUrl: true },
    });
    const value = kind === "category-icon" ? row?.iconImageUrl : row?.bannerImageUrl;

    return { bytes: decodeStoredImage(value), visible: Boolean(row?.isActive), cache: "public" as const, allowed: true };
  }

  if (kind === "service-cover") {
    const row = await prisma.service.findUnique({
      where: { id },
      select: { isActive: true, publishedAt: true, coverImageUrl: true, category: { select: { isActive: true } } },
    });

    return { bytes: decodeStoredImage(row?.coverImageUrl), visible: Boolean(row?.isActive && row.publishedAt && row.category.isActive), cache: "public" as const, allowed: true };
  }

  if (kind === "service-image") {
    const row = await prisma.serviceImage.findUnique({
      where: { id },
      select: { imageUrl: true, service: { select: { isActive: true, publishedAt: true, category: { select: { isActive: true } } } } },
    });

    return {
      bytes: decodeStoredImage(row?.imageUrl),
      visible: Boolean(row?.service.isActive && row.service.publishedAt && row.service.category.isActive),
      cache: "public" as const,
      allowed: true,
    };
  }

  if (kind === "banner-desktop" || kind === "banner-mobile") {
    const now = new Date();
    const row = await prisma.storeBanner.findUnique({
      where: { id },
      select: { isActive: true, startsAt: true, endsAt: true, updatedAt: true, desktopImageUrl: true, mobileImageUrl: true },
    });
    const scheduled = Boolean(row && (!row.startsAt || row.startsAt <= now) && (!row.endsAt || row.endsAt >= now));
    const desktop = decodeStoredImage(row?.desktopImageUrl);

    if (kind === "banner-mobile" && row && !decodeStoredImage(row.mobileImageUrl) && desktop) {
      const lean = await leanBanner(id, row.updatedAt, desktop.bytes);
      return { bytes: { mimeType: "image/webp", bytes: lean.body }, visible: Boolean(row.isActive && scheduled), cache: "public" as const, allowed: true };
    }

    return {
      bytes: decodeStoredImage(kind === "banner-desktop" ? row?.desktopImageUrl : row?.mobileImageUrl),
      visible: Boolean(row?.isActive && scheduled),
      cache: "public" as const,
      allowed: true,
    };
  }

  const row = await prisma.user.findUnique({ where: { id }, select: { avatarUrl: true, updatedAt: true } });
  const access = row ? await avatarAccess(id) : null;

  return { bytes: decodeStoredImage(row?.avatarUrl), visible: access === "public", cache: access === "private" ? ("private" as const) : ("public" as const), allowed: access !== null };
}

export async function GET(request: Request, context: RouteContext) {
  await connection();
  const { kind, id } = await context.params;

  if (!mediaKinds.includes(kind as MediaKind) || !idPattern.test(id)) {
    return new Response(null, { status: 404 });
  }

  const loaded = await loadImage(kind as MediaKind, id);

  if (!loaded.bytes) {
    return new Response(null, { status: 404 });
  }

  if (!loaded.visible) {
    if (kind === "avatar") {
      if (!loaded.allowed) {
        return new Response(null, { status: 404 });
      }
    } else if (!(await privateViewer())) {
      return new Response(null, { status: 404 });
    }

    return imageResponse(request, loaded.bytes.bytes, loaded.bytes.mimeType, "private");
  }

  return imageResponse(request, loaded.bytes.bytes, loaded.bytes.mimeType, loaded.cache ?? "public");
}

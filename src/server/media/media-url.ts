import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const mediaKinds = ["category-icon", "category-banner", "service-cover", "service-image", "banner-desktop", "banner-mobile", "avatar"] as const;

export type MediaKind = (typeof mediaKinds)[number];

const imageColumns = {
  Category: ["iconImageUrl", "bannerImageUrl"],
  Service: ["coverImageUrl"],
  StoreBanner: ["desktopImageUrl", "mobileImageUrl"],
  User: ["avatarUrl"],
} as const;

type ImageTable = keyof typeof imageColumns;

export function mediaPath(kind: MediaKind, id: string, updatedAt: Date) {
  return `/media/${kind}/${id}?v=${Math.floor(updatedAt.getTime() / 1000)}`;
}

export async function idsWithStoredImage<T extends ImageTable>(table: T, column: (typeof imageColumns)[T][number], ids: string[]) {
  const present = new Set<string>();

  if (ids.length === 0 || !imageColumns[table].includes(column as never)) {
    return present;
  }

  const rows = await prisma.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`SELECT id::text AS id FROM ${Prisma.raw(`"${table}"`)} WHERE id IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))}) AND left(${Prisma.raw(`"${column}"`)}, 11) = 'data:image/'`,
  );

  for (const row of rows) {
    present.add(row.id);
  }

  return present;
}

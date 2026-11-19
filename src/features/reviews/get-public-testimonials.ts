import "server-only";

import type { PublicTestimonial } from "@/features/reviews/types";
import { prisma } from "@/lib/prisma";
import { idsWithStoredImage, mediaPath } from "@/server/media/media-url";

type PublicLocale = "en" | "ar";

export async function listHomepageTestimonials(locale: PublicLocale): Promise<PublicTestimonial[]> {
  const rows = await prisma.review.findMany({
    where: {
      status: "APPROVED",
      service: { isActive: true, publishedAt: { not: null }, category: { isActive: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      id: true,
      rating: true,
      comment: true,
      service: { select: { slug: true } },
      user: { select: { id: true, updatedAt: true, firstName: true, lastName: true } },
    },
  });
  const avatars = await idsWithStoredImage("User", "avatarUrl", rows.map((row) => row.user.id));
  const approved = rows.flatMap((row) => {
    const name = [row.user.firstName, row.user.lastName].filter(Boolean).join(" ");

    if (!name || !row.comment) {
      return [];
    }

    return [
      {
        id: row.id,
        name,
        location: null,
        avatarUrl: avatars.has(row.user.id) ? mediaPath("avatar", row.user.id, row.user.updatedAt) : null,
        rating: row.rating,
        comment: row.comment,
        serviceHref: `/services/${row.service.slug}`,
        preview: false,
      },
    ];
  });

  if (approved.length > 0 || process.env.NODE_ENV === "production") {
    return approved;
  }

  const { previewTestimonials } = await import("@/features/reviews/preview-testimonials");
  return previewTestimonials(locale);
}

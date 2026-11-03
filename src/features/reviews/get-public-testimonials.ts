import "server-only";

import type { PublicTestimonial } from "@/features/reviews/types";
import { prisma } from "@/lib/prisma";

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
      user: { select: { firstName: true, lastName: true, avatarUrl: true } },
    },
  });
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
        avatarUrl: row.user.avatarUrl?.startsWith("data:image/") ? row.user.avatarUrl : null,
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

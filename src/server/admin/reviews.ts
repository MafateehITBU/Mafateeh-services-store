import "server-only";

import { prisma } from "@/lib/prisma";
import { writeAdminAuditLog } from "@/server/admin/audit";
import { dayRange } from "@/validations/admin-operations";
import type { ReviewStatus } from "@/generated/prisma/client";

const pageSize = 12;

export class ReviewRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewRuleError";
  }
}

function personName(user: { firstName: string | null; lastName: string | null; email: string }) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
}

export async function listAdminReviews(input: {
  q?: string;
  status?: ReviewStatus;
  rating?: number;
  serviceId?: string;
  from?: string;
  to?: string;
  page?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const where = {
    status: input.status,
    rating: input.rating,
    serviceId: input.serviceId || undefined,
    createdAt: dayRange(input.from, input.to),
    OR: input.q
      ? [
          { comment: { contains: input.q, mode: "insensitive" as const } },
          { user: { email: { contains: input.q, mode: "insensitive" as const } } },
          { user: { firstName: { contains: input.q, mode: "insensitive" as const } } },
          { user: { lastName: { contains: input.q, mode: "insensitive" as const } } },
        ]
      : undefined,
  };
  const [total, rows, services] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        rating: true,
        comment: true,
        status: true,
        verifiedPurchase: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true, email: true } },
        service: { select: { translations: { where: { locale: "EN" }, select: { name: true } } } },
      },
    }),
    prisma.service.findMany({
      where: { reviews: { some: {} } },
      select: { id: true, translations: { where: { locale: "EN" }, select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
  ]);

  return {
    page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    total,
    services: services.map((service) => ({
      id: service.id,
      name: service.translations[0]?.name ?? "Service",
    })),
    reviews: rows.map((review) => ({
      id: review.id,
      customerName: personName(review.user),
      customerEmail: review.user.email,
      serviceName: review.service.translations[0]?.name ?? "Service",
      rating: review.rating,
      comment: review.comment,
      status: review.status,
      verifiedPurchase: review.verifiedPurchase,
      createdAt: review.createdAt.toISOString(),
    })),
  };
}

export async function moderateReview(actorId: string, id: string, status: "APPROVED" | "REJECTED") {
  const current = await prisma.review.findUnique({ where: { id }, select: { id: true, status: true, serviceId: true } });

  if (!current) {
    throw new ReviewRuleError("Review not found.");
  }

  const updated = await prisma.review.update({
    where: { id },
    data: { status },
    select: { id: true, status: true },
  });

  await writeAdminAuditLog({
    actorId,
    action: status === "APPROVED" ? "review.approve" : "review.reject",
    entityType: "Review",
    entityId: id,
    beforeData: { status: current.status },
    afterData: { status: updated.status, serviceId: current.serviceId },
  });

  return updated;
}

export async function deleteReview(actorId: string, id: string) {
  const current = await prisma.review.findUnique({
    where: { id },
    select: { id: true, status: true, rating: true, serviceId: true },
  });

  if (!current) {
    throw new ReviewRuleError("Review not found.");
  }

  await prisma.review.delete({ where: { id } });
  await writeAdminAuditLog({
    actorId,
    action: "review.delete",
    entityType: "Review",
    entityId: id,
    beforeData: current,
  });
}

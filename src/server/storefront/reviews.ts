import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { readSignedInUser } from "@/server/auth/storefront-user";
import { z } from "zod";

const reviewSchema = z.object({
  serviceId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(1).max(2000),
});

export async function hasUserReview(userId: string, serviceId: string) {
  const review = await prisma.review.findUnique({
    where: { userId_serviceId: { userId, serviceId } },
    select: { id: true },
  });

  return Boolean(review);
}

export async function submitServiceReview(input: unknown) {
  const user = await readSignedInUser();

  if (!user) {
    return { ok: false as const, status: 401 };
  }

  const parsed = reviewSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false as const, status: 400 };
  }

  const service = await prisma.service.findFirst({
    where: {
      id: parsed.data.serviceId,
      isActive: true,
      publishedAt: { not: null },
      category: { isActive: true },
    },
    select: { id: true },
  });

  if (!service) {
    return { ok: false as const, status: 404 };
  }

  try {
    await prisma.review.create({
      data: {
        userId: user.id,
        serviceId: service.id,
        rating: parsed.data.rating,
        comment: parsed.data.comment,
        status: "PENDING",
        verifiedPurchase: false,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false as const, status: 409 };
    }

    throw error;
  }

  return { ok: true as const };
}

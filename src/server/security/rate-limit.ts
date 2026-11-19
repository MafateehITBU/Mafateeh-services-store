import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { createMemoryRateLimitStore, type RateLimitResult, type RateLimitStore } from "@/server/security/memory-rate-limit";

export type { RateLimitResult, RateLimitStore };
export { createMemoryRateLimitStore };

async function consumePostgres(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const now = Date.now();
  const slot = Math.floor(now / windowMs);
  const id = `${key}:${slot}`;
  const expiresAt = new Date((slot + 1) * windowMs);

  if (slot % 20 === 0) {
    await prisma.rateLimitWindow.deleteMany({ where: { expiresAt: { lt: new Date(now) } } });
  }

  try {
    const row = await prisma.rateLimitWindow.upsert({
      where: { id },
      create: { id, count: 1, expiresAt },
      update: { count: { increment: 1 } },
      select: { count: true },
    });

    return { allowed: row.count <= limit, count: row.count };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const row = await prisma.rateLimitWindow.update({
        where: { id },
        data: { count: { increment: 1 } },
        select: { count: true },
      });

      return { allowed: row.count <= limit, count: row.count };
    }

    return { allowed: false, count: limit + 1 };
  }
}

const postgresStore: RateLimitStore = {
  consume: consumePostgres,
};

let activeStore: RateLimitStore = postgresStore;

export function useRateLimitStore(store: RateLimitStore) {
  activeStore = store;
}

export async function enforceRateLimit(key: string, limit: number, windowMs: number) {
  const result = await activeStore.consume(key, limit, windowMs);
  return result.allowed;
}

export async function consumeRateLimit(key: string, limit: number, windowMs: number) {
  return activeStore.consume(key, limit, windowMs);
}

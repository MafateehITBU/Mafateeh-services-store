import "server-only";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

const sensitiveKey = /password|secret|token|otp|codehash|cvv|card|authorization|cookie/i;

export type AdminAuditInput = {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeData?: unknown;
  afterData?: unknown;
};

function scrub(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(
    JSON.stringify(value, (key, inner) => {
      if (key && sensitiveKey.test(key)) {
        return "[redacted]";
      }

      return inner;
    }),
  ) as Prisma.InputJsonValue;
}

export async function writeAdminAuditLog(input: AdminAuditInput) {
  await prisma.adminAuditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      beforeData: scrub(input.beforeData),
      afterData: scrub(input.afterData),
    },
  });
}

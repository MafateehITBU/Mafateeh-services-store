import "server-only";

import { prisma } from "@/lib/prisma";
import { readCustomerSession } from "@/server/auth/customer-session";

export async function readStorefrontCustomer() {
  try {
    const session = await readCustomerSession();

    if (!session) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true, status: true, firstName: true, profileCompletedAt: true, avatarUrl: true, sessionVersion: true },
    });

    if (!user || user.role !== "CUSTOMER" || user.status !== "ACTIVE" || user.sessionVersion !== session.sessionVersion) {
      return null;
    }

    const firstName = user.firstName?.trim() ?? "";

    return {
      id: user.id,
      firstName,
      avatarUrl: user.avatarUrl?.startsWith("data:image/") ? user.avatarUrl : null,
      needsProfile: !user.profileCompletedAt || firstName.length === 0,
    };
  } catch {
    return null;
  }
}

export async function readSignedInUser() {
  const customer = await readStorefrontCustomer();

  if (!customer) {
    return null;
  }

  return { id: customer.id };
}

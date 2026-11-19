import "server-only";

import { prisma } from "@/lib/prisma";
import { dummyPasswordHash, hashPassword, passwordNeedsRehash, verifyPassword } from "@/server/admin/password";

function isAdministrator(role: string, status: string) {
  return status === "ACTIVE" && (role === "ADMIN" || role === "SUPER_ADMIN");
}

export async function authenticateAdmin(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: {
      id: true,
      role: true,
      status: true,
      passwordHash: true,
      emailVerifiedAt: true,
      sessionVersion: true,
    },
  });

  if (!user?.passwordHash || !isAdministrator(user.role, user.status)) {
    await verifyPassword(password, await dummyPasswordHash());
    return null;
  }

  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid) {
    return null;
  }

  if (passwordNeedsRehash(user.passwordHash)) {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(password) },
    });
  }

  if (!user.emailVerifiedAt) {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    });
  }

  return { userId: user.id, sessionVersion: user.sessionVersion };
}

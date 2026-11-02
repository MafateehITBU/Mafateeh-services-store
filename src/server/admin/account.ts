import "server-only";

import { prisma } from "@/lib/prisma";
import { writeAdminAuditLog } from "@/server/admin/audit";
import { hashPassword, verifyPassword } from "@/server/admin/password";

export class AccountRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountRuleError";
  }
}

export async function getAdminAccount(id: string) {
  const user = await prisma.user.findFirst({
    where: { id, role: { in: ["ADMIN", "SUPER_ADMIN"] }, status: "ACTIVE" },
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    role: user.role,
  };
}

export async function updateAdminProfile(id: string, input: { firstName: string; lastName: string }) {
  const current = await getAdminAccount(id);

  if (!current) {
    throw new AccountRuleError("Administrator account not found.");
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { firstName: input.firstName, lastName: input.lastName },
    select: { id: true, firstName: true, lastName: true },
  });

  await writeAdminAuditLog({
    actorId: id,
    action: "account.profile",
    entityType: "User",
    entityId: id,
    beforeData: { firstName: current.firstName, lastName: current.lastName },
    afterData: { firstName: updated.firstName, lastName: updated.lastName },
  });

  return { firstName: updated.firstName ?? "", lastName: updated.lastName ?? "" };
}

export async function updateAdminEmail(id: string, email: string) {
  const nextEmail = email.trim().toLowerCase();
  const current = await getAdminAccount(id);

  if (!current) {
    throw new AccountRuleError("Administrator account not found.");
  }

  const existing = await prisma.user.findUnique({ where: { email: nextEmail }, select: { id: true } });

  if (existing && existing.id !== id) {
    throw new AccountRuleError("That email is already in use.");
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { email: nextEmail },
    select: { email: true },
  });

  await writeAdminAuditLog({
    actorId: id,
    action: "account.email",
    entityType: "User",
    entityId: id,
    beforeData: { email: current.email },
    afterData: { email: updated.email },
  });

  return { email: updated.email };
}

export async function updateAdminPassword(id: string, currentPassword: string, nextPassword: string) {
  const user = await prisma.user.findFirst({
    where: { id, role: { in: ["ADMIN", "SUPER_ADMIN"] }, status: "ACTIVE" },
    select: { id: true, passwordHash: true },
  });

  if (!user?.passwordHash) {
    throw new AccountRuleError("Administrator account not found.");
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);

  if (!valid) {
    throw new AccountRuleError("Current password is incorrect.");
  }

  await prisma.user.update({
    where: { id },
    data: { passwordHash: await hashPassword(nextPassword) },
  });

  await writeAdminAuditLog({
    actorId: id,
    action: "account.password",
    entityType: "User",
    entityId: id,
    beforeData: null,
    afterData: { changed: true },
  });
}

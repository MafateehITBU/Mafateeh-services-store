import "server-only";

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { OtpPurpose } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { readSessionSecret } from "@/lib/admin-env";
import { createCustomerSession, readCustomerSessionUserId } from "@/server/auth/customer-session";
import { sendCustomerOtpEmail } from "@/server/auth/customer-mailer";

const RESEND_MS = 60_000;
const CODE_TTL_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;

function hashCode(email: string, code: string) {
  return createHmac("sha256", readSessionSecret()).update(`customer-login:${email}:${code}`).digest("hex");
}

function codesMatch(email: string, code: string, codeHash: string) {
  const actual = Buffer.from(hashCode(email, code), "hex");
  const expected = Buffer.from(codeHash, "hex");

  if (actual.length === 0 || actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}

export async function requestCustomerCode(email: string) {
  const normalized = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email: normalized },
    select: { role: true, status: true },
  });

  if (existing && (existing.role !== "CUSTOMER" || existing.status !== "ACTIVE")) {
    return { ok: false as const, status: 400 };
  }

  const recent = await prisma.emailOtp.findFirst({
    where: {
      email: normalized,
      purpose: OtpPurpose.LOGIN,
      consumedAt: null,
      createdAt: { gt: new Date(Date.now() - RESEND_MS) },
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  if (recent) {
    return {
      ok: true as const,
      retryAfter: Math.max(1, Math.ceil((recent.createdAt.getTime() + RESEND_MS - Date.now()) / 1000)),
      resent: false,
    };
  }

  const code = randomInt(0, 10_000).toString().padStart(4, "0");
  const created = await prisma.emailOtp.create({
    data: {
      email: normalized,
      codeHash: hashCode(normalized, code),
      purpose: OtpPurpose.LOGIN,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
    select: { id: true },
  });

  try {
    await sendCustomerOtpEmail(normalized, code);
  } catch (error) {
    await prisma.emailOtp.delete({ where: { id: created.id } });
    throw error;
  }

  await prisma.emailOtp.updateMany({
    where: { email: normalized, purpose: OtpPurpose.LOGIN, consumedAt: null, id: { not: created.id } },
    data: { consumedAt: new Date() },
  });

  return { ok: true as const, retryAfter: 60, resent: true };
}

export async function verifyCustomerCode(email: string, code: string) {
  const normalized = email.trim().toLowerCase();
  const challenge = await prisma.emailOtp.findFirst({
    where: {
      email: normalized,
      purpose: OtpPurpose.LOGIN,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!challenge || challenge.failedAttempts >= MAX_ATTEMPTS || !/^\d{4}$/.test(code) || !codesMatch(normalized, code, challenge.codeHash)) {
    if (challenge && challenge.failedAttempts < MAX_ATTEMPTS) {
      await prisma.emailOtp.update({
        where: { id: challenge.id },
        data: { failedAttempts: { increment: 1 } },
      });
    }

    return { ok: false as const, status: 400 };
  }

  const consumed = await prisma.emailOtp.updateMany({
    where: { id: challenge.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  if (consumed.count !== 1) {
    return { ok: false as const, status: 400 };
  }

  const existing = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true, role: true, status: true, profileCompletedAt: true, firstName: true },
  });

  if (existing && (existing.role !== "CUSTOMER" || existing.status !== "ACTIVE")) {
    return { ok: false as const, status: 400 };
  }

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { emailVerifiedAt: new Date() },
        select: { id: true, profileCompletedAt: true, firstName: true },
      })
    : await prisma.user.create({
        data: { email: normalized, role: "CUSTOMER", emailVerifiedAt: new Date() },
        select: { id: true, profileCompletedAt: true, firstName: true },
      });

  await createCustomerSession(user.id);

  return {
    ok: true as const,
    needsProfile: !user.profileCompletedAt || !user.firstName?.trim(),
  };
}

export async function saveCustomerProfile(input: { firstName: string; lastName: string; phone: string; phoneCountry: string }) {
  const userId = await readCustomerSessionUserId();

  if (!userId) {
    return { ok: false as const, status: 401 };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, status: true },
  });

  if (!user || user.role !== "CUSTOMER" || user.status !== "ACTIVE") {
    return { ok: false as const, status: 401 };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      phoneCountry: input.phoneCountry,
      profileCompletedAt: new Date(),
    },
  });

  return { ok: true as const, firstName: input.firstName };
}

function hashEmailChange(userId: string, email: string, code: string) {
  return createHmac("sha256", readSessionSecret()).update(`customer-email-change:${userId}:${email}:${code}`).digest("hex");
}

async function requireActiveCustomer() {
  const userId = await readCustomerSessionUserId();

  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, status: true, email: true },
  });

  if (!user || user.role !== "CUSTOMER" || user.status !== "ACTIVE") {
    return null;
  }

  return user;
}

export async function requestEmailChange(nextEmail: string) {
  const user = await requireActiveCustomer();

  if (!user) {
    return { ok: false as const, status: 401, error: "unauthenticated" };
  }

  const email = nextEmail.trim().toLowerCase();

  if (email === user.email) {
    return { ok: false as const, status: 400, error: "invalid_profile" };
  }

  const taken = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  if (taken) {
    return { ok: false as const, status: 409, error: "email_taken" };
  }

  const recent = await prisma.emailOtp.findFirst({
    where: {
      email,
      purpose: OtpPurpose.CHANGE_EMAIL,
      consumedAt: null,
      createdAt: { gt: new Date(Date.now() - RESEND_MS) },
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  if (recent) {
    return {
      ok: true as const,
      retryAfter: Math.max(1, Math.ceil((recent.createdAt.getTime() + RESEND_MS - Date.now()) / 1000)),
      resent: false,
    };
  }

  const code = randomInt(0, 10_000).toString().padStart(4, "0");
  const created = await prisma.emailOtp.create({
    data: {
      email,
      codeHash: hashEmailChange(user.id, email, code),
      purpose: OtpPurpose.CHANGE_EMAIL,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
    select: { id: true },
  });

  try {
    await sendCustomerOtpEmail(email, code, "email-change");
  } catch (error) {
    await prisma.emailOtp.delete({ where: { id: created.id } });
    throw error;
  }

  await prisma.emailOtp.updateMany({
    where: { email, purpose: OtpPurpose.CHANGE_EMAIL, consumedAt: null, id: { not: created.id } },
    data: { consumedAt: new Date() },
  });

  return { ok: true as const, retryAfter: 60, resent: true };
}

export async function confirmEmailChange(nextEmail: string, code: string) {
  const user = await requireActiveCustomer();

  if (!user) {
    return { ok: false as const, status: 401, error: "unauthenticated" };
  }

  const email = nextEmail.trim().toLowerCase();
  const challenge = await prisma.emailOtp.findFirst({
    where: {
      email,
      purpose: OtpPurpose.CHANGE_EMAIL,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  const expected = Buffer.from(hashEmailChange(user.id, email, code), "hex");
  const actual = Buffer.from(challenge?.codeHash ?? "", "hex");
  const matches = challenge && /^\d{4}$/.test(code) && actual.length === expected.length && timingSafeEqual(actual, expected);

  if (!challenge || challenge.failedAttempts >= MAX_ATTEMPTS || !matches) {
    if (challenge && challenge.failedAttempts < MAX_ATTEMPTS) {
      await prisma.emailOtp.update({
        where: { id: challenge.id },
        data: { failedAttempts: { increment: 1 } },
      });
    }

    return { ok: false as const, status: 400, error: "invalid_code" };
  }

  const consumed = await prisma.emailOtp.updateMany({
    where: { id: challenge.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  if (consumed.count !== 1) {
    return { ok: false as const, status: 400, error: "invalid_code" };
  }

  const taken = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  if (taken && taken.id !== user.id) {
    return { ok: false as const, status: 409, error: "email_taken" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { email, emailVerifiedAt: new Date() },
  });

  return { ok: true as const, email };
}

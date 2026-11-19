import "server-only";

import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { OtpPurpose } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { readSessionSecret } from "@/lib/admin-env";
import { createCustomerSession, readCustomerSession } from "@/server/auth/customer-session";
import { sendCustomerOtpEmail } from "@/server/auth/customer-mailer";
import { derivedSecret } from "@/server/security/session-keys";

const RESEND_MS = 60_000;
const CODE_TTL_MS = 5 * 60_000;
const FAILURE_WINDOW_MS = 15 * 60_000;
const REQUEST_WINDOW_MS = 60 * 60_000;
const CLEANUP_AGE_MS = 24 * 60 * 60_000;
const MAX_ATTEMPTS = 5;
const MAX_REQUESTS_PER_HOUR = 5;
const CODE_SPACE = 1_000_000;

async function otpKey() {
  return Buffer.from(await derivedSecret(readSessionSecret(), "otp"));
}

async function hashCode(email: string, code: string) {
  return createHmac("sha256", await otpKey()).update(`customer-login:${email}:${code}`).digest("hex");
}

async function hashEmailChange(userId: string, email: string, code: string) {
  return createHmac("sha256", await otpKey()).update(`customer-email-change:${userId}:${email}:${code}`).digest("hex");
}

function codesMatch(actualHash: string, expectedHash: string) {
  const actual = Buffer.from(actualHash, "hex");
  const expected = Buffer.from(expectedHash, "hex");

  if (actual.length === 0 || actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}

function sixDigitCode() {
  return randomInt(0, CODE_SPACE).toString().padStart(6, "0");
}

function decoyHash(prefix: string, key: Buffer) {
  return createHmac("sha256", key).update(`${prefix}:${randomBytes(16).toString("hex")}`).digest("hex");
}

export async function purgeExpiredEmailOtps() {
  const cutoff = new Date(Date.now() - CLEANUP_AGE_MS);

  await prisma.emailOtp.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: cutoff } },
        { consumedAt: { not: null }, createdAt: { lt: cutoff } },
      ],
    },
  });
}

async function requestCount(email: string) {
  return prisma.emailOtp.count({
    where: { email, createdAt: { gt: new Date(Date.now() - REQUEST_WINDOW_MS) } },
  });
}

async function failureCount(email: string) {
  const total = await prisma.emailOtp.aggregate({
    where: { email, createdAt: { gt: new Date(Date.now() - FAILURE_WINDOW_MS) } },
    _sum: { failedAttempts: true },
  });

  return total._sum.failedAttempts ?? 0;
}

async function burnAttempt(id: string) {
  return prisma.emailOtp.updateMany({
    where: { id, consumedAt: null, failedAttempts: { lt: MAX_ATTEMPTS } },
    data: { failedAttempts: { increment: 1 } },
  });
}

function cooldown(createdAt: Date, windowMs: number) {
  return {
    ok: true as const,
    retryAfter: Math.max(1, Math.ceil((createdAt.getTime() + windowMs - Date.now()) / 1000)),
    resent: false,
  };
}

export async function requestCustomerCode(email: string) {
  const normalized = email.trim().toLowerCase();
  await purgeExpiredEmailOtps();

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
    return cooldown(recent.createdAt, RESEND_MS);
  }

  if ((await requestCount(normalized)) >= MAX_REQUESTS_PER_HOUR) {
    const oldest = await prisma.emailOtp.findFirst({
      where: { email: normalized, createdAt: { gt: new Date(Date.now() - REQUEST_WINDOW_MS) } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });

    return cooldown(oldest?.createdAt ?? new Date(), REQUEST_WINDOW_MS);
  }

  const existing = await prisma.user.findUnique({
    where: { email: normalized },
    select: { role: true, status: true },
  });
  const canDeliver = !existing || (existing.role === "CUSTOMER" && existing.status === "ACTIVE");
  const code = canDeliver ? sixDigitCode() : null;
  const key = await otpKey();
  const created = await prisma.emailOtp.create({
    data: {
      email: normalized,
      codeHash: code ? await hashCode(normalized, code) : decoyHash(`customer-login:${normalized}`, key),
      purpose: OtpPurpose.LOGIN,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
    select: { id: true },
  });

  if (code) {
    try {
      await sendCustomerOtpEmail(normalized, code);
    } catch (error) {
      await prisma.emailOtp.delete({ where: { id: created.id } });
      throw error;
    }
  }

  await prisma.emailOtp.updateMany({
    where: { email: normalized, purpose: OtpPurpose.LOGIN, consumedAt: null, id: { not: created.id } },
    data: { consumedAt: new Date() },
  });

  return { ok: true as const, retryAfter: 60, resent: true };
}

export async function verifyCustomerCode(email: string, code: string) {
  const normalized = email.trim().toLowerCase();
  await purgeExpiredEmailOtps();
  const challenge = await prisma.emailOtp.findFirst({
    where: {
      email: normalized,
      purpose: OtpPurpose.LOGIN,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!challenge || (await failureCount(normalized)) >= MAX_ATTEMPTS) {
    return { ok: false as const, status: 400 };
  }

  const burned = await burnAttempt(challenge.id);

  if (burned.count !== 1 || !/^\d{6}$/.test(code) || !codesMatch(await hashCode(normalized, code), challenge.codeHash)) {
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
    select: { id: true, role: true, status: true, profileCompletedAt: true, firstName: true, sessionVersion: true },
  });

  if (existing && (existing.role !== "CUSTOMER" || existing.status !== "ACTIVE")) {
    return { ok: false as const, status: 400 };
  }

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { emailVerifiedAt: new Date() },
        select: { id: true, profileCompletedAt: true, firstName: true, sessionVersion: true },
      })
    : await prisma.user.create({
        data: { email: normalized, role: "CUSTOMER", emailVerifiedAt: new Date() },
        select: { id: true, profileCompletedAt: true, firstName: true, sessionVersion: true },
      });

  await createCustomerSession(user.id, user.sessionVersion);

  return {
    ok: true as const,
    needsProfile: !user.profileCompletedAt || !user.firstName?.trim(),
  };
}

export async function saveCustomerProfile(input: { firstName: string; lastName: string; phone: string; phoneCountry: string }) {
  const session = await readCustomerSession();

  if (!session) {
    return { ok: false as const, status: 401 };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, status: true, sessionVersion: true },
  });

  if (!user || user.role !== "CUSTOMER" || user.status !== "ACTIVE" || user.sessionVersion !== session.sessionVersion) {
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

async function requireActiveCustomer() {
  const session = await readCustomerSession();

  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, status: true, email: true, sessionVersion: true },
  });

  if (!user || user.role !== "CUSTOMER" || user.status !== "ACTIVE" || user.sessionVersion !== session.sessionVersion) {
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

  await purgeExpiredEmailOtps();

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
    return cooldown(recent.createdAt, RESEND_MS);
  }

  if ((await requestCount(email)) >= MAX_REQUESTS_PER_HOUR) {
    const oldest = await prisma.emailOtp.findFirst({
      where: { email, createdAt: { gt: new Date(Date.now() - REQUEST_WINDOW_MS) } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });

    return cooldown(oldest?.createdAt ?? new Date(), REQUEST_WINDOW_MS);
  }

  const taken = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  const code = taken ? null : sixDigitCode();
  const key = await otpKey();
  const created = await prisma.emailOtp.create({
    data: {
      email,
      codeHash: code ? await hashEmailChange(user.id, email, code) : decoyHash(`customer-email-change:${user.id}:${email}`, key),
      purpose: OtpPurpose.CHANGE_EMAIL,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
    select: { id: true },
  });

  if (code) {
    try {
      await sendCustomerOtpEmail(email, code, "email-change");
    } catch (error) {
      await prisma.emailOtp.delete({ where: { id: created.id } });
      throw error;
    }
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
  await purgeExpiredEmailOtps();
  const challenge = await prisma.emailOtp.findFirst({
    where: {
      email,
      purpose: OtpPurpose.CHANGE_EMAIL,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!challenge || (await failureCount(email)) >= MAX_ATTEMPTS) {
    return { ok: false as const, status: 400, error: "invalid_code" };
  }

  const burned = await burnAttempt(challenge.id);
  const matches = /^\d{6}$/.test(code) && codesMatch(await hashEmailChange(user.id, email, code), challenge.codeHash);

  if (burned.count !== 1 || !matches) {
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
    return { ok: false as const, status: 400, error: "invalid_code" };
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { email, emailVerifiedAt: new Date(), sessionVersion: { increment: 1 } },
    select: { sessionVersion: true },
  });
  await createCustomerSession(user.id, updated.sessionVersion);

  return { ok: true as const, email };
}

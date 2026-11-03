import "server-only";

import { z } from "zod";

export class AdminConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminConfigError";
  }
}

const sessionSchema = z.object({
  SESSION_SECRET: z.string().trim().min(32),
});

const mailboxSchema = z.string().trim().min(1).refine((value) => {
  const wrapped = value.match(/<([^>]+)>/);
  const email = (wrapped?.[1] ?? value).trim();
  return z.string().email().safeParse(email).success;
}, "Enter a mailbox such as name@example.com or Name <name@example.com>.");

const deliverySchema = sessionSchema.extend({
  SMTP_HOST: z.string().trim().min(1),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535),
  SMTP_USER: z.string().trim().min(1),
  SMTP_PASS: z.string().min(1),
  SMTP_FROM: mailboxSchema,
});

export type AdminDeliveryConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
  sessionSecret: string;
};

function missingNames(issues: { path: PropertyKey[] }[]) {
  return [...new Set(issues.map((issue) => issue.path.join(".")).filter(Boolean))];
}

export function readSessionSecret() {
  const parsed = sessionSchema.safeParse({
    SESSION_SECRET: process.env.SESSION_SECRET,
  });

  if (!parsed.success) {
    throw new AdminConfigError(
      "Admin authentication is not configured. Set SESSION_SECRET to at least 32 characters.",
    );
  }

  return parsed.data.SESSION_SECRET;
}

export function readAdminDeliveryConfig(): AdminDeliveryConfig {
  const parsed = deliverySchema.safeParse({
    SESSION_SECRET: process.env.SESSION_SECRET,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS || process.env.SMTP_PASSWORD,
    SMTP_FROM: process.env.SMTP_FROM,
  });

  if (!parsed.success) {
    const names = missingNames(parsed.error.issues);
    throw new AdminConfigError(
      names.length > 0
        ? `Admin email delivery is not configured. Set ${names.join(", ")}.`
        : "Admin email delivery is not configured.",
    );
  }

  return {
    host: parsed.data.SMTP_HOST,
    port: parsed.data.SMTP_PORT,
    user: parsed.data.SMTP_USER,
    password: parsed.data.SMTP_PASS,
    from: parsed.data.SMTP_FROM,
    sessionSecret: parsed.data.SESSION_SECRET,
  };
}

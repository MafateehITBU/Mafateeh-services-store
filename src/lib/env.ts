import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z
    .string()
    .min(1)
    .refine(
      (value) =>
        value.startsWith("postgresql://") || value.startsWith("postgres://"),
      "DATABASE_URL must start with postgresql:// or postgres://",
    ),
  SITE_URL: z.string().url(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function readServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    SITE_URL: process.env.SITE_URL,
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => {
        const path = issue.path.join(".");
        return path ? `${path}: ${issue.message}` : issue.message;
      })
      .join("; ");

    throw new Error(`Invalid server environment: ${details}`);
  }

  return parsed.data;
}

export function validateProductionEnv() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const parsed = z
    .object({
      DATABASE_URL: serverEnvSchema.shape.DATABASE_URL,
      SESSION_SECRET: z.string().trim().min(32),
      SITE_URL: z.string().url(),
      SMTP_HOST: z.string().trim().min(1),
      SMTP_PORT: z.coerce.number().int().min(1).max(65535),
      SMTP_USER: z.string().trim().min(1),
      SMTP_PASS: z.string().min(1),
      SMTP_FROM: z.string().trim().min(3),
    })
    .safeParse({
      DATABASE_URL: process.env.DATABASE_URL,
      SESSION_SECRET: process.env.SESSION_SECRET,
      SITE_URL: process.env.SITE_URL,
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS || process.env.SMTP_PASSWORD,
      SMTP_FROM: process.env.SMTP_FROM,
    });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => issue.path.join("."))
      .filter(Boolean)
      .join(", ");
    throw new Error(`Invalid production environment: ${details}`);
  }
}

export function absoluteUrl(path: string) {
  return new URL(path, env.SITE_URL).toString();
}

export const env = readServerEnv();

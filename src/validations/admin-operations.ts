import { z } from "zod";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const reviewStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export const customerStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "DEACTIVATED"]),
});

export const orderStatusSchema = z.object({
  status: z.enum(["PENDING_PAYMENT", "PAID", "PROCESSING", "COMPLETED", "CANCELLED", "REFUNDED"]),
});

export const adminProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
});

export const adminEmailSchema = z.object({
  email: z.string().trim().email().max(254),
  currentPassword: z.string().min(1).max(200),
});

export const newPasswordSchema = z.string().min(12).max(200);

export const adminPasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  nextPassword: newPasswordSchema,
});

export function optionalDay(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = day.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function dayRange(from?: string, to?: string) {
  if (!from && !to) {
    return undefined;
  }

  return {
    gte: from ? new Date(`${from}T00:00:00.000Z`) : undefined,
    lte: to ? new Date(`${to}T23:59:59.999Z`) : undefined,
  };
}

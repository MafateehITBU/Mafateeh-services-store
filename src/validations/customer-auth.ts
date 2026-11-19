import { findCountry, isValidNationalNumber } from "@/lib/countries";
import { z } from "zod";

export { isValidNationalNumber, normalizeNationalNumber } from "@/lib/countries";

const imageDataUrl = z
  .string()
  .trim()
  .max(7_000_000)
  .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/);

export const customerEmailSchema = z.object({
  email: z.string().trim().email().max(254),
});

export const CUSTOMER_OTP_LENGTH = 6;

export function emptyOtpDigits() {
  return Array.from({ length: CUSTOMER_OTP_LENGTH }, () => "");
}

export const customerCodeSchema = z.object({
  email: z.string().trim().email().max(254),
  code: z.string().regex(/^\d{6}$/),
});

function withPhone<T extends { countryIso: string; phone: string }>(value: T, context: z.RefinementCtx) {
  if (!findCountry(value.countryIso) || !isValidNationalNumber(value.countryIso, value.phone)) {
    context.addIssue({ code: "custom", path: ["phone"], message: "invalid_phone" });
  }
}

export const customerProfileSchema = z
  .object({
    firstName: z.string().trim().min(1).max(60),
    lastName: z.string().trim().min(1).max(60),
    countryIso: z.string().trim().toUpperCase().length(2),
    phone: z.string().trim(),
  })
  .superRefine(withPhone);

export const customerAccountSchema = z
  .object({
    firstName: z.string().trim().min(1).max(60),
    lastName: z.string().trim().min(1).max(60),
    email: z.string().trim().email().max(254),
    countryIso: z.string().trim().toUpperCase().length(2),
    phone: z.string().trim(),
    avatar: imageDataUrl.optional(),
  })
  .superRefine(withPhone);

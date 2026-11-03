import { z } from "zod";

export const countryCodes = ["+966", "+962", "+971", "+965", "+974", "+973", "+968", "+20", "+961", "+970", "+1", "+44"] as const;

const nationalPatterns: Record<(typeof countryCodes)[number], RegExp> = {
  "+966": /^5\d{8}$/,
  "+962": /^7\d{8}$/,
  "+971": /^5\d{8}$/,
  "+965": /^[569]\d{7}$/,
  "+974": /^[3567]\d{7}$/,
  "+973": /^[36]\d{7}$/,
  "+968": /^[79]\d{7}$/,
  "+20": /^1\d{9}$/,
  "+961": /^[37]\d{6,7}$/,
  "+970": /^5\d{8}$/,
  "+1": /^[2-9]\d{9}$/,
  "+44": /^7\d{9}$/,
};

export function normalizeNationalNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("0") ? digits.slice(1) : digits;
}

export function isValidNationalNumber(countryCode: string, value: string) {
  const pattern = nationalPatterns[countryCode as (typeof countryCodes)[number]];
  return Boolean(pattern?.test(normalizeNationalNumber(value)));
}

export const customerEmailSchema = z.object({
  email: z.string().trim().email().max(254),
});

export const customerCodeSchema = z.object({
  email: z.string().trim().email().max(254),
  code: z.string().regex(/^\d{4}$/),
});

export const customerProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  countryCode: z.enum(countryCodes),
  phone: z.string().trim(),
}).superRefine((value, context) => {
  if (!isValidNationalNumber(value.countryCode, value.phone)) {
    context.addIssue({ code: "custom", path: ["phone"], message: "invalid_phone" });
  }
});

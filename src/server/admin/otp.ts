import "server-only";

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

const OTP_SPACE = 1_000_000;

export function generateOtpCode() {
  return randomInt(0, OTP_SPACE).toString().padStart(6, "0");
}

export function hashOtpCode(code: string, email: string, secret: string) {
  return createHmac("sha256", secret)
    .update(`admin-login:${email}:${code}`)
    .digest("hex");
}

export function otpMatches(code: string, email: string, codeHash: string, secret: string) {
  const actual = hashOtpCode(code, email, secret);
  const left = Buffer.from(actual, "hex");
  const right = Buffer.from(codeHash, "hex");

  if (left.length === 0 || left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

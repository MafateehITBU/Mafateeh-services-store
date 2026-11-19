import "server-only";

import { clientAddress } from "@/server/admin/http";
import { enforceRateLimit } from "@/server/admin/rate-limit";

const WINDOW_MS = 15 * 60 * 1000;

const limits = {
  "auth-email": 10,
  "auth-verify": 30,
  "auth-profile": 20,
  account: 30,
  "account-email": 10,
  reviews: 10,
  wishlist: 60,
} as const;

export type CustomerLimitScope = keyof typeof limits;

export async function customerIpAllowed(request: Request, scope: CustomerLimitScope) {
  return enforceRateLimit(`customer:${scope}:${clientAddress(request)}`, limits[scope], WINDOW_MS);
}

export function customerRateLimited() {
  return Response.json({ error: "rate_limited" }, { status: 429 });
}

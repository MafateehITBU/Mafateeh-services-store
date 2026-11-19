import { JSON_AUTH_BYTES, readJsonCapped } from "@/server/security/read-body";
import { assertSameOrigin } from "@/server/security/same-origin";
import { customerIpAllowed, customerRateLimited } from "@/server/auth/request-limit";
import { listWishlistIds, toggleWishlist } from "@/server/storefront/account";
import { z } from "zod";

export async function GET(request: Request) {
  if (!(await customerIpAllowed(request, "wishlist"))) {
    return customerRateLimited();
  }

  return Response.json({ ids: await listWishlistIds() });
}

export async function POST(request: Request) {
  const originBlock = assertSameOrigin(request);
  if (originBlock) return originBlock;
  const incoming = await readJsonCapped(request, JSON_AUTH_BYTES);
  if (incoming instanceof Response) return incoming;
  if (!(await customerIpAllowed(request, "wishlist"))) {
    return customerRateLimited();
  }

  const parsed = z.object({ serviceId: z.string().uuid() }).safeParse(incoming.json);

  if (!parsed.success) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }

  const result = await toggleWishlist(parsed.data.serviceId);

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({ saved: result.saved });
}

import { listWishlistIds, toggleWishlist } from "@/server/storefront/account";
import { z } from "zod";

export async function GET() {
  return Response.json({ ids: await listWishlistIds() });
}

export async function POST(request: Request) {
  const parsed = z.object({ serviceId: z.string().uuid() }).safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }

  const result = await toggleWishlist(parsed.data.serviceId);

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({ saved: result.saved });
}

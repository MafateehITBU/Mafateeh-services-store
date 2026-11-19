import { JSON_AUTH_BYTES, readJsonCapped } from "@/server/security/read-body";
import { assertSameOrigin } from "@/server/security/same-origin";
import { customerIpAllowed, customerRateLimited } from "@/server/auth/request-limit";
import { submitServiceReview } from "@/server/storefront/reviews";

export async function POST(request: Request) {
  const originBlock = assertSameOrigin(request);
  if (originBlock) return originBlock;
  const incoming = await readJsonCapped(request, JSON_AUTH_BYTES);
  if (incoming instanceof Response) return incoming;
  if (!(await customerIpAllowed(request, "reviews"))) {
    return customerRateLimited();
  }

  try {
    const result = await submitServiceReview(incoming.json);

    if (!result.ok) {
      return Response.json({ error: "review_rejected" }, { status: result.status });
    }

    return Response.json({ status: "submitted" });
  } catch (error) {
    console.error("review_submit_failed", error instanceof Error ? error.name : "unknown");
    return Response.json({ error: "review_failed" }, { status: 500 });
  }
}

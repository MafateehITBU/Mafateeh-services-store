import { customerIpAllowed, customerRateLimited } from "@/server/auth/request-limit";
import { submitServiceReview } from "@/server/storefront/reviews";

export async function POST(request: Request) {
  if (!customerIpAllowed(request, "reviews")) {
    return customerRateLimited();
  }

  try {
    const result = await submitServiceReview(await request.json().catch(() => null));

    if (!result.ok) {
      return Response.json({ error: "review_rejected" }, { status: result.status });
    }

    return Response.json({ status: "submitted" });
  } catch (error) {
    console.error("review_submit_failed", error instanceof Error ? error.name : "unknown");
    return Response.json({ error: "review_failed" }, { status: 500 });
  }
}

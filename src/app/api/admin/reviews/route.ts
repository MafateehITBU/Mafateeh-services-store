import { adminAccessResponse, requireAdmin } from "@/server/admin/authorization";
import { listAdminReviews, ReviewRuleError } from "@/server/admin/reviews";
import { optionalDay } from "@/validations/admin-operations";
import type { ReviewStatus } from "@/generated/prisma/client";

const statuses = new Set<ReviewStatus>(["PENDING", "APPROVED", "REJECTED"]);

function ruleResponse(error: unknown) {
  if (error instanceof ReviewRuleError) {
    return Response.json({ error: "review_rule", message: error.message }, { status: 400 });
  }

  console.error("review_request_failed", error instanceof Error ? error.name : "unknown");
  return Response.json({ error: "request_failed", message: "The request could not be completed." }, { status: 500 });
}

export async function GET(request: Request) {
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const rating = Number(url.searchParams.get("rating"));

  try {
    return Response.json(
      await listAdminReviews({
        q: url.searchParams.get("q")?.trim() || undefined,
        status: status && statuses.has(status as ReviewStatus) ? (status as ReviewStatus) : undefined,
        rating: rating >= 1 && rating <= 5 ? rating : undefined,
        serviceId: url.searchParams.get("serviceId") || undefined,
        from: optionalDay(url.searchParams.get("from")),
        to: optionalDay(url.searchParams.get("to")),
        page: Number(url.searchParams.get("page")) || 1,
      }),
    );
  } catch (error) {
    return ruleResponse(error);
  }
}

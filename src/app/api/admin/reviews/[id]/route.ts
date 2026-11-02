import { adminAccessResponse, requireAdmin } from "@/server/admin/authorization";
import { deleteReview, moderateReview, ReviewRuleError } from "@/server/admin/reviews";
import { reviewStatusSchema } from "@/validations/admin-operations";

function ruleResponse(error: unknown) {
  if (error instanceof ReviewRuleError) {
    const status = /not found/i.test(error.message) ? 404 : 400;
    return Response.json({ error: "review_rule", message: error.message }, { status });
  }

  console.error("review_request_failed", error instanceof Error ? error.name : "unknown");
  return Response.json({ error: "request_failed", message: "The request could not be completed." }, { status: 500 });
}

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  const parsed = reviewStatusSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return Response.json({ error: "invalid_request", message: "Choose approve or reject." }, { status: 400 });
  }

  try {
    return Response.json(await moderateReview(access.user.id, (await context.params).id, parsed.data.status));
  } catch (error) {
    return ruleResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  try {
    await deleteReview(access.user.id, (await context.params).id);
    return Response.json({ status: "deleted" });
  } catch (error) {
    return ruleResponse(error);
  }
}

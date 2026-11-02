import { adminAccessResponse, requireAdmin } from "@/server/admin/authorization";
import { CategoryRuleError, setCategoryStatus } from "@/server/admin/categories";
import { categoryStatusSchema } from "@/validations/category";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  const parsed = categoryStatusSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return Response.json({ error: "invalid_request", message: "The status could not be updated." }, { status: 400 });
  }

  try {
    await setCategoryStatus(access.user.id, (await context.params).id, parsed.data.isActive);
    return Response.json({ status: "updated" });
  } catch (error) {
    if (error instanceof CategoryRuleError) {
      return Response.json({ error: error.code, message: error.message }, { status: error.status });
    }

    console.error("category_request_failed");
    return Response.json({ error: "request_failed", message: "The request could not be completed." }, { status: 500 });
  }
}

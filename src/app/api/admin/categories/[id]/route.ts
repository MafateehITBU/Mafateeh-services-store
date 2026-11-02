import { adminAccessResponse, requireAdmin } from "@/server/admin/authorization";
import { CategoryRuleError, deleteCategory, getCategory, updateCategory } from "@/server/admin/categories";
import { categoryInputSchema } from "@/validations/category";

function ruleResponse(error: unknown) {
  if (error instanceof CategoryRuleError) {
    return Response.json({ error: error.code, message: error.message }, { status: error.status });
  }

  console.error("category_request_failed");
  return Response.json({ error: "request_failed", message: "The request could not be completed." }, { status: 500 });
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  try {
    return Response.json(await getCategory((await context.params).id));
  } catch (error) {
    return ruleResponse(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  const parsed = categoryInputSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return Response.json({ error: "invalid_request", message: "Check the category fields and try again." }, { status: 400 });
  }

  try {
    return Response.json(await updateCategory(access.user.id, (await context.params).id, parsed.data));
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
    await deleteCategory(access.user.id, (await context.params).id);
    return Response.json({ status: "deleted" });
  } catch (error) {
    return ruleResponse(error);
  }
}

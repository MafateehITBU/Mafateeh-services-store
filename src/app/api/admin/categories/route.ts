import { adminAccessResponse, requireAdmin } from "@/server/admin/authorization";
import { CategoryRuleError, createCategory, listCategories } from "@/server/admin/categories";
import { categoryInputSchema, categoryListSchema } from "@/validations/category";

function ruleResponse(error: unknown) {
  if (error instanceof CategoryRuleError) {
    return Response.json({ error: error.code, message: error.message }, { status: error.status });
  }

  console.error("category_request_failed");
  return Response.json({ error: "request_failed", message: "The request could not be completed." }, { status: 500 });
}

export async function GET(request: Request) {
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  const url = new URL(request.url);
  const parsed = categoryListSchema.safeParse(Object.fromEntries(url.searchParams.entries()));

  if (!parsed.success) {
    return Response.json({ error: "invalid_request", message: "Check the filters and try again." }, { status: 400 });
  }

  try {
    return Response.json(await listCategories(parsed.data));
  } catch (error) {
    return ruleResponse(error);
  }
}

export async function POST(request: Request) {
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  const parsed = categoryInputSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return Response.json({ error: "invalid_request", message: "Check the category fields and try again." }, { status: 400 });
  }

  try {
    return Response.json(await createCategory(access.user.id, parsed.data), { status: 201 });
  } catch (error) {
    return ruleResponse(error);
  }
}

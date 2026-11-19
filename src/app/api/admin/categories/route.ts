import { JSON_IMAGE_BYTES, readJsonCapped } from "@/server/security/read-body";
import { assertSameOrigin } from "@/server/security/same-origin";
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
  const originBlock = assertSameOrigin(request);
  if (originBlock) return originBlock;
  const incoming = await readJsonCapped(request, JSON_IMAGE_BYTES);
  if (incoming instanceof Response) return incoming;
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  const parsed = categoryInputSchema.safeParse(incoming.json);

  if (!parsed.success) {
    return Response.json({ error: "invalid_request", message: "Check the category fields and try again." }, { status: 400 });
  }

  try {
    return Response.json(await createCategory(access.user.id, parsed.data), { status: 201 });
  } catch (error) {
    return ruleResponse(error);
  }
}

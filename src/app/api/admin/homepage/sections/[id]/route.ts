import { JSON_FORM_BYTES, readJsonCapped } from "@/server/security/read-body";
import { assertSameOrigin } from "@/server/security/same-origin";
import { homepageErrorResponse, invalidHomepage } from "@/app/api/admin/homepage/http";
import { adminAccessResponse, requireAdmin } from "@/server/admin/authorization";
import { deleteSection, updateSection } from "@/server/admin/homepage";
import { sectionInputSchema } from "@/validations/homepage";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const originBlock = assertSameOrigin(request);
  if (originBlock) return originBlock;
  const incoming = await readJsonCapped(request, JSON_FORM_BYTES);
  if (incoming instanceof Response) return incoming;
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  const parsed = sectionInputSchema.safeParse(incoming.json);

  if (!parsed.success) {
    return invalidHomepage(parsed.error);
  }

  try {
    return Response.json(await updateSection(access.user.id, (await context.params).id, parsed.data));
  } catch (error) {
    return homepageErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const originBlock = assertSameOrigin(request);
  if (originBlock) return originBlock;
  const incoming = await readJsonCapped(request, JSON_FORM_BYTES);
  if (incoming instanceof Response) return incoming;
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  try {
    await deleteSection(access.user.id, (await context.params).id);
    return Response.json({ status: "deleted" });
  } catch (error) {
    return homepageErrorResponse(error);
  }
}

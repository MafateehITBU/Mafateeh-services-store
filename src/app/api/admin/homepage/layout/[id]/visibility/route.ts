import { JSON_FORM_BYTES, readJsonCapped } from "@/server/security/read-body";
import { assertSameOrigin } from "@/server/security/same-origin";
import { homepageErrorResponse, invalidHomepage } from "@/app/api/admin/homepage/http";
import { adminAccessResponse, requireAdmin } from "@/server/admin/authorization";
import { setLayoutVisibility } from "@/server/admin/homepage";
import { layoutVisibilitySchema } from "@/validations/homepage";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const originBlock = assertSameOrigin(request);
  if (originBlock) return originBlock;
  const incoming = await readJsonCapped(request, JSON_FORM_BYTES);
  if (incoming instanceof Response) return incoming;
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  const parsed = layoutVisibilitySchema.safeParse(incoming.json);

  if (!parsed.success) {
    return invalidHomepage(parsed.error);
  }

  const { id } = await context.params;

  try {
    return Response.json(await setLayoutVisibility(access.user.id, id, parsed.data.isVisible));
  } catch (error) {
    return homepageErrorResponse(error);
  }
}

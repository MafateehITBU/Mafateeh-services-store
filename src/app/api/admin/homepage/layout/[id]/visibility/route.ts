import { homepageErrorResponse, invalidHomepage } from "@/app/api/admin/homepage/http";
import { adminAccessResponse, requireAdmin } from "@/server/admin/authorization";
import { setLayoutVisibility } from "@/server/admin/homepage";
import { layoutVisibilitySchema } from "@/validations/homepage";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  const parsed = layoutVisibilitySchema.safeParse(await request.json().catch(() => null));

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

import { homepageErrorResponse, invalidHomepage } from "@/app/api/admin/homepage/http";
import { adminAccessResponse, requireAdmin } from "@/server/admin/authorization";
import { setBannerStatus } from "@/server/admin/homepage";
import { activeStatusSchema } from "@/validations/homepage";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  const parsed = activeStatusSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return invalidHomepage(parsed.error);
  }

  try {
    return Response.json(await setBannerStatus(access.user.id, (await context.params).id, parsed.data.isActive));
  } catch (error) {
    return homepageErrorResponse(error);
  }
}

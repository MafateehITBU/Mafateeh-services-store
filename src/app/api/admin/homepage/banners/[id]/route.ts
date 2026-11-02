import { homepageErrorResponse, invalidHomepage } from "@/app/api/admin/homepage/http";
import { adminAccessResponse, requireAdmin } from "@/server/admin/authorization";
import { deleteBanner, updateBanner } from "@/server/admin/homepage";
import { bannerInputSchema } from "@/validations/homepage";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  const parsed = bannerInputSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return invalidHomepage(parsed.error);
  }

  try {
    return Response.json(await updateBanner(access.user.id, (await context.params).id, parsed.data));
  } catch (error) {
    return homepageErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  try {
    await deleteBanner(access.user.id, (await context.params).id);
    return Response.json({ status: "deleted" });
  } catch (error) {
    return homepageErrorResponse(error);
  }
}

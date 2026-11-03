import { homepageErrorResponse, invalidHomepage } from "@/app/api/admin/homepage/http";
import { adminAccessResponse, requireAdmin } from "@/server/admin/authorization";
import { reorderLayout } from "@/server/admin/homepage";
import { reorderSchema } from "@/validations/homepage";

export async function PATCH(request: Request) {
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  const parsed = reorderSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return invalidHomepage(parsed.error);
  }

  try {
    await reorderLayout(access.user.id, parsed.data.ids);
    return Response.json({ status: "reordered" });
  } catch (error) {
    return homepageErrorResponse(error);
  }
}

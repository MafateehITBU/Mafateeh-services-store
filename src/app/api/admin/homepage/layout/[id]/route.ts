import { homepageErrorResponse } from "@/app/api/admin/homepage/http";
import { adminAccessResponse, requireAdmin } from "@/server/admin/authorization";
import { deleteLayoutItem } from "@/server/admin/homepage";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  const { id } = await context.params;

  try {
    await deleteLayoutItem(access.user.id, id);
    return Response.json({ status: "deleted" });
  } catch (error) {
    return homepageErrorResponse(error);
  }
}

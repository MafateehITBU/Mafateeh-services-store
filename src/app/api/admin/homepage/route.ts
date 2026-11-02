import { homepageErrorResponse } from "@/app/api/admin/homepage/http";
import { adminAccessResponse, requireAdmin } from "@/server/admin/authorization";
import { getHomepageAdmin } from "@/server/admin/homepage";

export async function GET() {
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  try {
    return Response.json(await getHomepageAdmin());
  } catch (error) {
    return homepageErrorResponse(error);
  }
}

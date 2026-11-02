import { homepageErrorResponse, invalidHomepage } from "@/app/api/admin/homepage/http";
import { adminAccessResponse, requireAdmin } from "@/server/admin/authorization";
import { createBanner } from "@/server/admin/homepage";
import { bannerInputSchema } from "@/validations/homepage";

export async function POST(request: Request) {
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  const parsed = bannerInputSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return invalidHomepage(parsed.error);
  }

  try {
    return Response.json(await createBanner(access.user.id, parsed.data), { status: 201 });
  } catch (error) {
    return homepageErrorResponse(error);
  }
}

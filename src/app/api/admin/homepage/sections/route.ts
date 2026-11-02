import { homepageErrorResponse, invalidHomepage } from "@/app/api/admin/homepage/http";
import { adminAccessResponse, requireAdmin } from "@/server/admin/authorization";
import { createSection } from "@/server/admin/homepage";
import { sectionInputSchema } from "@/validations/homepage";

export async function POST(request: Request) {
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  const parsed = sectionInputSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return invalidHomepage(parsed.error);
  }

  try {
    return Response.json(await createSection(access.user.id, parsed.data), { status: 201 });
  } catch (error) {
    return homepageErrorResponse(error);
  }
}

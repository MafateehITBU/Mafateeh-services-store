import { homepageErrorResponse, invalidHomepage } from "@/app/api/admin/homepage/http";
import { adminAccessResponse, requireAdmin } from "@/server/admin/authorization";
import { reorderBanners } from "@/server/admin/homepage";
import { reorderSchema } from "@/validations/homepage";
import { z } from "zod";

const bodySchema = reorderSchema.extend({ placement: z.enum(["HOME_HERO", "HOME_PROMO"]) });

export async function PATCH(request: Request) {
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return invalidHomepage(parsed.error);
  }

  try {
    await reorderBanners(access.user.id, parsed.data.placement, parsed.data.ids);
    return Response.json({ status: "reordered" });
  } catch (error) {
    return homepageErrorResponse(error);
  }
}

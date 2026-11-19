import { assertSameOrigin } from "@/server/security/same-origin";
import { clearAdminSession } from "@/server/admin/session";
import { adminFailureResponse } from "@/server/admin/http";

export async function POST(request: Request) {
  const originBlock = assertSameOrigin(request);
  if (originBlock) return originBlock;
  try {
    await clearAdminSession();
  } catch (error) {
    return adminFailureResponse(error);
  }

  return Response.json({ status: "signed_out" });
}

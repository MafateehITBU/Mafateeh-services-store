import { clearAdminSession } from "@/server/admin/session";
import { adminFailureResponse } from "@/server/admin/http";

export async function POST() {
  try {
    await clearAdminSession();
  } catch (error) {
    return adminFailureResponse(error);
  }

  return Response.json({ status: "signed_out" });
}

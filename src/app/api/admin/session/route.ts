import { adminAccessResponse, requireAdmin } from "@/server/admin/authorization";

export async function GET() {
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  return Response.json({
    email: access.user.email,
    role: access.user.role,
  });
}

import {
  adminFailureResponse,
  allowAttempt,
  clientAddress,
  invalidRequestResponse,
  rateLimitedResponse,
} from "@/server/admin/http";
import { authenticateAdmin } from "@/server/admin/login";
import { createAdminSession } from "@/server/admin/session";
import { adminLoginSchema } from "@/validations/admin-auth";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return invalidRequestResponse();
  }

  const parsed = adminLoginSchema.safeParse(body);

  if (!parsed.success) {
    return invalidRequestResponse();
  }

  const email = parsed.data.email.toLowerCase();

  if (!allowAttempt("admin-password-login", email, clientAddress(request), 10)) {
    return rateLimitedResponse();
  }

  try {
    const authenticated = await authenticateAdmin(email, parsed.data.password);

    if (!authenticated) {
      return Response.json(
        { error: "invalid_credentials", message: "The email or password is not valid." },
        { status: 401 },
      );
    }

    await createAdminSession(authenticated.userId);
  } catch (error) {
    return adminFailureResponse(error);
  }

  return Response.json({ status: "authenticated" });
}

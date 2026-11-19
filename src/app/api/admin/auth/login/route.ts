import { dummyPasswordHash, verifyPassword } from "@/server/admin/password";
import {
  adminFailureResponse,
  allowAttempt,
  clientAddress,
  invalidRequestResponse,
  rateLimitedResponse,
} from "@/server/admin/http";
import { authenticateAdmin } from "@/server/admin/login";
import { createAdminSession } from "@/server/admin/session";
import { assertSameOrigin } from "@/server/security/same-origin";
import { JSON_AUTH_BYTES, readJsonCapped } from "@/server/security/read-body";
import { adminLoginSchema } from "@/validations/admin-auth";

export async function POST(request: Request) {
  const originBlock = assertSameOrigin(request);

  if (originBlock) {
    return originBlock;
  }

  const body = await readJsonCapped(request, JSON_AUTH_BYTES);

  if (body instanceof Response) {
    return body;
  }

  const parsed = adminLoginSchema.safeParse(body.json);

  if (!parsed.success) {
    return invalidRequestResponse();
  }

  const email = parsed.data.email.toLowerCase();
  const attempt = await allowAttempt("admin-password-login", email, clientAddress(request), 10);
  const delay = Math.min(1600, 50 * 2 ** Math.min(Math.max(attempt.count - 1, 0), 5));
  await new Promise((resolve) => setTimeout(resolve, delay));

  if (!attempt.allowed) {
    await verifyPassword(parsed.data.password, await dummyPasswordHash());
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

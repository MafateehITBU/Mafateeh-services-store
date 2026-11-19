import { JSON_FORM_BYTES, readJsonCapped } from "@/server/security/read-body";
import { assertSameOrigin } from "@/server/security/same-origin";
import { adminAccessResponse, requireAdmin } from "@/server/admin/authorization";
import {
  AccountRuleError,
  getAdminAccount,
  updateAdminEmail,
  updateAdminPassword,
  updateAdminProfile,
} from "@/server/admin/account";
import { adminEmailSchema, adminPasswordSchema, adminProfileSchema } from "@/validations/admin-operations";

function ruleResponse(error: unknown) {
  if (error instanceof AccountRuleError) {
    const status = /already in use/i.test(error.message) ? 409 : /incorrect/i.test(error.message) ? 400 : 400;
    return Response.json({ error: "account_rule", message: error.message }, { status });
  }

  console.error("account_request_failed", error instanceof Error ? error.name : "unknown");
  return Response.json({ error: "request_failed", message: "The request could not be completed." }, { status: 500 });
}

export async function GET() {
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  const account = await getAdminAccount(access.user.id);

  if (!account) {
    return Response.json({ error: "not_found", message: "Administrator account not found." }, { status: 404 });
  }

  return Response.json(account);
}

export async function PATCH(request: Request) {
  const originBlock = assertSameOrigin(request);
  if (originBlock) return originBlock;
  const incoming = await readJsonCapped(request, JSON_FORM_BYTES);
  if (incoming instanceof Response) return incoming;
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  const body = incoming.json;
  const profile = adminProfileSchema.safeParse(body);
  const email = adminEmailSchema.safeParse(body);
  const password = adminPasswordSchema.safeParse(body);

  try {
    if (profile.success) {
      return Response.json(await updateAdminProfile(access.user.id, profile.data));
    }

    if (email.success && body && typeof body === "object" && "email" in body && !("nextPassword" in body)) {
      return Response.json(await updateAdminEmail(access.user.id, email.data.email));
    }

    if (password.success) {
      await updateAdminPassword(access.user.id, password.data.currentPassword, password.data.nextPassword);
      return Response.json({ status: "updated" });
    }
  } catch (error) {
    return ruleResponse(error);
  }

  return Response.json({ error: "invalid_request", message: "Check the account fields and try again." }, { status: 400 });
}

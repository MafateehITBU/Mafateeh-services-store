import { JSON_FORM_BYTES, readJsonCapped } from "@/server/security/read-body";
import { assertSameOrigin } from "@/server/security/same-origin";
import { adminAccessResponse, requireAdmin } from "@/server/admin/authorization";
import { ServiceRuleError, setServiceStatus } from "@/server/admin/services";
import { serviceStatusSchema } from "@/validations/service";

function ruleResponse(error: unknown) {
  if (error instanceof ServiceRuleError) {
    return Response.json({ error: error.code, message: error.message }, { status: error.status });
  }

  console.error("service_request_failed", error instanceof Error ? error.name : "unknown");
  return Response.json({ error: "request_failed", message: "The request could not be completed." }, { status: 500 });
}

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const originBlock = assertSameOrigin(request);
  if (originBlock) return originBlock;
  const incoming = await readJsonCapped(request, JSON_FORM_BYTES);
  if (incoming instanceof Response) return incoming;
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  const parsed = serviceStatusSchema.safeParse(incoming.json);

  if (!parsed.success) {
    return Response.json({ error: "invalid_request", message: "Choose a valid service status." }, { status: 400 });
  }

  try {
    return Response.json(await setServiceStatus(access.user.id, (await context.params).id, parsed.data.action));
  } catch (error) {
    return ruleResponse(error);
  }
}

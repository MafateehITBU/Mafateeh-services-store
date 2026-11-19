import { JSON_IMAGE_BYTES, readJsonCapped } from "@/server/security/read-body";
import { assertSameOrigin } from "@/server/security/same-origin";
import { adminAccessResponse, requireAdmin } from "@/server/admin/authorization";
import { ServiceRuleError, createService, listServices } from "@/server/admin/services";
import { serviceInputSchema, serviceListSchema } from "@/validations/service";

function ruleResponse(error: unknown) {
  if (error instanceof ServiceRuleError) {
    return Response.json({ error: error.code, message: error.message }, { status: error.status });
  }

  console.error("service_request_failed", error instanceof Error ? error.name : "unknown");
  return Response.json({ error: "request_failed", message: "The request could not be completed." }, { status: 500 });
}

function invalid(error: { issues: Array<{ message: string }> }) {
  return Response.json({ error: "invalid_request", message: error.issues[0]?.message ?? "Check the service fields and try again." }, { status: 400 });
}

export async function GET(request: Request) {
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  const url = new URL(request.url);
  const parsed = serviceListSchema.safeParse(Object.fromEntries(url.searchParams.entries()));

  if (!parsed.success) {
    return invalid(parsed.error);
  }

  try {
    return Response.json(await listServices(parsed.data));
  } catch (error) {
    return ruleResponse(error);
  }
}

export async function POST(request: Request) {
  const originBlock = assertSameOrigin(request);
  if (originBlock) return originBlock;
  const incoming = await readJsonCapped(request, JSON_IMAGE_BYTES);
  if (incoming instanceof Response) return incoming;
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  const parsed = serviceInputSchema.safeParse(incoming.json);

  if (!parsed.success) {
    return invalid(parsed.error);
  }

  try {
    return Response.json(await createService(access.user.id, parsed.data), { status: 201 });
  } catch (error) {
    return ruleResponse(error);
  }
}

import { adminAccessResponse, requireAdmin } from "@/server/admin/authorization";
import { ServiceRuleError, deleteService, getService, updateService } from "@/server/admin/services";
import { serviceInputSchema } from "@/validations/service";

function ruleResponse(error: unknown) {
  if (error instanceof ServiceRuleError) {
    return Response.json({ error: error.code, message: error.message }, { status: error.status });
  }

  console.error("service_request_failed", error instanceof Error ? error.name : "unknown");
  return Response.json({ error: "request_failed", message: "The request could not be completed." }, { status: 500 });
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  try {
    return Response.json(await getService((await context.params).id));
  } catch (error) {
    return ruleResponse(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  const parsed = serviceInputSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return Response.json(
      { error: "invalid_request", message: parsed.error.issues[0]?.message ?? "Check the service fields and try again." },
      { status: 400 },
    );
  }

  try {
    return Response.json(await updateService(access.user.id, (await context.params).id, parsed.data));
  } catch (error) {
    return ruleResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  try {
    await deleteService(access.user.id, (await context.params).id);
    return Response.json({ status: "deleted" });
  } catch (error) {
    return ruleResponse(error);
  }
}

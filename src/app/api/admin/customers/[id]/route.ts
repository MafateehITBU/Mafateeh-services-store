import { JSON_FORM_BYTES, readJsonCapped } from "@/server/security/read-body";
import { assertSameOrigin } from "@/server/security/same-origin";
import { adminAccessResponse, requireAdmin } from "@/server/admin/authorization";
import { CustomerRuleError, getCustomer, updateCustomerStatus } from "@/server/admin/customers";
import { customerStatusSchema } from "@/validations/admin-operations";

function ruleResponse(error: unknown) {
  if (error instanceof CustomerRuleError) {
    const status = /not found/i.test(error.message) ? 404 : 400;
    return Response.json({ error: "customer_rule", message: error.message }, { status });
  }

  console.error("customer_request_failed", error instanceof Error ? error.name : "unknown");
  return Response.json({ error: "request_failed", message: "The request could not be completed." }, { status: 500 });
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  const customer = await getCustomer((await context.params).id);

  if (!customer) {
    return Response.json({ error: "not_found", message: "Customer not found." }, { status: 404 });
  }

  return Response.json(customer);
}

export async function PATCH(request: Request, context: RouteContext) {
  const originBlock = assertSameOrigin(request);
  if (originBlock) return originBlock;
  const incoming = await readJsonCapped(request, JSON_FORM_BYTES);
  if (incoming instanceof Response) return incoming;
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  const body = incoming.json;

  if (body && typeof body === "object" && ("role" in body || "passwordHash" in body)) {
    return Response.json(
      { error: "forbidden_field", message: "Customer role and credentials cannot be changed here." },
      { status: 400 },
    );
  }

  const parsed = customerStatusSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "invalid_request", message: "Choose a valid account status." }, { status: 400 });
  }

  try {
    return Response.json(await updateCustomerStatus(access.user.id, (await context.params).id, parsed.data.status));
  } catch (error) {
    return ruleResponse(error);
  }
}

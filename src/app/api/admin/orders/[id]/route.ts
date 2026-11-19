import { JSON_FORM_BYTES, readJsonCapped } from "@/server/security/read-body";
import { assertSameOrigin } from "@/server/security/same-origin";
import { adminAccessResponse, requireAdmin } from "@/server/admin/authorization";
import { getAdminOrder, OrderRuleError, updateOrderStatus } from "@/server/admin/orders";
import { orderStatusSchema } from "@/validations/admin-operations";

function ruleResponse(error: unknown) {
  if (error instanceof OrderRuleError) {
    const status = /not found/i.test(error.message) ? 404 : 400;
    return Response.json({ error: "order_rule", message: error.message }, { status });
  }

  console.error("order_request_failed", error instanceof Error ? error.name : "unknown");
  return Response.json({ error: "request_failed", message: "The request could not be completed." }, { status: 500 });
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  const order = await getAdminOrder((await context.params).id);

  if (!order) {
    return Response.json({ error: "not_found", message: "Order not found." }, { status: 404 });
  }

  return Response.json(order);
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

  if (body && typeof body === "object" && ("paymentStatus" in body || "total" in body || "items" in body)) {
    return Response.json(
      { error: "forbidden_field", message: "Payment records, totals, and item prices cannot be edited here." },
      { status: 400 },
    );
  }

  const parsed = orderStatusSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "invalid_request", message: "Choose a valid order status." }, { status: 400 });
  }

  try {
    return Response.json(await updateOrderStatus(access.user.id, (await context.params).id, parsed.data.status));
  } catch (error) {
    return ruleResponse(error);
  }
}

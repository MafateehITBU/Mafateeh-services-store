import { adminAccessResponse, requireAdmin } from "@/server/admin/authorization";
import { listAdminOrders } from "@/server/admin/orders";
import { optionalDay } from "@/validations/admin-operations";
import type { OrderStatus, PaymentStatus } from "@/generated/prisma/client";

const orderStatuses = new Set<OrderStatus>(["PENDING_PAYMENT", "PAID", "PROCESSING", "COMPLETED", "CANCELLED", "REFUNDED"]);
const paymentStatuses = new Set<PaymentStatus>(["PENDING", "PROCESSING", "PAID", "FAILED", "REFUNDED"]);

export async function GET(request: Request) {
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const paymentStatus = url.searchParams.get("paymentStatus");
  const sort = url.searchParams.get("sort");

  try {
    return Response.json(
      await listAdminOrders({
        q: url.searchParams.get("q")?.trim() || undefined,
        status: status && orderStatuses.has(status as OrderStatus) ? (status as OrderStatus) : undefined,
        paymentStatus:
          paymentStatus && paymentStatuses.has(paymentStatus as PaymentStatus)
            ? (paymentStatus as PaymentStatus)
            : undefined,
        from: optionalDay(url.searchParams.get("from")),
        to: optionalDay(url.searchParams.get("to")),
        sort: sort === "oldest" || sort === "total" ? sort : "newest",
        page: Number(url.searchParams.get("page")) || 1,
      }),
    );
  } catch (error) {
    console.error("order_request_failed", error instanceof Error ? error.name : "unknown");
    return Response.json({ error: "request_failed", message: "The request could not be completed." }, { status: 500 });
  }
}

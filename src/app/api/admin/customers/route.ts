import { adminAccessResponse, requireAdmin } from "@/server/admin/authorization";
import { listCustomers } from "@/server/admin/customers";
import { optionalDay } from "@/validations/admin-operations";
import type { AccountStatus } from "@/generated/prisma/client";

const statuses = new Set<AccountStatus>(["ACTIVE", "DEACTIVATED", "SUSPENDED"]);

export async function GET(request: Request) {
  const access = await requireAdmin();

  if (!access.ok) {
    return adminAccessResponse(access);
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");

  try {
    return Response.json(
      await listCustomers({
        q: url.searchParams.get("q")?.trim() || undefined,
        status: status && statuses.has(status as AccountStatus) ? (status as AccountStatus) : undefined,
        from: optionalDay(url.searchParams.get("from")),
        to: optionalDay(url.searchParams.get("to")),
        page: Number(url.searchParams.get("page")) || 1,
      }),
    );
  } catch (error) {
    console.error("customer_request_failed", error instanceof Error ? error.name : "unknown");
    return Response.json({ error: "request_failed", message: "The request could not be completed." }, { status: 500 });
  }
}

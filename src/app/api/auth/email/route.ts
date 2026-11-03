import { AdminConfigError } from "@/lib/admin-env";
import { requestCustomerCode } from "@/server/auth/customer-otp";
import { customerEmailSchema } from "@/validations/customer-auth";

export async function POST(request: Request) {
  const parsed = customerEmailSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return Response.json({ error: "invalid_email" }, { status: 400 });
  }

  try {
    const result = await requestCustomerCode(parsed.data.email);

    if (!result.ok) {
      return Response.json({ error: "unavailable" }, { status: result.status });
    }

    return Response.json({ retryAfter: result.retryAfter });
  } catch (error) {
    if (error instanceof AdminConfigError) {
      return Response.json({ error: "email_unavailable" }, { status: 503 });
    }

    console.error("customer_code_failed", error instanceof Error ? error.name : "unknown");
    return Response.json({ error: "email_unavailable" }, { status: 500 });
  }
}

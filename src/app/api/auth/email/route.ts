import { AdminConfigError } from "@/lib/admin-env";
import { requestCustomerCode } from "@/server/auth/customer-otp";
import { customerIpAllowed, customerRateLimited } from "@/server/auth/request-limit";
import { customerEmailSchema } from "@/validations/customer-auth";

export async function POST(request: Request) {
  if (!customerIpAllowed(request, "auth-email")) {
    return customerRateLimited();
  }

  const parsed = customerEmailSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return Response.json({ error: "invalid_email" }, { status: 400 });
  }

  try {
    const result = await requestCustomerCode(parsed.data.email);
    return Response.json({ retryAfter: result.retryAfter });
  } catch (error) {
    if (error instanceof AdminConfigError) {
      return Response.json({ error: "email_unavailable" }, { status: 503 });
    }

    console.error("customer_code_failed", error instanceof Error ? error.name : "unknown");
    return Response.json({ error: "email_unavailable" }, { status: 500 });
  }
}

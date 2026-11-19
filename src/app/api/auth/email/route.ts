import { JSON_AUTH_BYTES, readJsonCapped } from "@/server/security/read-body";
import { assertSameOrigin } from "@/server/security/same-origin";
import { AdminConfigError } from "@/lib/admin-env";
import { requestCustomerCode } from "@/server/auth/customer-otp";
import { customerIpAllowed, customerRateLimited } from "@/server/auth/request-limit";
import { customerEmailSchema } from "@/validations/customer-auth";

export async function POST(request: Request) {
  const originBlock = assertSameOrigin(request);
  if (originBlock) return originBlock;
  const incoming = await readJsonCapped(request, JSON_AUTH_BYTES);
  if (incoming instanceof Response) return incoming;
  if (!(await customerIpAllowed(request, "auth-email"))) {
    return customerRateLimited();
  }

  const parsed = customerEmailSchema.safeParse(incoming.json);

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

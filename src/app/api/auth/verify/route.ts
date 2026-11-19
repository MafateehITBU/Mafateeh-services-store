import { JSON_AUTH_BYTES, readJsonCapped } from "@/server/security/read-body";
import { assertSameOrigin } from "@/server/security/same-origin";
import { verifyCustomerCode } from "@/server/auth/customer-otp";
import { customerIpAllowed, customerRateLimited } from "@/server/auth/request-limit";
import { customerCodeSchema } from "@/validations/customer-auth";

export async function POST(request: Request) {
  const originBlock = assertSameOrigin(request);
  if (originBlock) return originBlock;
  const incoming = await readJsonCapped(request, JSON_AUTH_BYTES);
  if (incoming instanceof Response) return incoming;
  if (!(await customerIpAllowed(request, "auth-verify"))) {
    return customerRateLimited();
  }

  const parsed = customerCodeSchema.safeParse(incoming.json);

  if (!parsed.success) {
    return Response.json({ error: "invalid_code" }, { status: 400 });
  }

  try {
    const result = await verifyCustomerCode(parsed.data.email, parsed.data.code);

    if (!result.ok) {
      return Response.json({ error: "invalid_code" }, { status: result.status });
    }

    return Response.json({ needsProfile: result.needsProfile });
  } catch (error) {
    console.error("customer_verify_failed", error instanceof Error ? error.name : "unknown");
    return Response.json({ error: "invalid_code" }, { status: 500 });
  }
}

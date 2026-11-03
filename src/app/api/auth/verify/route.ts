import { verifyCustomerCode } from "@/server/auth/customer-otp";
import { customerCodeSchema } from "@/validations/customer-auth";

export async function POST(request: Request) {
  const parsed = customerCodeSchema.safeParse(await request.json().catch(() => null));

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

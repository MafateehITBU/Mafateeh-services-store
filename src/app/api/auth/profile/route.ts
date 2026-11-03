import { saveCustomerProfile } from "@/server/auth/customer-otp";
import { customerProfileSchema, normalizeNationalNumber } from "@/validations/customer-auth";

export async function POST(request: Request) {
  const parsed = customerProfileSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    const invalidPhone = parsed.error.issues.some((issue) => issue.path[0] === "phone");
    return Response.json({ error: invalidPhone ? "invalid_phone" : "invalid_profile" }, { status: 400 });
  }

  try {
    const result = await saveCustomerProfile({
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone: `${parsed.data.countryCode}${normalizeNationalNumber(parsed.data.phone)}`,
    });

    if (!result.ok) {
      return Response.json({ error: "unauthenticated" }, { status: result.status });
    }

    return Response.json({ firstName: result.firstName });
  } catch (error) {
    console.error("customer_profile_failed", error instanceof Error ? error.name : "unknown");
    return Response.json({ error: "invalid_profile" }, { status: 500 });
  }
}

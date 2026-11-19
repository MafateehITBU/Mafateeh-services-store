import { findCountry } from "@/lib/countries";
import { saveCustomerProfile } from "@/server/auth/customer-otp";
import { customerIpAllowed, customerRateLimited } from "@/server/auth/request-limit";
import { customerProfileSchema, normalizeNationalNumber } from "@/validations/customer-auth";

export async function POST(request: Request) {
  if (!customerIpAllowed(request, "auth-profile")) {
    return customerRateLimited();
  }

  const parsed = customerProfileSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    const invalidPhone = parsed.error.issues.some((issue) => issue.path[0] === "phone");
    return Response.json({ error: invalidPhone ? "invalid_phone" : "invalid_profile" }, { status: 400 });
  }

  try {
    const country = findCountry(parsed.data.countryIso);

    if (!country) {
      return Response.json({ error: "invalid_phone" }, { status: 400 });
    }

    const result = await saveCustomerProfile({
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone: `+${country.dial}${normalizeNationalNumber(parsed.data.phone)}`,
      phoneCountry: country.iso,
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

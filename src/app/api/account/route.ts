import { requestEmailChange } from "@/server/auth/customer-otp";
import { customerIpAllowed, customerRateLimited } from "@/server/auth/request-limit";
import { updateCustomerAccount } from "@/server/storefront/account";
import { customerAccountSchema, normalizeNationalNumber } from "@/validations/customer-auth";

export async function POST(request: Request) {
  if (!customerIpAllowed(request, "account")) {
    return customerRateLimited();
  }

  const parsed = customerAccountSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    const invalidPhone = parsed.error.issues.some((issue) => issue.path[0] === "phone");
    return Response.json({ error: invalidPhone ? "invalid_phone" : "invalid_profile" }, { status: 400 });
  }

  try {
    const result = await updateCustomerAccount({
      ...parsed.data,
      phone: normalizeNationalNumber(parsed.data.phone),
    });

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    if (!result.emailConfirmation) {
      return Response.json({ firstName: result.firstName });
    }

    try {
      const sent = await requestEmailChange(result.email);

      if (!sent.ok) {
        return Response.json({ error: sent.error }, { status: sent.status });
      }

      return Response.json({ firstName: result.firstName, emailConfirmation: true, retryAfter: sent.retryAfter });
    } catch (error) {
      console.error("customer_email_change_failed", error instanceof Error ? error.name : "unknown");
      return Response.json({ error: "send_failed" }, { status: 500 });
    }
  } catch (error) {
    console.error("customer_account_failed", error instanceof Error ? error.name : "unknown");
    return Response.json({ error: "invalid_profile" }, { status: 500 });
  }
}

import { JSON_AUTH_BYTES, readJsonCapped } from "@/server/security/read-body";
import { assertSameOrigin } from "@/server/security/same-origin";
import { confirmEmailChange, requestEmailChange } from "@/server/auth/customer-otp";
import { customerIpAllowed, customerRateLimited } from "@/server/auth/request-limit";
import { z } from "zod";

const emailChangeSchema = z.object({
  email: z.string().trim().email().max(254),
  code: z.string().regex(/^\d{6}$/).optional(),
});

export async function POST(request: Request) {
  const originBlock = assertSameOrigin(request);
  if (originBlock) return originBlock;
  const incoming = await readJsonCapped(request, JSON_AUTH_BYTES);
  if (incoming instanceof Response) return incoming;
  if (!(await customerIpAllowed(request, "account-email"))) {
    return customerRateLimited();
  }

  const parsed = emailChangeSchema.safeParse(incoming.json);

  if (!parsed.success) {
    return Response.json({ error: "invalid_profile" }, { status: 400 });
  }

  try {
    if (!parsed.data.code) {
      const sent = await requestEmailChange(parsed.data.email);

      if (!sent.ok) {
        return Response.json({ error: sent.error }, { status: sent.status });
      }

      return Response.json({ retryAfter: sent.retryAfter });
    }

    const result = await confirmEmailChange(parsed.data.email, parsed.data.code);

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json({ email: result.email });
  } catch (error) {
    console.error("customer_email_change_failed", error instanceof Error ? error.name : "unknown");
    return Response.json({ error: "send_failed" }, { status: 500 });
  }
}

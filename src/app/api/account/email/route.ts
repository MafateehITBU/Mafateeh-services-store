import { confirmEmailChange, requestEmailChange } from "@/server/auth/customer-otp";
import { z } from "zod";

const emailChangeSchema = z.object({
  email: z.string().trim().email().max(254),
  code: z.string().regex(/^\d{4}$/).optional(),
});

export async function POST(request: Request) {
  const parsed = emailChangeSchema.safeParse(await request.json().catch(() => null));

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

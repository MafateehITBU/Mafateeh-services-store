import { assertSameOrigin } from "@/server/security/same-origin";
import { clearCustomerSession } from "@/server/auth/customer-session";

export async function POST(request: Request) {
  const originBlock = assertSameOrigin(request);
  if (originBlock) return originBlock;
  await clearCustomerSession();
  return Response.json({ status: "signed_out" });
}

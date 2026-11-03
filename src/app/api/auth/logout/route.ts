import { clearCustomerSession } from "@/server/auth/customer-session";

export async function POST() {
  await clearCustomerSession();
  return Response.json({ status: "signed_out" });
}

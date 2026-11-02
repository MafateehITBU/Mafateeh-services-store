import { HomepageRuleError } from "@/server/admin/homepage";

export function homepageErrorResponse(error: unknown) {
  if (error instanceof HomepageRuleError) {
    return Response.json({ error: error.code, message: error.message }, { status: error.status });
  }

  console.error("homepage_request_failed", error instanceof Error ? error.name : "unknown");
  return Response.json({ error: "request_failed", message: "The request could not be completed." }, { status: 500 });
}

export function invalidHomepage(error: { issues: Array<{ message: string }> }) {
  return Response.json({ error: "invalid_request", message: error.issues[0]?.message ?? "Check the fields and try again." }, { status: 400 });
}

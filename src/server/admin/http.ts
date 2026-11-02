import "server-only";

import { AdminConfigError } from "@/lib/admin-env";
import { enforceRateLimit } from "@/server/admin/rate-limit";

const WINDOW_MS = 15 * 60 * 1000;

export function clientAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

export function allowAttempt(scope: string, email: string, address: string, emailLimit: number) {
  const emailAllowed = enforceRateLimit(`${scope}:email:${email}`, emailLimit, WINDOW_MS);
  const addressAllowed = enforceRateLimit(`${scope}:ip:${address}`, 30, WINDOW_MS);
  return emailAllowed && addressAllowed;
}

export function rateLimitedResponse() {
  return Response.json(
    { error: "rate_limited", message: "Too many attempts. Try again later." },
    { status: 429 },
  );
}

export function invalidRequestResponse() {
  return Response.json(
    { error: "invalid_request", message: "Check the submitted information and try again." },
    { status: 400 },
  );
}

export function adminFailureResponse(error: unknown) {
  if (error instanceof AdminConfigError) {
    return Response.json(
      { error: "server_configuration", message: error.message },
      { status: 503 },
    );
  }

  console.error("admin_request_failed");
  return Response.json(
    { error: "request_failed", message: "The request could not be completed." },
    { status: 500 },
  );
}

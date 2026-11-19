import "server-only";

import { AdminConfigError } from "@/lib/admin-env";
import { consumeRateLimit } from "@/server/admin/rate-limit";

const WINDOW_MS = 15 * 60 * 1000;

export function clientAddress(request: Request) {
  const headerName = process.env.TRUSTED_PROXY_HEADER?.trim().toLowerCase();

  if (!headerName) {
    return "unknown";
  }

  const forwarded = request.headers.get(headerName)?.split(",")[0]?.trim();
  return forwarded || "unknown";
}

export async function allowAttempt(scope: string, email: string, address: string, limit: number) {
  return consumeRateLimit(`${scope}:${address}:${email}`, limit, WINDOW_MS);
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

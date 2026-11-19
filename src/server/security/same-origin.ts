import "server-only";

const CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function assertSameOrigin(request: Request) {
  if (!CHANGING.has(request.method.toUpperCase())) {
    return null;
  }

  const expected = new URL(request.url).origin;
  const origin = request.headers.get("origin");

  if (origin) {
    if (origin === expected) {
      return null;
    }

    return Response.json({ error: "invalid_origin", message: "The request origin is not allowed." }, { status: 403 });
  }

  const site = request.headers.get("sec-fetch-site");

  if (site === "same-origin" || site === "same-site") {
    return null;
  }

  return Response.json({ error: "invalid_origin", message: "The request origin is not allowed." }, { status: 403 });
}

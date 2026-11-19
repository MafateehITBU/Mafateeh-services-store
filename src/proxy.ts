import createMiddleware from "next-intl/middleware";
import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { SESSION_ISSUER, derivedSecret } from "./server/security/session-keys";

const handleI18nRouting = createMiddleware(routing);

async function hasSignedAdminSession(request: NextRequest) {
  const token = request.cookies.get("mafateeh_admin_session")?.value;
  const secret = process.env.SESSION_SECRET?.trim();

  if (!token || !secret || secret.length < 32) {
    return false;
  }

  try {
    const key = await derivedSecret(secret, "admin-session");
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
      issuer: SESSION_ISSUER,
      audience: "admin",
    });
    return payload.kind === "admin" && typeof payload.sub === "string" && payload.sub.length > 0 && typeof payload.sv === "number";
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (pathname !== "/admin/login" && !(await hasSignedAdminSession(request))) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    return NextResponse.next();
  }

  return handleI18nRouting(request);
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};

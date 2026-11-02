import createMiddleware from "next-intl/middleware";
import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

async function hasSignedAdminSession(request: NextRequest) {
  const token = request.cookies.get("mafateeh_admin_session")?.value;
  const secret = process.env.SESSION_SECRET?.trim();

  if (!token || !secret || secret.length < 32) {
    return false;
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return payload.kind === "admin" && typeof payload.sub === "string" && payload.sub.length > 0;
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

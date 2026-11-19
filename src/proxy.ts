import createMiddleware from "next-intl/middleware";
import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { historicCategorySlug, historicServiceSlug } from "./server/content/slug-history";
import { SESSION_ISSUER, derivedSecret } from "./server/security/session-keys";

const handleI18nRouting = createMiddleware(routing);

async function hasSignedAdminSession(request: NextRequest) {
  const token = request.cookies.get("mafateeh_admin_session")?.value;
  const secret = process.env.SESSION_SECRET?.trim();

  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters.");
  }

  if (!token) {
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

  const historic = pathname.match(/^\/(en|ar)\/(services|categories)\/([^/]+)\/?$/);

  if (historic?.[1] && historic[2] && historic[3]) {
    try {
      const slug = decodeURIComponent(historic[3]);
      const nextSlug = historic[2] === "services" ? await historicServiceSlug(slug) : await historicCategorySlug(slug);

      if (nextSlug) {
        const url = request.nextUrl.clone();
        url.pathname = `/${historic[1]}/${historic[2]}/${nextSlug}`;
        return NextResponse.redirect(url, 301);
      }
    } catch {
      return handleI18nRouting(request);
    }
  }

  return handleI18nRouting(request);
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};

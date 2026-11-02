import "server-only";

import { AdminConfigError, readSessionSecret } from "@/lib/admin-env";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "mafateeh_admin_session";
const SESSION_SECONDS = 60 * 60 * 8;

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

function secretKey() {
  return new TextEncoder().encode(readSessionSecret());
}

export async function createAdminSession(userId: string) {
  const token = await new SignJWT({ kind: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(secretKey());

  const jar = await cookies();
  jar.set(ADMIN_SESSION_COOKIE, token, cookieOptions(SESSION_SECONDS));
}

export async function clearAdminSession() {
  const jar = await cookies();
  jar.set(ADMIN_SESSION_COOKIE, "", cookieOptions(0));
}

export async function readAdminSessionUserId() {
  const jar = await cookies();
  const token = jar.get(ADMIN_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secretKey());

    if (payload.kind !== "admin" || typeof payload.sub !== "string" || payload.sub.length === 0) {
      return null;
    }

    return payload.sub;
  } catch (error) {
    if (error instanceof AdminConfigError) {
      throw error;
    }

    return null;
  }
}

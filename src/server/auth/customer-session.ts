import "server-only";

import { AdminConfigError, readSessionSecret } from "@/lib/admin-env";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const CUSTOMER_SESSION_COOKIE = "mafateeh_customer_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;

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

export async function createCustomerSession(userId: string) {
  const token = await new SignJWT({ kind: "customer" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(secretKey());

  const jar = await cookies();
  jar.set(CUSTOMER_SESSION_COOKIE, token, cookieOptions(SESSION_SECONDS));
}

export async function clearCustomerSession() {
  const jar = await cookies();
  jar.set(CUSTOMER_SESSION_COOKIE, "", cookieOptions(0));
}

export async function readCustomerSessionUserId() {
  const jar = await cookies();
  const token = jar.get(CUSTOMER_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secretKey());

    if (payload.kind !== "customer" || typeof payload.sub !== "string" || payload.sub.length === 0) {
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

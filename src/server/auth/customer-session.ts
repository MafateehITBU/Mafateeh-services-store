import "server-only";

import { AdminConfigError, readSessionSecret } from "@/lib/admin-env";
import { SESSION_ISSUER, derivedSecret } from "@/server/security/session-keys";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const CUSTOMER_SESSION_COOKIE = "mafateeh_customer_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const AUDIENCE = "customer";

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

async function secretKey() {
  return derivedSecret(readSessionSecret(), "customer-session");
}

export async function createCustomerSession(userId: string, sessionVersion: number) {
  const token = await new SignJWT({ kind: "customer", sv: sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(SESSION_ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(await secretKey());

  const jar = await cookies();
  jar.set(CUSTOMER_SESSION_COOKIE, token, cookieOptions(SESSION_SECONDS));
}

export async function clearCustomerSession() {
  const jar = await cookies();
  jar.set(CUSTOMER_SESSION_COOKIE, "", cookieOptions(0));
}

export async function readCustomerSession() {
  const jar = await cookies();
  const token = jar.get(CUSTOMER_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, await secretKey(), {
      algorithms: ["HS256"],
      issuer: SESSION_ISSUER,
      audience: AUDIENCE,
    });

    if (payload.kind !== "customer" || typeof payload.sub !== "string" || payload.sub.length === 0 || typeof payload.sv !== "number") {
      return null;
    }

    return { userId: payload.sub, sessionVersion: payload.sv };
  } catch (error) {
    if (error instanceof AdminConfigError) {
      throw error;
    }

    return null;
  }
}

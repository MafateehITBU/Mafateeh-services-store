import "server-only";

import { AdminConfigError } from "@/lib/admin-env";
import { prisma } from "@/lib/prisma";
import { readAdminSessionUserId } from "@/server/admin/session";
import type { AdminPrincipal } from "@/types/admin";

export type { AdminPrincipal };

export type AdminAccess =
  | { ok: true; user: AdminPrincipal }
  | { ok: false; status: 401 | 403 | 503; message?: string };

export async function getAdminAccess(level: "admin" | "super" = "admin"): Promise<AdminAccess> {
  let userId: string | null;

  try {
    userId = await readAdminSessionUserId();
  } catch (error) {
    if (error instanceof AdminConfigError) {
      return { ok: false, status: 503, message: error.message };
    }

    throw error;
  }

  if (!userId) {
    return { ok: false, status: 401 };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, status: true },
  });

  if (!user || user.status !== "ACTIVE") {
    return { ok: false, status: 401 };
  }

  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return { ok: false, status: 403 };
  }

  if (level === "super" && user.role !== "SUPER_ADMIN") {
    return { ok: false, status: 403 };
  }

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  };
}

export async function requireAdmin() {
  const access = await getAdminAccess("admin");

  if (!access.ok) {
    return access;
  }

  return access;
}

export async function requireSuperAdmin() {
  return getAdminAccess("super");
}

export function adminAccessResponse(access: Exclude<AdminAccess, { ok: true }>) {
  if (access.status === 401) {
    return Response.json(
      { error: "unauthenticated", message: "Authentication is required." },
      { status: 401 },
    );
  }

  if (access.status === 403) {
    return Response.json(
      { error: "forbidden", message: "You do not have access to this area." },
      { status: 403 },
    );
  }

  return Response.json(
    {
      error: "server_configuration",
      message: access.message ?? "Admin authentication is not configured.",
    },
    { status: 503 },
  );
}

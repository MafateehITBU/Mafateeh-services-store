import { prisma } from "@/lib/prisma";
import { logServer } from "@/server/logging";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logServer("health_failed", { name: error instanceof Error ? error.name : "error" });
    return Response.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

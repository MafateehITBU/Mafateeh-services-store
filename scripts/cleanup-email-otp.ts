import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

config();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const removed = await prisma.emailOtp.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: cutoff } },
          { consumedAt: { not: null }, createdAt: { lt: cutoff } },
        ],
      },
    });
    console.log(`Removed ${removed.count} expired or consumed email codes.`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();

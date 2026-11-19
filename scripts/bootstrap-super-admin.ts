import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { createInterface } from "node:readline";
import { PrismaClient } from "../src/generated/prisma/client";
import { z } from "zod";
import { hashPassword } from "../src/server/admin/password";
import { newPasswordSchema } from "../src/validations/admin-operations";

config();

const emailSchema = z.string().trim().email().max(254);

function readHiddenPassword() {
  if (process.env.SUPER_ADMIN_PASSWORD) {
    return Promise.resolve(process.env.SUPER_ADMIN_PASSWORD);
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const question = "SUPER_ADMIN_PASSWORD: ";

  return new Promise<string>((resolve) => {
    const output = (rl as unknown as { output: NodeJS.WriteStream }).output;
    const write = output.write.bind(output);
    output.write = (text: string) => (text.startsWith(question) ? write(text) : true);
    rl.question(question, (answer) => {
      output.write = write;
      rl.close();
      write("\n");
      resolve(answer);
    });
  });
}

async function main() {
  const emailResult = emailSchema.safeParse(process.env.SUPER_ADMIN_EMAIL);
  const passwordResult = newPasswordSchema.safeParse(await readHiddenPassword());

  if (!emailResult.success || !passwordResult.success) {
    console.error("Set SUPER_ADMIN_EMAIL. The password must be at least 12 characters and can be typed when SUPER_ADMIN_PASSWORD is not set.");
    process.exitCode = 1;
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exitCode = 1;
    return;
  }

  const email = emailResult.data.toLowerCase();
  const passwordHash = await hashPassword(passwordResult.data);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true, status: true },
    });

    if (!existing) {
      await prisma.user.create({
        data: {
          email,
          passwordHash,
          role: "SUPER_ADMIN",
          status: "ACTIVE",
          emailVerifiedAt: new Date(),
        },
      });
      console.log("Created an active SUPER_ADMIN for the configured email.");
      return;
    }

    if (existing.status !== "ACTIVE") {
      console.error("That account exists but is not active. No change was made.");
      process.exitCode = 1;
      return;
    }

    await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: "SUPER_ADMIN",
        passwordHash,
      },
    });
    console.log(
      existing.role === "SUPER_ADMIN"
        ? "Updated the password for the existing SUPER_ADMIN."
        : "Promoted the existing active account to SUPER_ADMIN and set the password.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.name : "error");
  console.error("The bootstrap command could not be completed.");
  process.exitCode = 1;
});

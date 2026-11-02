import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { config } from "dotenv";

if (existsSync(".env")) {
  config();
}

if (!process.env.DATABASE_URL) {
  console.log(
    "Skipping Prisma Client generation because DATABASE_URL is not set. Copy .env.example to .env, then run npm run db:generate.",
  );
  process.exit(0);
}

const result = spawnSync("prisma", ["generate"], {
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 1);

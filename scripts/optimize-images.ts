import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { decodeStoredImage, imageFromBytes, type ImageProfile } from "../src/server/media/process-image";

config();

const targets: Array<{ table: "Category" | "Service" | "ServiceImage" | "StoreBanner" | "User"; column: string; profile: ImageProfile }> = [
  { table: "Category", column: "iconImageUrl", profile: "cover" },
  { table: "Category", column: "bannerImageUrl", profile: "banner" },
  { table: "Service", column: "coverImageUrl", profile: "cover" },
  { table: "ServiceImage", column: "imageUrl", profile: "cover" },
  { table: "StoreBanner", column: "desktopImageUrl", profile: "banner" },
  { table: "StoreBanner", column: "mobileImageUrl", profile: "banner" },
  { table: "User", column: "avatarUrl", profile: "avatar" },
];

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  let before = 0;
  let after = 0;
  let changed = 0;

  try {
    for (const target of targets) {
      const rows = await prisma.$queryRawUnsafe<Array<{ id: string; value: string | null }>>(
        `SELECT id::text AS id, "${target.column}" AS value FROM "${target.table}" WHERE "${target.column}" IS NOT NULL`,
      );

      for (const row of rows) {
        const decoded = decodeStoredImage(row.value);

        if (!decoded) {
          continue;
        }

        before += decoded.bytes.length;
        const optimized = await imageFromBytes(decoded.bytes, target.profile);
        after += optimized.byteLength;

        if (optimized.dataUrl === row.value) {
          continue;
        }

        changed += 1;

        if (!dryRun) {
          await prisma.$executeRawUnsafe(`UPDATE "${target.table}" SET "${target.column}" = $1 WHERE id = $2::uuid`, optimized.dataUrl, row.id);
        }
      }
    }

    const saved = Math.max(0, before - after);
    console.log(`${dryRun ? "Dry run" : "Updated"} ${changed} images. Current bytes ${before}. Optimized bytes ${after}. Savings ${saved}.`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();

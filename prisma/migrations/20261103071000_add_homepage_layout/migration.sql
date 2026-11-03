-- CreateEnum
CREATE TYPE "HomepageBlockType" AS ENUM ('HERO_CAROUSEL', 'PROMOTIONAL_BANNER', 'CATEGORY_CAROUSEL', 'HOME_SECTION', 'TESTIMONIAL_CAROUSEL');

-- CreateTable
CREATE TABLE "HomepageLayoutItem" (
    "id" UUID NOT NULL,
    "type" "HomepageBlockType" NOT NULL,
    "bannerId" UUID,
    "sectionId" UUID,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageLayoutItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HomepageLayoutItem_bannerId_key" ON "HomepageLayoutItem"("bannerId");

-- CreateIndex
CREATE UNIQUE INDEX "HomepageLayoutItem_sectionId_key" ON "HomepageLayoutItem"("sectionId");

-- CreateIndex
CREATE INDEX "HomepageLayoutItem_sortOrder_idx" ON "HomepageLayoutItem"("sortOrder");

-- CreateIndex
CREATE INDEX "HomepageLayoutItem_type_idx" ON "HomepageLayoutItem"("type");

-- CreateIndex
CREATE UNIQUE INDEX "HomepageLayoutItem_singleton_type_key" ON "HomepageLayoutItem"("type") WHERE "type" IN ('HERO_CAROUSEL', 'CATEGORY_CAROUSEL', 'TESTIMONIAL_CAROUSEL');

-- AddForeignKey
ALTER TABLE "HomepageLayoutItem" ADD CONSTRAINT "HomepageLayoutItem_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "StoreBanner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomepageLayoutItem" ADD CONSTRAINT "HomepageLayoutItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "HomeSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- References must match the block type.
ALTER TABLE "HomepageLayoutItem" ADD CONSTRAINT "HomepageLayoutItem_refs_check" CHECK (
    ("type" = 'PROMOTIONAL_BANNER' AND "bannerId" IS NOT NULL AND "sectionId" IS NULL)
    OR ("type" = 'HOME_SECTION' AND "sectionId" IS NOT NULL AND "bannerId" IS NULL)
    OR ("type" IN ('HERO_CAROUSEL', 'CATEGORY_CAROUSEL', 'TESTIMONIAL_CAROUSEL') AND "bannerId" IS NULL AND "sectionId" IS NULL)
);

-- Backfill the current public order without copying banner or section records.
WITH ordered AS (
    SELECT 'HERO_CAROUSEL'::"HomepageBlockType" AS type, NULL::uuid AS "bannerId", NULL::uuid AS "sectionId", 1 AS pos, NULL::uuid AS tie
    WHERE EXISTS (SELECT 1 FROM "StoreBanner" WHERE "placement" = 'HOME_HERO')
    UNION ALL
    SELECT 'CATEGORY_CAROUSEL'::"HomepageBlockType", NULL::uuid, NULL::uuid, 2, NULL::uuid
    UNION ALL
    SELECT 'HOME_SECTION'::"HomepageBlockType", NULL::uuid, "id", 100 + "sortOrder", "id"
    FROM "HomeSection"
    WHERE "type" <> 'FEATURED_CATEGORIES'
    UNION ALL
    SELECT 'PROMOTIONAL_BANNER'::"HomepageBlockType", "id", NULL::uuid, 200 + "sortOrder", "id"
    FROM "StoreBanner"
    WHERE "placement" = 'HOME_PROMO'
    UNION ALL
    SELECT 'HOME_SECTION'::"HomepageBlockType", NULL::uuid, "id", 300 + "sortOrder", "id"
    FROM "HomeSection"
    WHERE "type" = 'FEATURED_CATEGORIES'
    UNION ALL
    SELECT 'TESTIMONIAL_CAROUSEL'::"HomepageBlockType", NULL::uuid, NULL::uuid, 400, NULL::uuid
)
INSERT INTO "HomepageLayoutItem" ("id", "type", "bannerId", "sectionId", "isVisible", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid(), type, "bannerId", "sectionId", true, ROW_NUMBER() OVER (ORDER BY pos, tie), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM ordered;

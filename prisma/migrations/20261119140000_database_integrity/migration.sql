-- Previous public slugs. Current slugs are not changed.
CREATE TABLE "CategorySlugHistory" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "categoryId" UUID NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CategorySlugHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CategorySlugHistory_slug_key" ON "CategorySlugHistory"("slug");
CREATE INDEX "CategorySlugHistory_categoryId_idx" ON "CategorySlugHistory"("categoryId");
ALTER TABLE "CategorySlugHistory" ADD CONSTRAINT "CategorySlugHistory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ServiceSlugHistory" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "serviceId" UUID NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceSlugHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServiceSlugHistory_slug_key" ON "ServiceSlugHistory"("slug");
CREATE INDEX "ServiceSlugHistory_serviceId_idx" ON "ServiceSlugHistory"("serviceId");
ALTER TABLE "ServiceSlugHistory" ADD CONSTRAINT "ServiceSlugHistory_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One earn credit per order.
CREATE UNIQUE INDEX "LoyaltyTransaction_earn_order_key" ON "LoyaltyTransaction"("orderId") WHERE "type" = 'EARN' AND "orderId" IS NOT NULL;

ALTER TABLE "Review" ADD CONSTRAINT "Review_rating_check" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_quantity_check" CHECK ("quantity" > 0);
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_quantity_check" CHECK ("quantity" > 0);
ALTER TABLE "LoyaltyWallet" ADD CONSTRAINT "LoyaltyWallet_points_check" CHECK ("pointsBalance" >= 0);

UPDATE "User" SET "email" = lower("email") WHERE "email" <> lower("email");
CREATE UNIQUE INDEX "User_email_lower_key" ON "User" (lower("email"));

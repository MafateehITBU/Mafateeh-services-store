import "server-only";

import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

export async function creditLoyaltyForOrder(tx: Tx, orderId: string) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      orderNumber: true,
      paymentStatus: true,
      items: { select: { quantity: true, service: { select: { loyaltyPoints: true } } } },
    },
  });

  if (!order || order.paymentStatus !== "PAID") {
    return;
  }

  const points = order.items.reduce((sum, item) => sum + item.quantity * (item.service?.loyaltyPoints ?? 0), 0);

  if (points <= 0) {
    return;
  }

  const wallet = await tx.loyaltyWallet.upsert({
    where: { userId: order.userId },
    create: { userId: order.userId, pointsBalance: 0 },
    update: {},
    select: { id: true },
  });
  const inserted = await tx.$executeRaw`
    INSERT INTO "LoyaltyTransaction" ("id", "walletId", "type", "points", "description", "orderId", "createdAt")
    VALUES (${crypto.randomUUID()}::uuid, ${wallet.id}::uuid, 'EARN'::"LoyaltyTransactionType", ${points}, ${order.orderNumber}, ${order.id}::uuid, NOW())
    ON CONFLICT ("orderId") WHERE "type" = 'EARN' AND "orderId" IS NOT NULL DO NOTHING
  `;

  if (inserted === 0) {
    return;
  }

  await tx.loyaltyWallet.update({
    where: { userId: order.userId },
    data: { pointsBalance: { increment: points } },
  });
}

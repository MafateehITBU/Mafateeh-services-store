import "server-only";

import { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

export async function creditLoyaltyForOrder(tx: Tx, orderId: string) {
  const existing = await tx.loyaltyTransaction.findFirst({
    where: { orderId, type: "EARN" },
    select: { id: true },
  });

  if (existing) {
    return;
  }

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
  const wallet = await tx.loyaltyWallet.upsert({
    where: { userId: order.userId },
    create: { userId: order.userId, pointsBalance: points },
    update: { pointsBalance: { increment: points } },
  });

  await tx.loyaltyTransaction.create({
    data: {
      walletId: wallet.id,
      type: "EARN",
      points,
      description: order.orderNumber,
      orderId: order.id,
    },
  });
}

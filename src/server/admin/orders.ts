import "server-only";

import { prisma } from "@/lib/prisma";
import { writeAdminAuditLog } from "@/server/admin/audit";
import { creditLoyaltyForOrder } from "@/server/storefront/loyalty";
import { dayRange } from "@/validations/admin-operations";
import type { OrderStatus, PaymentStatus, Prisma } from "@/generated/prisma/client";

const pageSize = 12;

export class OrderRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderRuleError";
  }
}

export function nextOrderStatuses(status: OrderStatus, paymentStatus: PaymentStatus): OrderStatus[] {
  if (status === "PENDING_PAYMENT") {
    return paymentStatus === "PAID" ? ["PAID", "PROCESSING", "CANCELLED"] : ["CANCELLED"];
  }

  if (status === "PAID") {
    return ["PROCESSING", "CANCELLED"];
  }

  if (status === "PROCESSING") {
    return ["COMPLETED", "CANCELLED"];
  }

  return [];
}

function money(value: Prisma.Decimal) {
  return value.toFixed(3);
}

function statusValue(value: Prisma.JsonValue | null) {
  if (value && typeof value === "object" && !Array.isArray(value) && typeof value.status === "string") {
    return value.status;
  }

  return null;
}

export async function listAdminOrders(input: {
  q?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  from?: string;
  to?: string;
  sort?: "newest" | "oldest" | "total";
  page?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const where = {
    status: input.status,
    paymentStatus: input.paymentStatus,
    createdAt: dayRange(input.from, input.to),
    OR: input.q
      ? [
          { orderNumber: { contains: input.q, mode: "insensitive" as const } },
          { user: { email: { contains: input.q, mode: "insensitive" as const } } },
          { user: { firstName: { contains: input.q, mode: "insensitive" as const } } },
          { user: { lastName: { contains: input.q, mode: "insensitive" as const } } },
          { user: { phone: { contains: input.q, mode: "insensitive" as const } } },
        ]
      : undefined,
  };
  const orderBy =
    input.sort === "oldest"
      ? { createdAt: "asc" as const }
      : input.sort === "total"
        ? { total: "desc" as const }
        : { createdAt: "desc" as const };
  const [total, rows] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        currency: true,
        total: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    }),
  ]);

  return {
    page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    total,
    orders: rows.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customer: [order.user.firstName, order.user.lastName].filter(Boolean).join(" ") || order.user.email,
      email: order.user.email,
      status: order.status,
      paymentStatus: order.paymentStatus,
      total: `${order.currency} ${money(order.total)}`,
      createdAt: order.createdAt.toISOString(),
    })),
  };
}

export async function getAdminOrder(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      currency: true,
      subtotal: true,
      discount: true,
      tax: true,
      total: true,
      createdAt: true,
      updatedAt: true,
      completedAt: true,
      user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          serviceNameSnapshot: true,
          variantNameSnapshot: true,
          unitPrice: true,
          currency: true,
          quantity: true,
          lineTotal: true,
        },
      },
      paymentAttempts: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          provider: true,
          status: true,
          amount: true,
          currency: true,
          providerReference: true,
          paidAt: true,
          createdAt: true,
        },
      },
      loyaltyTransactions: {
        orderBy: { createdAt: "desc" },
        select: { id: true, type: true, points: true, description: true, createdAt: true },
      },
    },
  });

  if (!order) {
    return null;
  }

  const history = await prisma.adminAuditLog.findMany({
    where: { entityType: "Order", entityId: id, action: "order.status" },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, beforeData: true, afterData: true, createdAt: true, actor: { select: { email: true } } },
  });

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    currency: order.currency,
    subtotal: money(order.subtotal),
    discount: money(order.discount),
    tax: money(order.tax),
    total: money(order.total),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    completedAt: order.completedAt?.toISOString() ?? null,
    nextStatuses: nextOrderStatuses(order.status, order.paymentStatus),
    customer: {
      id: order.user.id,
      name: [order.user.firstName, order.user.lastName].filter(Boolean).join(" ") || order.user.email,
      email: order.user.email,
      phone: order.user.phone,
    },
    items: order.items.map((item) => ({
      id: item.id,
      name: item.serviceNameSnapshot,
      option: item.variantNameSnapshot,
      unitPrice: money(item.unitPrice),
      currency: item.currency,
      quantity: item.quantity,
      lineTotal: money(item.lineTotal),
    })),
    payments: order.paymentAttempts.map((attempt) => ({
      id: attempt.id,
      provider: attempt.provider,
      status: attempt.status,
      amount: money(attempt.amount),
      currency: attempt.currency,
      reference: attempt.providerReference,
      paidAt: attempt.paidAt?.toISOString() ?? null,
      createdAt: attempt.createdAt.toISOString(),
    })),
    history: history.map((entry) => ({
      id: entry.id,
      from: statusValue(entry.beforeData),
      to: statusValue(entry.afterData),
      actorEmail: entry.actor.email,
      createdAt: entry.createdAt.toISOString(),
    })),
    loyalty: order.loyaltyTransactions.map((entry) => ({
      id: entry.id,
      type: entry.type,
      points: entry.points,
      description: entry.description,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}

export async function updateOrderStatus(actorId: string, id: string, status: OrderStatus) {
  const current = await prisma.order.findUnique({
    where: { id },
    select: { id: true, status: true, paymentStatus: true, completedAt: true },
  });

  if (!current) {
    throw new OrderRuleError("Order not found.");
  }

  if (!nextOrderStatuses(current.status, current.paymentStatus).includes(status)) {
    throw new OrderRuleError("That order status change is not allowed.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const saved = await tx.order.update({
      where: { id },
      data: {
        status,
        completedAt: status === "COMPLETED" ? current.completedAt ?? new Date() : current.completedAt,
      },
      select: { id: true, status: true, paymentStatus: true, total: true },
    });

    if (saved.paymentStatus !== current.paymentStatus) {
      throw new OrderRuleError("Payment status cannot change with the order status.");
    }

    if ((status === "PAID" || status === "PROCESSING" || status === "COMPLETED") && saved.paymentStatus === "PAID") {
      await creditLoyaltyForOrder(tx, id);
    }

    return saved;
  });

  await writeAdminAuditLog({
    actorId,
    action: "order.status",
    entityType: "Order",
    entityId: id,
    beforeData: { status: current.status, paymentStatus: current.paymentStatus },
    afterData: { status: updated.status, paymentStatus: updated.paymentStatus },
  });

  return { id: updated.id, status: updated.status, paymentStatus: updated.paymentStatus };
}

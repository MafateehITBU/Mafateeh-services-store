import "server-only";

import { prisma } from "@/lib/prisma";
import { writeAdminAuditLog } from "@/server/admin/audit";
import { dayRange } from "@/validations/admin-operations";
import type { AccountStatus } from "@/generated/prisma/client";

const pageSize = 12;

export class CustomerRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CustomerRuleError";
  }
}

function personName(user: { firstName: string | null; lastName: string | null; email: string }) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
}

export async function listCustomers(input: {
  q?: string;
  status?: AccountStatus;
  from?: string;
  to?: string;
  page?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const where = {
    role: "CUSTOMER" as const,
    status: input.status,
    createdAt: dayRange(input.from, input.to),
    OR: input.q
      ? [
          { email: { contains: input.q, mode: "insensitive" as const } },
          { phone: { contains: input.q, mode: "insensitive" as const } },
          { firstName: { contains: input.q, mode: "insensitive" as const } },
          { lastName: { contains: input.q, mode: "insensitive" as const } },
        ]
      : undefined,
  };
  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    total,
    customers: rows.map((user) => ({
      id: user.id,
      name: personName(user),
      email: user.email,
      phone: user.phone,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
    })),
  };
}

export async function getCustomer(id: string) {
  const user = await prisma.user.findFirst({
    where: { id, role: "CUSTOMER" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      status: true,
      emailVerifiedAt: true,
      createdAt: true,
      loyaltyWallet: {
        select: {
          pointsBalance: true,
          transactions: {
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
              id: true,
              type: true,
              points: true,
              description: true,
              createdAt: true,
              order: { select: { orderNumber: true } },
            },
          },
        },
      },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          currency: true,
          total: true,
          createdAt: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: personName(user),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    loyalty: user.loyaltyWallet
      ? {
          pointsBalance: user.loyaltyWallet.pointsBalance,
          transactions: user.loyaltyWallet.transactions.map((entry) => ({
            id: entry.id,
            type: entry.type,
            points: entry.points,
            description: entry.description,
            orderNumber: entry.order?.orderNumber ?? null,
            createdAt: entry.createdAt.toISOString(),
          })),
        }
      : null,
    orders: user.orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      total: `${order.currency} ${order.total.toFixed(3)}`,
      createdAt: order.createdAt.toISOString(),
    })),
  };
}

export async function updateCustomerStatus(actorId: string, id: string, status: AccountStatus) {
  const current = await prisma.user.findFirst({
    where: { id, role: "CUSTOMER" },
    select: { id: true, status: true, role: true },
  });

  if (!current) {
    throw new CustomerRuleError("Customer not found.");
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      status,
      deactivatedAt: status === "ACTIVE" ? null : new Date(),
      ...(status === "ACTIVE" ? {} : { sessionVersion: { increment: 1 } }),
    },
    select: { id: true, status: true, role: true },
  });

  if (updated.role !== "CUSTOMER") {
    throw new CustomerRuleError("Customer role cannot be changed.");
  }

  await writeAdminAuditLog({
    actorId,
    action: status === "ACTIVE" ? "customer.activate" : "customer.suspend",
    entityType: "User",
    entityId: id,
    beforeData: { status: current.status },
    afterData: { status: updated.status },
  });

  return { id: updated.id, status: updated.status };
}

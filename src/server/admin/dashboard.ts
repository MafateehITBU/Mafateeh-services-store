import "server-only";

import { prisma } from "@/lib/prisma";

function amount(value: { toFixed(digits: number): string } | null | undefined) {
  return value ? value.toFixed(3) : "0.000";
}

const orderStatuses = ["PENDING_PAYMENT", "PAID", "PROCESSING", "COMPLETED", "CANCELLED", "REFUNDED"] as const;

const paidRevenueWhere = {
  paymentStatus: "PAID" as const,
  status: { notIn: ["CANCELLED" as const, "REFUNDED" as const] },
};

export async function getDashboardOverview() {
  const [
    totalServices,
    publishedServices,
    activeCategories,
    totalCustomers,
    totalOrders,
    pendingOrders,
    completedOrders,
    pendingReviews,
    revenueGroups,
    statusGroups,
    recentOrders,
    recentCustomers,
    serviceSales,
    recentActivity,
  ] = await Promise.all([
    prisma.service.count(),
    prisma.service.count({ where: { isActive: true, publishedAt: { not: null } } }),
    prisma.category.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: { in: ["PENDING_PAYMENT", "PAID", "PROCESSING"] } } }),
    prisma.order.count({ where: { status: "COMPLETED" } }),
    prisma.review.count({ where: { status: "PENDING" } }),
    prisma.order.groupBy({
      by: ["currency"],
      where: paidRevenueWhere,
      _sum: { total: true },
    }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        currency: true,
        total: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: "CUSTOMER" },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, firstName: true, lastName: true, email: true, status: true, createdAt: true },
    }),
    prisma.orderItem.groupBy({
      by: ["serviceId", "currency"],
      where: { serviceId: { not: null }, order: paidRevenueWhere },
      _sum: { quantity: true, lineTotal: true },
    }),
    prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        action: true,
        entityType: true,
        createdAt: true,
        actor: { select: { email: true } },
      },
    }),
  ]);

  const sales = [...serviceSales]
    .filter((row) => row.serviceId)
    .sort((a, b) => (b._sum.quantity ?? 0) - (a._sum.quantity ?? 0))
    .slice(0, 5);
  const names = sales.length
    ? await prisma.orderItem.findMany({
        where: { serviceId: { in: sales.map((row) => row.serviceId!) } },
        select: { serviceId: true, serviceNameSnapshot: true },
        orderBy: { createdAt: "desc" },
        take: 40,
      })
    : [];
  const nameByService = new Map<string, string>();

  for (const row of names) {
    if (row.serviceId && !nameByService.has(row.serviceId)) {
      nameByService.set(row.serviceId, row.serviceNameSnapshot);
    }
  }

  return {
    stats: {
      totalCustomers,
      totalServices,
      publishedServices,
      activeCategories,
      totalOrders,
      pendingOrders,
      completedOrders,
      pendingReviews,
    },
    revenue: revenueGroups.map((row) => ({
      currency: row.currency,
      total: amount(row._sum.total),
    })),
    statusSummary: orderStatuses.map((status) => ({
      status,
      count: statusGroups.find((row) => row.status === status)?._count._all ?? 0,
    })),
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customer: [order.user.firstName, order.user.lastName].filter(Boolean).join(" ") || order.user.email,
      status: order.status,
      total: `${order.currency} ${order.total.toFixed(3)}`,
      createdAt: order.createdAt.toISOString(),
    })),
    recentCustomers: recentCustomers.map((user) => ({
      id: user.id,
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
      email: user.email,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
    })),
    bestServices: sales.map((row) => ({
      id: `${row.serviceId}-${row.currency}`,
      name: nameByService.get(row.serviceId!) ?? "Service",
      currency: row.currency,
      quantity: row._sum.quantity ?? 0,
      total: amount(row._sum.lineTotal),
    })),
    recentActivity: recentActivity.map((entry) => ({
      id: entry.id,
      action: entry.action,
      entityType: entry.entityType,
      actorEmail: entry.actor.email,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}

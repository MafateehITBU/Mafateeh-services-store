import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, describe, it } from "node:test";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { listCartServices } from "@/features/cart/get-cart-services";
import { verifyCustomerCode, requestCustomerCode } from "@/server/auth/customer-otp";
import { updateOrderStatus } from "@/server/admin/orders";
import { creditLoyaltyForOrder } from "@/server/storefront/loyalty";

const stamp = randomUUID().slice(0, 8);
const createdUsers: string[] = [];

async function user(role: "CUSTOMER" | "ADMIN" = "CUSTOMER") {
  const row = await prisma.user.create({
    data: { email: `${role.toLowerCase()}-${stamp}-${randomUUID().slice(0, 8)}@example.test`, role },
    select: { id: true, email: true },
  });
  createdUsers.push(row.id);
  return row;
}

describe("customer codes", () => {
  it("counts parallel wrong guesses once per allowed attempt", async () => {
    const email = `otp-${stamp}@example.test`;
    const challenge = await prisma.emailOtp.create({
      data: {
        email,
        codeHash: "not-a-matching-code",
        purpose: "LOGIN",
        expiresAt: new Date(Date.now() + 60_000),
      },
      select: { id: true },
    });
    const results = await Promise.all(Array.from({ length: 8 }, () => verifyCustomerCode(email, "000000")));
    const stored = await prisma.emailOtp.findUnique({ where: { id: challenge.id }, select: { failedAttempts: true } });

    assert.equal(results.every((result) => result.ok === false), true);
    assert.equal(stored?.failedAttempts, 5);
    await prisma.emailOtp.delete({ where: { id: challenge.id } });
  });

  it("returns the same success shape for an unknown address", async () => {
    const unknown = await requestCustomerCode(`missing-${stamp}@example.test`);
    const again = await requestCustomerCode(`missing-${stamp}-2@example.test`);

    assert.deepEqual(Object.keys(unknown).sort(), Object.keys(again).sort());
    assert.equal(unknown.ok, true);
    assert.equal(again.ok, true);
    await prisma.emailOtp.deleteMany({ where: { email: { contains: stamp } } });
  });
});

describe("stored prices and loyalty", () => {
  it("reads the cart price from the database", async () => {
    const category = await prisma.category.create({
      data: { slug: `cat-${stamp}`, bannerImageUrl: "data:image/png;base64,aa", isActive: true },
      select: { id: true },
    });
    const service = await prisma.service.create({
      data: {
        categoryId: category.id,
        slug: `svc-${stamp}`,
        basePrice: new Prisma.Decimal("12.500"),
        currency: "JOD",
        loyaltyPoints: 4,
        isActive: true,
        publishedAt: new Date(),
      },
      select: { id: true },
    });
    await prisma.serviceTranslation.create({
      data: { serviceId: service.id, locale: "EN", name: "Test service", shortDescription: "Short", detailedDescription: { type: "doc", content: [] } },
    });
    const rows = await listCartServices("en", [service.id]);

    assert.equal(rows[0]?.price, 12.5);
    await prisma.service.delete({ where: { id: service.id } });
    await prisma.category.delete({ where: { id: category.id } });
  });

  it("credits an order once and ignores a zero-point order", async () => {
    const customer = await user();
    const category = await prisma.category.create({
      data: { slug: `loyal-cat-${stamp}`, bannerImageUrl: "data:image/png;base64,aa" },
      select: { id: true },
    });
    const service = await prisma.service.create({
      data: { categoryId: category.id, slug: `loyal-${stamp}`, basePrice: new Prisma.Decimal("1.000"), currency: "JOD", loyaltyPoints: 5 },
      select: { id: true },
    });
    const order = await prisma.order.create({
      data: {
        orderNumber: `T${stamp}`,
        userId: customer.id,
        paymentStatus: "PAID",
        currency: "JOD",
        subtotal: new Prisma.Decimal("2.000"),
        total: new Prisma.Decimal("2.000"),
        items: { create: { serviceId: service.id, serviceNameSnapshot: "Test", unitPrice: new Prisma.Decimal("1.000"), currency: "JOD", quantity: 2, lineTotal: new Prisma.Decimal("2.000") } },
      },
      select: { id: true },
    });
    const empty = await prisma.order.create({
      data: {
        orderNumber: `Z${stamp}`,
        userId: customer.id,
        paymentStatus: "PAID",
        currency: "JOD",
        subtotal: new Prisma.Decimal("0.000"),
        total: new Prisma.Decimal("0.000"),
      },
      select: { id: true },
    });

    await prisma.$transaction(async (tx) => {
      await creditLoyaltyForOrder(tx, order.id);
      await creditLoyaltyForOrder(tx, order.id);
      await creditLoyaltyForOrder(tx, empty.id);
    });
    const wallet = await prisma.loyaltyWallet.findUnique({ where: { userId: customer.id }, select: { pointsBalance: true, transactions: { select: { id: true } } } });

    assert.equal(wallet?.pointsBalance, 10);
    assert.equal(wallet?.transactions.length, 1);
    await prisma.loyaltyTransaction.deleteMany({ where: { orderId: { in: [order.id, empty.id] } } });
    await prisma.loyaltyWallet.deleteMany({ where: { userId: customer.id } });
    await prisma.order.deleteMany({ where: { id: { in: [order.id, empty.id] } } });
    await prisma.service.delete({ where: { id: service.id } });
    await prisma.category.delete({ where: { id: category.id } });
  });

  it("lets only one status change win", async () => {
    const customer = await user();
    const actor = await user("ADMIN");
    const order = await prisma.order.create({
      data: {
        orderNumber: `S${stamp}`,
        userId: customer.id,
        status: "PENDING_PAYMENT",
        paymentStatus: "PENDING",
        currency: "JOD",
        subtotal: new Prisma.Decimal("1.000"),
        total: new Prisma.Decimal("1.000"),
      },
      select: { id: true },
    });
    const results = await Promise.allSettled([
      updateOrderStatus(actor.id, order.id, "CANCELLED"),
      updateOrderStatus(actor.id, order.id, "CANCELLED"),
    ]);
    const saved = await prisma.order.findUnique({ where: { id: order.id }, select: { status: true } });

    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(saved?.status, "CANCELLED");
    await prisma.order.delete({ where: { id: order.id } });
  });
});

after(async () => {
  await prisma.emailOtp.deleteMany({ where: { email: { contains: stamp } } });
  await prisma.adminAuditLog.deleteMany({ where: { actorId: { in: createdUsers } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
  await prisma.$disconnect();
});

import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { listCustomerOrders } from "@/server/storefront/account";
import { Package } from "lucide-react";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";

export const instant = false;

type PageProps = { params: Promise<{ locale: string }> };

const statuses = ["PENDING_PAYMENT", "PAID", "PROCESSING", "COMPLETED", "CANCELLED", "REFUNDED"] as const;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await connection();
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: "Profile" });
  return { title: t("orders") };
}

export default async function OrdersPage({ params }: PageProps) {
  await connection();
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const [t, orders] = await Promise.all([getTranslations("Profile"), listCustomerOrders(locale)]);

  if (!orders) {
    redirect({ href: "/", locale });
    return null;
  }
  const statusLabel: Record<(typeof statuses)[number], string> = {
    PENDING_PAYMENT: t("pendingPayment"),
    PAID: t("paid"),
    PROCESSING: t("processing"),
    COMPLETED: t("completed"),
    CANCELLED: t("cancelled"),
    REFUNDED: t("refunded"),
  };

  return (
    <section>
      <h1 className="text-xl font-bold">{t("orders")}</h1>
      {orders.length === 0 ? (
        <div className="flex flex-col items-center px-4 py-20 text-center text-[#9aa59e]">
          <Package aria-hidden="true" className="size-14 stroke-[1.25]" />
          <p className="mt-4 text-sm">{t("emptyOrders")}</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((order) => (
            <article key={order.id} className="rounded-2xl border border-[#e4ebe6] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{order.orderNumber}</p>
                  <p className="mt-1 text-sm text-[#5d6b62]">{new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", { dateStyle: "medium" }).format(new Date(order.createdAt))}</p>
                </div>
                <span className="rounded-full bg-[#f3f8f4] px-3 py-1 text-xs font-semibold text-[#157037]">{statusLabel[order.status]}</span>
              </div>
              <ul className="mt-4 space-y-2">
                {order.items.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
                    <span>
                      {item.name}
                      <span className="mt-0.5 block text-xs text-[#5d6b62]">{t("quantity", { count: item.quantity })}</span>
                    </span>
                    <span className="font-semibold text-[#d3122a]">{item.total} {item.currency}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-end text-sm font-bold">
                {t("total")}: <span className="text-[#d3122a]">{order.total} {order.currency}</span>
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { listCustomerLoyalty } from "@/server/storefront/account";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";

export const instant = false;

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await connection();
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: "Profile" });
  return { title: t("loyalty") };
}

export default async function LoyaltyPage({ params }: PageProps) {
  await connection();
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const [t, loyalty] = await Promise.all([getTranslations("Profile"), listCustomerLoyalty()]);

  if (!loyalty) {
    redirect({ href: "/", locale });
    return null;
  }

  const labels = {
    EARN: (order: string) => t("earned", { order }),
    REDEEM: () => t("redeemed"),
    ADJUST: () => t("adjusted"),
    EXPIRE: () => t("expired"),
  } satisfies Record<string, (order: string) => string>;

  return (
    <section>
      <h1 className="text-xl font-bold">{t("loyalty")}</h1>
      <p className="mt-6 text-5xl font-bold text-[#157037]">{new Intl.NumberFormat(locale === "ar" ? "ar" : "en").format(loyalty.balance)}</p>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[#5d6b62]">{t("pointsHint")}</p>
      {loyalty.transactions.length === 0 ? (
        <p className="mt-8 text-sm text-[#9aa59e]">{t("noActivity")}</p>
      ) : (
        <ul className="mt-8 divide-y divide-[#eef2ef] rounded-2xl border border-[#e4ebe6] bg-white">
          {loyalty.transactions.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span>
                <span className="block font-semibold">{labels[entry.type](entry.description)}</span>
                <span className="text-xs text-[#5d6b62]">{new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", { dateStyle: "medium" }).format(new Date(entry.createdAt))}</span>
              </span>
              <span className={entry.points > 0 ? "font-bold text-[#157037]" : "font-bold text-[#d3122a]"}>
                {entry.points > 0 ? "+" : ""}
                {new Intl.NumberFormat(locale === "ar" ? "ar" : "en").format(entry.points)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

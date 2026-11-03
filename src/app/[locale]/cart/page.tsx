import { CartView } from "@/components/storefront/cart-view";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { ChevronRight } from "lucide-react";
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

  const t = await getTranslations({ locale, namespace: "Cart" });

  return { title: t("title") };
}

export default async function CartPage({ params }: PageProps) {
  await connection();
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const [store, cart] = await Promise.all([getTranslations("Store"), getTranslations("Cart")]);

  return (
    <article className="mx-auto max-w-[var(--container)] px-4 py-8 md:px-6">
      <nav aria-label={store("breadcrumbs")} className="flex items-center gap-2 text-sm text-[#5d6b62]">
        <Link href="/" className="cursor-pointer font-semibold hover:text-brand">{store("home")}</Link>
        <ChevronRight aria-hidden="true" className="size-3.5 rtl:rotate-180" />
        <span className="text-ink">{cart("title")}</span>
      </nav>
      <CartView locale={locale as AppLocale} />
    </article>
  );
}

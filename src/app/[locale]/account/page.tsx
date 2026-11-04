import { AccountForm } from "@/components/storefront/account-form";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { readCustomerAccount } from "@/server/storefront/account";
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
  return { title: t("myAccount") };
}

export default async function AccountPage({ params }: PageProps) {
  await connection();
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const account = await readCustomerAccount();

  if (!account) {
    redirect({ href: "/", locale });
    return null;
  }

  return <AccountForm {...account} />;
}

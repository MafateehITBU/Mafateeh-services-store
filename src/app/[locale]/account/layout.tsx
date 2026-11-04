import { AccountBreadcrumb, AccountNav } from "@/components/storefront/account-nav";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { readStorefrontCustomer } from "@/server/auth/storefront-user";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { connection } from "next/server";
import { notFound } from "next/navigation";

export const instant = false;

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AccountLayout({ children, params }: LayoutProps) {
  await connection();
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const customer = await readStorefrontCustomer();

  if (!customer) {
    redirect({ href: "/", locale });
  }

  return (
    <div>
      <AccountBreadcrumb />
      <div className="mx-auto grid max-w-[var(--container)] gap-6 px-4 py-8 md:grid-cols-[17rem_minmax(0,1fr)] md:px-6">
        <AccountNav />
        <div>{children}</div>
      </div>
    </div>
  );
}

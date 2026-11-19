import { StorefrontShell } from "@/components/layout/storefront-shell";
import { storefrontFonts } from "@/app/fonts";
import { routing, type AppLocale } from "@/i18n/routing";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { env } from "@/lib/env";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../globals.css";

export const instant = false;

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    metadataBase: new URL(env.SITE_URL),
    title: {
      default: t("title"),
      template: `%s · ${t("title")}`,
    },
    description: t("description"),
  };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className={`${storefrontFonts} h-full`}>
      <body className="flex min-h-full flex-col bg-canvas text-ink antialiased">
        <NextIntlClientProvider>
          <StorefrontShell locale={locale as AppLocale}>{children}</StorefrontShell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

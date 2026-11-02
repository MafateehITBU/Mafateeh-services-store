import { StorefrontShell } from "@/components/layout/storefront-shell";
import { routing, type AppLocale } from "@/i18n/routing";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import "../globals.css";

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
    title: {
      default: t("title"),
      template: `%s · ${t("title")}`,
    },
    description: t("description"),
  };
}

function StorefrontFallback() {
  return (
    <>
      <div
        className="h-[4.5rem] md:h-[5.5rem]"
        style={{
          background: "var(--header-gradient)",
          borderRadius: "0 0 var(--radius-header) var(--radius-header)",
        }}
      />
      <main className="flex-1" />
    </>
  );
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className="h-full">
      <body className="flex min-h-full flex-col bg-canvas text-ink antialiased">
        <NextIntlClientProvider>
          <Suspense fallback={<StorefrontFallback />}>
            <StorefrontShell locale={locale as AppLocale}>{children}</StorefrontShell>
          </Suspense>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

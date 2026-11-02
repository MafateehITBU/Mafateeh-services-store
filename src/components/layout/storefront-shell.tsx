import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { getPublicCategoryTree } from "@/features/categories/get-public-categories";
import type { AppLocale } from "@/i18n/routing";

type StorefrontShellProps = {
  locale: AppLocale;
  children: React.ReactNode;
};

export async function StorefrontShell({ locale, children }: StorefrontShellProps) {
  const catalog = await getPublicCategoryTree(locale);

  return (
    <>
      <SiteHeader categories={catalog.categories} unavailable={catalog.unavailable} />
      <main className="flex-1">{children}</main>
      <SiteFooter locale={locale} />
      <WhatsAppButton />
    </>
  );
}

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { CartProvider } from "@/features/cart/cart-provider";
import { getPublicCategoryTree } from "@/features/categories/get-public-categories";
import type { AppLocale } from "@/i18n/routing";
import { readStorefrontCustomer } from "@/server/auth/storefront-user";

type StorefrontShellProps = {
  locale: AppLocale;
  children: React.ReactNode;
};

export async function StorefrontShell({ locale, children }: StorefrontShellProps) {
  const [catalog, customer] = await Promise.all([getPublicCategoryTree(locale), readStorefrontCustomer()]);

  return (
    <CartProvider>
      <SiteHeader
        categories={catalog.categories}
        unavailable={catalog.unavailable}
        customer={customer ? { firstName: customer.firstName, needsProfile: customer.needsProfile } : null}
      />
      <main className="flex-1">{children}</main>
      <SiteFooter locale={locale} />
      <WhatsAppButton />
    </CartProvider>
  );
}

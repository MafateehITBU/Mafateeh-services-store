"use client";

import { BrandLogo } from "@/components/layout/brand-logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { CartDrawer } from "@/components/storefront/cart-drawer";
import { CategoryDrawer } from "@/components/storefront/category-drawer";
import { SearchPanel } from "@/components/storefront/search-panel";
import { useCart } from "@/features/cart/cart-provider";
import type { PublicCategory } from "@/features/categories/types";
import { Link } from "@/i18n/navigation";
import { Menu, Search, ShoppingBag, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { Suspense, useState } from "react";

type OverlayName = "menu" | "search" | "account" | "cart" | null;

type SiteHeaderProps = {
  categories: PublicCategory[];
  unavailable: boolean;
};

export function SiteHeader({ categories, unavailable }: SiteHeaderProps) {
  const t = useTranslations("Header");
  const cart = useCart();
  const [overlay, setOverlay] = useState<OverlayName>(null);

  function toggle(name: Exclude<OverlayName, null>) {
    cart.close();
    setOverlay((current) => (current === name ? null : name));
  }

  function close() {
    setOverlay(null);
  }

  function toggleCart() {
    setOverlay(null);
    cart.toggle();
  }

  return (
    <>
      <header
        dir="ltr"
        className="sticky top-0 z-40 text-white shadow-[var(--shadow-header)]"
        style={{
          background: "var(--header-gradient)",
          borderRadius: "0 0 var(--radius-header) var(--radius-header)",
        }}
      >
        <div className="mx-auto grid h-[var(--header-height)] w-full max-w-[var(--container)] grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 md:px-6">
          <div className="flex items-center gap-1 justify-self-start md:gap-2">
            <HeaderPlaceholder label={t("account")} note={t("comingSoon")}>
              <UserRound aria-hidden="true" className="size-6" />
            </HeaderPlaceholder>
            <HeaderAction
              label={t("cart")}
              accessibleName={cart.count > 0 ? `${t("cart")}, ${cart.count}` : t("cart")}
              onClick={toggleCart}
            >
              <ShoppingBag aria-hidden="true" className="size-6" />
              {cart.count > 0 ? (
                <span className="absolute top-0.5 right-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-[#dfb026] px-1 text-[10px] font-bold leading-4 text-[#0c3d1e]">
                  {cart.count > 99 ? "99+" : cart.count}
                </span>
              ) : null}
            </HeaderAction>
          </div>

          <Link href="/" className="justify-self-center rounded-2xl">
            <BrandLogo alt={t("logoAlt")} priority />
          </Link>

          <div className="flex items-center justify-end gap-1 justify-self-end md:gap-2">
            <HeaderAction label={t("search")} onClick={() => toggle("search")}>
              <Search aria-hidden="true" className="size-6" />
            </HeaderAction>
            <HeaderAction label={t("menu")} onClick={() => toggle("menu")}>
              <Menu aria-hidden="true" className="size-6" />
            </HeaderAction>
            <Suspense fallback={<span className="inline-flex h-10 w-[4.5rem]" />}>
              <LanguageSwitcher />
            </Suspense>
          </div>
        </div>
      </header>

      <CategoryDrawer
        open={overlay === "menu"}
        onClose={close}
        categories={categories}
        unavailable={unavailable}
      />
      <SearchPanel open={overlay === "search"} onClose={close} />
      <CartDrawer open={cart.open} onClose={cart.close} />
    </>
  );
}

function HeaderPlaceholder({
  label,
  note,
  children,
}: {
  label: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <span
      aria-disabled="true"
      aria-label={`${label}. ${note}`}
      title={`${label}. ${note}`}
      className="inline-flex size-11 cursor-not-allowed items-center justify-center rounded-full text-white/80"
    >
      {children}
    </span>
  );
}

function HeaderAction({
  label,
  accessibleName,
  onClick,
  children,
}: {
  label: string;
  accessibleName?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={accessibleName ?? label}
      onClick={onClick}
      title={label}
      className="relative inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      {children}
    </button>
  );
}

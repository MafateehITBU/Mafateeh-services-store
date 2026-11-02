"use client";

import { BrandLogo } from "@/components/layout/brand-logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { AccountModal } from "@/components/storefront/account-modal";
import { CartDrawer } from "@/components/storefront/cart-drawer";
import { CategoryDrawer } from "@/components/storefront/category-drawer";
import { SearchPanel } from "@/components/storefront/search-panel";
import { Badge } from "@/components/ui/badge";
import type { PublicCategory } from "@/features/categories/types";
import { Link } from "@/i18n/navigation";
import { Menu, Search, ShoppingBag, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { Suspense, useState } from "react";

type OverlayName = "menu" | "search" | "account" | "cart" | null;

type SiteHeaderProps = {
  categories: PublicCategory[];
  unavailable: boolean;
  cartItemCount?: number;
};

export function SiteHeader({
  categories,
  unavailable,
  cartItemCount = 0,
}: SiteHeaderProps) {
  const t = useTranslations("Header");
  const cartLabel = useTranslations("Cart");
  const [overlay, setOverlay] = useState<OverlayName>(null);

  function toggle(name: Exclude<OverlayName, null>) {
    setOverlay((current) => (current === name ? null : name));
  }

  function close() {
    setOverlay(null);
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
        <div className="mx-auto grid h-[4.5rem] w-full max-w-[var(--container)] grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 md:h-[5.5rem] md:px-6">
          <div className="flex items-center gap-1 justify-self-start md:gap-2">
            <HeaderAction label={t("account")} onClick={() => toggle("account")}>
              <UserRound aria-hidden="true" className="size-5" />
            </HeaderAction>
            <HeaderAction
              label={t("cart")}
              accessibleName={
                cartItemCount > 0
                  ? `${t("cart")}, ${cartLabel("countLabel", { count: cartItemCount })}`
                  : t("cart")
              }
              onClick={() => toggle("cart")}
            >
              <span className="relative">
                <ShoppingBag aria-hidden="true" className="size-5" />
                {cartItemCount > 0 ? (
                  <Badge className="absolute -top-2 -right-3">{cartItemCount}</Badge>
                ) : null}
              </span>
            </HeaderAction>
          </div>

          <Link href="/" className="justify-self-center rounded-2xl">
            <BrandLogo alt={t("logoAlt")} priority />
          </Link>

          <div className="flex items-center justify-end gap-1 justify-self-end md:gap-2">
            <HeaderAction label={t("search")} onClick={() => toggle("search")}>
              <Search aria-hidden="true" className="size-5" />
            </HeaderAction>
            <HeaderAction label={t("menu")} onClick={() => toggle("menu")}>
              <Menu aria-hidden="true" className="size-5" />
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
      <AccountModal open={overlay === "account"} onClose={close} />
      <CartDrawer open={overlay === "cart"} onClose={close} />
    </>
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
      className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-2 text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:px-3"
    >
      {children}
      <span aria-hidden="true" className="hidden text-sm font-semibold md:inline">
        {label}
      </span>
    </button>
  );
}

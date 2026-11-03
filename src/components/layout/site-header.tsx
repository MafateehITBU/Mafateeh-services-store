"use client";

import { BrandLogo } from "@/components/layout/brand-logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { AccountModal } from "@/components/storefront/account-modal";
import { CategoryDrawer } from "@/components/storefront/category-drawer";
import { SearchPanel } from "@/components/storefront/search-panel";
import { useCart } from "@/features/cart/cart-provider";
import type { PublicCategory } from "@/features/categories/types";
import { Link } from "@/i18n/navigation";
import { LogOut, Menu, Search, ShoppingBag, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useRef, useState } from "react";

type OverlayName = "menu" | "search" | "account" | null;

type SiteHeaderProps = {
  categories: PublicCategory[];
  unavailable: boolean;
  customer: { firstName: string; needsProfile: boolean } | null;
};

export function SiteHeader({ categories, unavailable, customer }: SiteHeaderProps) {
  const t = useTranslations("Header");
  const account = useTranslations("Account");
  const router = useRouter();
  const cart = useCart();
  const [overlay, setOverlay] = useState<OverlayName>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (overlay !== "account") {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setOverlay(null);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [overlay]);

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
        className="sticky top-0 z-40 overflow-visible text-white shadow-[var(--shadow-header)]"
        style={{
          background: "var(--header-gradient)",
          borderRadius: "0 0 var(--radius-header) var(--radius-header)",
        }}
      >
        <div className="mx-auto grid h-[var(--header-height)] w-full max-w-[var(--container)] grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 md:px-6">
          <div className="flex items-center gap-1 justify-self-start md:gap-2">
            <div ref={accountMenuRef} className="relative flex items-center">
              <HeaderAction
                label={customer?.firstName || t("account")}
                onClick={() => {
                  if (customer && !customer.needsProfile) {
                    setAccountOpen(false);
                    setOverlay((current) => (current === "account" ? null : "account"));
                    return;
                  }
                  setOverlay(null);
                  setAccountOpen(true);
                }}
              >
                <UserRound aria-hidden="true" className="size-6" />
              </HeaderAction>
              {customer?.firstName ? <span className="max-w-28 truncate pe-1 text-sm font-semibold">{customer.firstName}</span> : null}
              {overlay === "account" && customer && !customer.needsProfile ? (
                <div className="absolute top-full left-0 z-50 mt-3 w-56 rounded-2xl border border-[#e4ebe6] bg-white p-2 text-ink shadow-[0_16px_40px_-20px_rgba(12,61,30,0.45)]">
                  <p className="truncate px-3 py-2 text-sm font-bold">{customer.firstName}</p>
                  <button type="button" onClick={() => setOverlay(null)} className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-start text-sm font-semibold hover:bg-[#f3f8f4]">
                    <UserRound aria-hidden="true" className="size-4 text-[#157037]" />
                    {account("profile")}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch("/api/auth/logout", { method: "POST" });
                      setOverlay(null);
                      router.refresh();
                    }}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-start text-sm font-semibold hover:bg-[#f3f8f4]"
                  >
                    <LogOut aria-hidden="true" className="size-4 text-[#157037]" />
                    {account("signOut")}
                  </button>
                </div>
              ) : null}
            </div>
            <Link
              href="/cart"
              aria-label={cart.count > 0 ? `${t("cart")}, ${cart.count}` : t("cart")}
              title={t("cart")}
              className="relative inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <ShoppingBag aria-hidden="true" className="size-6" />
              {cart.count > 0 ? (
                <span className="absolute top-0.5 right-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-[#dfb026] px-1 text-[10px] font-bold leading-4 text-[#0c3d1e]">
                  {cart.count > 99 ? "99+" : cart.count}
                </span>
              ) : null}
            </Link>
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
      <AccountModal open={accountOpen} needsProfile={customer?.needsProfile ?? false} onClose={() => setAccountOpen(false)} />
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
      title={label}
      className="relative inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      {children}
    </button>
  );
}

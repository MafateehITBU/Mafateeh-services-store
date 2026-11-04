"use client";

import { StoredImage } from "@/components/ui/stored-image";
import { BrandLogo } from "@/components/layout/brand-logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { AccountModal } from "@/components/storefront/account-modal";
import { CategoryDrawer } from "@/components/storefront/category-drawer";
import { SearchPanel } from "@/components/storefront/search-panel";
import { useCart } from "@/features/cart/cart-provider";
import type { PublicCategory } from "@/features/categories/types";
import { Link } from "@/i18n/navigation";
import { ChevronDown, LogOut, Menu, Search, ShoppingCart, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useRef, useState } from "react";

type OverlayName = "menu" | "search" | "account" | null;

type SiteHeaderProps = {
  categories: PublicCategory[];
  unavailable: boolean;
  customer: { firstName: string; needsProfile: boolean; avatarUrl: string | null } | null;
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

  useEffect(() => {
    function openSignIn() {
      setOverlay(null);
      setAccountOpen(true);
    }

    window.addEventListener("mafateeh-open-signin", openSignIn);
    return () => window.removeEventListener("mafateeh-open-signin", openSignIn);
  }, []);

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
        <div className="mx-auto grid h-[var(--header-height)] w-full max-w-[var(--container)] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 px-2 sm:px-3 md:gap-2 md:px-6">
          <div className="flex min-w-0 items-center gap-0.5 justify-self-start sm:gap-1 md:gap-2">
            <div ref={accountMenuRef} className="relative flex items-center">
              <button
                type="button"
                aria-label={customer?.firstName || t("account")}
                aria-expanded={overlay === "account"}
                aria-haspopup={customer && !customer.needsProfile ? "menu" : undefined}
                title={customer?.firstName || t("account")}
                onClick={() => {
                  if (customer && !customer.needsProfile) {
                    setAccountOpen(false);
                    setOverlay((current) => (current === "account" ? null : "account"));
                    return;
                  }
                  setOverlay(null);
                  setAccountOpen(true);
                }}
                className="inline-flex min-w-0 cursor-pointer items-center gap-1 rounded-full py-1 pe-1 text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:gap-2 sm:pe-2"
              >
                <span className="inline-flex size-11 shrink-0 items-center justify-center md:size-14">
                  {customer?.avatarUrl ? (
                    <StoredImage src={customer.avatarUrl} alt="" className="size-9 rounded-full md:size-12" />
                  ) : (
                    <UserRound aria-hidden="true" className="size-6 md:size-8" />
                  )}
                </span>
                {customer?.firstName ? (
                  <span className="inline-flex min-w-0 items-end gap-1">
                    <span className="max-w-24 truncate text-base font-bold leading-none sm:max-w-28 md:max-w-36 md:text-lg">{customer.firstName}</span>
                    {!customer.needsProfile ? <ChevronDown aria-hidden="true" className="size-4 shrink-0" /> : null}
                  </span>
                ) : null}
              </button>
              {overlay === "account" && customer && !customer.needsProfile ? (
                <div role="menu" className="absolute top-full left-0 z-50 mt-3 w-56 rounded-2xl border border-[#e4ebe6] bg-white p-2 text-ink shadow-[0_16px_40px_-20px_rgba(12,61,30,0.45)]">
                  <Link href="/account" onClick={() => setOverlay(null)} className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-start text-sm font-semibold hover:bg-[#f3f8f4]">
                    <UserRound aria-hidden="true" className="size-4 text-[#157037]" />
                    {account("profile")}
                  </Link>
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
              className="relative hidden size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:inline-flex md:size-14"
            >
              <ShoppingCart aria-hidden="true" className="size-6 md:size-8" />
              {cart.count > 0 ? (
                <span className="absolute top-0.5 right-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-[#dfb026] px-1 text-[10px] font-bold leading-4 text-[#0c3d1e]">
                  {cart.count > 99 ? "99+" : cart.count}
                </span>
              ) : null}
            </Link>
          </div>

          <Link href="/" className="flex min-w-0 justify-center">
            <BrandLogo alt={t("logoAlt")} priority />
          </Link>

          <div className="flex shrink-0 items-center justify-end gap-0.5 justify-self-end sm:gap-1 md:gap-2">
            <HeaderAction label={t("search")} onClick={() => toggle("search")}>
              <Search aria-hidden="true" className="size-6 md:size-8" />
            </HeaderAction>
            <HeaderAction label={t("menu")} onClick={() => toggle("menu")}>
              <Menu aria-hidden="true" className="size-6 md:size-8" />
            </HeaderAction>
            <Suspense fallback={<span className="hidden h-10 w-[4.5rem] md:inline-flex" />}>
              <span className="hidden md:inline-flex">
                <LanguageSwitcher />
              </span>
            </Suspense>
          </div>
        </div>
      </header>

      <CategoryDrawer
        open={overlay === "menu"}
        onClose={close}
        categories={categories}
        unavailable={unavailable}
        cartCount={cart.count}
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
      className="relative inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:size-14"
    >
      {children}
    </button>
  );
}

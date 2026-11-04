"use client";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { ChevronRight, Gift, Heart, LogOut, Package, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";

const items = [
  { href: "/account/orders", key: "orders", icon: Package },
  { href: "/account/wishlist", key: "wishlist", icon: Heart },
  { href: "/account/loyalty", key: "loyalty", icon: Gift },
  { href: "/account", key: "myAccount", icon: UserRound },
] as const;

export function AccountBreadcrumb() {
  const pathname = usePathname();
  const t = useTranslations("Profile");
  const store = useTranslations("Store");
  const current = items.find((item) => (item.href === "/account" ? pathname === "/account" : pathname === item.href));

  return (
    <div className="bg-[#157037] text-white">
      <nav aria-label={store("breadcrumbs")} className="mx-auto flex max-w-[var(--container)] items-center gap-2 px-4 py-4 text-sm md:px-6">
        <Link href="/" className="cursor-pointer font-semibold text-white/80 hover:text-white">{store("home")}</Link>
        <ChevronRight aria-hidden="true" className="size-3.5 rtl:rotate-180" />
        <Link href="/account" className="cursor-pointer font-semibold text-white/80 hover:text-white">{t("myAccount")}</Link>
        {current && current.href !== "/account" ? (
          <>
            <ChevronRight aria-hidden="true" className="size-3.5 rtl:rotate-180" />
            <span>{t(current.key)}</span>
          </>
        ) : null}
      </nav>
    </div>
  );
}

export function AccountNav() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Profile");

  return (
    <aside className="h-fit rounded-2xl border border-[#e4ebe6] bg-white p-2 shadow-[0_16px_40px_-28px_rgba(12,61,30,0.45)] md:sticky md:top-24">
      <nav className="flex flex-col">
        {items.map((item) => {
          const active = item.href === "/account" ? pathname === "/account" : pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${active ? "bg-[#f3f8f4] text-[#157037]" : "text-ink hover:bg-[#f7faf8]"}`}
            >
              <Icon aria-hidden="true" className="size-4" />
              {t(item.key)}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/");
            router.refresh();
          }}
          className="mt-1 flex cursor-pointer items-center gap-3 rounded-xl border-t border-[#eef2ef] px-3 py-3 text-start text-sm font-semibold text-[#d3122a] hover:bg-[#fff5f5]"
        >
          <LogOut aria-hidden="true" className="size-4" />
          {t("signOut")}
        </button>
      </nav>
    </aside>
  );
}

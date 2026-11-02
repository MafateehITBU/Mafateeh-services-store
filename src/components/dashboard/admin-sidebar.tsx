"use client";

import { adminNav } from "@/components/dashboard/navigation";
import type { AdminPrincipal } from "@/types/admin";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminSidebar({
  user,
  collapsed,
  mobileOpen,
  onLogout,
  onNavigate,
}: {
  user: AdminPrincipal;
  collapsed: boolean;
  mobileOpen: boolean;
  onLogout: () => void;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const items = adminNav.filter((item) => !item.superAdminOnly || user.role === "SUPER_ADMIN");

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-brand-deep text-white transition-transform lg:translate-x-0",
        collapsed && "lg:w-20",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className={cn("flex h-20 items-center px-4", collapsed && "lg:justify-center lg:px-2")}>
        <Link href="/admin" className="inline-flex cursor-pointer items-center" onClick={onNavigate}>
          <Image
            src="/images/logo-white.png"
            alt="Mafateeh"
            width={438}
            height={117}
            priority
            className={cn("h-10 w-auto", collapsed && "lg:h-8")}
          />
        </Link>
      </div>
      <nav aria-label="Administration" className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              title={item.label}
              onClick={onNavigate}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white",
                active && "bg-white/15 text-white",
                collapsed && "lg:justify-center lg:px-2",
              )}
            >
              <Icon aria-hidden="true" className="size-5 shrink-0" />
              <span className={cn(collapsed && "lg:sr-only")}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/15 p-3">
        <button
          type="button"
          onClick={onLogout}
          className={cn(
            "flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white",
            collapsed && "lg:justify-center lg:px-2",
          )}
        >
          <LogOut aria-hidden="true" className="size-5" />
          <span className={cn(collapsed && "lg:sr-only")}>Log out</span>
        </button>
      </div>
    </aside>
  );
}

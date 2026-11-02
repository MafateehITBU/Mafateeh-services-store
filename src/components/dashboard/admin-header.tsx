"use client";

import { AdminBreadcrumbs } from "@/components/dashboard/admin-breadcrumbs";
import { adminPageTitle } from "@/components/dashboard/navigation";
import type { AdminPrincipal } from "@/types/admin";
import { Bell, Menu, PanelLeft, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function roleLabel(role: AdminPrincipal["role"]) {
  return role === "SUPER_ADMIN" ? "Super administrator" : "Administrator";
}

export function AdminHeader({
  user,
  onOpenMobile,
  onToggleCollapse,
  onLogout,
}: {
  user: AdminPrincipal;
  onOpenMobile: () => void;
  onToggleCollapse: () => void;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const title = adminPageTitle(pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const [noticesOpen, setNoticesOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
        setNoticesOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="flex min-h-16 items-center gap-3 px-4 md:px-6">
        <button
          type="button"
          className="inline-flex size-11 cursor-pointer items-center justify-center rounded-xl text-ink hover:bg-canvas-muted lg:hidden"
          aria-label="Open navigation"
          onClick={onOpenMobile}
        >
          <Menu aria-hidden="true" className="size-5" />
        </button>
        <button
          type="button"
          className="hidden size-11 cursor-pointer items-center justify-center rounded-xl text-ink hover:bg-canvas-muted lg:inline-flex"
          aria-label="Collapse navigation"
          onClick={onToggleCollapse}
        >
          <PanelLeft aria-hidden="true" className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <AdminBreadcrumbs items={[{ href: "/admin", label: "Dashboard" }, { label: title }]} />
          <p className="truncate text-base font-semibold text-ink">{title}</p>
        </div>
        <label className="relative hidden w-56 md:block">
          <span className="sr-only">Search</span>
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            disabled
            placeholder="Search is not available yet"
            className="h-11 w-full cursor-not-allowed rounded-full border border-line bg-canvas-muted pr-4 pl-9 text-sm text-muted"
          />
        </label>
        <div ref={menuRef} className="relative flex items-center gap-1">
          <button
            type="button"
            aria-expanded={noticesOpen}
            aria-label="Notifications"
            onClick={() => {
              setNoticesOpen((open) => !open);
              setMenuOpen(false);
            }}
            className="inline-flex size-11 cursor-pointer items-center justify-center rounded-xl text-ink hover:bg-canvas-muted"
          >
            <Bell aria-hidden="true" className="size-5" />
          </button>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => {
              setMenuOpen((open) => !open);
              setNoticesOpen(false);
            }}
            className="inline-flex h-11 max-w-40 cursor-pointer items-center rounded-full border border-line px-3 text-sm font-semibold"
          >
            <span className="truncate">{user.email}</span>
          </button>
          {noticesOpen ? (
            <div className="absolute top-12 right-0 z-20 w-72 rounded-2xl border border-line bg-white p-4 text-sm shadow-[var(--shadow-panel)]">
              <p className="font-semibold text-ink">Notifications</p>
              <p className="mt-2 text-muted">No notifications.</p>
            </div>
          ) : null}
          {menuOpen ? (
            <div role="menu" className="absolute top-12 right-0 z-20 w-64 rounded-2xl border border-line bg-white p-2 shadow-[var(--shadow-panel)]">
              <p className="px-3 py-2 text-xs font-semibold text-muted">{roleLabel(user.role)}</p>
              <button
                type="button"
                role="menuitem"
                onClick={onLogout}
                className="flex min-h-11 w-full cursor-pointer items-center rounded-xl px-3 text-left text-sm font-semibold hover:bg-canvas-muted"
              >
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

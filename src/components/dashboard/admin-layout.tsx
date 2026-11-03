"use client";

import { AdminHeader } from "@/components/dashboard/admin-header";
import { AdminSidebar } from "@/components/dashboard/admin-sidebar";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import type { AdminPrincipal } from "@/types/admin";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

export function AdminLayout({ user, children }: { user: AdminPrincipal; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobilePath, setMobilePath] = useState<string | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const mobileOpen = mobilePath === pathname;

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  async function logout() {
    setConfirmLogout(false);
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.replace("/admin/login?notice=signed-out");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f3f5f4]">
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-brand-deep/45 lg:hidden"
          onClick={() => setMobilePath(null)}
        />
      ) : null}
      <AdminSidebar
        user={user}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onLogout={() => setConfirmLogout(true)}
        onNavigate={() => setMobilePath(null)}
      />
      <div className={cn("min-w-0", collapsed ? "lg:ps-20" : "lg:ps-72")}>
        <AdminHeader
          user={user}
          onOpenMobile={() => setMobilePath(pathname)}
          onToggleCollapse={() => setCollapsed((value) => !value)}
          onLogout={() => setConfirmLogout(true)}
        />
        <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 has-[.homepage-builder]:max-w-none has-[.homepage-builder]:px-4 has-[.homepage-builder]:py-4 md:has-[.homepage-builder]:px-5">{children}</main>
      </div>
      <ConfirmDialog
        open={confirmLogout}
        title="Log out"
        body="This ends the administrator session on this browser."
        confirmLabel="Log out"
        cancelLabel="Stay signed in"
        onConfirm={logout}
        onClose={() => setConfirmLogout(false)}
      />
    </div>
  );
}

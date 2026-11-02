"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { Overlay } from "@/components/ui/overlay";
import { Link } from "@/i18n/navigation";
import { ShoppingBag, X } from "lucide-react";
import { useTranslations } from "next-intl";

type CartDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const t = useTranslations("Cart");

  return (
    <Overlay open={open} onClose={onClose} titleId="cart-drawer-title" align="left">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="cart-drawer-title" className="flex items-center gap-2 text-lg font-bold">
            <ShoppingBag aria-hidden="true" className="size-5 text-brand" />
            {t("title")}
          </h2>
          <IconButton label={t("close")} onClick={onClose} className="text-ink hover:bg-canvas-muted">
            <X aria-hidden="true" className="size-5" />
          </IconButton>
        </div>
        <div className="flex flex-1 items-center px-5 py-8">
          <EmptyState
            title={t("emptyTitle")}
            body={t("emptyBody")}
            action={
              <Link
                href="/"
                onClick={onClose}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-white px-5 text-sm font-semibold text-ink hover:bg-canvas-muted"
              >
                {t("continueShopping")}
              </Link>
            }
          />
        </div>
      </div>
    </Overlay>
  );
}

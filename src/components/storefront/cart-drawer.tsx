"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { Overlay } from "@/components/ui/overlay";
import { useCart } from "@/features/cart/cart-provider";
import { Link } from "@/i18n/navigation";
import { ShoppingBag, X } from "lucide-react";
import { useTranslations } from "next-intl";

type CartDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const t = useTranslations("Cart");
  const { items, count, removeItem } = useCart();

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
        {items.length === 0 ? (
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
        ) : (
          <div className="flex flex-1 flex-col">
            <p className="px-5 pt-4 text-sm text-muted">{t("countLabel", { count })}</p>
            <ul className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {items.map((item) => (
                <li key={item.id} className="rounded-2xl border border-line px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/services/${item.slug}`} onClick={onClose} className="font-semibold text-ink hover:text-brand">
                      {item.name}
                    </Link>
                    <button type="button" onClick={() => removeItem(item.id)} className="cursor-pointer text-sm font-semibold text-[#5d6b62] hover:text-ink">
                      {t("remove")}
                    </button>
                  </div>
                  <p className="mt-2 text-sm font-bold text-[#d3122a]">
                    {item.price} {item.currency}
                    <span className="ms-2 font-semibold text-ink">× {item.quantity}</span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Overlay>
  );
}

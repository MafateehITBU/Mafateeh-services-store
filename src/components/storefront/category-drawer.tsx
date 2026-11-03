"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { Overlay } from "@/components/ui/overlay";
import { StoredImage } from "@/components/ui/stored-image";
import type { PublicCategory } from "@/features/categories/types";
import { Link } from "@/i18n/navigation";
import { LayoutGrid, X } from "lucide-react";
import { useTranslations } from "next-intl";

type CategoryDrawerProps = {
  open: boolean;
  onClose: () => void;
  categories: PublicCategory[];
  unavailable: boolean;
};

export function CategoryDrawer({ open, onClose, categories, unavailable }: CategoryDrawerProps) {
  const t = useTranslations("Menu");

  return (
    <Overlay open={open} onClose={onClose} titleId="category-drawer-title" align="right" closeLabel={t("close")}>
      <div className="flex h-full flex-col bg-white">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="category-drawer-title" className="text-xl font-bold">
            {t("title")}
          </h2>
          <IconButton label={t("close")} onClick={onClose} className="text-ink hover:bg-canvas-muted">
            <X aria-hidden="true" className="size-5" />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto">
          <nav className="px-3 py-2" aria-label={t("title")}>
            {unavailable ? (
              <EmptyState title={t("unavailableTitle")} body={t("unavailableBody")} />
            ) : categories.length === 0 ? (
              <EmptyState title={t("emptyTitle")} body={t("emptyBody")} />
            ) : (
              <ul>
                {categories.map((category) => (
                  <li key={category.id} className="border-b border-line">
                    <Link
                      href={`/categories/${category.slug}`}
                      onClick={onClose}
                      className="flex min-h-[4.5rem] cursor-pointer items-center gap-4 px-3 py-3 transition hover:bg-canvas-muted"
                    >
                      <CategoryThumb src={category.imageUrl} alt="" />
                      <span className="min-w-0 flex-1 text-base font-semibold">{category.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </nav>
        </div>
      </div>
    </Overlay>
  );
}

function CategoryThumb({ src, alt }: { src: string | null; alt: string }) {
  if (!src?.startsWith("data:image/")) {
    return (
      <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-xl bg-canvas-muted text-brand">
        <LayoutGrid aria-hidden="true" className="size-6" />
      </span>
    );
  }

  return <StoredImage src={src} alt={alt} className="size-14 shrink-0 rounded-xl" />;
}

"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { Overlay } from "@/components/ui/overlay";
import type { PublicCategory } from "@/features/categories/types";
import { Link } from "@/i18n/navigation";
import { ChevronDown, Home, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

type CategoryDrawerProps = {
  open: boolean;
  onClose: () => void;
  categories: PublicCategory[];
  unavailable: boolean;
};

export function CategoryDrawer({
  open,
  onClose,
  categories,
  unavailable,
}: CategoryDrawerProps) {
  const t = useTranslations("Menu");

  return (
    <Overlay open={open} onClose={onClose} titleId="category-drawer-title" align="right">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="category-drawer-title" className="text-lg font-bold">
            {t("title")}
          </h2>
          <IconButton label={t("close")} onClick={onClose} className="text-ink hover:bg-canvas-muted">
            <X aria-hidden="true" className="size-5" />
          </IconButton>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label={t("categories")}>
          <Link
            href="/"
            onClick={onClose}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl px-3 font-semibold text-brand hover:bg-canvas-muted"
          >
            <Home aria-hidden="true" className="size-5" />
            {t("home")}
          </Link>
          <p className="mt-5 px-3 text-xs font-bold text-muted">
            {t("categories")}
          </p>
          <div className="mt-2">
            {unavailable ? (
              <EmptyState title={t("unavailableTitle")} body={t("unavailableBody")} />
            ) : categories.length === 0 ? (
              <EmptyState title={t("emptyTitle")} body={t("emptyBody")} />
            ) : (
              <ul className="space-y-1">
                {categories.map((category) => (
                  <CategoryBranch key={category.id} category={category} />
                ))}
              </ul>
            )}
          </div>
        </nav>
      </div>
    </Overlay>
  );
}

function CategoryBranch({ category }: { category: PublicCategory }) {
  const t = useTranslations("Menu");
  const [expanded, setExpanded] = useState(false);
  const hasChildren = category.children.length > 0;

  return (
    <li>
      {hasChildren ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={t(expanded ? "collapse" : "expand", { name: category.title })}
          onClick={() => setExpanded((current) => !current)}
          className="flex min-h-11 w-full cursor-pointer items-center justify-between rounded-2xl px-3 text-start font-medium hover:bg-canvas-muted"
        >
          <span>{category.title}</span>
          <ChevronDown
            aria-hidden="true"
            className={`size-4 text-muted transition ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      ) : (
        <div className="flex min-h-11 items-center rounded-2xl px-3 font-medium">
          {category.title}
        </div>
      )}
      {hasChildren && expanded ? (
        <ul className="ms-4 border-s border-line ps-2">
          {category.children.map((child) => (
            <CategoryBranch key={child.id} category={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

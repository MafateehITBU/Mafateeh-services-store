"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { Overlay } from "@/components/ui/overlay";
import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

type SearchPanelProps = {
  open: boolean;
  onClose: () => void;
};

export function SearchPanel({ open, onClose }: SearchPanelProps) {
  const t = useTranslations("Search");
  const [query, setQuery] = useState("");

  function close() {
    setQuery("");
    onClose();
  }

  return (
    <Overlay open={open} onClose={close} titleId="search-panel-title" align="top">
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 id="search-panel-title" className="text-lg font-bold">
            {t("title")}
          </h2>
          <IconButton label={t("close")} onClick={close} className="text-ink hover:bg-canvas-muted">
            <X aria-hidden="true" className="size-5" />
          </IconButton>
        </div>
        <div className="mt-4 flex min-h-12 items-center gap-2 rounded-full border border-line bg-canvas-muted px-4">
          <Search aria-hidden="true" className="size-5 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={t("placeholder")}
            placeholder={t("placeholder")}
            className="h-11 w-full bg-transparent text-base text-ink outline-none placeholder:text-muted"
            autoComplete="off"
          />
          {query ? (
            <IconButton
              label={t("clear")}
              onClick={() => setQuery("")}
              className="text-muted hover:bg-white"
            >
              <X aria-hidden="true" className="size-4" />
            </IconButton>
          ) : null}
        </div>
        <div className="mt-5">
          <EmptyState title={t("emptyTitle")} body={t("emptyBody")} />
        </div>
      </div>
    </Overlay>
  );
}

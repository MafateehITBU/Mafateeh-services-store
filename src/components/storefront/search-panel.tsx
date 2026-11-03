"use client";

import { IconButton } from "@/components/ui/icon-button";
import { Overlay } from "@/components/ui/overlay";
import { StoredImage } from "@/components/ui/stored-image";
import { Link } from "@/i18n/navigation";
import { Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type SearchResult = {
  slug: string;
  name: string;
  coverImageUrl: string;
  price: string;
  currency: string;
};

export function SearchPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("Search");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  function close() {
    setQuery("");
    setResults([]);
    setStatus("idle");
    onClose();
  }

  useEffect(() => {
    const term = query.trim();

    if (term.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setStatus("loading");
      void fetch(`/api/search?locale=${locale}&q=${encodeURIComponent(term)}`, { signal: controller.signal })
        .then(async (response) => {
          const body = (await response.json()) as { results?: SearchResult[] };
          if (!response.ok) {
            throw new Error("search_failed");
          }
          setResults(body.results ?? []);
          setStatus("ready");
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
          setStatus("error");
        });
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [locale, query]);

  const term = query.trim();

  return (
    <Overlay open={open} onClose={close} titleId="search-panel-title" align="top" closeLabel={t("close")}>
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
            onChange={(event) => {
              setQuery(event.target.value);
              if (event.target.value.trim().length < 2) {
                setResults([]);
                setStatus("idle");
              }
            }}
            aria-label={t("placeholder")}
            placeholder={t("placeholder")}
            className="h-11 w-full bg-transparent text-base text-ink outline-none placeholder:text-muted"
            autoComplete="off"
          />
          {query ? (
            <IconButton label={t("clear")} onClick={() => { setQuery(""); setResults([]); setStatus("idle"); }} className="text-muted hover:bg-white">
              <X aria-hidden="true" className="size-4" />
            </IconButton>
          ) : null}
        </div>
        <div className="mt-5">
          {term.length < 2 ? <p className="text-sm text-muted">{t("hint")}</p> : null}
          {status === "loading" ? <p className="text-sm text-muted">{t("loading")}</p> : null}
          {status === "error" ? <p className="text-sm text-danger">{t("error")}</p> : null}
          {status === "ready" && results.length === 0 ? <p className="text-sm text-muted">{t("none")}</p> : null}
          {results.length > 0 ? (
            <ul className="divide-y divide-line">
              {results.map((result) => (
                <li key={result.slug}>
                  <Link href={`/services/${result.slug}`} onClick={close} className="flex cursor-pointer items-center gap-3 py-3">
                    <StoredImage src={result.coverImageUrl} alt="" className="size-14 shrink-0 rounded-xl" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{result.name}</span>
                      <span className="mt-1 block text-sm text-brand">{result.price} {result.currency}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </Overlay>
  );
}

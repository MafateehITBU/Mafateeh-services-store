"use client";

import { FramedArtwork } from "@/components/ui/framed-artwork";
import { Link } from "@/i18n/navigation";
import { ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

type CategoryCard = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
};

export function CategoryCarousel({ categories }: { categories: CategoryCard[] }) {
  const t = useTranslations("Store");
  const locale = useLocale();
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [pages, setPages] = useState(1);
  const [paused, setPaused] = useState(false);
  const indexRef = useRef(0);
  const startX = useRef<number | null>(null);
  const reduced = useRef(false);

  function measure() {
    const view = viewport.current;
    const card = view?.querySelector<HTMLElement>("[data-card]");

    if (!view || !card) {
      return { step: view?.clientWidth ?? 0, max: 0 };
    }

    const gap = 24;
    const styles = getComputedStyle(view);
    const width = view.clientWidth - Number.parseFloat(styles.paddingLeft) - Number.parseFloat(styles.paddingRight);
    const visible = Math.max(1, Math.round((width + gap) / (card.offsetWidth + gap)));
    return { step: card.offsetWidth + gap, max: Math.max(0, categories.length - visible) };
  }

  function apply(next: number) {
    const { step, max } = measure();
    const clamped = Math.min(Math.max(next, 0), max);
    const sign = locale === "ar" ? 1 : -1;

    if (track.current) {
      track.current.style.transform = `translate3d(${sign * clamped * step}px, 0, 0)`;
    }

    indexRef.current = clamped;
    setIndex(clamped);
    setPages(max + 1);
  }

  const applyRef = useRef(apply);
  const measureRef = useRef(measure);

  useEffect(() => {
    applyRef.current = apply;
    measureRef.current = measure;
  });

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const view = viewport.current;

    if (!view) {
      return;
    }

    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(() => applyRef.current(indexRef.current));
    });
    observer.observe(view);
    return () => observer.disconnect();
  }, [categories.length, locale]);

  useEffect(() => {
    if (pages < 2 || paused || reduced.current) {
      return;
    }

    const timer = window.setInterval(() => {
      const { max } = measureRef.current();
      const next = indexRef.current >= max ? 0 : indexRef.current + 1;

      if (track.current) {
        track.current.style.transitionDuration = reduced.current ? "0ms" : "500ms";
      }

      applyRef.current(next);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [pages, paused, index, locale, categories.length]);

  if (categories.length === 0) {
    return null;
  }

  const atStart = index === 0;
  const atEnd = index >= pages - 1;
  const PreviousIcon = locale === "ar" ? ChevronRight : ChevronLeft;
  const NextIcon = locale === "ar" ? ChevronLeft : ChevronRight;

  function go(next: number) {
    if (track.current) {
      track.current.style.transitionDuration = reduced.current ? "0ms" : "500ms";
    }

    apply(next);
  }

  return (
    <section
      id="service-categories"
      aria-roledescription="carousel"
      aria-labelledby="service-categories-title"
      className="scroll-mt-28 border-0 bg-transparent py-14 shadow-none md:py-16"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(event) => {
        const forward = locale === "ar" ? event.key === "ArrowLeft" : event.key === "ArrowRight";
        const backward = locale === "ar" ? event.key === "ArrowRight" : event.key === "ArrowLeft";

        if (forward) {
          go(index + 1);
        }

        if (backward) {
          go(index - 1);
        }
      }}
      tabIndex={0}
    >
      <div className="mx-auto max-w-[var(--container)] px-4 md:px-6">
        <h2 id="service-categories-title" className="text-center text-3xl font-bold md:text-4xl">{t("categoriesTitle")}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-base leading-7 text-muted">{t("categoriesSubtitle")}</p>
        <div ref={viewport} className="@container mt-8 overflow-hidden border-0 px-4 py-8 shadow-none">
          <div
            ref={track}
            className="flex items-stretch gap-6 border-0 shadow-none transition-transform ease-out motion-reduce:transition-none"
            onTouchStart={(event) => {
              startX.current = event.changedTouches[0]?.clientX ?? null;
              setPaused(true);
            }}
            onTouchEnd={(event) => {
              if (startX.current == null) {
                return;
              }

              const delta = (event.changedTouches[0]?.clientX ?? startX.current) - startX.current;
              const next = locale === "ar" ? delta > 40 : delta < -40;
              const previous = locale === "ar" ? delta < -40 : delta > 40;

              if (next) {
                go(index + 1);
              }

              if (previous) {
                go(index - 1);
              }

              startX.current = null;
              setPaused(false);
            }}
          >
            {categories.map((category) => (
              <div key={category.id} data-card className="flex w-[100cqw] shrink-0 md:w-[calc((100cqw-1.5rem)/2)] xl:w-[calc((100cqw-3rem)/3)]">
                <Link href={`/categories/${category.slug}`} className="flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-3xl border border-brand/20 bg-white shadow-[0_12px_22px_-8px_rgba(12,61,30,0.28)] transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                  {category.imageUrl ? (
                    <FramedArtwork src={category.imageUrl} alt={category.title} className="h-60 w-full" />
                  ) : (
                    <span className="flex h-60 items-center justify-center bg-transparent text-brand">
                      <LayoutGrid aria-hidden="true" className="size-8" />
                    </span>
                  )}
                  <span className="flex flex-1 flex-col p-5">
                    <span className="text-lg font-bold">{category.title}</span>
                    {category.description ? <span className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{category.description}</span> : null}
                  </span>
                </Link>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button type="button" aria-label={t("categoryPrevious")} aria-disabled={atStart} disabled={atStart} onClick={() => go(index - 1)} className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full border border-brand/20 bg-white text-ink disabled:cursor-not-allowed disabled:opacity-40">
            <PreviousIcon aria-hidden="true" className="size-5" />
          </button>
          {Array.from({ length: pages }, (_, page) => (
            <button
              key={page}
              type="button"
              aria-label={t("categoryPage", { index: page + 1 })}
              aria-current={page === index}
              onClick={() => go(page)}
              className={`size-2.5 cursor-pointer rounded-full ${page === index ? "bg-[#ca9733]" : "bg-brand/20"}`}
            />
          ))}
          <button type="button" aria-label={t("categoryNext")} aria-disabled={atEnd} disabled={atEnd} onClick={() => go(index + 1)} className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full border border-brand/20 bg-white text-ink disabled:cursor-not-allowed disabled:opacity-40">
            <NextIcon aria-hidden="true" className="size-5" />
          </button>
        </div>
      </div>
    </section>
  );
}

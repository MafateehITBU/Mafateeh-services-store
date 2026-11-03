"use client";

import { StoredImage } from "@/components/ui/stored-image";
import type { PublicTestimonial } from "@/features/reviews/types";
import { Link } from "@/i18n/navigation";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

export function TestimonialCarousel({ items }: { items: PublicTestimonial[] }) {
  const t = useTranslations("Testimonials");
  const locale = useLocale();
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [pages, setPages] = useState(1);
  const indexRef = useRef(0);
  const startX = useRef<number | null>(null);
  const reduced = useRef(false);

  function measure() {
    const view = viewport.current;
    const card = view?.querySelector<HTMLElement>("[data-card]");

    if (!view || !card) {
      return { visible: 1, step: view?.clientWidth ?? 0, max: 0 };
    }

    const gap = 16;
    const visible = Math.max(1, Math.round((view.clientWidth + gap) / (card.offsetWidth + gap)));
    return { step: card.offsetWidth + gap, max: Math.max(0, items.length - visible) };
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

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const view = viewport.current;
    if (!view) {
      return;
    }
    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(() => apply(indexRef.current));
    });
    observer.observe(view);
    return () => observer.disconnect();
  }, [items.length, locale]);

  if (items.length === 0) {
    return (
      <section aria-labelledby="customer-reviews-title" className="bg-[#f3f8f4] py-12">
        <div className="mx-auto max-w-xl px-4 text-center">
          <h2 id="customer-reviews-title" className="text-3xl font-bold">{t("title")}</h2>
          <p className="mt-3 text-sm leading-6 text-muted">{t("empty")}</p>
        </div>
      </section>
    );
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
      aria-roledescription="carousel"
      aria-labelledby="customer-reviews-title"
      className="bg-[#f3f8f4] py-14 md:py-16"
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
        <h2 id="customer-reviews-title" className="text-center text-3xl font-bold md:text-4xl">{t("title")}</h2>
        <div ref={viewport} className="@container mt-10 overflow-hidden">
          <div
            ref={track}
            className="flex gap-4 transition-transform ease-out motion-reduce:transition-none"
            onTouchStart={(event) => {
              startX.current = event.changedTouches[0]?.clientX ?? null;
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
            }}
          >
            {items.map((item) => (
              <div key={item.id} data-card className="flex w-[100cqw] shrink-0 md:w-[calc((100cqw-1rem)/2)] xl:w-[calc((100cqw-2rem)/3)]">
                <TestimonialCard item={item} />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button type="button" aria-label={t("previous")} aria-disabled={atStart} disabled={atStart} onClick={() => go(index - 1)} className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full border border-brand/20 bg-white text-ink disabled:cursor-not-allowed disabled:opacity-40">
            <PreviousIcon aria-hidden="true" className="size-5" />
          </button>
          {Array.from({ length: pages }, (_, page) => (
            <button
              key={page}
              type="button"
              aria-label={t("page", { index: page + 1 })}
              aria-current={page === index}
              onClick={() => go(page)}
              className={`size-2.5 cursor-pointer rounded-full ${page === index ? "bg-[#ca9733]" : "bg-brand/20"}`}
            />
          ))}
          <button type="button" aria-label={t("next")} aria-disabled={atEnd} disabled={atEnd} onClick={() => go(index + 1)} className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full border border-brand/20 bg-white text-ink disabled:cursor-not-allowed disabled:opacity-40">
            <NextIcon aria-hidden="true" className="size-5" />
          </button>
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({ item }: { item: PublicTestimonial }) {
  const t = useTranslations("Testimonials");
  const initials = item.name.slice(0, 1);

  return (
    <article className="flex h-full min-h-64 flex-col rounded-2xl border border-brand/20 bg-white p-5">
      {item.preview ? <p className="text-xs font-semibold text-brand">{t("preview")}</p> : null}
      <div className="mt-3 flex items-center gap-3">
        {item.avatarUrl ? (
          <StoredImage src={item.avatarUrl} alt="" className="size-12 shrink-0 rounded-full" />
        ) : (
          <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-[#e7f5ec] text-sm font-bold text-brand">{initials}</span>
        )}
        <div>
          <p className="font-bold">{item.name}</p>
          {item.location ? <p className="text-sm text-muted">{item.location}</p> : null}
        </div>
      </div>
      <p className="mt-3 flex gap-1" aria-label={t("stars", { count: item.rating })}>
        {Array.from({ length: 5 }, (_, star) => (
          <Star key={star} aria-hidden="true" className={`size-4 ${star < item.rating ? "fill-[#dfb026] text-[#dfb026]" : "text-line"}`} />
        ))}
      </p>
      <p className="mt-3 flex-1 text-sm leading-7 text-ink">{item.comment}</p>
      {item.serviceHref ? (
        <Link href={item.serviceHref} className="mt-4 cursor-pointer text-sm font-semibold text-brand">
          {t("read")}
        </Link>
      ) : null}
    </article>
  );
}

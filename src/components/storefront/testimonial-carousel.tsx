"use client";

import { Quote, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

const testimonials = {
  en: [
    {
      id: "sara",
      name: "Sara Al-Harbi",
      place: "Riyadh",
      quote: "Finding the right service took minutes. The details were clear, and the order felt straightforward from the first step.",
    },
    {
      id: "omar",
      name: "Omar Khalid",
      place: "Amman",
      quote: "I liked how organized everything is. I could compare what I needed, add it, and know exactly what I was getting.",
    },
    {
      id: "lina",
      name: "Lina Haddad",
      place: "Dubai",
      quote: "The experience feels calm and professional. I knew who to contact, and the service matched what was described.",
    },
    {
      id: "noura",
      name: "Noura Al-Mutairi",
      place: "Jeddah",
      quote: "The service page told me everything I needed before I decided. Nothing felt hidden, and the next step was obvious.",
    },
    {
      id: "youssef",
      name: "Youssef Nasser",
      place: "Cairo",
      quote: "I came back because the first order was simple. The same clear layout made the second one even faster.",
    },
    {
      id: "maya",
      name: "Maya Saleh",
      place: "Kuwait City",
      quote: "It feels like a store that respects your time. I found the service, checked the details, and finished without confusion.",
    },
  ],
  ar: [
    {
      id: "sara",
      name: "سارة الحربي",
      place: "الرياض",
      quote: "العثور على الخدمة المناسبة استغرق دقائق. التفاصيل كانت واضحة، والطلب بدا بسيطًا من الخطوة الأولى.",
    },
    {
      id: "omar",
      name: "عمر خالد",
      place: "عمّان",
      quote: "أعجبني ترتيب كل شيء. استطعت مقارنة ما أحتاجه وإضافته، وأعرف تمامًا ما سأحصل عليه.",
    },
    {
      id: "lina",
      name: "لينا حداد",
      place: "دبي",
      quote: "التجربة هادئة ومهنية. عرفت كيف أتواصل، والخدمة طابقت ما هو موصوف.",
    },
    {
      id: "noura",
      name: "نورة المطيري",
      place: "جدة",
      quote: "صفحة الخدمة أخبرتني بكل ما أحتاجه قبل أن أقرر. لم أشعر أن شيئًا مخفي، والخطوة التالية كانت واضحة.",
    },
    {
      id: "youssef",
      name: "يوسف ناصر",
      place: "القاهرة",
      quote: "عدت لأن الطلب الأول كان بسيطًا. نفس الترتيب الواضح جعل الطلب الثاني أسرع.",
    },
    {
      id: "maya",
      name: "مايا صالح",
      place: "الكويت",
      quote: "يبدو كمتجر يحترم وقتك. وجدت الخدمة، راجعت التفاصيل، وأنهيت دون ارتباك.",
    },
  ],
} as const;

export function TestimonialCarousel() {
  const t = useTranslations("Testimonials");
  const locale = useLocale() === "ar" ? "ar" : "en";
  const items = testimonials[locale];
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

    const gap = 40;
    const styles = getComputedStyle(view);
    const width = view.clientWidth - Number.parseFloat(styles.paddingLeft) - Number.parseFloat(styles.paddingRight);
    const visible = Math.max(1, Math.round((width + gap) / (card.offsetWidth + gap)));
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
  }, [locale]);

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
  }, [pages, paused, index, locale]);

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
      className="overflow-hidden bg-[#f3f8f4] py-14 md:py-16"
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
        <h2 id="customer-reviews-title" className="text-center text-3xl font-bold md:text-4xl">{t("title")}</h2>
        <div ref={viewport} className="@container mt-8 overflow-hidden px-4 py-8">
          <div
            ref={track}
            className="flex items-stretch gap-10 transition-transform ease-out motion-reduce:transition-none"
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
            {items.map((item) => (
              <article
                key={item.id}
                data-card
                dir={locale === "ar" ? "rtl" : "ltr"}
                className="flex w-[100cqw] shrink-0 flex-col rounded-3xl border border-brand/20 bg-white p-6 shadow-[0_12px_22px_-8px_rgba(12,61,30,0.28)] md:w-[calc((100cqw-2.5rem)/2)] xl:w-[calc((100cqw-5rem)/3)]"
              >
                <Quote aria-hidden="true" className="size-8 text-[#dfb026]" />
                <p className="mt-4 flex-1 text-base leading-7 text-ink">{item.quote}</p>
                <p className="mt-5 flex gap-1">
                  <span className="sr-only">{t("stars", { count: 5 })}</span>
                  {Array.from({ length: 5 }, (_, star) => (
                    <Star key={star} aria-hidden="true" className="size-4 fill-[#dfb026] text-[#dfb026]" />
                  ))}
                </p>
                <div className="mt-4 flex items-center gap-3 border-t border-[#eef2ef] pt-4">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-[#157037] text-sm font-bold text-white">{item.name.slice(0, 1)}</span>
                  <div>
                    <p className="font-bold">{item.name}</p>
                    <p className="text-sm text-[#5d6b62]">{item.place}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

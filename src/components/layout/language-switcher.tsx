"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

const labels: Record<AppLocale, "en" | "ar"> = {
  en: "en",
  ar: "ar",
};

export function LanguageSwitcher({ tone = "header" }: { tone?: "header" | "panel" }) {
  const t = useTranslations("Language");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function switchLocale(nextLocale: AppLocale) {
    if (nextLocale === locale) {
      return;
    }

    const query = Object.fromEntries(searchParams.entries());
    router.replace({ pathname, query }, { locale: nextLocale });
  }

  return (
    <div
      role="group"
      aria-label={t("label")}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full",
        tone === "header" ? "h-9 bg-white/15 p-0.5 md:h-10 md:p-1" : "h-10 border border-[#e4ebe6] bg-[#f3f8f4] p-1",
      )}
    >
      {routing.locales.map((item) => {
        const selected = item === locale;
        const languageName = t(item === "ar" ? "arabicName" : "englishName");

        return (
          <button
            key={item}
            type="button"
            aria-pressed={selected}
            aria-label={t("switchTo", { language: languageName })}
            onClick={() => switchLocale(item)}
            className={cn(
              "min-w-8 cursor-pointer rounded-full px-1.5 text-xs font-bold tracking-wide md:min-w-9 md:px-2",
              selected
                ? tone === "header"
                  ? "bg-white text-brand-deep"
                  : "bg-[#157037] text-white"
                : tone === "header"
                  ? "text-white hover:bg-white/10"
                  : "text-ink hover:bg-white",
            )}
          >
            {t(labels[item])}
          </button>
        );
      })}
    </div>
  );
}

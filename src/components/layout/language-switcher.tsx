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

export function LanguageSwitcher() {
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
      className="inline-flex h-10 items-center rounded-full bg-white/15 p-1"
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
              "min-w-9 cursor-pointer rounded-full px-2 text-xs font-bold tracking-wide",
              selected ? "bg-white text-brand-deep" : "text-white hover:bg-white/10",
            )}
          >
            {t(labels[item])}
          </button>
        );
      })}
    </div>
  );
}

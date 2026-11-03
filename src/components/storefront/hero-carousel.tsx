"use client";

import { StoredImage } from "@/components/ui/stored-image";
import { bannerDestinationHref } from "@/features/homepage/banner-destination";
import { useLocale, useTranslations } from "next-intl";

export type HeroBanner = {
  id: string;
  desktopImageUrl: string;
  mobileImageUrl: string | null;
  linkUrl: string | null;
  title: string;
  subtitle: string | null;
  buttonLabel: string | null;
};

export function HeroCarousel({ banners }: { banners: HeroBanner[] }) {
  const t = useTranslations("Store");
  const locale = useLocale();
  const banner = banners[0];

  if (!banner) {
    return null;
  }

  const href = bannerDestinationHref(banner.linkUrl);

  return (
    <section aria-label={t("heroLabel")} className="relative -mt-[var(--header-height)] w-full overflow-hidden bg-[#f7f4ec]">
      <div className="relative aspect-[4/5] w-full md:aspect-[2/1]">
        <StoredImage src={banner.desktopImageUrl} alt="" className="hidden h-full w-full md:block" />
        <StoredImage src={banner.mobileImageUrl || banner.desktopImageUrl} alt="" className="h-full w-full md:hidden" />
        <div className="pointer-events-none absolute inset-0 z-10 flex items-start pt-[calc(var(--header-height)+1.5rem)] md:items-center md:pt-[var(--header-height)]" dir="ltr">
          <div className="mx-auto flex w-full max-w-[var(--container)] px-4 md:px-6">
            <div dir={locale === "ar" ? "rtl" : "ltr"} className="pointer-events-auto w-full text-start md:max-w-[40rem] md:-translate-y-10">
              <h1 className="text-3xl font-bold leading-[1.08] text-ink sm:text-4xl md:text-5xl">{banner.title}</h1>
              {banner.subtitle ? <p className="mt-4 max-w-xl text-base leading-7 text-ink/80 md:text-lg">{banner.subtitle}</p> : null}
              {banner.buttonLabel && href ? (
                <a href={href} className="mt-6 inline-flex min-h-11 cursor-pointer items-center rounded-full bg-[#ca9733] px-6 text-sm font-semibold text-[#0c3d1e] shadow-[0_8px_18px_rgba(202,151,51,0.35)] transition hover:-translate-y-0.5 hover:bg-[#a67b28] hover:shadow-[0_12px_22px_rgba(202,151,51,0.42)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0c3d1e]">
                  {banner.buttonLabel}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

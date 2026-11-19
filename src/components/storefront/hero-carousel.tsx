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
  const mobileImage = banner.mobileImageUrl || banner.desktopImageUrl;
  const copy = (
    <>
      <h1 className="text-[1.7rem] font-bold leading-[1.12] text-ink sm:text-4xl md:text-5xl">{banner.title}</h1>
      {banner.subtitle ? <p className="mt-2 max-w-xl text-sm leading-6 text-ink/80 md:mt-4 md:text-lg md:leading-7">{banner.subtitle}</p> : null}
      {banner.buttonLabel && href ? (
        <a href={href} className="mt-3 inline-flex min-h-10 cursor-pointer items-center rounded-full bg-[#ca9733] px-5 text-sm font-semibold text-[#0c3d1e] shadow-[0_8px_18px_rgba(202,151,51,0.35)] transition hover:-translate-y-0.5 hover:bg-[#a67b28] hover:shadow-[0_12px_22px_rgba(202,151,51,0.42)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0c3d1e] md:mt-6 md:min-h-11 md:px-6">
          {banner.buttonLabel}
        </a>
      ) : null}
    </>
  );

  return (
    <section aria-label={t("heroLabel")} className="relative w-full overflow-hidden bg-[#f7f4ec] md:-mt-[var(--header-height)]">
      <div className="relative aspect-[4/5] w-full md:hidden">
        <StoredImage src={mobileImage} alt="" className="h-full w-full" priority width={1080} height={1350} />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-4 pt-5" dir={locale === "ar" ? "rtl" : "ltr"}>
          <div className="pointer-events-auto">{copy}</div>
        </div>
      </div>
      <div className="relative hidden w-full md:block md:aspect-[2/1]">
        <StoredImage src={banner.desktopImageUrl} alt="" className="h-full w-full" priority width={1600} height={800} />
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center pt-[var(--header-height)]" dir="ltr">
          <div className="mx-auto flex w-full max-w-[var(--container)] px-6">
            <div dir={locale === "ar" ? "rtl" : "ltr"} className="pointer-events-auto max-w-[40rem] -translate-y-10 text-start">
              {copy}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

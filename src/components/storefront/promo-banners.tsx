import { StoredImage } from "@/components/ui/stored-image";
import { isDisplayableImage } from "@/lib/display-image";
import { bannerDestinationHref } from "@/features/homepage/banner-destination";

type Promo = {
  id: string;
  desktopImageUrl: string;
  mobileImageUrl: string | null;
  linkUrl: string | null;
  title: string;
  subtitle: string | null;
  buttonLabel: string | null;
};

export function PromoFeature({ banner, imageFirst }: { banner: Promo; imageFirst: boolean }) {
  const href = bannerDestinationHref(banner.linkUrl);
  const image = (
    <figure className={imageFirst ? "md:order-1" : "md:order-2"}>
      <StoredImage src={banner.desktopImageUrl} alt="" fit="contain" className="hidden w-full md:block" />
      <StoredImage src={banner.mobileImageUrl || banner.desktopImageUrl} alt="" fit="contain" className="w-full md:hidden" />
    </figure>
  );
  const copy = (
    <div className={imageFirst ? "md:order-2" : "md:order-1"}>
      <h2 className="text-balance text-3xl font-bold leading-tight md:text-4xl">{banner.title}</h2>
      {banner.subtitle ? <p className="mt-4 max-w-xl text-base leading-7 text-muted">{banner.subtitle}</p> : null}
      {banner.buttonLabel && href ? (
        <a href={href} className="mt-6 inline-flex min-h-11 cursor-pointer items-center rounded-full bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-rich">
          {banner.buttonLabel}
        </a>
      ) : null}
    </div>
  );

  return (
    <article className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
      {image}
      {copy}
    </article>
  );
}

export function PromoBanners({ banners }: { banners: Promo[] }) {
  const visible = banners.filter((banner) => isDisplayableImage(banner.desktopImageUrl) && banner.title);

  if (visible.length === 0) {
    return null;
  }

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[var(--container)] space-y-16 px-4 py-14 md:px-6 md:py-16">
        {visible.map((banner, index) => (
          <PromoFeature key={banner.id} banner={banner} imageFirst={index % 2 === 1} />
        ))}
      </div>
    </section>
  );
}

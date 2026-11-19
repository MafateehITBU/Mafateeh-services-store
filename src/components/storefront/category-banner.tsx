import { StoredImage } from "@/components/ui/stored-image";
import { isDisplayableImage } from "@/lib/display-image";

export function CategoryBanner({
  title,
  description,
  bannerImageUrl,
  locale,
  brand,
}: {
  title: string;
  description: string | null;
  bannerImageUrl: string | null;
  locale: "en" | "ar";
  brand: string;
}) {
  const hasBanner = isDisplayableImage(bannerImageUrl);

  return (
    <section className="overflow-hidden rounded-3xl bg-[#f4f7f5]">
      <div className="relative">
        {hasBanner ? (
          <StoredImage src={bannerImageUrl} alt="" fit="contain" className="w-full bg-[#f4f7f5]" />
        ) : (
          <div className="min-h-40 bg-[#f4f7f5] md:min-h-56" />
        )}
        <div className={`px-5 py-6 md:px-10 ${hasBanner ? "md:absolute md:inset-y-0 md:right-0 md:flex md:w-[46%] md:items-center md:py-4" : "md:ml-auto md:w-[46%]"}`}>
          <div dir={locale === "ar" ? "rtl" : "ltr"} className="w-full text-start">
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.22em] text-brand">{brand}</p>
            <span className="mt-1.5 block h-0.5 w-8 bg-brand" />
            <h1 className="mt-3 text-2xl font-bold leading-tight text-[#0c3d1e] md:text-3xl xl:text-4xl">{title}</h1>
            {description ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#24342c] md:text-base">{description}</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

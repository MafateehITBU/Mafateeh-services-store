import { Link } from "@/i18n/navigation";
import type { CategorySort } from "@/features/services/get-public-services";
import { ChevronLeft, ChevronRight } from "lucide-react";

function listingHref(slug: string, sort: CategorySort, page: number) {
  const params = new URLSearchParams();

  if (sort !== "featured") {
    params.set("sort", sort);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `/categories/${slug}?${query}` : `/categories/${slug}`;
}

export function CategoryPagination({
  slug,
  sort,
  page,
  pageCount,
  locale,
  labels,
}: {
  slug: string;
  sort: CategorySort;
  page: number;
  pageCount: number;
  locale: "en" | "ar";
  labels: { previous: string; next: string; page: string };
}) {
  if (pageCount < 2) {
    return null;
  }

  const PreviousIcon = locale === "ar" ? ChevronRight : ChevronLeft;
  const NextIcon = locale === "ar" ? ChevronLeft : ChevronRight;
  const pages = pageWindow(page, pageCount);

  return (
    <nav aria-label={labels.page} className="mt-8 flex items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={listingHref(slug, sort, page - 1)} aria-label={labels.previous} className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full border border-[#e4ebe6] bg-white text-ink">
          <PreviousIcon aria-hidden="true" className="size-5" />
        </Link>
      ) : (
        <span aria-disabled="true" className="inline-flex size-11 items-center justify-center rounded-full border border-[#e4ebe6] text-ink opacity-40">
          <PreviousIcon aria-hidden="true" className="size-5" />
        </span>
      )}
      {pages.map((item) => (
        <Link
          key={item}
          href={listingHref(slug, sort, item)}
          aria-label={`${labels.page} ${item}`}
          aria-current={item === page ? "page" : undefined}
          className={`inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-sm font-semibold ${item === page ? "bg-[#157037] text-white" : "border border-[#e4ebe6] bg-white text-ink"}`}
        >
          {item}
        </Link>
      ))}
      {page < pageCount ? (
        <Link href={listingHref(slug, sort, page + 1)} aria-label={labels.next} className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full border border-[#e4ebe6] bg-white text-ink">
          <NextIcon aria-hidden="true" className="size-5" />
        </Link>
      ) : (
        <span aria-disabled="true" className="inline-flex size-11 items-center justify-center rounded-full border border-[#e4ebe6] text-ink opacity-40">
          <NextIcon aria-hidden="true" className="size-5" />
        </span>
      )}
    </nav>
  );
}

function pageWindow(page: number, pageCount: number) {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const start = Math.max(1, Math.min(page - 2, pageCount - 6));
  return Array.from({ length: 7 }, (_, index) => start + index);
}

"use client";

import { usePathname, useRouter } from "@/i18n/navigation";

export function CategoryToolbar({
  sort,
  options,
  sortLabel,
  summary,
}: {
  sort: string;
  options: Array<{ value: string; label: string }>;
  sortLabel: string;
  summary: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-semibold text-ink">{summary}</p>
      <label className="flex items-center gap-2 text-sm text-[#5d6b62]">
        <span>{sortLabel}</span>
        <select
          value={sort}
          aria-label={sortLabel}
          onChange={(event) => {
            const next = event.target.value;
            const params = new URLSearchParams();
            if (next !== "featured") {
              params.set("sort", next);
            }
            const query = params.toString();
            router.push(query ? `${pathname}?${query}` : pathname);
          }}
          className="h-10 cursor-pointer rounded-lg border border-[#e4ebe6] bg-white px-3 text-sm text-ink"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

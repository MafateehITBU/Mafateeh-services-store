import { Star } from "lucide-react";

export function ReviewSummary({
  average,
  count,
  counts,
  basedOn,
  recommendedLabel,
}: {
  average: number;
  count: number;
  counts: number[];
  basedOn: string;
  recommendedLabel: string;
}) {
  const score = Number.isInteger(average) ? String(average) : average.toFixed(1);
  const filled = Math.min(5, Math.max(0, Math.round(average)));
  const recommended = count > 0 ? Math.round((((counts[3] ?? 0) + (counts[4] ?? 0)) / count) * 100) : 0;

  return (
    <div className="flex flex-col gap-8 md:flex-row md:items-center">
      <div className="shrink-0">
        <div className="flex items-center gap-3">
          <p className="text-5xl font-bold leading-none text-[#111827]">{score}</p>
          <p className="flex items-center gap-0.5">
            {Array.from({ length: 5 }, (_, index) => (
              <Star
                key={index}
                aria-hidden="true"
                className={`size-5 ${index < filled ? "fill-[#111827] text-[#111827]" : "fill-transparent text-[#d5d5d5]"}`}
              />
            ))}
          </p>
        </div>
        <p className="mt-2 text-sm text-[#6b7280]">{basedOn}</p>
        <p className="mt-5 text-4xl font-bold leading-none text-[#111827]">{recommended}%</p>
        <p className="mt-2 text-sm text-[#6b7280]">{recommendedLabel}</p>
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        {[5, 4, 3, 2, 1].map((level) => {
          const share = count > 0 ? Math.round((((counts[level - 1] ?? 0) / count) * 100)) : 0;

          return (
            <div key={level} className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <span className="w-4 text-sm font-semibold text-[#111827]">{level}</span>
                <Star aria-hidden="true" className="size-4 shrink-0 fill-[#dfb026] text-[#dfb026]" />
              </span>
              <span className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-[#e6e8ee]">
                <span className="block h-full rounded-full bg-[#111827]" style={{ width: `${share}%` }} />
              </span>
              <span className="w-12 text-end text-sm text-[#8b93a7]">{share}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <article className="rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-soft)]">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-ink">{value.toLocaleString("en-US")}</p>
      {hint ? <p className="mt-2 text-xs text-muted">{hint}</p> : null}
    </article>
  );
}

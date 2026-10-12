export type Column = { label: string; value: number; note?: string };

/** Vertical columns from one baseline, value on the cap, ≤24px bars. */
export function ColumnChart({
  title,
  description,
  columns,
  unit = "%",
  color = "var(--series-1)",
}: {
  title: string;
  description?: string;
  columns: Column[];
  unit?: string;
  color?: string;
}) {
  const max = Math.max(1, ...columns.map((c) => c.value));
  return (
    <figure className="min-w-0">
      <figcaption className="mb-3">
        <span className="font-semibold">{title}</span>
        {description && <span className="block text-sm text-muted">{description}</span>}
      </figcaption>
      <div className="flex h-44 items-end gap-2 border-b border-[var(--viz-axis)] px-1">
        {columns.map((c) => (
          <div key={c.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${c.label}: ${c.value}${unit}${c.note ? ` · ${c.note}` : ""}`}>
            <span className="tabular text-xs font-semibold">
              {c.value}
              {unit}
            </span>
            <span className="block w-full max-w-6 rounded-t-[4px]" style={{ height: `${(c.value / max) * 85}%`, background: color }} aria-hidden="true" />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-2 px-1">
        {columns.map((c) => (
          <div key={c.label} className="flex-1 text-center text-xs text-muted">
            <span className="block">{c.label}</span>
            {c.note && <span className="block">{c.note}</span>}
          </div>
        ))}
      </div>
    </figure>
  );
}

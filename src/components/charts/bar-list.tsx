import { fmt } from "@/lib/format";

export type BarItem = { label: string; value: number; note?: string; color?: string };

/**
 * Horizontal bars from one baseline. Value at the tip (text tokens, never the
 * bar colour), 4px rounded data-end, thin bars, hairline baseline.
 * Every value is printed, so there's nothing a tooltip would hide.
 */
export function BarList({
  title,
  description,
  items,
  format = "number",
  max,
}: {
  title?: string;
  description?: string;
  items: BarItem[];
  format?: "number" | "percent";
  max?: number;
}) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  const show = (v: number) => (format === "percent" ? `${v.toFixed(1)}%` : fmt(v));

  return (
    <figure className="min-w-0">
      {title && (
        <figcaption className="mb-3">
          <span className="font-semibold">{title}</span>
          {description && <span className="block text-sm text-muted">{description}</span>}
        </figcaption>
      )}
      <ul className="space-y-2.5">
        {items.map((it) => (
          <li key={it.label} className="grid grid-cols-[minmax(6rem,9rem)_1fr] items-center gap-3 text-sm" title={`${it.label}: ${show(it.value)}`}>
            <span className="truncate text-ink-2">{it.label}</span>
            <span className="flex items-center gap-2 border-l border-[var(--viz-axis)]">
              <span
                className="block h-3.5 rounded-r-[4px]"
                style={{ width: `${Math.max(0.5, (it.value / top) * 85)}%`, background: it.color ?? "var(--series-1)" }}
                aria-hidden="true"
              />
              <span className="tabular whitespace-nowrap font-semibold">{show(it.value)}</span>
              {it.note && <span className="whitespace-nowrap text-xs text-muted">{it.note}</span>}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

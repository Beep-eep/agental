import { fmt, pct } from "@/lib/format";

export type FunnelStep = { step: string; label: string; count: number; pct_of_first: number | null; pct_of_previous: number | null };

/**
 * Funnel as aligned horizontal bars (no trapezoids: lengths stay comparable).
 * Bar length = share of the first step; the step-to-step conversion is printed
 * beside each bar, and the biggest leak is flagged with text, not colour alone.
 */
export function Funnel({ steps, title, description }: { steps: FunnelStep[]; title: string; description?: string }) {
  const first = steps[0]?.count || 1;
  let worst = -1;
  let worstDrop = 0;
  steps.forEach((s, i) => {
    // Only onboarding steps are product leaks; visits and bookings have their own dynamics.
    if (!["profile", "media", "mandate"].includes(s.step)) return;
    const drop = 100 - (s.pct_of_previous ?? 100);
    if (drop > worstDrop) {
      worstDrop = drop;
      worst = i;
    }
  });

  return (
    <figure className="min-w-0">
      <figcaption className="mb-3">
        <span className="font-semibold">{title}</span>
        {description && <span className="block text-sm text-muted">{description}</span>}
      </figcaption>
      <ol className="space-y-1.5">
        {steps.map((s, i) => {
          // Log-ish scale keeps the late steps visible next to raw visitor counts.
          const width = Math.max(1.5, (Math.log10(s.count + 1) / Math.log10(first + 1)) * 100);
          return (
            <li key={s.step} className="grid grid-cols-[minmax(8rem,11rem)_1fr_auto] items-center gap-3 text-sm">
              <span className="text-ink-2">{s.label}</span>
              <span className="relative h-6">
                <span
                  className="absolute inset-y-0 left-0 rounded-r-[4px]"
                  style={{ width: `${width}%`, background: i === worst ? "var(--series-2)" : "var(--seq-450)" }}
                  aria-hidden="true"
                />
              </span>
              <span className="tabular w-28 text-right">
                <strong>{fmt(s.count)}</strong>
                {i > 0 && <span className="ml-1.5 text-xs text-muted">{pct(s.pct_of_previous)}</span>}
              </span>
              {i === worst && (
                <span className="col-span-3 -mt-1 text-xs font-semibold text-[#b3471d]">
                  Biggest leak: {pct(worstDrop)} stop here
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-xs text-muted">Bar length on a log scale; percentages are conversion from the previous step.</p>
    </figure>
  );
}

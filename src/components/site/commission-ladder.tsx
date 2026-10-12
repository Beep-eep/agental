import type { Plan } from "@/lib/catalog";
import { fmt1 } from "@/lib/format";

/**
 * The agent's commission per plan, drawn as a descending staircase:
 * bar height = share of the fee the agent keeps. Values come from `plans`.
 */
export function CommissionLadder({ plans }: { plans: Plan[] }) {
  const active = plans.filter((p) => p.is_active);
  const max = Math.max(...active.map((p) => p.commission_pct), 1);

  return (
    <figure>
      <div className="flex h-56 items-end gap-3" role="list" aria-label="Agent commission by plan">
        {active.map((p) => (
          <div key={p.tier} role="listitem" className="flex h-full flex-1 flex-col items-center justify-end gap-2">
            <span className="tabular text-sm font-semibold">{fmt1(p.commission_pct)}%</span>
            <div
              className="w-full max-w-14 rounded-t-[4px] bg-ink"
              style={{ height: `${(p.commission_pct / max) * 85}%`, minHeight: "0.75rem" }}
              aria-hidden="true"
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-3 border-t border-line-strong pt-3">
        {active.map((p) => (
          <div key={p.tier} className="flex-1 text-center">
            <span className="block font-semibold">{p.name}</span>
            <span className="tabular block text-sm text-muted">
              {p.monthly_price_eur > 0 ? `€${fmt1(p.monthly_price_eur)}/mo` : "Free"}
            </span>
          </div>
        ))}
      </div>
      <figcaption className="mt-4 text-sm text-muted">Agent commission on your fee, by plan.</figcaption>
    </figure>
  );
}

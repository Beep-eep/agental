import type { Insight } from "@/lib/analytics";

const SEVERITY = {
  warning: { mark: "var(--warn-mark)", label: "Needs attention" },
  opportunity: { mark: "var(--seq-450)", label: "Opportunity" },
  info: { mark: "var(--good-mark)", label: "Working" },
} as const;

/** Rule-based product guidance from analytics_insights(): evidence + a next action. */
export function InsightList({ insights }: { insights: Insight[] }) {
  if (!insights.length) return <p className="text-muted">No signal strong enough to act on yet. Insights appear as data accumulates.</p>;
  return (
    <ol className="divide-y divide-line">
      {insights.map((i) => (
        <li key={i.title} className="py-4">
          <p className="mb-1 flex items-center gap-2 text-sm">
            <span className="status-dot" style={{ background: SEVERITY[i.severity].mark }} aria-hidden="true" />
            <span className="font-semibold">{SEVERITY[i.severity].label}</span>
            <span className="text-muted">{i.area}</span>
          </p>
          <div className="pl-[1.1rem]">
            <p className="font-semibold">{i.title}</p>
            <p className="mt-0.5 text-sm text-muted">{i.detail}</p>
            <p className="mt-2 text-sm">
              <span className="font-semibold">Next step: </span>
              {i.action}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

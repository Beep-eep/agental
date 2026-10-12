import Link from "next/link";

/** One row of date presets above everything it scopes (dataviz filter rule). */
export function PeriodFilter({ days, basePath }: { days: number; basePath: string }) {
  return (
    <nav aria-label="Date range" className="mb-6 flex items-center gap-2">
      <span className="text-sm text-muted">Period</span>
      <div className="flex rounded-full bg-card p-1 ring-1 ring-line">
        {[7, 30, 90].map((d) => (
          <Link
            key={d}
            href={`${basePath}?days=${d}`}
            aria-current={d === days ? "true" : undefined}
            className={`rounded-full px-3 py-1 text-sm ${d === days ? "bg-ink font-semibold text-white" : "text-ink-2 hover:text-ink"}`}
          >
            Last {d} days
          </Link>
        ))}
      </div>
    </nav>
  );
}

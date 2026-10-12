import { shortDate } from "@/lib/format";

export type Cohort = { cohort: string; size: number; retention: (number | null)[] };

// Sequential blue ramp, light -> dark (validated single-hue ramp)
const RAMP = ["#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec", "#5598e7", "#3987e5", "#2a78d6", "#256abf", "#1c5cab", "#184f95", "#104281"];

function cell(v: number) {
  const idx = Math.min(RAMP.length - 1, Math.floor((v / 100) * RAMP.length));
  return { bg: RAMP[idx], fg: idx >= 6 ? "#ffffff" : "var(--ink)" };
}

/** Weekly retention cohorts. Darker = more of the cohort active that week. */
export function CohortHeatmap({ cohorts, title, description }: { cohorts: Cohort[]; title: string; description?: string }) {
  const weeks = Math.max(0, ...cohorts.map((c) => c.retention.length));
  return (
    <figure className="min-w-0">
      <figcaption className="mb-3">
        <span className="font-semibold">{title}</span>
        {description && <span className="block text-sm text-muted">{description}</span>}
      </figcaption>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-[2px] text-xs tabular">
          <thead>
            <tr className="text-muted">
              <th scope="col" className="px-2 py-1 text-left font-medium">Sign-up week</th>
              <th scope="col" className="px-2 py-1 text-right font-medium">Talents</th>
              {Array.from({ length: weeks }, (_, i) => (
                <th key={i} scope="col" className="px-1 py-1 font-medium">
                  W{i}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cohorts.map((c) => (
              <tr key={c.cohort}>
                <th scope="row" className="whitespace-nowrap px-2 py-1 text-left font-medium">
                  {shortDate(c.cohort)}
                </th>
                <td className="px-2 py-1 text-right">{c.size}</td>
                {Array.from({ length: weeks }, (_, i) => {
                  const v = c.retention[i];
                  if (v == null) return <td key={i} />;
                  const { bg, fg } = cell(v);
                  return (
                    <td
                      key={i}
                      className="min-w-10 rounded-[4px] px-1 py-1.5 text-center"
                      style={{ background: bg, color: fg }}
                      title={`Week ${i}: ${v}% of the ${shortDate(c.cohort)} cohort active`}
                    >
                      {Math.round(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">% of each weekly sign-up cohort active in week N (W0 = sign-up week).</p>
    </figure>
  );
}

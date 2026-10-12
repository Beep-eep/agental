import { delta, fmt } from "@/lib/format";

/** label · value · delta vs previous period (direction × good/bad, with an arrow, never colour alone). */
export function StatTile({
  label,
  value,
  previous,
  suffix,
  upIsGood = true,
  hint,
}: {
  label: string;
  value: number | null;
  previous?: number | null;
  suffix?: string;
  upIsGood?: boolean;
  hint?: string;
}) {
  const d = value != null && previous != null ? delta(value, previous) : null;
  const good = d == null ? null : d >= 0 === upIsGood;
  return (
    <div className="bg-card p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold leading-tight">
        {value == null ? "–" : fmt(value)}
        {suffix && value != null && <span className="text-xl">{suffix}</span>}
      </p>
      {d != null ? (
        <p className={`mt-1 text-sm font-medium ${good ? "text-good" : "text-critical"}`}>
          <span aria-hidden="true">{d >= 0 ? "▲" : "▼"}</span> {Math.abs(d).toFixed(0)}%{" "}
          <span className="font-normal text-muted">vs previous period</span>
        </p>
      ) : hint ? (
        <p className="mt-1 text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

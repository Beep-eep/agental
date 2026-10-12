import Link from "next/link";
import type { SampleCasting } from "@/lib/catalog";
import { CATEGORY_LABEL, payRange, shortDate } from "@/lib/format";

const FALLBACK: SampleCasting = {
  id: "sample",
  title: "Commercials — Young parent",
  production: "Regional auto brand",
  category: "commercial",
  city: "Los Angeles",
  pay_min: 900,
  pay_max: 2400,
  pay_unit: "day",
  deadline: null,
  skills_req: ["driving"],
  languages_req: ["Spanish"],
  remote_ok: false,
};

/**
 * Hero signature: the slip a talent receives when the AI finds a role.
 * Shows a real open casting from the database when available.
 */
export function MatchSlip({ casting }: { casting?: SampleCasting }) {
  const c = casting ?? FALLBACK;
  const reasons = [
    `Wants ${CATEGORY_LABEL[c.category].toLowerCase()}`,
    c.remote_ok ? "Self-tape accepted" : `Based in ${c.city}`,
    ...(c.languages_req.length ? [`Speaks ${c.languages_req.join(", ")}`] : []),
    ...(c.skills_req.length ? [`Has ${c.skills_req.join(" + ")}`] : []),
  ].slice(0, 4);

  return (
    <figure className="relative mx-auto w-full max-w-[25rem] rotate-[1.2deg] sm:rotate-[2deg]">
      <div className="slip overflow-hidden text-ink">
        <div className="flex items-center justify-between bg-tungsten px-5 py-2.5 text-ink">
          <span className="text-sm font-semibold">New role for you</span>
          <span className="t-small font-semibold">Preview</span>
        </div>
        <div className="space-y-4 px-5 pb-5 pt-4">
          <div>
            <p className="t-small text-muted">{c.production ?? "Production"}</p>
            <p className="t-h3 mt-0.5">{c.title}</p>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-muted">Pay</dt>
              <dd className="font-semibold tabular">{payRange(c.pay_min, c.pay_max, c.pay_unit)}</dd>
            </div>
            <div>
              <dt className="text-muted">Answer by</dt>
              <dd className="font-semibold">{c.deadline ? shortDate(c.deadline) : "Friday"}</dd>
            </div>
          </dl>
          <div>
            <p className="mb-2 text-sm font-semibold">Why it fits you</p>
            <ul className="flex flex-wrap gap-1.5">
              {reasons.map((r) => (
                <li key={r} className="rounded-full bg-cue-soft px-2.5 py-1 text-xs font-medium text-cue">
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="slip-perf mx-0 flex gap-2 px-5 pb-5 pt-5">
          <Link href="/join" className="btn btn-ink btn-sm flex-1">
            Approve
          </Link>
          <Link href="/join" className="btn btn-line btn-sm flex-1">
            Not for me
          </Link>
        </div>
      </div>
      <figcaption className="mt-4 text-center text-xs text-white/60">
        {casting ? "A real open casting from our board, shown as a member would see it." : "Example of a role proposal."}
      </figcaption>
    </figure>
  );
}

import { PageHeader, Section } from "@/components/app/app-shell";
import { BarList } from "@/components/charts/bar-list";
import { ColumnChart } from "@/components/charts/column-chart";
import { LineChart } from "@/components/charts/line-chart";
import { StatTile } from "@/components/charts/stat-tile";
import { analytics } from "@/lib/analytics";
import { STATUS_LABEL, fmt, fmt1, money, pct } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";

const ADMIN_STATUS: Partial<Record<Enums<"application_status">, string>> = { awaiting_talent: "Awaiting talent", queued: "Queued" };
const ORDER: Enums<"application_status">[] = ["awaiting_talent", "approved", "declined", "queued", "submitted", "callback", "booked", "passed"];

export default async function MarketplacePage() {
  const supabase = await createClient();
  const [sd, pipe, onb, snaps] = await Promise.all([
    analytics.supplyDemand(),
    analytics.pipeline(90),
    analytics.onboarding(),
    supabase.from("kpi_snapshots").select("*").order("day", { ascending: true }).limit(180),
  ]);
  const maxTpc = Math.max(1, ...sd.categories.map((c) => c.talents_per_casting ?? 0));
  const snapRows = snaps.data ?? [];
  const statusCount = Object.fromEntries(pipe.statuses.map((s) => [s.status, s.count]));
  const c = pipe.conversion;

  return (
    <>
      <PageHeader
        title="Marketplace"
        lead="Supabase as the control room for supply and demand: who we represent, what castings ask for, how opportunities are distributed, and where the pipeline stalls."
      />

      <Section
        title="Supply vs demand by casting type"
        description="Supply = represented talents who want this type. Demand = open castings. Under ~6 talents per casting, shortlists run thin."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="py-2 pr-4 font-medium">Casting type</th>
                <th className="py-2 pr-4 text-right font-medium">Talents</th>
                <th className="py-2 pr-4 text-right font-medium">Open castings</th>
                <th className="w-[26%] py-2 pr-4 font-medium">Talents per open casting</th>
                <th className="py-2 pr-4 text-right font-medium">Waitlist interest</th>
                <th className="py-2 pr-4 text-right font-medium">Bookings (90 d)</th>
                <th className="py-2 text-right font-medium">Avg pay</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {sd.categories.map((r) => {
                const thin = r.open_castings >= 3 && (r.talents_per_casting ?? 0) < 6;
                return (
                  <tr key={r.category} className="border-b border-line last:border-0">
                    <th scope="row" className="py-2.5 pr-4 text-left font-semibold">
                      {r.label}
                    </th>
                    <td className="py-2.5 pr-4 text-right">{fmt(r.talents)}</td>
                    <td className="py-2.5 pr-4 text-right">{fmt(r.open_castings)}</td>
                    <td className="py-2.5 pr-4">
                      <span className="flex items-center gap-2">
                        <span
                          className="block h-3 rounded-r-[4px]"
                          style={{
                            width: `${Math.max(2, ((r.talents_per_casting ?? 0) / maxTpc) * 70)}%`,
                            background: thin ? "var(--series-2)" : "var(--series-1)",
                          }}
                          aria-hidden="true"
                        />
                        <span className="whitespace-nowrap">{r.talents_per_casting == null ? "no demand" : fmt1(r.talents_per_casting)}</span>
                        {thin && <span className="whitespace-nowrap text-xs font-semibold text-[#b3471d]">thin supply</span>}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right">{fmt(r.lead_interest)}</td>
                    <td className="py-2.5 pr-4 text-right">{fmt(r.bookings_90d)}</td>
                    <td className="py-2.5 text-right">{r.avg_pay ? money(r.avg_pay) : "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Section title="Talent base over time" description="Daily snapshots written by a pg_cron job.">
          <LineChart
            title="Registered vs represented talents"
            x={snapRows.map((s) => s.day)}
            series={[
              { key: "total", label: "Registered", color: "var(--series-1)", values: snapRows.map((s) => s.talents_total) },
              { key: "active", label: "Represented", color: "var(--series-2)", values: snapRows.map((s) => s.talents_active) },
            ]}
          />
        </Section>
        <Section title="Where the work is" description="Represented talents vs open castings by city.">
          <div className="grid gap-6 sm:grid-cols-2">
            <BarList title="Represented talents" items={sd.cities.map((x) => ({ label: x.city, value: x.talents }))} />
            <BarList title="Open castings" items={sd.cities.map((x) => ({ label: x.city, value: x.open_castings, color: "var(--series-2)" }))} />
          </div>
        </Section>
      </div>

      <h2 className="t-h2 mb-4 mt-10">Submission pipeline · last 90 days</h2>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-line ring-1 ring-line md:grid-cols-4">
        <StatTile label="Talent response rate" value={c.total ? Math.round((100 * c.responded) / c.total) : null} suffix="%" hint={`${fmt(c.responded)} of ${fmt(c.total)} answered`} />
        <StatTile label="Avg time to approve" value={c.avg_hours_to_approval} suffix=" h" hint="From proposal to talent's yes" />
        <StatTile label="Callback rate" value={c.submitted ? Math.round((100 * c.callback) / c.submitted) : null} suffix="%" hint="Of submitted applications" />
        <StatTile label="Bookings" value={c.booked} hint={`Avg match ${c.avg_score_booked ?? "–"} vs ${c.avg_score_passed ?? "–"} when passed`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Section title="Where applications are">
          <BarList items={ORDER.map((s) => ({ label: ADMIN_STATUS[s] ?? STATUS_LABEL[s], value: statusCount[s] ?? 0 }))} />
        </Section>
        <Section title="Does the match score work?" description="Share of submitted applications that got a callback or booking, by score band.">
          <ColumnChart
            title="Positive outcome rate by match score"
            columns={pipe.score_calibration.map((b) => ({ label: b.band, value: b.positive_pct, note: `n=${b.submitted}` }))}
          />
        </Section>
        <Section title="Opportunity distribution" description="Are proposals spread fairly across represented talents?">
          <dl className="space-y-4">
            <div>
              <dt className="text-sm text-muted">Share of applications going to the top 10% of talents</dt>
              <dd className="text-3xl font-semibold">{pct(pipe.fairness.top10_share_pct)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Represented talents with no opportunity in 90 days</dt>
              <dd className="text-3xl font-semibold">{pct(pipe.fairness.zero_opportunity_pct)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Gini coefficient (0 = perfectly even, 1 = one person gets everything)</dt>
              <dd className="text-3xl font-semibold">{pipe.fairness.gini ?? "–"}</dd>
            </div>
          </dl>
        </Section>
      </div>

      <h2 className="t-h2 mb-4 mt-10">Onboarding health</h2>
      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Where talents stop" description={`Median ${onb.median_days_to_mandate ?? "–"} days from sign-up to mandate · average profile strength ${onb.avg_completeness ?? "–"}/100.`}>
          <BarList items={onb.steps.map((s) => ({ label: `${s.step}. ${s.label}`, value: s.count }))} />
        </Section>
        <Section title="Missing profile fields" description="Each missing field lowers match scores. Target these in reminder emails.">
          <BarList
            format="percent"
            max={100}
            items={(["headshot", "bio", "skills", "languages", "categories"] as const).map((k) => ({
              label: k,
              value: onb.missing.total ? (100 * onb.missing[k]) / onb.missing.total : 0,
              note: `${fmt(onb.missing[k])} talents`,
              color: "var(--series-2)",
            }))}
          />
        </Section>
      </div>
    </>
  );
}

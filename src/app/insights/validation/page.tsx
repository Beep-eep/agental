import { PageHeader, Section } from "@/components/app/app-shell";
import { BarList } from "@/components/charts/bar-list";
import { LineChart } from "@/components/charts/line-chart";
import { StatTile } from "@/components/charts/stat-tile";
import { PeriodFilter } from "@/components/insights/period-filter";
import { analytics, parseDays } from "@/lib/analytics";
import { fmt, pct, shortDate, startOfWeek } from "@/lib/format";

const TOPIC_LABEL: Record<string, string> = {
  matching: "Role matching",
  castings: "Castings available",
  self_tape: "Self-tape studio",
  onboarding: "Sign-up & profile",
  pricing: "Plans & pricing",
  payments: "Getting paid",
  other: "Other",
};

export default async function ValidationPage({ searchParams }: PageProps<"/insights/validation">) {
  const days = parseDays((await searchParams).days, 90);
  const [v, f] = await Promise.all([analytics.validation(days), analytics.feedback(days)]);
  // Leave out the week in progress: a partial week reads as a collapse.
  const weekStart = startOfWeek();
  const weeks = v.waitlist_weekly.filter((w) => w.week < weekStart);

  return (
    <>
      <PageHeader
        title="Validation & feedback"
        lead="Is the demand real before revenue? Waitlist momentum, what people ask for, willingness to pay, and what users tell us."
      />
      <PeriodFilter days={days} basePath="/insights/validation" />

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-line ring-1 ring-line md:grid-cols-4">
        <StatTile label="Product-market fit (very disappointed)" value={f.pmf.very_pct} suffix="%" hint={`Benchmark 40% · ${fmt(f.pmf.responses)} answers`} />
        <StatTile label="Net Promoter Score" value={f.nps.score} hint={`${fmt(f.nps.promoters)} promoters · ${fmt(f.nps.detractors)} detractors`} />
        <StatTile label="Lead → account" value={v.lead_conversion_pct} suffix="%" hint="Waitlist emails that created an account" />
        <StatTile label="Casting briefs received" value={v.director_demand.with_brief} hint={`${fmt(v.director_demand.leads)} director leads`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Section title="Waitlist momentum" description="New leads per week, by side of the marketplace.">
          <LineChart
            title="Leads per week (completed weeks)"
            x={weeks.map((w) => w.week)}
            series={[
              { key: "talent", label: "Talents", color: "var(--series-1)", values: weeks.map((w) => w.talent) },
              { key: "director", label: "Directors", color: "var(--series-2)", values: weeks.map((w) => w.director) },
            ]}
          />
        </Section>
        <Section title="What people want to be cast for" description="Interest declared when joining the waitlist. Compare with supply on the Marketplace page.">
          <BarList items={v.interest_by_category.map((c) => ({ label: c.label, value: c.leads }))} />
        </Section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Section title="Willingness to pay" description="Clicks on each plan vs talents currently on it. No payment is taken in the demo.">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm tabular">
              <thead className="text-muted">
                <tr className="border-b border-line">
                  <th className="py-2 pr-4 font-medium">Plan</th>
                  <th className="py-2 pr-4 text-right font-medium">Price</th>
                  <th className="py-2 pr-4 text-right font-medium">Pricing clicks</th>
                  <th className="py-2 text-right font-medium">On this plan</th>
                </tr>
              </thead>
              <tbody>
                {v.plan_interest.map((p) => (
                  <tr key={p.tier} className="border-b border-line last:border-0">
                    <th scope="row" className="py-2.5 pr-4 text-left font-semibold">
                      {p.name}
                    </th>
                    <td className="py-2.5 pr-4 text-right">€{p.price}</td>
                    <td className="py-2.5 pr-4 text-right">{fmt(p.clicks)}</td>
                    <td className="py-2.5 text-right">{fmt(p.subscribers)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted">
            Interest in paid tiers is a signal, not revenue. Charging represented talents is legally sensitive in California; see the
            pricing note.
          </p>
        </Section>
        <Section title="NPS by topic" description="Lowest average = where the product hurts most.">
          <BarList
            max={10}
            items={[...f.topics]
              .sort((a, b) => a.avg_nps - b.avg_nps)
              .map((t) => ({
                label: TOPIC_LABEL[t.topic] ?? t.topic,
                value: t.avg_nps,
                note: `${t.responses} answers · ${pct(t.detractor_pct)} detractors`,
                color: t.avg_nps < 7 ? "var(--series-2)" : "var(--series-1)",
              }))}
          />
        </Section>
      </div>

      <div className="mt-6">
        <Section title="In their words" description="Latest comments. Read these before every planning session.">
          {f.recent.length === 0 ? (
            <p className="text-muted">No comments yet.</p>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {f.recent.map((r, i) => (
                <li key={i} className="rounded-xl bg-paper p-4 ring-1 ring-line">
                  <p className="text-ink">&ldquo;{r.comment}&rdquo;</p>
                  <p className="mt-2 text-xs text-muted">
                    {TOPIC_LABEL[r.topic] ?? r.topic} · score {r.nps}/10 · {shortDate(r.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}

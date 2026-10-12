import { PageHeader, Section } from "@/components/app/app-shell";
import { BarList } from "@/components/charts/bar-list";
import { CohortHeatmap } from "@/components/charts/heatmap";
import { PeriodFilter } from "@/components/insights/period-filter";
import { analytics, parseDays } from "@/lib/analytics";
import { CHANNEL_LABEL, fmt, pct } from "@/lib/format";

export default async function AcquisitionPage({ searchParams }: PageProps<"/insights/acquisition">) {
  const days = parseDays((await searchParams).days, 90);
  const [channels, cohorts, validation] = await Promise.all([analytics.acquisition(days), analytics.cohorts(8), analytics.validation(days)]);
  const ranked = channels.filter((c) => c.signups >= 5);

  return (
    <>
      <PageHeader
        title="Acquisition"
        lead="Where talents come from, and which channels bring people who actually sign the mandate. Attribution is first-touch UTM, stored with each sign-up."
      />
      <PeriodFilter days={days} basePath="/insights/acquisition" />

      <Section title="Channels" description="Activation = share of sign-ups who signed the representation mandate.">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="py-2 pr-4 font-medium">Channel</th>
                <th className="py-2 pr-4 text-right font-medium">Visitors</th>
                <th className="py-2 pr-4 text-right font-medium">Leads</th>
                <th className="py-2 pr-4 text-right font-medium">Talent sign-ups</th>
                <th className="py-2 pr-4 text-right font-medium">Visit → sign-up</th>
                <th className="py-2 pr-4 text-right font-medium">Activation</th>
                <th className="py-2 pr-4 text-right font-medium">Booked talents</th>
                <th className="py-2 text-right font-medium">Directors</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {channels.map((c) => (
                <tr key={c.channel} className="border-b border-line last:border-0">
                  <th scope="row" className="py-2.5 pr-4 text-left font-semibold">
                    {CHANNEL_LABEL[c.channel] ?? c.channel}
                  </th>
                  <td className="py-2.5 pr-4 text-right">{fmt(c.visitors)}</td>
                  <td className="py-2.5 pr-4 text-right">{fmt(c.leads)}</td>
                  <td className="py-2.5 pr-4 text-right">{fmt(c.signups)}</td>
                  <td className="py-2.5 pr-4 text-right">{pct(c.visit_to_signup_pct)}</td>
                  <td className="py-2.5 pr-4 text-right font-semibold">{pct(c.activation_pct)}</td>
                  <td className="py-2.5 pr-4 text-right">{fmt(c.booked_talents)}</td>
                  <td className="py-2.5 text-right">{fmt(c.directors)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Section title="Activation by channel" description="Channels with at least 5 talent sign-ups.">
          <BarList
            format="percent"
            max={100}
            items={[...ranked]
              .sort((a, b) => (b.activation_pct ?? 0) - (a.activation_pct ?? 0))
              .map((c) => ({ label: CHANNEL_LABEL[c.channel] ?? c.channel, value: c.activation_pct ?? 0, note: `${c.activated}/${c.signups}` }))}
          />
        </Section>
        <Section title="Sign-ups by channel">
          <BarList
            items={[...ranked]
              .sort((a, b) => b.signups - a.signups)
              .map((c) => ({ label: CHANNEL_LABEL[c.channel] ?? c.channel, value: c.signups }))}
          />
        </Section>
      </div>

      <div className="mt-6">
        <Section title="Retention" description="Do talents come back? Weekly cohorts by sign-up week.">
          <CohortHeatmap title="Weekly active talents, by sign-up cohort" cohorts={cohorts} />
        </Section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Section title="Most visited pages">
          <BarList items={validation.top_pages.map((p) => ({ label: p.path, value: p.views, note: `${fmt(p.sessions)} sessions` }))} />
        </Section>
        <Section title="Devices" description="Plan the self-tape studio and sign-up for the device people actually use.">
          <BarList items={[...validation.devices].sort((a, b) => b.sessions - a.sessions).map((d) => ({ label: d.device, value: d.sessions }))} />
        </Section>
      </div>
    </>
  );
}

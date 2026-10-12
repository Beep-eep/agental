import { PageHeader, Section } from "@/components/app/app-shell";
import { Funnel } from "@/components/charts/funnel";
import { LineChart } from "@/components/charts/line-chart";
import { StatTile } from "@/components/charts/stat-tile";
import { InsightList } from "@/components/insights/insight-list";
import { LiveFeed, type FeedItem } from "@/components/insights/live-feed";
import { PeriodFilter } from "@/components/insights/period-filter";
import { analytics, parseDays } from "@/lib/analytics";
import { fmt, pct } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function InsightsOverview({ searchParams }: PageProps<"/insights">) {
  const days = parseDays((await searchParams).days);
  const supabase = await createClient();

  const [o, ts, funnel, insights, recentLeads, recentSignups] = await Promise.all([
    analytics.overview(days),
    analytics.timeseries(days),
    analytics.funnel(days),
    analytics.insights(),
    supabase.from("leads").select("id, kind, company, created_at").order("created_at", { ascending: false }).limit(6),
    supabase.from("events").select("id, name, path, created_at").eq("name", "sign_up").order("created_at", { ascending: false }).limit(6),
  ]);

  const feed: FeedItem[] = [
    ...(recentLeads.data ?? []).map((l) => ({
      id: `l${l.id}`,
      at: l.created_at,
      kind: "lead" as const,
      text: l.kind === "director" ? `Casting brief from ${l.company ?? "a director"}` : "New waitlist email",
    })),
    ...(recentSignups.data ?? []).map((e) => ({ id: `e${e.id}`, at: e.created_at, kind: "signup" as const, text: "New account created" })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const x = ts.map((d) => d.day);

  return (
    <>
      <PageHeader
        title="Overview"
        lead={`${fmt(o.totals.represented)} represented talents of ${fmt(o.totals.talents)} registered, ${fmt(o.totals.directors)} casting directors, ${fmt(o.totals.open_castings)} open castings.`}
      />
      <PeriodFilter days={days} basePath="/insights" />

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-line ring-1 ring-line md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Visitors" value={o.visitors.current} previous={o.visitors.previous} />
        <StatTile label="Leads captured" value={o.leads.current} previous={o.leads.previous} />
        <StatTile label="Sign-ups" value={o.signups.current} previous={o.signups.previous} />
        <StatTile label="Mandates signed" value={o.activated.current} previous={o.activated.previous} />
        <StatTile label="Applications" value={o.applications.current} previous={o.applications.previous} />
        <StatTile label="Bookings" value={o.bookings.current} previous={o.bookings.previous} />
      </div>
      <p className="mb-8 mt-3 text-sm text-muted">
        Visitor → sign-up {pct(o.visitor_to_signup_pct)} · sign-up → mandate {pct(o.signup_to_active_pct)} · NPS{" "}
        {o.nps.score ?? "–"} ({fmt(o.nps.responses)} answers) · {o.pmf_very_pct ?? "–"}% &quot;very disappointed&quot; without Agental
      </p>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Section title="What to do next" description="Generated in SQL from the numbers on these pages; every item names its evidence.">
          <InsightList insights={insights} />
        </Section>
        <Section title="Live activity" description="Streaming from Postgres through Supabase Realtime.">
          <LiveFeed initial={feed} />
        </Section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Section title="Traffic">
          <LineChart
            title="Unique visitors per day"
            x={x}
            series={[{ key: "visitors", label: "Visitors", color: "var(--series-1)", values: ts.map((d) => d.visitors) }]}
          />
        </Section>
        <Section title="Conversion">
          <LineChart
            title="Sign-ups, mandates and bookings per day"
            x={x}
            series={[
              { key: "signups", label: "Sign-ups", color: "var(--series-1)", values: ts.map((d) => d.signups) },
              { key: "activated", label: "Mandates", color: "var(--series-2)", values: ts.map((d) => d.activated) },
              { key: "bookings", label: "Bookings", color: "var(--series-3)", values: ts.map((d) => d.bookings) },
            ]}
          />
        </Section>
      </div>

      <div className="mt-6">
        <Section title="Talent funnel" description={`People who arrived in the last ${days} days, from first visit to first booking.`}>
          <Funnel title="From visit to booking" steps={funnel} />
        </Section>
      </div>
    </>
  );
}

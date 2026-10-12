import Link from "next/link";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { MatchSlip } from "@/components/site/match-slip";
import { CommissionLadder } from "@/components/site/commission-ladder";
import { getCastingTypes, getLatestOpenCastings, getOpenCastingStats, getPlans } from "@/lib/catalog";
import { payRange } from "@/lib/format";

export const revalidate = 300;

const STEPS = [
  { title: "Create your profile", body: "Identity, look, languages, skills and availability. A few minutes; the headshot can wait." },
  { title: "Sign your mandate", body: "A written representation agreement. Free, and you can end it whenever you want." },
  { title: "Let the AI watch", body: "It reads new castings around the clock and keeps only the ones that fit you." },
  { title: "Approve each proposal", body: "Nothing is ever sent in your name without your yes. Edit the note, then approve." },
  { title: "Land the role", body: "We follow up, negotiate, check the contract and make sure you get paid." },
];

export default async function HomePage() {
  const [castings, plans, types, stats] = await Promise.all([
    getLatestOpenCastings(1),
    getPlans(),
    getCastingTypes(),
    getOpenCastingStats(),
  ]);

  return (
    <>
      {/* Hero ------------------------------------------------------------ */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 -top-40 h-[42rem] w-[42rem] rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--tungsten) 0%, transparent 65%)" }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-16 sm:px-6 md:grid-cols-[1.25fr_1fr] md:pb-28 md:pt-24">
          <div>
            <p className="mb-6 text-white/70">The artist agency that works while you perform.</p>
            <h1 className="t-hero">
              Focus on your craft.
              <br />
              We handle the rest.
            </h1>
            <p className="t-lead mt-7 max-w-xl text-white/80">
              A real agent who represents you, and an AI that watches castings 24/7, prepares your applications and follows up.
              Background, walk-ons, commercials, voice, content: we find the roles made for you.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <TrackedLink href="/join" event="cta_click" props={{ cta: "hero_join" }} className="btn btn-spot">
                Become a member
              </TrackedLink>
              <Link href="/how-it-works" className="btn border-[1.5px] border-white/30 text-white hover:border-white">
                See how it works
              </Link>
            </div>
            <p className="mt-5 text-sm text-white/60">Free mandate. No commitment. Cancel whenever you want.</p>
          </div>
          <MatchSlip casting={castings[0]} />
        </div>
      </section>

      {/* Promises -------------------------------------------------------- */}
      <section className="border-b border-line bg-card">
        <dl className="mx-auto grid max-w-6xl divide-y divide-line px-4 sm:px-6 md:grid-cols-3 md:divide-x md:divide-y-0">
          {[
            ["A signed mandate", "A written representation agreement, like any artist with an agent."],
            ["An AI that never sleeps", "Casting watch, applications and follow-ups while you are on set."],
            ["Free to get started", "Representation costs nothing. We earn when you work."],
          ].map(([t, d]) => (
            <div key={t} className="py-7 md:px-8 md:first:pl-0 md:last:pr-0">
              <dt className="t-h3">{t}</dt>
              <dd className="mt-2 text-muted">{d}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Live board ------------------------------------------------------ */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="t-h1">Roles open right now</h2>
            <p className="t-lead mt-4 text-muted">
              {stats
                ? `${stats.open} castings are open on the board today. Pick a world; the matching does the sorting.`
                : "Whatever your profile, there's a place. Pick a world; the matching does the sorting."}
            </p>
            <Link href="/castings" className="btn btn-line mt-7">
              Browse casting types
            </Link>
          </div>
          <ul className="divide-y divide-line border-y border-line">
            {types.map((t) => (
              <li key={t.category}>
                <Link
                  href={`/castings/${t.slug}`}
                  className="group grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1 py-4 sm:grid-cols-[1fr_auto_4.5rem]"
                >
                  <span className="text-lg font-semibold group-hover:text-cue">{t.label}</span>
                  <span className="tabular text-sm text-muted">{payRange(t.pay_min, t.pay_max, t.pay_unit)}</span>
                  <span className="tabular hidden text-right text-sm sm:block">
                    {stats ? (
                      <>
                        <strong>{stats.byCategory[t.category] ?? 0}</strong> open
                      </>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Steps ----------------------------------------------------------- */}
      <section className="bg-card">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="t-h1 max-w-2xl">Joining Agental, in five steps</h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-5 md:gap-6">
            {STEPS.map((s, i) => (
              <li key={s.title} className="border-t-2 border-ink pt-4">
                <span className="font-[family-name:var(--font-display)] text-4xl font-extrabold text-tungsten-deep tabular">
                  {i + 1}
                </span>
                <h3 className="mt-2 font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Self-tape -------------------------------------------------------- */}
      <section className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 md:grid-cols-2 md:items-center">
        <div>
          <h2 className="t-h1">Your self-tape can change everything</h2>
          <p className="t-lead mt-5 text-muted">
            The built-in studio works with you during the take: framing, light, sound and the rhythm of the performance. Record
            several versions, compare, keep the best. It runs on a basic phone and a slow connection.
          </p>
        </div>
        <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line text-center">
          {[
            ["Framing", "Eyes on the upper third"],
            ["Light", "Face lit, no hard shadows"],
            ["Sound", "No clipping, room tone checked"],
            ["Performance", "Pace matched to the brief"],
          ].map(([t, d]) => (
            <li key={t} className="bg-card px-4 py-8">
              <span className="t-h3 block">{t}</span>
              <span className="mt-1 block text-sm text-muted">{d}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Commission ladder ---------------------------------------------- */}
      <section className="border-y border-line bg-card">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 md:grid-cols-[1fr_1.2fr] md:items-end">
          <div>
            <h2 className="t-h1">The further you go, the more you keep</h2>
            <p className="t-lead mt-5 text-muted">
              Representation stays free. Optional plans add tools and lower the agent&apos;s commission, so our model is aligned
              with your success.
            </p>
            <Link href="/pricing" className="btn btn-line mt-7">
              Compare plans
            </Link>
          </div>
          <CommissionLadder plans={plans} />
        </div>
      </section>

      {/* Adults first -------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid gap-8 md:grid-cols-[1fr_2fr]">
          <h2 className="t-h2">Adults first, minors with care</h2>
          <p className="prose-measure text-ink-2">
            This first version represents talents aged 18 and over; the database refuses younger birth dates. Children and teens
            will come with their own protective framework: parental consent, a parent on set, script review and protected
            earnings, handled case by case as the law requires.
          </p>
        </div>
      </section>

      {/* Final CTA ---------------------------------------------------------- */}
      <section className="bg-tungsten">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="t-h1">Ready to be represented?</h2>
            <p className="mt-2 text-ink-2">Creating your profile takes a few minutes. Your talent deserves an agent who works for you.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <TrackedLink href="/join" event="cta_click" props={{ cta: "footer_join" }} className="btn btn-ink">
              Become a member
            </TrackedLink>
            <Link href="/faq" className="btn border-[1.5px] border-ink/40 hover:border-ink">
              Ask a question
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

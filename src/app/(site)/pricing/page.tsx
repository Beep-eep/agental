import type { Metadata } from "next";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { CommissionLadder } from "@/components/site/commission-ladder";
import { getPlans } from "@/lib/catalog";
import { fmt1 } from "@/lib/format";

export const metadata: Metadata = { title: "Pricing" };
export const revalidate = 300;

export default async function PricingPage() {
  const plans = (await getPlans()).filter((p) => p.is_active);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
      <div className="grid gap-12 md:grid-cols-[1.2fr_1fr] md:items-end">
        <div>
          <h1 className="t-h1">Representation is free. Tools are optional.</h1>
          <p className="t-lead mt-5 text-muted">
            Your plan and your agent&apos;s commission are two separate things. Choose a plan for more tools, and the commission on
            your fees goes down at the same time.
          </p>
        </div>
        <CommissionLadder plans={plans} />
      </div>

      <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => (
          <section key={p.tier} aria-labelledby={`plan-${p.tier}`} className="flex flex-col bg-card p-6">
            <h2 id={`plan-${p.tier}`} className="t-h2">
              {p.name}
            </h2>
            <p className="mt-1 text-sm text-muted">{p.tagline}</p>
            <p className="mt-5">
              <span className="font-[family-name:var(--font-display)] text-5xl font-extrabold tabular">
                €{fmt1(p.monthly_price_eur)}
              </span>
              <span className="text-muted"> / month</span>
            </p>
            <p className="mt-1 text-sm">
              <strong className="tabular">{fmt1(p.commission_pct)}%</strong> commission on bookings
            </p>
            <ul className="mt-5 flex-1 space-y-2 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <svg viewBox="0 0 16 16" className="mt-1 h-3.5 w-3.5 flex-none" aria-hidden="true">
                    <path d="M3 8.5l3 3 7-7" fill="none" stroke="var(--good)" strokeWidth="2" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <TrackedLink
              href={`/join?plan=${p.tier}`}
              event="plan_interest"
              props={{ tier: p.tier }}
              className={`btn mt-6 ${p.tier === "free" ? "btn-spot" : "btn-line"}`}
            >
              {p.tier === "free" ? "Start free" : `Choose ${p.name}`}
            </TrackedLink>
          </section>
        ))}
      </div>
      <p className="mt-5 max-w-3xl text-sm text-muted">
        Demo note: paid plans are shown to measure interest. In California, fees charged to represented artists are regulated
        (Labor Code §1700.40 and the Fee-Related Talent Services rules), so paid tiers stay switched off in production until
        counsel signs off. Each plan can be paused from the admin catalog.
      </p>
    </div>
  );
}

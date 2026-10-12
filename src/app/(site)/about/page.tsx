import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "About us" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
      <div className="grid gap-12 md:grid-cols-[1fr_1.3fr]">
        <h1 className="t-h1">Most performers have never had an agent. We are changing that.</h1>
        <div className="space-y-5 text-lg text-ink-2 prose-measure">
          <p>
            Conventional agencies can only take on a few artists. Everyone else applies alone, sorts listings at night and pays
            for platforms that send them roles they will never get.
          </p>
          <p>
            Agental represents the profiles others leave aside, with the same standards and a real written mandate. Software does
            the repetitive work, so a human agent can look after many more people well.
          </p>
          <p>
            We build with three rules: the talent decides, every decision is recorded, and we only claim what we can measure.
          </p>
        </div>
      </div>

      <dl className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
        {[
          ["The talent decides", "Nothing is submitted without an explicit yes, enforced in the database, not just the interface."],
          ["Everything is recorded", "Consents and status changes are append-only, so we can show who decided what, and when."],
          ["We measure before we claim", "Response rates and outcomes come from real submissions. Goals are labelled as goals."],
        ].map(([t, d]) => (
          <div key={t} className="bg-card p-6">
            <dt className="t-h3">{t}</dt>
            <dd className="mt-2 text-muted">{d}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link href="/join" className="btn btn-spot">
          Become a member
        </Link>
        <Link href="/directors" className="btn btn-line">
          I&apos;m a casting director
        </Link>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { BriefForm } from "./brief-form";

export const metadata: Metadata = { title: "For casting directors" };

const HOW = [
  ["Send a brief", "In a sentence, or post a full casting from your free studio account."],
  ["Get a ranked shortlist", "Represented talents only, each with the reasons they fit: city, languages, skills, availability."],
  ["Talents confirm", "Every talent approves before being presented, so you only see people who are available and willing."],
  ["Call back and book", "Mark callbacks and bookings in your studio; the agent handles contracts and follow-up."],
];

export default function DirectorsPage() {
  return (
    <>
      <section className="bg-ink text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1.3fr_1fr] md:items-end md:py-24">
          <div>
            <p className="mb-5 text-white/70">For casting directors and producers</p>
            <h1 className="t-hero">Real people, ready to shoot.</h1>
            <p className="t-lead mt-6 max-w-xl text-white/80">
              Background, walk-ons, commercials, voice and creators: a shortlist of represented talents who have already said yes,
              with the reasons each one fits.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Link href="#brief" className="btn btn-spot">
              Send a brief
            </Link>
            <Link href="/join?role=director" className="btn border-[1.5px] border-white/30 text-white hover:border-white">
              Create a studio account
            </Link>
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <h2 className="t-h1">How shortlists work</h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-4">
          {HOW.map(([t, d], i) => (
            <li key={t} className="border-t-2 border-ink pt-4">
              <span className="font-[family-name:var(--font-display)] text-4xl font-extrabold text-tungsten-deep tabular">{i + 1}</span>
              <h3 className="mt-2 font-semibold">{t}</h3>
              <p className="mt-1.5 text-sm text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="brief" className="scroll-mt-20 border-t border-line bg-card">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 md:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="t-h1">Send a brief</h2>
            <p className="t-lead mt-4 text-muted">Free during the pilot. A person reads every brief and replies within one working day.</p>
            <p className="mt-6 text-sm text-muted">
              Prefer to self-serve?{" "}
              <Link href="/join?role=director" className="font-semibold text-cue hover:underline">
                Open a studio account
              </Link>{" "}
              to post castings and see live matches.
            </p>
          </div>
          <BriefForm />
        </div>
      </section>
    </>
  );
}

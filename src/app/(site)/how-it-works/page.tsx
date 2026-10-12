import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "How it works" };

const FLOW = [
  {
    title: "You create your profile",
    body: "Identity, look, languages, skills, availability, and the casting types you want or refuse. We only ask for what helps us match you.",
    data: "Saved to your private profile. Only you and your agent can read it.",
  },
  {
    title: "You sign the representation mandate",
    body: "A written agreement that lets Agental represent you. It's free, it's versioned, and you can withdraw it at any time.",
    data: "Every consent is recorded with its version and date, and never overwritten.",
  },
  {
    title: "The AI watches castings",
    body: "New castings come from casting directors on Agental and from public sources we are allowed to use. Each one is compared with every profile.",
    data: "Hard rules first (age range, languages, your exclusions), then a score with plain-language reasons.",
  },
  {
    title: "You approve or decline",
    body: "You get the role, the pay, the deadline and why it fits you. Edit the note if you like, then approve. Nothing goes out without your yes.",
    data: "The database itself refuses a submission that the talent has not approved.",
  },
  {
    title: "We submit and follow up",
    body: "Your agent submits, tracks callbacks and bookings, negotiates, checks the contract and makes sure you are paid.",
    data: "Every status change is written to an audit trail you can ask to see.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
      <h1 className="t-h1 max-w-3xl">How Agental works, from profile to booking</h1>
      <p className="t-lead mt-5 max-w-2xl text-muted">
        One agent, one AI, and one rule above both: a talent always says yes before anything is sent in their name.
      </p>

      <ol className="mt-14 space-y-0 border-l-2 border-ink">
        {FLOW.map((step, i) => (
          <li key={step.title} className="relative grid gap-4 pb-12 pl-8 md:grid-cols-[1.3fr_1fr] md:gap-12 md:pl-12">
            <span
              className="absolute -left-[1.05rem] top-0 grid h-8 w-8 place-items-center rounded-full bg-tungsten text-sm font-bold tabular"
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <div>
              <h2 className="t-h3">{step.title}</h2>
              <p className="mt-2 text-ink-2">{step.body}</p>
            </div>
            <p className="self-start rounded-xl bg-card p-4 text-sm text-muted ring-1 ring-line">
              <span className="font-semibold text-ink">Behind the scenes. </span>
              {step.data}
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/join" className="btn btn-spot">
          Become a member
        </Link>
        <Link href="/faq" className="btn btn-line">
          Read the FAQ
        </Link>
      </div>
    </div>
  );
}

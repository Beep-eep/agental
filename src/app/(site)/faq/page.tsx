import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "FAQ" };

const TALENT_FAQ = [
  ["Is it really free?", "Yes. Representation costs nothing to start. The agent earns a commission only when you are paid for a booking."],
  ["What is the mandate?", "A written agreement that lets Agental represent you and submit you for roles. It is versioned, recorded with its date, and you can withdraw it at any time from your profile."],
  ["Will anything be sent without my permission?", "No. Every proposal waits for your approval. The database itself blocks a submission until the talent has approved it."],
  ["What does the AI look at?", "Only what you entered: casting types, city, languages, skills, age range and the types you refuse. It never guesses traits from your photos. Each match comes with plain-language reasons."],
  ["Can minors join?", "Not yet. This version is for adults (18+). Children and teens will come with a dedicated protective framework."],
  ["Who can see my data?", "You and your agent. Casting directors only see what you agreed to share, and only for roles you approved. You can export or delete your data."],
] as const;

const DIRECTOR_FAQ = [
  ["How do I get a shortlist?", "Send a brief or post a casting from your studio account. You get a ranked list of represented talents, each with the reasons they fit."],
  ["Are the talents available?", "Every talent you see has signed a mandate, and each one confirms before being submitted to you."],
  ["What does it cost?", "Sending briefs and receiving shortlists is free during the pilot."],
] as const;

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-24">
      <h1 className="t-h1">Questions, answered</h1>
      <FaqGroup id="talents" title="For talents" items={TALENT_FAQ} />
      <FaqGroup id="directors" title="For casting directors" items={DIRECTOR_FAQ} />
      <p className="mt-12 text-muted">
        Still unsure? <Link href="/directors#brief" className="font-semibold text-cue underline-offset-4 hover:underline">Write to us</Link>{" "}
        and a person will answer.
      </p>
    </div>
  );
}

function FaqGroup({ id, title, items }: { id: string; title: string; items: readonly (readonly [string, string])[] }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="mt-12 scroll-mt-24">
      <h2 id={`${id}-h`} className="t-h2">
        {title}
      </h2>
      <div className="mt-4 divide-y divide-line border-y border-line">
        {items.map(([q, a]) => (
          <details key={q} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
              {q}
              <span aria-hidden="true" className="text-2xl leading-none text-muted transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-ink-2 prose-measure">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCastingTypes, getLatestOpenCastings } from "@/lib/catalog";
import { payRange, shortDate } from "@/lib/format";

export const revalidate = 300;

export async function generateStaticParams() {
  const types = await getCastingTypes();
  return types.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: PageProps<"/castings/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const type = (await getCastingTypes()).find((t) => t.slug === slug);
  return { title: type ? type.label : "Casting type" };
}

export default async function CastingTypePage({ params }: PageProps<"/castings/[slug]">) {
  const { slug } = await params;
  const types = await getCastingTypes();
  const type = types.find((t) => t.slug === slug);
  if (!type) notFound();

  const open = (await getLatestOpenCastings(40)).filter((c) => c.category === type.category).slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
        <Link href="/castings" className="hover:text-ink">
          Casting types
        </Link>{" "}
        / <span className="text-ink">{type.label}</span>
      </nav>
      <div className="grid gap-12 md:grid-cols-[1.3fr_1fr]">
        <div>
          <h1 className="t-h1">{type.label}</h1>
          <p className="t-lead mt-4 text-ink-2">{type.summary}</p>
          {type.description && <p className="mt-4 text-muted prose-measure">{type.description}</p>}
          <p className="mt-6 text-lg font-semibold tabular">{payRange(type.pay_min, type.pay_max, type.pay_unit)}</p>
          <Link href={`/join?interest=${type.category}`} className="btn btn-spot mt-8">
            Join for {type.label.toLowerCase()}
          </Link>
        </div>
        <section aria-labelledby="open-heading">
          <h2 id="open-heading" className="t-h3">
            Open on the board
          </h2>
          {open.length === 0 ? (
            <p className="mt-3 text-muted">No open casting of this type right now. Members are notified the moment one arrives.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {open.map((c) => (
                <li key={c.id} className="py-3">
                  <p className="font-semibold">{c.title}</p>
                  <p className="text-sm text-muted">
                    {c.production} · {c.city} · {payRange(c.pay_min, c.pay_max, c.pay_unit)}
                    {c.deadline ? ` · until ${shortDate(c.deadline)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted">Members see the full brief and their personal match score.</p>
        </section>
      </div>
    </div>
  );
}

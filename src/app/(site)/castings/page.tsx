import type { Metadata } from "next";
import Link from "next/link";
import { getCastingTypes, getOpenCastingStats } from "@/lib/catalog";
import { payRange } from "@/lib/format";

export const metadata: Metadata = { title: "Casting types" };
export const revalidate = 300;

export default async function CastingTypesPage() {
  const [types, stats] = await Promise.all([getCastingTypes(), getOpenCastingStats()]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
      <h1 className="t-h1">Find the casting made for you</h1>
      <p className="t-lead mt-4 max-w-2xl text-muted">
        Whatever your profile, there&apos;s a place. Pick the worlds you want when you join; you can change them anytime.
      </p>

      <div className="mt-12 overflow-hidden rounded-2xl border border-line bg-card">
        <table className="w-full text-left">
          <caption className="sr-only">Casting types, typical pay and open castings</caption>
          <thead className="border-b border-line text-sm text-muted">
            <tr>
              <th scope="col" className="px-5 py-3 font-medium">Casting type</th>
              <th scope="col" className="hidden px-5 py-3 font-medium md:table-cell">What it is</th>
              <th scope="col" className="px-5 py-3 text-right font-medium">Typical pay</th>
              {stats && <th scope="col" className="hidden px-5 py-3 text-right font-medium sm:table-cell">Open now</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {types.map((t) => (
              <tr key={t.category} className="hover:bg-paper">
                <th scope="row" className="px-5 py-4 align-top">
                  <Link href={`/castings/${t.slug}`} className="text-lg font-semibold hover:text-cue">
                    {t.label}
                  </Link>
                  <p className="mt-1 text-sm font-normal text-muted md:hidden">{t.summary}</p>
                </th>
                <td className="hidden px-5 py-4 align-top text-ink-2 md:table-cell">{t.summary}</td>
                <td className="tabular px-5 py-4 text-right align-top text-sm">{payRange(t.pay_min, t.pay_max, t.pay_unit)}</td>
                {stats && (
                  <td className="tabular hidden px-5 py-4 text-right align-top font-semibold sm:table-cell">
                    {stats.byCategory[t.category] ?? 0}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-muted">
        Pay ranges are indicative and come from the product catalog; each casting states its own rate. Children &amp; teens castings
        are not offered in this adults-only version.
      </p>
    </div>
  );
}

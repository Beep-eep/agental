import Link from "next/link";
import { PageHeader, Section } from "@/components/app/app-shell";
import { CastingCard } from "@/components/app/casting-card";
import { getViewer } from "@/lib/auth";
import { CATEGORY_LABEL, STATUS_LABEL, shortDate } from "@/lib/format";
import { Constants } from "@/lib/supabase/database.types";
import { getMyApplications, getMyTalent, getRecommendations, toCard } from "@/lib/talent-data";

export default async function MyCastingsPage({ searchParams }: PageProps<"/app/castings">) {
  const viewer = (await getViewer())!;
  const sp = await searchParams;
  const filter = Constants.public.Enums.casting_category.find((c) => c === sp.type);
  const [talent, recs, apps] = await Promise.all([getMyTalent(viewer.id), getRecommendations(50), getMyApplications(viewer.id)]);
  const shown = filter ? recs.filter((r) => r.card.category === filter) : recs;
  const history = apps.filter((a) => a.status !== "awaiting_talent");

  return (
    <>
      <PageHeader
        title="Castings for me"
        lead="Only open castings you're eligible for, ranked by how well they fit. Applying counts as your approval."
      />

      {!talent?.mandate_signed_at && (
        <p className="mb-6 rounded-xl bg-[#fff4dc] px-4 py-3 text-sm ring-1 ring-[#f3d48c]">
          <strong>Sign your mandate to apply.</strong> You can browse, but we can only submit represented talents.{" "}
          <Link href="/app/profile#mandate" className="font-semibold text-cue hover:underline">
            Sign it now
          </Link>
        </p>
      )}

      <nav aria-label="Filter by casting type" className="mb-5 flex flex-wrap gap-2">
        <Link href="/app/castings" className={`chip ${!filter ? "!bg-ink !text-white !border-ink" : ""}`}>
          All ({recs.length})
        </Link>
        {Constants.public.Enums.casting_category
          .filter((c) => recs.some((r) => r.card.category === c))
          .map((c) => (
            <Link key={c} href={`/app/castings?type=${c}`} className={`chip ${filter === c ? "!bg-ink !text-white !border-ink" : ""}`}>
              {CATEGORY_LABEL[c]} ({recs.filter((r) => r.card.category === c).length})
            </Link>
          ))}
      </nav>

      <Section title={filter ? CATEGORY_LABEL[filter] : "All matches"}>
        {shown.length === 0 ? (
          <p className="text-muted">Nothing open for this filter. Widen your casting types in your profile to see more.</p>
        ) : (
          <div className="divide-y divide-line">
            {shown.map((r) => (
              <CastingCard key={r.card.id} casting={r.card} mode="browse" applied={r.applied} />
            ))}
          </div>
        )}
      </Section>

      <div className="mt-6">
        <Section title="History" description="Every role you were proposed for or applied to.">
          {history.length === 0 ? (
            <p className="text-muted">No history yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-muted">
                  <tr className="border-b border-line">
                    <th className="py-2 pr-4 font-medium">Casting</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 text-right font-medium">Match</th>
                    <th className="py-2 text-right font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 30).map((a) => {
                    const c = toCard(a);
                    return (
                      <tr key={a.id} className="border-b border-line last:border-0">
                        <td className="py-2.5 pr-4">{c?.title ?? "Casting removed"}</td>
                        <td className="py-2.5 pr-4">{STATUS_LABEL[a.status]}</td>
                        <td className="tabular py-2.5 pr-4 text-right">{a.match_score != null ? Math.round(a.match_score) : "–"}</td>
                        <td className="tabular py-2.5 text-right text-muted">{shortDate(a.updated_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </>
  );
}

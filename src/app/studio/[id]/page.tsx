import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, Section } from "@/components/app/app-shell";
import { CastingStatusButton, MatchPicker, PipelineActions } from "./studio-client";
import { CATEGORY_LABEL, STATUS_LABEL, payRange, shortDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function StudioCastingPage({ params, searchParams }: PageProps<"/studio/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: casting } = await supabase.from("castings").select("*").eq("id", id).maybeSingle();
  if (!casting) notFound();

  const [{ data: matches, error: matchError }, { data: pipeline }] = await Promise.all([
    supabase.rpc("match_talents", { p_casting_id: id, p_limit: 25 }),
    supabase.rpc("casting_pipeline", { p_casting_id: id }),
  ]);

  const requirements = [
    casting.age_min || casting.age_max ? `Age ${casting.age_min ?? 18}–${casting.age_max ?? "any"}` : null,
    casting.gender_req ? `Gender: ${casting.gender_req.replace("_", "-")}` : null,
    casting.languages_req.length ? `Speaks ${casting.languages_req.join(", ")}` : null,
    casting.skills_req.length ? `Skills wanted: ${casting.skills_req.join(", ")}` : null,
  ].filter(Boolean);

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted">
        <Link href="/studio" className="hover:text-ink">
          My castings
        </Link>{" "}
        / <span className="text-ink">{casting.title}</span>
      </nav>
      {sp.created && (
        <p role="status" className="mb-6 rounded-xl bg-tungsten px-4 py-3 font-semibold">
          Casting published. Matches below are live: pick the talents you want to propose.
        </p>
      )}
      <PageHeader
        title={casting.title}
        lead={`${CATEGORY_LABEL[casting.category]} · ${casting.production ?? "Production"} · ${casting.city}${casting.remote_ok ? " or self-tape" : ""} · ${payRange(casting.pay_min, casting.pay_max, casting.pay_unit)}${casting.deadline ? ` · deadline ${shortDate(casting.deadline)}` : ""}`}
        actions={<CastingStatusButton castingId={casting.id} status={casting.status === "open" ? "open" : "closed"} />}
      />

      {requirements.length > 0 && (
        <ul className="-mt-4 mb-6 flex flex-wrap gap-2 text-sm">
          {requirements.map((r) => (
            <li key={r} className="rounded-full bg-card px-3 py-1 ring-1 ring-line">
              {r}
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Section
          title="Ranked matches"
          description="Represented talents who pass your hard requirements, ranked by fit. Reasons use only what talents entered."
        >
          {matchError ? (
            <p className="text-critical">{matchError.message}</p>
          ) : (
            <MatchPicker
              castingId={casting.id}
              disabled={casting.status !== "open"}
              matches={(matches ?? []).map((m) => ({
                id: m.talent_id,
                name: m.display_name,
                city: m.city,
                age: m.age,
                languages: m.languages,
                score: m.score,
                reasons: Array.isArray(m.reasons) ? (m.reasons as string[]) : [],
                proposed: m.already_proposed,
              }))}
            />
          )}
        </Section>

        <Section title="Pipeline" description="Talents appear by name once proposed; declines stay anonymous.">
          {(pipeline ?? []).length === 0 ? (
            <p className="text-muted">No one yet. Propose talents from the matches.</p>
          ) : (
            <ul className="divide-y divide-line">
              {(pipeline ?? []).map((p) => (
                <li key={p.application_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{p.display_name ?? "A talent"}</p>
                    <p className="text-sm text-muted">
                      {STATUS_LABEL[p.status] === "Waiting for your answer" ? "Waiting for the talent" : STATUS_LABEL[p.status]}
                      {p.city ? ` · ${p.city}` : ""}
                      {p.score != null ? ` · match ${Math.round(p.score)}` : ""}
                    </p>
                  </div>
                  {["approved", "queued", "submitted", "callback"].includes(p.status) && (
                    <PipelineActions applicationId={p.application_id} castingId={casting.id} status={p.status} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {casting.description && (
        <div className="mt-6">
          <Section title="Brief">
            <p className="whitespace-pre-line text-ink-2 prose-measure">{casting.description}</p>
          </Section>
        </div>
      )}
    </>
  );
}

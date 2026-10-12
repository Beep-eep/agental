import Link from "next/link";
import { PageHeader, Section } from "@/components/app/app-shell";
import { CastingCard } from "@/components/app/casting-card";
import { FeedbackForm } from "@/components/app/feedback-form";
import { getViewer } from "@/lib/auth";
import { STATUS_LABEL, olderThanDays } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";
import { getMyApplications, getMyTalent, getRecommendations, toCard } from "@/lib/talent-data";

const PIPELINE: Enums<"application_status">[] = ["awaiting_talent", "approved", "queued", "submitted", "callback", "booked"];

export default async function TalentHome({ searchParams }: PageProps<"/app">) {
  const viewer = (await getViewer())!;
  const sp = await searchParams;
  const [talent, apps, recs] = await Promise.all([getMyTalent(viewer.id), getMyApplications(viewer.id), getRecommendations(4)]);

  const supabase = await createClient();
  const { data: lastFeedback } = await supabase
    .from("feedback")
    .select("created_at")
    .eq("profile_id", viewer.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const askFeedback = !lastFeedback || olderThanDays(lastFeedback.created_at, 30);

  if (!talent) {
    return <PageHeader title="Almost there" lead="Your talent profile is being created. Refresh in a moment." />;
  }

  const proposals = apps.filter((a) => a.status === "awaiting_talent");
  const counts = Object.fromEntries(PIPELINE.map((s) => [s, apps.filter((a) => a.status === s).length]));
  const missing = [
    !talent.headshot_path && { label: "Add a headshot", why: "Directors open profiles with photos first." },
    !talent.mandate_signed_at && { label: "Sign your mandate", why: "Without it we can't submit you." },
    talent.skills.length === 0 && { label: "Add your skills", why: "Many briefs ask for one specific skill." },
    !talent.bio && { label: "Write a short bio", why: "Two lines on what makes you singular." },
  ].filter(Boolean) as { label: string; why: string }[];

  const first = viewer.full_name.split(" ")[0] || "there";

  return (
    <>
      {sp.welcome && (
        <p role="status" className="mb-6 rounded-xl bg-tungsten px-4 py-3 font-semibold">
          Welcome to Agental, {first}. Your profile is live and the AI has started looking for roles.
        </p>
      )}
      <PageHeader
        title={`Hello, ${first}`}
        lead={
          proposals.length
            ? `${proposals.length} role${proposals.length > 1 ? "s are" : " is"} waiting for your answer.`
            : "No proposal waiting. We'll notify you the moment a role fits."
        }
        actions={
          <Link href="/app/castings" className="btn btn-spot">
            Browse castings for me
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Section title="Waiting for your answer" description="Your agent prepared these. Nothing is sent until you approve.">
            {proposals.length === 0 ? (
              <p className="text-muted">You&apos;re all caught up.</p>
            ) : (
              <div className="divide-y divide-line">
                {proposals.map((a) => {
                  const card = toCard(a);
                  return card ? <CastingCard key={a.id} casting={card} mode="proposal" applicationId={a.id} /> : null;
                })}
              </div>
            )}
          </Section>

          <Section
            title="Top matches right now"
            description="Ranked by your match score. Reasons come from your profile only."
            actions={
              <Link href="/app/castings" className="text-sm font-semibold text-cue hover:underline">
                See all
              </Link>
            }
          >
            {recs.length === 0 ? (
              <p className="text-muted">
                No open casting fits your profile today. Adding casting types or languages widens your matches.
              </p>
            ) : (
              <div className="divide-y divide-line">
                {recs.map((r) => (
                  <CastingCard key={r.card.id} casting={r.card} mode="browse" applied={r.applied} />
                ))}
              </div>
            )}
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Profile strength">
            <div className="flex items-end gap-3">
              <span className="text-5xl font-semibold leading-none">{talent.completeness}</span>
              <span className="pb-1 text-muted">/ 100</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-[var(--seq-100)]" role="meter" aria-valuenow={talent.completeness} aria-valuemin={0} aria-valuemax={100} aria-label="Profile strength">
              <div className="h-2 rounded-full bg-[var(--seq-450)]" style={{ width: `${talent.completeness}%` }} />
            </div>
            {missing.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {missing.map((m) => (
                  <li key={m.label}>
                    <Link href="/app/profile" className="font-semibold text-cue hover:underline">
                      {m.label}
                    </Link>
                    <p className="text-sm text-muted">{m.why}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-good">Your profile is complete.</p>
            )}
          </Section>

          <Section title="Your pipeline" description="Every role you said yes to, and where it stands.">
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-line ring-1 ring-line">
              {PIPELINE.map((s) => (
                <div key={s} className="bg-card p-3">
                  <dt className="text-xs text-muted">{STATUS_LABEL[s]}</dt>
                  <dd className="text-2xl font-semibold">{counts[s]}</dd>
                </div>
              ))}
            </dl>
          </Section>

          {askFeedback && (
            <Section title="How are we doing?" description="Two questions. Your answers shape what we build next.">
              <FeedbackForm />
            </Section>
          )}
        </div>
      </div>
    </>
  );
}

import { PageHeader, Section } from "@/components/app/app-shell";
import { HeadshotUploader } from "@/components/app/headshot-uploader";
import { MandateToggle } from "@/components/app/mandate-toggle";
import { ProfileForm } from "@/components/app/profile-form";
import { getViewer } from "@/lib/auth";
import { shortDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { getMyTalent } from "@/lib/talent-data";

export default async function ProfilePage() {
  const viewer = (await getViewer())!;
  const talent = await getMyTalent(viewer.id);
  if (!talent) return <PageHeader title="Profile" lead="Your profile is being created. Refresh in a moment." />;

  const supabase = await createClient();
  const [{ data: consents }, signed] = await Promise.all([
    supabase.from("consents").select("kind, version, granted, created_at").eq("profile_id", viewer.id).order("created_at", { ascending: false }),
    talent.headshot_path
      ? supabase.storage.from("headshots").createSignedUrl(talent.headshot_path, 600)
      : Promise.resolve({ data: null }),
  ]);

  return (
    <>
      <PageHeader title="Profile & mandate" lead="Everything here feeds your matches. Keep only what's true; you can change it anytime." />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Section title="Your profile">
          <ProfileForm talent={talent} />
        </Section>
        <div className="space-y-6">
          <Section title="Headshot" description="JPG, PNG or WebP up to 5 MB. Stored privately; shared only with roles you approve.">
            <HeadshotUploader userId={viewer.id} currentUrl={signed.data?.signedUrl ?? null} />
          </Section>
          <div id="mandate" className="scroll-mt-6">
            <Section title="Representation mandate" description="Free, versioned, and you can withdraw it at any time.">
              <MandateToggle signedAt={talent.mandate_signed_at} />
              <h3 className="mt-6 text-sm font-semibold">Consent history</h3>
              <ul className="mt-2 divide-y divide-line text-sm">
                {(consents ?? []).map((c, i) => (
                  <li key={i} className="flex justify-between gap-3 py-2">
                    <span>
                      {c.kind.replace(/_/g, " ")} <span className="text-muted">v{c.version}</span>
                    </span>
                    <span className={c.granted ? "text-good" : "text-critical"}>
                      {c.granted ? "Granted" : "Withdrawn"} · {shortDate(c.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted">This ledger is append-only: entries can be added, never edited or deleted.</p>
            </Section>
          </div>
          <Section title="Your data" description="Download everything we hold about you, as JSON.">
            <a href="/api/me/export" className="btn btn-line btn-sm">
              Download my data
            </a>
          </Section>
        </div>
      </div>
    </>
  );
}

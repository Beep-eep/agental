import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GDPR/CCPA-style self-service export. Uses the caller's own session, so RLS
 * guarantees it can only ever return the caller's rows.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const [profile, talent, consents, applications, feedback] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("talents").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("consents").select("*").eq("profile_id", user.id),
    supabase.from("applications").select("*, castings(title, production, category, city)").eq("talent_id", user.id),
    supabase.from("feedback").select("*").eq("profile_id", user.id),
  ]);

  const body = JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      profile: profile.data,
      talent: talent.data,
      consents: consents.data,
      applications: applications.data,
      feedback: feedback.data,
    },
    null,
    2,
  );

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="agental-my-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

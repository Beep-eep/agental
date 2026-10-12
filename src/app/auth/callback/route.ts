import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Email confirmation / magic-link landing: exchanges the one-time code for a session cookie. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/app";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/app";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}?welcome=1`);
  }
  return NextResponse.redirect(`${origin}/login?error=link`);
}

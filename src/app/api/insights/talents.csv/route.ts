import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Constants } from "@/lib/supabase/database.types";

function csv(v: unknown) {
  const s = Array.isArray(v) ? v.join("; ") : v == null ? "" : String(v);
  // Neutralise spreadsheet formula injection, then quote.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Admin-only CSV export. RLS returns rows only to admins; everyone else gets an empty file. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { data: me } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const sp = request.nextUrl.searchParams;
  let query = supabase
    .from("talents")
    .select("id, stage_name, city, country, categories, languages, skills, onboarding_step, plan, utm_source, utm_medium, utm_campaign, created_at, mandate_signed_at")
    .order("created_at", { ascending: false })
    .limit(5000);
  const step = Number(sp.get("step"));
  if (step >= 1 && step <= 5) query = query.eq("onboarding_step", step);
  const category = Constants.public.Enums.casting_category.find((c) => c === sp.get("category"));
  if (category) query = query.contains("categories", [category]);
  const channel = sp.get("channel");
  if (channel) query = channel === "direct" ? query.is("utm_source", null) : query.eq("utm_source", channel);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const cols = ["id", "stage_name", "city", "country", "categories", "languages", "skills", "onboarding_step", "plan", "utm_source", "utm_medium", "utm_campaign", "created_at", "mandate_signed_at"] as const;
  const body = [cols.join(","), ...(data ?? []).map((r) => cols.map((c) => csv(r[c])).join(","))].join("\n");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="agental-talents-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

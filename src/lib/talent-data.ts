import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import type { CardCasting } from "@/components/app/casting-card";

export type TalentWithCompleteness = Tables<"talents"> & { completeness: number };

const CASTING_COLS = "id, title, production, category, city, remote_ok, pay_min, pay_max, pay_unit, deadline";

export async function getMyTalent(id: string) {
  const supabase = await createClient();
  // `completeness` is a PostgREST computed field: public.completeness(talents)
  const { data } = await supabase
    .from("talents")
    .select("*, completeness")
    .eq("id", id)
    .single()
    .overrideTypes<TalentWithCompleteness, { merge: false }>();
  return data;
}

type AppRow = Pick<Tables<"applications">, "id" | "status" | "match_score" | "match_reasons" | "created_at" | "updated_at"> & {
  castings: Pick<
    Tables<"castings">,
    "id" | "title" | "production" | "category" | "city" | "remote_ok" | "pay_min" | "pay_max" | "pay_unit" | "deadline"
  > | null;
};

export async function getMyApplications(talentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select(`id, status, match_score, match_reasons, created_at, updated_at, castings (${CASTING_COLS})`)
    .eq("talent_id", talentId)
    .order("created_at", { ascending: false })
    .limit(100)
    .overrideTypes<AppRow[], { merge: false }>();
  return data ?? [];
}

export function toCard(row: AppRow): CardCasting | null {
  if (!row.castings) return null;
  return {
    ...row.castings,
    score: row.match_score,
    reasons: Array.isArray(row.match_reasons) ? (row.match_reasons as string[]) : [],
  };
}

export async function getRecommendations(limit: number) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("recommended_castings", { p_limit: limit });
  return (data ?? []).map((r) => ({
    applied: r.applied,
    card: {
      id: r.casting_id,
      title: r.title,
      production: r.production,
      category: r.category,
      city: r.city,
      remote_ok: r.remote_ok,
      pay_min: r.pay_min,
      pay_max: r.pay_max,
      pay_unit: r.pay_unit,
      deadline: r.deadline,
      score: r.score,
      reasons: Array.isArray(r.reasons) ? (r.reasons as string[]) : [],
    } satisfies CardCasting,
  }));
}

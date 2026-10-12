import "server-only";
import { createPublicClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Tables } from "@/lib/supabase/database.types";

export type Plan = Tables<"plans">;
export type CastingType = Tables<"casting_types">;

// Shown only if the database can't be reached (e.g. building offline), so the
// marketing site never renders empty. The database is the source of truth.
const FALLBACK_PLANS: Plan[] = [
  { tier: "free", name: "Free", tagline: "Real representation, free forever", monthly_price_eur: 0, commission_pct: 10, features: ["Signed representation mandate", "AI casting watch 24/7", "Talent approves every submission", "Basic self-tape guide"], is_active: true, sort_order: 1, updated_at: "" },
  { tier: "pro", name: "Pro", tagline: "More tools for active talents", monthly_price_eur: 19, commission_pct: 10, features: ["Everything in Free", "Self-tape Studio feedback", "Priority matching notifications", "Profile insights"], is_active: true, sort_order: 2, updated_at: "" },
  { tier: "premium", name: "Premium", tagline: "Keep more of every fee", monthly_price_eur: 49, commission_pct: 7.5, features: ["Everything in Pro", "Commission drops to 7.5%", "Vocal & accent coaching sessions", "Monthly profile review"], is_active: true, sort_order: 3, updated_at: "" },
  { tier: "ultimate", name: "Ultimate", tagline: "For working professionals", monthly_price_eur: 79, commission_pct: 5, features: ["Everything in Premium", "Commission drops to 5%", "Dedicated agent check-ins", "Early access to new castings"], is_active: true, sort_order: 4, updated_at: "" },
];

const FALLBACK_TYPES: CastingType[] = [
  ["background", "background-acting", "Background acting", "The way into film and television. No experience required.", 80, 180, "day"],
  ["walk_on", "walk-on", "Walk-on", "A step up from background: one gesture, one presence that registers.", 100, 250, "day"],
  ["supporting", "supporting-roles", "Supporting roles", "Lines, a character, series and feature films.", 350, 800, "day"],
  ["commercial", "commercials", "Commercials", "The best-paid shoots, open to every profile.", 800, 3000, "day"],
  ["photo", "photo", "Photo", "Campaigns, catalogues, editorial: your image, put to work.", 200, 600, "day"],
  ["voice", "voice-dubbing", "Voice & dubbing", "Your voice is enough: ads, dubbing, narration, e-learning.", 200, 800, "session"],
  ["creator", "content-creators", "Content creators", "Your audience and your ease on camera are casting assets.", null, null, "project"],
  ["performer", "performers-stage", "Performers & stage", "Dance, music, magic, circus, hosting, stunt work: your discipline is a role.", null, null, "project"],
].map(([category, slug, label, summary, pay_min, pay_max, pay_unit], i) => ({
  category, slug, label, summary, description: "", pay_min, pay_max, pay_unit, is_active: true, sort_order: i + 1, updated_at: "",
})) as CastingType[];

export async function getPlans(): Promise<Plan[]> {
  if (!isSupabaseConfigured) return FALLBACK_PLANS;
  try {
    const { data, error } = await createPublicClient().from("plans").select("*").order("sort_order");
    if (error || !data?.length) return FALLBACK_PLANS;
    return data;
  } catch {
    return FALLBACK_PLANS;
  }
}

export async function getCastingTypes(): Promise<CastingType[]> {
  if (!isSupabaseConfigured) return FALLBACK_TYPES;
  try {
    const { data, error } = await createPublicClient().from("casting_types").select("*").order("sort_order");
    if (error || !data?.length) return FALLBACK_TYPES;
    return data;
  } catch {
    return FALLBACK_TYPES;
  }
}

export type OpenCastingStats = { open: number; byCategory: Partial<Record<string, number>> };

export async function getOpenCastingStats(): Promise<OpenCastingStats | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await createPublicClient()
      .from("castings")
      .select("category")
      .eq("status", "open");
    if (error || !data) return null;
    const byCategory: Record<string, number> = {};
    for (const row of data) byCategory[row.category] = (byCategory[row.category] ?? 0) + 1;
    return { open: data.length, byCategory };
  } catch {
    return null;
  }
}

export type SampleCasting = Pick<
  Tables<"castings">,
  "id" | "title" | "production" | "category" | "city" | "pay_min" | "pay_max" | "pay_unit" | "deadline" | "skills_req" | "languages_req" | "remote_ok"
>;

export async function getLatestOpenCastings(limit = 6): Promise<SampleCasting[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data } = await createPublicClient()
      .from("castings")
      .select("id, title, production, category, city, pay_min, pay_max, pay_unit, deadline, skills_req, languages_req, remote_ok")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(limit);
    return data ?? [];
  } catch {
    return [];
  }
}

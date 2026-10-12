import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { FunnelStep } from "@/components/charts/funnel";
import type { Cohort } from "@/components/charts/heatmap";

/* Shapes returned by the SQL analytics functions (supabase/migrations/*_analytics.sql). */

type Pair = { current: number; previous: number };
export type Overview = {
  period_days: number;
  visitors: Pair;
  leads: Pair;
  signups: Pair;
  activated: Pair;
  applications: Pair;
  bookings: Pair;
  nps: { score: number | null; responses: number };
  pmf_very_pct: number | null;
  visitor_to_signup_pct: number | null;
  signup_to_active_pct: number | null;
  totals: { talents: number; represented: number; directors: number; open_castings: number };
};
export type DayPoint = { day: string; visitors: number; leads: number; signups: number; activated: number; applications: number; bookings: number };
export type Channel = {
  channel: string;
  visitors: number;
  leads: number;
  signups: number;
  directors: number;
  activated: number;
  booked_talents: number;
  visit_to_signup_pct: number | null;
  activation_pct: number | null;
};
export type CategoryBalance = {
  category: string;
  label: string;
  talents: number;
  open_castings: number;
  castings_30d: number;
  avg_pay: number;
  applications_90d: number;
  bookings_90d: number;
  avg_match: number | null;
  lead_interest: number;
  talents_per_casting: number | null;
};
export type SupplyDemand = { categories: CategoryBalance[]; cities: { city: string; talents: number; open_castings: number }[] };
export type Pipeline = {
  statuses: { status: string; count: number }[];
  conversion: {
    total: number;
    responded: number;
    approved: number;
    submitted: number;
    callback: number;
    booked: number;
    avg_hours_to_approval: number | null;
    avg_score_booked: number | null;
    avg_score_passed: number | null;
  };
  fairness: { top10_share_pct: number | null; zero_opportunity_pct: number | null; gini: number | null };
  score_calibration: { band: string; submitted: number; positive_pct: number }[];
};
export type Feedback = {
  nps: { responses: number; promoters: number; passives: number; detractors: number; score: number | null };
  pmf: { responses: number; very: number; somewhat: number; not: number; very_pct: number | null };
  topics: { topic: string; responses: number; avg_nps: number; detractor_pct: number }[];
  trend: { week: string; responses: number; nps: number }[];
  recent: { created_at: string; nps: number; pmf: string | null; topic: string; comment: string }[];
};
export type Validation = {
  waitlist_weekly: { week: string; talent: number; director: number; converted: number }[];
  lead_conversion_pct: number | null;
  interest_by_category: { category: string; label: string; leads: number }[];
  plan_interest: { tier: string; name: string; price: number; clicks: number; subscribers: number }[];
  director_demand: { leads: number; with_brief: number };
  top_pages: { path: string; views: number; sessions: number }[];
  devices: { device: string; sessions: number }[];
};
export type Onboarding = {
  steps: { step: number; label: string; count: number }[];
  missing: Record<"headshot" | "skills" | "languages" | "bio" | "categories" | "total", number>;
  median_days_to_mandate: number | null;
  avg_completeness: number | null;
};
export type Insight = { severity: "warning" | "opportunity" | "info"; area: string; title: string; detail: string; action: string; metric: string | number | null };

async function rpc<T>(fn: Parameters<Awaited<ReturnType<typeof createClient>>["rpc"]>[0], args?: Record<string, unknown>): Promise<T> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.rpc(fn as any, args as any);
  if (error) throw new Error(`${String(fn)}: ${error.message}`);
  return data as T;
}

export const analytics = {
  overview: (days: number) => rpc<Overview>("analytics_overview", { p_days: days }),
  timeseries: (days: number) => rpc<DayPoint[]>("analytics_timeseries", { p_days: days }),
  funnel: (days: number) => rpc<FunnelStep[]>("analytics_funnel", { p_days: days }),
  acquisition: (days: number) => rpc<Channel[]>("analytics_acquisition", { p_days: days }),
  cohorts: (weeks: number) => rpc<Cohort[]>("analytics_cohorts", { p_weeks: weeks }),
  supplyDemand: () => rpc<SupplyDemand>("analytics_supply_demand"),
  pipeline: (days: number) => rpc<Pipeline>("analytics_pipeline", { p_days: days }),
  feedback: (days: number) => rpc<Feedback>("analytics_feedback", { p_days: days }),
  validation: (days: number) => rpc<Validation>("analytics_validation", { p_days: days }),
  onboarding: () => rpc<Onboarding>("analytics_onboarding"),
  insights: () => rpc<Insight[]>("analytics_insights"),
};

export function parseDays(v: unknown, fallback = 30) {
  const n = Number(v);
  return [7, 30, 90].includes(n) ? n : fallback;
}

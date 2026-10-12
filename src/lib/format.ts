import type { Enums } from "@/lib/supabase/database.types";

const nf = new Intl.NumberFormat("en-US");
const nf1 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

export const fmt = (n: number | null | undefined) => (n == null ? "–" : nf.format(n));
export const fmt1 = (n: number | null | undefined) => (n == null ? "–" : nf1.format(n));
export const pct = (n: number | null | undefined) => (n == null ? "–" : `${nf1.format(n)}%`);

export function money(n: number | null | undefined, currency = "EUR") {
  if (n == null) return "–";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

export function payRange(min: number | null, max: number | null, unit: string) {
  if (min == null && max == null) return "Varies by project";
  const per = unit === "session" ? "session" : unit === "project" ? "project" : "day";
  if (min != null && max != null) return `${money(min)}–${money(max)} / ${per}`;
  return `${money(min ?? max)} / ${per}`;
}

export function shortDate(d: string | Date | null | undefined) {
  if (!d) return "–";
  // Plain dates (YYYY-MM-DD) are calendar days: don't shift them through UTC.
  const date = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T00:00:00`) : new Date(d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function relativeTime(d: string | Date) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  return `${Math.floor(diff / 86400)} d ago`;
}

export function olderThanDays(d: string | Date, days: number) {
  return Date.now() - new Date(d).getTime() > days * 86400_000;
}

/** ISO date (YYYY-MM-DD) of this week's Monday, matching Postgres date_trunc('week'). */
export function startOfWeek(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export function delta(current: number, previous: number) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

export const STATUS_LABEL: Record<Enums<"application_status">, string> = {
  proposed: "Proposed",
  awaiting_talent: "Waiting for your answer",
  approved: "Approved",
  declined: "Declined",
  queued: "Queued for submission",
  submitted: "Submitted",
  callback: "Callback",
  booked: "Booked",
  passed: "Not selected",
};

export const CATEGORY_LABEL: Record<Enums<"casting_category">, string> = {
  background: "Background acting",
  walk_on: "Walk-on",
  supporting: "Supporting roles",
  commercial: "Commercials",
  photo: "Photo",
  voice: "Voice & dubbing",
  creator: "Content creators",
  performer: "Performers & stage",
};

export const CHANNEL_LABEL: Record<string, string> = {
  direct: "Direct / unknown",
  instagram: "Instagram",
  tiktok: "TikTok",
  google: "Google",
  referral: "Referral",
  usc_student_films: "USC student films",
  linkedin: "LinkedIn",
};

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Constants } from "@/lib/supabase/database.types";

export type ActionResult = { ok: boolean; message: string; errors?: Record<string, string> } | null;

const uuid = z.uuid();
const category = z.enum(Constants.public.Enums.casting_category);

async function talentClient() {
  const viewer = await getViewer();
  if (!viewer) throw new Error("Not signed in");
  return { supabase: await createClient(), viewer };
}

/** Approve or decline a role proposal. The DB trigger enforces who may make which transition. */
export async function respondToProposal(applicationId: string, decision: "approved" | "declined") {
  const id = uuid.parse(applicationId);
  const { supabase } = await talentClient();
  const { error } = await supabase.from("applications").update({ status: decision }).eq("id", id);
  if (error) return { ok: false, message: error.message };
  await supabase.from("events").insert({
    session_id: "server-action",
    name: decision === "approved" ? "proposal_approved" : "proposal_declined",
    path: "/app",
    props: { application_id: id },
  });
  revalidatePath("/app", "layout");
  return { ok: true, message: decision === "approved" ? "Approved. Your agent will submit you." : "Declined. We won't submit you." };
}

/** Self-application counts as approval (RLS only allows status = 'approved' here). */
export async function applyToCasting(castingId: string) {
  const id = uuid.parse(castingId);
  const { supabase, viewer } = await talentClient();
  const { error } = await supabase.from("applications").insert({ casting_id: id, talent_id: viewer.id, status: "approved" });
  if (error) {
    return { ok: false, message: error.code === "23505" ? "You're already on this casting." : "Couldn't apply. Is your mandate signed?" };
  }
  revalidatePath("/app", "layout");
  return { ok: true, message: "Applied. Your agent has been notified." };
}

const profileSchema = z.object({
  stage_name: z.string().trim().max(80).optional(),
  city: z.string().trim().min(2, "Where are you based?").max(80),
  bio: z.string().trim().max(1000).optional(),
  reel_url: z.url("Start with https://").max(500).optional(),
  height_cm: z.coerce.number().int().min(90).max(250).optional(),
  availability: z.enum(["full_time", "weekends", "evenings", "flexible"]),
  union_status: z.enum(["non_union", "sag_aftra_eligible", "sag_aftra"]),
  plan: z.enum(Constants.public.Enums.plan_tier),
  categories: z.array(category).min(1, "Pick at least one casting type."),
  excluded_categories: z.array(category),
  languages: z.array(z.string().trim().min(2).max(40)).min(1, "Add at least one language.").max(10),
  skills: z.array(z.string().trim().min(2).max(40)).max(20),
});

export async function updateProfile(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const text = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" && v.trim() !== "" ? v : undefined;
  };
  const list = (k: string) =>
    form
      .getAll(k)
      .flatMap((v) => String(v).split(","))
      .map((v) => v.trim())
      .filter(Boolean);

  const parsed = profileSchema.safeParse({
    stage_name: text("stage_name"),
    city: text("city"),
    bio: text("bio"),
    reel_url: text("reel_url"),
    height_cm: text("height_cm"),
    availability: text("availability"),
    union_status: text("union_status"),
    plan: text("plan"),
    categories: list("categories"),
    excluded_categories: list("excluded_categories"),
    languages: list("languages"),
    skills: list("skills"),
  });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { ok: false, message: "Some fields need another look.", errors };
  }

  const { supabase, viewer } = await talentClient();
  const d = parsed.data;
  const { error } = await supabase
    .from("talents")
    .update({
      ...d,
      stage_name: d.stage_name ?? null,
      bio: d.bio ?? null,
      reel_url: d.reel_url ?? null,
      height_cm: d.height_cm ?? null,
    })
    .eq("id", viewer.id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/app", "layout");
  return { ok: true, message: "Profile saved. Your matches are updated." };
}

/** Called after the browser uploaded the file to Storage (RLS: own folder only). */
export async function setHeadshot(path: string) {
  const { supabase, viewer } = await talentClient();
  if (!path.startsWith(`${viewer.id}/`)) return { ok: false, message: "Invalid file location." };
  const { error } = await supabase.from("talents").update({ headshot_path: path }).eq("id", viewer.id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/app", "layout");
  return { ok: true, message: "Headshot saved." };
}

/** Sign or withdraw the representation mandate — a new row in the append-only ledger. */
export async function setMandate(granted: boolean) {
  const { supabase, viewer } = await talentClient();
  const { error } = await supabase
    .from("consents")
    .insert({ profile_id: viewer.id, kind: "representation_mandate", version: "2026-10", granted });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/app", "layout");
  return { ok: true, message: granted ? "Mandate signed. You can now be proposed for roles." : "Mandate withdrawn." };
}

const feedbackSchema = z.object({
  nps: z.coerce.number().int().min(0).max(10),
  pmf: z.enum(["very", "somewhat", "not"]).optional(),
  topic: z.enum(["matching", "castings", "self_tape", "pricing", "onboarding", "payments", "other"]),
  comment: z.string().trim().max(2000).optional(),
});

export async function submitFeedback(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const raw = Object.fromEntries([...form.entries()].filter(([, v]) => v !== ""));
  const parsed = feedbackSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "Pick a score from 0 to 10." };
  const { supabase, viewer } = await talentClient();
  const { error } = await supabase.from("feedback").insert({ ...parsed.data, profile_id: viewer.id });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/app");
  return { ok: true, message: "Thank you. Every answer is read by the team." };
}

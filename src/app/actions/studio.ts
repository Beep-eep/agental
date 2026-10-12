"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Constants } from "@/lib/supabase/database.types";

export type StudioResult = { ok: boolean; message: string; errors?: Record<string, string> } | null;

const castingSchema = z
  .object({
    title: z.string().trim().min(3, "Give the role a title.").max(140),
    production: z.string().trim().max(140).optional(),
    category: z.enum(Constants.public.Enums.casting_category, "Pick a casting type."),
    city: z.string().trim().min(2, "Where is the shoot?").max(80),
    remote_ok: z.boolean(),
    pay_min: z.coerce.number().min(0).max(100000).optional(),
    pay_max: z.coerce.number().min(0).max(100000).optional(),
    pay_unit: z.enum(["day", "session", "project"]),
    age_min: z.coerce.number().int().min(18, "Adults only (18+).").max(100).optional(),
    age_max: z.coerce.number().int().min(18).max(100).optional(),
    gender_req: z.enum(["female", "male", "non_binary"]).optional(),
    languages_req: z.array(z.string().trim().min(2).max(40)).max(5),
    skills_req: z.array(z.string().trim().min(2).max(40)).max(8),
    deadline: z.iso.date().optional(),
    shoot_date: z.iso.date().optional(),
    description: z.string().trim().max(4000).optional(),
  })
  .refine((d) => d.pay_min == null || d.pay_max == null || d.pay_min <= d.pay_max, { path: ["pay_max"], message: "Max pay must be above min pay." })
  .refine((d) => d.age_min == null || d.age_max == null || d.age_min <= d.age_max, { path: ["age_max"], message: "Max age must be above min age." });

export async function createCasting(_prev: StudioResult, form: FormData): Promise<StudioResult> {
  const viewer = await getViewer();
  if (!viewer || (viewer.role !== "director" && viewer.role !== "admin")) return { ok: false, message: "Studio accounts only." };

  const t = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
  };
  const list = (k: string) => (t(k) ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  const parsed = castingSchema.safeParse({
    title: t("title"),
    production: t("production"),
    category: t("category"),
    city: t("city"),
    remote_ok: form.get("remote_ok") === "on",
    pay_min: t("pay_min"),
    pay_max: t("pay_max"),
    pay_unit: t("pay_unit") ?? "day",
    age_min: t("age_min"),
    age_max: t("age_max"),
    gender_req: t("gender_req"),
    languages_req: list("languages_req"),
    skills_req: list("skills_req"),
    deadline: t("deadline"),
    shoot_date: t("shoot_date"),
    description: t("description"),
  });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { ok: false, message: "Some fields need another look.", errors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("castings")
    .insert({ ...parsed.data, director_id: viewer.role === "admin" ? null : viewer.id, source: "agental", status: "open" })
    .select("id")
    .single();
  if (error || !data) return { ok: false, message: error?.message ?? "Could not save the casting." };

  revalidatePath("/studio");
  redirect(`/studio/${data.id}?created=1`);
}

/** Propose a selection of matched talents; each one must approve before submission. */
export async function proposeTalents(castingId: string, talentIds: string[]) {
  const ids = z.array(z.uuid()).min(1).max(50).parse(talentIds);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("propose_talents", { p_casting_id: z.uuid().parse(castingId), p_talent_ids: ids });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/studio/${castingId}`);
  return { ok: true, message: `${data} talent${data === 1 ? "" : "s"} notified. They'll appear below as they approve.` };
}

export async function setApplicationStatus(applicationId: string, status: "callback" | "booked" | "passed", castingId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("applications").update({ status }).eq("id", z.uuid().parse(applicationId));
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/studio/${castingId}`);
  return { ok: true, message: "Updated." };
}

export async function setCastingStatus(castingId: string, status: "open" | "closed") {
  const supabase = await createClient();
  const { error } = await supabase.from("castings").update({ status }).eq("id", z.uuid().parse(castingId));
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/studio/${castingId}`);
  revalidatePath("/studio");
  return { ok: true, message: status === "closed" ? "Casting closed." : "Casting reopened." };
}

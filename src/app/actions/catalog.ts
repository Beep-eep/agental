"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Constants } from "@/lib/supabase/database.types";

export type CatalogResult = { ok: boolean; message: string } | null;

async function admin() {
  const viewer = await getViewer();
  if (viewer?.role !== "admin") throw new Error("Admins only");
  return createClient();
}

function refreshSite() {
  // Public pages are ISR-cached; push the change live now.
  for (const p of ["/", "/pricing", "/castings", "/insights/catalog"]) revalidatePath(p);
  revalidatePath("/castings/[slug]", "page");
}

const planSchema = z.object({
  tier: z.enum(Constants.public.Enums.plan_tier),
  name: z.string().trim().min(2).max(40),
  tagline: z.string().trim().max(120),
  monthly_price_eur: z.coerce.number().min(0).max(999),
  commission_pct: z.coerce.number().min(0).max(30),
  features: z.string().max(2000),
  is_active: z.boolean(),
});

export async function updatePlan(_prev: CatalogResult, form: FormData): Promise<CatalogResult> {
  const parsed = planSchema.safeParse({ ...Object.fromEntries(form), is_active: form.get("is_active") === "on" });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid values." };
  const { tier, features, ...rest } = parsed.data;
  const supabase = await admin();
  const { error } = await supabase
    .from("plans")
    .update({ ...rest, features: features.split("\n").map((f) => f.trim()).filter(Boolean) })
    .eq("tier", tier);
  if (error) return { ok: false, message: error.message };
  refreshSite();
  return { ok: true, message: "Saved. The pricing page shows it now." };
}

const typeSchema = z.object({
  category: z.enum(Constants.public.Enums.casting_category),
  label: z.string().trim().min(2).max(60),
  summary: z.string().trim().min(5).max(200),
  pay_min: z.coerce.number().min(0).max(100000).optional(),
  pay_max: z.coerce.number().min(0).max(100000).optional(),
  is_active: z.boolean(),
});

export async function updateCastingType(_prev: CatalogResult, form: FormData): Promise<CatalogResult> {
  const raw = Object.fromEntries([...form.entries()].filter(([, v]) => v !== ""));
  const parsed = typeSchema.safeParse({ ...raw, is_active: form.get("is_active") === "on" });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid values." };
  const { category, ...rest } = parsed.data;
  if (rest.pay_min != null && rest.pay_max != null && rest.pay_min > rest.pay_max) return { ok: false, message: "Min pay is above max pay." };
  const supabase = await admin();
  const { error } = await supabase
    .from("casting_types")
    .update({ ...rest, pay_min: rest.pay_min ?? null, pay_max: rest.pay_max ?? null })
    .eq("category", category);
  if (error) return { ok: false, message: error.message };
  refreshSite();
  return { ok: true, message: "Saved. Casting pages show it now." };
}

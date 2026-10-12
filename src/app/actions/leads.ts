"use server";

import { z } from "zod";
import { createPublicClient } from "@/lib/supabase/server";
import { Constants } from "@/lib/supabase/database.types";

export type FormState = { ok: boolean; message: string; errors?: Record<string, string> } | null;

const attribution = {
  session_id: z.string().max(64).optional(),
  utm_source: z.string().max(80).optional(),
  utm_medium: z.string().max(80).optional(),
  utm_campaign: z.string().max(120).optional(),
  referrer: z.string().max(500).optional(),
  landing_path: z.string().max(300).optional(),
};

const briefSchema = z.object({
  email: z.email("Enter a valid email address.").max(254),
  full_name: z.string().trim().min(2, "Tell us your name.").max(120),
  company: z.string().trim().min(2, "Which production or company?").max(120),
  city: z.string().trim().max(80).optional(),
  message: z.string().trim().min(10, "Describe the roles in a sentence or two.").max(2000),
  ...attribution,
});

const waitlistSchema = z.object({
  email: z.email("Enter a valid email address.").max(254),
  interest: z.enum(Constants.public.Enums.casting_category).optional(),
  ...attribution,
});

function clean(form: FormData) {
  return Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string" && v.trim() !== ""));
}

function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) out[String(issue.path[0])] ??= issue.message;
  return out;
}

/** Casting-director brief from /directors. Stored as a director lead (anon insert, admin-only read). */
export async function submitBrief(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = briefSchema.safeParse(clean(form));
  if (!parsed.success) return { ok: false, message: "Check the highlighted fields.", errors: fieldErrors(parsed.error) };

  const { error } = await createPublicClient()
    .from("leads")
    .insert({ ...parsed.data, email: parsed.data.email.toLowerCase(), kind: "director" });

  if (error && error.code !== "23505") {
    return { ok: false, message: "The brief could not be saved. Try again in a minute." };
  }
  return {
    ok: true,
    message:
      error?.code === "23505"
        ? "We already have a brief from this email. Your agent will reply to it within one working day."
        : "Brief received. You'll get a shortlist by email within one working day.",
  };
}

/** Email-only capture (abandoned registrations, casting-type pages). */
export async function joinWaitlist(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = waitlistSchema.safeParse(clean(form));
  if (!parsed.success) return { ok: false, message: "Check the highlighted fields.", errors: fieldErrors(parsed.error) };

  const { error } = await createPublicClient()
    .from("leads")
    .insert({ ...parsed.data, email: parsed.data.email.toLowerCase(), kind: "talent" });

  if (error && error.code !== "23505") return { ok: false, message: "That didn't work. Try again in a minute." };
  return { ok: true, message: "You're on the list." };
}

"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { homeFor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Constants } from "@/lib/supabase/database.types";
import { SITE_URL } from "@/lib/supabase/env";

const category = z.enum(Constants.public.Enums.casting_category);
const CONSENT_VERSION = "2026-10";

const adult = z.iso.date().refine((d) => {
  const birth = new Date(d);
  const limit = new Date();
  limit.setFullYear(limit.getFullYear() - 18);
  return birth <= limit && birth.getFullYear() > 1900;
}, "Agental represents adults (18+) in this version.");

const base = z.object({
  email: z.email("Enter a valid email address.").max(254),
  password: z.string().min(8, "Use at least 8 characters.").max(72),
  full_name: z.string().trim().min(2, "Enter your name.").max(120),
  accept_terms: z.literal(true, "You need to accept the terms and privacy policy."),
  marketing: z.boolean().default(false),
  attribution: z
    .object({
      session_id: z.string().max(64).optional(),
      utm_source: z.string().max(80).optional(),
      utm_medium: z.string().max(80).optional(),
      utm_campaign: z.string().max(120).optional(),
      referrer: z.string().max(500).optional(),
      landing_path: z.string().max(300).optional(),
    })
    .default({}),
});

const talentSchema = base.extend({
  role: z.literal("talent"),
  stage_name: z.string().trim().max(80).optional(),
  birth_date: adult,
  gender: z.enum(["female", "male", "non_binary", "prefer_not_say"]).optional(),
  city: z.string().trim().min(2, "Where are you based?").max(80),
  country: z.string().length(2).default("US"),
  categories: z.array(category).min(1, "Pick at least one casting type.").max(8),
  excluded_categories: z.array(category).max(8).default([]),
  languages: z.array(z.string().trim().min(2).max(40)).min(1, "Add at least one language.").max(10),
  skills: z.array(z.string().trim().min(2).max(40)).max(20).default([]),
  height_cm: z.coerce.number().int().min(90).max(250).optional(),
  union_status: z.enum(["non_union", "sag_aftra_eligible", "sag_aftra"]).default("non_union"),
  availability: z.enum(["full_time", "weekends", "evenings", "flexible"]).default("flexible"),
  bio: z.string().trim().max(1000).optional(),
  plan: z.enum(Constants.public.Enums.plan_tier).default("free"),
  sign_mandate: z.boolean().default(false),
});

const directorSchema = base.extend({
  role: z.literal("director"),
  company: z.string().trim().min(2, "Which production or company?").max(120),
  job_title: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  website: z.url("Start with https://").max(300).optional().or(z.literal("").transform(() => undefined)),
});

const signUpSchema = z.discriminatedUnion("role", [talentSchema, directorSchema]);
export type SignUpInput = z.input<typeof signUpSchema>;

export type SignUpResult =
  | { ok: false; message: string; errors?: Record<string, string> }
  | { ok: true; needsConfirmation: true; email: string };

/**
 * Creates the auth user with everything the form collected in user metadata.
 * The Postgres trigger `private.handle_new_user` turns that into the profile,
 * talent/director row, consent ledger entries and lead conversion — atomically.
 */
export async function signUp(input: SignUpInput): Promise<SignUpResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
    return { ok: false, message: "Some answers need another look.", errors };
  }
  const d = parsed.data;

  const consents = [
    { kind: "terms", version: CONSENT_VERSION, granted: true },
    { kind: "privacy", version: CONSENT_VERSION, granted: true },
    ...(d.marketing ? [{ kind: "marketing", version: CONSENT_VERSION, granted: true }] : []),
    ...(d.role === "talent" && d.sign_mandate
      ? [{ kind: "representation_mandate", version: CONSENT_VERSION, granted: true }]
      : []),
  ];

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, email, attribution, accept_terms: _t, marketing: _m, ...profile } = d;
  const metadata =
    profile.role === "talent"
      ? { ...profile, sign_mandate: undefined, height_cm: profile.height_cm?.toString(), consents, ...attribution }
      : { ...profile, consents, ...attribution };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: email.toLowerCase(),
    password,
    options: { data: metadata, emailRedirectTo: `${SITE_URL}/auth/callback?next=${homeFor(d.role)}` },
  });

  if (error) {
    const message =
      error.code === "user_already_exists"
        ? "An account already exists for this email. Sign in instead."
        : error.code === "weak_password"
          ? "Choose a stronger password."
          : error.code === "over_email_send_rate_limit"
            ? "Too many sign-ups right now. Try again in a few minutes."
            : error.message;
    return { ok: false, message };
  }

  // Email confirmation disabled → we already have a session.
  if (data.session) redirect(`${homeFor(d.role)}?welcome=1`);

  return { ok: true, needsConfirmation: true, email: email.toLowerCase() };
}

const signInSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
  next: z.string().startsWith("/").optional(),
});

export async function signIn(_prev: { message: string } | null, form: FormData) {
  const parsed = signInSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Check your details." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email.toLowerCase(),
    password: parsed.data.password,
  });
  if (error || !data.user) {
    return {
      message:
        error?.code === "email_not_confirmed"
          ? "Confirm your email first: we sent you a link."
          : "Email or password is incorrect.",
    };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  const next = parsed.data.next && !parsed.data.next.startsWith("//") ? parsed.data.next : null;
  redirect(next ?? homeFor(profile?.role ?? "talent"));
}

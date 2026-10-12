"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { signUp, type SignUpInput } from "@/app/actions/auth";
import { joinWaitlist } from "@/app/actions/leads";
import { Field, FormMessage, TextArea } from "@/components/forms/field";
import { CATEGORY_LABEL } from "@/lib/format";
import { Constants, type Enums } from "@/lib/supabase/database.types";
import { getAttribution, getSessionId, track } from "@/lib/tracking";

type Role = "talent" | "director";
type Category = Enums<"casting_category">;

const LANGS = ["English", "Spanish", "French", "Mandarin", "Korean", "Arabic", "Portuguese"];
const SKILLS = ["driving", "dance", "singing", "swimming", "improv", "accents", "voice acting", "stage combat", "martial arts", "skateboarding", "modeling", "hosting", "guitar", "piano"];

const TALENT_STEPS = ["Account", "About you", "Your castings", "Mandate"] as const;
const DIRECTOR_STEPS = ["Account", "Your production", "Confirm"] as const;

type State = {
  role: Role;
  full_name: string;
  email: string;
  password: string;
  stage_name: string;
  birth_date: string;
  gender: "" | "female" | "male" | "non_binary" | "prefer_not_say";
  city: string;
  country: string;
  categories: Category[];
  excluded_categories: Category[];
  languages: string[];
  skills: string[];
  height_cm: string;
  union_status: "non_union" | "sag_aftra_eligible" | "sag_aftra";
  availability: "full_time" | "weekends" | "evenings" | "flexible";
  bio: string;
  plan: Enums<"plan_tier">;
  company: string;
  job_title: string;
  website: string;
  accept_terms: boolean;
  sign_mandate: boolean;
  marketing: boolean;
};

export function JoinWizard({
  initialRole,
  initialPlan,
  initialInterest,
}: {
  initialRole: Role;
  initialPlan: Enums<"plan_tier">;
  initialInterest?: Category;
}) {
  const [s, setS] = useState<State>({
    role: initialRole,
    full_name: "",
    email: "",
    password: "",
    stage_name: "",
    birth_date: "",
    gender: "",
    city: "",
    country: "US",
    categories: initialInterest ? [initialInterest] : [],
    excluded_categories: [],
    languages: ["English"],
    skills: [],
    height_cm: "",
    union_status: "non_union",
    availability: "flexible",
    bio: "",
    plan: initialPlan,
    company: "",
    job_title: "",
    website: "",
    accept_terms: false,
    sign_mandate: true,
    marketing: false,
  });
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; message: string } | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const steps = s.role === "talent" ? TALENT_STEPS : DIRECTOR_STEPS;
  const last = step === steps.length - 1;
  const set = <K extends keyof State>(k: K, v: State[K]) => setS((prev) => ({ ...prev, [k]: v }));

  useEffect(() => {
    void track("signup_started", { role: initialRole });
  }, [initialRole]);

  const maxBirth = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().slice(0, 10);
  }, []);

  function validateStep(): Record<string, string> {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (s.full_name.trim().length < 2) e.full_name = "Enter your name.";
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.email)) e.email = "Enter a valid email address.";
      if (s.password.length < 8) e.password = "Use at least 8 characters.";
    }
    if (s.role === "talent" && step === 1) {
      if (!s.birth_date) e.birth_date = "We need your date of birth to match age ranges.";
      else if (s.birth_date > maxBirth) e.birth_date = "Agental represents adults (18+) in this version.";
      if (s.city.trim().length < 2) e.city = "Where are you based?";
    }
    if (s.role === "talent" && step === 2) {
      if (!s.categories.length) e.categories = "Pick at least one casting type.";
      if (!s.languages.length) e.languages = "Add at least one language.";
    }
    if (s.role === "director" && step === 1 && s.company.trim().length < 2) e.company = "Which production or company?";
    if (last && !s.accept_terms) e.accept_terms = "You need to accept the terms and privacy policy.";
    return e;
  }

  function next() {
    const e = validateStep();
    setErrors(e);
    if (Object.keys(e).length) return;
    if (step === 0) {
      // Capture the email as a lead, so an abandoned registration is still measurable.
      const fd = new FormData();
      fd.set("email", s.email);
      if (s.categories[0]) fd.set("interest", s.categories[0]);
      fd.set("session_id", getSessionId());
      Object.entries(getAttribution()).forEach(([k, v]) => v && fd.set(k, v));
      void joinWaitlist(null, fd);
    }
    void track("signup_step", { role: s.role, step: steps[step] });
    setStep((n) => n + 1);
  }

  function submit() {
    const e = validateStep();
    setErrors(e);
    if (Object.keys(e).length) return;
    setMessage(null);
    const attribution = { ...getAttribution(), session_id: getSessionId() };
    const common = {
      email: s.email,
      password: s.password,
      full_name: s.full_name,
      accept_terms: true as const,
      marketing: s.marketing,
      attribution,
    };
    const payload: SignUpInput =
      s.role === "talent"
        ? {
            ...common,
            role: "talent",
            stage_name: s.stage_name || undefined,
            birth_date: s.birth_date,
            gender: s.gender || undefined,
            city: s.city,
            country: s.country,
            categories: s.categories,
            excluded_categories: s.excluded_categories,
            languages: s.languages,
            skills: s.skills,
            height_cm: s.height_cm ? Number(s.height_cm) : undefined,
            union_status: s.union_status,
            availability: s.availability,
            bio: s.bio || undefined,
            plan: s.plan,
            sign_mandate: s.sign_mandate,
          }
        : {
            ...common,
            role: "director",
            company: s.company,
            job_title: s.job_title || undefined,
            city: s.city || undefined,
            website: s.website || undefined,
          };

    startTransition(async () => {
      const res = await signUp(payload);
      if (!res) return; // redirected
      if (!res.ok) {
        setMessage({ ok: false, message: res.message });
        if (res.errors) {
          setErrors(res.errors);
          const talentStepOf: Record<string, number> = { full_name: 0, email: 0, password: 0, birth_date: 1, city: 1, categories: 2, languages: 2 };
          const first = Object.keys(res.errors)[0];
          if (first && talentStepOf[first] !== undefined && s.role === "talent") setStep(talentStepOf[first]);
        }
        return;
      }
      void track("signup_submitted", { role: s.role });
      setDone(res.email);
    });
  }

  if (done) {
    return (
      <div className="panel p-8 text-center">
        <h2 className="t-h2">Check your inbox</h2>
        <p className="mt-3 text-ink-2">
          We sent a confirmation link to <strong>{done}</strong>. Open it on this device to finish creating your account.
        </p>
        <p className="mt-6 text-sm text-muted">
          Wrong address? <button className="font-semibold text-cue hover:underline" onClick={() => { setDone(null); setStep(0); }}>Start again</button>
        </p>
      </div>
    );
  }

  return (
    <div className="panel overflow-hidden">
      {/* Progress */}
      <ol className="flex border-b border-line text-sm" aria-label="Registration steps">
        {steps.map((label, i) => (
          <li
            key={label}
            aria-current={i === step ? "step" : undefined}
            className={`flex-1 px-3 py-3 text-center ${i === step ? "bg-ink font-semibold text-white" : i < step ? "text-ink" : "text-faint"}`}
          >
            <span className="tabular">{i + 1}</span>
            <span className="hidden sm:inline">. {label}</span>
          </li>
        ))}
      </ol>

      <form
        className="space-y-6 p-6 sm:p-8"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (last) submit();
          else next();
        }}
      >
        {step === 0 && (
          <>
            <fieldset>
              <legend className="field-label">I am joining as</legend>
              <div className="grid grid-cols-2 gap-2">
                {(["talent", "director"] as const).map((r) => (
                  <label key={r} className="chip justify-center">
                    <input type="radio" name="role" checked={s.role === r} onChange={() => { set("role", r); setStep(0); }} />
                    {r === "talent" ? "A talent" : "A casting director"}
                  </label>
                ))}
              </div>
            </fieldset>
            <Field label="Full name" name="full_name" autoComplete="name" value={s.full_name} onChange={(e) => set("full_name", e.target.value)} error={errors.full_name} />
            <Field label="Email" name="email" type="email" autoComplete="email" value={s.email} onChange={(e) => set("email", e.target.value)} error={errors.email} />
            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={s.password}
              onChange={(e) => set("password", e.target.value)}
              error={errors.password}
              hint="At least 8 characters."
            />
          </>
        )}

        {s.role === "talent" && step === 1 && (
          <>
            <Field label="Stage name (optional)" name="stage_name" value={s.stage_name} onChange={(e) => set("stage_name", e.target.value)} hint="Leave empty to use your first name." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Date of birth" name="birth_date" type="date" max={maxBirth} value={s.birth_date} onChange={(e) => set("birth_date", e.target.value)} error={errors.birth_date} hint="Used for age ranges only; never shown to directors." />
              <div>
                <label htmlFor="f-gender" className="field-label">Gender (optional)</label>
                <select id="f-gender" className="input" value={s.gender} onChange={(e) => set("gender", e.target.value as State["gender"])}>
                  <option value="">Prefer not to say</option>
                  <option value="female">Woman</option>
                  <option value="male">Man</option>
                  <option value="non_binary">Non-binary</option>
                </select>
                <p className="field-hint">Only used when a brief explicitly asks for it.</p>
              </div>
              <Field label="City" name="city" autoComplete="address-level2" value={s.city} onChange={(e) => set("city", e.target.value)} error={errors.city} placeholder="Los Angeles" />
              <div>
                <label htmlFor="f-country" className="field-label">Country</label>
                <select id="f-country" className="input" value={s.country} onChange={(e) => set("country", e.target.value)}>
                  <option value="US">United States</option>
                  <option value="FR">France</option>
                  <option value="ES">Spain</option>
                  <option value="GB">United Kingdom</option>
                  <option value="CA">Canada</option>
                </select>
              </div>
            </div>
          </>
        )}

        {s.role === "talent" && step === 2 && (
          <>
            <ChipGroup
              legend="Casting types you want"
              options={Constants.public.Enums.casting_category.map((c) => [c, CATEGORY_LABEL[c]])}
              value={s.categories}
              onChange={(v) => set("categories", v as Category[])}
              error={errors.categories}
            />
            <ChipGroup
              legend="Casting types you never want (optional)"
              options={Constants.public.Enums.casting_category.map((c) => [c, CATEGORY_LABEL[c]])}
              value={s.excluded_categories}
              onChange={(v) => set("excluded_categories", v as Category[])}
            />
            <ChipGroup legend="Languages you speak" options={LANGS.map((l) => [l, l])} value={s.languages} onChange={(v) => set("languages", v)} error={errors.languages} />
            <ChipGroup legend="Skills (optional)" options={SKILLS.map((k) => [k, k])} value={s.skills} onChange={(v) => set("skills", v)} />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Height in cm (optional)" name="height_cm" inputMode="numeric" value={s.height_cm} onChange={(e) => set("height_cm", e.target.value.replace(/\D/g, ""))} />
              <div>
                <label htmlFor="f-union" className="field-label">Union status</label>
                <select id="f-union" className="input" value={s.union_status} onChange={(e) => set("union_status", e.target.value as State["union_status"])}>
                  <option value="non_union">Non-union</option>
                  <option value="sag_aftra_eligible">SAG-AFTRA eligible</option>
                  <option value="sag_aftra">SAG-AFTRA member</option>
                </select>
              </div>
              <div>
                <label htmlFor="f-avail" className="field-label">Availability</label>
                <select id="f-avail" className="input" value={s.availability} onChange={(e) => set("availability", e.target.value as State["availability"])}>
                  <option value="flexible">Flexible</option>
                  <option value="full_time">Full time</option>
                  <option value="weekends">Weekends</option>
                  <option value="evenings">Evenings</option>
                </select>
              </div>
            </div>
            <TextArea label="A few words about you (optional)" name="bio" maxLength={1000} value={s.bio} onChange={(e) => set("bio", e.target.value)} hint="Experience, look, what makes you singular." />
          </>
        )}

        {s.role === "director" && step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Production or company" name="company" autoComplete="organization" value={s.company} onChange={(e) => set("company", e.target.value)} error={errors.company} />
            <Field label="Your role" name="job_title" value={s.job_title} onChange={(e) => set("job_title", e.target.value)} placeholder="Casting director" />
            <Field label="City" name="city" value={s.city} onChange={(e) => set("city", e.target.value)} placeholder="Los Angeles" />
            <Field label="Website (optional)" name="website" type="url" value={s.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" error={errors.website} />
          </div>
        )}

        {last && (
          <div className="space-y-4">
            {s.role === "talent" && (
              <div className="rounded-xl bg-paper p-5 ring-1 ring-line">
                <h3 className="t-h3">Representation mandate</h3>
                <p className="mt-2 text-sm text-ink-2">
                  Lets Agental represent you and propose you for roles. It is free, you approve every submission, and you can withdraw
                  it at any time from your profile. Without it you can browse castings, but we can&apos;t submit you.
                </p>
                <label className="mt-3 flex items-start gap-3">
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--ink)]" checked={s.sign_mandate} onChange={(e) => set("sign_mandate", e.target.checked)} />
                  <span className="text-sm font-semibold">I sign the representation mandate (version 2026-10)</span>
                </label>
              </div>
            )}
            <label className="flex items-start gap-3">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--ink)]" checked={s.accept_terms} onChange={(e) => set("accept_terms", e.target.checked)} aria-invalid={errors.accept_terms ? true : undefined} />
              <span className="text-sm">
                I accept the terms of service and the privacy policy. My data is used only to match and represent me, and I can export or
                delete it.
              </span>
            </label>
            {errors.accept_terms && <p className="text-sm text-critical">{errors.accept_terms}</p>}
            <label className="flex items-start gap-3">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--ink)]" checked={s.marketing} onChange={(e) => set("marketing", e.target.checked)} />
              <span className="text-sm text-muted">Send me occasional tips and product news (optional).</span>
            </label>
            {s.role === "talent" && (
              <p className="text-sm text-muted">
                Plan: <strong className="text-ink">{s.plan === "free" ? "Free" : s.plan[0].toUpperCase() + s.plan.slice(1)}</strong>. You can add your headshot
                and change plans from your dashboard.
              </p>
            )}
          </div>
        )}

        <FormMessage state={message} />

        <div className="flex items-center justify-between gap-3 pt-2">
          {step > 0 ? (
            <button type="button" className="btn btn-line" onClick={() => setStep((n) => n - 1)} disabled={pending}>
              Back
            </button>
          ) : (
            <Link href="/login" className="text-sm text-muted hover:text-ink">
              Already a member? Sign in
            </Link>
          )}
          <button type="submit" className="btn btn-spot" disabled={pending}>
            {last ? (pending ? "Creating your account…" : "Create my account") : "Continue"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ChipGroup({
  legend,
  options,
  value,
  onChange,
  error,
}: {
  legend: string;
  options: [string, string][];
  value: string[];
  onChange: (v: string[]) => void;
  error?: string;
}) {
  return (
    <fieldset>
      <legend className="field-label">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([v, label]) => (
          <label key={v} className="chip relative">
            <input
              type="checkbox"
              checked={value.includes(v)}
              onChange={(e) => onChange(e.target.checked ? [...value, v] : value.filter((x) => x !== v))}
            />
            {label}
          </label>
        ))}
      </div>
      {error && <p className="mt-1 text-sm text-critical">{error}</p>}
    </fieldset>
  );
}

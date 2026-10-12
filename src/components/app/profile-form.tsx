"use client";

import { useActionState } from "react";
import { updateProfile, type ActionResult } from "@/app/actions/talent";
import { Field, FormMessage, TextArea } from "@/components/forms/field";
import { CATEGORY_LABEL } from "@/lib/format";
import { Constants } from "@/lib/supabase/database.types";
import type { TalentWithCompleteness } from "@/lib/talent-data";

const LANGS = ["English", "Spanish", "French", "Mandarin", "Korean", "Arabic", "Portuguese"];

export function ProfileForm({ talent }: { talent: TalentWithCompleteness }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(updateProfile, null);
  const e = state?.errors ?? {};
  const extraLangs = talent.languages.filter((l) => !LANGS.includes(l));

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Stage name" name="stage_name" defaultValue={talent.stage_name ?? ""} />
        <Field label="City" name="city" defaultValue={talent.city ?? ""} error={e.city} />
        <Field label="Height (cm)" name="height_cm" inputMode="numeric" defaultValue={talent.height_cm ?? ""} error={e.height_cm} />
        <Field label="Reel or showreel link" name="reel_url" type="url" placeholder="https://" defaultValue={talent.reel_url ?? ""} error={e.reel_url} />
        <div>
          <label htmlFor="p-avail" className="field-label">Availability</label>
          <select id="p-avail" name="availability" className="input" defaultValue={talent.availability}>
            <option value="flexible">Flexible</option>
            <option value="full_time">Full time</option>
            <option value="weekends">Weekends</option>
            <option value="evenings">Evenings</option>
          </select>
        </div>
        <div>
          <label htmlFor="p-union" className="field-label">Union status</label>
          <select id="p-union" name="union_status" className="input" defaultValue={talent.union_status}>
            <option value="non_union">Non-union</option>
            <option value="sag_aftra_eligible">SAG-AFTRA eligible</option>
            <option value="sag_aftra">SAG-AFTRA member</option>
          </select>
        </div>
      </div>

      <Chips legend="Casting types you want" name="categories" options={Constants.public.Enums.casting_category.map((c) => [c, CATEGORY_LABEL[c]])} selected={talent.categories} error={e.categories} />
      <Chips legend="Casting types you never want" name="excluded_categories" options={Constants.public.Enums.casting_category.map((c) => [c, CATEGORY_LABEL[c]])} selected={talent.excluded_categories} />
      <Chips legend="Languages" name="languages" options={[...LANGS, ...extraLangs].map((l) => [l, l])} selected={talent.languages} error={e.languages} />
      <Field label="Skills" name="skills" defaultValue={talent.skills.join(", ")} hint="Separate with commas: driving, dance, accents…" />
      <TextArea label="Bio" name="bio" maxLength={1000} defaultValue={talent.bio ?? ""} />

      <div>
        <label htmlFor="p-plan" className="field-label">Plan</label>
        <select id="p-plan" name="plan" className="input max-w-xs" defaultValue={talent.plan}>
          <option value="free">Free · 10% commission</option>
          <option value="pro">Pro · 10% commission</option>
          <option value="premium">Premium · 7.5% commission</option>
          <option value="ultimate">Ultimate · 5% commission</option>
        </select>
        <p className="field-hint">Demo: no payment is taken. Plan choices are recorded to measure interest.</p>
      </div>

      <FormMessage state={state} />
      <button className="btn btn-ink" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

function Chips({ legend, name, options, selected, error }: { legend: string; name: string; options: string[][]; selected: string[]; error?: string }) {
  return (
    <fieldset>
      <legend className="field-label">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([v, label]) => (
          <label key={v} className="chip relative">
            <input type="checkbox" name={name} value={v} defaultChecked={selected.includes(v)} />
            {label}
          </label>
        ))}
      </div>
      {error && <p className="mt-1 text-sm text-critical">{error}</p>}
    </fieldset>
  );
}

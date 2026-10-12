"use client";

import { useActionState } from "react";
import { createCasting, type StudioResult } from "@/app/actions/studio";
import { Field, FormMessage, TextArea } from "@/components/forms/field";
import { CATEGORY_LABEL } from "@/lib/format";
import { Constants } from "@/lib/supabase/database.types";

export function CastingForm() {
  const [state, action, pending] = useActionState<StudioResult, FormData>(createCasting, null);
  const e = state?.errors ?? {};

  return (
    <form action={action} className="space-y-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Role title" name="title" placeholder="Young parent, kitchen scene" required error={e.title} />
        <Field label="Production" name="production" placeholder="Regional auto brand" />
        <div>
          <label htmlFor="c-cat" className="field-label">Casting type</label>
          <select id="c-cat" name="category" className="input" defaultValue="" aria-invalid={e.category ? true : undefined}>
            <option value="" disabled>
              Choose…
            </option>
            {Constants.public.Enums.casting_category.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
          {e.category && <p className="mt-1 text-sm text-critical">{e.category}</p>}
        </div>
        <div>
          <Field label="City" name="city" placeholder="Los Angeles" required error={e.city} />
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input type="checkbox" name="remote_ok" className="h-4 w-4 accent-[var(--ink)]" /> Self-tapes from anywhere accepted
          </label>
        </div>
      </div>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="field-label">Pay</legend>
        <Field label="From (€)" name="pay_min" inputMode="numeric" error={e.pay_min} />
        <Field label="To (€)" name="pay_max" inputMode="numeric" error={e.pay_max} />
        <div>
          <label htmlFor="c-unit" className="field-label">Per</label>
          <select id="c-unit" name="pay_unit" className="input" defaultValue="day">
            <option value="day">Day</option>
            <option value="session">Session</option>
            <option value="project">Project</option>
          </select>
        </div>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="field-label">Hard requirements (leave empty if open)</legend>
        <Field label="Min age" name="age_min" inputMode="numeric" placeholder="18" error={e.age_min} />
        <Field label="Max age" name="age_max" inputMode="numeric" error={e.age_max} />
        <div>
          <label htmlFor="c-gender" className="field-label">Gender, only if the script requires it</label>
          <select id="c-gender" name="gender_req" className="input" defaultValue="">
            <option value="">Any</option>
            <option value="female">Woman</option>
            <option value="male">Man</option>
            <option value="non_binary">Non-binary</option>
          </select>
        </div>
        <Field label="Required languages" name="languages_req" placeholder="Spanish" hint="Comma-separated." />
        <Field label="Wanted skills" name="skills_req" placeholder="driving, improv" hint="Ranks, doesn't filter." />
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Answer deadline" name="deadline" type="date" />
        <Field label="Shoot date" name="shoot_date" type="date" />
      </div>
      <TextArea label="Brief" name="description" rows={5} placeholder="Scene, tone, wardrobe, self-tape instructions…" />

      <FormMessage state={state} />
      <button className="btn btn-ink" disabled={pending}>
        {pending ? "Publishing…" : "Publish and see matches"}
      </button>
    </form>
  );
}

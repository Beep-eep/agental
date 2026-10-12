"use client";

import { useActionState } from "react";
import { updateCastingType, updatePlan, type CatalogResult } from "@/app/actions/catalog";
import { FormMessage } from "@/components/forms/field";
import type { Tables } from "@/lib/supabase/database.types";

export function PlanEditor({ plan, talentsOnPlan }: { plan: Tables<"plans">; talentsOnPlan: number }) {
  const [state, action, pending] = useActionState<CatalogResult, FormData>(updatePlan, null);
  return (
    <form action={action} className="space-y-3 rounded-xl bg-paper p-4 ring-1 ring-line">
      <input type="hidden" name="tier" value={plan.tier} />
      <div className="flex items-center justify-between gap-3">
        <p className="t-h3">{plan.name}</p>
        <span className="text-sm text-muted">{talentsOnPlan} talents on it</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Labeled label="Name">
          <input name="name" defaultValue={plan.name} className="input" />
        </Labeled>
        <Labeled label="Tagline">
          <input name="tagline" defaultValue={plan.tagline} className="input" />
        </Labeled>
        <Labeled label="Price per month (€)">
          <input name="monthly_price_eur" inputMode="decimal" defaultValue={plan.monthly_price_eur} className="input" />
        </Labeled>
        <Labeled label="Agent commission (%)">
          <input name="commission_pct" inputMode="decimal" defaultValue={plan.commission_pct} className="input" />
        </Labeled>
      </div>
      <Labeled label="Features (one per line)">
        <textarea name="features" defaultValue={plan.features.join("\n")} rows={4} className="input" />
      </Labeled>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_active" defaultChecked={plan.is_active} className="h-4 w-4 accent-[var(--ink)]" /> Shown on the site
        </label>
        <button className="btn btn-ink btn-sm" disabled={pending}>
          {pending ? "Saving…" : "Save plan"}
        </button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function CastingTypeEditor({ type }: { type: Tables<"casting_types"> }) {
  const [state, action, pending] = useActionState<CatalogResult, FormData>(updateCastingType, null);
  return (
    <form action={action} className="grid gap-3 py-4 md:grid-cols-[10rem_1fr_6rem_6rem_auto] md:items-end">
      <input type="hidden" name="category" value={type.category} />
      <Labeled label="Label">
        <input name="label" defaultValue={type.label} className="input" />
      </Labeled>
      <Labeled label="Summary">
        <input name="summary" defaultValue={type.summary} className="input" />
      </Labeled>
      <Labeled label={`Min / ${type.pay_unit}`}>
        <input name="pay_min" inputMode="numeric" defaultValue={type.pay_min ?? ""} className="input" />
      </Labeled>
      <Labeled label={`Max / ${type.pay_unit}`}>
        <input name="pay_max" inputMode="numeric" defaultValue={type.pay_max ?? ""} className="input" />
      </Labeled>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" name="is_active" defaultChecked={type.is_active} className="h-4 w-4 accent-[var(--ink)]" /> Live
        </label>
        <button className="btn btn-line btn-sm" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {state && (
        <div className="md:col-span-5">
          <FormMessage state={state} />
        </div>
      )}
    </form>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

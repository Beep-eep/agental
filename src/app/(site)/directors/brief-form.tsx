"use client";

import { useActionState } from "react";
import { submitBrief, type FormState } from "@/app/actions/leads";
import { AttributionFields } from "@/components/forms/attribution-fields";
import { Field, FormMessage, TextArea } from "@/components/forms/field";

export function BriefForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(submitBrief, null);
  const e = state?.errors ?? {};

  if (state?.ok) {
    return (
      <div className="panel p-6">
        <FormMessage state={state} />
      </div>
    );
  }

  return (
    <form action={action} className="panel space-y-4 p-6" noValidate>
      <AttributionFields />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" name="full_name" autoComplete="name" required error={e.full_name} />
        <Field label="Work email" name="email" type="email" autoComplete="email" required error={e.email} />
        <Field label="Production or company" name="company" autoComplete="organization" required error={e.company} />
        <Field label="Shoot city" name="city" placeholder="Los Angeles" error={e.city} />
      </div>
      <TextArea
        label="What are you casting?"
        name="message"
        rows={4}
        required
        placeholder="e.g. 6 bilingual EN/ES talents, 25–40, for a 2-day car commercial in Burbank, self-tapes by Friday."
        error={e.message}
      />
      <FormMessage state={state} />
      <button className="btn btn-ink w-full sm:w-auto" disabled={pending}>
        {pending ? "Sending…" : "Send the brief"}
      </button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { submitFeedback, type ActionResult } from "@/app/actions/talent";
import { FormMessage } from "@/components/forms/field";

/** NPS + the Sean Ellis product-market-fit question, written to public.feedback. */
export function FeedbackForm() {
  const [state, action, pending] = useActionState<ActionResult, FormData>(submitFeedback, null);
  if (state?.ok) return <FormMessage state={state} />;

  return (
    <form action={action} className="space-y-4">
      <fieldset>
        <legend className="field-label">How likely are you to recommend Agental to a friend?</legend>
        <div className="grid grid-cols-11 gap-1">
          {Array.from({ length: 11 }, (_, n) => (
            <label key={n} className="chip relative justify-center px-0 tabular">
              <input type="radio" name="nps" value={n} required />
              {n}
            </label>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-xs text-muted">
          <span>Not likely</span>
          <span>Very likely</span>
        </div>
      </fieldset>
      <fieldset>
        <legend className="field-label">How would you feel if you could no longer use Agental?</legend>
        <div className="flex flex-wrap gap-2">
          {[
            ["very", "Very disappointed"],
            ["somewhat", "Somewhat disappointed"],
            ["not", "Not disappointed"],
          ].map(([v, l]) => (
            <label key={v} className="chip relative">
              <input type="radio" name="pmf" value={v} />
              {l}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
        <div>
          <label htmlFor="fb-topic" className="field-label">
            It&apos;s mostly about
          </label>
          <select id="fb-topic" name="topic" className="input" defaultValue="matching">
            <option value="matching">Role matching</option>
            <option value="castings">Castings available</option>
            <option value="self_tape">Self-tape studio</option>
            <option value="onboarding">Sign-up & profile</option>
            <option value="pricing">Plans & pricing</option>
            <option value="payments">Getting paid</option>
            <option value="other">Something else</option>
          </select>
        </div>
        <div>
          <label htmlFor="fb-comment" className="field-label">
            Anything we should change? (optional)
          </label>
          <input id="fb-comment" name="comment" className="input" maxLength={2000} />
        </div>
      </div>
      <FormMessage state={state} />
      <button className="btn btn-ink btn-sm" disabled={pending}>
        {pending ? "Sending…" : "Send feedback"}
      </button>
    </form>
  );
}

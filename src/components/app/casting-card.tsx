"use client";

import { useState, useTransition } from "react";
import { applyToCasting, respondToProposal } from "@/app/actions/talent";
import { CATEGORY_LABEL, payRange, shortDate } from "@/lib/format";
import type { Enums } from "@/lib/supabase/database.types";

export type CardCasting = {
  id: string;
  title: string;
  production: string | null;
  category: Enums<"casting_category">;
  city: string;
  remote_ok: boolean;
  pay_min: number | null;
  pay_max: number | null;
  pay_unit: string;
  deadline: string | null;
  score: number | null;
  reasons: string[];
};

/**
 * One casting as a row the talent can act on.
 * mode "proposal": approve/decline an application the agent prepared.
 * mode "browse": apply directly (counts as approval).
 */
export function CastingCard({
  casting,
  mode,
  applicationId,
  applied = false,
}: {
  casting: CardCasting;
  mode: "proposal" | "browse";
  applicationId?: string;
  applied?: boolean;
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const done = result?.ok || applied;

  return (
    <article className="grid gap-4 py-5 sm:grid-cols-[1fr_auto] sm:items-start">
      <div className="min-w-0">
        <p className="text-sm text-muted">
          {CATEGORY_LABEL[casting.category]} · {casting.production ?? "Production"}
        </p>
        <h3 className="mt-0.5 text-lg font-semibold">{casting.title}</h3>
        <p className="mt-1 text-sm text-ink-2">
          {casting.remote_ok ? `${casting.city} or self-tape` : casting.city} · {payRange(casting.pay_min, casting.pay_max, casting.pay_unit)}
          {casting.deadline ? ` · answer by ${shortDate(casting.deadline)}` : ""}
        </p>
        {casting.reasons.length > 0 && (
          <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Why it fits you">
            {casting.reasons.map((r) => (
              <li key={r} className="rounded-full bg-cue-soft px-2.5 py-0.5 text-xs font-medium text-cue">
                {r}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-col items-start gap-2 sm:items-end">
        {casting.score != null && (
          <p className="text-sm">
            <span className="text-muted">Match </span>
            <strong className="tabular text-lg">{Math.round(casting.score)}</strong>
            <span className="text-muted">/100</span>
          </p>
        )}
        {result && (
          <p role="status" className={`text-sm ${result.ok ? "text-good" : "text-critical"}`}>
            {result.message}
          </p>
        )}
        {!done && mode === "proposal" && applicationId && (
          <div className="flex gap-2">
            <button
              className="btn btn-ink btn-sm"
              disabled={pending}
              onClick={() => start(async () => setResult(await respondToProposal(applicationId, "approved")))}
            >
              Approve
            </button>
            <button
              className="btn btn-line btn-sm"
              disabled={pending}
              onClick={() => start(async () => setResult(await respondToProposal(applicationId, "declined")))}
            >
              Not for me
            </button>
          </div>
        )}
        {!done && mode === "browse" && (
          <button className="btn btn-spot btn-sm" disabled={pending} onClick={() => start(async () => setResult(await applyToCasting(casting.id)))}>
            {pending ? "Applying…" : "Apply"}
          </button>
        )}
        {applied && !result && <span className="text-sm font-semibold text-good">Applied</span>}
      </div>
    </article>
  );
}

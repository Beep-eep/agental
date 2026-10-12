"use client";

import { useState, useTransition } from "react";
import { proposeTalents, setApplicationStatus, setCastingStatus } from "@/app/actions/studio";

type Match = {
  id: string;
  name: string;
  city: string | null;
  age: number | null;
  languages: string[];
  score: number;
  reasons: string[];
  proposed: boolean;
};

export function MatchPicker({ castingId, matches, disabled }: { castingId: string; matches: Match[]; disabled: boolean }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();

  if (matches.length === 0) {
    return <p className="text-muted">No represented talent passes these requirements yet. Loosen the age range or languages.</p>;
  }

  return (
    <div>
      <ul className="divide-y divide-line">
        {matches.map((m) => (
          <li key={m.id} className="flex items-start gap-3 py-3">
            <input
              type="checkbox"
              aria-label={`Select ${m.name}`}
              className="mt-1.5 h-4 w-4 accent-[var(--ink)]"
              disabled={m.proposed || disabled}
              checked={selected.includes(m.id) || m.proposed}
              onChange={(e) => setSelected((s) => (e.target.checked ? [...s, m.id] : s.filter((x) => x !== m.id)))}
            />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-semibold">{m.name}</span>
                <span className="text-sm text-muted">
                  {[m.age ? `${m.age}` : null, m.city, m.languages.slice(0, 3).join(", ")].filter(Boolean).join(" · ")}
                </span>
                {m.proposed && <span className="text-xs font-semibold text-good">Proposed</span>}
              </p>
              <ul className="mt-1.5 flex flex-wrap gap-1">
                {m.reasons.map((r) => (
                  <li key={r} className="rounded-full bg-cue-soft px-2 py-0.5 text-xs text-cue">
                    {r}
                  </li>
                ))}
              </ul>
            </div>
            <span className="tabular text-lg font-semibold" title="Match score out of 100">
              {Math.round(m.score)}
            </span>
          </li>
        ))}
      </ul>
      <div className="sticky bottom-0 mt-3 flex flex-wrap items-center gap-3 border-t border-line bg-card pt-3">
        <button
          className="btn btn-ink btn-sm"
          disabled={pending || selected.length === 0 || disabled}
          onClick={() =>
            start(async () => {
              const r = await proposeTalents(castingId, selected);
              setMsg(r);
              if (r.ok) setSelected([]);
            })
          }
        >
          {pending ? "Proposing…" : `Propose ${selected.length || ""} selected`}
        </button>
        <span className="text-sm text-muted">Each talent approves before being submitted to you.</span>
        {msg && (
          <p role="status" className={`w-full text-sm ${msg.ok ? "text-good" : "text-critical"}`}>
            {msg.message}
          </p>
        )}
      </div>
    </div>
  );
}

export function PipelineActions({ applicationId, castingId, status }: { applicationId: string; castingId: string; status: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const act = (s: "callback" | "booked" | "passed") =>
    start(async () => {
      const r = await setApplicationStatus(applicationId, s, castingId);
      if (!r.ok) setErr(r.message);
    });
  return (
    <div className="flex flex-wrap gap-1.5">
      {status !== "callback" && (
        <button className="btn btn-line btn-sm" disabled={pending} onClick={() => act("callback")}>
          Call back
        </button>
      )}
      <button className="btn btn-ink btn-sm" disabled={pending} onClick={() => act("booked")}>
        Book
      </button>
      <button className="btn btn-sm text-muted hover:text-ink" disabled={pending} onClick={() => act("passed")}>
        Pass
      </button>
      {err && <p className="w-full text-xs text-critical">{err}</p>}
    </div>
  );
}

export function CastingStatusButton({ castingId, status }: { castingId: string; status: "open" | "closed" }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="btn btn-line"
      disabled={pending}
      onClick={() => start(async () => void (await setCastingStatus(castingId, status === "open" ? "closed" : "open")))}
    >
      {status === "open" ? "Close casting" : "Reopen casting"}
    </button>
  );
}

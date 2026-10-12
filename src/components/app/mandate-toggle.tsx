"use client";

import { useState, useTransition } from "react";
import { setMandate } from "@/app/actions/talent";
import { shortDate } from "@/lib/format";

export function MandateToggle({ signedAt }: { signedAt: string | null }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const signed = Boolean(signedAt);

  return (
    <div>
      <p className="flex items-center gap-2 font-semibold">
        <span className="status-dot" style={{ background: signed ? "var(--good-mark)" : "var(--warn-mark)" }} aria-hidden="true" />
        {signed ? `Signed on ${shortDate(signedAt)}` : "Not signed"}
      </p>
      <p className="mt-1 text-sm text-muted">
        {signed
          ? "Agental can propose you for roles. You still approve each submission."
          : "Sign to let your agent propose you for roles. You still approve each submission."}
      </p>
      <button
        className={`btn btn-sm mt-3 ${signed ? "btn-line" : "btn-spot"}`}
        disabled={pending}
        onClick={() => {
          if (signed && !confirm("Withdraw your mandate? Pending proposals will stop.")) return;
          start(async () => setMsg(await setMandate(!signed)));
        }}
      >
        {signed ? "Withdraw mandate" : "Sign the mandate (v2026-10)"}
      </button>
      {msg && (
        <p role="status" className={`mt-2 text-sm ${msg.ok ? "text-good" : "text-critical"}`}>
          {msg.message}
        </p>
      )}
    </div>
  );
}

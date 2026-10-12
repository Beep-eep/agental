"use client";

import { useActionState } from "react";
import { signIn } from "@/app/actions/auth";
import { Field } from "@/components/forms/field";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, null);
  return (
    <form action={action} className="panel space-y-4 p-6">
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required />
      {state?.message && (
        <p role="alert" className="text-sm text-critical">
          {state.message}
        </p>
      )}
      <button className="btn btn-ink w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

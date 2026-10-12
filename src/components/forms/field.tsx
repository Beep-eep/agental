import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

type Common = { label: string; name: string; hint?: ReactNode; error?: string };

export function Field({ label, name, hint, error, ...rest }: Common & InputHTMLAttributes<HTMLInputElement>) {
  const id = rest.id ?? `f-${name}`;
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <input
        id={id}
        name={name}
        className="input"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        {...rest}
      />
      {error ? (
        <p id={`${id}-err`} className="mt-1 text-sm text-critical">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function TextArea({ label, name, hint, error, ...rest }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = rest.id ?? `f-${name}`;
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <textarea id={id} name={name} className="input" aria-invalid={error ? true : undefined} {...rest} />
      {error ? <p className="mt-1 text-sm text-critical">{error}</p> : hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

export function FormMessage({ state }: { state: { ok: boolean; message: string } | null }) {
  if (!state) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${state.ok ? "bg-[#e7f5e7] text-good" : "bg-[#fbeaea] text-critical"}`}
    >
      <span className="status-dot" style={{ background: state.ok ? "var(--good-mark)" : "var(--critical)" }} aria-hidden="true" />
      {state.message}
    </p>
  );
}

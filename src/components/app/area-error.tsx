"use client";

export function AreaError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="panel max-w-xl p-6">
      <h1 className="t-h2">This view couldn&apos;t load</h1>
      <p className="mt-2 text-ink-2">
        The database didn&apos;t answer as expected. Check that the Supabase project is running (free projects pause after a week of
        inactivity) and that your account has access.
      </p>
      {error.digest && <p className="mt-2 text-xs text-muted">Reference: {error.digest}</p>}
      <button className="btn btn-ink mt-5" onClick={reset}>
        Try again
      </button>
    </div>
  );
}

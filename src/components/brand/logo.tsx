import Link from "next/link";

/** Wordmark: a spot of tungsten light falling on the name. */
export function Logo({ href = "/", tone = "ink" }: { href?: string; tone?: "ink" | "light" }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2" aria-label="Agental home">
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
        <circle cx="13" cy="13" r="12" fill="var(--tungsten)" />
        <path d="M7 19 L13 6 L19 19" fill="none" stroke="var(--ink)" strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M9.6 14.6 H16.4" stroke="var(--ink)" strokeWidth="2.4" />
      </svg>
      <span
        className={`font-[family-name:var(--font-display)] text-[1.6rem] font-extrabold leading-none tracking-tight ${
          tone === "light" ? "text-white" : "text-ink"
        }`}
      >
        Agental
      </span>
    </Link>
  );
}

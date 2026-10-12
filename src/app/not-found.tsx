import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4">
      <Logo />
      <h1 className="t-h1 mt-10">This page isn&apos;t on the call sheet</h1>
      <p className="mt-3 text-ink-2">The link may be old, or the casting has closed.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="btn btn-ink">
          Go to the homepage
        </Link>
        <Link href="/castings" className="btn btn-line">
          Browse casting types
        </Link>
      </div>
    </main>
  );
}

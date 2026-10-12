import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : undefined;
  const failed = sp.error === "link";

  return (
    <div className="mx-auto max-w-md">
      <h1 className="t-h1">Welcome back</h1>
      <p className="mb-8 mt-3 text-ink-2">Sign in to see your castings, your shortlists or the insights.</p>
      {failed && (
        <p role="alert" className="mb-4 rounded-lg bg-[#fbeaea] px-3 py-2 text-sm text-critical">
          That sign-in link has expired. Sign in with your password, or ask for a new link.
        </p>
      )}
      <LoginForm next={next} />
      <p className="mt-6 text-sm text-muted">
        New here?{" "}
        <Link href="/join" className="font-semibold text-cue hover:underline">
          Become a member
        </Link>
      </p>
    </div>
  );
}

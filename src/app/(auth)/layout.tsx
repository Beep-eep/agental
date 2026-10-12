import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <Link href="/" className="text-sm text-muted hover:text-ink">
          Back to the site
        </Link>
      </header>
      <main id="main" className="mx-auto max-w-3xl px-4 pb-20 pt-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}

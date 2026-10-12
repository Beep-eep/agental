import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const COLUMNS = [
  {
    title: "For talents",
    links: [
      { href: "/how-it-works", label: "How it works" },
      { href: "/castings", label: "Casting types" },
      { href: "/pricing", label: "Pricing" },
      { href: "/join", label: "Become a member" },
    ],
  },
  {
    title: "For casting directors",
    links: [
      { href: "/directors", label: "Overview" },
      { href: "/directors#brief", label: "Send a brief" },
      { href: "/join?role=director", label: "Create a studio account" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About us" },
      { href: "/faq", label: "FAQ" },
      { href: "/login", label: "Sign in" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-ink text-white/80">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo tone="light" />
          <p className="mt-4 max-w-xs text-sm text-white/65">
            A real agent who represents you, and an AI that works for you around the clock. You approve everything sent in your
            name.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h2 className="mb-3 text-sm font-semibold text-white">{col.title}</h2>
            <ul className="space-y-2 text-sm">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-tungsten">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-white/50 sm:px-6">
          © {new Date().getFullYear()} Agental. Demo build: plans, figures and people shown in the dashboards are illustrative
          sample data.
        </p>
      </div>
    </footer>
  );
}

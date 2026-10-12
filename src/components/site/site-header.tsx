"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/brand/logo";
import { AccountNav } from "@/components/site/account-nav";
import { TrackedLink } from "@/components/analytics/tracked-link";

const TALENT_NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/castings", label: "Casting types" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About" },
];

const DIRECTOR_NAV = [
  { href: "/directors#how", label: "How shortlists work" },
  { href: "/directors#brief", label: "Send a brief" },
  { href: "/castings", label: "Talent we represent" },
  { href: "/faq#directors", label: "FAQ" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const audience = pathname.startsWith("/directors") ? "directors" : "talents";
  const nav = audience === "directors" ? DIRECTOR_NAV : TALENT_NAV;

  // Close the mobile menu after navigation (state derived during render, no effect needed).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/75">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Logo />

        <nav aria-label="Audience" className="hidden rounded-full border border-line bg-card p-1 md:flex">
          <AudienceTab href="/" active={audience === "talents"}>
            For talents
          </AudienceTab>
          <AudienceTab href="/directors" active={audience === "directors"}>
            For casting directors
          </AudienceTab>
        </nav>

        <nav aria-label="Main" className="ml-auto hidden items-center gap-5 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className="text-[0.95rem] text-ink-2 hover:text-ink aria-[current=page]:font-semibold aria-[current=page]:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <AccountNav />
          {audience === "talents" ? (
            <TrackedLink href="/join" event="cta_click" props={{ cta: "header_join" }} className="btn btn-spot btn-sm hidden sm:inline-flex">
              Become a member
            </TrackedLink>
          ) : (
            <TrackedLink href="/directors#brief" event="cta_click" props={{ cta: "header_brief" }} className="btn btn-ink btn-sm hidden sm:inline-flex">
              Send a brief
            </TrackedLink>
          )}
          <button
            type="button"
            className="btn btn-line btn-sm lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-line bg-paper lg:hidden">
          <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
            <div className="mb-4 grid grid-cols-2 gap-2">
              <Link href="/" className={`btn btn-sm ${audience === "talents" ? "btn-ink" : "btn-line"}`}>
                For talents
              </Link>
              <Link href="/directors" className={`btn btn-sm ${audience === "directors" ? "btn-ink" : "btn-line"}`}>
                For casting directors
              </Link>
            </div>
            <ul className="divide-y divide-line">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="block py-3 text-lg">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href={audience === "talents" ? "/join" : "/directors#brief"} className="btn btn-spot mt-4 w-full">
              {audience === "talents" ? "Become a member" : "Send a brief"}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function AudienceTab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
        active ? "bg-ink text-white" : "text-muted hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

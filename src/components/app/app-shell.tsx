import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { SideNav, type NavItem } from "@/components/app/side-nav";
import type { Viewer } from "@/lib/auth";

const ROLE_LABEL = { talent: "Talent", director: "Casting director", admin: "Agental team" } as const;

/** Shared chrome for the signed-in areas: sidebar on desktop, top tabs on mobile. */
export function AppShell({
  viewer,
  nav,
  area,
  children,
}: {
  viewer: Viewer;
  nav: NavItem[];
  area: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="border-b border-line bg-card lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center justify-between px-4 lg:px-5">
          <Logo />
          <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-semibold text-muted lg:hidden">{area}</span>
        </div>
        <div className="hidden px-5 pb-2 text-xs font-semibold text-muted lg:block">{area}</div>
        <SideNav items={nav} />
        <div className="hidden border-t border-line px-5 py-4 lg:absolute lg:bottom-0 lg:block lg:w-full">
          <p className="truncate text-sm font-semibold">{viewer.full_name || viewer.email}</p>
          <p className="truncate text-xs text-muted">{ROLE_LABEL[viewer.role]}</p>
          <div className="mt-3 flex items-center gap-3 text-sm">
            <Link href="/" className="text-muted hover:text-ink">
              Website
            </Link>
            <form action="/auth/signout" method="post">
              <button className="text-muted hover:text-ink">Sign out</button>
            </form>
          </div>
        </div>
      </aside>
      <main id="main" className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        {children}
      </main>
    </div>
  );
}

export function PageHeader({ title, lead, actions }: { title: string; lead?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="t-h1">{title}</h1>
        {lead && <p className="mt-2 max-w-2xl text-ink-2">{lead}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Section({ title, description, children, actions }: { title: string; description?: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="panel p-5 sm:p-6" aria-label={title}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="t-h3">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

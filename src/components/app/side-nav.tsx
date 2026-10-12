"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; exact?: boolean };

export function SideNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Section">
      <ul className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3 lg:pb-0">
        {items.map((it) => {
          const active = it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(`${it.href}/`);
          return (
            <li key={it.href} className="flex-none">
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={`block whitespace-nowrap rounded-lg px-3 py-2 text-sm ${
                  active ? "bg-ink font-semibold text-white" : "text-ink-2 hover:bg-paper hover:text-ink"
                }`}
              >
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

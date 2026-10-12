"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/lib/supabase/database.types";

type Me = { name: string; role: Enums<"user_role"> } | null;

const AREAS: Record<Enums<"user_role">, { href: string; label: string }[]> = {
  talent: [
    { href: "/app", label: "My dashboard" },
    { href: "/app/castings", label: "Castings for me" },
    { href: "/app/profile", label: "Profile & media" },
  ],
  director: [
    { href: "/studio", label: "My castings" },
    { href: "/studio/new", label: "Post a casting" },
  ],
  admin: [
    { href: "/insights", label: "Insights" },
    { href: "/insights/catalog", label: "Product catalog" },
    { href: "/studio", label: "Casting studio" },
  ],
};

/**
 * Reads the session in the browser so marketing pages stay statically
 * renderable; the role comes from the RLS-protected profiles row.
 */
export function AccountNav() {
  const [me, setMe] = useState<Me | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    async function load() {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) return !cancelled && setMe(null);
      const { data: p } = await supabase.from("profiles").select("full_name, role").eq("id", uid).single();
      if (!cancelled) setMe(p ? { name: p.full_name || "Account", role: p.role } : null);
    }
    void load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => void load());
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  if (me === undefined) return <span className="hidden w-16 sm:block" aria-hidden="true" />;

  if (me === null) {
    return (
      <Link href="/login" className="btn btn-sm px-3 text-ink-2 hover:text-ink">
        Sign in
      </Link>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="btn btn-line btn-sm"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-tungsten text-xs font-bold text-ink" aria-hidden="true">
          {me.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden max-w-[9rem] truncate sm:inline">{me.name}</span>
      </button>
      {open && (
        <div role="menu" className="panel absolute right-0 mt-2 w-56 overflow-hidden py-1 shadow-lg">
          {AREAS[me.role].map((a) => (
            <Link key={a.href} role="menuitem" href={a.href} className="block px-4 py-2.5 text-sm hover:bg-paper">
              {a.label}
            </Link>
          ))}
          <form action="/auth/signout" method="post" className="border-t border-line">
            <button role="menuitem" className="w-full px-4 py-2.5 text-left text-sm text-muted hover:bg-paper hover:text-ink">
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

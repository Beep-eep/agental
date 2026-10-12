"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { relativeTime } from "@/lib/format";

type Item = { id: string; at: string; text: string; kind: "visit" | "lead" | "signup" | "application" };

const KIND = {
  visit: { mark: "var(--viz-muted)", label: "Visit" },
  lead: { mark: "var(--series-4)", label: "Lead" },
  signup: { mark: "var(--series-3)", label: "Sign-up" },
  application: { mark: "var(--series-1)", label: "Pipeline" },
} as const;

/**
 * Supabase Realtime: Postgres changes stream to the dashboard. RLS still
 * applies to Realtime, so only admins receive these rows.
 */
export function LiveFeed({ initial }: { initial: Item[] }) {
  const [items, setItems] = useState<Item[]>(initial);
  const [status, setStatus] = useState<"connecting" | "live" | "offline">("connecting");
  const [, tick] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    const push = (it: Item) => setItems((prev) => [it, ...prev].slice(0, 25));
    const channel = supabase
      .channel("insights-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "events" }, ({ new: e }) => {
        if (e.name === "page_view" && e.user_id) return; // keep the feed readable
        push({
          id: `e${e.id}`,
          at: e.created_at,
          kind: e.name === "sign_up" ? "signup" : "visit",
          text: e.name === "page_view" ? `Visitor on ${e.path}${e.utm_source ? ` from ${e.utm_source}` : ""}` : `${e.name.replace(/_/g, " ")} on ${e.path ?? "site"}`,
        });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" }, ({ new: l }) => {
        push({ id: `l${l.id}`, at: l.created_at, kind: "lead", text: l.kind === "director" ? `Casting brief from ${l.company ?? "a director"}` : "New waitlist email" });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, ({ new: a }) => {
        if (!a || !("status" in a)) return;
        push({ id: `a${a.id}${a.status}`, at: a.updated_at ?? new Date().toISOString(), kind: "application", text: `Application moved to ${String(a.status).replace(/_/g, " ")}` });
      })
      .subscribe((s) => setStatus(s === "SUBSCRIBED" ? "live" : s === "CLOSED" || s === "CHANNEL_ERROR" ? "offline" : "connecting"));

    const timer = setInterval(() => tick((n) => n + 1), 30_000);
    return () => {
      clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div>
      <p className="mb-3 flex items-center gap-2 text-sm">
        <span
          className={`status-dot ${status === "live" ? "animate-pulse" : ""}`}
          style={{ background: status === "live" ? "var(--good-mark)" : status === "offline" ? "var(--critical)" : "var(--warn-mark)" }}
          aria-hidden="true"
        />
        {status === "live" ? "Live: new activity appears here instantly" : status === "offline" ? "Realtime disconnected" : "Connecting…"}
      </p>
      <ul className="max-h-96 divide-y divide-line overflow-y-auto" aria-live="polite">
        {items.map((it) => (
          <li key={it.id} className="flex items-start gap-3 py-2.5 text-sm">
            <span className="status-dot mt-1.5" style={{ background: KIND[it.kind].mark }} aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="font-medium">{KIND[it.kind].label}</span> <span className="text-ink-2">{it.text}</span>
            </span>
            <span className="tabular whitespace-nowrap text-xs text-muted">{relativeTime(it.at)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type { Item as FeedItem };

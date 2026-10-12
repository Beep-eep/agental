"use client";

import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";

/**
 * First-party analytics: every event goes straight into `public.events`
 * (insert-only for visitors thanks to RLS). No third-party tracker needed,
 * and the funnel can be joined with real sign-ups in SQL.
 */

const SESSION_KEY = "agental.sid";
const ATTR_KEY = "agental.attribution";

export type Attribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer?: string;
  landing_path?: string;
};

function safeGet(storage: "local" | "session", key: string) {
  try {
    return (storage === "local" ? window.localStorage : window.sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage: "local" | "session", key: string, value: string) {
  try {
    (storage === "local" ? window.localStorage : window.sessionStorage).setItem(key, value);
  } catch {
    /* storage blocked: tracking degrades to per-page sessions */
  }
}

let memorySession: string | null = null;

export function getSessionId() {
  const existing = safeGet("session", SESSION_KEY) ?? memorySession;
  if (existing) return existing;
  const id = `s-${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
  memorySession = id;
  safeSet("session", SESSION_KEY, id);
  return id;
}

/** First-touch attribution, kept for 30 days in localStorage. */
export function getAttribution(): Attribution {
  const stored = safeGet("local", ATTR_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as Attribution & { at: number };
      if (Date.now() - parsed.at < 30 * 86400_000) return parsed;
    } catch {
      /* ignore malformed */
    }
  }
  const params = new URLSearchParams(window.location.search);
  const ref = document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer : undefined;
  const attribution: Attribution = {
    utm_source: params.get("utm_source") ?? (ref ? new URL(ref).hostname.replace(/^www\./, "") : undefined),
    utm_medium: params.get("utm_medium") ?? undefined,
    utm_campaign: params.get("utm_campaign") ?? undefined,
    referrer: ref?.slice(0, 500),
    landing_path: window.location.pathname.slice(0, 300),
  };
  safeSet("local", ATTR_KEY, JSON.stringify({ ...attribution, at: Date.now() }));
  return attribution;
}

function device(): "mobile" | "tablet" | "desktop" {
  const w = window.innerWidth;
  return w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop";
}

export async function track(name: string, props: Record<string, Json> = {}) {
  if (typeof window === "undefined") return;
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const a = getAttribution();
    await supabase.from("events").insert({
      session_id: getSessionId(),
      user_id: data.session?.user.id ?? null,
      name,
      path: window.location.pathname.slice(0, 300),
      props,
      utm_source: a.utm_source?.slice(0, 80),
      utm_medium: a.utm_medium?.slice(0, 80),
      utm_campaign: a.utm_campaign?.slice(0, 120),
      referrer: a.referrer,
      device: device(),
    });
  } catch {
    /* analytics must never break the page */
  }
}

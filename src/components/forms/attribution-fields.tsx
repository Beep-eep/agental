"use client";

import { useEffect, useRef } from "react";
import { getAttribution, getSessionId } from "@/lib/tracking";

const KEYS = ["session_id", "utm_source", "utm_medium", "utm_campaign", "referrer", "landing_path"] as const;

/**
 * Hidden inputs that carry the visitor's session id and first-touch UTM into a form.
 * Values are written to the DOM after mount (browser-only data, no hydration mismatch).
 */
export function AttributionFields() {
  const refs = useRef<Partial<Record<(typeof KEYS)[number], HTMLInputElement | null>>>({});
  useEffect(() => {
    const values = { ...getAttribution(), session_id: getSessionId() };
    for (const k of KEYS) {
      const el = refs.current[k];
      if (el) el.value = values[k] ?? "";
    }
  }, []);
  return (
    <>
      {KEYS.map((k) => (
        <input
          key={k}
          type="hidden"
          name={k}
          defaultValue=""
          ref={(el) => {
            refs.current[k] = el;
          }}
        />
      ))}
    </>
  );
}

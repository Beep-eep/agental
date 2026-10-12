"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import type { Json } from "@/lib/supabase/database.types";
import { track } from "@/lib/tracking";

type Props = ComponentProps<typeof Link> & { event: string; props?: Record<string, Json> };

/** A Link that records a funnel event (e.g. cta_click, plan_interest) before navigating. */
export function TrackedLink({ event, props, onClick, ...rest }: Props) {
  return (
    <Link
      {...rest}
      onClick={(e) => {
        void track(event, props);
        onClick?.(e);
      }}
    />
  );
}

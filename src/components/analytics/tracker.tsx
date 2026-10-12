"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/tracking";

/** Records one page_view per client-side navigation. */
export function Tracker() {
  const pathname = usePathname();
  useEffect(() => {
    void track("page_view");
  }, [pathname]);
  return null;
}

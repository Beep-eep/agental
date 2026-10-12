"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Singleton browser client (Realtime subscriptions, Storage uploads, analytics events). */
export function createClient() {
  client ??= createBrowserClient<Database>(SUPABASE_URL, SUPABASE_KEY);
  return client;
}

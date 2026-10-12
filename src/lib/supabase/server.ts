import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

/**
 * Per-request client that carries the visitor's session cookie.
 * Every query runs as that user, so Row Level Security decides what comes back.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: the proxy refreshes the session instead.
        }
      },
    },
  });
}

/**
 * Cookie-less anonymous client for public, cacheable reads (catalog, open castings).
 * Uses the same publishable key; RLS limits it to what anonymous visitors may see.
 */
export function createPublicClient() {
  return createPlainClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

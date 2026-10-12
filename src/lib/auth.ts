import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Enums, Tables } from "@/lib/supabase/database.types";

export type Role = Enums<"user_role">;
export type Viewer = Pick<Tables<"profiles">, "id" | "email" | "full_name" | "role">;

/**
 * Data Access Layer: the single place that turns the session cookie into a
 * verified user + role. `getUser()` validates the JWT with Supabase Auth.
 * Cached per request so layouts and pages can call it freely.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .single();

  return profile ?? { id: user.id, email: user.email ?? "", full_name: "", role: "talent" };
});

/** Redirects unless the viewer has one of the roles. Admins may enter every area. */
export async function requireRole(roles: Role[], next = "/") {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (viewer.role !== "admin" && !roles.includes(viewer.role)) redirect(homeFor(viewer.role));
  return viewer;
}

export function homeFor(role: Role) {
  return role === "admin" ? "/insights" : role === "director" ? "/studio" : "/app";
}

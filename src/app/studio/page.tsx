import Link from "next/link";
import { PageHeader, Section } from "@/components/app/app-shell";
import { getViewer } from "@/lib/auth";
import { CATEGORY_LABEL, shortDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

type Row = Pick<Tables<"castings">, "id" | "title" | "category" | "city" | "status" | "deadline" | "created_at"> & {
  applications: Pick<Tables<"applications">, "status">[];
};

export default async function StudioHome() {
  const viewer = (await getViewer())!;
  const supabase = await createClient();
  let query = supabase
    .from("castings")
    .select("id, title, category, city, status, deadline, created_at, applications(status)")
    .order("created_at", { ascending: false })
    .limit(60);
  // Admins see every casting through RLS; scope the studio to their own unless they own none.
  if (viewer.role === "director") query = query.eq("director_id", viewer.id);
  const { data } = await query.overrideTypes<Row[], { merge: false }>();
  const rows = data ?? [];

  const count = (r: Row, ...s: string[]) => r.applications.filter((a) => s.includes(a.status)).length;

  return (
    <>
      <PageHeader
        title="My castings"
        lead="Post a role, review ranked matches, propose talents. Each talent confirms before they reach you."
        actions={
          <Link href="/studio/new" className="btn btn-spot">
            Post a casting
          </Link>
        }
      />
      <Section title={`${rows.filter((r) => r.status === "open").length} open · ${rows.length} total`}>
        {rows.length === 0 ? (
          <p className="text-muted">
            No casting yet. <Link href="/studio/new" className="font-semibold text-cue hover:underline">Post your first one</Link>; matches
            appear instantly.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted">
                <tr className="border-b border-line">
                  <th className="py-2 pr-4 font-medium">Casting</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 text-right font-medium">Awaiting talent</th>
                  <th className="py-2 pr-4 text-right font-medium">Confirmed</th>
                  <th className="py-2 pr-4 text-right font-medium">Callbacks</th>
                  <th className="py-2 pr-4 text-right font-medium">Booked</th>
                  <th className="py-2 text-right font-medium">Deadline</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-line last:border-0 hover:bg-paper">
                    <td className="py-3 pr-4">
                      <Link href={`/studio/${r.id}`} className="font-semibold hover:text-cue">
                        {r.title}
                      </Link>
                      <span className="block text-xs text-muted">
                        {CATEGORY_LABEL[r.category]} · {r.city}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="status-dot" style={{ background: r.status === "open" ? "var(--good-mark)" : "var(--viz-muted)" }} aria-hidden="true" />
                        {r.status === "open" ? "Open" : r.status === "closed" ? "Closed" : "Draft"}
                      </span>
                    </td>
                    <td className="tabular py-3 pr-4 text-right">{count(r, "awaiting_talent", "proposed")}</td>
                    <td className="tabular py-3 pr-4 text-right">{count(r, "approved", "queued", "submitted")}</td>
                    <td className="tabular py-3 pr-4 text-right">{count(r, "callback")}</td>
                    <td className="tabular py-3 pr-4 text-right font-semibold">{count(r, "booked")}</td>
                    <td className="tabular py-3 text-right text-muted">{shortDate(r.deadline)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}

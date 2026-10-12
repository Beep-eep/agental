import Link from "next/link";
import { PageHeader, Section } from "@/components/app/app-shell";
import { CATEGORY_LABEL, CHANNEL_LABEL, shortDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { Constants, type Tables } from "@/lib/supabase/database.types";

const STEP = ["", "Account", "Identity", "Profile", "Headshot", "Mandate signed"];
const PAGE = 50;

type Row = Pick<
  Tables<"talents">,
  "id" | "stage_name" | "city" | "categories" | "languages" | "onboarding_step" | "plan" | "utm_source" | "created_at" | "mandate_signed_at"
> & { profiles: { full_name: string; email: string } | null; completeness: number };

export default async function TalentRosterPage({ searchParams }: PageProps<"/insights/talents">) {
  const sp = await searchParams;
  const page = Math.max(0, Number(sp.page ?? 0) || 0);
  const step = Number(sp.step);
  const category = Constants.public.Enums.casting_category.find((c) => c === sp.category);
  const channel = typeof sp.channel === "string" ? sp.channel : undefined;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";

  const supabase = await createClient();
  let query = supabase
    .from("talents")
    .select("id, stage_name, city, categories, languages, onboarding_step, plan, utm_source, created_at, mandate_signed_at, completeness, profiles(full_name, email)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * PAGE, page * PAGE + PAGE - 1);
  if (step >= 1 && step <= 5) query = query.eq("onboarding_step", step);
  if (category) query = query.contains("categories", [category]);
  if (channel) query = channel === "direct" ? query.is("utm_source", null) : query.eq("utm_source", channel);
  if (q) query = query.or(`stage_name.ilike.%${q.replace(/[%,()]/g, "")}%,city.ilike.%${q.replace(/[%,()]/g, "")}%`);

  const { data, count } = await query.overrideTypes<Row[], { merge: false }>();
  const rows = data ?? [];
  const params = new URLSearchParams(Object.entries(sp).filter(([k, v]) => k !== "page" && typeof v === "string") as [string, string][]);

  return (
    <>
      <PageHeader
        title="Talent roster"
        lead="Every registered talent, readable only by the Agental team (RLS). Filter, then export what you need."
        actions={
          <a href={`/api/insights/talents.csv?${params.toString()}`} className="btn btn-line">
            Export CSV
          </a>
        }
      />

      <form className="mb-5 flex flex-wrap items-end gap-3" method="get">
        <div>
          <label htmlFor="r-q" className="field-label">Search</label>
          <input id="r-q" name="q" defaultValue={q} placeholder="Name or city" className="input w-48" />
        </div>
        <div>
          <label htmlFor="r-step" className="field-label">Onboarding</label>
          <select id="r-step" name="step" defaultValue={sp.step as string | undefined} className="input w-44">
            <option value="">Any step</option>
            {STEP.slice(1).map((s, i) => (
              <option key={s} value={i + 1}>
                {i + 1}. {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="r-cat" className="field-label">Casting type</label>
          <select id="r-cat" name="category" defaultValue={category} className="input w-48">
            <option value="">Any type</option>
            {Constants.public.Enums.casting_category.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="r-ch" className="field-label">Channel</label>
          <select id="r-ch" name="channel" defaultValue={channel} className="input w-44">
            <option value="">Any channel</option>
            {Object.entries(CHANNEL_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-ink">Apply filters</button>
        <Link href="/insights/talents" className="btn btn-sm text-muted hover:text-ink">
          Reset
        </Link>
      </form>

      <Section title={`${count ?? 0} talents`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="py-2 pr-4 font-medium">Talent</th>
                <th className="py-2 pr-4 font-medium">City</th>
                <th className="py-2 pr-4 font-medium">Casting types</th>
                <th className="py-2 pr-4 font-medium">Onboarding</th>
                <th className="py-2 pr-4 text-right font-medium">Strength</th>
                <th className="py-2 pr-4 font-medium">Channel</th>
                <th className="py-2 text-right font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="py-2.5 pr-4">
                    <span className="font-semibold">{r.stage_name ?? r.profiles?.full_name ?? "–"}</span>
                    <span className="block text-xs text-muted">{r.profiles?.email}</span>
                  </td>
                  <td className="py-2.5 pr-4">{r.city ?? "–"}</td>
                  <td className="py-2.5 pr-4 text-ink-2">{r.categories.map((c) => CATEGORY_LABEL[c]).join(", ") || "–"}</td>
                  <td className="py-2.5 pr-4">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="status-dot" style={{ background: r.onboarding_step === 5 ? "var(--good-mark)" : "var(--warn-mark)" }} aria-hidden="true" />
                      {STEP[r.onboarding_step]}
                    </span>
                  </td>
                  <td className="tabular py-2.5 pr-4 text-right">{r.completeness}</td>
                  <td className="py-2.5 pr-4">{CHANNEL_LABEL[r.utm_source ?? "direct"] ?? r.utm_source}</td>
                  <td className="tabular py-2.5 text-right text-muted">{shortDate(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted">
            Page {page + 1} of {Math.max(1, Math.ceil((count ?? 0) / PAGE))}
          </span>
          <div className="flex gap-2">
            {page > 0 && (
              <Link className="btn btn-line btn-sm" href={`/insights/talents?${params.toString()}&page=${page - 1}`}>
                Previous
              </Link>
            )}
            {(page + 1) * PAGE < (count ?? 0) && (
              <Link className="btn btn-line btn-sm" href={`/insights/talents?${params.toString()}&page=${page + 1}`}>
                Next
              </Link>
            )}
          </div>
        </div>
      </Section>
    </>
  );
}

import { PageHeader, Section } from "@/components/app/app-shell";
import { createClient } from "@/lib/supabase/server";
import { CastingTypeEditor, PlanEditor } from "./editors";

export default async function CatalogPage() {
  const supabase = await createClient();
  const [{ data: plans }, { data: types }, { data: demand }] = await Promise.all([
    supabase.from("plans").select("*").order("sort_order"),
    supabase.from("casting_types").select("*").order("sort_order"),
    supabase.from("talents").select("plan"),
  ]);
  const onPlan = (tier: string) => (demand ?? []).filter((d) => d.plan === tier).length;

  return (
    <>
      <PageHeader
        title="Product catalog"
        lead="The website reads plans and casting types from these tables. Edit here, and /pricing and /castings update within seconds: no deploy, no code change."
      />
      <div className="space-y-6">
        <Section title="Plans" description="Pausing a plan hides it from the site but keeps talents already on it.">
          <div className="grid gap-4 lg:grid-cols-2">
            {(plans ?? []).map((p) => (
              <PlanEditor key={p.tier} plan={p} talentsOnPlan={onPlan(p.tier)} />
            ))}
          </div>
        </Section>
        <Section title="Casting types" description="Labels, summaries and pay ranges shown on the public casting pages.">
          <div className="divide-y divide-line">
            {(types ?? []).map((t) => (
              <CastingTypeEditor key={t.category} type={t} />
            ))}
          </div>
        </Section>
      </div>
    </>
  );
}

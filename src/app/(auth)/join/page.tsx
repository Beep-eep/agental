import type { Metadata } from "next";
import { Constants, type Enums } from "@/lib/supabase/database.types";
import { JoinWizard } from "./join-wizard";

export const metadata: Metadata = { title: "Become a member" };

export default async function JoinPage({ searchParams }: PageProps<"/join">) {
  const sp = await searchParams;
  const role = sp.role === "director" ? "director" : "talent";
  const plan = (Constants.public.Enums.plan_tier as readonly string[]).includes(String(sp.plan))
    ? (sp.plan as Enums<"plan_tier">)
    : "free";
  const interest = (Constants.public.Enums.casting_category as readonly string[]).includes(String(sp.interest))
    ? (sp.interest as Enums<"casting_category">)
    : undefined;

  return (
    <>
      <h1 className="t-h1">{role === "director" ? "Open your studio account" : "Create your artist account"}</h1>
      <p className="mb-8 mt-3 text-ink-2">
        {role === "director"
          ? "Post castings, see ranked matches and receive confirmed talents. Free during the pilot."
          : "Free. We represent you, the AI works for you, and you approve everything."}
      </p>
      <JoinWizard initialRole={role} initialPlan={plan} initialInterest={interest} />
    </>
  );
}

import { PageHeader, Section } from "@/components/app/app-shell";
import { CastingForm } from "./casting-form";

export default function NewCastingPage() {
  return (
    <>
      <PageHeader title="Post a casting" lead="Describe the role once. Hard requirements filter; everything else ranks." />
      <Section title="The role">
        <CastingForm />
      </Section>
    </>
  );
}

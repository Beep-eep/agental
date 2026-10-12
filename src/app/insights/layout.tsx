import { AppShell } from "@/components/app/app-shell";
import { requireRole } from "@/lib/auth";

export default async function InsightsLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireRole(["admin"], "/insights");
  return (
    <AppShell
      viewer={viewer}
      area="Agental insights"
      nav={[
        { href: "/insights", label: "Overview", exact: true },
        { href: "/insights/acquisition", label: "Acquisition" },
        { href: "/insights/validation", label: "Validation & feedback" },
        { href: "/insights/marketplace", label: "Marketplace" },
        { href: "/insights/talents", label: "Talent roster" },
        { href: "/insights/catalog", label: "Product catalog" },
        { href: "/studio", label: "Casting studio" },
      ]}
    >
      {children}
    </AppShell>
  );
}

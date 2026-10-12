import { AppShell } from "@/components/app/app-shell";
import { requireRole } from "@/lib/auth";

export default async function TalentLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireRole(["talent"], "/app");
  return (
    <AppShell
      viewer={viewer}
      area="Talent space"
      nav={[
        { href: "/app", label: "Overview", exact: true },
        { href: "/app/castings", label: "Castings for me" },
        { href: "/app/profile", label: "Profile & mandate" },
      ]}
    >
      {children}
    </AppShell>
  );
}

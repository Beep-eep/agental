import { AppShell } from "@/components/app/app-shell";
import { requireRole } from "@/lib/auth";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireRole(["director"], "/studio");
  return (
    <AppShell
      viewer={viewer}
      area="Casting studio"
      nav={[
        { href: "/studio", label: "My castings", exact: true },
        { href: "/studio/new", label: "Post a casting" },
        ...(viewer.role === "admin" ? [{ href: "/insights", label: "Back to insights" }] : []),
      ]}
    >
      {children}
    </AppShell>
  );
}

import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireUser();
  return <AppShell name={profile.full_name} role={profile.role?.name ?? "User"}>{children}</AppShell>;
}

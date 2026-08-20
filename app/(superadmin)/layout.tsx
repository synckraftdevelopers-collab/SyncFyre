import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { SuperAdminShell } from "@/components/superadmin/superadmin-shell";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireUser(["super_admin"]);
  return (
    <SuperAdminShell name={profile.full_name} role="Super Admin">
      {children}
    </SuperAdminShell>
  );
}

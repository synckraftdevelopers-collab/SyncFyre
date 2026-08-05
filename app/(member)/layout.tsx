import { requireUser } from "@/lib/auth";
import { PortalShell } from "@/components/layout/portal-shell";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireUser(["member"]);
  return (
    <PortalShell
      name={profile.full_name}
      role="Member"
      portal="member"
      settingsHref="/member/profile"
      notificationsHref="/member/notifications"
    >
      {children}
    </PortalShell>
  );
}

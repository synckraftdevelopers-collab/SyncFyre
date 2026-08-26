import { redirect } from "next/navigation";
import { getPortalContext } from "@/lib/auth";
import { PORTAL_DASHBOARD } from "@/lib/portals";
import type { UserRole } from "@/types";

export default async function Home() {
  const profile = await getPortalContext();
  if (profile?.role?.slug === "owner" && !profile.onboarding_completed_at) redirect("/onboarding");
  if (profile?.role?.slug) redirect(PORTAL_DASHBOARD[profile.role.slug as UserRole] ?? "/login");
  redirect("/login");
}

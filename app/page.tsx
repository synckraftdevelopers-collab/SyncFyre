import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { PORTAL_DASHBOARD } from "@/lib/portals";
import type { UserRole } from "@/types";

export default async function Home() {
  const profile = await getCurrentProfile();
  if (profile?.role?.slug) {
    redirect(PORTAL_DASHBOARD[profile.role.slug as UserRole] ?? "/login");
  }
  redirect("/login");
}

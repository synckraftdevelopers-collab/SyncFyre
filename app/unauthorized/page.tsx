import Link from "next/link";
import { ShieldX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth";
import { PORTAL_DASHBOARD } from "@/lib/portals";
import type { UserRole } from "@/types";

export default async function Unauthorized() {
  const profile = await getCurrentProfile();
  const dest = profile?.role?.slug
    ? (PORTAL_DASHBOARD[profile.role.slug as UserRole] ?? "/login")
    : "/login";

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="text-center">
        <ShieldX className="mx-auto mb-4 size-14 text-destructive" />
        <h1 className="text-2xl font-bold">Access denied</h1>
        <p className="mb-6 mt-2 text-muted-foreground">
          Your role does not have permission to access this page.
        </p>
        <Link className={buttonVariants({})} href={dest}>
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}

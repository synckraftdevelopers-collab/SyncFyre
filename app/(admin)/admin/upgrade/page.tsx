import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { requirePortalContext } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Upgrade Required" };

export default async function AdminUpgradePage({ searchParams }: { searchParams: Promise<{ feature?: string; next?: string }> }) {
  const profile = await requirePortalContext(["owner", "admin", "manager"]);
  const params = await searchParams;
  const feature = params.feature?.trim() || "This feature";
  const next = params.next?.trim() || "/admin/dashboard";
  const backHref = next.startsWith("/admin") ? next : "/admin/dashboard";

  return (
    <div className="grid min-h-[calc(100vh-10rem)] place-items-center py-10">
      <Card className="w-full max-w-2xl border-dashed">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 grid size-14 place-items-center rounded-full bg-amber-500/10 text-amber-600">
            <ShieldAlert className="size-7" />
          </div>
          <CardTitle className="text-2xl">Paid Plan required</CardTitle>
          <CardDescription>
            {feature} is available on the Paid Plan. Your tenant is currently on the Free Plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Ask SuperAdmin to move this tenant from Free to Paid, then return here. Phase 1 workflows stay available on Free.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href={backHref} className={buttonVariants({})}>
              Back to workspace
            </Link>
            <Link href="/admin/settings?tab=application" className={buttonVariants({ variant: "outline" })}>
              Upgrade to Paid
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            Signed in as {profile.full_name}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

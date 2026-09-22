import Link from "next/link";
import { Building2 } from "lucide-react";
import { ReportsOverviewClient } from "@/components/reports/reports-overview-client";
import { requireUser } from "@/lib/auth";
import { hasCurrentFeature } from "@/lib/entitlements/server";
import { getReportsOverview } from "@/services/reports-analytics.service";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Reports" };

export default async function AdminReportsPage() {
  const profile = await requireUser(["admin", "manager", "reception", "trainer", "dietician"]);
  const branchId = profile.role?.slug === "admin" || profile.role?.slug === "manager" ? null : profile.branch_id;
  const [data, showConsolidated] = await Promise.all([
    getReportsOverview({ datePreset: "this_month" }, branchId),
    // Consolidated Cross-Branch Reports (P3-11) is Scale-only, same
    // `multi_branch` billing key the "Branches" nav item already uses.
    hasCurrentFeature("multi_branch"),
  ]);

  return (
    <div className="space-y-4">
      {showConsolidated ? (
        <div className="flex justify-end">
          <Link
            href="/admin/reports/consolidated"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
          >
            <Building2 className="size-4" />
            All Branches / Consolidated View
          </Link>
        </div>
      ) : null}
      <ReportsOverviewClient initialData={data} />
    </div>
  );
}

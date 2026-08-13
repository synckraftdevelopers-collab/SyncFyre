import { ReportsOverviewClient } from "@/components/reports/reports-overview-client";
import { requireUser } from "@/lib/auth";
import { getReportsOverview } from "@/services/reports-analytics.service";

export const metadata = { title: "Reports" };

export default async function AdminReportsPage() {
  const profile = await requireUser(["admin", "manager", "reception", "trainer", "dietician"]);
  const branchId = profile.role?.slug === "admin" || profile.role?.slug === "manager" ? null : profile.branch_id;
  const data = await getReportsOverview({ datePreset: "this_month" }, branchId);

  return <ReportsOverviewClient initialData={data} />;
}

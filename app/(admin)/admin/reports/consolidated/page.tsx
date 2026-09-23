import Link from "next/link";
import { Building2, IndianRupee, TrendingUp, UsersRound } from "lucide-react";
import { requirePortalContext } from "@/lib/auth";
import { hasCurrentFeature } from "@/lib/entitlements/server";
import { getConsolidatedReportAction } from "@/app/actions/report-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { ConsolidatedExportButton } from "@/components/reports/consolidated-export-button";

export const metadata = { title: "Consolidated Reports" };

export default async function ConsolidatedReportsPage() {
  await requirePortalContext(["owner", "admin", "manager"]);
  const isScale = await hasCurrentFeature("multi_branch");

  if (!isScale) {
    // Middleware's FEATURE_ROUTE_PREFIXES entry for this route already
    // redirects non-Scale tenants to /admin/upgrade before they get here —
    // this fallback is defence-in-depth for direct navigation/prefetch races.
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Consolidated Cross-Branch Reports</h1>
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Consolidated cross-branch reporting is available on the Scale plan.{" "}
            <Link href="/admin/upgrade" className="font-medium text-primary underline">
              Upgrade your plan
            </Link>{" "}
            to see tenant-wide revenue and member totals across every branch.
          </CardContent>
        </Card>
      </div>
    );
  }

  const result = await getConsolidatedReportAction();

  if (result.error || !result.data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Consolidated Cross-Branch Reports</h1>
        <p className="text-sm text-destructive">{result.error ?? "Unable to load data."}</p>
      </div>
    );
  }

  const { revenue, members } = result.data;

  // Merge the revenue and member-stats per-branch arrays into one
  // comparison-table row per branch, keyed by branch id.
  const branchRows = revenue.branches.map((rb) => {
    const mb = members.branches.find((m) => m.branchId === rb.branchId);
    return {
      branchId: rb.branchId,
      branchName: rb.branchName,
      netRevenue: rb.netRevenue,
      transactionCount: rb.transactionCount,
      activeMembers: mb?.activeMembers ?? 0,
      newMembers: mb?.newMembersThisPeriod ?? 0,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Building2 className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Consolidated Cross-Branch Reports</h1>
          <p className="text-sm text-muted-foreground">
            Tenant-wide totals for {revenue.dateFrom} to {revenue.dateTo}, across all branches.
          </p>
        </div>
        <Badge variant="secondary" className="ml-auto mt-1">Scale</Badge>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <IndianRupee className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Net Revenue</p>
              <p className="text-xl font-bold">{formatCurrency(revenue.totalNetRevenue)}</p>
              <p className="text-xs text-muted-foreground">{revenue.totalTransactions} transactions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-blue-100 text-blue-600">
              <UsersRound className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active Members</p>
              <p className="text-xl font-bold">{members.totalActiveMembers}</p>
              <p className="text-xs text-muted-foreground">across {branchRows.length} branches</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-green-100 text-green-600">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">New Members</p>
              <p className="text-xl font-bold">{members.totalNewMembersThisPeriod}</p>
              <p className="text-xs text-muted-foreground">this period</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branch comparison table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Branch Comparison</CardTitle>
          <ConsolidatedExportButton rows={branchRows} dateFrom={revenue.dateFrom} dateTo={revenue.dateTo} />
        </CardHeader>
        <CardContent className="p-0">
          {branchRows.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No branches found for your organization.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Branch</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Net Revenue</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Transactions</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Active Members</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">New Members</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {branchRows.map((row) => (
                    <tr key={row.branchId} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{row.branchName}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(row.netRevenue)}</td>
                      <td className="px-4 py-3 text-right">{row.transactionCount}</td>
                      <td className="px-4 py-3 text-right">{row.activeMembers}</td>
                      <td className="px-4 py-3 text-right">{row.newMembers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

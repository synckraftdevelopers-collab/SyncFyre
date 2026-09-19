import { Lock, TrendingUp } from "lucide-react";
import { getMonthlyRevenueSummary } from "@/services/report.service";
import { requirePortalContext } from "@/lib/auth";
import { hasCurrentFeature } from "@/lib/entitlements/server";
import { getRevenueIntelligenceAction } from "@/app/actions/report-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SortableTh, readSort } from "@/components/ui/sortable-th";

export const metadata = { title: "Revenue Report" };

const SORTABLE_COLUMNS = [
  { label: "Month", column: "month" as const },
  { label: "Transactions", column: "transactions" as const },
  { label: "Gross", column: "gross" as const },
  { label: "Refunds", column: "refunds" as const },
  { label: "Net Revenue", column: "net" as const },
];

function fmt(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

export default async function RevenueReport({
  searchParams,
}: {
  searchParams: Promise<{ colSort?: string; colDir?: string }>;
}) {
  const sp = await searchParams;
  const profile = await requirePortalContext(["owner", "admin", "manager"]);

  // Soft checks — both sections render for all plans;
  // the locked card is shown to non-Scale users so they can see the feature exists.
  const hasRevenueReport = await hasCurrentFeature("advanced_reports");
  const isScale = await hasCurrentFeature("revenue_intelligence");

  // Only fetch actual data when the plan allows it
  let rows = hasRevenueReport
    ? await getMonthlyRevenueSummary({ branchId: profile.branch_id })
    : [];

  const { sort: colSort, dir: colDir } = readSort(
    sp as Record<string, string | undefined>,
    SORTABLE_COLUMNS.map((c) => c.column),
    { sort: "colSort", dir: "colDir" },
  );
  if (colSort) {
    const dirMul = colDir === "desc" ? -1 : 1;
    const sortValue = (row: (typeof rows)[number]): string | number => {
      switch (colSort) {
        case "month": return row.revenue_month_label ?? "";
        case "transactions": return row.transaction_count ?? 0;
        case "gross": return row.gross_amount ?? 0;
        case "refunds": return row.total_refunds ?? 0;
        case "net": return row.net_revenue ?? 0;
        default: return "";
      }
    };
    rows = [...rows].sort((a, b) => {
      const av = sortValue(a);
      const bv = sortValue(b);
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dirMul;
      return ((av as number) < (bv as number) ? -1 : (av as number) > (bv as number) ? 1 : 0) * dirMul;
    });
  }

  // Fetch intelligence only for Scale tenants
  const intelligence = isScale
    ? (await getRevenueIntelligenceAction()).data
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Revenue Report</h1>
        <p className="text-sm text-muted-foreground">
          Monthly revenue including refunds and net collections.
        </p>
      </div>

      {/* ── Standard revenue table — locked for Essential ── */}
      {!hasRevenueReport ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-muted">
              <Lock className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">Revenue Report</p>
              <p className="text-sm text-muted-foreground">
                Detailed revenue reports are available on the Growth plan and above.
              </p>
            </div>
            <Badge variant="secondary" className="mt-1">Growth Plan required</Badge>
          </CardContent>
        </Card>
      ) : (
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="border-b text-left text-xs uppercase text-muted-foreground">
              <tr>
                {SORTABLE_COLUMNS.map(({ label, column }) => (
                  <SortableTh
                    key={column}
                    label={label}
                    column={column}
                    basePath="/admin/reports/revenue"
                    searchParams={sp as Record<string, string | undefined>}
                    currentSort={colSort}
                    currentDir={colDir}
                    paramNames={{ sort: "colSort", dir: "colDir" }}
                    className="p-3 font-medium"
                  />
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={`${row.revenue_month}-${row.branch_name}`}>
                  <td className="p-3 font-medium">{row.revenue_month_label}</td>
                  <td className="p-3">{row.transaction_count}</td>
                  <td className="p-3">{fmt(row.gross_amount)}</td>
                  <td className="p-3">{fmt(row.total_refunds)}</td>
                  <td className="p-3 font-semibold">{fmt(row.net_revenue)}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td className="p-8 text-center text-muted-foreground" colSpan={5}>
                    No revenue data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      )} {/* end hasRevenueReport */}

      {/* ── Revenue Intelligence — Scale only, hidden for non-Scale plans ── */}
      {!isScale ? null : intelligence ? (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-5 text-primary" />
            <h2 className="text-lg font-semibold">Revenue Intelligence</h2>
            <Badge variant="secondary" className="ml-auto">Scale</Badge>
          </div>

          {/* Summary metric cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground">Collection Efficiency</p>
                <p className="mt-1 text-2xl font-bold">{intelligence.collectionEfficiency}%</p>
                <p className="text-xs text-muted-foreground">of invoiced amount collected</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground">Revenue per Member</p>
                <p className="mt-1 text-2xl font-bold">{fmt(intelligence.revenuePerMember)}</p>
                <p className="text-xs text-muted-foreground">avg across active members (6-mo)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground">6-Month Total</p>
                <p className="mt-1 text-2xl font-bold">
                  {fmt(intelligence.monthlyTrend.reduce((s, r) => s + r.revenue, 0))}
                </p>
                <p className="text-xs text-muted-foreground">net revenue collected</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground">3-Month Forecast</p>
                <p className="mt-1 text-2xl font-bold">
                  {fmt(intelligence.forecast.reduce((s, f) => s + f.forecast, 0))}
                </p>
                <p className="text-xs text-muted-foreground">projected next 3 months</p>
              </CardContent>
            </Card>
          </div>

          {/* Month-over-Month trend table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Month-over-Month Trend</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="pb-3">Month</th>
                    <th className="pb-3">Revenue</th>
                    <th className="pb-3">vs Prev Month</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {intelligence.monthlyTrend.map((row, i) => {
                    const prev = i > 0 ? intelligence.monthlyTrend[i - 1].revenue : null;
                    const diff = prev !== null ? row.revenue - prev : null;
                    const pct =
                      diff !== null && prev !== null && prev > 0
                        ? ((diff / prev) * 100).toFixed(1)
                        : null;
                    return (
                      <tr key={row.month}>
                        <td className="py-2 font-medium">{row.label}</td>
                        <td className="py-2">{fmt(row.revenue)}</td>
                        <td className="py-2">
                          {diff === null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : diff >= 0 ? (
                            <span className="text-emerald-600">
                              +{fmt(diff)} {pct ? `(+${pct}%)` : ""}
                            </span>
                          ) : (
                            <span className="text-destructive">
                              {fmt(diff)} {pct ? `(${pct}%)` : ""}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* 3-month forecast */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">3-Month Linear Forecast</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="pb-3">Month</th>
                    <th className="pb-3">Projected Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {intelligence.forecast.map((f) => (
                    <tr key={f.month}>
                      <td className="py-2 font-medium">{f.label}</td>
                      <td className="py-2 text-primary font-semibold">{fmt(f.forecast)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-muted-foreground">
                Forecast based on linear regression of the last 6 months of revenue. Actual results
                may vary.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

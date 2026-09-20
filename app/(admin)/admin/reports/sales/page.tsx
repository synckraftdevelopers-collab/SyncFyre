import { Lock } from "lucide-react";
import { requirePortalContext } from "@/lib/auth";
import { hasCurrentFeature } from "@/lib/entitlements/server";
import { getCrmSalesStaffReport } from "@/services/report.service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Sales Report" };

function fmt(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}

function defaultRange() {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return { dateFrom: toDateInputValue(firstOfMonth), dateTo: toDateInputValue(now) };
}

export default async function SalesReportPage({
  searchParams,
}: {
  searchParams: Promise<{ dateFrom?: string; dateTo?: string }>;
}) {
  const sp = await searchParams;
  const profile = await requirePortalContext(["owner", "admin", "manager"]);

  // Soft check — the locked card is shown to non-Growth users so they can
  // see the feature exists, same pattern as the Revenue Report page.
  const hasCrm = await hasCurrentFeature("crm");

  const defaults = defaultRange();
  const dateFrom = sp.dateFrom || defaults.dateFrom;
  const dateTo = sp.dateTo || defaults.dateTo;

  const report = hasCrm && profile.tenant_id
    ? await getCrmSalesStaffReport({ branchId: profile.branch_id, tenantId: profile.tenant_id, dateFrom, dateTo })
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sales Report</h1>
        <p className="text-sm text-muted-foreground">
          Sales and lead conversions by staff member, for a chosen date range.
        </p>
      </div>

      {!hasCrm ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-muted">
              <Lock className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">Sales Report</p>
              <p className="text-sm text-muted-foreground">
                Per-staff sales and lead conversion reporting is available on the Growth plan and above.
              </p>
            </div>
            <Badge variant="secondary" className="mt-1">Growth Plan required</Badge>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-4">
              <form className="flex flex-wrap items-end gap-3" method="get">
                <label className="text-sm font-medium">
                  From
                  <input
                    type="date"
                    name="dateFrom"
                    defaultValue={dateFrom}
                    max={dateTo}
                    className="mt-1 block h-10 rounded-lg border bg-background px-3 text-sm"
                  />
                </label>
                <label className="text-sm font-medium">
                  To
                  <input
                    type="date"
                    name="dateTo"
                    defaultValue={dateTo}
                    min={dateFrom}
                    className="mt-1 block h-10 rounded-lg border bg-background px-3 text-sm"
                  />
                </label>
                <button className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
                  Apply
                </button>
              </form>
            </CardContent>
          </Card>

          {report && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <Card>
                  <CardContent className="p-5">
                    <p className="text-xs text-muted-foreground">Total Sales</p>
                    <p className="mt-1 text-2xl font-bold">{report.totals.salesCount}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <p className="text-xs text-muted-foreground">Total Revenue</p>
                    <p className="mt-1 text-2xl font-bold">{fmt(report.totals.totalRevenue)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <p className="text-xs text-muted-foreground">Total Discount Given</p>
                    <p className="mt-1 text-2xl font-bold">{fmt(report.totals.totalDiscount)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <p className="text-xs text-muted-foreground">Leads Assigned</p>
                    <p className="mt-1 text-2xl font-bold">{report.totals.leadsAssigned}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <p className="text-xs text-muted-foreground">Leads Won</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-600">{report.totals.leadsWon}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="overflow-x-auto p-0">
                  <table className="w-full min-w-[860px] text-sm">
                    <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="p-3 font-medium">Staff</th>
                        <th className="p-3 font-medium">Role</th>
                        <th className="p-3 font-medium">Sales</th>
                        <th className="p-3 font-medium">Revenue</th>
                        <th className="p-3 font-medium">Discount Given</th>
                        <th className="p-3 font-medium">Leads Assigned</th>
                        <th className="p-3 font-medium">Leads Won</th>
                        <th className="p-3 font-medium">Conversion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {report.rows.map((row) => (
                        <tr key={row.staffId}>
                          <td className="p-3 font-medium">{row.staffName}</td>
                          <td className="p-3 capitalize text-muted-foreground">
                            {row.roleSlug ? row.roleSlug.replace(/_/g, " ") : "—"}
                          </td>
                          <td className="p-3">{row.salesCount}</td>
                          <td className="p-3 font-semibold">{fmt(row.totalRevenue)}</td>
                          <td className="p-3 text-muted-foreground">{fmt(row.totalDiscount)}</td>
                          <td className="p-3">{row.leadsAssigned}</td>
                          <td className="p-3">{row.leadsWon}</td>
                          <td className="p-3">
                            {row.leadsAssigned > 0 ? `${row.leadConversionRate}%` : "—"}
                          </td>
                        </tr>
                      ))}
                      {!report.rows.length && (
                        <tr>
                          <td className="p-8 text-center text-muted-foreground" colSpan={8}>
                            No sales or lead activity in this date range.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}

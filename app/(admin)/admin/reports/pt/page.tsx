import { Lock } from "lucide-react";
import { requirePortalContext } from "@/lib/auth";
import { hasCurrentFeature } from "@/lib/entitlements/server";
import { getPtTrainerReport } from "@/services/report.service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "PT Report" };

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

export default async function PtReportPage({
  searchParams,
}: {
  searchParams: Promise<{ dateFrom?: string; dateTo?: string }>;
}) {
  const sp = await searchParams;
  const profile = await requirePortalContext(["owner", "admin", "manager"]);

  // Soft check — the locked card is shown to non-Growth users so they can
  // see the feature exists, same pattern as the Revenue/Sales Report pages.
  const hasPt = await hasCurrentFeature("pt");

  const defaults = defaultRange();
  const dateFrom = sp.dateFrom || defaults.dateFrom;
  const dateTo = sp.dateTo || defaults.dateTo;

  const report = hasPt && profile.tenant_id
    ? await getPtTrainerReport({ branchId: profile.branch_id, tenantId: profile.tenant_id, dateFrom, dateTo })
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">PT Report</h1>
        <p className="text-sm text-muted-foreground">
          PT package revenue and session performance by trainer, for a chosen date range.
        </p>
      </div>

      {!hasPt ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-muted">
              <Lock className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">PT Report</p>
              <p className="text-sm text-muted-foreground">
                Per-trainer PT revenue and performance reporting is available on the Growth plan and above.
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
              <div>
                <h2 className="text-lg font-semibold">PT Revenue</h2>
                <p className="text-sm text-muted-foreground">
                  PT packages sold and revenue collected, by assigned trainer.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardContent className="p-5">
                    <p className="text-xs text-muted-foreground">PT Packages Sold</p>
                    <p className="mt-1 text-2xl font-bold">{report.totals.packagesSold}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <p className="text-xs text-muted-foreground">PT Revenue</p>
                    <p className="mt-1 text-2xl font-bold">{fmt(report.totals.totalRevenue)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <p className="text-xs text-muted-foreground">Sessions Completed</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-600">{report.totals.sessionsCompleted}</p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h2 className="text-lg font-semibold">Trainer Performance</h2>
                <p className="text-sm text-muted-foreground">
                  Session outcomes and current active clients, by trainer. Completion and no-show rates are
                  computed over resolved sessions (completed, cancelled, or no-show) — a still-scheduled session
                  isn't counted either way yet.
                </p>
              </div>

              <Card>
                <CardContent className="overflow-x-auto p-0">
                  <table className="w-full min-w-[1000px] text-sm">
                    <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="p-3 font-medium">Trainer</th>
                        <th className="p-3 font-medium">Packages Sold</th>
                        <th className="p-3 font-medium">Revenue</th>
                        <th className="p-3 font-medium">Completed</th>
                        <th className="p-3 font-medium">Scheduled</th>
                        <th className="p-3 font-medium">Cancelled</th>
                        <th className="p-3 font-medium">No-shows</th>
                        <th className="p-3 font-medium">Completion Rate</th>
                        <th className="p-3 font-medium">No-show Rate</th>
                        <th className="p-3 font-medium">Active Clients</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {report.rows.map((row) => (
                        <tr key={row.trainerId}>
                          <td className="p-3 font-medium">{row.trainerName}</td>
                          <td className="p-3">{row.packagesSold}</td>
                          <td className="p-3 font-semibold">{fmt(row.totalRevenue)}</td>
                          <td className="p-3">{row.sessionsCompleted}</td>
                          <td className="p-3">{row.sessionsScheduled}</td>
                          <td className="p-3">{row.sessionsCancelled}</td>
                          <td className="p-3">{row.sessionsNoShow}</td>
                          <td className="p-3">
                            {row.sessionsCompleted + row.sessionsCancelled + row.sessionsNoShow > 0
                              ? `${row.completionRate}%`
                              : "—"}
                          </td>
                          <td className="p-3">
                            {row.sessionsCompleted + row.sessionsCancelled + row.sessionsNoShow > 0
                              ? `${row.noShowRate}%`
                              : "—"}
                          </td>
                          <td className="p-3">{row.activeClients}</td>
                        </tr>
                      ))}
                      {!report.rows.length && (
                        <tr>
                          <td className="p-8 text-center text-muted-foreground" colSpan={10}>
                            No PT sales or session activity in this date range.
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

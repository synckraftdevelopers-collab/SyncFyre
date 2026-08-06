import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { getProfitAndLoss } from "@/services/finance.service";

export const metadata = { title: "Profit & Loss" };

export default async function ProfitLossPage({
  searchParams,
}: {
  searchParams: Promise<{ date_from?: string; date_to?: string }>;
}) {
  const query = await searchParams;
  const profile = await getCurrentProfile();
  const branchId = profile?.branch_id;

  // Default: current financial year (Apr 1 to today)
  const now = new Date();
  const fyStart = now.getMonth() >= 3
    ? `${now.getFullYear()}-04-01`
    : `${now.getFullYear() - 1}-04-01`;

  const dateFrom = query.date_from ?? fyStart;
  const dateTo   = query.date_to   ?? now.toISOString().slice(0, 10);

  const pl = await getProfitAndLoss(branchId, dateFrom, dateTo);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profit & Loss</h1>
          <p className="text-sm text-muted-foreground">
            {dateFrom} to {dateTo}
          </p>
        </div>
        <form className="flex items-center gap-2">
          <input type="date" name="date_from" defaultValue={dateFrom}
            className="h-9 rounded-lg border bg-background px-3 text-sm" />
          <span className="text-muted-foreground text-sm">to</span>
          <input type="date" name="date_to" defaultValue={dateTo}
            className="h-9 rounded-lg border bg-background px-3 text-sm" />
          <button type="submit"
            className="h-9 rounded-lg border bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            Apply
          </button>
        </form>
      </div>

      {/* Net Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-green-100 text-green-600">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Income</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(pl.totalIncome)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-red-100 text-red-600">
              <TrendingDown className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Expenses</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(pl.totalExpenses)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className={`grid size-10 place-items-center rounded-xl ${pl.netProfit >= 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
              {pl.netProfit >= 0 ? <TrendingUp className="size-5" /> : <TrendingDown className="size-5" />}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Net Profit</p>
              <p className={`text-xl font-bold ${pl.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(pl.netProfit)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Income Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-green-700">Income Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(pl.incomeByCategory).length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No income in this period.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(pl.incomeByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, amt]) => (
                    <div key={cat} className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2">
                      <span className="text-sm font-medium">{cat}</span>
                      <span className="text-sm font-bold text-green-700">{formatCurrency(amt)}</span>
                    </div>
                  ))}
                <div className="flex items-center justify-between rounded-lg bg-green-100 px-3 py-2 mt-3">
                  <span className="text-sm font-bold">Total Income</span>
                  <span className="text-sm font-bold text-green-700">{formatCurrency(pl.totalIncome)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-red-700">Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(pl.expenseByCategory).length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No expenses in this period.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(pl.expenseByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, amt]) => (
                    <div key={cat} className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2">
                      <span className="text-sm font-medium">{cat}</span>
                      <span className="text-sm font-bold text-red-700">{formatCurrency(amt)}</span>
                    </div>
                  ))}
                <div className="flex items-center justify-between rounded-lg bg-red-100 px-3 py-2 mt-3">
                  <span className="text-sm font-bold">Total Expenses</span>
                  <span className="text-sm font-bold text-red-700">{formatCurrency(pl.totalExpenses)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Net Profit Bar */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Profit Margin</span>
            <span className={`text-lg font-bold ${pl.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {pl.totalIncome > 0
                ? `${((pl.netProfit / pl.totalIncome) * 100).toFixed(1)}%`
                : "N/A"}
            </span>
          </div>
          <div className="h-4 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-4 rounded-full transition-all ${pl.netProfit >= 0 ? "bg-green-500" : "bg-red-500"}`}
              style={{
                width: pl.totalIncome > 0
                  ? `${Math.min(100, Math.abs((pl.netProfit / pl.totalIncome) * 100))}%`
                  : "0%",
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

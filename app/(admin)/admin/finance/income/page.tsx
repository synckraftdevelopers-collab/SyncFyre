import { ArrowUpCircle, Plus } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { listIncome, listIncomeCategories } from "@/services/finance.service";

export const metadata = { title: "Income" };

export default async function IncomePage() {
  const profile = await getCurrentProfile();
  const branchId = profile?.branch_id;

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().slice(0, 10);

  const [{ data: incomeList, total }, categories, { data: todayList }, { data: monthList }] =
    await Promise.all([
      listIncome({ branchId, page: 1, pageSize: 50 }),
      listIncomeCategories(branchId),
      listIncome({ branchId, dateFrom: today, dateTo: today, pageSize: 500 }),
      listIncome({ branchId, dateFrom: monthStartStr, dateTo: today, pageSize: 500 }),
    ]);

  const todayTotal = todayList.reduce((s, r) => s + Number(r.total_amount), 0);
  const monthTotal = monthList.reduce((s, r) => s + Number(r.total_amount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Income</h1>
          <p className="text-sm text-muted-foreground">All income entries — membership and non-membership</p>
        </div>
        <Link href="/admin/finance/income/new">
          <Button className="gap-2">
            <Plus className="size-4" />
            Add Income
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-green-100 text-green-600">
              <ArrowUpCircle className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Today</p>
              <p className="text-xl font-bold">{formatCurrency(todayTotal)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-blue-100 text-blue-600">
              <ArrowUpCircle className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">This Month</p>
              <p className="text-xl font-bold">{formatCurrency(monthTotal)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <ArrowUpCircle className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Records</p>
              <p className="text-xl font-bold">{total}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      {categories.length > 0 && (
        <Card>
          <CardHeader><CardTitle>By Category (this month)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {categories.map((cat) => {
                const catTotal = monthList
                  .filter((r) => r.category_id === cat.id)
                  .reduce((s, r) => s + Number(r.total_amount), 0);
                return (
                  <div key={cat.id} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm font-medium">{cat.name}</span>
                    <span className="text-sm font-bold text-green-600">{formatCurrency(catTotal)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Income Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Income</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {incomeList.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No income entries yet.{" "}
              <Link href="/admin/finance/income/new" className="text-primary underline-offset-4 hover:underline">
                Add the first one
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Number</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Member</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Method</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {incomeList.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">{row.income_date}</td>
                      <td className="px-4 py-3 font-mono text-xs">{row.income_number}</td>
                      <td className="px-4 py-3">
                        {(row.income_categories as { name: string } | null)?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {(row.members as { full_name: string } | null)?.full_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 capitalize">{row.payment_method}</td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600">
                        {formatCurrency(Number(row.total_amount))}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium capitalize text-green-700">
                          {row.status}
                        </span>
                      </td>
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

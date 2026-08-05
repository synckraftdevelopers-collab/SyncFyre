import { ArrowDownCircle, Clock, Plus } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { listExpenses, listExpenseCategories } from "@/services/finance.service";

export const metadata = { title: "Expenses" };

const STATUS_STYLES: Record<string, string> = {
  pending:  "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled:"bg-gray-100 text-gray-600",
};

export default async function ExpensesPage() {
  const profile = await getCurrentProfile();
  const branchId = profile?.branch_id;

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().slice(0, 10);

  const [{ data: expenseList, total }, categories, { data: pendingList }, { data: monthList }] =
    await Promise.all([
      listExpenses({ branchId, page: 1, pageSize: 50 }),
      listExpenseCategories(branchId),
      listExpenses({ branchId, approvalStatus: "pending", pageSize: 500 }),
      listExpenses({ branchId, dateFrom: monthStartStr, dateTo: today, approvalStatus: "approved", pageSize: 500 }),
    ]);

  const pendingTotal = pendingList.reduce((s, r) => s + Number(r.total_amount), 0);
  const monthTotal   = monthList.reduce((s, r) => s + Number(r.total_amount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
          <p className="text-sm text-muted-foreground">Track, submit and approve expenses</p>
        </div>
        <Link href="/admin/finance/expenses/new">
          <Button className="gap-2">
            <Plus className="size-4" />
            Add Expense
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-yellow-100 text-yellow-600">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pending Approval</p>
              <p className="text-xl font-bold">{pendingList.length}</p>
              <p className="text-xs text-muted-foreground">{formatCurrency(pendingTotal)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-red-100 text-red-600">
              <ArrowDownCircle className="size-5" />
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
              <ArrowDownCircle className="size-5" />
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
          <CardHeader><CardTitle>By Category (this month, approved)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {categories.map((cat) => {
                const catTotal = monthList
                  .filter((r) => r.category_id === cat.id)
                  .reduce((s, r) => s + Number(r.total_amount), 0);
                if (catTotal === 0) return null;
                return (
                  <div key={cat.id} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm font-medium">{cat.name}</span>
                    <span className="text-sm font-bold text-red-600">{formatCurrency(catTotal)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expenses Table */}
      <Card>
        <CardHeader><CardTitle>Recent Expenses</CardTitle></CardHeader>
        <CardContent className="p-0">
          {expenseList.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No expenses yet.{" "}
              <Link href="/admin/finance/expenses/new" className="text-primary underline-offset-4 hover:underline">
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
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Method</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Approval</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {expenseList.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">{row.expense_date}</td>
                      <td className="px-4 py-3 font-mono text-xs">{row.expense_number}</td>
                      <td className="px-4 py-3">
                        {(row.expense_categories as { name: string } | null)?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 max-w-[180px] truncate">{row.description}</td>
                      <td className="px-4 py-3 capitalize">{row.payment_method}</td>
                      <td className="px-4 py-3 text-right font-semibold text-red-600">
                        {formatCurrency(Number(row.total_amount))}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[row.approval_status] ?? "bg-gray-100 text-gray-600"}`}>
                          {row.approval_status}
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

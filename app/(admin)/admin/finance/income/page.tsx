import { ArrowUpCircle, Plus } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { listIncome, listIncomeCategories } from "@/services/finance.service";
import { SortableTh, readSort } from "@/components/ui/sortable-th";

export const metadata = { title: "Income" };

const SORTABLE_COLUMNS = [
  { label: "Date", column: "date" as const },
  { label: "Number", column: "number" as const },
  { label: "Category", column: "category" as const },
  { label: "Member", column: "member" as const },
  { label: "Method", column: "method" as const },
  { label: "Amount", column: "amount" as const, align: "right" as const },
  { label: "Status", column: "status" as const },
];

export default async function IncomePage({
  searchParams,
}: {
  searchParams: Promise<{ colSort?: string; colDir?: string }>;
}) {
  const sp = await searchParams;
  const profile = await getCurrentProfile();
  const branchId = profile?.branch_id;

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().slice(0, 10);

  const [{ data: incomeListData, total }, categories, { data: todayList }, { data: monthList }] =
    await Promise.all([
      listIncome({ branchId, page: 1, pageSize: 50 }),
      listIncomeCategories(branchId),
      listIncome({ branchId, dateFrom: today, dateTo: today, pageSize: 500 }),
      listIncome({ branchId, dateFrom: monthStartStr, dateTo: today, pageSize: 500 }),
    ]);
  let incomeList = incomeListData;

  const todayTotal = todayList.reduce((s, r) => s + Number(r.total_amount), 0);
  const monthTotal = monthList.reduce((s, r) => s + Number(r.total_amount), 0);

  const { sort: colSort, dir: colDir } = readSort(
    sp as Record<string, string | undefined>,
    SORTABLE_COLUMNS.map((c) => c.column),
    { sort: "colSort", dir: "colDir" },
  );
  if (colSort) {
    const dirMul = colDir === "desc" ? -1 : 1;
    const sortValue = (row: (typeof incomeList)[number]): string | number => {
      const category = row.income_categories as { name: string } | null;
      const member = row.members as { full_name: string } | null;
      switch (colSort) {
        case "date": return row.income_date ?? "";
        case "number": return row.income_number ?? "";
        case "category": return category?.name ?? "";
        case "member": return member?.full_name ?? "";
        case "method": return row.payment_method ?? "";
        case "amount": return Number(row.total_amount) || 0;
        case "status": return row.status ?? "";
        default: return "";
      }
    };
    incomeList = [...incomeList].sort((a, b) => {
      const av = sortValue(a);
      const bv = sortValue(b);
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dirMul;
      return ((av as number) < (bv as number) ? -1 : (av as number) > (bv as number) ? 1 : 0) * dirMul;
    });
  }

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
                    {SORTABLE_COLUMNS.map(({ label, column, align }) => (
                      <SortableTh
                        key={column}
                        label={label}
                        column={column}
                        basePath="/admin/finance/income"
                        searchParams={sp as Record<string, string | undefined>}
                        currentSort={colSort}
                        currentDir={colDir}
                        align={align}
                        paramNames={{ sort: "colSort", dir: "colDir" }}
                        className={`px-4 py-3 font-medium text-muted-foreground ${align === "right" ? "text-right" : "text-left"}`}
                      />
                    ))}
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

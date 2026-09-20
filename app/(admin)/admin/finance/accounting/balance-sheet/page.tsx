import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { assertCurrentFeature } from "@/lib/entitlements/server";
import { formatCurrency } from "@/lib/utils";
import { getBalanceSheet } from "@/services/finance.service";

export const metadata = { title: "Balance Sheet" };

function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function formatAsOfDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

export default async function BalanceSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ as_of?: string }>;
}) {
  const profile = await requireUser(["owner", "admin", "manager"]);
  await assertCurrentFeature("advanced_accounting");

  const { as_of } = await searchParams;
  const asOfDate = as_of ?? todayDateInputValue();
  const branchId = profile.branch_id;

  const sheet = await getBalanceSheet({ branchId, asOfDate });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/finance/accounting" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="size-4" /> Accounting
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Balance Sheet</h1>
          <p className="text-sm text-muted-foreground">As of {formatAsOfDate(asOfDate)}</p>
        </div>
      </div>

      {/* As-of date filter */}
      <Card>
        <CardContent className="p-4">
          <form className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">As of date</label>
              <input
                type="date"
                name="as_of"
                defaultValue={asOfDate}
                max={todayDateInputValue()}
                className="h-9 rounded-lg border bg-background px-3 text-sm"
              />
            </div>
            <button type="submit" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Apply
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Balance Status */}
      <Card className={sheet.balanced ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}>
        <CardContent className="flex items-center gap-3 p-4">
          {sheet.balanced ? (
            <>
              <CheckCircle className="size-5 text-green-600" />
              <div>
                <p className="font-semibold text-green-800">Balance sheet is balanced</p>
                <p className="text-sm text-green-700">
                  Assets ({formatCurrency(sheet.totalAssets)}) = Liabilities + Equity ({formatCurrency(sheet.totalLiabilities + sheet.totalEquity)})
                </p>
              </div>
            </>
          ) : (
            <>
              <XCircle className="size-5 text-red-600" />
              <div>
                <p className="font-semibold text-red-800">Balance sheet is NOT balanced</p>
                <p className="text-sm text-red-700">
                  Difference: {formatCurrency(Math.abs(sheet.totalAssets - (sheet.totalLiabilities + sheet.totalEquity)))}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Two-column: Assets | Liabilities + Equity */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Assets</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {sheet.assets.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">No asset accounts with activity as of this date.</p>
            ) : (
              <div className="divide-y">
                {sheet.assets.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                    <div>
                      <span className="font-mono text-xs text-muted-foreground">{a.account_code}</span>{" "}
                      <span className="font-medium">{a.account_name}</span>
                    </div>
                    <span className="tabular-nums">{formatCurrency(a.balance)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardContent className="flex items-center justify-between border-t bg-muted/30 px-5 py-3 font-bold">
            <span>Total Assets</span>
            <span className="tabular-nums">{formatCurrency(sheet.totalAssets)}</span>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Liabilities</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {sheet.liabilities.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">No liability accounts with activity as of this date.</p>
              ) : (
                <div className="divide-y">
                  {sheet.liabilities.map((a) => (
                    <div key={a.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                      <div>
                        <span className="font-mono text-xs text-muted-foreground">{a.account_code}</span>{" "}
                        <span className="font-medium">{a.account_name}</span>
                      </div>
                      <span className="tabular-nums">{formatCurrency(a.balance)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardContent className="flex items-center justify-between border-t bg-muted/30 px-5 py-3 font-bold">
              <span>Total Liabilities</span>
              <span className="tabular-nums">{formatCurrency(sheet.totalLiabilities)}</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Equity</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {sheet.equity.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">No equity accounts with activity as of this date.</p>
              ) : (
                <div className="divide-y">
                  {sheet.equity.map((a) => (
                    <div key={a.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                      <div>
                        <span className="font-mono text-xs text-muted-foreground">{a.account_code}</span>{" "}
                        <span className="font-medium">{a.account_name}</span>
                      </div>
                      <span className="tabular-nums">{formatCurrency(a.balance)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardContent className="flex items-center justify-between border-t bg-muted/30 px-5 py-3 font-bold">
              <span>Total Equity</span>
              <span className="tabular-nums">{formatCurrency(sheet.totalEquity)}</span>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

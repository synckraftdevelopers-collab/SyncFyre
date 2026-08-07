import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { getTrialBalance } from "@/services/finance.service";

export const metadata = { title: "Trial Balance" };

const TYPE_COLORS: Record<string, string> = {
  asset:     "bg-blue-100 text-blue-700",
  liability: "bg-red-100 text-red-700",
  equity:    "bg-purple-100 text-purple-700",
  income:    "bg-green-100 text-green-700",
  expense:   "bg-orange-100 text-orange-700",
};

export default async function TrialBalancePage() {
  const profile = await getCurrentProfile();
  const rows = await getTrialBalance(profile?.branch_id);

  const totalDebit  = rows.reduce((s, r) => s + (r.debit  as number), 0);
  const totalCredit = rows.reduce((s, r) => s + (r.credit as number), 0);
  const isBalanced  = Math.abs(totalDebit - totalCredit) < 0.01;

  // Group by account type
  const grouped = rows.reduce<Record<string, typeof rows>>((acc, r) => {
    const type = r.account_type as string;
    if (!acc[type]) acc[type] = [];
    acc[type].push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/finance/accounting"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="size-4" /> Accounting
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trial Balance</h1>
          <p className="text-sm text-muted-foreground">Aggregate debit and credit balances per account</p>
        </div>
      </div>

      {/* Balance Status */}
      <Card className={isBalanced ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}>
        <CardContent className="flex items-center gap-3 p-4">
          {isBalanced ? (
            <>
              <CheckCircle className="size-5 text-green-600" />
              <div>
                <p className="font-semibold text-green-800">Trial balance is balanced</p>
                <p className="text-sm text-green-700">Total Debits = Total Credits = {formatCurrency(totalDebit)}</p>
              </div>
            </>
          ) : (
            <>
              <XCircle className="size-5 text-red-600" />
              <div>
                <p className="font-semibold text-red-800">Trial balance is NOT balanced</p>
                <p className="text-sm text-red-700">
                  Difference: {formatCurrency(Math.abs(totalDebit - totalCredit))}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Totals */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Debit</p>
            <p className="mt-2 text-xl font-bold tabular-nums">{formatCurrency(totalDebit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Credit</p>
            <p className="mt-2 text-xl font-bold tabular-nums">{formatCurrency(totalCredit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Accounts</p>
            <p className="mt-2 text-xl font-bold">{rows.length}</p>
          </CardContent>
        </Card>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No ledger entries found. Trial balance will populate once transactions are recorded.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Trial Balance</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Account Name</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground text-red-700">Debit</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground text-green-700">Credit</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {Object.entries(grouped).map(([type, group]) => (
                    <>
                      <tr key={`group-${type}`} className="bg-muted/20">
                        <td colSpan={6} className="px-4 py-2">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${TYPE_COLORS[type] ?? "bg-gray-100 text-gray-700"}`}>
                            {type}
                          </span>
                        </td>
                      </tr>
                      {group.map((row) => (
                        <tr key={row.id as string} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-xs font-semibold">{row.account_code as string}</td>
                          <td className="px-4 py-2.5 font-medium">{row.account_name as string}</td>
                          <td className="px-4 py-2.5">
                            <Badge variant="outline" className="capitalize text-[10px]">
                              {row.account_type as string}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums">
                            {(row.debit as number) > 0 ? formatCurrency(row.debit as number) : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums">
                            {(row.credit as number) > 0 ? formatCurrency(row.credit as number) : "—"}
                          </td>
                          <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${(row.net as number) >= 0 ? "text-red-600" : "text-green-600"}`}>
                            {formatCurrency(Math.abs(row.net as number))}
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
                {/* Totals row */}
                <tfoot>
                  <tr className="border-t-2 bg-muted/50 font-bold">
                    <td colSpan={3} className="px-4 py-3">Grand Total</td>
                    <td className="px-4 py-3 text-right tabular-nums text-red-700">{formatCurrency(totalDebit)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-green-700">{formatCurrency(totalCredit)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums ${isBalanced ? "text-green-600" : "text-red-600"}`}>
                      {isBalanced ? "✓ Balanced" : `Δ ${formatCurrency(Math.abs(totalDebit - totalCredit))}`}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

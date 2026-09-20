import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { listBankAccounts, listBankTransactions } from "@/services/finance.service";
import { reconcileBankTransactionAction } from "@/app/actions/finance-actions";

export const metadata = { title: "Bank Reconciliation" };

export default async function BankReconciliationPage({
  searchParams,
}: {
  searchParams: Promise<{
    account?: string;
    date_from?: string;
    date_to?: string;
    filter?: "all" | "reconciled" | "unreconciled";
    statement_balance?: string;
  }>;
}) {
  const profile = await requireUser(["owner", "admin", "manager"]);
  const branchId = profile.branch_id;

  const { account: bankAccountId, date_from, date_to, filter = "unreconciled", statement_balance } = await searchParams;

  const accounts = await listBankAccounts(branchId);
  const selectedAccount = accounts.find((a) => a.id === bankAccountId) ?? accounts[0] ?? null;

  const reconciled = filter === "reconciled" ? true : filter === "unreconciled" ? false : undefined;

  const { data: transactions, total } = await listBankTransactions({
    branchId,
    bankAccountId: selectedAccount?.id,
    dateFrom: date_from,
    dateTo: date_to,
    reconciled,
    page: 1,
    pageSize: 200,
  });

  const reconciledCount = transactions.filter((t) => t.is_reconciled).length;
  const unreconciledCount = transactions.length - reconciledCount;
  const unreconciledAmount = transactions
    .filter((t) => !t.is_reconciled)
    .reduce((s, t) => s + (t.txn_type === "deposit" ? Number(t.amount) : -Number(t.amount)), 0);

  const systemBalance = selectedAccount ? Number(selectedAccount.current_balance) : 0;
  const statementBalance = statement_balance ? Number(statement_balance) : null;
  const difference = statementBalance !== null ? statementBalance - systemBalance : null;
  const isMatched = difference !== null && Math.abs(difference) < 0.01;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/finance/bank" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="size-4" /> Bank
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bank Reconciliation</h1>
          <p className="text-sm text-muted-foreground">Match system transactions against your bank statement</p>
        </div>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No bank accounts added yet.{" "}
            <Link href="/admin/finance/bank/new-account" className="text-primary underline-offset-4 hover:underline">
              Add a bank account
            </Link>{" "}
            before reconciling transactions.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <form className="flex flex-wrap items-end gap-3">
                <div className="space-y-1 min-w-[200px]">
                  <label className="text-xs font-medium text-muted-foreground">Bank account</label>
                  <select
                    name="account"
                    defaultValue={selectedAccount?.id ?? ""}
                    className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.account_name} — {a.bank_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">From</label>
                  <input type="date" name="date_from" defaultValue={date_from ?? ""} className="h-9 rounded-lg border bg-background px-3 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">To</label>
                  <input type="date" name="date_to" defaultValue={date_to ?? ""} className="h-9 rounded-lg border bg-background px-3 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <select name="filter" defaultValue={filter} className="h-9 rounded-lg border bg-background px-3 text-sm">
                    <option value="unreconciled">Unreconciled</option>
                    <option value="reconciled">Reconciled</option>
                    <option value="all">All</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Statement closing balance</label>
                  <input
                    type="number"
                    step="0.01"
                    name="statement_balance"
                    defaultValue={statement_balance ?? ""}
                    placeholder="Optional"
                    className="h-9 w-40 rounded-lg border bg-background px-3 text-sm"
                  />
                </div>
                <button type="submit" className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Apply
                </button>
              </form>
            </CardContent>
          </Card>

          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">System Balance</p>
                <p className="mt-2 text-xl font-bold tabular-nums">{formatCurrency(systemBalance)}</p>
                <p className="text-xs text-muted-foreground">{selectedAccount?.account_name}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Unreconciled ({unreconciledCount})</p>
                <p className="mt-2 text-xl font-bold tabular-nums">{formatCurrency(Math.abs(unreconciledAmount))}</p>
                <p className="text-xs text-muted-foreground">{reconciledCount} already reconciled in view</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Shown</p>
                <p className="mt-2 text-xl font-bold">{total}</p>
                <p className="text-xs text-muted-foreground">transactions in current filter</p>
              </CardContent>
            </Card>
          </div>

          {/* Statement comparison */}
          {statementBalance !== null && selectedAccount && (
            <Card className={isMatched ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}>
              <CardContent className="flex items-center gap-3 p-4">
                {isMatched ? <CheckCircle2 className="size-5 text-green-600" /> : <Circle className="size-5 text-red-600" />}
                <div>
                  <p className={`font-semibold ${isMatched ? "text-green-800" : "text-red-800"}`}>
                    {isMatched ? "Reconciled — statement matches system balance" : "Not matched"}
                  </p>
                  <p className={`text-sm ${isMatched ? "text-green-700" : "text-red-700"}`}>
                    Statement: {formatCurrency(statementBalance)} · System: {formatCurrency(systemBalance)}
                    {!isMatched && ` · Difference: ${formatCurrency(Math.abs(difference ?? 0))}`}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transaction list */}
          <Card>
            <CardHeader><CardTitle>Transactions</CardTitle></CardHeader>
            <CardContent className="p-0">
              {transactions.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No transactions match this filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reference</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                        <th className="px-4 py-3 text-center font-medium text-muted-foreground">Reconciled</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {transactions.map((txn) => (
                        <tr key={txn.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">{txn.txn_date}</td>
                          <td className="px-4 py-3 capitalize">{txn.txn_type}</td>
                          <td className="px-4 py-3 max-w-[220px] truncate">{txn.description}</td>
                          <td className="px-4 py-3 font-mono text-xs">{txn.reference_no ?? "—"}</td>
                          <td className={`px-4 py-3 text-right font-semibold ${txn.txn_type === "deposit" ? "text-green-600" : "text-red-600"}`}>
                            {txn.txn_type === "deposit" ? "+" : "-"}{formatCurrency(Number(txn.amount))}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <form action={async () => { await reconcileBankTransactionAction(txn.id, !txn.is_reconciled); }}>
                              <button
                                type="submit"
                                title={txn.is_reconciled ? `Reconciled ${txn.reconciled_at ? new Date(txn.reconciled_at).toLocaleDateString("en-IN") : ""}` : "Mark reconciled"}
                                className="inline-flex items-center justify-center rounded-full p-1 hover:bg-muted transition-colors"
                              >
                                {txn.is_reconciled ? (
                                  <CheckCircle2 className="size-5 text-green-600" />
                                ) : (
                                  <Circle className="size-5 text-muted-foreground" />
                                )}
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

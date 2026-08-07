import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { getLedger, listChartOfAccounts } from "@/services/finance.service";

export const metadata = { title: "General Ledger" };

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string; page?: string; date_from?: string; date_to?: string }>;
}) {
  const { account: accountId, page: pageStr, date_from, date_to } = await searchParams;
  const page = Math.max(1, Number(pageStr ?? 1));
  const profile = await getCurrentProfile();
  const branchId = profile?.branch_id;

  const [accounts, { data: entries, total, totalPages }] = await Promise.all([
    listChartOfAccounts(branchId),
    getLedger({
      branchId,
      accountId: accountId ?? undefined,
      dateFrom: date_from,
      dateTo: date_to,
      page,
      pageSize: 50,
    }),
  ]);

  const selectedAccount = accounts.find((a) => a.id === accountId);

  const totalDebit  = entries.reduce((s, e) => s + (e.entry_type === "debit"  ? Number(e.amount) : 0), 0);
  const totalCredit = entries.reduce((s, e) => s + (e.entry_type === "credit" ? Number(e.amount) : 0), 0);

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
          <h1 className="text-2xl font-bold tracking-tight">General Ledger</h1>
          <p className="text-sm text-muted-foreground">
            {selectedAccount ? `Showing: ${selectedAccount.account_name}` : "All accounts"}
            {total > 0 && ` — ${total} entries`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <form className="flex flex-wrap items-end gap-3">
            <div className="space-y-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground">Account</label>
              <select
                name="account"
                defaultValue={accountId ?? ""}
                className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
              >
                <option value="">— All Accounts —</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.account_code} — {a.account_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">From</label>
              <input
                type="date"
                name="date_from"
                defaultValue={date_from ?? ""}
                className="h-9 rounded-lg border bg-background px-3 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <input
                type="date"
                name="date_to"
                defaultValue={date_to ?? ""}
                className="h-9 rounded-lg border bg-background px-3 text-sm"
              />
            </div>
            <button
              type="submit"
              className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Filter
            </button>
            {(accountId || date_from || date_to) && (
              <Link
                href="/admin/finance/accounting/ledger"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Clear
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Summary */}
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
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Net Balance</p>
            <p className={`mt-2 text-xl font-bold tabular-nums ${totalDebit >= totalCredit ? "text-red-600" : "text-green-600"}`}>
              {formatCurrency(Math.abs(totalDebit - totalCredit))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ledger Table */}
      <Card>
        <CardHeader><CardTitle>Ledger Entries</CardTitle></CardHeader>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No ledger entries found for the selected filters.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Account</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Narration</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground text-red-700">Debit</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground text-green-700">Credit</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {entries.map((row) => (
                      <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">{row.entry_date}</td>
                        <td className="px-4 py-3 font-mono text-xs">{row.account_id.slice(0, 8)}…</td>
                        <td className="px-4 py-3 max-w-[220px] truncate">{row.narration ?? "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-red-600 font-medium">
                          {row.entry_type === "debit" ? formatCurrency(Number(row.amount)) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-green-600 font-medium">
                          {row.entry_type === "credit" ? formatCurrency(Number(row.amount)) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-bold">
                          {formatCurrency(Number(row.balance))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
                  <div className="flex gap-2">
                    {page > 1 && (
                      <Link
                        href={`/admin/finance/accounting/ledger?page=${page - 1}${accountId ? `&account=${accountId}` : ""}${date_from ? `&date_from=${date_from}` : ""}${date_to ? `&date_to=${date_to}` : ""}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Previous
                      </Link>
                    )}
                    {page < totalPages && (
                      <Link
                        href={`/admin/finance/accounting/ledger?page=${page + 1}${accountId ? `&account=${accountId}` : ""}${date_from ? `&date_from=${date_from}` : ""}${date_to ? `&date_to=${date_to}` : ""}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Next
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

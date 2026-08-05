import { Building2, Plus } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { listBankAccounts, listBankTransactions } from "@/services/finance.service";

export const metadata = { title: "Bank Management" };

export default async function BankPage() {
  const profile = await getCurrentProfile();
  const branchId = profile?.branch_id;

  const [accounts, { data: transactions }] = await Promise.all([
    listBankAccounts(branchId),
    listBankTransactions({ branchId, page: 1, pageSize: 50 }),
  ]);

  const totalBankBalance = accounts.reduce((s, a) => s + Number(a.current_balance), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bank Management</h1>
          <p className="text-sm text-muted-foreground">Manage bank accounts and transactions</p>
        </div>
        <Link href="/admin/finance/bank/new-account">
          <Button className="gap-2"><Plus className="size-4" />Add Bank Account</Button>
        </Link>
      </div>

      {/* Bank Account Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {accounts.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              No bank accounts added yet.{" "}
              <Link href="/admin/finance/bank/new-account" className="text-primary underline-offset-4 hover:underline">
                Add your first bank account
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {accounts.map((acc) => (
              <Card key={acc.id} className="group hover:-translate-y-0.5 hover:shadow-md transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="grid size-10 place-items-center rounded-xl bg-blue-100 text-blue-600">
                      <Building2 className="size-5" />
                    </div>
                    {acc.is_default && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Default</span>
                    )}
                  </div>
                  <p className="mt-3 font-semibold">{acc.account_name}</p>
                  <p className="text-sm text-muted-foreground">{acc.bank_name}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    ****{acc.account_number.slice(-4)}
                  </p>
                  <p className="mt-3 text-2xl font-bold">{formatCurrency(Number(acc.current_balance))}</p>
                  <p className="text-xs text-muted-foreground capitalize">{acc.account_type} account</p>
                </CardContent>
              </Card>
            ))}
            <Card className="flex flex-col items-center justify-center p-5 bg-muted/30">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Bank Balance</p>
              <p className="mt-1 text-3xl font-bold">{formatCurrency(totalBankBalance)}</p>
            </Card>
          </>
        )}
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader><CardTitle>Recent Bank Transactions</CardTitle></CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No transactions yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Account</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transactions.map((txn) => (
                    <tr key={txn.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">{txn.txn_date}</td>
                      <td className="px-4 py-3">
                        {(txn.bank_accounts as { account_name: string } | null)?.account_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 capitalize">{txn.txn_type}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate">{txn.description}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${txn.txn_type === "deposit" ? "text-green-600" : "text-red-600"}`}>
                        {txn.txn_type === "deposit" ? "+" : "-"}{formatCurrency(Number(txn.amount))}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        {formatCurrency(Number(txn.balance_after))}
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

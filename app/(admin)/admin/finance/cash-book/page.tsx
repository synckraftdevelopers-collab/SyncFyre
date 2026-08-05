import { Banknote } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { listCashBook, getCashBalance } from "@/services/finance.service";

export const metadata = { title: "Cash Book" };

export default async function CashBookPage() {
  const profile = await getCurrentProfile();
  const branchId = profile?.branch_id ?? "";

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date();
  monthStart.setDate(1);

  const [{ data: entries }, cashBalance, { data: todayEntries }] = await Promise.all([
    listCashBook({ branchId, page: 1, pageSize: 100 }),
    getCashBalance(branchId),
    listCashBook({ branchId, dateFrom: today, dateTo: today, pageSize: 500 }),
  ]);

  const todayCredit = todayEntries.filter((e) => e.entry_type === "credit").reduce((s, e) => s + Number(e.amount), 0);
  const todayDebit  = todayEntries.filter((e) => e.entry_type === "debit").reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cash Book</h1>
        <p className="text-sm text-muted-foreground">Daily cash inflow and outflow register</p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-blue-100 text-blue-600">
              <Banknote className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cash in Hand</p>
              <p className="text-xl font-bold">{formatCurrency(cashBalance)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-green-100 text-green-600">
              <Banknote className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Today In</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(todayCredit)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-red-100 text-red-600">
              <Banknote className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Today Out</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(todayDebit)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash Book Table */}
      <Card>
        <CardHeader><CardTitle>Cash Book Entries</CardTitle></CardHeader>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No cash book entries yet. Entries are auto-created when cash payments are received.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground text-green-700">Credit (In)</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground text-red-700">Debit (Out)</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {entries.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">{row.entry_date}</td>
                      <td className="px-4 py-3 max-w-[240px] truncate">{row.description}</td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">
                        {row.entry_type === "credit" ? formatCurrency(Number(row.amount)) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600 font-medium">
                        {row.entry_type === "debit" ? formatCurrency(Number(row.amount)) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        {formatCurrency(Number(row.balance_after))}
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

import { CircleAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { getOutstandingReceivablesSummary, listReceivables } from "@/services/finance.service";

export const metadata = { title: "Outstanding Dues" };

const STATUS_STYLES: Record<string, string> = {
  pending:    "bg-yellow-100 text-yellow-700",
  partial:    "bg-blue-100 text-blue-700",
  paid:       "bg-green-100 text-green-700",
  overdue:    "bg-red-100 text-red-700",
  written_off:"bg-gray-100 text-gray-500",
};

export default async function OutstandingPage() {
  const profile = await getCurrentProfile();
  const branchId = profile?.branch_id;

  const [{ data: all }, summary] = await Promise.all([
    listReceivables({ branchId, page: 1, pageSize: 100 }),
    getOutstandingReceivablesSummary(branchId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Outstanding Dues</h1>
        <p className="text-sm text-muted-foreground">Track and follow up on pending receivables</p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-red-100 text-red-600">
              <CircleAlert className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Overdue</p>
              <p className="text-xl font-bold text-red-600">{summary.overdueCount}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(summary.overdueAmount)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-yellow-100 text-yellow-600">
              <CircleAlert className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pending</p>
              <p className="text-xl font-bold">{summary.pendingCount}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(summary.pendingAmount)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <CircleAlert className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Outstanding</p>
              <p className="text-xl font-bold">{formatCurrency(summary.totalOutstanding)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Receivables Table */}
      <Card>
        <CardHeader><CardTitle>Receivables</CardTitle></CardHeader>
        <CardContent className="p-0">
          {all.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No outstanding dues. All payments are up to date.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Member</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Original</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Paid</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Balance</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Due Date</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {all.map((row) => {
                    const m = row.members as { full_name: string; member_code: string } | null;
                    return (
                      <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium">{m?.full_name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{m?.member_code}</p>
                        </td>
                        <td className="px-4 py-3 capitalize">{row.receivable_type}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(Number(row.original_amount))}</td>
                        <td className="px-4 py-3 text-right text-green-600">{formatCurrency(Number(row.paid_amount))}</td>
                        <td className="px-4 py-3 text-right font-bold text-red-600">{formatCurrency(Number(row.balance_amount))}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{row.due_date ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[row.status] ?? "bg-gray-100 text-gray-600"}`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

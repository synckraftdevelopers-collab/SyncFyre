import { ReceiptText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { listGstTransactions, getGstSummary } from "@/services/finance.service";

export const metadata = { title: "GST" };

export default async function GstPage() {
  const profile = await getCurrentProfile();
  const branchId = profile?.branch_id;

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date();
  monthStart.setDate(1);

  const [{ data: transactions }, summary] = await Promise.all([
    listGstTransactions({ branchId, page: 1, pageSize: 100 }),
    getGstSummary(branchId, monthStart.toISOString().slice(0, 10), today),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">GST</h1>
        <p className="text-sm text-muted-foreground">GST transactions, collections and summary</p>
      </div>

      {/* GST Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Taxable Sales</p>
            <p className="mt-2 text-xl font-bold">{formatCurrency(summary.sales.taxable)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">GST Collected</p>
            <p className="mt-2 text-xl font-bold text-green-600">{formatCurrency(summary.sales.total)}</p>
            <p className="text-xs text-muted-foreground">CGST: {formatCurrency(summary.sales.cgst)} | SGST: {formatCurrency(summary.sales.sgst)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">GST Paid (Purchases)</p>
            <p className="mt-2 text-xl font-bold text-red-600">{formatCurrency(summary.purchases.total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Net GST Payable</p>
            <p className={`mt-2 text-xl font-bold ${summary.netGst >= 0 ? "text-orange-600" : "text-green-600"}`}>
              {formatCurrency(Math.abs(summary.netGst))}
            </p>
            <p className="text-xs text-muted-foreground">
              {summary.netGst >= 0 ? "Payable to Govt" : "Input Credit"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* GST Transactions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ReceiptText className="size-5 text-muted-foreground" />
            <CardTitle>GST Transactions</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              GST transactions will appear here automatically when income or expenses with GST are posted.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Party</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Invoice</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Taxable</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">CGST</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">SGST</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transactions.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">{row.txn_date}</td>
                      <td className="px-4 py-3 capitalize">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${row.txn_type === "sales" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {row.txn_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">{row.party_name ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{row.invoice_number ?? "—"}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(Number(row.taxable_amount))}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(Number(row.cgst_amount))}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(Number(row.sgst_amount))}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(Number(row.total_tax))}</td>
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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GstNav } from "@/components/finance/gst-nav";
import { getCurrentProfile } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { getFinancialYearOptions, getGstDashboardSnapshot, listFinanceBranches } from "@/services/finance-gst.service";

export const metadata = { title: "GST Summary" };

export default async function GstSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ branch_id?: string; date_from?: string; date_to?: string; financial_year?: string; search?: string }>;
}) {
  const profile = await getCurrentProfile();
  const params = await searchParams;
  const branchId = params.branch_id ?? profile?.branch_id ?? undefined;
  const search = params.search?.trim() ?? "";
  const [snapshot, branches] = await Promise.all([
    getGstDashboardSnapshot({ branchId, tenantId: profile?.tenant_id, dateFrom: params.date_from, dateTo: params.date_to, financialYear: params.financial_year, search }),
    listFinanceBranches(profile?.tenant_id, profile?.branch_id),
  ]);
  const financialYears = getFinancialYearOptions(new Date(), 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">GST Summary</h1>
        <p className="text-sm text-muted-foreground">Aggregated GST totals across all applicable member transactions in the selected tenant, branch, and period.</p>
      </div>

      <GstNav currentPath="/admin/finance/gst/summary" />

      <Card>
        <CardContent className="p-4">
          <form className="grid gap-3 md:grid-cols-6">
            <select name="branch_id" defaultValue={branchId ?? ""} className="h-10 rounded-lg border bg-background px-3 text-sm">
              <option value="">All branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name ?? "Unnamed branch"}</option>
              ))}
            </select>
            <input name="date_from" type="date" defaultValue={snapshot.range.dateFrom} className="h-10 rounded-lg border bg-background px-3 text-sm" />
            <input name="date_to" type="date" defaultValue={snapshot.range.dateTo} className="h-10 rounded-lg border bg-background px-3 text-sm" />
            <select name="financial_year" defaultValue={snapshot.range.financialYear} className="h-10 rounded-lg border bg-background px-3 text-sm">
              {financialYears.map((year) => (
                <option key={year.slug} value={year.slug}>{year.label}</option>
              ))}
            </select>
            <input name="search" defaultValue={search} placeholder="Member, phone, invoice" className="h-10 rounded-lg border bg-background px-3 text-sm" />
            <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">Apply</button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric label="Total Transactions" value={snapshot.totals.totalTransactions} integer />
        <SummaryMetric label="Taxable Amount" value={snapshot.totals.taxableAmount} />
        <SummaryMetric label="CGST" value={snapshot.totals.cgst} />
        <SummaryMetric label="SGST" value={snapshot.totals.sgst} />
        <SummaryMetric label="IGST" value={snapshot.totals.igst} />
        <SummaryMetric label="Total GST" value={snapshot.totals.totalGst} />
        <SummaryMetric label="Grand Total" value={snapshot.totals.grandTotal} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>GST Summary Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                {["Period", "Transactions", "Taxable Sales", "CGST", "SGST", "IGST", "Total GST", "Gross Revenue"].map((header) => (
                  <th key={header} className="px-4 py-3 font-medium">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              <SummaryRow label="Selected Range" transactions={snapshot.totals.totalTransactions} taxable={snapshot.totals.taxableAmount} cgst={snapshot.totals.cgst} sgst={snapshot.totals.sgst} igst={snapshot.totals.igst} total={snapshot.totals.totalGst} gross={snapshot.totals.grandTotal} />
              <SummaryRow label="Current Month" transactions={0} taxable={snapshot.currentMonth.sales.taxable} cgst={snapshot.currentMonth.sales.cgst} sgst={snapshot.currentMonth.sales.sgst} igst={snapshot.currentMonth.sales.igst} total={snapshot.currentMonth.sales.total} gross={snapshot.currentMonth.grossRevenue} />
              <SummaryRow label="Current Quarter" transactions={0} taxable={snapshot.currentQuarter.sales.taxable} cgst={snapshot.currentQuarter.sales.cgst} sgst={snapshot.currentQuarter.sales.sgst} igst={snapshot.currentQuarter.sales.igst} total={snapshot.currentQuarter.sales.total} gross={snapshot.currentQuarter.grossRevenue} />
              <SummaryRow label={snapshot.financialYearRange.label} transactions={0} taxable={snapshot.currentFinancialYear.sales.taxable} cgst={snapshot.currentFinancialYear.sales.cgst} sgst={snapshot.currentFinancialYear.sales.sgst} igst={snapshot.currentFinancialYear.sales.igst} total={snapshot.currentFinancialYear.sales.total} gross={snapshot.currentFinancialYear.grossRevenue} />
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryMetric({ label, value, integer }: { label: string; value: number; integer?: boolean }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-2 text-xl font-bold">{integer ? value.toLocaleString("en-IN") : formatCurrency(value)}</p>
      </CardContent>
    </Card>
  );
}

function SummaryRow({ label, transactions, taxable, cgst, sgst, igst, total, gross }: { label: string; transactions: number; taxable: number; cgst: number; sgst: number; igst: number; total: number; gross: number }) {
  return (
    <tr>
      <td className="px-4 py-3 font-medium">{label}</td>
      <td className="px-4 py-3">{transactions ? transactions.toLocaleString("en-IN") : "-"}</td>
      <td className="px-4 py-3">{formatCurrency(taxable)}</td>
      <td className="px-4 py-3">{formatCurrency(cgst)}</td>
      <td className="px-4 py-3">{formatCurrency(sgst)}</td>
      <td className="px-4 py-3">{formatCurrency(igst)}</td>
      <td className="px-4 py-3 font-semibold">{formatCurrency(total)}</td>
      <td className="px-4 py-3 font-semibold">{formatCurrency(gross)}</td>
    </tr>
  );
}

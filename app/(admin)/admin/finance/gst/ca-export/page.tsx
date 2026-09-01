import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GstNav } from "@/components/finance/gst-nav";
import { getCurrentProfile } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { getFinancialYearOptions, getGstCaExportRows, listFinanceBranches, resolveGstDateRange } from "@/services/finance-gst.service";

export const metadata = { title: "GST CA Export" };

export default async function GstCaExportPage({
  searchParams,
}: {
  searchParams: Promise<{ branch_id?: string; date_from?: string; date_to?: string; financial_year?: string; search?: string }>;
}) {
  const profile = await getCurrentProfile();
  const params = await searchParams;
  const branchId = params.branch_id ?? profile?.branch_id ?? undefined;
  const search = params.search?.trim() ?? "";
  const range = resolveGstDateRange({ dateFrom: params.date_from, dateTo: params.date_to, financialYear: params.financial_year, search });
  const [rows, branches] = await Promise.all([
    getGstCaExportRows({ branchId, tenantId: profile?.tenant_id, dateFrom: range.dateFrom, dateTo: range.dateTo, financialYear: range.financialYear, search }),
    listFinanceBranches(profile?.tenant_id, profile?.branch_id),
  ]);
  const financialYears = getFinancialYearOptions(new Date(), 5);
  const query = `branch_id=${branchId ?? ""}&date_from=${range.dateFrom}&date_to=${range.dateTo}&financial_year=${range.financialYear}&search=${encodeURIComponent(search)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">CA Export</h1>
          <p className="text-sm text-muted-foreground">Exports all applicable GST transaction rows for the selected tenant, branch, period, and search filters.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/finance/gst?view=export&format=xlsx&${query}`} className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted"><Download className="size-4" />Export Excel</a>
          <a href={`/api/finance/gst?view=export&format=csv&${query}`} className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted"><Download className="size-4" />Export CSV</a>
          <a href={`/api/finance/gst?view=export&format=pdf&${query}`} className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted"><Download className="size-4" />Export PDF</a>
        </div>
      </div>

      <GstNav currentPath="/admin/finance/gst/ca-export" />

      <Card>
        <CardContent className="p-4">
          <form className="grid gap-3 md:grid-cols-6">
            <select name="branch_id" defaultValue={branchId ?? ""} className="h-10 rounded-lg border bg-background px-3 text-sm">
              <option value="">All branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name ?? "Unnamed branch"}</option>
              ))}
            </select>
            <input name="date_from" type="date" defaultValue={range.dateFrom} className="h-10 rounded-lg border bg-background px-3 text-sm" />
            <input name="date_to" type="date" defaultValue={range.dateTo} className="h-10 rounded-lg border bg-background px-3 text-sm" />
            <select name="financial_year" defaultValue={range.financialYear} className="h-10 rounded-lg border bg-background px-3 text-sm">
              {financialYears.map((year) => (
                <option key={year.slug} value={year.slug}>{year.label}</option>
              ))}
            </select>
            <input name="search" defaultValue={search} placeholder="Member, phone, invoice" className="h-10 rounded-lg border bg-background px-3 text-sm" />
            <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">Apply</button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export Preview</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">No GST transactions found for the selected filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1500px] text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    {["Date", "Invoice Number", "Member ID", "Member Name", "Package", "Branch", "Payment", "Taxable Amount", "GST Rate", "CGST", "SGST", "IGST", "Total GST", "Grand Total", "Payment Method", "Payment Status"].map((header) => (
                      <th key={header} className="px-4 py-3 font-medium">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row) => (
                    <tr key={`${row.date}-${row.invoiceNumber ?? "na"}-${row.memberId ?? "na"}-${row.paymentAmount}`}>
                      <td className="px-4 py-3">{row.date}</td>
                      <td className="px-4 py-3 font-mono text-xs">{row.invoiceNumber ?? "-"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{row.memberId ?? "-"}</td>
                      <td className="px-4 py-3">{row.memberName ?? "-"}</td>
                      <td className="px-4 py-3">{row.packageName ?? row.description ?? "-"}</td>
                      <td className="px-4 py-3">{row.branch ?? "-"}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(row.paymentAmount)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(row.taxableAmount)}</td>
                      <td className="px-4 py-3 text-right">{row.gstRate.toFixed(2)}%</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(row.cgst)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(row.sgst)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(row.igst)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(row.totalGst)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(row.grandTotal)}</td>
                      <td className="px-4 py-3">{row.paymentMethod ?? "-"}</td>
                      <td className="px-4 py-3">{row.paymentStatus ?? "-"}</td>
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

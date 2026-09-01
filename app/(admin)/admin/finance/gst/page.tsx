import Link from "next/link";
import { Download, ReceiptText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GstNav } from "@/components/finance/gst-nav";
import { getCurrentProfile } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { getFinancialYearOptions, getGstDashboardSnapshot, listFinanceBranches } from "@/services/finance-gst.service";

export const metadata = { title: "Finance GST" };

type GstSearchParams = {
  branch_id?: string;
  date_from?: string;
  date_to?: string;
  financial_year?: string;
  search?: string;
  package_name?: string;
  payment_status?: string;
  gst_applicable?: "all" | "yes" | "no";
  page?: string;
  page_size?: string;
  sort_by?: "member_name" | "payment_date" | "payment_amount" | "invoice_date";
  sort_dir?: "asc" | "desc";
};

export default async function GstPage({
  searchParams,
}: {
  searchParams: Promise<GstSearchParams>;
}) {
  const profile = await getCurrentProfile();
  const params = await searchParams;
  const branchId = params.branch_id ?? profile?.branch_id ?? undefined;
  const search = params.search?.trim() ?? "";
  const page = Number(params.page ?? 1) || 1;
  const pageSize = [25, 50, 100].includes(Number(params.page_size)) ? Number(params.page_size) : 50;
  const paymentStatus = params.payment_status ?? "all";
  const gstApplicable = params.gst_applicable ?? "all";
  const sortBy = params.sort_by ?? "payment_date";
  const sortDir = params.sort_dir ?? "desc";

  const [snapshot, branches] = await Promise.all([
    getGstDashboardSnapshot({
      branchId,
      tenantId: profile?.tenant_id,
      dateFrom: params.date_from,
      dateTo: params.date_to,
      financialYear: params.financial_year,
      search,
      packageName: params.package_name,
      paymentStatus,
      gstApplicable,
      page,
      pageSize,
      sortBy,
      sortDir,
    }),
    listFinanceBranches(profile?.tenant_id, profile?.branch_id),
  ]);

  const financialYears = getFinancialYearOptions(new Date(), 5);
  const packageOptions = Array.from(new Set(snapshot.transactions.map((row) => row.packageName).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b));
  const currentQuery = new URLSearchParams({
    branch_id: branchId ?? "",
    date_from: snapshot.range.dateFrom,
    date_to: snapshot.range.dateTo,
    financial_year: snapshot.range.financialYear,
    search,
    package_name: params.package_name ?? "all",
    payment_status: paymentStatus,
    gst_applicable: gstApplicable,
    page_size: String(pageSize),
    sort_by: sortBy,
    sort_dir: sortDir,
  });

  const exportQuery = new URLSearchParams(currentQuery);
  exportQuery.set("view", "export");
  exportQuery.set("format", "csv");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Finance GST</h1>
          <p className="text-sm text-muted-foreground">Member-wise GST register built from real members, memberships, payments, invoices, and GST values in the current tenant scope.</p>
        </div>
        <a href={`/api/finance/gst?${exportQuery.toString()}`} className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted">
          <Download className="size-4" />
          Export CSV
        </a>
      </div>

      <GstNav currentPath="/admin/finance/gst" />

      <Card>
        <CardContent className="p-4">
          <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <input name="search" defaultValue={search} placeholder="Search member, phone, invoice" className="h-10 rounded-lg border bg-background px-3 text-sm" />
            <select name="branch_id" defaultValue={branchId ?? ""} className="h-10 rounded-lg border bg-background px-3 text-sm">
              <option value="">All branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name ?? "Unnamed branch"}</option>
              ))}
            </select>
            <select name="package_name" defaultValue={params.package_name ?? "all"} className="h-10 rounded-lg border bg-background px-3 text-sm">
              <option value="all">All packages</option>
              {packageOptions.map((packageName) => (
                <option key={packageName} value={packageName}>{packageName}</option>
              ))}
            </select>
            <select name="payment_status" defaultValue={paymentStatus} className="h-10 rounded-lg border bg-background px-3 text-sm">
              <option value="all">All payment status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
              <option value="partially_refunded">Partially refunded</option>
              <option value="no_payment">No payment</option>
            </select>
            <select name="gst_applicable" defaultValue={gstApplicable} className="h-10 rounded-lg border bg-background px-3 text-sm">
              <option value="all">All GST</option>
              <option value="yes">GST applicable</option>
              <option value="no">GST not applicable</option>
            </select>
            <input name="date_from" type="date" defaultValue={snapshot.range.dateFrom} className="h-10 rounded-lg border bg-background px-3 text-sm" />
            <input name="date_to" type="date" defaultValue={snapshot.range.dateTo} className="h-10 rounded-lg border bg-background px-3 text-sm" />
            <select name="financial_year" defaultValue={snapshot.range.financialYear} className="h-10 rounded-lg border bg-background px-3 text-sm">
              <option value="all">All financial years</option>
              {financialYears.map((year) => (
                <option key={year.slug} value={year.slug}>{year.label}</option>
              ))}
            </select>
            <select name="sort_by" defaultValue={sortBy} className="h-10 rounded-lg border bg-background px-3 text-sm">
              <option value="payment_date">Sort by payment date</option>
              <option value="member_name">Sort by member name</option>
              <option value="payment_amount">Sort by payment amount</option>
              <option value="invoice_date">Sort by invoice date</option>
            </select>
            <div className="flex gap-3">
              <select name="sort_dir" defaultValue={sortDir} className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
              <select name="page_size" defaultValue={String(pageSize)} className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
                <option value="25">25 rows</option>
                <option value="50">50 rows</option>
                <option value="100">100 rows</option>
              </select>
            </div>
            <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">Apply</button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Total Members" value={snapshot.totals.totalMembers} integer />
        <Metric title="Total Transactions" value={snapshot.totals.totalTransactions} integer />
        <Metric title="Total Taxable Amount" value={snapshot.totals.taxableAmount} />
        <Metric title="CGST" value={snapshot.totals.cgst} tone="text-blue-600" />
        <Metric title="SGST" value={snapshot.totals.sgst} tone="text-emerald-600" />
        <Metric title="IGST" value={snapshot.totals.igst} tone="text-violet-600" />
        <Metric title="Total GST" value={snapshot.totals.totalGst} tone="text-orange-600" />
        <Metric title="Grand Total" value={snapshot.totals.grandTotal} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SummaryCard title="Current Month" transactions={snapshot.currentMonth.transactions} taxable={snapshot.currentMonth.sales.taxable} gst={snapshot.currentMonth.sales.total} gross={snapshot.currentMonth.grossRevenue} />
        <SummaryCard title="Current Quarter" transactions={snapshot.currentQuarter.transactions} taxable={snapshot.currentQuarter.sales.taxable} gst={snapshot.currentQuarter.sales.total} gross={snapshot.currentQuarter.grossRevenue} />
        <SummaryCard title={snapshot.financialYearRange.label} transactions={snapshot.currentFinancialYear.transactions} taxable={snapshot.currentFinancialYear.sales.taxable} gst={snapshot.currentFinancialYear.sales.total} gross={snapshot.currentFinancialYear.grossRevenue} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ReceiptText className="size-5 text-muted-foreground" />
            <CardTitle>GST Member Register</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {snapshot.transactions.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">No members or payment rows matched the selected tenant, branch, date, package, payment status, and GST filters.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[2200px] text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                    <tr className="border-b">
                      {[
                        "Member ID",
                        "Member Name",
                        "Phone",
                        "Email",
                        "Gender",
                        "Branch",
                        "Package / Membership Plan",
                        "Payment Date",
                        "Membership Start Date",
                        "Membership End Date",
                        "Payment Amount",
                        "Payment Mode",
                        "GST Applicable",
                        "GST Rate",
                        "Taxable Amount",
                        "CGST",
                        "SGST",
                        "IGST",
                        "Total GST",
                        "Grand Total",
                        "Invoice Number",
                        "Invoice Date",
                        "Payment Status",
                      ].map((header) => (
                        <th key={header} className="whitespace-nowrap px-4 py-3 text-left font-medium text-muted-foreground">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {snapshot.transactions.map((row) => (
                      <tr key={row.rowId} className="hover:bg-muted/30">
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{row.memberCode ?? "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-medium">{row.memberName ?? "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3">{row.phone ?? "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3">{row.email ?? "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3">{row.gender ?? "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3">{row.branchName ?? "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3">{row.packageName ?? "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3">{formatDateCell(row.paymentDate)}</td>
                        <td className="whitespace-nowrap px-4 py-3">{formatDateCell(row.membershipStartDate)}</td>
                        <td className="whitespace-nowrap px-4 py-3">{formatDateCell(row.membershipEndDate)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">{formatCurrency(row.paymentAmount)}</td>
                        <td className="whitespace-nowrap px-4 py-3 capitalize">{row.paymentMode?.replace(/_/g, " ") ?? "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3">{row.gstApplicable ? "Yes" : "No"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">{row.gstRate ? `${row.gstRate.toFixed(2)}%` : "0%"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">{formatCurrency(row.taxableAmount)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">{formatCurrency(row.cgst)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">{formatCurrency(row.sgst)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">{formatCurrency(row.igst)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">{formatCurrency(row.totalGst)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">{formatCurrency(row.grandTotal)}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{row.invoiceNumber ?? "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3">{formatDateCell(row.invoiceDate)}</td>
                        <td className="whitespace-nowrap px-4 py-3 capitalize">{(row.paymentStatus ?? "-").replace(/_/g, " ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <p className="text-muted-foreground">Showing {snapshot.transactions.length} of {snapshot.pagination.total} rows. Page {snapshot.pagination.page} of {snapshot.pagination.totalPages}.</p>
                <div className="flex items-center gap-2">
                  <PaginationLink label="Previous" disabled={snapshot.pagination.page <= 1} query={currentQuery} page={snapshot.pagination.page - 1} />
                  <PaginationLink label="Next" disabled={snapshot.pagination.page >= snapshot.pagination.totalPages} query={currentQuery} page={snapshot.pagination.page + 1} />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ title, value, tone, integer }: { title: string; value: number; tone?: string; integer?: boolean }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
        <p className={`mt-2 text-xl font-bold ${tone ?? ""}`}>{integer ? value.toLocaleString("en-IN") : formatCurrency(value)}</p>
      </CardContent>
    </Card>
  );
}

function SummaryCard({ title, transactions, taxable, gst, gross }: { title: string; transactions: number; taxable: number; gst: number; gross: number }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Transactions</span><span>{transactions.toLocaleString("en-IN")}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Taxable Sales</span><span>{formatCurrency(taxable)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Total GST</span><span>{formatCurrency(gst)}</span></div>
        <div className="flex justify-between font-semibold"><span>Gross Revenue</span><span>{formatCurrency(gross)}</span></div>
      </CardContent>
    </Card>
  );
}

function formatDateCell(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN");
}

function PaginationLink({ label, disabled, query, page }: { label: string; disabled: boolean; query: URLSearchParams; page: number }) {
  if (disabled) {
    return <span className="inline-flex h-9 items-center rounded-lg border px-3 text-muted-foreground">{label}</span>;
  }
  const nextQuery = new URLSearchParams(query);
  nextQuery.set("page", String(page));
  return <Link href={`/admin/finance/gst?${nextQuery.toString()}`} className="inline-flex h-9 items-center rounded-lg border px-3 hover:bg-muted">{label}</Link>;
}

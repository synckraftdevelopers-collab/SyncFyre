import Link from "next/link";
import { ChevronLeft, ChevronRight, CircleDollarSign, Download, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { listPayments, type PaymentSortColumn } from "@/services/payment.service";
import { SortableTh, readSort } from "@/components/ui/sortable-th";

export const metadata = { title: "Payments" };

const statusVariant: Record<string, "success" | "warning" | "danger" | "outline" | "default"> = {
  completed: "success", pending: "warning", failed: "danger", refunded: "outline", partially_refunded: "warning",
};
const methodLabel: Record<string, string> = { cash: "Cash", upi: "UPI", card: "Card", online: "Online" };

const SORTABLE_COLUMNS: { label: string; column: PaymentSortColumn }[] = [
  { label: "Member", column: "member" },
  { label: "Amount", column: "amount" },
  { label: "Method", column: "method" },
  { label: "Status", column: "status" },
  { label: "Date", column: "date" },
  { label: "Ref", column: "ref" },
  { label: "Invoice", column: "invoice" },
];

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; colSort?: string; colDir?: string }>;
}) {
  const query = await searchParams;
  const profile = await getCurrentProfile();
  const currentPage = Math.max(1, Number(query.page ?? 1));
  const { sort: colSort, dir: colDir } = readSort(
    query as Record<string, string | undefined>,
    SORTABLE_COLUMNS.map((c) => c.column),
    { sort: "colSort", dir: "colDir" },
  );
  const result = await listPayments({
    page: currentPage,
    branchId: profile?.branch_id,
    status: query.status,
    sortColumn: colSort,
    sortDir: colDir,
  });
  const totalPages = Math.max(1, result.totalPages);

  function pageUrl(p: number) {
    const params = new URLSearchParams();
    if (query.status && query.status !== "all") params.set("status", query.status);
    if (colSort) { params.set("colSort", colSort); params.set("colDir", colDir); }
    params.set("page", String(p));
    return `/admin/payments?${params.toString()}`;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-sm text-muted-foreground">Track all payment transactions across your gym.</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link href="/admin/payments/pending" className={buttonVariants({ variant: "outline" })}>
            <CircleDollarSign className="size-4" />Pending Payments
          </Link>
          <Link href="/api/reports?resource=payments" className={buttonVariants({ variant: "outline" })}>
            <Download className="size-4" />Export CSV
          </Link>
          <Link href="/admin/invoices/new" className={buttonVariants({})}>
            <Plus className="size-4" />New invoice
          </Link>
        </div>
      </div>

      <Card>
        <form className="flex items-center gap-3 border-b p-4">
          <label className="text-sm font-medium text-muted-foreground">Status</label>
          <select name="status" defaultValue={query.status ?? "all"} className="h-9 rounded-lg border bg-background px-3 text-sm">
            <option value="all">All</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
          <input type="hidden" name="page" value="1" />
          <button type="submit" className={buttonVariants({ variant: "outline", size: "sm" })}>Apply</button>
        </form>

        {result.data.length === 0 ? (
          <CardContent className="grid min-h-64 place-items-center text-center">
            <div>
              <CircleDollarSign className="mx-auto mb-3 size-10 text-muted-foreground" />
              <p className="font-medium">No payments found</p>
              <p className="text-sm text-muted-foreground">Payments will appear here once collected.</p>
            </div>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  {SORTABLE_COLUMNS.map(({ label, column }) => (
                    <SortableTh
                      key={column}
                      label={label}
                      column={column}
                      basePath="/admin/payments"
                      searchParams={query as Record<string, string | undefined>}
                      currentSort={colSort}
                      currentDir={colDir}
                      paramNames={{ sort: "colSort", dir: "colDir" }}
                      className="px-4 py-3 font-medium"
                    />
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {result.data.map((payment) => (
                  <tr key={payment.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      {payment.members ? (
                        <div>
                          <p className="font-medium">{payment.members.full_name}</p>
                          <p className="text-xs text-muted-foreground">{payment.members.member_code}</p>
                        </div>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums">{formatCurrency(Number(payment.amount))}</td>
                    <td className="px-4 py-3 text-muted-foreground">{methodLabel[payment.method] ?? payment.method}</td>
                    <td className="px-4 py-3"><Badge variant={statusVariant[payment.status] ?? "outline"}>{payment.status}</Badge></td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(payment.paid_at ?? payment.created_at).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="line-clamp-1 max-w-32 font-mono text-xs">{payment.transaction_reference ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      {payment.invoice_id ? (
                        <Link href={`/admin/invoices/${payment.invoice_id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>View</Link>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t p-4 text-sm text-muted-foreground">
          <span>{result.total} payment{result.total === 1 ? "" : "s"}</span>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">Page {currentPage} of {totalPages}</span>
            <Link href={pageUrl(currentPage - 1)} aria-disabled={currentPage <= 1}
              className={buttonVariants({ variant: "outline", size: "icon" }) + (currentPage <= 1 ? " pointer-events-none opacity-40" : "")}>
              <ChevronLeft className="size-4" />
            </Link>
            <Link href={pageUrl(currentPage + 1)} aria-disabled={currentPage >= totalPages}
              className={buttonVariants({ variant: "outline", size: "icon" }) + (currentPage >= totalPages ? " pointer-events-none opacity-40" : "")}>
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

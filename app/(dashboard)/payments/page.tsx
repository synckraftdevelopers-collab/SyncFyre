import Link from "next/link";
import { ChevronLeft, ChevronRight, CircleDollarSign, Download, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { listPayments } from "@/services/payment.service";

const statusVariant: Record<string, "success" | "warning" | "danger" | "outline" | "default"> = {
  completed: "success",
  pending: "warning",
  failed: "danger",
  refunded: "outline",
  partially_refunded: "warning",
};

const methodLabel: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
  online: "Online",
};

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const query = await searchParams;
  const profile = await getCurrentProfile();
  const currentPage = Math.max(1, Number(query.page ?? 1));

  const result = await listPayments({
    page: currentPage,
    branchId: profile?.branch_id,
    status: query.status,
  });

  const totalPages = Math.max(1, result.totalPages);

  function pageUrl(p: number) {
    const params = new URLSearchParams();
    if (query.status && query.status !== "all") params.set("status", query.status);
    params.set("page", String(p));
    return `/payments?${params.toString()}`;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-sm text-muted-foreground">
            Track all payment transactions across your gym.
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <Link
            href="/api/reports?resource=payments"
            className={buttonVariants({ variant: "outline" })}
          >
            <Download className="size-4" />
            Export CSV
          </Link>
          <Link href="/invoices/new" className={buttonVariants({})}>
            <Plus className="size-4" />
            New invoice
          </Link>
        </div>
      </div>

      <Card>
        {/* Filter bar */}
        <form className="flex items-center gap-3 border-b p-4">
          <label className="text-sm font-medium text-muted-foreground">Status</label>
          <select
            name="status"
            defaultValue={query.status ?? "all"}
            className="h-9 rounded-lg border bg-background px-3 text-sm"
          >
            <option value="all">All</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
          <input type="hidden" name="page" value="1" />
          <button
            type="submit"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Apply
          </button>
        </form>

        {/* Table */}
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
                  <th className="px-4 py-3 font-medium">Member</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Ref</th>
                  <th className="px-4 py-3 font-medium">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {result.data.map((payment) => (
                  <tr key={payment.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      {payment.members ? (
                        <div>
                          <p className="font-medium">{payment.members.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {payment.members.member_code}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums">
                      {formatCurrency(Number(payment.amount))}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {methodLabel[payment.method] ?? payment.method}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[payment.status] ?? "outline"}>
                        {payment.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {payment.paid_at
                        ? new Date(payment.paid_at).toLocaleDateString("en-IN")
                        : new Date(payment.created_at).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="line-clamp-1 max-w-32 font-mono text-xs">
                        {payment.transaction_reference ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {payment.invoice_id ? (
                        <Link
                          href={`/invoices/${payment.invoice_id}`}
                          className={buttonVariants({ variant: "ghost", size: "sm" })}
                        >
                          View
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        <div className="flex items-center justify-between border-t p-4 text-sm text-muted-foreground">
          <span>
            {result.total} payment{result.total === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">
              Page {currentPage} of {totalPages}
            </span>
            <Link
              href={pageUrl(currentPage - 1)}
              aria-label="Previous page"
              aria-disabled={currentPage <= 1}
              className={
                buttonVariants({ variant: "outline", size: "icon" }) +
                (currentPage <= 1 ? " pointer-events-none opacity-40" : "")
              }
            >
              <ChevronLeft className="size-4" />
            </Link>
            <Link
              href={pageUrl(currentPage + 1)}
              aria-label="Next page"
              aria-disabled={currentPage >= totalPages}
              className={
                buttonVariants({ variant: "outline", size: "icon" }) +
                (currentPage >= totalPages ? " pointer-events-none opacity-40" : "")
              }
            >
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

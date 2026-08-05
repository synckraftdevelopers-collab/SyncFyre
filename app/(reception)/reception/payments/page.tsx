import Link from "next/link";
import { ChevronLeft, ChevronRight, CircleDollarSign, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { listPayments } from "@/services/payment.service";

export const metadata = { title: "Payments" };

const statusVariant: Record<string, "success" | "warning" | "danger" | "outline"> = {
  completed: "success", pending: "warning", failed: "danger", refunded: "outline", partially_refunded: "warning",
};

export default async function ReceptionPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const query = await searchParams;
  const profile = await getCurrentProfile();
  const currentPage = Math.max(1, Number(query.page ?? 1));
  const result = await listPayments({ page: currentPage, branchId: profile?.branch_id, status: query.status });
  const totalPages = Math.max(1, result.totalPages);

  function pageUrl(p: number) {
    const params = new URLSearchParams();
    if (query.status && query.status !== "all") params.set("status", query.status);
    params.set("page", String(p));
    return `/reception/payments?${params.toString()}`;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div><h1 className="text-2xl font-bold">Payments</h1><p className="text-sm text-muted-foreground">Collect and track member payments.</p></div>
        <Link href="/reception/invoices/new" className={buttonVariants({ className: "ml-auto" })}>
          <Plus className="size-4" />Collect payment
        </Link>
      </div>

      <Card>
        {result.data.length === 0 ? (
          <CardContent className="grid min-h-64 place-items-center text-center">
            <div><CircleDollarSign className="mx-auto mb-3 size-10 text-muted-foreground" /><p className="font-medium">No payments found</p></div>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>{["Member","Amount","Method","Status","Date"].map(h => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {result.data.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">{p.members?.full_name ?? "—"}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums">{formatCurrency(Number(p.amount))}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{p.method}</td>
                    <td className="px-4 py-3"><Badge variant={statusVariant[p.status] ?? "outline"}>{p.status}</Badge></td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(p.paid_at ?? p.created_at).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t p-4 text-sm text-muted-foreground">
          <span>{result.total} payment{result.total === 1 ? "" : "s"}</span>
          <div className="flex items-center gap-2">
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

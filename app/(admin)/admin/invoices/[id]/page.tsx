import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { getInvoiceById } from "@/services/payment.service";
import type { Payment } from "@/services/payment.service";

const invoiceStatusVariant: Record<string, "success" | "warning" | "danger" | "outline"> = {
  paid: "success", partial: "warning", unpaid: "danger", void: "outline",
};
const paymentStatusVariant: Record<string, "success" | "warning" | "danger" | "outline"> = {
  completed: "success", pending: "warning", failed: "danger", refunded: "outline", partially_refunded: "warning",
};
const methodLabel: Record<string, string> = { cash: "Cash", upi: "UPI", card: "Card", online: "Online" };

export default async function AdminInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(["admin", "manager"]);

  const invoice = await getInvoiceById(id) as (Awaited<ReturnType<typeof getInvoiceById>> & { payments?: Payment[] }) | null;
  if (!invoice) notFound();

  const memberName = invoice.members?.full_name ?? "Unknown member";
  const memberCode = invoice.members?.member_code ?? "";
  const payments = (invoice as unknown as { payments?: Payment[] }).payments ?? [];
  const outstanding = invoice.total_amount - invoice.amount_paid;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin/payments" className={buttonVariants({ variant: "ghost" })}>
          <ArrowLeft className="size-4" />Payments
        </Link>
        <div className="ml-auto">
          <button type="button" onClick={() => window.print()} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Printer className="size-4" />Print receipt
          </button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 border-b pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Invoice</p>
            <CardTitle className="mt-1 font-mono text-lg">#{id.split("-")[0].toUpperCase()}</CardTitle>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Issued {new Date(invoice.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          </div>
          <Badge variant={invoiceStatusVariant[invoice.status] ?? "outline"} className="text-sm px-3 py-1">
            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
          </Badge>
        </CardHeader>

        <CardContent className="space-y-6 pt-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Bill to</p>
            <p className="font-semibold">{memberName}</p>
            <p className="text-sm text-muted-foreground">{memberCode}</p>
          </div>

          {invoice.line_items.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Items</p>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr><th className="px-4 py-2 text-left font-medium">Description</th><th className="px-4 py-2 text-right font-medium">Amount</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {invoice.line_items.map((item, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2">{String((item as Record<string, unknown>).description ?? "Item")}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(Number((item as Record<string, unknown>).amount ?? 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="rounded-lg border p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{formatCurrency(invoice.subtotal)}</span></div>
            {invoice.discount_amount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span className="tabular-nums">- {formatCurrency(invoice.discount_amount)}</span></div>}
            {invoice.gst_amount > 0 && <div className="flex justify-between text-muted-foreground"><span>GST</span><span className="tabular-nums">+ {formatCurrency(invoice.gst_amount)}</span></div>}
            <div className="flex justify-between border-t pt-2 font-bold text-base"><span>Total</span><span className="tabular-nums">{formatCurrency(invoice.total_amount)}</span></div>
            <div className="flex justify-between text-emerald-600"><span>Amount paid</span><span className="tabular-nums">{formatCurrency(invoice.amount_paid)}</span></div>
            {outstanding > 0 && <div className="flex justify-between text-red-600 font-semibold"><span>Outstanding</span><span className="tabular-nums">{formatCurrency(outstanding)}</span></div>}
          </div>

          {invoice.notes && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Notes</p>{invoice.notes}
            </div>
          )}

          {payments.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Payment history</p>
              <div className="divide-y rounded-lg border overflow-hidden">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center gap-4 px-4 py-3 text-sm">
                    <div className="flex-1">
                      <p className="font-medium tabular-nums">{formatCurrency(Number(p.amount))}</p>
                      <p className="text-xs text-muted-foreground">{methodLabel[p.method] ?? p.method}{p.transaction_reference && <> &middot; <span className="font-mono">{p.transaction_reference}</span></>}</p>
                    </div>
                    <Badge variant={paymentStatusVariant[p.status] ?? "outline"}>{p.status}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(p.paid_at ?? p.created_at).toLocaleDateString("en-IN")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

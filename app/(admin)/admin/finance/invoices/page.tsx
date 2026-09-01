import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { listInvoices } from "@/services/payment.service";

export const metadata = { title: "Finance Invoices" };

type InvoiceWithNumber = {
  invoice_number?: string | null;
};

export default async function FinanceInvoicesPage() {
  const profile = await getCurrentProfile();
  const result = await listInvoices({ branchId: profile?.branch_id, page: 1, pageSize: 100 });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Invoices</h1>
        <p className="text-sm text-muted-foreground">Invoice records inside Finance using the existing billing tables.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {result.data.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">No invoices found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    {["Invoice", "Member", "Status", "Subtotal", "GST", "Total", "Paid", "Action"].map((header) => (
                      <th key={header} className="px-4 py-3 font-medium">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {result.data.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="px-4 py-3 font-mono text-xs">{(invoice as InvoiceWithNumber).invoice_number ?? invoice.id.slice(0, 8).toUpperCase()}</td>
                      <td className="px-4 py-3">{invoice.members?.full_name ?? "Unknown member"}</td>
                      <td className="px-4 py-3 capitalize">{invoice.status}</td>
                      <td className="px-4 py-3">{formatCurrency(Number(invoice.taxable_amount ?? invoice.subtotal ?? 0))}</td>
                      <td className="px-4 py-3">{formatCurrency(Number(invoice.gst_amount ?? 0))}</td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(Number(invoice.total_amount ?? 0))}</td>
                      <td className="px-4 py-3">{formatCurrency(Number(invoice.amount_paid ?? 0))}</td>
                      <td className="px-4 py-3"><Link href={`/admin/invoices/${invoice.id}`} className="text-sm font-medium text-primary hover:underline">View</Link></td>
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

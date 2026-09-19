import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { listInvoices } from "@/services/payment.service";
import { SortableTh, readSort } from "@/components/ui/sortable-th";

export const metadata = { title: "Finance Invoices" };

type InvoiceWithNumber = {
  invoice_number?: string | null;
};

const SORTABLE_COLUMNS = [
  { label: "Invoice", column: "invoice" as const },
  { label: "Member", column: "member" as const },
  { label: "Status", column: "status" as const },
  { label: "Subtotal", column: "subtotal" as const },
  { label: "GST", column: "gst" as const },
  { label: "Total", column: "total" as const },
  { label: "Paid", column: "paid" as const },
];

export default async function FinanceInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ colSort?: string; colDir?: string }>;
}) {
  const profile = await getCurrentProfile();
  const sp = await searchParams;
  const result = await listInvoices({ branchId: profile?.branch_id, page: 1, pageSize: 100 });

  const { sort: colSort, dir: colDir } = readSort(
    sp as Record<string, string | undefined>,
    SORTABLE_COLUMNS.map((c) => c.column),
    { sort: "colSort", dir: "colDir" },
  );

  let invoices = result.data;
  if (colSort) {
    const dirMul = colDir === "desc" ? -1 : 1;
    const sortValue = (invoice: (typeof invoices)[number]): string | number => {
      switch (colSort) {
        case "invoice":
          return (invoice as InvoiceWithNumber).invoice_number ?? invoice.id;
        case "member":
          return invoice.members?.full_name ?? "";
        case "status":
          return invoice.status ?? "";
        case "subtotal":
          return Number(invoice.taxable_amount ?? invoice.subtotal ?? 0);
        case "gst":
          return Number(invoice.gst_amount ?? 0);
        case "total":
          return Number(invoice.total_amount ?? 0);
        case "paid":
          return Number(invoice.amount_paid ?? 0);
        default:
          return "";
      }
    };
    invoices = [...invoices].sort((a, b) => {
      const av = sortValue(a);
      const bv = sortValue(b);
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dirMul;
      return ((av as number) < (bv as number) ? -1 : (av as number) > (bv as number) ? 1 : 0) * dirMul;
    });
  }

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
          {invoices.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">No invoices found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    {SORTABLE_COLUMNS.map(({ label, column }) => (
                      <SortableTh
                        key={column}
                        label={label}
                        column={column}
                        basePath="/admin/finance/invoices"
                        searchParams={sp as Record<string, string | undefined>}
                        currentSort={colSort}
                        currentDir={colDir}
                        paramNames={{ sort: "colSort", dir: "colDir" }}
                        className="px-4 py-3 font-medium"
                      />
                    ))}
                    <th className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoices.map((invoice) => (
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

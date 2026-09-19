import Link from "next/link";
import { getPaymentsReport } from "@/services/report.service";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { SortableTh, readSort } from "@/components/ui/sortable-th";
export const metadata = { title: "Payments Report" };

const SORTABLE_COLUMNS = [
  { label: "Date", column: "date" as const },
  { label: "Member", column: "member" as const },
  { label: "Invoice", column: "invoice" as const },
  { label: "Plan", column: "plan" as const },
  { label: "Amount", column: "amount" as const },
  { label: "Method", column: "method" as const },
  { label: "Status", column: "status" as const },
];

export default async function PaymentsReport({ searchParams }: { searchParams: Promise<{ status?: string; method?: string; from?: string; to?: string; colSort?: string; colDir?: string }> }) {
  const sp = await searchParams;
  const profile = await requireUser(["admin", "manager"]);
  const report = await getPaymentsReport({ branchId: profile.branch_id, pageSize: 100, status: sp.status as any, method: sp.method as any, dateFrom: sp.from, dateTo: sp.to });

  const { sort: colSort, dir: colDir } = readSort(
    sp as Record<string, string | undefined>,
    SORTABLE_COLUMNS.map((c) => c.column),
    { sort: "colSort", dir: "colDir" },
  );
  let rows: any[] = report.data;
  if (colSort) {
    const dirMul = colDir === "desc" ? -1 : 1;
    const sortValue = (row: any): string | number => {
      switch (colSort) {
        case "date": return row.payment_date ?? "";
        case "member": return row.full_name ?? "";
        case "invoice": return row.invoice_number ?? "";
        case "plan": return row.plan_name ?? "";
        case "amount": return Number(row.net_amount) || 0;
        case "method": return row.payment_method ?? "";
        case "status": return row.payment_status ?? "";
        default: return "";
      }
    };
    rows = [...rows].sort((a, b) => {
      const av = sortValue(a);
      const bv = sortValue(b);
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dirMul;
      return ((av as number) < (bv as number) ? -1 : (av as number) > (bv as number) ? 1 : 0) * dirMul;
    });
  }

  return <div className="space-y-5"><div className="flex"><div><h1 className="text-2xl font-bold">Payments Report</h1><p className="text-sm text-muted-foreground">{report.total} payment records</p></div><Link className={buttonVariants({ variant: "outline", className: "ml-auto" })} href="/api/reports?resource=payments">Export CSV</Link></div><Card><form className="flex flex-wrap gap-3 border-b p-4"><input name="from" type="date" defaultValue={sp.from} className="h-10 rounded-lg border px-3" /><input name="to" type="date" defaultValue={sp.to} className="h-10 rounded-lg border px-3" /><select name="status" defaultValue={sp.status ?? "all"} className="h-10 rounded-lg border px-3"><option value="all">All statuses</option><option value="completed">Completed</option><option value="pending">Pending</option><option value="failed">Failed</option></select><select name="method" defaultValue={sp.method ?? "all"} className="h-10 rounded-lg border px-3"><option value="all">All methods</option><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="online">Online</option></select><button className={buttonVariants({ variant: "outline" })}>Apply</button></form><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="border-b text-left text-xs uppercase text-muted-foreground"><tr>{SORTABLE_COLUMNS.map(({ label, column }) => <SortableTh key={column} label={label} column={column} basePath="/admin/reports/payments" searchParams={sp as Record<string, string | undefined>} currentSort={colSort} currentDir={colDir} paramNames={{ sort: "colSort", dir: "colDir" }} className="p-3 font-medium" />)}</tr></thead><tbody className="divide-y">{rows.map((row: any) => <tr key={row.payment_id}><td className="p-3">{row.payment_date}</td><td className="p-3 font-medium">{row.full_name}</td><td className="p-3">{row.invoice_number ?? "—"}</td><td className="p-3">{row.plan_name ?? "—"}</td><td className="p-3">₹{Number(row.net_amount).toLocaleString("en-IN")}</td><td className="p-3 capitalize">{row.payment_method}</td><td className="p-3 capitalize">{row.payment_status}</td></tr>)}</tbody></table></div></Card></div>;
}

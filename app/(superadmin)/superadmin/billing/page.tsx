import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SortableTh, readSort } from "@/components/ui/sortable-th";

export const metadata = { title: "Billing" };

type Invoice = { id: string; invoice_number: string; total_amount: number; amount_paid: number; status: string; created_at: string; members: { full_name: string } | null; branches: { name: string } | null };

const SORTABLE_COLUMNS = [
  { label: "Invoice", column: "invoice" as const },
  { label: "Member", column: "member" as const },
  { label: "Branch", column: "branch" as const },
  { label: "Total", column: "total" as const },
  { label: "Paid", column: "paid" as const },
  { label: "Status", column: "status" as const },
];

export default async function SuperAdminBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ colSort?: string; colDir?: string }>;
}) {
  const sp = await searchParams;
  await requireUser(["super_admin"]);
  const admin = createAdminClient();
  const [{ data: invoices, error: invoiceError }, { count: paidCount, error: paymentError }] = await Promise.all([admin.from("invoices").select("id,invoice_number,total_amount,amount_paid,status,created_at,members(full_name),branches(name)").order("created_at", { ascending: false }).limit(100), admin.from("payments").select("id", { count: "exact", head: true }).eq("status", "completed")]);
  if (invoiceError) throw invoiceError;
  if (paymentError) throw paymentError;
  let rows = (invoices ?? []) as unknown as Invoice[];
  const billed = rows.reduce((sum, invoice) => sum + Number(invoice.total_amount), 0);
  const collected = rows.reduce((sum, invoice) => sum + Number(invoice.amount_paid), 0);

  const { sort: colSort, dir: colDir } = readSort(
    sp as Record<string, string | undefined>,
    SORTABLE_COLUMNS.map((c) => c.column),
    { sort: "colSort", dir: "colDir" },
  );
  if (colSort) {
    const dirMul = colDir === "desc" ? -1 : 1;
    const sortValue = (invoice: Invoice): string | number => {
      switch (colSort) {
        case "invoice": return invoice.invoice_number ?? "";
        case "member": return invoice.members?.full_name ?? "";
        case "branch": return invoice.branches?.name ?? "";
        case "total": return Number(invoice.total_amount) || 0;
        case "paid": return Number(invoice.amount_paid) || 0;
        case "status": return invoice.status ?? "";
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

  return <div className="space-y-6"><div><h1 className="text-2xl font-bold">Billing</h1><p className="text-sm text-muted-foreground">Live invoice and payment activity across all gyms.</p></div><div className="grid gap-4 sm:grid-cols-3"><Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Invoices shown</p><p className="mt-1 text-2xl font-bold">{rows.length}</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Billed amount</p><p className="mt-1 text-2xl font-bold">₹{billed.toLocaleString("en-IN")}</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Completed payments</p><p className="mt-1 text-2xl font-bold">{paidCount ?? 0}</p></CardContent></Card></div><Card><CardHeader><CardTitle>Recent invoices</CardTitle></CardHeader><CardContent className="overflow-x-auto">{rows.length ? <table className="w-full min-w-[720px] text-sm"><thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr>{SORTABLE_COLUMNS.map(({ label, column }) => <SortableTh key={column} label={label} column={column} basePath="/superadmin/billing" searchParams={sp as Record<string, string | undefined>} currentSort={colSort} currentDir={colDir} paramNames={{ sort: "colSort", dir: "colDir" }} className="px-4 py-3 font-medium" />)}</tr></thead><tbody className="divide-y">{rows.map((invoice) => <tr key={invoice.id}><td className="px-4 py-3 font-medium">{invoice.invoice_number}</td><td className="px-4 py-3">{invoice.members?.full_name ?? "Unknown member"}</td><td className="px-4 py-3 text-muted-foreground">{invoice.branches?.name ?? "Unassigned"}</td><td className="px-4 py-3">₹{Number(invoice.total_amount).toLocaleString("en-IN")}</td><td className="px-4 py-3">₹{Number(invoice.amount_paid).toLocaleString("en-IN")}</td><td className="px-4 py-3"><Badge variant={invoice.status === "paid" ? "success" : invoice.status === "void" ? "danger" : "warning"}>{invoice.status}</Badge></td></tr>)}</tbody></table> : <p className="py-12 text-center text-sm text-muted-foreground">No invoices found.</p>}</CardContent></Card></div>;
}

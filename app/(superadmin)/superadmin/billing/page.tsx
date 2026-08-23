import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Billing" };

type Invoice = { id: string; invoice_number: string; total_amount: number; amount_paid: number; status: string; created_at: string; members: { full_name: string } | null; branches: { name: string } | null };

export default async function SuperAdminBillingPage() {
  await requireUser(["super_admin"]);
  const admin = createAdminClient();
  const [{ data: invoices, error: invoiceError }, { count: paidCount, error: paymentError }] = await Promise.all([admin.from("invoices").select("id,invoice_number,total_amount,amount_paid,status,created_at,members(full_name),branches(name)").order("created_at", { ascending: false }).limit(100), admin.from("payments").select("id", { count: "exact", head: true }).eq("status", "completed")]);
  if (invoiceError) throw invoiceError;
  if (paymentError) throw paymentError;
  const rows = (invoices ?? []) as unknown as Invoice[];
  const billed = rows.reduce((sum, invoice) => sum + Number(invoice.total_amount), 0);
  const collected = rows.reduce((sum, invoice) => sum + Number(invoice.amount_paid), 0);
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold">Billing</h1><p className="text-sm text-muted-foreground">Live invoice and payment activity across all gyms.</p></div><div className="grid gap-4 sm:grid-cols-3"><Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Invoices shown</p><p className="mt-1 text-2xl font-bold">{rows.length}</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Billed amount</p><p className="mt-1 text-2xl font-bold">₹{billed.toLocaleString("en-IN")}</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Completed payments</p><p className="mt-1 text-2xl font-bold">{paidCount ?? 0}</p></CardContent></Card></div><Card><CardHeader><CardTitle>Recent invoices</CardTitle></CardHeader><CardContent className="overflow-x-auto">{rows.length ? <table className="w-full min-w-[720px] text-sm"><thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Member</th><th className="px-4 py-3">Branch</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Paid</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y">{rows.map((invoice) => <tr key={invoice.id}><td className="px-4 py-3 font-medium">{invoice.invoice_number}</td><td className="px-4 py-3">{invoice.members?.full_name ?? "Unknown member"}</td><td className="px-4 py-3 text-muted-foreground">{invoice.branches?.name ?? "Unassigned"}</td><td className="px-4 py-3">₹{Number(invoice.total_amount).toLocaleString("en-IN")}</td><td className="px-4 py-3">₹{Number(invoice.amount_paid).toLocaleString("en-IN")}</td><td className="px-4 py-3"><Badge variant={invoice.status === "paid" ? "success" : invoice.status === "void" ? "danger" : "warning"}>{invoice.status}</Badge></td></tr>)}</tbody></table> : <p className="py-12 text-center text-sm text-muted-foreground">No invoices found.</p>}</CardContent></Card></div>;
}
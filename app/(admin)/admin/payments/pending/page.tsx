import { CircleDollarSign } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { getCurrentProfile, requireUser } from "@/lib/auth";
import { listPendingPayments } from "@/services/payment.service";
import { PendingPaymentsClient } from "@/components/payments/pending-payments-client";

export const metadata = { title: "Pending Payments" };

export default async function AdminPendingPaymentsPage() {
  await requireUser(["admin", "manager", "reception"]);
  const profile = await getCurrentProfile();
  const rows = await listPendingPayments({ branchId: profile?.role?.slug === "reception" ? profile.branch_id : null });
  return <div className="space-y-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-bold">Pending Payments</h1><p className="text-sm text-muted-foreground">Outstanding membership balances from live invoice data.</p></div><BackButton href="/admin/payments" className="sm:ml-auto" /></div><PendingPaymentsClient rows={rows} /></div>;
}
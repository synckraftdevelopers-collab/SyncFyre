import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { listPendingPayments } from "@/services/payment.service";
import { PendingPaymentsClient } from "@/components/payments/pending-payments-client";

export const metadata = { title: "Pending Payments" };

export default async function ReceptionPendingPaymentsPage() {
  const profile = await requireUser(["reception"]);
  const rows = await listPendingPayments({ branchId: profile.branch_id });
  return <div className="space-y-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-bold">Pending Payments</h1><p className="text-sm text-muted-foreground">Outstanding membership balances for your branch.</p></div><Link href="/reception/payments" className={buttonVariants({ variant: "outline", className: "sm:ml-auto" })}><ArrowLeft className="size-4" />Payments</Link></div><PendingPaymentsClient rows={rows} /></div>;
}
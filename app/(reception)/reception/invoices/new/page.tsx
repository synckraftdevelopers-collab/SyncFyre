import { BackButton } from "@/components/ui/back-button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { InvoiceForm } from "@/components/members/invoice-form";

export const metadata = { title: "Collect Payment" };

export default async function ReceptionNewInvoicePage({ searchParams }: { searchParams: Promise<{ memberId?: string; returnTo?: string }> }) {
  const params = await searchParams;
  await requireUser(["reception"]);
  const supabase = await createClient();

  const [membersRes, plansRes] = await Promise.all([
    supabase.from("members").select("id, full_name, member_code").eq("status", "active").order("full_name"),
    supabase.from("membership_plans").select("id, name, price, gst_percent, discount_percent, duration_months").eq("status", "active").order("name"),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <BackButton href={params.returnTo ?? "/reception/payments"} confirmOnLeave />
        <div>
          <h1 className="text-2xl font-bold">Collect payment</h1>
          <p className="text-sm text-muted-foreground">Create an invoice and record a payment in one step.</p>
        </div>
      </div>
      <Card>
        <CardContent className="p-5 md:p-7">
          <InvoiceForm members={membersRes.data ?? []} plans={plansRes.data ?? []} initialMemberId={params.memberId} returnTo={params.returnTo} />
        </CardContent>
      </Card>
    </div>
  );
}

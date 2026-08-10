import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NewMembershipForm } from "@/components/reception/new-membership-form";

export const metadata = { title: "New Subscription" };

export default async function NewReceptionMembershipPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const profile = await requireUser(["reception"]);
  const { plan: defaultPlanId } = await searchParams;
  const supabase = await createClient();
  const [membersResult, plansResult] = await Promise.all([
    supabase.from("members").select("id, full_name, member_code").eq("branch_id", profile.branch_id).eq("status", "active").order("full_name"),
    supabase.from("membership_plans").select("id, name, price, duration_months").eq("branch_id", profile.branch_id).eq("status", "active").order("name"),
  ]);
  const members = membersResult.data ?? [];
  const plans = plansResult.data ?? [];

  return <div className="mx-auto max-w-2xl space-y-5"><div><h1 className="text-2xl font-bold">New subscription</h1><p className="text-sm text-muted-foreground">Sell an active branch plan to an existing member.</p></div><Card><CardContent className="p-5 md:p-6">{members.length && plans.length ? <NewMembershipForm members={members} plans={plans} defaultPlanId={defaultPlanId} /> : <div className="space-y-4 py-6 text-center"><p className="font-medium">{members.length === 0 ? "No active members are available." : "No active membership plans are available."}</p><Link href={members.length === 0 ? "/reception/members/new" : "/reception/memberships"} className={buttonVariants()}> {members.length === 0 ? "Register member" : "Back to memberships"} </Link></div>}</CardContent></Card></div>;
}

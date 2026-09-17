import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPlanOptions } from "@/services/member-extended.service";
import { NewMembershipForm } from "@/components/reception/new-membership-form";

export const metadata = { title: "New Subscription" };

export default async function NewReceptionMembershipPage({ searchParams }: { searchParams: Promise<{ plan?: string; member?: string }> }) {
  const profile = await requireUser(["reception"]);
  const { plan: defaultPlanId, member: defaultMemberId } = await searchParams;
  const supabase = await createClient();
  const [membersResult, plans] = await Promise.all([
    supabase.from("members").select("id, full_name, member_code").eq("branch_id", profile.branch_id).eq("status", "active").order("full_name"),
    getPlanOptions(profile.branch_id),
  ]);
  const members = membersResult.data ?? [];

  return <div className="mx-auto max-w-2xl space-y-5"><div><h1 className="text-2xl font-bold">New subscription</h1><p className="text-sm text-muted-foreground">Sell an active branch plan to an existing member — adds a new plan without touching any plan they already have.</p></div><Card><CardContent className="p-5 md:p-6">{members.length && plans.length ? <NewMembershipForm members={members} plans={plans} defaultPlanId={defaultPlanId} defaultMemberId={defaultMemberId} /> : <div className="space-y-4 py-6 text-center"><p className="font-medium">{members.length === 0 ? "No active members are available." : "No active membership plans are available."}</p><Link href={members.length === 0 ? "/reception/members/new" : "/reception/memberships"} className={buttonVariants()}> {members.length === 0 ? "Register member" : "Back to memberships"} </Link></div>}</CardContent></Card></div>;
}

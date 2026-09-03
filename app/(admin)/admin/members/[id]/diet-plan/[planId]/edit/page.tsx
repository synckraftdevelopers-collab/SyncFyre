import { notFound } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import { Card, CardContent } from "@/components/ui/card";
import { DietPlanEditForm } from "@/components/modules/diet-plan-edit-form";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminMemberDietPlanEditPage({ params }: { params: Promise<{ id: string; planId: string }> }) {
  const { id: memberId, planId } = await params;
  const profile = await requireUser(["admin", "manager", "reception"]);
  if (!profile.tenant_id) notFound();
  const supabase = await createClient();
  const { data: member } = await supabase.from("members").select("id,full_name,member_code,branch_id").eq("id", memberId).eq("tenant_id", profile.tenant_id).maybeSingle();
  if (!member || (profile.role?.slug === "reception" && member.branch_id !== profile.branch_id)) notFound();
  const { data: plan } = await supabase.from("diet_plans").select("id,member_id,name,start_date,end_date,breakfast,lunch,dinner,snacks,calories,protein_g,fat_g,carbs_g,water_liters,notes,status,branch_id").eq("id", planId).eq("member_id", member.id).eq("branch_id", member.branch_id).maybeSingle();
  if (!plan) notFound();
  const returnTo = `/admin/members/${member.id}?tab=diet`;
  return <div className="mx-auto max-w-3xl space-y-5"><div><BackButton href={returnTo} confirmOnLeave /><h1 className="mt-2 text-2xl font-bold">Edit diet plan</h1><p className="text-sm text-muted-foreground">Update the nutrition plan for {member.full_name}.</p></div><Card><CardContent className="p-5 md:p-7"><DietPlanEditForm plan={plan} members={[member]} returnTo={returnTo} /></CardContent></Card></div>;
}
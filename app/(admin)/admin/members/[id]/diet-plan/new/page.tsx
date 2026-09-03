import { notFound } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import { Card, CardContent } from "@/components/ui/card";
import { ResourceCreateForm, type FormField } from "@/components/modules/resource-create-form";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminMemberDietPlanNewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const profile = await requireUser(["admin", "manager", "reception"]); if (!profile.tenant_id) notFound();
  const supabase = await createClient(); const { data: member } = await supabase.from("members").select("id,full_name,member_code,branch_id").eq("id", id).eq("tenant_id", profile.tenant_id).maybeSingle();
  if (!member || (profile.role?.slug === "reception" && member.branch_id !== profile.branch_id)) notFound();
  const returnTo = `/admin/members/${member.id}?tab=diet`; const today = new Date().toISOString().slice(0, 10);
  const fields: FormField[] = [{ name: "member_id", label: "Member", type: "select", required: true, defaultValue: member.id, options: [{ value: member.id, label: `${member.full_name} (${member.member_code})` }] }, { name: "name", label: "Plan name", required: true }, { name: "start_date", label: "Start date", type: "date", required: true, defaultValue: today }, { name: "end_date", label: "End date", type: "date" }, { name: "breakfast", label: "Breakfast", type: "textarea" }, { name: "lunch", label: "Lunch", type: "textarea" }, { name: "dinner", label: "Dinner", type: "textarea" }, { name: "snacks", label: "Snacks", type: "textarea" }, { name: "calories", label: "Calories", type: "number" }, { name: "protein_g", label: "Protein (g)", type: "number" }, { name: "fat_g", label: "Fat (g)", type: "number" }, { name: "carbs_g", label: "Carbs (g)", type: "number" }, { name: "water_liters", label: "Water (L)", type: "number" }];
  return <div className="mx-auto max-w-4xl space-y-5"><div><BackButton href={returnTo} confirmOnLeave /><h1 className="mt-2 text-2xl font-bold">Create diet plan</h1><p className="text-sm text-muted-foreground">Create a nutrition plan for {member.full_name}.</p></div><Card><CardContent className="p-5 md:p-7"><ResourceCreateForm resource="diet-plans" fields={fields} returnTo={returnTo} /></CardContent></Card></div>;
}
import Link from "next/link";
import { Plus, Utensils } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Diet Plans" };

export default async function AdminDietPlansPage() {
  const profile = await requireUser(["admin", "manager", "reception"]);
  const supabase = await createClient();
  let query = supabase.from("diet_plans").select("id,name,start_date,end_date,calories,protein_g,status,members(full_name,member_code),staff!diet_plans_staff_id_fkey(users!staff_user_id_fkey(full_name))").order("created_at", { ascending: false }).limit(100);
  if (profile.branch_id) query = query.eq("branch_id", profile.branch_id);
  const { data: plans, error } = await query;
  if (error) throw new Error(error.message);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-bold">Diet Plans</h1><p className="text-sm text-muted-foreground">Nutrition plans assigned to members.</p></div><Link href="/admin/diet-plans/new" className={buttonVariants({ className: "ml-auto" })}><Plus className="size-4" />Create diet plan</Link></div>
      <Card><CardHeader><CardTitle>{plans?.length ?? 0} diet plan{(plans?.length ?? 0) === 1 ? "" : "s"}</CardTitle></CardHeader><CardContent className="p-0">
        {plans?.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/40"><th className="px-4 py-3 text-left font-medium text-muted-foreground">Plan</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Member</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Calories</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Created by</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Period</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th></tr></thead><tbody className="divide-y">{plans.map((plan) => <tr key={plan.id} className="hover:bg-muted/30"><td className="px-4 py-3 font-medium">{plan.name}</td><td className="px-4 py-3">{(plan.members as unknown as { full_name: string; member_code: string } | null)?.full_name ?? "—"}</td><td className="px-4 py-3">{plan.calories ? `${plan.calories} kcal` : "—"}</td><td className="px-4 py-3">{(plan.staff as unknown as { users: { full_name: string } | null } | null)?.users?.full_name ?? "Admin"}</td><td className="px-4 py-3">{plan.start_date}{plan.end_date ? ` → ${plan.end_date}` : ""}</td><td className="px-4 py-3"><Badge variant={plan.status === "active" ? "success" : "outline"}>{plan.status}</Badge></td></tr>)}</tbody></table></div> : <div className="grid min-h-56 place-items-center text-center"><div><Utensils className="mx-auto mb-3 size-10 text-muted-foreground" /><p className="font-medium">No diet plans yet</p><Link href="/admin/diet-plans/new" className="mt-2 inline-block text-sm text-primary hover:underline">Create the first diet plan</Link></div></div>}
      </CardContent></Card>
    </div>
  );
}
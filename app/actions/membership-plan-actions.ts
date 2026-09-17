"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { insertWithSchemaFallback } from "@/lib/supabase/insert-fallback";
import { logActivity } from "@/services/workflow.service";

/**
 * Before migration 0046 has run, plan_type has no column to persist to —
 * insertWithSchemaFallback below silently drops it and the plan is saved as
 * a plain plan with no record it was meant to be "couple". The sale flows
 * fall back to recognizing a couple plan by its name (see
 * lib/membership-plan-type.ts), so make sure a couple plan's name always
 * carries that signal, independent of whether the column exists yet. Once
 * the migration lands this becomes a harmless no-op most of the time (the
 * real column carries the type either way).
 */
function ensureCoupleNameSignal(name: string, planType: "individual" | "couple") {
  if (planType !== "couple" || /couple/i.test(name)) return name;
  return `${name} (Couple)`;
}

const planSchema = z.object({
  branch_id: z.string().uuid().optional().nullable(),
  name: z.string().min(2, "Plan name must be at least 2 characters").max(120),
  price: z.coerce.number().nonnegative("Price cannot be negative"),
  duration_months: z.coerce.number().int().positive("Duration must be at least 1 month"),
  gst_percent: z.coerce.number().min(0).max(100).default(18),
  discount_percent: z.coerce.number().min(0).max(100).default(0),
  features: z.string().optional().transform((v) => v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []),
  plan_type: z.enum(["individual", "couple"]).default("individual"),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type PlanActionState = { error?: string; success?: boolean };

export async function createMembershipPlanAction(_state: PlanActionState, formData: FormData): Promise<PlanActionState> {
  const profile = await getCurrentProfile();
  if (!profile?.tenant_id) return { error: "Unauthorized" };

  const parsed = planSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  // plan_type ships in migration 0046 — until that migration has run
  // against this database, saving it errors the insert out entirely. Try it
  // first, then fall back to creating the plan without plan_type (it just
  // defaults to individual once the migration does land) rather than
  // blocking every plan save on that one field.
  const { data, error } = await insertWithSchemaFallback<{ id: string; name: string }>(
    (payload) => supabase.from("membership_plans").insert(payload).select("id, name").single(),
    {
      ...parsed.data,
      name: ensureCoupleNameSignal(parsed.data.name, parsed.data.plan_type),
      branch_id: profile.branch_id ?? parsed.data.branch_id ?? null,
      tenant_id: profile.tenant_id,
    },
    [["plan_type"]],
  );
  if (error || !data) return { error: error?.message ?? "Unable to create the plan." };

  await logActivity({ performedBy: profile.id, branchId: profile.branch_id, action: "membership_plan_created", entityType: "membership_plan", entityId: data.id, description: `Membership plan \"${data.name}\" created` });
  revalidatePath("/admin/memberships");
  redirect("/admin/memberships");
}

export async function updateMembershipPlanAction(id: string, _state: PlanActionState, formData: FormData): Promise<PlanActionState> {
  const profile = await getCurrentProfile();
  if (!profile?.tenant_id) return { error: "Unauthorized" };

  const parsed = planSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { data, error } = await insertWithSchemaFallback<{ id: string; name: string }>(
    (payload) => supabase.from("membership_plans").update(payload).eq("id", id).eq("tenant_id", profile.tenant_id).select("id, name").single(),
    { ...parsed.data, name: ensureCoupleNameSignal(parsed.data.name, parsed.data.plan_type) },
    [["plan_type"]],
  );
  if (error || !data) return { error: error?.message ?? "Unable to update the plan." };

  await logActivity({ performedBy: profile.id, branchId: profile.branch_id, action: "membership_plan_updated", entityType: "membership_plan", entityId: data.id, description: `Membership plan \"${data.name}\" updated` });
  revalidatePath("/admin/memberships");
  redirect("/admin/memberships");
}

export async function toggleMembershipPlanStatusAction(id: string, currentStatus: string): Promise<PlanActionState> {
  const profile = await getCurrentProfile();
  if (!profile?.tenant_id) return { error: "Unauthorized" };

  const newStatus = currentStatus === "active" ? "inactive" : "active";
  const supabase = await createClient();
  const { data, error } = await supabase.from("membership_plans").update({ status: newStatus }).eq("id", id).eq("tenant_id", profile.tenant_id).select().single();
  if (error) return { error: error.message };

  await logActivity({ performedBy: profile.id, branchId: profile.branch_id, action: "membership_plan_status_changed", entityType: "membership_plan", entityId: data.id, description: `Membership plan \"${data.name}\" ${newStatus}` });
  revalidatePath("/admin/memberships");
  return { success: true };
}

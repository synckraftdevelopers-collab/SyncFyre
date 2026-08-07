"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { logActivity } from "@/services/workflow.service";

const planSchema = z.object({
  branch_id:        z.string().uuid().optional().nullable(),
  name:             z.string().min(2, "Plan name must be at least 2 characters").max(120),
  price:            z.coerce.number().nonnegative("Price cannot be negative"),
  duration_months:  z.coerce.number().int().positive("Duration must be at least 1 month"),
  gst_percent:      z.coerce.number().min(0).max(100).default(18),
  discount_percent: z.coerce.number().min(0).max(100).default(0),
  features:         z.string().optional().transform((v) =>
    v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []
  ),
  status:           z.enum(["active", "inactive"]).default("active"),
});

export type PlanActionState = { error?: string; success?: boolean };

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createMembershipPlanAction(
  _state: PlanActionState,
  formData: FormData
): Promise<PlanActionState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Unauthorized" };

  const parsed = planSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("membership_plans")
    .insert({
      ...parsed.data,
      branch_id: profile.branch_id ?? parsed.data.branch_id ?? null,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity({
    performedBy: profile.id,
    branchId: profile.branch_id,
    action: "membership_plan_created",
    entityType: "membership_plan",
    entityId: data.id,
    description: `Membership plan "${data.name}" created`,
  });

  revalidatePath("/admin/memberships");
  redirect("/admin/memberships");
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateMembershipPlanAction(
  id: string,
  _state: PlanActionState,
  formData: FormData
): Promise<PlanActionState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Unauthorized" };

  const parsed = planSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("membership_plans")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity({
    performedBy: profile.id,
    branchId: profile.branch_id,
    action: "membership_plan_updated",
    entityType: "membership_plan",
    entityId: data.id,
    description: `Membership plan "${data.name}" updated`,
  });

  revalidatePath("/admin/memberships");
  redirect("/admin/memberships");
}

// ─── Toggle status ────────────────────────────────────────────────────────────

export async function toggleMembershipPlanStatusAction(
  id: string,
  currentStatus: string
): Promise<PlanActionState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Unauthorized" };

  const newStatus = currentStatus === "active" ? "inactive" : "active";
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("membership_plans")
    .update({ status: newStatus })
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity({
    performedBy: profile.id,
    branchId: profile.branch_id,
    action: "membership_plan_status_changed",
    entityType: "membership_plan",
    entityId: data.id,
    description: `Membership plan "${data.name}" ${newStatus}`,
  });

  revalidatePath("/admin/memberships");
  return { success: true };
}

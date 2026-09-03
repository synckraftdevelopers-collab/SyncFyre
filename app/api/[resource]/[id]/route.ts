import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isResourceName, resourceSchemas, tableForResource } from "@/lib/validations/resources";
import { logActivity, softDeleteById, supportsSoftDelete, tableForSoftDelete, updateSubscriptionWithHistory } from "@/services/workflow.service";

async function verifyMemberPlanScope(resource: string, id: string, payload: Record<string, unknown>, profile: NonNullable<Awaited<ReturnType<typeof getCurrentProfile>>>) {
  if (resource !== "workouts" && resource !== "diet-plans") return;
  if (!profile.tenant_id) throw new Error("Tenant context is required.");
  const supabase = await createClient();
  const table = resource === "workouts" ? "workouts" : "diet_plans";
  const fields = resource === "workouts" ? "id, member_id, branch_id, trainer_id" : "id, member_id, branch_id, staff_id";
  const { data: rawRecord, error: recordError } = await supabase.from(table).select(fields).eq("id", id).maybeSingle();
  const record = rawRecord as { id: string; member_id: string; branch_id: string; trainer_id?: string | null; staff_id?: string | null } | null;
  if (recordError || !record) throw new Error("Plan not found.");
  const memberId = String(payload.member_id ?? record.member_id);
  const { data: member } = await supabase.from("members").select("id, branch_id").eq("id", memberId).eq("tenant_id", profile.tenant_id).maybeSingle();
  if (!member) throw new Error("Member is outside your organization.");
  if (profile.role?.slug === "reception" && member.branch_id !== profile.branch_id) throw new Error("Reception staff can update plans only in their assigned branch.");
  payload.member_id = member.id;
  payload.branch_id = member.branch_id;
  if (profile.role?.slug === "trainer") {
    const { data: trainer } = await supabase.from("trainers").select("id, staff_id").eq("user_id", profile.id).eq("branch_id", member.branch_id).eq("status", "active").maybeSingle();
    if (!trainer || (resource === "workouts" && record.trainer_id !== trainer.id) || (resource === "diet-plans" && record.staff_id !== trainer.staff_id)) throw new Error("You are not authorized to update this plan.");
  }
}
async function authorize(resource: string) {
  const profile = await getCurrentProfile();
  return profile && profile.role?.slug !== "member" && isResourceName(resource) ? profile : null;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ resource: string; id: string }> }) {
  const { resource, id } = await params;
  const profile = await authorize(resource);
  if (!profile || !isResourceName(resource)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const requestBody = await request.json() as Record<string, unknown>;
  const workflowAction = typeof requestBody.workflow_action === "string" ? requestBody.workflow_action : undefined;
  const remarks = typeof requestBody.remarks === "string" ? requestBody.remarks : undefined;
  delete requestBody.workflow_action;
  delete requestBody.remarks;

  const parsed = resourceSchemas[resource].partial().safeParse(requestBody);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 422 });

  const payload = { ...parsed.data } as Record<string, unknown>;
  if (profile.branch_id && "branch_id" in payload) payload.branch_id = profile.branch_id;
  if (supportsSoftDelete(resource) && payload.status === "active") {
    payload.deleted_at = null;
    payload.deleted_by = null;
  }

  if (resource === "subscriptions") {
    try {
      const data = await updateSubscriptionWithHistory({
        subscriptionId: id,
        performedBy: profile.id,
        planId: (payload.plan_id as string | null | undefined) ?? null,
        startDate: (payload.start_date as string | null | undefined) ?? null,
        endDate: (payload.end_date as string | null | undefined) ?? null,
        status: (payload.status as "pending" | "active" | "expired" | "cancelled" | "paused" | null | undefined) ?? null,
        autoRenew: (payload.auto_renew as boolean | null | undefined) ?? null,
        price: (payload.price as number | null | undefined) ?? null,
        discountAmount: (payload.discount_amount as number | null | undefined) ?? null,
        gstAmount: (payload.gst_amount as number | null | undefined) ?? null,
        totalAmount: (payload.total_amount as number | null | undefined) ?? null,
        action: (workflowAction as "extended" | "paused" | "resumed" | "cancelled" | "expired" | "updated" | undefined) ?? undefined,
        remarks: remarks ?? null,
      });
      return NextResponse.json(data);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update subscription" }, { status: 400 });
    }
  }

  const supabase = await createClient();
  try {
    await verifyMemberPlanScope(resource, id, payload, profile);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to verify plan scope" }, { status: 403 });
  }  const { data, error } = await supabase.from(tableForResource[resource]).update(payload).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logActivity({
    performedBy: profile.id,
    branchId: (data as { branch_id?: string | null }).branch_id ?? profile.branch_id,
    action: `${resource.replace(/-/g, "_")}_updated`,
    entityType: resource,
    entityId: id,
    description: `${resource} updated`,
    metadata: payload as Record<string, string | number | boolean | null>,
  });

  return NextResponse.json(data);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ resource: string; id: string }> }) {
  const { resource, id } = await params;
  const profile = await authorize(resource);
  if (!profile || !isResourceName(resource) || (!["admin", "manager"].includes(profile.role?.slug ?? "") && !(resource === "progress" || resource === "diet-plans" && ["trainer", "dietician"].includes(profile.role?.slug ?? "")))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (resource === "diet-plans" && ["trainer", "dietician"].includes(profile.role?.slug ?? "")) {
    const supabase = await createClient(); const { data: trainer } = await supabase.from("trainers").select("staff_id").eq("user_id", profile.id).eq("branch_id", profile.branch_id ?? "").maybeSingle();
    const { data: plan } = await supabase.from("diet_plans").select("id").eq("id", id).eq("staff_id", trainer?.staff_id ?? "").eq("branch_id", profile.branch_id ?? "").maybeSingle();
    if (!plan) return NextResponse.json({ error: "Diet plan not found." }, { status: 403 });
    const { error } = await supabase.from("diet_plans").update({ status: "inactive" }).eq("id", id); if (error) return NextResponse.json({ error: error.message }, { status: 400 }); return NextResponse.json({ success: true });
  }
  if (resource === "progress" && ["trainer", "dietician"].includes(profile.role?.slug ?? "")) {
    const supabase = await createClient();
    const { data: record } = await supabase.from("progress").select("id").eq("id", id).eq("branch_id", profile.branch_id ?? "").eq("recorded_by", profile.id).maybeSingle();
    if (!record) return NextResponse.json({ error: "Progress record not found." }, { status: 403 });
    const { error } = await supabase.from("progress").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }
  if (!supportsSoftDelete(resource)) {
    return NextResponse.json({ error: "Soft delete is not supported for this resource." }, { status: 405 });
  }

  try {
    const table = tableForSoftDelete(resource);
    if (!table) return NextResponse.json({ error: "Soft delete is not configured." }, { status: 500 });
    const data = await softDeleteById({ table, id, performedBy: profile.id });
    await logActivity({
      performedBy: profile.id,
      branchId: data.branch_id ?? profile.branch_id,
      action: `${resource.replace(/-/g, "_")}_deleted`,
      entityType: resource,
      entityId: id,
      description: `${resource} soft deleted`,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete resource" }, { status: 400 });
  }
}

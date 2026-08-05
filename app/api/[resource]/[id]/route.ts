import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isResourceName, resourceSchemas, tableForResource } from "@/lib/validations/resources";
import { logActivity, softDeleteById, supportsSoftDelete, tableForSoftDelete, updateSubscriptionWithHistory } from "@/services/workflow.service";

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
  const { data, error } = await supabase.from(tableForResource[resource]).update(payload).eq("id", id).select().single();
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
  if (!profile || !isResourceName(resource) || !["admin", "manager"].includes(profile.role?.slug ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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

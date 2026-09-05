import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isResourceName, resourceSchemas, tableForResource } from "@/lib/validations/resources";
import { createSubscriptionWithHistory, logActivity } from "@/services/workflow.service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resource = (await params).resource;
  if (!isResourceName(resource)) return NextResponse.json({ error: "Unknown resource" }, { status: 404 });

  const queryParams = request.nextUrl.searchParams;
  const page = Math.max(1, Number(queryParams.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(queryParams.get("pageSize") ?? 20)));
  const status = queryParams.get("status") ?? (resource === "subscriptions" ? "all" : "active");

  const supabase = await createClient();
  let query = supabase.from(tableForResource[resource]).select("*", { count: "exact" });
  if (resource === "notifications") query = query.eq("tenant_id", profile.tenant_id ?? "00000000-0000-0000-0000-000000000000");
  else if (profile.branch_id) query = query.eq("branch_id", profile.branch_id);
  if (status && status !== "all") query = query.eq("status", status);
  for (const key of ["member_id", "trainer_id", "appointment_date"] as const) {
    const value = queryParams.get(key);
    if (value) query = query.eq(key, value);
  }
  const from = (page - 1) * pageSize;
  const { data, count, error } = await query.order("created_at", { ascending: false }).range(from, from + pageSize - 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data, page, pageSize, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / pageSize) });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role?.slug === "member") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const resource = (await params).resource;
  if (!isResourceName(resource)) return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  if (resource === "notifications") {
    return NextResponse.json({ error: "Notifications are generated from real business events and cannot be created manually." }, { status: 403 });
  }

  const requestBody = await request.json() as Record<string, unknown>;
  const workflowAction = typeof requestBody.workflow_action === "string" ? requestBody.workflow_action : undefined;
  const remarks = typeof requestBody.remarks === "string" ? requestBody.remarks : undefined;
  delete requestBody.workflow_action;
  delete requestBody.remarks;

  if (resource === "workouts" || resource === "diet-plans") {
    if (!profile.tenant_id) return NextResponse.json({ error: "Tenant context is required" }, { status: 403 });
    const memberId = String(requestBody.member_id ?? "");
    const supabase = await createClient();
    const { data: member } = await supabase.from("members").select("id, branch_id").eq("id", memberId).eq("tenant_id", profile.tenant_id).maybeSingle();
    if (!member) return NextResponse.json({ error: "Member is outside your organization" }, { status: 403 });
    if (profile.role?.slug === "reception" && member.branch_id !== profile.branch_id) return NextResponse.json({ error: "Reception staff can create plans only in their assigned branch" }, { status: 403 });
    requestBody.branch_id = member.branch_id;
  }  if (profile.branch_id) requestBody.branch_id = profile.branch_id;
  const parsed = resourceSchemas[resource].safeParse(requestBody);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 422 });

  const payload = { ...parsed.data } as Record<string, unknown>;
  if (profile.branch_id && "branch_id" in payload) payload.branch_id = profile.branch_id;
  if (["appointments", "invoices"].includes(resource)) payload.created_by = profile.id;
  if (resource === "payments") payload.collected_by = profile.id;
  if (resource === "progress") payload.recorded_by = profile.id;
  if (resource === "payments" && payload.status === "completed" && !payload.paid_at) payload.paid_at = new Date().toISOString();

  if (resource === "subscriptions") {
    try {
      const data = await createSubscriptionWithHistory({
        memberId: String(payload.member_id),
        planId: String(payload.plan_id),
        branchId: String(payload.branch_id),
        tenantId: profile.tenant_id,
        startDate: String(payload.start_date),
        endDate: (payload.end_date as string | null | undefined) ?? null,
        status: (payload.status as "pending" | "active" | "expired" | "cancelled" | "paused" | undefined) ?? "pending",
        autoRenew: Boolean(payload.auto_renew ?? false),
        price: Number(payload.price),
        discountAmount: Number(payload.discount_amount ?? 0),
        gstAmount: Number(payload.gst_amount ?? 0),
        totalAmount: Number(payload.total_amount),
        performedBy: profile.id,
        action: workflowAction === "renewed" ? "renewed" : "created",
        remarks: remarks ?? null,
      });
      return NextResponse.json(data, { status: 201 });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create subscription" }, { status: 400 });
    }
  }

  const supabase = await createClient();
  if (resource === "workouts" && profile.role?.slug === "trainer") {
    const { data: trainer } = await supabase
      .from("trainers")
      .select("id")
      .eq("user_id", profile.id)
      .single();
    if (!trainer) return NextResponse.json({ error: "Trainer profile not found" }, { status: 400 });
    payload.trainer_id = trainer.id;
  }
  if (resource === "diet-plans" && ["trainer", "dietician"].includes(profile.role?.slug ?? "")) {
    const { data: trainer } = await supabase.from("trainers").select("id,staff_id").eq("user_id", profile.id).eq("branch_id", profile.branch_id ?? "").eq("status", "active").maybeSingle();
    if (!trainer) return NextResponse.json({ error: "Active trainer profile not found" }, { status: 403 });
    const { data: member } = await supabase.from("members").select("id").eq("id", String(payload.member_id)).eq("assigned_trainer_id", trainer.id).eq("branch_id", profile.branch_id ?? "").eq("status", "active").maybeSingle();
    if (!member) return NextResponse.json({ error: "You can only create plans for active assigned members." }, { status: 403 });
    if (trainer.staff_id) payload.staff_id = trainer.staff_id;
  }  const { data, error } = await supabase.from(tableForResource[resource]).insert(payload).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logActivity({
    performedBy: profile.id,
    branchId: (data as { branch_id?: string | null }).branch_id ?? profile.branch_id,
    action: `${resource.replace(/-/g, "_")}_created`,
    entityType: resource,
    entityId: String((data as { id: string }).id),
    description: `${resource} created`,
    metadata: payload as Record<string, string | number | boolean | null>,
  });

  return NextResponse.json(data, { status: 201 });
}

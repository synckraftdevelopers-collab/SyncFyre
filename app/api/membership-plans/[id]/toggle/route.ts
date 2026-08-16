import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/services/workflow.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await getCurrentProfile();
    if (!profile || !["admin", "manager"].includes(profile.role?.slug ?? "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const supabase = await createClient();
    let query = supabase
      .from("membership_plans")
      .select("id, name, status, branch_id")
      .eq("id", id);

    if (profile.branch_id) query = query.eq("branch_id", profile.branch_id);

    const { data: plan, error: findError } = await query.maybeSingle();
    if (findError) return NextResponse.json({ error: findError.message }, { status: 400 });
    if (!plan) return NextResponse.json({ error: "Membership plan not found." }, { status: 404 });

    const nextStatus = plan.status === "active" ? "inactive" : "active";
    const payload = nextStatus === "active"
      ? { status: nextStatus, deleted_at: null, deleted_by: null }
      : { status: nextStatus };
    const { error: updateError } = await supabase
      .from("membership_plans")
      .update(payload)
      .eq("id", id);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

    // Activity history must not make a successful status update fail.
    try {
      await logActivity({
        performedBy: profile.id,
        branchId: plan.branch_id ?? profile.branch_id,
        action: `membership_plan_${nextStatus === "active" ? "activated" : "deactivated"}`,
        entityType: "membership-plan",
        entityId: id,
        description: `Membership plan ${plan.name} ${nextStatus}`,
        metadata: { status: nextStatus },
      });
    } catch (error) {
      console.error("Membership-plan activity logging failed:", error);
    }

    revalidatePath("/admin/memberships");
    return NextResponse.redirect(new URL("/admin/memberships", request.url), 303);
  } catch (error) {
    console.error("Membership-plan toggle failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update membership plan." },
      { status: 500 },
    );
  }
}
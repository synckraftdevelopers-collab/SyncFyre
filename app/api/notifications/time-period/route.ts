import { NextRequest, NextResponse } from "next/server";
import { requirePortalContext } from "@/lib/auth";
import { queueTimePeriodNotification } from "@/services/notification.service";

export async function POST(request: NextRequest) {
  const profile = await requirePortalContext(["owner", "admin", "manager", "reception", "trainer", "dietician", "diet-planner", "diet_planner", "member"]);

  try {
    const body = await request.json();
    const period = typeof body?.period === "string" ? body.period : null;
    const localDate = typeof body?.localDate === "string" ? body.localDate : null;
    const timeZone = typeof body?.timeZone === "string" ? body.timeZone : null;

    if (!period || !localDate || !timeZone) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const result = await queueTimePeriodNotification({
      userId: profile.id,
      tenantId: profile.tenant_id,
      branchId: profile.branch_id,
      fullName: profile.full_name,
      role: profile.role?.slug ?? null,
      localDate,
      period,
      timeZone,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to queue notification" }, { status: 500 });
  }
}

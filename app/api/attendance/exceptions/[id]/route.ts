import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { resolveAttendanceException } from "@/services/workflow.service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "manager", "reception"].includes(profile.role?.slug ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json() as {
    action?: "approve" | "merge" | "ignore" | "retry_sync" | "assign_member";
    notes?: string | null;
    metadata?: Record<string, string | number | boolean | null>;
  };

  if (!body.action) return NextResponse.json({ error: "Action is required." }, { status: 422 });

  try {
    const result = await resolveAttendanceException({
      id: (await params).id,
      action: body.action,
      performedBy: profile.id,
      branchId: profile.branch_id,
      notes: body.notes ?? null,
      metadata: body.metadata,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to resolve attendance exception" }, { status: 400 });
  }
}

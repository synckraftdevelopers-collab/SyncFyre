import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { deleteAttendanceEvent } from "@/services/biometric-admin.service";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "manager", "reception"].includes(profile.role?.slug ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    return NextResponse.json(await deleteAttendanceEvent((await params).id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete attendance event." }, { status: 400 });
  }
}

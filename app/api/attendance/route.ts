import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { getAttendanceSummary, listNormalizedAttendance } from "@/services/biometric-admin.service";

export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "manager", "reception"].includes(profile.role?.slug ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = request.nextUrl.searchParams;
  const status = (q.get("status") ?? "all") as "mapped" | "unmapped" | "all";
  const search = q.get("search") ?? "";
  const from = q.get("from") ?? undefined;
  const to = q.get("to") ?? undefined;
  const deviceId = q.get("device") ?? undefined;
  const summary = q.get("summary") === "true";

  try {
    if (summary) {
      return NextResponse.json(await getAttendanceSummary(profile.branch_id));
    }
    const data = await listNormalizedAttendance({
      branchId: profile.branch_id,
      status,
      search,
      from,
      to,
      deviceId,
    });
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Biometric data request failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load attendance." }, { status: 400 });
  }
}

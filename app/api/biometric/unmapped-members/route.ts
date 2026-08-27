import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { getUnmappedMembers } from "@/services/biometric-admin.service";

export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "manager", "reception"].includes(profile.role?.slug ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const search = request.nextUrl.searchParams.get("search") ?? "";
    return NextResponse.json({ data: await getUnmappedMembers(profile.branch_id, search) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load unmapped members." }, { status: 400 });
  }
}

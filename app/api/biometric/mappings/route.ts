import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createOrUpdateBiometricMapping, getBiometricMappings, getMappedMembers, getUnidentifiedMachineUsers } from "@/services/biometric-admin.service";

export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "manager", "reception"].includes(profile.role?.slug ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = request.nextUrl.searchParams;
  const status = (q.get("status") ?? "all") as "verified" | "pending" | "all";
  const search = q.get("search") ?? "";
  const from = q.get("from") ?? undefined;
  const to = q.get("to") ?? undefined;
  const includeUnidentified = q.get("includeUnidentified") === "true";

  try {
    const [mappings, unidentified] = await Promise.all([
      getBiometricMappings({ branchId: profile.branch_id, status, search }),
      includeUnidentified ? getUnidentifiedMachineUsers(profile.branch_id, from, to) : Promise.resolve([]),
    ]);
    return NextResponse.json({ data: mappings, unidentified });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load biometric mappings." }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "manager", "reception"].includes(profile.role?.slug ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json() as {
    member_id?: string;
    machine_user_id?: string;
    machine_name?: string | null;
    verified?: boolean;
    match_status?: string;
    reprocess?: boolean;
  };

  if (!body.member_id || !body.machine_user_id) {
    return NextResponse.json({ error: "member_id and machine_user_id are required." }, { status: 422 });
  }

  try {
    return NextResponse.json(await createOrUpdateBiometricMapping({
      memberId: body.member_id,
      machineUserId: body.machine_user_id,
      machineName: body.machine_name ?? null,
      verified: body.verified ?? true,
      matchStatus: body.match_status ?? "matched",
      reprocess: body.reprocess ?? true,
      performedBy: profile.id,
    }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save biometric mapping." }, { status: 400 });
  }
}

